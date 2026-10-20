import { createClient } from 'npm:@supabase/supabase-js@2';
import { sendEmailJs } from '../_shared/emailjs.ts';

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

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function digest(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(hash), (part) => part.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (request) => {
  const configuredOrigins = (Deno.env.get('SPT_ALLOWED_ORIGINS') || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  const requestOrigin = request.headers.get('origin') || '';

  if (request.method === 'OPTIONS') {
    if (!configuredOrigins.includes(requestOrigin)) {
      return new Response(null, { status: 403 });
    }
    return new Response(null, { status: 204, headers: corsHeaders(requestOrigin) });
  }

  if (request.method !== 'POST') {
    return json(405, { error: 'Method not allowed.' }, requestOrigin || 'null');
  }

  if (requestOrigin && !configuredOrigins.includes(requestOrigin)) {
    return json(403, { error: 'Origin not allowed.' }, 'null');
  }

  const responseOrigin = requestOrigin || configuredOrigins[0] || 'null';
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const siteUrl = Deno.env.get('SPT_PUBLIC_SITE_URL');
  const rateLimitSalt = Deno.env.get('ORDER_RATE_LIMIT_SALT');

  if (!supabaseUrl || !serviceRoleKey || !siteUrl || !rateLimitSalt) {
    return json(503, { error: 'Digital order service is not configured.' }, responseOrigin);
  }

  let payload: Record<string, unknown>;
  try {
    payload = await request.json();
  } catch {
    return json(400, { error: 'Invalid order request.' }, responseOrigin);
  }

  const productId = String(payload.product_id || '').trim();
  const customerName = String(payload.customer_name || '').trim();
  const customerEmail = String(payload.customer_email || '').trim().toLowerCase();
  const customerPhone = String(payload.customer_phone || '').trim();
  const paymentMethod = String(payload.payment_method || '').trim();
  const notes = String(payload.notes || '').trim();
  const idempotencyKey = String(payload.idempotency_key || '').trim();

  if (
    !/^[a-z0-9-]{3,80}$/.test(productId) ||
    customerName.length < 2 || customerName.length > 120 ||
    !emailPattern.test(customerEmail) || customerEmail.length > 254 ||
    customerPhone.length > 40 || notes.length > 10000 ||
    !['Zelle', 'In-Person / Cash'].includes(paymentMethod) ||
    !uuidPattern.test(idempotencyKey)
  ) {
    return json(400, { error: 'Please provide valid customer and order details.' }, responseOrigin);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const existing = await supabase
    .from('digital_orders')
    .select('id, product_id, customer_email, product_name, amount_cents, currency, payment_status, delivery_status')
    .eq('idempotency_key', idempotencyKey)
    .maybeSingle();

  if (existing.error) {
    console.error('Order idempotency lookup failed:', existing.error.message);
    return json(503, { error: 'Order service is temporarily unavailable.' }, responseOrigin);
  }

  if (existing.data) {
    if (
      existing.data.customer_email !== customerEmail ||
      existing.data.product_id !== productId
    ) {
      return json(409, { error: 'This order request key is already in use.' }, responseOrigin);
    }

    return json(200, {
      order_id: existing.data.id,
      product_name: existing.data.product_name,
      amount_cents: existing.data.amount_cents,
      currency: existing.data.currency,
      payment_status: existing.data.payment_status,
      delivery_status: existing.data.delivery_status,
      idempotent_replay: true,
    }, responseOrigin);
  }

  const productResult = await supabase
    .from('digital_products')
    .select('id, name, amount_cents, currency, storage_path, orderable, unavailable_reason')
    .eq('id', productId)
    .maybeSingle();

  if (productResult.error) {
    console.error('Product catalog lookup failed:', productResult.error.message);
    return json(503, { error: 'Product catalog is temporarily unavailable.' }, responseOrigin);
  }

  const product = productResult.data;
  if (!product || !product.orderable || !product.storage_path) {
    return json(409, {
      error: product?.unavailable_reason || 'This product is not ready for secure digital delivery.',
      code: 'product_unavailable',
    }, responseOrigin);
  }

  const storageParts = product.storage_path.split('/');
  const fileName = storageParts.pop();
  const storageFolder = storageParts.join('/');
  const storageCheck = await supabase.storage
    .from('digital-products-private')
    .list(storageFolder, { search: fileName, limit: 10 });
  const fileIsPresent = !storageCheck.error && storageCheck.data?.some((file) => file.name === fileName);

  if (!fileIsPresent) {
    console.error('Private product file is not ready:', product.id, storageCheck.error?.message);
    return json(409, {
      error: 'Secure delivery is not enabled for this product yet.',
      code: 'product_file_unavailable',
    }, responseOrigin);
  }

  const forwardedFor = request.headers.get('x-forwarded-for') || '';
  const clientIp = request.headers.get('cf-connecting-ip') ||
    request.headers.get('x-real-ip') ||
    forwardedFor.split(',').map((value) => value.trim()).filter(Boolean).at(-1) ||
    'unknown';
  const ipDigest = await digest(`${rateLimitSalt}:${clientIp}`);
  const windowStart = new Date();
  windowStart.setUTCMinutes(0, 0, 0);

  const rateLimit = await supabase.rpc('consume_digital_order_rate_limit', {
    p_ip_digest: ipDigest,
    p_window_start: windowStart.toISOString(),
  });

  if (rateLimit.error) {
    console.error('Order rate limit check failed:', rateLimit.error.message);
    return json(503, { error: 'Order service is temporarily unavailable.' }, responseOrigin);
  }
  if (rateLimit.data !== true) {
    return json(429, { error: 'Too many order requests. Please try again later.' }, responseOrigin);
  }

  const orderResult = await supabase
    .from('digital_orders')
    .insert({
      idempotency_key: idempotencyKey,
      product_id: product.id,
      product_name: product.name,
      amount_cents: product.amount_cents,
      currency: product.currency,
      customer_name: customerName,
      customer_email: customerEmail,
      customer_phone: customerPhone,
      payment_method: paymentMethod,
      notes,
      payment_status: 'pending',
      delivery_status: 'pending',
      business_notification_status: 'pending',
    })
    .select('id, product_name, amount_cents, currency, payment_status, delivery_status, created_at')
    .single();

  if (orderResult.error) {
    if (orderResult.error.code === '23505') {
      const replay = await supabase
        .from('digital_orders')
        .select('id, product_id, customer_email, product_name, amount_cents, currency, payment_status, delivery_status')
        .eq('idempotency_key', idempotencyKey)
        .maybeSingle();
      if (
        replay.data &&
        replay.data.customer_email === customerEmail &&
        replay.data.product_id === productId
      ) {
        return json(200, { ...replay.data, idempotent_replay: true }, responseOrigin);
      }
      if (replay.data) {
        return json(409, { error: 'This order request key is already in use.' }, responseOrigin);
      }
    }
    console.error('Order insert failed:', orderResult.error.message);
    return json(503, { error: 'Could not create the pending order.' }, responseOrigin);
  }

  const order = orderResult.data;
  const adminUrl = new URL('admin-orders.html', siteUrl);
  adminUrl.searchParams.set('order', order.id);
  const price = `$${(order.amount_cents / 100).toFixed(2)}`;
  let notificationStatus: 'sent' | 'failed' = 'sent';
  let notificationError: string | null = null;

  try {
    const orderTemplateId = Deno.env.get('EMAILJS_ORDER_TEMPLATE_ID');
    if (!orderTemplateId) throw new Error('Pending-order notification template is not configured.');

    await sendEmailJs(orderTemplateId, {
      to_email: 'simmonsperftraining@gmail.com',
      subject: `New Digital Product Order - ${order.product_name}`,
      order_id: order.id,
      product_id: product.id,
      product_service: order.product_name,
      price,
      amount_cents: order.amount_cents,
      payment_method: paymentMethod,
      payment_status: 'Pending manual verification',
      customer_name: customerName,
      customer_email: customerEmail,
      customer_phone: customerPhone,
      notes,
      submitted_at: order.created_at,
      admin_url: adminUrl.toString(),
    });
  } catch (error) {
    notificationStatus = 'failed';
    notificationError = error instanceof Error ? error.message.slice(0, 500) : 'Email request failed.';
    console.error('Pending-order notification failed:', error);
  }

  await supabase
    .from('digital_orders')
    .update({
      business_notification_status: notificationStatus,
      business_notification_error: notificationError,
    })
    .eq('id', order.id);

  return json(201, {
    order_id: order.id,
    product_name: order.product_name,
    amount_cents: order.amount_cents,
    currency: order.currency,
    payment_status: order.payment_status,
    delivery_status: order.delivery_status,
    business_notification_status: notificationStatus,
  }, responseOrigin);
});
