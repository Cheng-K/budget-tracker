# Deploying to Vercel + Neon + Cloudflare R2

This guide deploys Budget Tracker as a serverless app:

- **[Vercel](https://vercel.com)** — the Next.js app (free Hobby plan)
- **[Neon](https://neon.tech)** — managed PostgreSQL
- **[Cloudflare R2](https://www.cloudflare.com/developer-platform/products/r2/)** —
  S3-compatible receipt storage

Audience: comfortable clicking through cloud dashboards; no prior Vercel/Neon/R2
experience assumed. (Prefer a single VPS instead? See [deploy-vps.md](./deploy-vps.md).)

---

## How the pieces fit together

```
User's browser
  types https://budget-tracker.vercel.app
        │
        ▼
Vercel  (Next.js 16 App Router, Node.js 24)
  - serves the app, API routes, server actions
  - /api/cron/recurring-sweep   ← Vercel Cron, daily
        │
        ├──► Neon Postgres
        │      runtime queries  → pooled connection (…-pooler host)
        │      prisma migrate   → direct connection
        │
        └──► Cloudflare R2  (private bucket)
               receipt images, uploaded/downloaded through the app's
               authenticated proxy — the browser never talks to R2
```

Everything the app needs is a managed service — there are no containers to run.
The recurring-transaction sweep worker becomes a daily Vercel Cron call; the
lazy-on-read materialization keeps data correct whenever you use the app.

---

## Prerequisites

- A GitHub (or GitLab/Bitbucket) account with this repo pushed to it.
- Accounts: [Vercel](https://vercel.com/signup), [Neon](https://neon.tech),
  [Cloudflare](https://dash.cloudflare.com/sign-up) (R2).
- `openssl` available locally to generate secrets.

---

## 1. Create the Neon database

1. In the [Neon console](https://console.neon.tech), create a project. Pick the
   region closest to you (this guide's examples use AWS `us-east-1`, which pairs
   with Vercel's `iad1` region — keep Neon, R2, and Vercel in the same region).
2. Open **Connection details** and copy **both** connection strings:

   | String | Hostname looks like | Use as |
   |---|---|---|
   | **Pooled** | `ep-xxxx-pooler.aws.neon.tech` | `DATABASE_URL` |
   | **Direct** | `ep-xxxx.aws.neon.tech` | `DIRECT_URL` |

3. Normalize the query strings:

   ```
   DATABASE_URL=postgresql://…@ep-xxxx-pooler.aws.neon.tech/neondb?sslmode=require&connect_timeout=15
   DIRECT_URL=postgresql://…@ep-xxxx.aws.neon.tech/neondb?sslmode=require
   ```

   - `connect_timeout=15` on the pooled URL avoids connection errors while
     Neon's compute is waking up from scale-to-zero.
   - **Remove `channel_binding=require`** if the dashboard includes it — Prisma's
     engine rejects unknown connection parameters.

> **Why two URLs?** Neon's pooled host runs PgBouncer in transaction mode, which
> is great for serverless runtime traffic but breaks `prisma migrate deploy`.
> Prisma therefore uses `DIRECT_URL` for migrations (`directUrl` in
> `prisma/schema.prisma`) and `DATABASE_URL` for everything else.

---

## 2. Create the R2 bucket

1. Cloudflare dashboard → **R2** → **Create bucket**. Name it e.g.
   `budget-tracker-receipts`. Pick a location close to you (or leave Automatic).
2. Create an API token: R2 → **Manage R2 API Tokens** → **Create API token**.
   - Permissions: **Object Read & Write**
   - Scope: the bucket you just created
   - Record the **Access Key ID** and **Secret Access Key** (the secret is shown
     only once).
3. On the R2 overview page, note your **Account ID**. The S3 endpoint is:

   ```
   https://<ACCOUNT_ID>.r2.cloudflarestorage.com
   ```

4. Keep the bucket **private** — do not attach a custom domain and do not enable
   public access. Receipt photos may carry EXIF GPS data; they stay reachable
   only through the app's sign-in-protected proxy.

---

## 3. Point the OAuth apps at the Vercel URL

The stable URL will be `https://budget-tracker.vercel.app` (see the next section
— if you name the Vercel project differently, substitute that name).

**Google** (supports multiple redirect URIs — keep the VPS one if you use it):

1. [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials)
   → your OAuth client → **Add URI** under *Authorized redirect URIs*:
   `https://budget-tracker.vercel.app/api/auth/callback/google`

**GitHub** (⚠️ an OAuth app allows only **one** callback URL):

1. [GitHub → Settings → Developer settings → OAuth Apps](https://github.com/settings/developers)
   → **New OAuth App** (a second app if the VPS deployment is still active).
2. Homepage URL: `https://budget-tracker.vercel.app`
3. Authorization callback URL: `https://budget-tracker.vercel.app/api/auth/callback/github`
4. Copy the **Client ID** and generate a **Client Secret**.

---

## 4. Create the Vercel project

1. [vercel.com/new](https://vercel.com/new) → import the Git repo.
2. Set the **project name** to `budget-tracker` — this gives the stable URL
   `https://budget-tracker.vercel.app`.
3. Before deploying, open **Environment Variables** and add these (Production
   scope; add Preview too if you want preview deploys to boot):

   | Variable | Value |
   |---|---|
   | `DATABASE_URL` | Neon **pooled** string with `?sslmode=require&connect_timeout=15` |
   | `DIRECT_URL` | Neon **direct** string with `?sslmode=require` |
   | `AUTH_SECRET` | `openssl rand -base64 32` (fresh — not your dev one) |
   | `AUTH_GOOGLE_ID` | Google OAuth client ID |
   | `AUTH_GOOGLE_SECRET` | Google OAuth client secret |
   | `AUTH_GITHUB_ID` | GitHub OAuth client ID (the Vercel app) |
   | `AUTH_GITHUB_SECRET` | GitHub OAuth client secret |
   | `S3_ENDPOINT` | `https://<ACCOUNT_ID>.r2.cloudflarestorage.com` |
   | `S3_PUBLIC_ENDPOINT` | same as `S3_ENDPOINT` |
   | `AWS_ACCESS_KEY_ID` | R2 API token Access Key ID |
   | `AWS_SECRET_ACCESS_KEY` | R2 API token Secret Access Key |
   | `AWS_DEFAULT_REGION` | `auto` (required by the AWS SDK, ignored by R2) |
   | `S3_BUCKET` | `budget-tracker-receipts` (your bucket name) |
   | `CRON_SECRET` | `openssl rand -hex 32` (hex is safe in HTTP headers) |

   > `APP_URL` from the old template is intentionally omitted — Auth.js runs with
   > `trustHost: true` and never reads it.

4. Build settings live in [`vercel.json`](../vercel.json) (committed to the repo),
   so you don't need to change anything else in the dashboard:
   - Node.js 24 (project settings → Node.js version, if not auto-detected)
   - Install: `npm ci --legacy-peer-deps`
   - Build: `prisma generate && node scripts/migrate-prod.mjs && next build`
     (`migrate-prod.mjs` runs `prisma migrate deploy` **only** on production
     builds; previews and local builds skip it.)
   - Region: `iad1` — change both here and in `vercel.json` if you chose
     another Neon region.
   - Cron: `vercel.json` schedules `GET /api/cron/recurring-sweep` daily at
     06:23 UTC (Hobby's minimum cadence is once per day).

---

## 5. Deploy

Click **Deploy** in the Vercel UI (or push to the connected branch). The build
log should show, in order:

1. `prisma generate`
2. `[migrate-prod] VERCEL_ENV=production — running prisma migrate deploy`
   applying `20261115135424_init`
3. `next build` succeeding

---

## 6. Verify

```bash
# App responds
curl -I https://budget-tracker.vercel.app

# Health endpoint (public)
curl https://budget-tracker.vercel.app/api/health

# PWA assets are served
curl -I https://budget-tracker.vercel.app/manifest.webmanifest
curl -I https://budget-tracker.vercel.app/sw.js

# Cron endpoint rejects unsigned requests…
curl -i https://budget-tracker.vercel.app/api/cron/recurring-sweep
# …and accepts the bearer secret
curl -H "Authorization: Bearer $CRON_SECRET" \
  https://budget-tracker.vercel.app/api/cron/recurring-sweep
```

Then in the browser:

- [ ] Sign in with Google and GitHub (first sign-in seeds default categories)
- [ ] Create a transaction and a budget; open the reports page
- [ ] Upload a receipt image under 4MB — it appears on the transaction
- [ ] Try a file over 4MB — rejected with "File must be under 4MB"
- [ ] CSV export downloads
- [ ] Create a recurring template with a past-due start date — the due
      transaction appears when you open the month view
- [ ] Vercel dashboard → **Cron Jobs** shows the daily schedule (a manual
      "Run now" is a good smoke test)

---

## Security notes

- Keep `.env` out of version control (it is already in `.gitignore`). The values
  in Vercel's environment settings are the production source of truth.
- The R2 bucket must stay private; anyone with the R2 API token can read/write
  receipts, so treat it like a password.
- Never commit OAuth client secrets, `AUTH_SECRET`, or `CRON_SECRET`.
- Preview deploys share the production database (no Neon branches in this
  setup). Migrations never run on previews, but preview data writes are real.

---

## Updating the deployment

```bash
git push    # Vercel deploys automatically
```

Migrations run automatically on **production** builds (`migrate-prod.mjs`).
Schema rollbacks are **not** automatic — `prisma migrate deploy` is forward-only;
restore from Neon's backup/branch if you must revert.

---

## Hobby-plan caveats

- **Cron cadence**: once per day minimum (and the run fires somewhere within the
  chosen hour). This is fine — recurring transactions are materialized lazily on
  every month view anyway; the sweep only covers users who never log in. For an
  hourly sweep later: upgrade to Vercel Pro, or point an external free cron
  (GitHub Actions / cron-job.org) at `/api/cron/recurring-sweep` with the same
  `Authorization: Bearer $CRON_SECRET` header.
- **Receipt uploads** are capped at **4MB** (Vercel rejects request bodies over
  4.5MB). The upload goes through the app server; a future improvement is
  direct-to-R2 presigned uploads (helpers already exist in `src/lib/s3.ts`).
- **Neon scale-to-zero** adds a few seconds of cold start after the database has
  been idle. Disable it in Neon settings if that becomes annoying.
- **Function duration** is capped at 300s — plenty for the daily sweep at
  personal scale.
