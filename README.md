# Budget Tracker

A mobile-first, server-based web app for tracking monthly income, expenses, and per-category budgets.

![Stack](https://img.shields.io/badge/Next.js-16-black) ![TypeScript](https://img.shields.io/badge/TypeScript-5-blue) ![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue) ![Prisma](https://img.shields.io/badge/Prisma-6-green)

## Features

- **Multi-user** with Google / GitHub OAuth sign-in
- **Income + expenses** with per-category tracking
- **Monthly budgets** with progress bars (green / amber / red at 70% / 100%)
- **Recurring transactions** — auto-materialized on schedule (rent, subscriptions, salary)
- **Reports** — monthly summary, category breakdown, 12-month trend chart
- **Search & filters** — by keyword, date range, category, type, amount
- **CSV export** — filtered transactions as a spreadsheet-ready file
- **Receipt photos** — upload JPEG/PNG/WebP, stored in S3-compatible storage
- **Location** — free-text label + optional GPS, shown on a Leaflet/OSM map
- **PWA** — installable on mobile, offline shell caching

## Quick start

### 1. Prerequisites

- Node.js 20+
- Docker + Docker Compose

### 2. Clone and configure

```bash
git clone <repo-url>
cd budget-tracker
cp .env.example .env
```

Edit `.env` and fill in the values (see [Environment variables](#environment-variables) below).

### 3. Set up OAuth

You need OAuth credentials from Google and/or GitHub. See [OAuth setup](#oauth-setup) for click-by-click instructions.

### 4. Run

```bash
# Start infrastructure (Postgres + S3)
docker compose up -d postgres s3

# Install dependencies
npm install

# Run database migrations
npx prisma migrate deploy

# Start the app
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and sign in.

### 5. Full stack with Docker

```bash
docker compose up --build
```

This starts everything: the app (port 3000), Postgres (5432), S3 storage (9090), and the recurring-transaction worker.

## Environment variables

| Variable | Description | Example |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://budget:budget@localhost:5432/budget` |
| `DIRECT_URL` | Direct (non-pooled) connection string for `prisma migrate deploy`. Locally the same as `DATABASE_URL`; on Neon use the non-pooler string. | `postgresql://budget:budget@localhost:5432/budget` |
| `AUTH_SECRET` | Session signing key | `openssl rand -base64 32` |
| `AUTH_GOOGLE_ID` | Google OAuth client ID | `xxx.apps.googleusercontent.com` |
| `AUTH_GOOGLE_SECRET` | Google OAuth client secret | `GOCSPX-xxx` |
| `AUTH_GITHUB_ID` | GitHub OAuth client ID | `Iv1.xxx` |
| `AUTH_GITHUB_SECRET` | GitHub OAuth client secret | `xxx` |
| `APP_URL` | Browser-reachable URL of the app | `http://localhost:3000` |
| `S3_ENDPOINT` | Internal S3 endpoint (Docker network) | `http://s3:9090` |
| `S3_PUBLIC_ENDPOINT` | Browser-reachable S3 endpoint | `http://localhost:9090` |
| `AWS_ACCESS_KEY_ID` | S3 access key | `s3mock` |
| `AWS_SECRET_ACCESS_KEY` | S3 secret key | `s3mock` |
| `AWS_DEFAULT_REGION` | S3 region (`auto` for Cloudflare R2) | `us-east-1` |
| `S3_BUCKET` | S3 bucket name for receipts | `receipts` |
| `CRON_SECRET` | Bearer token for `/api/cron/recurring-sweep` (production/Vercel only) | `openssl rand -hex 32` |

## OAuth setup

### Google

1. Go to [Google Cloud Console → APIs & Services → Credentials](https://console.cloud.google.com/apis/credentials)
2. Click **Create Credentials → OAuth client ID**
3. Application type: **Web application**
4. Authorized redirect URIs: `http://localhost:3000/api/auth/callback/google`
5. Copy the **Client ID** and **Client Secret** into your `.env`

### GitHub

1. Go to [GitHub → Settings → Developer settings → OAuth Apps](https://github.com/settings/developers)
2. Click **New OAuth App**
3. Authorization callback URL: `http://localhost:3000/api/auth/callback/github`
4. Copy the **Client ID** and **Client Secret** into your `.env`

## Development

```bash
# Unit tests
npm test

# E2E tests (requires running app)
npx playwright test

# Type check
npx tsc --noEmit

# Lint
npm run lint

# Build
npm run build
```

## Deployment

- **Vercel + Neon + Cloudflare R2 (serverless)** — [docs/deploy-vercel.md](docs/deploy-vercel.md)
- **VPS with Docker Compose + Caddy** — [docs/deploy-vps.md](docs/deploy-vps.md)

## Architecture

- **Next.js 16** (App Router) — React Server Components + Server Actions
- **PostgreSQL 16** + **Prisma 6** ORM
- **Auth.js v5** — database sessions, Google + GitHub OAuth
- **Tailwind CSS 4** — mobile-first responsive design
- **Recharts** — trend charts
- **Leaflet + OpenStreetMap** — location map (no API key needed)
- **S3-compatible storage** (Adobe S3Mock in dev) — receipt images
- **Docker Compose** — app + Postgres + S3 + recurring worker

### Data model

```
User ──< Category (per-user copy, seeded at signup)
User ──< Budget (per category per month)
User ──< Transaction (income or expense)
User ──< Receipt (optional image, linked to transaction)
User ──< RecurringTemplate (rent, subscriptions, etc.)
RecurringTemplate ──< RecurringOccurrence (idempotency ledger)
```

Amounts are stored as exact decimals (`Decimal(19,4)`), never floats. Currency is per-user and snapshotted on each transaction.

### Recurring transactions

Templates are materialized into real transactions on their due date using a hybrid strategy:
- **Lazy-on-read**: every month-scoped read materializes due transactions first (correctness)
- **Sweep worker**: a background container runs hourly across all users (completeness)

The `RecurringOccurrence` unique constraint `(templateId, occurrenceDate)` guarantees idempotency — running materialization twice never creates duplicates.

## Project structure

```
src/
├── app/                  # Pages and API routes
│   ├── (app)/            # Authenticated app shell
│   ├── api/              # Route handlers (auth, health, receipts, export)
│   ├── login/            # Sign-in page
│   └── onboarding/       # Currency picker
├── components/           # React components
├── lib/
│   ├── actions/          # Server actions (mutations)
│   ├── queries/          # Data access layer
│   ├── money.ts          # Decimal-safe money helpers
│   ├── recurring.ts      # Interval math + materialization
│   ├── s3.ts             # S3 client
│   ├── csv.ts            # RFC 4180 CSV writer
│   └── validation.ts     # Zod schemas
├── jobs/                 # Background workers
└── proxy.ts              # Coarse auth redirect
prisma/
├── schema.prisma         # Data model
└── migrations/           # SQL migrations
tests/
├── e2e/                  # Playwright tests
└── (unit tests colocated in src/lib/__tests__/)
```

## Receipt storage

Receipt images are uploaded to S3-compatible storage (Adobe S3Mock in development). The upload goes through the Next.js server (simple multipart form). For production, consider switching to direct presigned uploads to avoid proxying binaries through Node.

**Privacy note**: receipt photos may contain EXIF GPS data. The app does not strip EXIF metadata.

## Notes

- Currency is locked once you add your first transaction (per-user, no multi-currency).
- Budget rollover is not supported — each month starts fresh.
- Months are calendar months (1st → last day).
- No offline sync, push notifications, or email — by design.
