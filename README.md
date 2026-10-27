# H&H Brandings Hyderabad storefront demo

A responsive React, Vite and TypeScript storefront for the H&H Brandings Hyderabad custom T-shirt business. The project includes a guest checkout integration with Razorpay and Supabase Edge Functions; real payments require the store's own credentials and deployed Supabase project.

## Run locally

Requirements: Node.js 20+ and npm. Dependencies are already present in this workspace.

```powershell
npm.cmd run dev
```

Build and preview:

```powershell
npm.cmd run build
npm.cmd run preview
```

For browser checks, start the dev server on port 4173 in one terminal:

```powershell
npm.cmd run dev -- --host 127.0.0.1 --port 4173
```

Then run the checks in a second terminal:

```powershell
npm.cmd run test:e2e
```

## Demo features

- A 2-second animated H&H eagle logo intro, branded header/footer, responsive collections, catalogue, custom enquiry and checkout sections.
- The supplied H&H Brandings logo is used in the intro, header and footer from `public/images/hh-branding-logo.jpg`.
- Eight sample products with INR pricing, search, category filtering, price sorting, colour and size selection, and quick product details.
- Variant-aware bag with quantity controls, remove actions and `localStorage` persistence. Customers sign in before checkout and can open a dedicated shipment tracking view from their account dashboard or the Track order navigation item.
- Prepared order and custom enquiry messages with WhatsApp URL encoding. Messages are only opened for review; customers send them themselves.
- Razorpay checkout integration that creates orders and verifies captured payments on Supabase Edge Functions. Payment secrets stay server-side.
- Eight supplied product and campaign images in `public/images/client/`, used locally across the hero, collections and catalogue.
- Reduced-motion styles and layouts checked at 375, 430, 768, 1366 and 1920 pixels.

## Enable online checkout

1. Create and configure the Supabase project, then apply the database migrations with `supabase db push`. This enables customer order history and carrier tracking fields.
2. Copy `.env.example` to `.env.local` and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from the Supabase project settings. For address search and map-based address lookup, optionally set `VITE_GOOGLE_MAPS_API_KEY`; enable Places API (New) and Geocoding API and restrict the browser key to your storefront domains. Customers can always type their address manually without this key.
3. Copy `supabase/functions/.env.example` to `supabase/functions/.env` for local Edge Function development. Set Razorpay test credentials, the local Supabase URL, anon key and service role key there. Never put Razorpay secrets or the service role key in a `VITE_` variable.
4. Set production Edge Function secrets in Supabase for `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` and `STORE_ALLOWED_ORIGINS` (comma-separated exact storefront origins). Supabase supplies its server-side service role key to hosted functions.
5. Deploy `create-payment-order`, `verify-payment`, `razorpay-webhook` and `update-order-tracking`. Configure the Razorpay webhook URL as `https://<project-ref>.supabase.co/functions/v1/razorpay-webhook` and subscribe to `payment.captured` and `payment.failed`.
6. Test with Razorpay test-mode keys and a successful test payment before switching the account to live keys. The storefront will show a setup message until the public Supabase URL/key are set.

Customers create an account or sign in before checkout. Supabase Auth owns the session, and row-level security limits customer views to their orders. To grant staff access, set that user’s `public.user_roles.role` to `admin` from the trusted Supabase SQL editor (never from the browser): `insert into public.user_roles (user_id, role) values ('<auth-user-uuid>', 'admin') on conflict (user_id) do update set role = 'admin';`. Admins can then update status, expected arrival, carrier, tracking number, HTTPS tracking URL, latest scan location and update note from the shipment tracking view. Each save adds a customer-visible `order_status_history` event. The location illustration is schematic; live carrier or GPS data is not connected. The checkout function recalculates amounts from its server-side catalogue. Keep that catalogue in `supabase/functions/create-payment-order/index.ts` aligned with `src/products.ts` whenever products, variants or prices change. Delivery charges are not added by the current checkout; the store must confirm them separately if applicable.

## Client configuration

Update `src/storeConfig.ts` with the approved brand name, announcement, WhatsApp business number (international digits only), Instagram URL, business email and location. The WhatsApp number is intentionally blank; WhatsApp actions show a setup message and reveal the prepared cart message until that number is supplied.

Edit `src/products.ts` to replace demo products, descriptions, colours, sizes, prices and artwork. Theme colours are CSS variables near the top of `src/style.css`. Replace the original vector campaign art in `public/images/` with client-approved photographs after they are supplied.

## Limitations before production

- Product browsing and cart contents live in the browser. Customer accounts, checkout orders, payment verification and order tracking use Supabase after configuration. Inventory reservation, automatic fulfillment updates, email receipts and refunds are not automated.
- WhatsApp requires the real business number before its links can open. Business contact details and policy copy are placeholders pending client approval.
- Product content and the local vector artwork are demonstration material and should be reviewed and replaced with the client's approved catalogue and brand assets before launch.
- Supabase function credentials, Razorpay account setup, webhook deployment and live payment approval must be completed before accepting real payments.









