# ZAMANI NG MARKET HUB — Project Overview

> What the `new-marketplace` project is, how it's built, how each part works, and what's still needed before it could be a real product. Last updated: October 2026.
>
> The web app now lives in `apps/web` (npm workspaces monorepo); the `src/…` paths below are relative to it.

---

## 1. What this project is

**ZAMANI NG MARKET HUB** is a **front-end prototype of a local marketplace** for **Minna and Niger State, Nigeria**. It connects customers with local tradespeople (plumbers, tailors, electricians, mechanics, dispatch riders) and shops (groceries, supplies). Prices are in Naira (₦), places are Niger State LGAs, and the copy is written for that audience.

One single-page app holds **four areas**, each with its own layout and navigation:

| Area | URL | Who uses it | What they do |
|---|---|---|---|
| **Customer** | `/` | People who need a job done or want to buy | Search vendors, book services, buy products, pay, track jobs and orders, see payments and receipts, report problems |
| **Vendor ("Pro") portal** | `/pro` | Tradespeople and shops | Quote and run jobs, fulfil orders, manage catalogue and calendar, see earnings, manage their subscription, verification and account standing |
| **Investor** | `/investor` | People with a stake in ZAMANI NG MARKET HUB ventures | Read-only dividend ledger, payouts |
| **Admin console** | `/admin` | ZAMANI NG MARKET HUB staff | Vendor verification, dispute mediation, content moderation, analytics, audit log |

**It has no backend.** Every "API" is a TypeScript service that keeps data in memory and answers through a fake network delay (see §4.2). Data resets on reload, except for a few things kept in `localStorage`: the cart, the selected place, and the demo admin sign-in.

**Origin:** the project started as a [Magic Patterns](https://magicpatterns.com) design export. The package name `magic-patterns-vite-template` and the HTML title "Service Booking App Design" are still left over from that.

---

## 2. Running it, and the current health

```bash
npm install
npm run dev        # Vite dev server
npm run build      # production build to dist/
npm run lint       # ESLint
npm test           # Vitest (unit tests)
npx tsc --noEmit   # type-check (Vite doesn't type-check)
```

| Check | Result |
|---|---|
| `npx tsc --noEmit` | ✅ No errors |
| `npm test` | ✅ 108 tests in 6 files, all passing |
| `npm run lint` | ✅ 0 errors, 3 warnings (`react-refresh/only-export-components` in the three files in `src/contexts/`) |
| `npm run build` | ✅ Builds. Vite warns that the main chunk is over 500 kB. Most pages, the admin console, jsPDF and the PDF fonts are split into chunks that load on demand. |
| Version control | Git. Most of the work is **not committed yet**: everything after `51ff6cd` is in the working tree. |

### Demo walkthrough

- **Customer:** you're signed in as **Aisha Mohammed**. Start at `/`.
- **Vendor:** you're **Bala Plumbing Services** at `/pro`. Switch from the sidebar or the Profile page.
- **Investor:** you're **Hadiza Usman**, via the "Investor ledger" card on the customer Profile page.
- **Admin:** open `/admin`. You'll see "Not authorised" because Aisha isn't staff. Use the demo list there to sign in as a staff member, and switch staff from the admin sidebar.

---

## 3. Tech stack

| Concern | Library |
|---|---|
| Build and dev server | Vite 5 |
| UI | React 18, TypeScript (strict) |
| Routing | react-router-dom 6 (a data router, so pages can block navigation) |
| Styling | Tailwind CSS 3 with a custom palette (§9) |
| Forms and validation | react-hook-form, zod |
| Dates | date-fns |
| Charts | recharts |
| Maps | Leaflet with marker clustering |
| PDFs | jsPDF, with Noto Sans embedded (so ₦ renders) |
| Spreadsheet import | read-excel-file |
| Icons, motion | lucide-react, framer-motion |
| Tests | Vitest (pure helpers only, §10) |

`@emotion/react` is installed but not used.

---

## 4. Architecture

### 4.1 Folder layout

```
src/
├── App.tsx                 # Providers and the full route table
├── features/<feature>/     # Most code: one folder per business area (below)
├── components/             # Shared UI: shells, ui/ primitives (Button, Dialog, Badge, Price,
│                           #   EmptyState, ErrorState, LoadingState…), vendor/ form pieces
├── services/
│   ├── mockApi.ts          # mockResponse(): the fake network seam (§4.2)
│   └── vendorStore.ts      # The vendor "database" every service reads
├── data/                   # Seed data: vendors, categories, LGAs, tiers, navigation…
├── hooks/                  # Shared hooks: useAsyncData, usePaginatedList, usePersistentState…
├── lib/, utils/            # Dates, errors, sanitising, CSV, number input, formatting
├── contexts/               # JobsContext, VendorPortalContext, VendorsContext
├── pages/                  # Older page components (see §11: several are now dead code)
└── types/                  # Shared domain types (marketplace, navigation, pagination)
```

Each folder in `src/features/` has the same shape:

```
features/<name>/
├── types.ts  constants.ts  schemas.ts  config.ts   # model, labels, validation, tunable rules
├── mock/          # seed data
├── services/      # the feature's "API" (async functions)
├── hooks/         # React hooks that call services
├── components/    # feature UI
├── sections/      # route-level pages (lazy-loaded from App.tsx)
└── utils/         # pure helpers (where the unit tests are)
```

| Feature | What it covers |
|---|---|
| `discovery` | Home feed, search with filters in the URL, place picker, map view |
| `public-profile` | Vendor public profile, services, portfolio, reviews, booking dialog. Also review moderation (removed and flagged reviews). |
| `jobs` | Service jobs: request form, state machine, quotes, reschedules, cancellation policy, disputes, notifications |
| `orders` | Retail: multi-vendor cart, checkout, order state machine (delivery and pickup paths), disputes |
| `payments` | Card, transfer, USSD and cash payments (mock provider), escrow, transaction history, PDF receipts |
| `reminders` | Booking and subscription reminders (push, SMS, in-app), preferences, dev panel |
| `vendor-dashboard` | Requests, calendar, earnings, reviews, subscription and billing, association bundles, the Verification & standing page |
| `vendor-profile` | The vendor's profile editor (with an unsaved-changes guard) |
| `investor` | Dividend ledger, payouts |
| `admin` | Roles and session, audit log, verification, disputes, moderation, analytics |

### 4.2 The service seam

Every service function returns a Promise built by `mockResponse()` in `src/services/mockApi.ts`:

- it waits about 450 ms (or a given delay) to feel like a network call;
- it returns a **deep copy**, so callers can't change the in-memory "database";
- anything thrown becomes a rejected promise. Services throw `ApiError(message, status)` (404, 409, 403…) and the UI shows the message.

So swapping a service body for a real `fetch` shouldn't change any caller. Services also **re-check rules on the "server" side** (amounts, permissions, state transitions) instead of trusting the browser.

Pages load data through `useAsyncData` (loading and error states, reload, local updates) or `usePaginatedList` ("Load more").

### 4.3 Shared stores

- **`vendorStore`** is the one vendor table. Search, profiles, the cart and the admin tools all read it. `VendorsContext` subscribes to it, so changes appear everywhere straight away: profile edits, stock changes, verification approvals, moderation removals, rating recalculations.
- **One store per area for jobs, orders, payments, escrow, subscriptions, reminders and admin cases.** Each lives in its service file. Customer and vendor screens read **the same records**: a request Aisha sends is the record Bala quotes on.
- Some services expose read-only `…Snapshot()` functions for the admin analytics and dispute tools (e.g. `jobsSnapshot`, `paymentsSnapshot`, `invoicesSnapshot`).

### 4.4 "Scheduled tasks" without a server

Time-based rules run **when data is read**, as a stand-in for cron jobs:
- jobs auto-confirm 48 hours after "work done";
- completed jobs close after 7 days;
- delivered or collected orders auto-complete after 72 hours;
- due reminders are delivered;
- pending investor payouts are approved.

Each is a `runScheduled…Tasks()` function called at the start of reads.

---

## 5. The four areas, route by route

### 5.1 Customer (`CustomerShell`)

| Route | What it is |
|---|---|
| `/` | Home: greeting, place picker, categories, nearby vendor feed |
| `/search` | Search results: text, trade, verification tier, LGA or distance, price, sort, list or map. All filters are in the URL. |
| `/vendors/:id` | Public profile: header and badges, services, portfolio, reviews, book or request |
| `/vendors/:id/book` | Job request form (description, photos, date and time window, address) |
| `/jobs`, `/jobs/:id` | My Jobs and the job page: quote response, timeline, reschedule, cancel, confirm or report a problem, review, payment |
| `/cart`, `/checkout` | Multi-vendor cart (saved in localStorage) and checkout (one order per vendor) |
| `/orders`, `/orders/:id` | My Orders and the order page: confirm receipt or report a problem, review, payment |
| `/pay/:kind/:id` | Shared payment screen: card (hosted page, mocked), bank transfer, USSD, cash on completion |
| `/payments`, `/payments/:ref`, `/payments/:ref/receipt` | Transaction history (summary, filters, search, Load more, date-range PDF), payment detail (breakdown, escrow timeline, report a problem), receipt (print, PDF) |
| `/inbox`, `/profile`, `/profile/notifications` | Message list (placeholder), profile, reminder preferences |
| `/dev/reminders` | Dev builds only: reminder log and "send now" |

Old URLs `/vendor/:id`, `/vendor/:id/request` and `/bookings` redirect to the new ones.

### 5.2 Vendor portal (`VendorShell`, under `/pro`)

Requests and request detail; Orders; Calendar (month and week, blocked days); Catalogue (services and products, including spreadsheet import); Earnings (escrow buckets, payouts, receipts with commission); Reviews (reply, report); Subscription (plans, renew, upgrade or downgrade, billing history, invoice receipts); Association (bundle admin screen); Edit profile; Notifications; **Verification & standing** (verification status and resubmitting documents, warnings, suspension, removed content and appeals). The subscription banner across the top warns about expiry, the grace period and suspension.

### 5.3 Investor (`InvestorShell`, under `/investor`)

Overview (figure cards, accumulation chart, next dividend with an estimate, payout card, per-stake breakdown), Ledger (running balance, filters, CSV), Payouts (requests and statuses). A not-financial-advice notice shows on every page.

### 5.4 Admin console (`AdminLayout`, under `/admin`)

Its own layout and sidebar, with a hamburger menu on mobile. Sections: **Verification** (queue and review), **Disputes** (list and workspace), **Moderation** (one queue with tabs), **Analytics** (dashboard), **Audit log**. See §7.

---

## 6. Core business rules

### 6.1 Job lifecycle — `features/jobs/stateMachine.ts`

```
Requested → Quoted → Scheduled → In progress → Awaiting confirmation → Completed → Closed
   │decline   │reject   │cancel        └──── report a problem ────┤
   ▼          ▼         ▼                                          ▼
Declined  Quote rejected  Cancelled                            Disputed → (ZAMANI NG MARKET HUB) Completed / Cancelled,
                                                               or dismissed: back to where it was
```

- `JOB_TRANSITIONS` says who may make each move, and `GUARDS` add timing rules (quote expiry, the start-job window, auto-confirm).
- `applyTransition()` is **the only way** to change a job's status, and it appends to the job's history.
- Who may cancel, the late-cancellation fee, and when a reason is required all come from `jobs/cancellationPolicy.ts`.

### 6.2 Order lifecycle — `features/orders/stateMachine.ts`

```
Placed → Confirmed → Preparing ─┬→ Dispatched → Delivered ─┬→ Completed
                                └→ Ready for pickup → Collected ┘
Side branches: Declined, Cancelled (customer, before preparing), Out of stock,
Disputed (from Delivered / Collected) → Completed / Cancelled, or back (dismissed)
```

### 6.3 Escrow — `features/payments/escrow/`

- Online payments (card, transfer, USSD) are **held in escrow**. Cash isn't.
- Rules in `escrowRules.ts` (pure, tested):
  - completion releases the money, less **5% commission** (from `escrowConfig.ts`);
  - cancellation refunds, less any late-cancellation fee;
  - a dispute holds the money;
  - a dispute resolution releases it, refunds it, or splits it;
  - a dismissed dispute holds it again.
- The job and order services call the escrow service from their single transition function, so every status change is seen exactly once.

### 6.4 Subscriptions and suspension — `features/vendor-dashboard/`

- Plans: Starter ₦2,000, Standard ₦7,000, Premium ₦15,000 a month (`plans.ts`). Renewal is manual.
- **One status helper**, `utils/subscription.getSubscriptionStatus()`, decides Active → Expiring soon (7 days) → Grace (7 days after the end) → **Suspended**.
- **Suspension is soft:**
  - the vendor stays listed, ranked lower, and marked "temporarily unavailable";
  - no new requests, orders or quotes;
  - existing work, payouts and data are kept.
- A moderator's suspension (`suspendVendorByAdmin`) goes through the same `vendorStanding()`.
- **Trade association bundles** (`bundles.ts`, `utils/bundle.ts`): one invoice covers several members, with a tiered discount. Members added mid-period are charged pro rata; removed members get no refund and keep access until the period ends.

### 6.5 Reminders — `features/reminders/`

Booking reminders (24 hours and 2 hours before) and subscription reminders (7, 3 and 1 day before, on the day, and days 1, 3, 7 and 10 after). They're delivered by in-app notice, push and SMS, according to each person's preferences. All of it is mocked, and you can watch it in `/dev/reminders`.

### 6.6 Receipts — `features/payments/utils/`

- `receiptData.ts` (pure, tested) builds **one receipt format** used for the screen, the PDF, and both the customer's and the vendor's copy (the vendor's adds commission). Full refunds become refund notes.
- `receiptPdf.ts` draws it with jsPDF. It loads on demand and embeds Noto Sans so ₦ renders.

### 6.7 Investor ledger — `features/investor/`

Every figure is calculated from **append-only ledger entries** by `utils/ledger.ts` (pure, tested). Dividend rules live in `config.ts`. Payout approval is mocked.

---

## 7. Admin console in more detail

- **Roles** (`admin/config/roles.ts`, the one place for this): Super admin, Verifier, Support/Mediator, Moderator, Analyst. Each role sees only its sections and actions. The admin services repeat the check, but **real enforcement has to be on the backend**.
- **Session:** mocked in `admin/services/adminSession.ts` (there's no login yet). Non-admins see "Not authorised".
- **Audit log** (`auditService.ts`): append-only. Every action records who, what, target, reason and time. There's a read-only log page, and each detail view shows its own entries.
- **Verification:** queue (filters, search, oldest first), review screen (document viewer with zoom, per-document checklist, notes), approve, reject (preset reasons), request more info.
  - Claiming locks an item for 30 minutes.
  - ID numbers are masked except for a logged reveal.
  - Approval sets the tier in `vendorStore`, so badges change everywhere.
  - Vendors resubmit documents from `/pro/verification`.
- **Disputes:** list (status, type, age, amount, overdue) and a three-part workspace:
  - the read-only job or order thread;
  - the claim and evidence;
  - the decision panel: messages, evidence requests with 48-hour countdowns, internal notes, each party's history, and release, refund, partial refund or dismiss. Each decision needs a reason and a confirmation, and goes through the job or order service.
- **Moderation:** tabs for profile photos, reviews, catalogue, reported content and appeals.
  - Approve, remove (with a reason), warn, suspend. Bulk actions and keyboard shortcuts (press `?` for the list). A guidelines panel from `moderationGuidelines.ts`.
  - Removed content leaves public pages and the owner can appeal. Removing a review recalculates the vendor's rating.
- **Analytics** (`admin/analytics/`): the Active vendors, GMV, Subscription revenue and Admin queues tabs.
  - All figures come from `analyticsService` → `services/analyticsFacts.ts` (normalised facts) → **`analytics/aggregations.ts`** (the one set of pure, tested helpers).
  - Definitions (active vendor, GMV-equivalent, rates, MRR, churn, renewal rate, projection) are in `analytics/config.ts`, and the tooltips show the same text.
  - Shared controls: date range, "vs previous period", filters in the URL, CSV export everywhere.
  - Only Analysts and Super admins can open it (`analytics.view`).

---

## 8. Mock data

Seed data is relative to **today**, so the demo always looks current.

| Data | Where | Notes |
|---|---|---|
| 20 directory vendors | `data/vendors.ts`, `data/moreVendors.ts` | Across Chanchaga, Bosso, Suleja, Bida, Paikoro, Kontagora. Several share the same few photos (the duplicate-image flags rely on this). |
| 4 former vendors | `data/formerVendors.ts` | Closed accounts; they appear only in history and analytics |
| Jobs | `jobs/mock/jobs.ts` | Aisha's and Bala's jobs, plus about 14 disputed jobs (3 already resolved) |
| Orders | `orders/mock/orders.ts` | Including 5 disputed orders |
| Payments and escrow | `payments/mock/` | Seed payments, plus generated payments and escrow for every disputed job and order |
| Subscriptions | `vendor-dashboard/mock/subscription.ts` | Every vendor has a plan and invoice history; association bundle invoices. **Swift Wheels is suspended and Kontagora Fresh Mart is in grace**, across the whole app. |
| Admin queues | `admin/mock/` | 18 verification applications, 19 dispute cases, about 70 moderation items and 4 appeals, staff and audit history |
| Analytics history | `admin/mock/analyticsHistory.ts` | About 25 months of generated (seeded) jobs and orders, so trends have data. Raw records, not chart values. |
| Already-removed content | `data/moderationTakedowns.ts` | Applied when `vendorStore` starts, so public pages match the moderation queue |
| Specimen documents | `public/admin-docs/*.svg` | Placeholder ID, CAC, utility-bill and certificate images marked "SPECIMEN" |

---

## 9. Design system

Tokens in `tailwind.config.js`:
- `cream` (page), `sand` (tiles), `line` (borders), `ink` and `muted` (text);
- `pine` and `pine-deep` (brand: headers, sidebars, primary buttons);
- `clay` (calls to action, errors), `mustard` (badges, highlights).

Manrope font, rounded-xl and rounded-2xl cards with 1px borders, no shadows, short transitions, and a mobile-first layout that switches to a sidebar at `lg`.

Accessibility basics are applied throughout: landmarks, labels, `aria-*` on toggles and errors, `role="status"`/`alert`, visible focus, a screen-reader table behind each chart, and an empty-cell meaning that doesn't rely on colour alone. There's no dark mode.

Shared UI to reuse rather than rebuild: `Button`, `Dialog`, `ConfirmDialog`, `ReasonDialog` (in jobs; preset reasons plus "Other"), `Badge`, `StatusBadge`, `Price`, `SegmentedControl`, `SearchInput`, `EmptyState`, `ErrorState`, `LoadingState`, `PageHeader`, `PageContainer`, plus `formStyles` for inputs.

---

## 10. Tests

Unit tests cover the **pure rule helpers**, where mistakes cost money or trust:

| File | Covers |
|---|---|
| `payments/escrow/escrowRules.test.ts` | Hold, release, refund and settle; commission; disputes, including dismissal and orders |
| `payments/utils/receiptData.test.ts` | The receipt and refund-note mapping, transaction statuses, commission on the vendor copy |
| `vendor-dashboard/utils/billing.test.ts` | Proration, renewals, grace and suspension timing |
| `vendor-dashboard/utils/bundle.test.ts` | Bundle discount tiers and mid-period proration |
| `investor/utils/ledger.test.ts` | Balances, running balance, accumulation series, payout split |
| `admin/analytics/aggregations.test.ts` | Ranges and buckets, GMV, funnel, rates, active vendors, MRR, churn, renewals, at-risk revenue |

There are **no component, integration or end-to-end tests**. The UI was checked by hand and with server-side render smoke checks, which weren't kept.

---

## 11. Known gaps and tech debt

**Needs a backend before launch**
- Real authentication and roles. Today the customer and vendor are fixed demo users, and the admin and investor sign-ins are mocked.
- A database and APIs behind every service. A real payment provider (Paystack, Flutterwave or similar) for payments, payouts and webhooks. SMS and push providers. File storage for photos and documents.
- Server-side checks for every rule the browser enforces today (permissions, state transitions, amounts).

**Functional gaps**
- **Messaging:** there's no in-app chat. Customers and vendors can't reply to the mediator in a dispute, so evidence deadlines can only count down.
- **Moderator suspension on the vendor side:** the vendor's dashboard banner and "Send quote" button don't reflect it. The service still refuses the quote, and the Verification & standing page shows the suspension.
- **Ratings:** a vendor's rating and review count are only recalculated when a moderator removes or restores one of their reviews. Until then, cards can show slightly fewer reviews than the profile.
- **Revenue at risk:** with monthly, manually renewed plans it lists almost every subscriber.

**Placeholders to confirm against the build spec** (marked `PLACEHOLDER` in the code, or `MOCK` for the commission and late fee)
- `vendor-dashboard/plans.ts` (features and limits; the prices are confirmed), `vendor-dashboard/bundles.ts`
- `investor/config.ts` (dividend rules)
- `admin/config/policies.ts`, `admin/config/moderationGuidelines.ts`, `admin/analytics/config.ts`
- `payments/config.ts` (`RECEIPT_ISSUER` business details), `payments/escrow/escrowConfig.ts` (5% commission), `jobs/cancellationPolicy.ts` (late fee)

**Housekeeping**
- **Dead code:** `src/pages/Bookings.tsx`, `JobStatus.tsx`, `RequestJob.tsx`, `VendorDetail.tsx` and `src/pages/vendor/Calendar.tsx`, `Earnings.tsx`, `EditProfile.tsx`, `Requests.tsx` aren't routed or imported. They still use the old `JobsContext`/`VendorPortalContext`, as do `components/vendor/RequestCard.tsx` and `pages/Profile.tsx` (job count). These can be removed or migrated.
- `src/package.json` is a stray Magic Patterns manifest the build ignores.
- `index.html` points at a missing `/vite.svg` favicon, and the title and package name are still the template's.
- `@emotion/react` is unused, and `autoprefixer` and `postcss` are pinned to `latest`.
- The working tree mixes LF and CRLF line endings. Consider adding a `.gitattributes`.
- The main bundle is over 500 kB. The customer home page and the shared shells could be split further.

---

## 12. Conventions for new work

- Put new code in a `features/<name>` slice, with the same folders as the others.
- Put tunable rules in **one config file per feature**, and mark unconfirmed values `PLACEHOLDER`.
- Business maths goes in **pure helpers** with unit tests; services gather data and call them.
- Status changes go **only** through the state machines' `applyTransition` / `applyOrderTransition`.
- Services return Promises via `mockResponse`, throw `ApiError`, and re-check every rule.
- When you change a service export, find every importer first and keep them consistent. Prefer adding optional parameters.
- Reuse the shared UI components and badges (§9), and the loading, empty and error states.
