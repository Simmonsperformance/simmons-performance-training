
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
      id, slot_id, service_key, athlete_name, age, sport, position,
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
  if (method !== null && !["zelle", "cash_in_person"].includes(method)) {
    return reply({ error: "Choose Zelle or cash in person" }, 400);
  }

  const notes = body.admin_notes == null ? null : String(body.admin_notes);
  if (notes !== null && notes.length > 2000) {
    return reply({ error: "Admin notes must be under 2000 characters" }, 400);
  }

  const { data, error } = await db.rpc("manage_appointment_action", {
    p_booking_id: bookingId,
    p_action: action,
    p_admin_id: auth.user.id,
    p_payment_method: method,
    p_admin_notes: notes,
  });

  if (error) {
    console.error(error.message);
    return reply({ error: error.message }, 400);
  }

  // Only send the customer-facing confirmation after the admin explicitly
  // verifies payment. Approval alone never triggers this email.
  if (action === "verify_payment") {
    const { data: booking, error: bookingError } = await db.from("bookings")
      .select(`id, service_key, athlete_name, athlete_email, guardian_name, guardian_email, guardian_phone, payment_method, payment_status, booking_slots(starts_at, ends_at)`)
      .eq("id", bookingId).maybeSingle();

    if (bookingError || !booking) {
      console.error("Payment was recorded, but confirmation details could not be loaded:", bookingError?.message);
      return reply({ success: true, result: data, warning: "Payment was recorded, but confirmation email could not be prepared." });
    }

    const slot = Array.isArray(booking.booking_slots) ? booking.booking_slots[0] : booking.booking_slots;
    const serviceDetails: Record<string, { name: string; price: string }> = {
      "one-on-one": { name: "1-on-1 Session", price: "$75 / session" },
      "group-speed": { name: "Group Speed Training", price: "$55 / athlete" },
      "three-times-weekly": { name: "3x Weekly Package", price: "$195 / week" },
      "house-call": { name: "House Call Session", price: "$100 / session" },
    };
    const service = serviceDetails[booking.service_key] || { name: booking.service_key, price: "See booking details" };
    const customerEmail = booking.guardian_email || booking.athlete_email;
    if (customerEmail) {
      const start = slot?.starts_at ? new Date(slot.starts_at) : null;
      const dateText = start ? new Intl.DateTimeFormat("en-US", { timeZone: "America/Phoenix", weekday: "long", month: "long", day: "numeric", year: "numeric" }).format(start) : "See appointment details";
      const timeText = start ? new Intl.DateTimeFormat("en-US", { timeZone: "America/Phoenix", hour: "numeric", minute: "2-digit" }).format(start) : "See appointment details";
      try {
        await sendEmailJs("template_mgv2at6", {
          to_email: customerEmail,
          customer_name: booking.guardian_name || booking.athlete_name,
          athlete_name: booking.athlete_name,
          customer_email: customerEmail,
          customer_phone: booking.guardian_phone || "Not provided",
          product_service: service.name,
          price: service.price,
          appointment_date: dateText,
          appointment_time: timeText,
          payment_method: booking.payment_method === "cash_in_person" ? "Cash in person" : "Zelle",
          payment_status: "Paid — verified by Simmons Performance Training",
          booking_id: booking.id,
          appointment_confirmation: "Your appointment has been approved and payment has been verified. Your appointment is confirmed.",
          subject: `Appointment Confirmed - ${service.name}`,
          business_contact: "simmonsperftraining@gmail.com",
        });
      } catch (emailError) {
        console.error("Payment confirmed but customer email failed:", emailError instanceof Error ? emailError.message : "Unknown error");
        return reply({ success: true, result: data, warning: "Appointment and payment are confirmed, but the customer confirmation email failed to send. Check EmailJS logs." });
      }
    } else {
      return reply({ success: true, result: data, warning: "Appointment and payment are confirmed, but no customer email is on file." });
    }
  }

  return reply({ success: true, result: data });
});
