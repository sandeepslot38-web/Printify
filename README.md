# Culture Lab — premium streetwear ecommerce demo

A responsive React/Vite storefront and admin workspace for an original, fictional streetwear label. The current app is a **browser-saved demo**: the product catalogue, bag, wishlist, homepage headline, announcement, and simulated orders persist in the current browser with `localStorage`. It is not a production commerce backend.

## Run locally

Requirements: Node.js 20+ and npm.

```sh
npm install
npm run dev
```

Build and preview:

```sh
npm run build
npm run preview
```

## Included demo flows

- Responsive home, catalogue, collection, product, wishlist, cart, checkout, order confirmation, account placeholder, and admin routes.
- 16 sample products, catalogue search, category filtering, sort, product sizes, stock-aware add-to-bag, wishlist, quick add, and local cart persistence.
- Demo coupon codes `WELCOME10` and `CULTURE15`.
- Address form validation and simulated success, failure, and cancellation states. The interface says when a transaction is simulated; it never represents it as a verified payment.
- Admin overview, local product creation, stock editing, homepage headline and announcement editing, and simulated order list.
- Layout adjustments for phone, tablet, and desktop; reduced-motion support and keyboard focus indicators.

## Supabase foundation

The initial schema and RLS policies are in `supabase/migrations/202610260001_core_store.sql`. The schema covers profiles, roles, catalogue and variants, media, collections, homepage sections, campaigns, settings, addresses, wishlists, coupons, orders and immutable item snapshots, payments, order history, reviews, newsletter subscriptions, publication snapshots, and admin audit logs. Public storefront reads and admin writes are separated with RLS. New signups receive the `customer` role only.

This migration is a starting point, not a complete production security review. Apply it to a disposable Supabase project first and review policies, storage access, indexes, lifecycle triggers, and data-retention requirements before production use. Never promote a user to admin from the browser. Grant admin through a trusted operator process after verifying the user's auth ID.

1. Install the [Supabase CLI](https://supabase.com/docs/guides/cli) and create a project.
2. Copy `.env.example` to `.env.local`; set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` for client configuration.
3. Link and apply migrations: `supabase link --project-ref YOUR_PROJECT_REF` then `supabase db push`.
4. Configure auth redirect URLs and email delivery in the Supabase project.
5. Configure private service secrets only in server-side Edge Function secrets. Never add `SUPABASE_SERVICE_ROLE_KEY` or `RAZORPAY_KEY_SECRET` to a `VITE_` variable.
6. The migration creates a public `storefront-media` bucket with a 50 MB per-file limit and image/video MIME allowlist. Review that limit and separate private files before launch.

## Payment setup and limitations

Razorpay credentials are not supplied. The current checkout therefore runs only the clearly labelled simulator: simulated success records a local demo order; simulated failure and cancellation leave the bag intact. It does not call Razorpay, create a server order, verify a signature, reserve inventory, or persist payment records remotely. No real order or payment is placed.

To launch real payments, implement and deploy authenticated/server-side Edge Functions that recalculate the catalogue price and stock, reserve inventory transactionally, validate coupons and shipping, create an idempotent pending order, create the Razorpay order, verify the Razorpay signature using a server secret, and safely process duplicate callbacks. Store only provider references and payment state. Configure credentials as Edge Function secrets, then integrate the verified flow in the client. Do not enable a live payment button until this workflow has been implemented and reviewed.

## Known limitations

- Supabase schema/RLS are supplied but the UI is not yet wired to Supabase Auth, database queries, realtime/publishing, or Storage. Browser data is per-browser and must not be treated as shared or authoritative.
- Admin pages are not authenticated in this demo. The local product editor and CMS controls are for presentation only; RLS is not a substitute for implementing server-backed admin sign-in and authorization.
- Media-library upload, video management, drag-and-drop homepage sections, scheduled campaign publishing, and version rollback are not implemented.
- Search and catalogue filters operate on the seeded browser catalogue. Account pages and policy pages are content placeholders; tracking, customer records, reviews, and real newsletters are not connected.
- Coupon validation is a demo-only code check, not a server-side eligibility/usage check. Prices, stock, shipping, and discounts must be recalculated by a trusted backend before accepting an order.
- Product images are remote Unsplash image URLs used for visual demo content; replace with client-owned/licensed assets and managed storage before production.
- No real company address, contact channel, shipping promise, policy text, or credentials were supplied. Placeholder contact information and delivery copy must be reviewed before publishing.
- End-to-end browser checks cover core shopping, coupon, checkout-failure and success, mobile navigation, and local admin edit flows. They do not cover the full master-prompt acceptance list, external integrations, security, or a comprehensive device/browser matrix.

## Handover checklist

- [x] Install dependencies and run `npm run build`.
- [x] Run core browser smoke checks with Chrome: `npm run dev -- --host 127.0.0.1 --port 4173` in one terminal, then `npm run test:e2e` in another.
- [ ] Run the app and verify shopping interactions at phone, tablet, laptop, and wide-desktop sizes.
- [ ] Configure Supabase Auth and connect the customer and admin UI to authenticated APIs.
- [ ] Add storage upload validation and image/video metadata, usage references, replace/delete safeguards, and publishing history.
- [ ] Add transactional server-side order and inventory operations plus verified Razorpay test-mode checkout.
- [ ] Test RLS from anon, customer, and admin accounts; verify customers cannot read another customer's orders.
- [ ] Replace sample imagery and all placeholder business/policy content.
- [ ] Complete the master prompt's end-to-end checklist before production claims or launch.
