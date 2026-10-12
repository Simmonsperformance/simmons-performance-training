
-- Simmons Performance Training
-- Appointment approval and manual payment tracking
-- Review and test before applying to production.

BEGIN;

-- 1. Add payment tracking and workflow timestamps.
-- Existing booking records are preserved.
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS payment_method text,
  ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'unpaid',
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS paid_at timestamptz,
  ADD COLUMN IF NOT EXISTS rejected_at timestamptz;

-- 2. New bookings default to pending.
-- Existing booking statuses are not changed.
ALTER TABLE public.bookings
  ALTER COLUMN status SET DEFAULT 'pending';

-- 3. Replace only the known status constraint.
ALTER TABLE public.bookings
  DROP CONSTRAINT IF EXISTS bookings_status_check;

ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_status_check
  CHECK (
    status IN (
      'pending',
      'approved',
      'confirmed',
      'rejected',
      'cancelled'
    )
  );

-- 4. Restrict supported manual payment methods.
ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_payment_method_check
  CHECK (
    payment_method IS NULL
    OR payment_method IN ('zelle', 'cash_in_person')
  );

-- 5. Restrict payment status values.
ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_payment_status_check
  CHECK (
    payment_status IN ('unpaid', 'paid')
  );

COMMIT;
