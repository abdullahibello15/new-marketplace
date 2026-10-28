# ZAMANI NG MARKET HUB Backend: Build Plan

> How the real backend replaces the mock services. Written October 2026, before any backend code exists.


## Context

ZAMANI NG MARKET HUB is a working front-end prototype with **no backend**. About 45 service files in `src/features/*/services/` hold all the data in memory and answer through `mockResponse()` in [src/services/mockApi.ts](../apps/web/src/services/mockApi.ts). Real users, money and documents need a real backend before launch: a database, real authentication, Paystack payments with escrow, SMS and email, file storage, and server-side enforcement of every rule the browser checks today.

The prototype was built with a backend in mind, which makes this easier:
- **Every service is already async.** Each returns a Promise and throws `ApiError(message, status)`, so a service body can become a `fetch` without changing any page.
- **The request helper is ready for real tokens.** `mockApi.ts` already handles access tokens kept in memory, a single shared refresh, and retry on 401. `sessionBackend.ts` and `mockCookieJar.ts` mimic a rotating refresh token in an httpOnly cookie.
- **The business rules are pure TypeScript with tests**: the job and order state machines, escrow rules, billing and proration, the investor ledger, analytics aggregations, and admin roles. A TypeScript backend can **reuse them rather than rewrite them**.

**Decisions made:** Node + TypeScript, PostgreSQL, Paystack, AWS, phased MVP.

---

## 1. Architecture

```
            CloudFront ── S3 (web build: the existing Vite app)
                │
   Browser ─── ALB ── ECS Fargate: api (Fastify)  ──┬── RDS PostgreSQL 16 (+PostGIS, pg_trgm)
                                                    ├── ElastiCache Redis (rate limits, BullMQ, OTP)
   Paystack webhooks ──► api /webhooks/paystack     ├── S3 private bucket (KYC docs, photos) via presigned URLs
                                                    └── SQS-free: BullMQ queues on Redis
              ECS Fargate: worker (same image, BullMQ) ── Termii (SMS/OTP), SES (email), FCM (push)
```

- **Region:** `af-south-1` (Cape Town), the closest AWS region to Nigeria. Check this against the Nigeria Data Protection Act (NDPA 2023) obligations before launch.
- **Shape:** one modular monolith (an `api` service plus a `worker` service, built from the same image), not microservices. Each module matches a frontend feature slice.

### Stack
| Concern | Choice | Why |
|---|---|---|
| HTTP | **Fastify** + `fastify-type-provider-zod` | Fast and simple. Can reuse the existing **zod** schemas (`features/*/schemas.ts`) for validation. |
| DB access | **Drizzle ORM** + drizzle-kit migrations | TypeScript-first and close to SQL, with explicit transactions (important for money). |
| Database | PostgreSQL 16, PostGIS (distance search), pg_trgm (text search) | Enough for search at MVP scale, no Elasticsearch needed |
| Jobs and scheduling | **BullMQ** on Redis | Replaces the `runScheduled…Tasks()` read-time stand-ins |
| Auth | Own implementation: argon2id, JWT access token (15 min), rotating opaque refresh token in an httpOnly cookie, sessions table | Mirrors `sessionBackend.ts` and [sessionConfig.ts](../apps/web/src/features/auth/sessionConfig.ts) exactly |
| SMS / OTP | **Termii** (Nigerian, DND-route OTP) | |
| Email / push | AWS SES / Firebase Cloud Messaging | |
| PDFs | Keep generating on the client (jsPDF already works). The server only provides receipt data. | |
| Observability | pino logs → CloudWatch, Sentry, `/healthz` | |
| Tests | Vitest (shared with the frontend) + Testcontainers Postgres for integration tests | |
| IaC / CI | Terraform; GitHub Actions → ECR → ECS | |

---

## 2. Repository layout (npm workspaces monorepo)

```
apps/web/            ← the current Vite app moved here (src/, public/, vite.config.ts…)
apps/api/            ← Fastify server + worker entry point
  src/modules/<auth|vendors|discovery|jobs|orders|payments|escrow|subscriptions|reminders|admin|investor|files|notifications>/
      routes.ts  service.ts  repo.ts  (one per module)
  src/db/schema/*.ts  src/db/migrations/  src/jobs/*.ts  src/integrations/{paystack,termii,ses,s3}.ts
packages/domain/     ← pure rules, moved out of the frontend (both sides import them)
packages/contracts/  ← zod request/response schemas + DTO types for each endpoint
```

### Step 0 refactor: extract `packages/domain`

These files move into `packages/domain`, along with their tests:
- [jobs/stateMachine.ts](../apps/web/src/features/jobs/stateMachine.ts) and [jobs/cancellationPolicy.ts](../apps/web/src/features/jobs/cancellationPolicy.ts)
- `orders/stateMachine.ts`
- [payments/escrow/escrowRules.ts](../apps/web/src/features/payments/escrow/escrowRules.ts) and `escrowConfig.ts`
- `vendor-dashboard/utils/{billing,subscription,bundle}.ts`
- `investor/utils/ledger.ts`
- `admin/analytics/aggregations.ts`
- `admin/config/roles.ts`
- `payments/utils/receiptData.ts`

The frontend's existing paths re-export them, so no page changes. One coupling has to go first: these files import `i18n`, `i18n/labels` and `formatNaira`. **Change them to return message keys and parameters** (for example `{ key: 'jobs:guard.quoteExpired', params }`) instead of finished strings. The frontend translates the key; the API sends the key and the English text. That keeps the domain package free of UI code.

---

## 3. Core data model (Postgres)

**Money is stored as `bigint` kobo.** The API contracts carry kobo too, and the frontend converts at its service boundary.

**Every timestamp is `timestamptz`** (stored as UTC). The server runs with `TZ=Africa/Lagos` (Nigeria has no daylight
saving), but that only affects the domain's day-boundary logic (start of day, renewal ranges, "due today"), never how
times are stored.
- TODO: make the domain take an explicit timezone parameter (e.g. `@date-fns/tz`), so it stops depending on
  `process.env.TZ`.

- **Identity:**
  - `users` (phone E.164, unique email, argon2 password hash, language, status)
  - `user_roles`
  - `sessions` (refresh token *hash*, device, `remember`, `expires_at`, `revoked_at`)
  - `otp_challenges` (code hash, purpose, attempts, lockout)
- **Vendors:**
  - `vendors` (owner user, trade, type service/retail, LGA, PostGIS `location`, `verification_tier`, `standing`, rating cache)
  - `vendor_services`, `products` (stock), `portfolio_items`, `working_hours`, `blocked_dates`
- **Jobs:**
  - `jobs` (status, customer, vendor, quote, schedule window, address)
  - `job_events` (append-only history from `applyTransition`), `reschedules`, `reviews`
- **Orders:** `orders`, `order_items`, `order_events`.
- **Carts:** `cart_items(user_id, vendor_id, product_id, quantity, unit_price_seen, added_at, PRIMARY KEY(user_id, vendor_id, product_id))`. Signed-in customers only; a guest's cart stays in their browser (see §5a).
- **Payments:**
  - `payments` (Paystack reference, method, status, subject kind/id)
  - `escrows`, `ledger_entries` (**double-entry, append-only**: hold / release / refund / commission / payout)
  - `payouts`, `vendor_bank_accounts` (Paystack transfer recipient code)
- **Subscriptions:** `plans` (seeded), `subscriptions`, `invoices`, `associations`, `association_members`
- **Notifications and reminders:** `notifications`, `reminder_schedules`, `notification_preferences`, `delivery_log`
- **Admin:**
  - `admin_staff`
  - `verification_applications` + `verification_documents` (S3 keys; ID numbers **encrypted with KMS**, reveal is audited)
  - `disputes`, `dispute_messages`, `evidence_requests`, `moderation_items`, `appeals`
  - `audit_log` (append-only: a DB trigger rejects UPDATE, DELETE and TRUNCATE, and the app role lacks those grants; see §6)
  - `profile_invites`, `vendor_imports`
- **Investor (later):** `stakes`, `investor_ledger_entries`, `payout_requests`

**Concurrency rules:**
- Every status change runs `applyTransition()` from `packages/domain` inside a transaction with `SELECT … FOR UPDATE` on the row.
- Escrow is updated in the **same transaction**, keeping today's guarantee that each change is "seen exactly once".
- Verification claim locks (30 min) use a `claimed_by` / `claimed_until` column.

---

## 4. Cross-cutting rules

- **API style:** REST under `/v1`. Resource routes follow the service functions (for example `jobService.sendQuote` → `POST /v1/jobs/:id/quote`). Errors look like `{ error: { code, message, messageKey } }` with the status codes the services already use (400/401/403/404/409).
- **AuthZ:** a Fastify `preHandler` checks role and ownership on every route. For admins, `requirePermission()` uses the shared `roles.ts` (the same matrix the UI uses). **The server is the authority.**
- **Idempotency:** an `Idempotency-Key` header on payment, quote acceptance and payout routes. Paystack webhooks are deduplicated by event id.
- **Webhooks:** verify the HMAC-SHA512 `x-paystack-signature`, store the raw event, process it on the worker. Never trust the client's "payment done" redirect; always run `transaction/verify` on the server.
- **Rate limits:** Redis-backed limits on OTP send and verify (per phone and per IP), login, and password reset.
- **Files:** the client gets a presigned PUT URL, uploads directly, and the API records the S3 key. KYC documents go in a private bucket with short presigned GET URLs for admins only. Images are scanned and resized by a worker job.
- **Scheduled tasks** (BullMQ repeatable jobs on the worker), replacing the read-time `runScheduled…Tasks()`:
  - auto-confirm 48 h after work done
  - close completed jobs after 7 days
  - auto-complete orders after 72 h
  - deliver due reminders
  - subscription expiry → grace → suspension
  - evidence-request deadlines
  - verification claim expiry

---

## 5. Phases

Each phase has three parts: (a) migrations and tables, (b) API module and routes, (c) **switch that feature's frontend services** from `mockResponse` to the real API.

**How the frontend switches:** add `apiRequest()` in `apps/web/src/services/apiClient.ts`. It does the same thing as `mockResponse` (auth hooks, 401 → refresh → retry), but over `fetch` with `credentials: 'include'`. A `VITE_API_MODE=mock|live` setting chooses the implementation for each feature, so features move over one at a time and mock mode keeps working for demos.

### Phase 0: Foundations (≈2 wk)
- Convert to a monorepo, extract `packages/domain` (§2) and `packages/contracts`.
- Fastify skeleton: config, pino, Sentry, error mapper, `/healthz`.
- Drizzle setup, Docker Compose for local Postgres and Redis.
- Terraform: VPC, RDS, ElastiCache, ECR, ECS api + worker, S3, CloudFront, Secrets Manager, KMS.
- GitHub Actions CI: lint, typecheck, unit and integration tests, migrate, deploy to staging.
- Fix the timezone-dependent test in `aggregations.test.ts:287` first. CI should run with `TZ=Africa/Lagos` **and** `TZ=UTC`.

### Phase 1: Auth & accounts (≈3 wk)
- **Port these:** `authBackend.ts`, `sessionBackend.ts`, `signupBackend.ts`, `passwordResetBackend.ts`, `roleSetup.ts`, `accountService.ts`.
- **Real integrations:** Termii OTP, SES email codes.
- **Sessions:** a refresh cookie (`HttpOnly; Secure; SameSite=Lax; Path=/v1/auth`) rotated on each use. Reuse of an old token revokes the whole session family.
- **Test mode:** `MOCK_AUTH` stays dev-only. The API gets its own `OTP_TEST_MODE`, which is refused when `NODE_ENV=production`.
- **Frontend:** switch `authService.ts` and `sessionService.ts`, and remove `mockCookieJar.ts` from live mode.

### Phase 2: Vendors, discovery, public profile (≈3 wk)
- **Data:** vendor CRUD (`vendorProfileService.saveVendorProfile`), services, products, portfolio, working hours, blocked dates.
- **Search:** `discoveryService.searchVendors` / `searchVendorsForMap` / `getSuggestions` built on PostGIS `ST_DWithin` + pg_trgm, with the filters from the URL and paginated responses (`types/pagination.ts`).
- **Profiles:** `publicProfileService`, reviews, and the rating cache recalculated **on every review change**. This fixes the known gap where ratings only update after moderation.
- **Files:** the files module with presigned uploads, then seed migration of the demo data for staging.

### Phase 3: Jobs, notifications, reminders (≈3 wk)
- **Jobs:** port `jobService.ts` (create request, quote, accept/reject, start, work done, confirm, reschedule, cancel, report a problem, review) on top of the shared state machine and cancellation policy.
- **Notifications:** `notificationService` + `reminderService`. The worker delivers in-app, SMS (Termii) and push (FCM) according to the user's preferences.
- **Scheduled jobs:** auto-confirm and auto-close.

### Phase 4: Payments, escrow, payouts (≈4 wk), the riskiest phase
- **Integration:** `integrations/paystack.ts` replaces `mockPsp.ts`, with the same function set:
  - card: `transaction/initialize` + hosted checkout
  - transfer: Dedicated Virtual Accounts
  - USSD: charge API
  - `transaction/verify`
  - payouts: transfer recipients + transfers
- **Escrow:** port `paymentService`, `escrowService` and `transactionService`. Escrow movements are written as double-entry `ledger_entries`; the commission comes from `escrowConfig` (5%, still MOCK, so confirm it). Cash payments skip escrow, as today.
- **Payouts:** `earningsService.requestPayout` → Paystack transfer, with the transfer webhooks updating its status.
- **Daily reconciliation job:** compare the ledger with Paystack settlements and alert on any mismatch.
- **Receipts:** `getReceiptDocument` returns the data from `receiptData`; the PDF stays on the client.

### Phase 5: Admin MVP (≈3 wk) → **MVP launch**
- **Staff and audit:** admin login (phone OTP, shorter sessions), `adminAccountService`, and the audit log written inside every admin transaction.
- **Verification:** queue, claim lock, encrypted ID with an audited reveal, approve (sets the tier), reject, request more info, vendor resubmission.
- **Disputes:** messages, evidence requests, internal notes, and resolutions through the job/order service + escrow (release, refund, split, dismiss).
- **Moderation:** queue, removals, warnings, suspension through `vendorStanding()`, appeals.
- **Launch hardening:**
  - pen test of auth and payments
  - load test of search and webhooks
  - RDS backups with point-in-time recovery, restore drill
  - NDPA privacy notice, data-export and data-deletion endpoints

### After launch
- **Phase 6: Orders/retail (≈3 wk).** `orderService` (delivery and pickup paths, stock reservation with `FOR UPDATE`, one order per vendor at checkout), order disputes, the 72 h auto-complete, the product catalogue and the saved cart (§5a).
- **Phase 7: Subscriptions & associations (≈3 wk).**
  - `subscriptionService`: plans, invoices paid through Paystack, renewals, and the grace/suspension worker. This also fixes the gap where a moderator suspension wasn't reflected in the dashboard banner.
  - `associationService` / `associationAdminService` (bundle billing, mid-period proration).
  - `claimService` (profile invites), `vendorImportService` (bulk import).
- **Phase 8: Analytics, outreach, investor, rider.**
  - Analytics: build `analyticsFacts` from SQL views or nightly materialised views, then reuse `aggregations.ts`; CSV export comes from the server. Outreach (SLA and re-engagement flags).
  - Investor ledger and payouts.
  - Rider delivery features, and in-app messaging (the known gap that blocks replies in disputes).

---

## 5a. Guest browsing and checkout

Already built against the mock API: guests browse, search and fill a cart, and sign in at checkout.
The real API must keep the same rules:

| Route | Access | Mock today |
|---|---|---|
| `GET /v1/vendors`, `GET /v1/vendors/:id`, `GET /v1/products`, `GET /v1/products/:vendorId/:productId` | Public | `discoveryService`, `publicProfileService`, `productCatalogueService` |
| `GET /v1/cart`, `PUT /v1/cart`, `POST /v1/cart/merge` | Customer | `orders/services/cartService.ts` |
| `POST /v1/checkout` | Customer, verified email or phone | `orderService.placeOrders` |
| `POST /v1/payments`, `GET /v1/payments/:ref` | Owner of the job or order, verified | `paymentService.initiatePayment` / `verifyPayment` |

```ts
// apps/api/src/modules/orders/routes.ts (sketch)
const customerOnly = { preHandler: [app.authenticate, requireCustomer, requireVerifiedContact] };

app.get('/v1/cart', { preHandler: [app.authenticate, requireCustomer] }, (req) => carts.get(req.user.id));
app.put('/v1/cart', { preHandler: [app.authenticate, requireCustomer], schema: { body: cartLinesSchema } }, (req) => carts.replace(req.user.id, req.body));
app.post('/v1/cart/merge', { preHandler: [app.authenticate, requireCustomer], schema: { body: cartLinesSchema } }, (req) => carts.merge(req.user.id, req.body));
app.post('/v1/checkout', { ...customerOnly, schema: { body: checkoutSchema } }, (req) => checkout.place(req.user.id, req.body));
```

- **Who can call what:**
  - `app.authenticate` verifies the access JWT. No token, or a bad one, → 401. The web client's `apiRequest` then refreshes once and, failing that, sends the person to `/login` with `from`, which brings them back to where they were.
  - `requireCustomer` → 403 without the customer role.
  - `requireVerifiedContact` → 403 `contact_unverified`.
- **Merge:** the same rule as `mergeCarts` in `orders/utils/cart.ts`: quantities add up, capped at stock. In one statement:
  `INSERT … ON CONFLICT (user_id, vendor_id, product_id) DO UPDATE SET quantity = LEAST(cart_items.quantity + EXCLUDED.quantity, products.stock)`.
  - Lines are validated with zod: at most 100 (`CART_MAX_LINES`), whole positive quantities, and products that exist.
- **Checkout:**
  - Re-reads prices and stock from the database and never trusts the client's. Changed lines → 409, as `CheckoutChangedError` does.
  - Creates one order per shop in one transaction, reserving stock with `FOR UPDATE`.
  - Deletes the ordered lines from `cart_items`.
- **No anonymous server carts or guest tokens.** A guest's cart lives only in their browser (`gwani.cart.v1`) until they sign in. Signing out clears the browser copy; the saved cart comes back on the next sign-in.

---

## 6. Open items to confirm before the phase that needs them
- **ROUNDING DECISION NEEDED BEFORE PHASE 4.** The domain's money maths (5% commission, late-cancellation fee,
  proration, bundle discounts, dividends) runs in whole naira today; Phase 0 moves it unchanged. Before Phase 4,
  switch it to kobo and confirm the rounding.
  - Proposed default: integer kobo arithmetic with round-half-up, and ledger entries that always balance exactly
    (any remainder goes to a defined side, never lost).
- Commission (5%) and late-cancellation fee (both marked MOCK) → Phase 3/4.
- `RECEIPT_ISSUER` business details, a Paystack business account, and Termii sender ID approval → Phase 1/4 (start early; approvals take weeks).
- Session timing values marked PLACEHOLDER in `sessionConfig.ts` → Phase 1.
- Plan features and limits, bundle tiers, dividend rules → Phase 7/8.
- **Web toolchain upgrade, on its own branch (not Phase 0):** the web app's dev and test tools carry the critical and
  high `npm audit` findings: vitest 2.1 (and its tinypool, vite-node and @vitest/mocker) and vite 5.4 (and its
  esbuild). None ship in the production bundle. Upgrade vitest and vite to their current majors (the API already
  uses vitest 5), fix what breaks, then run the full `npm run test:tz` (both timezones), `lint`, `typecheck` and a
  production `build`. Never `npm audit fix --force`. ESLint 8 (end of life, used by both apps) → 9 with flat config
  belongs on the same branch.
  - On that branch or the next, react-router-dom 6 → 7: the only finding in what ships (2 moderate). Not exploitable
    here today: `safeReturnPath` already rejects backslash paths (the open-redirect advisory), and the other
    advisory affects SSR hydration only.
- Audit what ships per workspace: `npm audit --omit=dev --workspace apps/web` (and `apps/api`). From the root,
  `--omit=dev` audits only the root package and misses every workspace's production dependencies.
- API image size (553 MB, of which ~190 MB is node_modules): `@sentry/node` 11 depends on `@sentry/bundler-plugins`
  (Sentry CLI, babel, oxc-parser, ~100 MB), and npm keeps `typescript` (`devOptional`) despite `--omit=dev`. Revisit
  before Phase 5 (a slimmer Sentry setup or pruning in the Dockerfile); it doesn't affect behaviour.
- The root `package.json` lists `drizzle-orm` on purpose: npm kept installing it only under `apps/api`, where
  drizzle-kit (hoisted to the root) can't resolve it. Remove it once npm hoists it on its own.
- **Before launch: the production app's DB role must not own `audit_log`.** Migrations run as a separate owner
  role; the app role gets SELECT and INSERT only, with UPDATE, DELETE and TRUNCATE revoked. The trigger alone isn't
  enough: a superuser or the table owner can disable triggers (`ALTER TABLE … DISABLE TRIGGER`). Same for the later
  append-only tables (`ledger_entries`, `job_events`). Locally, one `zamani` role owns everything.

---

## 7. Verification

- **Unit:** the `packages/domain` tests (the existing 257 tests move with the code) run for both apps, in CI under `TZ=Africa/Lagos` and `TZ=UTC`.
- **Integration:**
  - API route tests against Testcontainers Postgres + Redis.
  - Every state transition, including the illegal ones (409), and every permission denial (403).
  - Two concurrent quote acceptances / payouts: exactly one succeeds.
- **Contract:** web and API both compile against `packages/contracts`. Run the app with `VITE_API_MODE=live` against local Docker Compose and click through each switched feature, using the README demo accounts reseeded into staging.
- **Payments:**
  - Paystack **test mode** end to end: card, transfer, USSD; webhook replay is a no-op the second time.
  - Escrow → release → payout, then confirm the ledger balances to zero per escrow.
  - Run the reconciliation job on staging.
- **Security:**
  - OTP and login rate limits.
  - Refresh-token reuse detection.
  - The audit log rejects UPDATE and DELETE.
  - KYC objects can't be fetched without a presigned URL.
  - Production refuses `OTP_TEST_MODE`.
- **E2E (added in Phase 0, grown each phase):** Playwright smoke flows for the main path (signup → search → book → quote → pay → complete → payout → review) on staging before each release.
