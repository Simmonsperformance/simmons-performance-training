
import { createClient } from "npm:@supabase/supabase-js@2";
import { sendEmailJs } from "../_shared/emailjs.ts";

const allowedOrigins = new Set([
  "https://simmonsperformance.github.io",
  "http://localhost:3000",
  "http://127.0.0.1:5500",
]);

const corsHeaders = (origin: string | null) => ({
  "Access-Control-Allow-Origin":
    origin && allowedOrigins.has(origin)
      ? origin
      : "https://simmonsperformance.github.io",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
  "Vary": "Origin",
});

function respond(
  data: unknown,
  status: number,
  origin: string | null,
) {
  return new Response(JSON.stringify(data), {
    status,
    headers: corsHeaders(origin),
  });
}

const services = new Set([
  "one-on-one",
  "group-speed",
  "three-times-weekly",
  "house-call",
]);

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin");

  if (origin && !allowedOrigins.has(origin)) {
    return new Response("Origin not allowed", { status: 403 });
  }

  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders(origin),
    });
  }

  if (req.method !== "POST") {
    return respond({ error: "Method not allowed" }, 405, origin);
  }

  if (!req.headers.get("content-type")?.includes("application/json")) {
    return respond({ error: "Content-Type must be application/json" }, 415, origin);
  }

  try {
    const body = await req.json();

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return respond({ error: "Invalid request body" }, 400, origin);
    }

    const action = body.action;

    if (action !== "availability" && action !== "book") {
      return respond({ error: "Invalid action" }, 400, origin);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      console.error("Missing required Supabase environment variables");
      return respond({ error: "Booking service is not configured" }, 500, origin);
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    if (action === "availability") {
      const { start, end, service_key } = body;

      if (
        typeof start !== "string" ||
        typeof end !== "string" ||
        typeof service_key !== "string" ||
        !services.has(service_key)
      ) {
        return respond(
          { error: "Valid start, end, and service_key are required" },
          400,
          origin,
        );
      }

      const startDate = new Date(start);
      const endDate = new Date(end);

      if (
        !Number.isFinite(startDate.getTime()) ||
        !Number.isFinite(endDate.getTime()) ||
        endDate <= startDate
      ) {
        return respond({ error: "Invalid date range" }, 400, origin);
      }

      if (endDate.getTime() - startDate.getTime() > 31 * 24 * 60 * 60 * 1000) {
        return respond({ error: "Date range cannot exceed 31 days" }, 400, origin);
      }

      const { data, error } = await supabase.rpc("get_available_slots", {
        p_start: startDate.toISOString(),
        p_end: endDate.toISOString(),
        p_service_key: service_key,
      });

      if (error) {
        console.error("Availability RPC failed:", error.message);
        return respond({ error: "Could not load available times" }, 500, origin);
      }

      return respond({ slots: data ?? [] }, 200, origin);
    }

    const {
      slot_id,
      service_key,
      athlete_name,
      athlete_age,
      sport,
      position,
      athlete_email,
      guardian_name,
      guardian_email,
      guardian_phone,
      training_goals,
      notes,
    } = body;

    if (
      typeof slot_id !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slot_id)
    ) {
      return respond({ error: "A valid appointment slot is required" }, 400, origin);
    }

    if (typeof service_key !== "string" || !services.has(service_key)) {
      return respond({ error: "Invalid training service" }, 400, origin);
    }

    if (
      typeof athlete_name !== "string" ||
      !athlete_name.trim() ||
      athlete_name.length > 150
    ) {
      return respond({ error: "Enter the athlete's name" }, 400, origin);
    }

    if (
      !Number.isInteger(athlete_age) ||
      athlete_age < 6 ||
      athlete_age > 110
    ) {
      return respond({ error: "Enter a valid athlete age" }, 400, origin);
    }

    if (
      typeof guardian_phone !== "string" ||
      !guardian_phone.trim() ||
      guardian_phone.length > 40
    ) {
      return respond({ error: "Enter a contact phone number" }, 400, origin);
    }

    if (
      athlete_email != null &&
      athlete_email !== "" &&
      (typeof athlete_email !== "string" ||
        athlete_email.length > 254 ||
        !emailPattern.test(athlete_email))
    ) {
      return respond({ error: "Enter a valid athlete email" }, 400, origin);
    }

    if (
      guardian_email != null &&
      guardian_email !== "" &&
      (typeof guardian_email !== "string" ||
        guardian_email.length > 254 ||
        !emailPattern.test(guardian_email))
    ) {
      return respond({ error: "Enter a valid guardian email" }, 400, origin);
    }

    const optionalTextFields = [
      ["sport", sport, 100],
      ["position", position, 100],
      ["guardian_name", guardian_name, 150],
      ["training_goals", training_goals, 2000],
      ["notes", notes, 4000],
    ] as const;

    for (const [field, value, maxLength] of optionalTextFields) {
      if (value != null && (
        typeof value !== "string" || value.length > maxLength
      )) {
        return respond({ error: `Invalid ${field}` }, 400, origin);
      }
    }

    const { data, error } = await supabase.rpc("reserve_appointment", {
      p_slot_id: slot_id,
      p_service_key: service_key,
      p_athlete_name: athlete_name.trim(),
      p_athlete_age: athlete_age,
      p_sport: sport?.trim() || "",
      p_position: position?.trim() || "",
      p_athlete_email: athlete_email?.trim() || "",
      p_guardian_name: guardian_name?.trim() || "",
      p_guardian_email: guardian_email?.trim() || "",
      p_guardian_phone: guardian_phone.trim(),
      p_training_goals: training_goals?.trim() || "",
      p_notes: notes?.trim() || "",
    });

    if (error) {
      console.error("Reservation RPC failed:", error.message);
      return respond(
        { error: "Could not complete the booking. The slot may no longer be available." },
        409,
        origin,
      );
    }

    // The server is the single sender for appointment request emails.
    // The browser must not send a second EmailJS notification.
    try {
      const { data: booking, error: bookingError } = await supabase
        .from("bookings")
        .select("id, service_key, athlete_name, athlete_age, sport, position, athlete_email, guardian_name, guardian_email, guardian_phone, training_goals, notes, payment_method, booking_slots(starts_at)")
        .eq("id", data)
        .maybeSingle();

      if (bookingError || !booking) {
        console.error("Booking saved, but appointment email details could not be loaded:", bookingError?.message);
      } else {
        const slot = Array.isArray(booking.booking_slots) ? booking.booking_slots[0] : booking.booking_slots;
        const start = slot?.starts_at ? new Date(slot.starts_at) : null;
        const dateText = start ? new Intl.DateTimeFormat("en-US", {
          timeZone: "America/Phoenix", weekday: "long", month: "long", day: "numeric", year: "numeric"
        }).format(start) : "Not available";
        const timeText = start ? new Intl.DateTimeFormat("en-US", {
          timeZone: "America/Phoenix", hour: "numeric", minute: "2-digit"
        }).format(start) : "Not available";
        const serviceDetails: Record<string, { name: string; price: string }> = {
          "one-on-one": { name: "1-on-1 Session", price: "$75 / session" },
          "group-speed": { name: "Group Speed Training", price: "$55 / athlete" },
          "three-times-weekly": { name: "3x Weekly Package", price: "$195 / week" },
          "house-call": { name: "House Call Session", price: "$100 / session" },
        };
        const service = serviceDetails[booking.service_key] || { name: booking.service_key, price: "See booking details" };
        const adminUrl = `https://simmonsperformance.github.io/simmons-performance-training/admin-orders.html?booking=${encodeURIComponent(booking.id)}`;
        const customerEmail = booking.guardian_email || booking.athlete_email || "";
        const submittedAt = new Date().toISOString();
        const notesText = [
          booking.training_goals ? `Training goals: ${booking.training_goals}` : "",
          booking.notes || "",
        ].filter(Boolean).join("\\n") || "None provided";

        await sendEmailJs("template_t8ci7aw", {
          to_email: "simmonsperftraining@gmail.com",
          customer_name: booking.guardian_name || booking.athlete_name,
          customer_email: customerEmail,
          customer_phone: booking.guardian_phone || "Not provided",
          athlete_name: booking.athlete_name,
          athlete_age: String(booking.athlete_age ?? ""),
          athlete_email: booking.athlete_email || "",
          parent_name: booking.guardian_name || "",
          parent_email: booking.guardian_email || "",
          parent_phone: booking.guardian_phone || "",
          sport: booking.sport || "",
          position: booking.position || "",
          training_goals: booking.training_goals || "",
          product_service: service.name,
          price: service.price,
          payment_method: booking.payment_method || "See booking notes",
          payment_status: "Pending approval and payment verification",
          appointment_date: dateText,
          appointment_time: timeText,
          appointment_datetime: `${dateText} at ${timeText} Arizona time`,
          notes: notesText,
          submitted_at: submittedAt,
          booking_id: booking.id,
          order_id: booking.id,
          admin_url: adminUrl,
          review_url: adminUrl,
          booking_url: adminUrl,
          subject: `NEW APPOINTMENT REQUEST - ${service.name}`,
          message: [
            "NEW APPOINTMENT REQUEST",
            `Athlete: ${booking.athlete_name}`,
            `Service: ${service.name}`,
            `Price: ${service.price}`,
            `Appointment date: ${dateText}`,
            `Appointment time: ${timeText} Arizona time`,
            `Customer email: ${customerEmail}`,
            `Customer phone: ${booking.guardian_phone || "Not provided"}`,
            `Booking ID: ${booking.id}`,
            `Review request: ${adminUrl}`,
          ].join("\\n"),
        });
      }
    } catch (emailError) {
      // The appointment is already reserved; log email failure without losing it.
      console.error("Appointment saved, but business notification failed:", emailError instanceof Error ? emailError.message : "Unknown error");
    }

    return respond({ success: true, booking_id: data }, 200, origin);
  } catch (error) {
    console.error(
      "Booking endpoint error:",
      error instanceof Error ? error.message : "Unknown error",
    );
    return respond({ error: "An unexpected booking error occurred" }, 500, origin);
  }
});
