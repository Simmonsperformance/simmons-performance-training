# Supabase schema and storage inventory snapshot
Audit date: 2026-11-01
Project ref: abbvzklzlsvyytlwhnmg

This is a schema/configuration inventory, not a full pg_dump. It contains no customer booking/order records, no authentication user records, and no secret values. Do not use it as a substitute for a full database backup.

## Current record counts (counts only)
- bookings: 46
- digital_orders: 17
- booking_slots: 9,240
- digital_products: 10
- digital_order_rate_limits: 11
- auth.users: 1

## Schema inventory (JSON)
```json
{
  "rls": [
    {
      "table": "booking_slots",
      "forced": false,
      "enabled": true
    },
    {
      "table": "bookings",
      "forced": false,
      "enabled": true
    },
    {
      "table": "digital_order_rate_limits",
      "forced": false,
      "enabled": true
    },
    {
      "table": "digital_orders",
      "forced": false,
      "enabled": true
    },
    {
      "table": "digital_products",
      "forced": false,
      "enabled": true
    }
  ],
  "tables": [
    {
      "table": "booking_slots",
      "columns": [
        {
          "name": "id",
          "type": "uuid",
          "default": "gen_random_uuid()",
          "nullable": "NO"
        },
        {
          "name": "service_key",
          "type": "text",
          "default": null,
          "nullable": "NO"
        },
        {
          "name": "starts_at",
          "type": "timestamp with time zone",
          "default": null,
          "nullable": "NO"
        },
        {
          "name": "ends_at",
          "type": "timestamp with time zone",
          "default": null,
          "nullable": "NO"
        },
        {
          "name": "is_available",
          "type": "boolean",
          "default": "true",
          "nullable": "NO"
        },
        {
          "name": "created_at",
          "type": "timestamp with time zone",
          "default": "now()",
          "nullable": "NO"
        }
      ]
    },
    {
      "table": "bookings",
      "columns": [
        {
          "name": "id",
          "type": "uuid",
          "default": "gen_random_uuid()",
          "nullable": "NO"
        },
        {
          "name": "slot_id",
          "type": "uuid",
          "default": null,
          "nullable": "NO"
        },
        {
          "name": "service_key",
          "type": "text",
          "default": null,
          "nullable": "NO"
        },
        {
          "name": "athlete_name",
          "type": "text",
          "default": null,
          "nullable": "NO"
        },
        {
          "name": "athlete_age",
          "type": "integer",
          "default": null,
          "nullable": "NO"
        },
        {
          "name": "sport",
          "type": "text",
          "default": null,
          "nullable": "NO"
        },
        {
          "name": "position",
          "type": "text",
          "default": null,
          "nullable": "YES"
        },
        {
          "name": "athlete_email",
          "type": "text",
          "default": null,
          "nullable": "YES"
        },
        {
          "name": "guardian_name",
          "type": "text",
          "default": null,
          "nullable": "NO"
        },
        {
          "name": "guardian_email",
          "type": "text",
          "default": null,
          "nullable": "NO"
        },
        {
          "name": "guardian_phone",
          "type": "text",
          "default": null,
          "nullable": "NO"
        },
        {
          "name": "training_goals",
          "type": "text",
          "default": null,
          "nullable": "YES"
        },
        {
          "name": "notes",
          "type": "text",
          "default": null,
          "nullable": "YES"
        },
        {
          "name": "status",
          "type": "text",
          "default": "'pending'::text",
          "nullable": "NO"
        },
        {
          "name": "created_at",
          "type": "timestamp with time zone",
          "default": "now()",
          "nullable": "NO"
        },
        {
          "name": "payment_method",
          "type": "text",
          "default": null,
          "nullable": "YES"
        },
        {
          "name": "payment_status",
          "type": "text",
          "default": "'unpaid'::text",
          "nullable": "NO"
        },
        {
          "name": "approved_at",
          "type": "timestamp with time zone",
          "default": null,
          "nullable": "YES"
        },
        {
          "name": "approved_by",
          "type": "uuid",
          "default": null,
          "nullable": "YES"
        },
        {
          "name": "paid_at",
          "type": "timestamp with time zone",
          "default": null,
          "nullable": "YES"
        },
        {
          "name": "paid_by",
          "type": "uuid",
          "default": null,
          "nullable": "YES"
        },
        {
          "name": "admin_notes",
          "type": "text",
          "default": null,
          "nullable": "YES"
        },
        {
          "name": "rejected_at",
          "type": "timestamp with time zone",
          "default": null,
          "nullable": "YES"
        }
      ]
    },
    {
      "table": "digital_order_rate_limits",
      "columns": [
        {
          "name": "ip_digest",
          "type": "text",
          "default": null,
          "nullable": "NO"
        },
        {
          "name": "window_start",
          "type": "timestamp with time zone",
          "default": null,
          "nullable": "NO"
        },
        {
          "name": "request_count",
          "type": "integer",
          "default": "0",
          "nullable": "NO"
        }
      ]
    },
    {
      "table": "digital_orders",
      "columns": [
        {
          "name": "id",
          "type": "uuid",
          "default": "gen_random_uuid()",
          "nullable": "NO"
        },
        {
          "name": "idempotency_key",
          "type": "uuid",
          "default": null,
          "nullable": "NO"
        },
        {
          "name": "product_id",
          "type": "text",
          "default": null,
          "nullable": "NO"
        },
        {
          "name": "product_name",
          "type": "text",
          "default": null,
          "nullable": "NO"
        },
        {
          "name": "amount_cents",
          "type": "integer",
          "default": null,
          "nullable": "NO"
        },
        {
          "name": "currency",
          "type": "text",
          "default": "'USD'::text",
          "nullable": "NO"
        },
        {
          "name": "customer_name",
          "type": "text",
          "default": null,
          "nullable": "NO"
        },
        {
          "name": "customer_email",
          "type": "text",
          "default": null,
          "nullable": "NO"
        },
        {
          "name": "customer_phone",
          "type": "text",
          "default": null,
          "nullable": "YES"
        },
        {
          "name": "payment_method",
          "type": "text",
          "default": null,
          "nullable": "NO"
        },
        {
          "name": "notes",
          "type": "text",
          "default": "''::text",
          "nullable": "NO"
        },
        {
          "name": "payment_status",
          "type": "text",
          "default": "'pending'::text",
          "nullable": "NO"
        },
        {
          "name": "delivery_status",
          "type": "text",
          "default": "'pending'::text",
          "nullable": "NO"
        },
        {
          "name": "business_notification_status",
          "type": "text",
          "default": "'pending'::text",
          "nullable": "NO"
        },
        {
          "name": "business_notification_error",
          "type": "text",
          "default": null,
          "nullable": "YES"
        },
        {
          "name": "delivery_attempt_count",
          "type": "integer",
          "default": "0",
          "nullable": "NO"
        },
        {
          "name": "delivery_started_at",
          "type": "timestamp with time zone",
          "default": null,
          "nullable": "YES"
        },
        {
          "name": "delivered_at",
          "type": "timestamp with time zone",
          "default": null,
          "nullable": "YES"
        },
        {
          "name": "download_expires_at",
          "type": "timestamp with time zone",
          "default": null,
          "nullable": "YES"
        },
        {
          "name": "last_delivery_error",
          "type": "text",
          "default": null,
          "nullable": "YES"
        },
        {
          "name": "created_at",
          "type": "timestamp with time zone",
          "default": "now()",
          "nullable": "NO"
        },
        {
          "name": "paid_at",
          "type": "timestamp with time zone",
          "default": null,
          "nullable": "YES"
        }
      ]
    },
    {
      "table": "digital_products",
      "columns": [
        {
          "name": "id",
          "type": "text",
          "default": null,
          "nullable": "NO"
        },
        {
          "name": "name",
          "type": "text",
          "default": null,
          "nullable": "NO"
        },
        {
          "name": "amount_cents",
          "type": "integer",
          "default": null,
          "nullable": "NO"
        },
        {
          "name": "currency",
          "type": "text",
          "default": "'USD'::text",
          "nullable": "NO"
        },
        {
          "name": "storage_path",
          "type": "text",
          "default": null,
          "nullable": "YES"
        },
        {
          "name": "orderable",
          "type": "boolean",
          "default": "false",
          "nullable": "NO"
        },
        {
          "name": "unavailable_reason",
          "type": "text",
          "default": null,
          "nullable": "YES"
        },
        {
          "name": "created_at",
          "type": "timestamp with time zone",
          "default": "now()",
          "nullable": "NO"
        },
        {
          "name": "updated_at",
          "type": "timestamp with time zone",
          "default": "now()",
          "nullable": "NO"
        }
      ]
    }
  ],
  "indexes": [
    {
      "name": "booking_slots_pkey",
      "table": "booking_slots",
      "definition": "CREATE UNIQUE INDEX booking_slots_pkey ON public.booking_slots USING btree (id)"
    },
    {
      "name": "booking_slots_service_time_unique",
      "table": "booking_slots",
      "definition": "CREATE UNIQUE INDEX booking_slots_service_time_unique ON public.booking_slots USING btree (service_key, starts_at, ends_at)"
    },
    {
      "name": "booking_slots_start_idx",
      "table": "booking_slots",
      "definition": "CREATE INDEX booking_slots_start_idx ON public.booking_slots USING btree (starts_at)"
    },
    {
      "name": "bookings_pkey",
      "table": "bookings",
      "definition": "CREATE UNIQUE INDEX bookings_pkey ON public.bookings USING btree (id)"
    },
    {
      "name": "bookings_slot_id_idx",
      "table": "bookings",
      "definition": "CREATE INDEX bookings_slot_id_idx ON public.bookings USING btree (slot_id)"
    },
    {
      "name": "digital_order_rate_limits_pkey",
      "table": "digital_order_rate_limits",
      "definition": "CREATE UNIQUE INDEX digital_order_rate_limits_pkey ON public.digital_order_rate_limits USING btree (ip_digest, window_start)"
    },
    {
      "name": "digital_orders_created_at_idx",
      "table": "digital_orders",
      "definition": "CREATE INDEX digital_orders_created_at_idx ON public.digital_orders USING btree (created_at DESC)"
    },
    {
      "name": "digital_orders_idempotency_key_key",
      "table": "digital_orders",
      "definition": "CREATE UNIQUE INDEX digital_orders_idempotency_key_key ON public.digital_orders USING btree (idempotency_key)"
    },
    {
      "name": "digital_orders_pkey",
      "table": "digital_orders",
      "definition": "CREATE UNIQUE INDEX digital_orders_pkey ON public.digital_orders USING btree (id)"
    },
    {
      "name": "digital_orders_status_idx",
      "table": "digital_orders",
      "definition": "CREATE INDEX digital_orders_status_idx ON public.digital_orders USING btree (payment_status, delivery_status, created_at DESC)"
    },
    {
      "name": "digital_products_pkey",
      "table": "digital_products",
      "definition": "CREATE UNIQUE INDEX digital_products_pkey ON public.digital_products USING btree (id)"
    }
  ],
  "policies": [],
  "triggers": [],
  "functions": [
    "CREATE OR REPLACE FUNCTION public.claim_digital_order_delivery(p_order_id uuid, p_action text)\n RETURNS jsonb\n LANGUAGE plpgsql\n SECURITY DEFINER\n SET search_path TO 'public'\nAS $function$\ndeclare\n  v_order public.digital_orders%rowtype;\nbegin\n  select * into v_order\n  from public.digital_orders\n  where id = p_order_id\n  for update;\n\n  if not found then return null; end if;\n\n  if p_action = 'confirm_payment'\n    and v_order.payment_status = 'pending'\n    and v_order.delivery_status = 'pending' then\n    if v_order.product_id = 'personalized-athlete-nutrition-guide' then\n      update public.digital_orders\n      set payment_status = 'paid',\n          paid_at = now(),\n          delivery_status = 'awaiting_manual',\n          delivery_attempt_count = 0,\n          delivery_started_at = null,\n          last_delivery_error = null\n      where id = p_order_id\n      returning * into v_order;\n    else\n      update public.digital_orders\n      set payment_status = 'paid',\n          paid_at = now(),\n          delivery_status = 'delivering',\n          delivery_attempt_count = delivery_attempt_count + 1,\n          delivery_started_at = now(),\n          last_delivery_error = null\n      where id = p_order_id\n      returning * into v_order;\n    end if;\n  elsif p_action = 'retry_delivery'\n    and v_order.payment_status = 'paid'\n    and v_order.delivery_status = 'failed' then\n    update public.digital_orders\n    set delivery_status = 'delivering',\n        delivery_attempt_count = delivery_attempt_count + 1,\n        delivery_started_at = now(),\n        last_delivery_error = null\n    where id = p_order_id\n    returning * into v_order;\n  elsif p_action = 'mark_manual_delivered'\n    and v_order.product_id = 'personalized-athlete-nutrition-guide'\n    and v_order.payment_status = 'paid'\n    and v_order.delivery_status = 'awaiting_manual' then\n    update public.digital_orders\n    set delivery_status = 'delivered',\n        delivered_at = now(),\n        download_expires_at = null,\n        last_delivery_error = null\n    where id = p_order_id\n    returning * into v_order;\n  else\n    return null;\n  end if;\n\n  return to_jsonb(v_order);\nend;\n$function$\n",
    "CREATE OR REPLACE FUNCTION public.consume_digital_order_rate_limit(p_ip_digest text, p_window_start timestamp with time zone)\n RETURNS boolean\n LANGUAGE plpgsql\n SECURITY DEFINER\n SET search_path TO 'public'\nAS $function$\r\ndeclare\r\n  v_count integer;\r\nbegin\r\n  insert into public.digital_order_rate_limits (ip_digest, window_start, request_count)\r\n  values (p_ip_digest, p_window_start, 1)\r\n  on conflict (ip_digest, window_start) do update\r\n    set request_count = public.digital_order_rate_limits.request_count + 1\r\n  returning request_count into v_count;\r\n\r\n  return v_count <= 6;\r\nend;\r\n$function$\n",
    "CREATE OR REPLACE FUNCTION public.finish_digital_order_delivery(p_order_id uuid, p_status text, p_error text DEFAULT NULL::text, p_download_expires_at timestamp with time zone DEFAULT NULL::timestamp with time zone)\n RETURNS boolean\n LANGUAGE plpgsql\n SECURITY DEFINER\n SET search_path TO 'public'\nAS $function$\r\nbegin\r\n  if p_status not in ('delivered', 'failed', 'unknown') then\r\n    raise exception 'Invalid delivery status';\r\n  end if;\r\n\r\n  update public.digital_orders\r\n  set delivery_status = p_status,\r\n      delivered_at = case when p_status = 'delivered' then now() else null end,\r\n      download_expires_at = case when p_status = 'delivered' then p_download_expires_at else null end,\r\n      last_delivery_error = case when p_status = 'delivered' then null else left(coalesce(p_error, 'Unspecified delivery error'), 500) end\r\n  where id = p_order_id\r\n    and payment_status = 'paid'\r\n    and delivery_status = 'delivering';\r\n\r\n  return found;\r\nend;\r\n$function$\n",
    "CREATE OR REPLACE FUNCTION public.get_available_slots(p_start timestamp with time zone, p_end timestamp with time zone, p_service_key text)\n RETURNS TABLE(slot_id uuid, starts_at timestamp with time zone, ends_at timestamp with time zone)\n LANGUAGE sql\n STABLE SECURITY DEFINER\n SET search_path TO ''\nAS $function$\n  SELECT s.id, s.starts_at, s.ends_at\n  FROM public.booking_slots s\n  WHERE s.is_available = true\n    AND s.starts_at >= p_start\n    AND s.starts_at < p_end\n    AND s.service_key = p_service_key\n    AND (\n      (p_service_key = 'group-speed' AND NOT EXISTS (\n        SELECT 1\n        FROM public.bookings b\n        JOIN public.booking_slots occupied ON occupied.id = b.slot_id\n        WHERE b.status IN ('pending', 'approved', 'confirmed')\n          AND b.service_key <> 'group-speed'\n          AND occupied.starts_at < s.ends_at\n          AND occupied.ends_at > s.starts_at\n      ))\n      OR\n      (p_service_key <> 'group-speed' AND NOT EXISTS (\n        SELECT 1\n        FROM public.bookings b\n        JOIN public.booking_slots occupied ON occupied.id = b.slot_id\n        WHERE b.status IN ('pending', 'approved', 'confirmed')\n          AND occupied.starts_at < s.ends_at\n          AND occupied.ends_at > s.starts_at\n      ))\n    )\n  ORDER BY s.starts_at;\n$function$\n",
    "CREATE OR REPLACE FUNCTION public.manage_appointment_action(p_booking_id uuid, p_action text, p_admin_id uuid, p_payment_method text DEFAULT NULL::text, p_admin_notes text DEFAULT NULL::text)\n RETURNS jsonb\n LANGUAGE plpgsql\n SECURITY DEFINER\n SET search_path TO 'public', 'pg_temp'\nAS $function$\nDECLARE\n  b public.bookings%ROWTYPE;\n  s public.booking_slots%ROWTYPE;\nBEGIN\n  IF p_action NOT IN ('approve', 'reject', 'verify_payment') THEN\n    RAISE EXCEPTION 'Unsupported action';\n  END IF;\n  IF p_admin_id IS NULL THEN\n    RAISE EXCEPTION 'Administrator required';\n  END IF;\n  PERFORM pg_advisory_xact_lock(734219);\n  SELECT * INTO b FROM public.bookings WHERE id = p_booking_id FOR UPDATE;\n  IF NOT FOUND THEN\n    RAISE EXCEPTION 'Appointment not found';\n  END IF;\n\n  IF p_action = 'approve' THEN\n    IF b.status <> 'pending' THEN\n      RAISE EXCEPTION 'Only pending appointments can be approved';\n    END IF;\n    SELECT * INTO s FROM public.booking_slots WHERE id = b.slot_id;\n    IF NOT FOUND OR NOT s.is_available THEN\n      RAISE EXCEPTION 'Appointment slot is unavailable';\n    END IF;\n    IF b.service_key <> 'group-speed' AND EXISTS (\n      SELECT 1\n      FROM public.bookings other_b\n      JOIN public.booking_slots other_s ON other_s.id = other_b.slot_id\n      WHERE other_b.id <> b.id\n        AND other_b.status IN ('approved', 'confirmed')\n        AND other_b.payment_status IN ('unpaid', 'pending_verification', 'verified')\n        AND other_b.service_key <> 'group-speed'\n        AND other_s.starts_at < s.starts_at + interval '60 minutes'\n        AND other_s.starts_at + interval '60 minutes' > s.starts_at\n    ) THEN\n      RAISE EXCEPTION 'This time conflicts with another individual appointment';\n    END IF;\n    UPDATE public.bookings\n    SET status = 'approved',\n        approved_at = now(),\n        approved_by = p_admin_id,\n        payment_method = COALESCE(p_payment_method, payment_method),\n        admin_notes = COALESCE(p_admin_notes, admin_notes)\n    WHERE id = b.id;\n\n  ELSIF p_action = 'reject' THEN\n    IF b.status NOT IN ('pending', 'approved') THEN\n      RAISE EXCEPTION 'This appointment cannot be rejected';\n    END IF;\n    UPDATE public.bookings\n    SET status = 'rejected',\n        admin_notes = COALESCE(p_admin_notes, admin_notes)\n    WHERE id = b.id;\n\n  ELSE\n    IF b.status <> 'approved' THEN\n      RAISE EXCEPTION 'Approve the appointment before verifying payment';\n    END IF;\n    IF COALESCE(p_payment_method, b.payment_method) NOT IN ('zelle', 'cash') THEN\n      RAISE EXCEPTION 'Select Zelle or cash';\n    END IF;\n    SELECT * INTO s FROM public.booking_slots WHERE id = b.slot_id;\n    IF b.service_key <> 'group-speed' AND EXISTS (\n      SELECT 1\n      FROM public.bookings other_b\n      JOIN public.booking_slots other_s ON other_s.id = other_b.slot_id\n      WHERE other_b.id <> b.id\n        AND other_b.status = 'confirmed'\n        AND other_b.payment_status = 'verified'\n        AND other_b.service_key <> 'group-speed'\n        AND other_s.starts_at < s.starts_at + interval '60 minutes'\n        AND other_s.starts_at + interval '60 minutes' > s.starts_at\n    ) THEN\n      RAISE EXCEPTION 'This time conflicts with another confirmed appointment';\n    END IF;\n    UPDATE public.bookings\n    SET status = 'confirmed',\n        payment_method = COALESCE(p_payment_method, payment_method),\n        payment_status = 'verified',\n        paid_at = now(),\n        paid_by = p_admin_id,\n        admin_notes = COALESCE(p_admin_notes, admin_notes)\n    WHERE id = b.id;\n  END IF;\n\n  RETURN jsonb_build_object('success', true, 'booking_id', b.id, 'action', p_action);\nEND;\n$function$\n",
    "CREATE OR REPLACE FUNCTION public.reserve_appointment(p_slot_id uuid, p_service_key text, p_athlete_name text, p_athlete_age integer, p_sport text, p_position text, p_athlete_email text, p_guardian_name text, p_guardian_email text, p_guardian_phone text, p_training_goals text, p_notes text)\n RETURNS uuid\n LANGUAGE plpgsql\n SECURITY DEFINER\n SET search_path TO ''\nAS $function$\nDECLARE\n  v_slot public.booking_slots%ROWTYPE;\n  v_booking_id uuid;\nBEGIN\n  PERFORM pg_catalog.pg_advisory_xact_lock(734219);\n\n  IF p_service_key IS NULL OR p_service_key NOT IN (\n    'one-on-one', 'group-speed', 'three-times-weekly', 'house-call'\n  ) THEN\n    RAISE EXCEPTION 'Invalid training service.';\n  END IF;\n\n  SELECT * INTO v_slot\n  FROM public.booking_slots\n  WHERE id = p_slot_id\n    AND service_key = p_service_key\n    AND is_available = true\n  FOR UPDATE;\n\n  IF NOT FOUND THEN\n    RAISE EXCEPTION 'This appointment time is unavailable.';\n  END IF;\n\n  IF EXISTS (\n    SELECT 1\n    FROM public.bookings b\n    JOIN public.booking_slots occupied ON occupied.id = b.slot_id\n    WHERE b.status IN ('pending', 'approved', 'confirmed')\n      AND (\n        p_service_key <> 'group-speed'\n        OR b.service_key <> 'group-speed'\n      )\n      AND occupied.starts_at < v_slot.ends_at\n      AND occupied.ends_at > v_slot.starts_at\n  ) THEN\n    RAISE EXCEPTION 'This appointment time conflicts with another active appointment.';\n  END IF;\n\n  IF p_athlete_name IS NULL OR btrim(p_athlete_name) = ''\n     OR p_athlete_age IS NULL OR p_athlete_age < 1 OR p_athlete_age > 120\n     OR p_sport IS NULL OR btrim(p_sport) = '' THEN\n    RAISE EXCEPTION 'Please complete the required athlete information.';\n  END IF;\n\n  IF p_athlete_age < 18 AND (\n       p_guardian_name IS NULL OR btrim(p_guardian_name) = ''\n       OR p_guardian_email IS NULL OR btrim(p_guardian_email) = ''\n       OR p_guardian_phone IS NULL OR btrim(p_guardian_phone) = ''\n  ) THEN\n    RAISE EXCEPTION 'Please complete the parent/guardian information for an athlete under 18.';\n  END IF;\n\n  IF (p_athlete_email IS NULL OR btrim(p_athlete_email) = '')\n     AND (p_guardian_email IS NULL OR btrim(p_guardian_email) = '') THEN\n    RAISE EXCEPTION 'Please enter an email address for booking updates.';\n  END IF;\n\n  INSERT INTO public.bookings (\n    slot_id, service_key, athlete_name, athlete_age, sport, position,\n    athlete_email, guardian_name, guardian_email, guardian_phone,\n    training_goals, notes, status, payment_status\n  )\n  VALUES (\n    v_slot.id, p_service_key, btrim(p_athlete_name), p_athlete_age,\n    btrim(p_sport), NULLIF(btrim(COALESCE(p_position, '')), ''),\n    NULLIF(btrim(COALESCE(p_athlete_email, '')), ''),\n    COALESCE(NULLIF(btrim(COALESCE(p_guardian_name, '')), ''), ''),\n    COALESCE(NULLIF(btrim(COALESCE(p_guardian_email, '')), ''), ''),\n    COALESCE(NULLIF(btrim(COALESCE(p_guardian_phone, '')), ''), ''),\n    NULLIF(btrim(COALESCE(p_training_goals, '')), ''),\n    NULLIF(btrim(COALESCE(p_notes, '')), ''),\n    'pending', 'unpaid'\n  )\n  RETURNING id INTO v_booking_id;\n\n  RETURN v_booking_id;\nEND;\n$function$\n",
    "CREATE OR REPLACE FUNCTION public.rls_auto_enable()\n RETURNS event_trigger\n LANGUAGE plpgsql\n SECURITY DEFINER\n SET search_path TO 'pg_catalog'\nAS $function$\nDECLARE\n  cmd record;\nBEGIN\n  FOR cmd IN\n    SELECT *\n    FROM pg_event_trigger_ddl_commands()\n    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')\n      AND object_type IN ('table','partitioned table')\n  LOOP\n     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN\n      BEGIN\n        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);\n        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;\n      EXCEPTION\n        WHEN OTHERS THEN\n          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;\n      END;\n     ELSE\n        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;\n     END IF;\n  END LOOP;\nEND;\n$function$\n"
  ],
  "extensions": [
    "pg_stat_statements",
    "pgcrypto",
    "plpgsql",
    "supabase_vault",
    "uuid-ossp"
  ],
  "constraints": [
    {
      "name": "booking_slots_pkey",
      "type": "p",
      "table": "booking_slots",
      "definition": "PRIMARY KEY (id)"
    },
    {
      "name": "booking_slots_service_key_check",
      "type": "c",
      "table": "booking_slots",
      "definition": "CHECK ((service_key = ANY (ARRAY['one-on-one'::text, 'group-speed'::text, 'three-times-weekly'::text, 'house-call'::text])))"
    },
    {
      "name": "valid_slot_time",
      "type": "c",
      "table": "booking_slots",
      "definition": "CHECK ((ends_at > starts_at))"
    },
    {
      "name": "bookings_athlete_age_check",
      "type": "c",
      "table": "bookings",
      "definition": "CHECK (((athlete_age >= 1) AND (athlete_age <= 120)))"
    },
    {
      "name": "bookings_confirmed_requires_verified_payment",
      "type": "c",
      "table": "bookings",
      "definition": "CHECK (((status <> 'confirmed'::text) OR ((payment_status = 'verified'::text) AND (approved_at IS NOT NULL) AND (approved_by IS NOT NULL) AND (paid_at IS NOT NULL) AND (paid_by IS NOT NULL))))"
    },
    {
      "name": "bookings_payment_method_check",
      "type": "c",
      "table": "bookings",
      "definition": "CHECK (((payment_method IS NULL) OR (payment_method = ANY (ARRAY['zelle'::text, 'cash'::text]))))"
    },
    {
      "name": "bookings_payment_status_check",
      "type": "c",
      "table": "bookings",
      "definition": "CHECK ((payment_status = ANY (ARRAY['unpaid'::text, 'pending_verification'::text, 'verified'::text, 'refunded'::text])))"
    },
    {
      "name": "bookings_pkey",
      "type": "p",
      "table": "bookings",
      "definition": "PRIMARY KEY (id)"
    },
    {
      "name": "bookings_service_key_check",
      "type": "c",
      "table": "bookings",
      "definition": "CHECK ((service_key = ANY (ARRAY['one-on-one'::text, 'group-speed'::text, 'three-times-weekly'::text, 'house-call'::text])))"
    },
    {
      "name": "bookings_slot_id_fkey",
      "type": "f",
      "table": "bookings",
      "definition": "FOREIGN KEY (slot_id) REFERENCES booking_slots(id)"
    },
    {
      "name": "bookings_status_check",
      "type": "c",
      "table": "bookings",
      "definition": "CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'confirmed'::text, 'rejected'::text, 'cancelled'::text])))"
    },
    {
      "name": "digital_order_rate_limits_pkey",
      "type": "p",
      "table": "digital_order_rate_limits",
      "definition": "PRIMARY KEY (ip_digest, window_start)"
    },
    {
      "name": "digital_orders_amount_cents_check",
      "type": "c",
      "table": "digital_orders",
      "definition": "CHECK ((amount_cents >= 0))"
    },
    {
      "name": "digital_orders_business_notification_status_check",
      "type": "c",
      "table": "digital_orders",
      "definition": "CHECK ((business_notification_status = ANY (ARRAY['pending'::text, 'sent'::text, 'failed'::text])))"
    },
    {
      "name": "digital_orders_currency_check",
      "type": "c",
      "table": "digital_orders",
      "definition": "CHECK ((currency = 'USD'::text))"
    },
    {
      "name": "digital_orders_delivery_attempt_count_check",
      "type": "c",
      "table": "digital_orders",
      "definition": "CHECK ((delivery_attempt_count >= 0))"
    },
    {
      "name": "digital_orders_delivery_status_check",
      "type": "c",
      "table": "digital_orders",
      "definition": "CHECK ((delivery_status = ANY (ARRAY['pending'::text, 'delivering'::text, 'delivered'::text, 'failed'::text, 'unknown'::text, 'awaiting_manual'::text])))"
    },
    {
      "name": "digital_orders_idempotency_key_key",
      "type": "u",
      "table": "digital_orders",
      "definition": "UNIQUE (idempotency_key)"
    },
    {
      "name": "digital_orders_payment_method_check",
      "type": "c",
      "table": "digital_orders",
      "definition": "CHECK ((payment_method = ANY (ARRAY['Zelle'::text, 'In-Person / Cash'::text])))"
    },
    {
      "name": "digital_orders_payment_status_check",
      "type": "c",
      "table": "digital_orders",
      "definition": "CHECK ((payment_status = ANY (ARRAY['pending'::text, 'paid'::text])))"
    },
    {
      "name": "digital_orders_pkey",
      "type": "p",
      "table": "digital_orders",
      "definition": "PRIMARY KEY (id)"
    },
    {
      "name": "digital_orders_product_id_fkey",
      "type": "f",
      "table": "digital_orders",
      "definition": "FOREIGN KEY (product_id) REFERENCES digital_products(id)"
    },
    {
      "name": "digital_products_amount_cents_check",
      "type": "c",
      "table": "digital_products",
      "definition": "CHECK ((amount_cents >= 0))"
    },
    {
      "name": "digital_products_check",
      "type": "c",
      "table": "digital_products",
      "definition": "CHECK (((NOT orderable) OR (storage_path IS NOT NULL)))"
    },
    {
      "name": "digital_products_currency_check",
      "type": "c",
      "table": "digital_products",
      "definition": "CHECK ((currency = 'USD'::text))"
    },
    {
      "name": "digital_products_pkey",
      "type": "p",
      "table": "digital_products",
      "definition": "PRIMARY KEY (id)"
    }
  ],
  "storage_buckets": [
    {
      "id": "digital-products-private",
      "name": "digital-products-private",
      "public": false,
      "file_size_limit": 52428800,
      "allowed_mime_types": [
        "application/pdf"
      ]
    }
  ],
  "storage_objects": [
    {
      "etag": "\"a65325c85eab5be439bc8ad7099a0e46\"",
      "name": "athlete-nutrition-guide/Simmons_Performance_Athlete_Nutrition_Guide_PREMIUM.pdf",
      "bucket_id": "digital-products-private",
      "mime_type": "application/pdf",
      "size_bytes": 7964
    },
    {
      "etag": "\"d41d8cd98f00b204e9800998ecf8427e\"",
      "name": "fat-loss-nutrition-guide/.emptyFolderPlaceholder",
      "bucket_id": "digital-products-private",
      "mime_type": "application/octet-stream",
      "size_bytes": 0
    },
    {
      "etag": "\"67e67a087712553dcf629eaa7f7e476a\"",
      "name": "fat-loss-nutrition-guide/Simmons_Performance_Fat_Loss_Nutrition_Guide_PREMIUM.pdf",
      "bucket_id": "digital-products-private",
      "mime_type": "application/pdf",
      "size_bytes": 6278
    },
    {
      "etag": "\"d41d8cd98f00b204e9800998ecf8427e\"",
      "name": "general-fitness-programs/.emptyFolderPlaceholder",
      "bucket_id": "digital-products-private",
      "mime_type": "application/octet-stream",
      "size_bytes": 0
    },
    {
      "etag": "\"6c0e69712f48803945b209877c4e1216\"",
      "name": "general-fitness-programs/Simmons_Performance_General_Fitness_Programs_PREMIUM_FIXED.pdf",
      "bucket_id": "digital-products-private",
      "mime_type": "application/pdf",
      "size_bytes": 35681
    },
    {
      "etag": "\"d41d8cd98f00b204e9800998ecf8427e\"",
      "name": "meal-prep-grocery-guide/.emptyFolderPlaceholder",
      "bucket_id": "digital-products-private",
      "mime_type": "application/octet-stream",
      "size_bytes": 0
    },
    {
      "etag": "\"e2ec694b2c722073a6c85d8f2d534d52\"",
      "name": "meal-prep-grocery-guide/Simmons_Performance_Meal_Prep_Grocery_Guide_PREMIUM.pdf",
      "bucket_id": "digital-products-private",
      "mime_type": "application/pdf",
      "size_bytes": 6706
    },
    {
      "etag": "\"d41d8cd98f00b204e9800998ecf8427e\"",
      "name": "muscle-building-nutrition-guide/.emptyFolderPlaceholder",
      "bucket_id": "digital-products-private",
      "mime_type": "application/octet-stream",
      "size_bytes": 0
    },
    {
      "etag": "\"1772161b4eb0886778ea2ed51292d791\"",
      "name": "muscle-building-nutrition-guide/Simmons_Performance_Muscle_Building_Nutrition_Guide_PREMIUM.pdf",
      "bucket_id": "digital-products-private",
      "mime_type": "application/pdf",
      "size_bytes": 6593
    }
  ],
  "storage_policies": []
}
```

## Storage warning
The bucket `digital-products-private` is private. The five PDF objects listed in this inventory are not copied into GitHub by this file. Download the actual PDFs from Supabase Storage and keep them in a private local backup. The four `.emptyFolderPlaceholder` entries are not product files.

## Recovery warning
A schema inventory does not include row data, Auth user credentials, storage object bytes, project secrets, SMTP/Auth provider settings, or Supabase platform configuration. Obtain a full database backup and separately preserve the private storage objects and credentials.
