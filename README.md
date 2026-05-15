# DOSSIER

A weekly curated deals newsletter for fashion, grocery, restaurants, home, tech, beauty, and more. Deals are extracted from promotional emails using AI and delivered as a personalized digest each week. Free subscribers receive deals across three categories; paid subscribers unlock all categories, custom filters, and flexible send days.

---

## Prerequisites

- Node.js 20+
- A [Supabase](https://supabase.com) project with Auth enabled
- A [Resend](https://resend.com) account for outbound email
- A Gmail account with OAuth2 credentials for deal ingestion
- An [OpenAI](https://platform.openai.com) API key (GPT-4o-mini)

---

## Setup

```bash
git clone https://github.com/your-org/dossier-app.git
cd dossier-app
npm install
cp .env.example .env.local
# Fill in all required variables in .env.local
npm run dev
```

The app runs at `http://localhost:3000`.

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | — | Supabase project URL — **required** |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | — | Supabase anon key — **required** |
| `SUPABASE_SERVICE_ROLE_KEY` | — | Supabase service role key (server-side only) — **required** |
| `OPENAI_API_KEY` | — | OpenAI API key for GPT-4o-mini deal extraction — **required** |
| `RESEND_API_KEY` | — | Resend API key for outbound email — **required** |
| `RESEND_FROM_EMAIL` | `hello@dossier.email` | From address for all outbound emails |
| `GMAIL_SCRAP_EMAIL` | — | Gmail address to scan for promotional emails — **required** |
| `GMAIL_APP_PASSWORD` | — | 16-char [App Password](https://myaccount.google.com/apppasswords) for the scrape account (requires 2FA enabled) — **required** |
| `NEXT_PUBLIC_APP_URL` | — | Public URL of the deployed app (e.g. `https://dealdossier.io`) — **required** |
| `CRON_SECRET` | — | Bearer token used to authenticate cron job requests — **required in production** |
| `ADMIN_EMAIL` | — | Email address granted admin access; if unset `/admin` blocks everyone — **required in production** |
| `STORES_SHEET_ID` | *(hardcoded fallback)* | Google Sheets ID for the stores directory CSV |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | — | Stripe publishable key (`pk_test_...` / `pk_live_...`) — **required for billing** |
| `STRIPE_SECRET_KEY` | — | Stripe secret key (`sk_test_...` / `sk_live_...`) — **required for billing** |
| `STRIPE_WEBHOOK_SECRET` | — | Stripe webhook signing secret (`whsec_...`) — **required for billing** |
| `STRIPE_PRICE_MONTHLY` | — | Stripe Price ID for the $4.99/month plan — **required for billing** |
| `STRIPE_PRICE_ANNUAL` | — | Stripe Price ID for the $45/year plan — **required for billing** |

---

## Running Locally

```bash
npm run dev       # development server with hot reload
npm run build     # production build
npm run start     # start production server
npm run test      # run tests in watch mode
npm run test:run  # run tests once (CI)
npm run lint      # ESLint
```

To test the cron jobs locally, call the endpoints directly with your `CRON_SECRET`:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/ingest
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/send
```

---

## Deployment

**Platform:** Vercel

Vercel auto-detects Next.js. Set all environment variables in the Vercel dashboard. Cron jobs are configured in `vercel.json` and execute as serverless functions on Vercel's scheduler.

```json
{
  "crons": [
    { "path": "/api/cron/ingest", "schedule": "0 7 * * *" },
    { "path": "/api/cron/send",   "schedule": "0 9 * * *" }
  ]
}
```

Vercel calls each cron path with a signed `Authorization: Bearer <token>` header. Set `CRON_SECRET` to verify these requests.

---

## Architecture

### Database (Supabase / PostgreSQL)

**`subscribers`** — Registered newsletter accounts  
`id` UUID PK, `email` UNIQUE, `tier` (free|paid), `send_day` (mon–sun), `min_discount` (20|30|40|50), `subscription_mode` (category|retailer), `gender_filter` text[], `spend_tier_filter` text[], `zip_code`, `is_active`, `stripe_customer_id`, `stripe_subscription_id`, `stripe_price_id`, `subscription_status`, `created_at`, `updated_at`

**`subscriber_categories`** — Per-subscriber category opt-ins  
`id` UUID PK, `subscriber_id → subscribers`, `category` text, `enabled` bool

**`subscriber_deal_types`** — Per-subscriber deal type opt-ins  
`id` UUID PK, `subscriber_id → subscribers`, `deal_type` text, `enabled` bool

**`subscriber_retailers`** — Retailers selected in retailer subscription mode (paid)  
`id` UUID PK, `subscriber_id → subscribers`, `retailer` text, `enabled` bool

**`deals`** — Deals extracted from promotional emails  
`id` UUID PK, `retailer`, `description`, `percent_off` int, `deal_type`, `promo_code`, `expiration_date`, `original_link`, `affiliate_link`, `categories` text[], `gender` text[], `week_of` date, `source_email_id`, `source_email_link`, `is_manual` bool, `created_at`

**`editions`** — Weekly edition metadata  
`id` UUID PK, `week_of` date UNIQUE, `issue_number` int, `emails_scanned`, `deals_found`, `retailers_count`, `created_at`

**`sent_emails`** — Delivery log (deduplication guard)  
`id` UUID PK, `subscriber_id → subscribers`, `edition_id → editions`, `sent_at`

**`retailer_scan_log`** — Source email processing stats per ingest run  
`id` UUID PK, `retailer`, `email_subject`, `scanned_at`, `deals_found` int

**`store_suggestions`** — User-submitted store requests  
`id` UUID PK, `subscriber_id → subscribers`, `store_name`, `store_url`, `status` (pending|approved|rejected), `admin_response`, `created_at`

---

### API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/magic-link` | None | Send magic link email to subscriber |
| GET | `/api/auth/callback` | None | Exchange Supabase auth code for session |
| POST | `/api/subscribe` | None | Create subscriber account and send magic link |
| GET | `/api/preferences` | Session | Fetch current user's preferences |
| PUT | `/api/preferences` | Session | Update preferences |
| POST | `/api/onboarding` | Session | Mark onboarding complete |
| GET | `/api/stores` | Session | Fetch stores directory from Google Sheet |
| POST | `/api/stores/toggle` | Session (paid) | Enable/disable a store |
| POST | `/api/stores/suggest` | Session (paid) | Submit a store suggestion |
| GET | `/api/archive` | None | List all published editions |
| GET | `/api/archive/[week]` | None | Fetch deals for a specific week |
| GET | `/api/stats` | None | Public stats (emails scanned, deals found) |
| GET | `/api/retailers` | None | List all retailers with deal counts |
| POST | `/api/admin/respond-suggestion` | Admin | Send response to a store suggestion |
| POST | `/api/unsubscribe` | None | Unsubscribe by email |
| POST | `/api/support` | None | Submit support request |
| POST | `/api/billing/create-subscription` | Session | Create a Stripe subscription and return its PaymentIntent client secret |
| POST | `/api/billing/portal` | Session | Open a Stripe Customer Portal session for the logged-in subscriber |
| POST | `/api/billing/webhook` | Stripe signature | Sync subscription state from Stripe events |
| GET | `/api/cron/ingest` | Cron secret | Scan Gmail, extract deals, store edition |
| GET | `/api/cron/send` | Cron secret | Send personalized newsletters for today's send day |

---

### Background Jobs

| Endpoint | Schedule | Purpose | Requires |
|----------|----------|---------|----------|
| `/api/cron/ingest` | Daily 07:00 UTC | Fetch promotional emails from Gmail, extract deals with GPT-4o-mini, upsert deals and edition metadata | Gmail OAuth2, OpenAI |
| `/api/cron/send` | Daily 09:00 UTC | Find subscribers whose send day matches today, filter and rank deals per preferences, send personalized HTML email | Resend, Supabase |

---

### Key Business Rules

- **Free tier**: categories limited to fashion, restaurants, grocery; send day fixed to Thursday; min discount 40%
- **Paid tier**: all 13 categories; custom send day, min discount (20/30/40/50%), deal type filters, gender/spend filters, retailer mode
- **Retailer mode** (paid): subscriber selects specific retailers instead of categories
- **Deduplication**: `sent_emails` table prevents sending the same edition to a subscriber twice
- **Deal ranking**: free-item > 70%+ off > 60%+ > 50%+ > bogo-free > 40%+ > 30%+ > bogo-half > free-shipping
