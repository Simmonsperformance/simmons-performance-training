-- Secure state transitions for appointment administration.
-- The Edge Function authenticates the configured administrator before calling this RPC.
BEGIN;

CREATE OR REPLACE FUNCTION public.manage_appointment_action(
  p_booking_id uuid,
  p_action text,
  p_admin_id uuid,
  p_payment_method text DEFAULT NULL,
  p_admin_notes text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  current_booking public.bookings%ROWTYPE;
BEGIN
  IF p_action NOT IN ('approve', 'reject', 'verify_payment') THEN
    RAISE EXCEPTION 'Invalid appointment action';
  END IF;

  IF p_payment_method IS NOT NULL AND p_payment_method NOT IN ('zelle', 'cash_in_person') THEN
    RAISE EXCEPTION 'Choose Zelle or cash in person';
  END IF;

  SELECT * INTO current_booking
  FROM public.bookings
  WHERE id = p_booking_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Appointment not found';
  END IF;

  IF p_action = 'approve' THEN
    IF current_booking.status <> 'pending' THEN
      RAISE EXCEPTION 'Only pending requests can be approved';
    END IF;
    UPDATE public.bookings
      SET status = 'approved', approved_at = now(),
          admin_notes = COALESCE(p_admin_notes, admin_notes)
      WHERE id = p_booking_id;
  ELSIF p_action = 'reject' THEN
    IF current_booking.status NOT IN ('pending', 'approved') THEN
      RAISE EXCEPTION 'This appointment can no longer be rejected';
    END IF;
    UPDATE public.bookings
      SET status = 'rejected', rejected_at = now(),
          admin_notes = COALESCE(p_admin_notes, admin_notes)
      WHERE id = p_booking_id;
  ELSE
    IF current_booking.status <> 'approved' THEN
      RAISE EXCEPTION 'Approve the appointment before verifying payment';
    END IF;
    IF p_payment_method IS NULL THEN
      RAISE EXCEPTION 'Select a payment method';
    END IF;
    UPDATE public.bookings
      SET status = 'confirmed', payment_status = 'paid',
          payment_method = p_payment_method, paid_at = now(),
          admin_notes = COALESCE(p_admin_notes, admin_notes)
      WHERE id = p_booking_id;
  END IF;

  RETURN jsonb_build_object('booking_id', p_booking_id, 'action', p_action, 'admin_id', p_admin_id);
END;
$$;

REVOKE ALL ON FUNCTION public.manage_appointment_action(uuid, text, uuid, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.manage_appointment_action(uuid, text, uuid, text, text) TO service_role;

COMMIT;
