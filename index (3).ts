import { createClient } from 'npm:@supabase/supabase-js@2';
import { EmailJsError, sendEmailJs } from '../_shared/emailjs.ts';

const DOWNLOAD_TTL_SECONDS = 60 * 60 * 24 * 2;

const corsHeaders = (origin: string) => ({
  'Access-Control-Allow-Origin': origin,
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
  Vary: 'Origin',
});

const json = (status: number, body: Record<string, unknown>, origin: string) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
  });

Deno.serve(async (request) => {
  const allowedOrigins = (Deno.env.get('SPT_ALLOWED_ORIGINS') || '')
    .split(',').map((value) => value.trim()).filter(Boolean);
  const origin = request.headers.get('origin') || '';

  if (request.method === 'OPTIONS') {
    if (!allowedOrigins.includes(origin)) return new Response(null, { status: 403 });
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  }
  if (request.method !== 'POST' || !allowedOrigins.includes(origin)) {
    return json(403, { error: 'Request is not allowed.' }, 'null');
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const adminUserId = Deno.env.get('ORDER_ADMIN_USER_ID');
  if (!supabaseUrl || !serviceRoleKey || !adminUserId) {
    return json(503, { error: 'Order management is not configured.' }, origin);
  }

  const authorization = request.headers.get('authorization') || '';
  const token = authorization.replace(/^Bearer\s+/i, '');
  if (!token || token === authorization) {
    return json(401, { error: 'Sign in as the authorized business administrator.' }, origin);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const userResult = await supabase.auth.getUser(token);
  if (userResult.error || userResult.data.user?.id !== adminUserId) {
    return json(403, { error: 'This account is not authorized to manage orders.' }, origin);
  }

  let payload: Record<string, unknown>;
  try {
    payload = await request.json();
  } catch {
    return json(400, { error: 'Invalid management request.' }, origin);
  }

  const action = String(payload.action || '');
  if (action === 'list_orders') {
    const result = await supabase
      .from('digital_orders')
      .select('id, product_id, product_name, amount_cents, currency, customer_name, customer_email, customer_phone, payment_method, notes, payment_status, delivery_status, business_notification_status, delivery_attempt_count, created_at, paid_at, delivered_at, download_expires_at, last_delivery_error')
      .order('created_at', { ascending: false })
      .limit(100);

    if (result.error) {
      console.error('Could not list digital orders:', result.error.message);
      return json(503, { error: 'Orders could not be loaded.' }, origin);
    }
    return json(200, { orders: result.data }, origin);
  }

  const orderId = String(payload.order_id || '');
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(orderId)) {
    return json(400, { error: 'A valid order ID is required.' }, origin);
  }
  if (!['confirm_payment', 'retry_delivery'].includes(action)) {
    return json(400, { error: 'Unsupported order action.' }, origin);
  }

  const claim = await supabase.rpc('claim_digital_order_delivery', {
    p_order_id: orderId,
    p_action: action,
  });
  if (claim.error) {
    console.error('Could not claim order delivery:', claim.error.message);
    return json(503, { error: 'The order could not be updated.' }, origin);
  }
  const order = claim.data as Record<string, unknown> | null;
  if (!order) {
    return json(409, {
      error: action === 'confirm_payment'
        ? 'This order is no longer pending payment, or delivery is already in progress.'
        : 'Only a paid order with a confirmed delivery failure can be retried.',
    }, origin);
  }

  const storagePathResult = await supabase
    .from('digital_products')
    .select('storage_path, orderable')
    .eq('id', order.product_id)
    .maybeSingle();

  const storagePath = storagePathResult.data?.storage_path;
  if (storagePathResult.error || !storagePathResult.data?.orderable || !storagePath) {
    const message = 'The paid product has no configured private delivery file.';
    await supabase.rpc('finish_digital_order_delivery', {
      p_order_id: orderId,
      p_status: 'failed',
      p_error: message,
      p_download_expires_at: null,
    });
    return json(409, { error: message, payment_status: 'paid', delivery_status: 'failed' }, origin);
  }

  const signedResult = await supabase.storage
    .from('digital-products-private')
    .createSignedUrl(storagePath, DOWNLOAD_TTL_SECONDS);
  if (signedResult.error || !signedResult.data?.signedUrl) {
    const message = 'A secure download link could not be created.';
    await supabase.rpc('finish_digital_order_delivery', {
      p_order_id: orderId,
      p_status: 'failed',
      p_error: message,
      p_download_expires_at: null,
    });
    console.error('Signed product link creation failed:', signedResult.error?.message);
    return json(502, { error: message, payment_status: 'paid', delivery_status: 'failed' }, origin);
  }

  const expiry = new Date(Date.now() + DOWNLOAD_TTL_SECONDS * 1000);
  const emailTemplateId = Deno.env.get('EMAILJS_DELIVERY_TEMPLATE_ID');
  if (!emailTemplateId) {
    const message = 'The customer delivery email template is not configured.';
    await supabase.rpc('finish_digital_order_delivery', {
      p_order_id: orderId,
      p_status: 'failed',
      p_error: message,
      p_download_expires_at: null,
    });
    return json(503, { error: message, payment_status: 'paid', delivery_status: 'failed' }, origin);
  }

  try {
    await sendEmailJs(emailTemplateId, {
      to_email: order.customer_email,
      subject: 'Your Simmons Performance Training Digital Product',
      customer_name: order.customer_name,
      customer_email: order.customer_email,
      customer_phone: order.customer_phone || '',
      product_service: order.product_name,
      price: `$${(Number(order.amount_cents) / 100).toFixed(2)}`,
      payment_method: order.payment_method,
      payment_status: 'Payment manually verified',
      order_id: order.id,
      download_url: signedResult.data.signedUrl,
      download_expires_at: expiry.toISOString(),
      business_contact: 'simmonsperftraining@gmail.com',
      notes: order.notes || '',
    });
  } catch (error) {
    const knownRejection = error instanceof EmailJsError &&
      error.status !== null && error.status >= 400 && error.status < 500;
    const status = knownRejection ? 'failed' : 'unknown';
    const safeError = error instanceof EmailJsError
      ? `EmailJS request ${knownRejection ? 'rejected' : 'outcome unknown'}${error.status ? ` (HTTP ${error.status})` : ''}.`
      : 'Email request outcome is unknown; check provider logs before retrying.';

    await supabase.rpc('finish_digital_order_delivery', {
      p_order_id: orderId,
      p_status: status,
      p_error: safeError,
      p_download_expires_at: null,
    });

    console.error('Paid order delivery failed:', orderId, error);
    return json(502, {
      error: knownRejection
        ? 'Payment is marked paid, but the email provider rejected delivery. A verified failure may be retried.'
        : 'Payment is marked paid, but delivery outcome is uncertain. Check provider logs before retrying to avoid duplicate email.',
      payment_status: 'paid',
      delivery_status: status,
    }, origin);
  }

  const finished = await supabase.rpc('finish_digital_order_delivery', {
    p_order_id: orderId,
    p_status: 'delivered',
    p_error: null,
    p_download_expires_at: expiry.toISOString(),
  });

  if (finished.error || finished.data !== true) {
    console.error('Email accepted but order delivery state update failed:', orderId, finished.error?.message);
    return json(202, {
      order_id: orderId,
      payment_status: 'paid',
      delivery_status: 'delivering',
      message: 'Email provider accepted delivery; order state needs reconciliation before any retry.',
    }, origin);
  }

  return json(200, {
    order_id: orderId,
    payment_status: 'paid',
    delivery_status: 'delivered',
    download_expires_at: expiry.toISOString(),
  }, origin);
});
