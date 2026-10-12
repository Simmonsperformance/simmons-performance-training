# Digital orders deployment checklist

The digital-order workflow is not live until the migration, private PDFs, Edge Function secrets, functions, EmailJS templates, admin account, and static-site publishing rules below are configured and tested.

## Catalog discovered in this project

These exact local files exist under `Programs/`:

| Product ID | Customer-facing product | Amount | Private Storage object key |
| --- | --- | ---: | --- |
| `athlete-nutrition-guide` | SIMMONS PERFORMANCE ATHLETE NUTRITION GUIDE | $30.00 | `athlete-nutrition-guide/Simmons_Performance_Athlete_Nutrition_Guide_PREMIUM.pdf` |
| `muscle-building-nutrition-guide` | SIMMONS PERFORMANCE MUSCLE-BUILDING NUTRITION GUIDE | $30.00 | `muscle-building-nutrition-guide/Simmons_Performance_Muscle_Building_Nutrition_Guide_PREMIUM.pdf` |
| `fat-loss-nutrition-guide` | SIMMONS PERFORMANCE FAT-LOSS NUTRITION GUIDE | $30.00 | `fat-loss-nutrition-guide/Simmons_Performance_Fat_Loss_Nutrition_Guide_PREMIUM.pdf` |
| `meal-prep-grocery-guide` | SIMMONS PERFORMANCE MEAL PREP & GROCERY GUIDE | $30.00 | `meal-prep-grocery-guide/Simmons_Performance_Meal_Prep_Grocery_Guide_PREMIUM.pdf` |
| `general-fitness-programs` | General Fitness Programs | $50.00 | `general-fitness-programs/Simmons_Performance_General_Fitness_Programs_PREMIUM_FIXED.pdf` |

The site also lists Strength Programs, Speed & Agility Programs, Football Performance Programs, and Training + Nutrition Bundles at $50. Their cards are future/placeholder offers and no matching PDF files exist in the project. They are recorded as not orderable, and the create-order function rejects them until a real matching product file is supplied and the catalog row is deliberately enabled.

## 1. Apply the database migration

From the project root, link the CLI to the existing Supabase project and apply the migration:

```powershell
supabase login
supabase link --project-ref abbvzklzlsvyytlwhnmg
supabase db push
```

The migration creates the catalog, pending-order records, an IP rate-limit table, restricted RPC functions, and the private `digital-products-private` Storage bucket. RLS is enabled and there are no client table policies; only Edge Functions using the service role access these tables.

Review the migration before applying it in production. Back up the Supabase database first.

## 2. Upload PDFs privately and stop publishing public copies

Upload only the five real PDFs listed above into their exact object keys in the `digital-products-private` bucket. Keep the bucket private. Do not create public Storage URLs.

**Important:** The PDFs currently live under the static website root in `Programs/`. Many static hosts serve those files by URL. Before going live, configure the host's publish artifact to exclude `Programs/` while retaining the files locally for private upload, or move the site publishing root to an artifact that does not contain that directory. Test that each old `/Programs/<filename>.pdf` URL returns 404/403 from the deployed host. The deployment platform is not identified/configured in this repository, so this host-specific protection step must be completed in the actual hosting project.

Do not set a product's `orderable` flag true unless its matching file has been uploaded and verified in the private bucket.

## 3. Configure order notification and delivery email templates

The existing business notification template ID is supplied through `EMAILJS_ORDER_TEMPLATE_ID`. Verify that this template is configured with:

- Recipient: `{{to_email}}`
- Subject: `{{subject}}`
- Product name: `{{product_service}}`
- Server-authoritative amount: `{{price}}`
- `{{order_id}}`, `{{product_id}}`, `{{payment_method}}`, `{{payment_status}}`
- `{{customer_name}}`, `{{customer_email}}`, `{{customer_phone}}`, `{{notes}}`, `{{submitted_at}}`
- A review link using `{{admin_url}}`

The review link opens `admin-orders.html?order=<order-id>`. The UUID in the link is not an authorization token: the admin page requires Supabase Auth, and the management Edge Function independently validates the signed-in user against the server-configured admin ID.

For delivery, preferably update and reuse the existing customer confirmation template (`template_mgv2at6`) by setting `EMAILJS_DELIVERY_TEMPLATE_ID` to that ID and adding the protected download fields below. If that template must remain unchanged, create a separate delivery template and set the secret to its ID instead. Include at least:

- `{{customer_name}}`
- `{{product_service}}`
- `{{price}}`
- `{{order_id}}`
- `{{download_url}}`
- `{{download_expires_at}}`
- `{{business_contact}}`

Set its recipient to `{{to_email}}`. The signed URL expires after 48 hours. Do not put a storage service-role key, permanent file URL, or private credentials in a template.

## 4. Configure server-side secrets

Set Edge Function secrets in the Supabase project, not in frontend JavaScript. The purchase business notification uses the existing configured business template; delivery uses the new delivery template ID. Use the existing public key/service/templates from `email-config.js` as inputs when setting secrets, without changing that file.

Required names:

- `EMAILJS_SERVICE_ID`
- `EMAILJS_PUBLIC_KEY`
- `EMAILJS_ORDER_TEMPLATE_ID` (use the existing business notification template ID)
- `EMAILJS_DELIVERY_TEMPLATE_ID` (the new customer delivery template ID)
- `ORDER_ADMIN_USER_ID` (UUID of the one Supabase Auth user authorized to administer orders)
- `SPT_ALLOWED_ORIGINS` (comma-separated exact production origin(s), plus the current local-development origin while testing)
- `SPT_PUBLIC_SITE_URL` (canonical HTTPS site URL used for the private admin link)
- `ORDER_RATE_LIMIT_SALT` (generate a long random value; keep it only in Supabase Function Secrets)

Example command shape (replace quoted placeholders in your own secure terminal):

```powershell
supabase secrets set EMAILJS_SERVICE_ID="<existing-service-id>" EMAILJS_PUBLIC_KEY="<existing-public-key>" EMAILJS_ORDER_TEMPLATE_ID="<existing-business-template-id>" EMAILJS_DELIVERY_TEMPLATE_ID="<new-delivery-template-id>" ORDER_ADMIN_USER_ID="<admin-auth-user-uuid>" SPT_ALLOWED_ORIGINS="https://<your-domain>" SPT_PUBLIC_SITE_URL="https://<your-domain>" ORDER_RATE_LIMIT_SALT="<random-secret>"
```

Do not paste secrets into source files, chat, or a committed `.env` file. Supabase supplies `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` to Edge Functions; never copy the service-role key into the site.

## 5. Deploy the functions

```powershell
supabase functions deploy create-digital-order --no-verify-jwt
supabase functions deploy manage-digital-orders --no-verify-jwt
```

The create endpoint uses a per-hour rate limit and the client-supplied idempotency UUID. The manage endpoint independently verifies the caller's Supabase Auth access token and requires its user ID to equal `ORDER_ADMIN_USER_ID`. `admin-orders.html` is not an authorization boundary; the server function is.

## 6. Publish the static front end safely

`order-config.js` contains only the project URL, an already-public publishable key, and function URLs. The website must load `order-config.js` and the Supabase browser SDK before `script.js`. The current purchase modal sends product ID and customer fields only. The server loads the authoritative product name and amount from `digital_products`; it ignores any browser-supplied price.

The booking flow and appointment Edge Function are separate and are not changed by this digital-order subsystem.

## 7. Required end-to-end verification

Run these tests only after the private bucket and templates are configured:

1. Create an order for each of the five orderable product IDs. Confirm the database stores a unique ID, exact server amount, pending payment status, pending delivery status, customer fields, and selected payment method.
2. Change the amount in browser developer tools and retry with a new idempotency key. Confirm the stored amount remains the catalog amount.
3. Repeat an identical API request with the same idempotency key. Confirm the same order ID is returned and a second order is not inserted.
4. Submit an unavailable $50 placeholder product. Confirm it is rejected and no pending order is created.
5. Confirm a pending order in the authenticated admin page only after manually verifying receipt of payment. Confirm the atomic state claim allows a single delivery attempt.
6. Verify the delivery message contains the correct product's private signed URL and that the URL expires after 48 hours. Confirm no URL exists in the pre-payment order response or business notification.
7. Use an invalid delivery template to force a provider rejection. Confirm the order remains paid, delivery status becomes failed, and the admin retry action is available.
8. Simulate/observe a network timeout after request submission. Confirm delivery becomes unknown and the UI blocks retry until provider logs are checked, preventing a blind duplicate send.
9. Attempt to list/confirm orders while signed out and while signed in as any non-admin user. Both must be rejected by the manage function.
10. Verify all public `Programs/` PDF paths are blocked on the deployed site, while the signed private Storage link works only before its expiry.

## Current deployment status

The repository includes local migration and function source, but they have not been applied or deployed from this workspace. PDF uploads, EmailJS delivery template setup, required Supabase secrets, admin Auth account/UUID, static-host exclusion of `Programs/`, and live end-to-end tests remain operator steps. Do not represent this system as live until all steps pass.
