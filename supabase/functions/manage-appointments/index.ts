
import { createClient } from "npm:@supabase/supabase-js@2";
import { sendEmailJs } from "../_shared/emailjs.ts";

const allowedOrigins = (Deno.env.get("SPT_ALLOWED_ORIGINS") || "")
  .split(",").map(s => s.trim()).filter(Boolean);

Deno.serve(async (req) => {
  const origin = req.headers.get("origin") || "";
  const headers = {
    "Access-Control-Allow-Origin": allowedOrigins.includes(origin) ? origin : "null",
    "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json",
    "Vary": "Origin",
  };
  const reply = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), { status, headers });

  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers });
  if (req.method !== "POST") return reply({ error: "Method not allowed" }, 405);
  if (!allowedOrigins.includes(origin)) return reply({ error: "Origin not allowed" }, 403);

  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const adminId = Deno.env.get("APPOINTMENT_ADMIN_USER_ID");
  if (!url || !key || !adminId) return reply({ error: "Server configuration missing" }, 503);

  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) return reply({ error: "Please sign in" }, 401);

  const db = createClient(url, key, { auth: { persistSession: false } });
  const { data: auth, error: authError } = await db.auth.getUser(token);
  if (authError || auth.user?.id !== adminId) {
    return reply({ error: "Administrator access required" }, 403);
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return reply({ error: "Invalid request body" }, 400);
  }

  if (body.action === "list") {
    const { data, error } = await db.from("bookings").select(`
      id, slot_id, service_key, athlete_name, athlete_age, sport, position,
      athlete_email, guardian_name, guardian_email, guardian_phone,
      training_goals, notes, status, created_at, payment_method,
      payment_status, approved_at, paid_at, admin_notes,
      booking_slots(starts_at, ends_at)
    `).order("created_at", { ascending: false }).limit(200);

    if (error) {
      console.error(error.message);
      return reply({ error: "Unable to load appointments" }, 500);
    }
    return reply({ appointments: data });
  }

  const bookingId = String(body.booking_id || "");
  if (!/^[0-9a-f-]{36}$/i.test(bookingId)) {
    return reply({ error: "Invalid booking ID" }, 400);
  }

  const action = String(body.action || "");
  if (!["approve", "reject", "verify_payment"].includes(action)) {
    return reply({ error: "Invalid action" }, 400);
  }

  const method = body.payment_method == null ? null : String(body.payment_method);
  if (method !== null && !["zelle", "cash", "cash_in_person"].includes(method)) {
    return reply({ error: "Choose Zelle or cash" }, 400);
  }
  const normalizedMethod = method === "cash" ? "cash_in_person" : method;

  const notes = body.admin_notes == null ? null : String(body.admin_notes);
  if (notes !== null && notes.length > 2000) {
    return reply({ error: "Admin notes must be under 2000 characters" }, 400);
  }

  const { data, error } = await db.rpc("manage_appointment_action", {
    p_booking_id: bookingId,
    p_action: action,
    p_admin_id: auth.user.id,
    p_payment_method: normalizedMethod,
    p_admin_notes: notes,
  });

  if (error) {
    console.error(error.message);
    return reply({ error: error.message }, 400);
  }

  // The RPC must successfully approve payment before we send a final
  // customer confirmation. The email contains appointment details, no PDFs.
  let confirmationEmail = "not_applicable";
  if (action === "verify_payment") {
    const { data: booking, error: bookingError } = await db.from("bookings").select(`
      id, service_key, athlete_name, athlete_email, guardian_name,
      guardian_email, guardian_phone, payment_method, payment_status, status,
      booking_slots(starts_at, ends_at)
    `).eq("id", bookingId).maybeSingle();

    if (bookingError || !booking) {
      console.error("Appointment updated but could not load confirmation details:", bookingError?.message);
      return reply({ success: true, result: data, confirmation_email: "details_unavailable" });
    }

    const slot = Array.isArray(booking.booking_slots)
      ? booking.booking_slots[0] : booking.booking_slots;
    const customerEmail = booking.guardian_email || booking.athlete_email;
    // Never fall back to the general purchase/digital-delivery template.
    // Appointment confirmation requires its own dedicated EmailJS template.
    const configuredTemplateId = Deno.env.get("APPOINTMENT_CONFIRMATION_TEMPLATE_ID") ||
      Deno.env.get("EMAILJS_APPOINTMENT_CONFIRMATION_TEMPLATE_ID");
    // This known template contains purchase and digital-download copy, so
    // explicitly refuse it for appointments even if accidentally configured.
    const templateId = configuredTemplateId && configuredTemplateId !== "template_mgv2at6"
      ? configuredTemplateId
      : null;

    if (booking.status === "confirmed" && ["paid", "verified"].includes(String(booking.payment_status)) && customerEmail && templateId) {
      try {
        const startsAt = slot?.starts_at ? new Date(slot.starts_at) : null;
        const endsAt = slot?.ends_at ? new Date(slot.ends_at) : null;
        const dateText = startsAt ? new Intl.DateTimeFormat("en-US", {
          timeZone: "America/Phoenix", weekday: "long", year: "numeric", month: "long", day: "numeric",
        }).format(startsAt) : "See your appointment details";
        const timeText = startsAt ? new Intl.DateTimeFormat("en-US", {
          timeZone: "America/Phoenix", hour: "numeric", minute: "2-digit",
        }).format(startsAt) : "See your appointment details";
        const endText = endsAt ? new Intl.DateTimeFormat("en-US", {
          timeZone: "America/Phoenix", hour: "numeric", minute: "2-digit",
        }).format(endsAt) : "";
        await sendEmailJs(templateId, {
          to_email: customerEmail,
          customer_email: customerEmail,
          customer_name: booking.guardian_name || booking.athlete_name,
          athlete_name: booking.athlete_name,
          parent_name: booking.guardian_name || "",
          parent_email: booking.guardian_email || "",
          product_service: booking.service_key,
          appointment_date: dateText,
          appointment_time: endText ? `${timeText} – ${endText}` : timeText,
          booking_id: booking.id,
          payment_status: "Payment verified",
          appointment_confirmation: "Your appointment is confirmed.",
          subject: "Appointment Confirmed - Simmons Performance Training",
          business_contact: "simmonsperftraining@gmail.com",
        });
        confirmationEmail = "sent";
      } catch (emailError) {
        console.error("Appointment confirmed but customer email failed:", bookingId, emailError);
        confirmationEmail = "failed";
      }
    } else {
      confirmationEmail = !customerEmail
        ? "missing_customer_email"
        : !templateId
          ? "missing_email_template"
          : booking.status !== "confirmed" || !["paid", "verified"].includes(String(booking.payment_status))
            ? "booking_not_paid_and_confirmed"
            : "missing_email_template";
    }
  }
  return reply({ success: true, result: data, confirmation_email: confirmationEmail });
});
