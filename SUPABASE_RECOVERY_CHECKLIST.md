# Supabase recovery checklist — Simmons Performance Training
Audit date: 2026-11-01
Repository: https://github.com/Simmonsperformance/simmons-performance-training
Supabase project ref: abbvzklzlsvyytlwhnmg

## Confirmed during audit
- Supabase project status at audit: ACTIVE_HEALTHY.
- Six deployed Edge Functions were fetched directly from Supabase and their source snapshots were committed under `supabase/deployed-backup/2026-11-01-*`.
- Deployed function names and versions:
  - book-appointment — v47
  - create-digital-order — v28
  - manage-digital-orders — v33
  - smooth-service (display name: Connection-test) — v26
  - manage-appointments — v13
  - customer-ai-assistant — v5
- Current public tables inspected: booking_slots, bookings, digital_products, digital_orders, digital_order_rate_limits. All had RLS enabled; the API's row estimates/counts were 0 at audit time. This is not a database data export.
- The deployed database reports 11 applied migrations. The repository contains only a partial and partly differently-versioned set of migration files. Do not assume the checked-in migrations alone can recreate the exact current database.

## Applied migration history reported by Supabase
- 202610080001 digital_orders
- 20261012023910 appointment_slots_60_minute_no_overlap
- 20261012023923 appointment_60_minute_conflict_blocking
- 20261015202237 confirmed_appointment_hour_block_exclude_group_training
- 20261015202319 preserve_rejection_behavior_for_appointment_rule
- 20261015204554 allow_adult_athletes_without_guardian_info
- 20261020235041 personalized_nutrition_intake_manual_fulfillment
- 20261020235204 retire_legacy_nutrition_products
- 20261023013534 restore_nutrition_pdfs_add_personalized_50
- 20261023013651 manual_fulfillment_for_new_personalized_product
- 20261026032402 fix_booking_availability_and_90_minute_sessions

## Environment variables / secrets to preserve privately
Never commit secret values to GitHub. In Supabase Dashboard, record the current names and securely store the values in a password manager or encrypted offline backup. Function source references these names:
- SUPABASE_URL (platform-provided)
- SUPABASE_SERVICE_ROLE_KEY (platform secret; never expose)
- EMAILJS_SERVICE_ID
- EMAILJS_PUBLIC_KEY
- SPT_PUBLIC_SITE_URL
- SPT_ALLOWED_ORIGINS
- APPOINTMENT_ADMIN_USER_ID
- APPOINTMENT_REQUEST_TEMPLATE_ID (code also checks EMAILJS_APPOINTMENT_REQUEST_TEMPLATE_ID)
- ORDER_RATE_LIMIT_SALT
- GEMINI_API_KEY
Also verify any other configured secrets in the Supabase project's Edge Function Secrets page, including any older EmailJS template variables such as EMAILJS_ORDER_TEMPLATE_ID and EMAILJS_DELIVERY_TEMPLATE_ID. Secret values were not accessible to this audit and are not backed up here.

## Still required before calling recovery complete
1. Export a full database schema dump from the Supabase project (tables, columns, constraints, indexes, RLS policies, grants, triggers, SQL functions/RPCs, extensions, and storage policies). The current repository migration files do not match the full applied migration history.
2. Export database data separately, even though the five inspected public tables reported 0 rows at audit time. Confirm whether any other schemas contain data.
3. Back up Storage buckets and their objects (including nutrition PDFs) and record bucket access policies. This audit did not verify storage.
4. Securely back up all current Supabase Edge Function secret values and required Auth configuration/provider settings. Do not place secrets in this repository.
5. Keep an independent local ZIP/Git clone of the repository, not just the GitHub copy.
6. Perform a restore test in a separate Supabase project before relying on this as a disaster-recovery backup.

## Important
A GitHub source backup does not preserve Supabase database records, Storage objects, Auth users/settings, or secret values. Pausing a project is different from deleting it, but recovery should not depend on a successful unpause.
