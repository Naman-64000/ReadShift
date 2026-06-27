# 🚀 ReadShift — Production Deployment Guide

> Complete step-by-step guide to deploy ReadShift to production for free.
> Follow this **top-to-bottom**. Every service used is on a free tier.

---

## Architecture Overview

| Layer | Service | Free Tier |
|---|---|---|
| **Frontend** | Vercel | ✅ Unlimited deployments |
| **Backend API** | Render (Web Service) | ✅ 750 hrs/month |
| **PostgreSQL** | Supabase (DB) | ✅ 500 MB, 2 projects |
| **Redis** | Upstash | ✅ 10,000 req/day |
| **Auth** | Supabase Auth | ✅ Already configured |
| **AI Generation** | Google Gemini API | ✅ Free tier |
| **Domain** | Render subdomain + Vercel subdomain | ✅ Free subdomains |

---

## Pre-Deployment Checklist

Before starting, make sure you have:
- [ ] A GitHub account with this project pushed to a **public or private repository**
- [ ] Your existing Supabase project URL and anon key (already in `.env`)
- [ ] Your existing `GEMINI_API_KEY` (already in `.env`)

---

## PHASE 1 — Push Code to GitHub

This is mandatory. Every service below deploys directly from GitHub.

### Step 1.1 — Create a GitHub Repository

1. Go to [github.com/new](https://github.com/new)
2. Name it `readshift` (or any name)
3. Set it to **Private**
4. Do NOT initialize with README (you already have one)
5. Click **Create repository**

### Step 1.2 — Push Your Local Code

Open a terminal in the project root (`/path/to/readshift`) and run:

```bash
git remote remove origin 2>/dev/null || true
git remote add origin https://github.com/YOUR_GITHUB_USERNAME/readshift.git
git branch -M main
git push -u origin main
```

> **Important**: Your `.env` file is in `.gitignore` and will NOT be pushed. All secrets will be added manually to each service's dashboard.

---

## PHASE 2 — Set Up Supabase (Auth + Database Reference)

Your Supabase project is already running. You just need to configure it for production.

### Step 2.1 — Enable Email Confirmations (Optional but Recommended)

1. Open [supabase.com](https://supabase.com) → Your Project → **Authentication** → **Providers**
2. Under **Email**, ensure **Enable Email Confirmations** is turned ON
3. Set **Site URL** to your future Vercel URL — you'll come back to update this after deploying the frontend. For now, set it to `https://readshift.vercel.app` (or whatever you name it)
4. Under **Redirect URLs**, add:
   - `https://readshift.vercel.app/dashboard`
   - `https://readshift.vercel.app/**`

> Note: If "Confirm Email" is currently OFF for development, **turn it back ON** before going live.

### Step 2.2 — Collect Your Supabase Values

From Supabase → **Project Settings** → **API**, copy and save:
- `Project URL` (e.g., `https://YOUR_SUPABASE_REF.supabase.co`)
- `anon public` key (starts with `eyJ...`)

---

## PHASE 3 — Set Up Production PostgreSQL (Supabase Database)

Your Supabase project already includes a hosted PostgreSQL database. You will use this as your production database.

### Step 3.1 — Get the Production DATABASE_URL

1. Supabase → **Project Settings** → **Database** → **Connection String**
2. Select the **URI** tab
3. Copy the connection string — it looks like:
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.YOUR_SUPABASE_REF.supabase.co:5432/postgres
   ```
4. **Important**: Add `?pgbouncer=true&connection_limit=1` to the end for serverless/pooled connections:
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.YOUR_SUPABASE_REF.supabase.co:6543/postgres?pgbouncer=true&connection_limit=1
   ```

> Keep this URL safe. You'll paste it as `DATABASE_URL` in Render's environment variables.

### Step 3.2 — Run Prisma Migrations Against Production DB

Before deploying the server, you must apply your database schema to the Supabase DB.

In a terminal, from the project root, run:

```bash
DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.YOUR_SUPABASE_REF.supabase.co:5432/postgres" \
  npx prisma migrate deploy --schema ./prisma/schema.prisma
```

Replace `[YOUR-PASSWORD]` with your actual Supabase DB password.

You should see output like:
```
Applying migration `20260510093923_init`
...
All migrations have been applied.
```

> **If you see an error** about shadow database, add `?schema=public` to the end of the URL:
> `postgresql://postgres:[PASS]@db.YOUR_SUPABASE_REF.supabase.co:5432/postgres?schema=public`

---

## PHASE 4 — Set Up Production Redis (Upstash)

### Step 4.1 — Create a Free Upstash Account

1. Go to [upstash.com](https://upstash.com)
2. Sign up with GitHub
3. Click **Create Database**

### Step 4.2 — Create a Redis Database

1. Name: `readshift-prod`
2. Region: Choose closest to your Render server region (defaults to `us-east-1`)
3. Type: **Regional**
4. Click **Create**

### Step 4.3 — Copy the Redis URL

On the database page, under **REST API**, find the **REDIS_URL** section. Copy the `rediss://` URL (note: `rediss://` with double-s is TLS-encrypted — required by Upstash):

```
rediss://default:[PASSWORD]@[HOSTNAME].upstash.io:6379
```

Save this as your `REDIS_URL` for the next phase.

---

## PHASE 5 — Deploy the Backend API (Render)

### Step 5.1 — Create a Free Render Account

1. Go to [render.com](https://render.com)
2. Click **Get Started** → Sign up with GitHub
3. Authorize Render to access your repositories

### Step 5.2 — Create a New Web Service

1. From the Render dashboard, click **New** → **Web Service**
2. Select your `readshift` GitHub repository
3. Configure as follows:

| Setting | Value |
|---|---|
| **Name** | `readshift-backend` |
| **Region** | `Oregon (US West)` or closest to you |
| **Branch** | `main` |
| **Root Directory** | `server` |
| **Runtime** | `Node` |
| **Build Command** | `npm install && npm run build` |
| **Start Command** | `node dist/index.js` |
| **Instance Type** | `Free` |

### Step 5.3 — Add Environment Variables

In the **Environment Variables** section (still on Render setup), add ALL of the following:

```
NODE_ENV=production
PORT=3001
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.YOUR_SUPABASE_REF.supabase.co:6543/postgres?pgbouncer=true&connection_limit=1
REDIS_URL=rediss://default:[UPSTASH-PASSWORD]@[HOSTNAME].upstash.io:6379
GEMINI_API_KEY=[YOUR-GEMINI-API-KEY]
SUPABASE_URL=https://YOUR_SUPABASE_REF.supabase.co
ALLOW_DEV_TOKEN=false
CORS_ORIGIN=https://readshift.vercel.app
LOG_LEVEL=info
PASSAGE_POOL_MIN_THRESHOLD=50
```

> Replace all `[...]` placeholders with your actual values.
> You'll update `CORS_ORIGIN` to the exact Vercel URL after deploying the frontend (Phase 6).

### Step 5.4 — Add a Build Step for Prisma Client Generation

The backend needs to generate the Prisma client during the build phase. Update the **Build Command** to:

```
npm install && npx prisma generate --schema ../prisma/schema.prisma && npm run build
```

> This ensures the generated Prisma types match your schema on every deployment.

### Step 5.5 — Deploy

Click **Create Web Service**. Render will:
1. Clone your repository
2. Run the build command
3. Start the server

After 3–5 minutes, your backend will be live at a URL like:
```
https://readshift-backend.onrender.com
```

Test it by visiting: `https://readshift-backend.onrender.com/health`

You should see:
```json
{ "status": "ok", "ts": "2026-06-15T..." }
```

> **Note**: On Render's free tier, your service will **spin down after 15 minutes of inactivity** and take ~30 seconds to wake up on first request. This is expected behavior on the free plan.

---

## PHASE 6 — Deploy the Frontend (Vercel)

### Step 6.1 — Create a Free Vercel Account

1. Go to [vercel.com](https://vercel.com)
2. Click **Start Deploying** → Sign up with GitHub

### Step 6.2 — Import Your Project

1. Click **Add New** → **Project**
2. Find and import your `readshift` GitHub repository
3. Configure as follows:

| Setting | Value |
|---|---|
| **Framework Preset** | `Vite` |
| **Root Directory** | `client` |
| **Build Command** | `npm run build` |
| **Output Directory** | `dist` |
| **Install Command** | `npm install` |

### Step 6.3 — Add Environment Variables

Under the **Environment Variables** section in Vercel:

```
VITE_SUPABASE_URL=https://YOUR_SUPABASE_REF.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_API_BASE_URL=https://readshift-backend.onrender.com/api
```

> Use the exact Render backend URL from Phase 5 Step 5.5.

### Step 6.4 — Deploy

Click **Deploy**. Vercel will build and deploy in ~2 minutes.

Your frontend will be live at:
```
https://readshift.vercel.app
```
(or `readshift-[username].vercel.app` — Vercel tells you the exact URL)

---

## PHASE 7 — Final Cross-Configuration (Critical!)

After both services are live, you need to update them with each other's URLs.

### Step 7.1 — Update Backend CORS_ORIGIN on Render

1. Go to Render → `readshift-backend` → **Environment**
2. Update `CORS_ORIGIN` to your exact Vercel URL:
   ```
   CORS_ORIGIN=https://readshift.vercel.app
   ```
3. Click **Save Changes** — Render will auto-redeploy

### Step 7.2 — Update Supabase Auth Redirect URLs

1. Supabase → **Authentication** → **URL Configuration**
2. Set **Site URL**:
   ```
   https://readshift.vercel.app
   ```
3. Under **Redirect URLs**, add:
   ```
   https://readshift.vercel.app/dashboard
   https://readshift.vercel.app/**
   ```
4. Click **Save**

### Step 7.3 — Update Supabase Email Templates (Optional but Professional)

1. Supabase → **Authentication** → **Email Templates**
2. Edit the **Confirm Signup** email
3. Update the button URL to point to your Vercel domain

---

## PHASE 8 — Verify Full End-to-End Flow

Work through these tests in order:

### ✅ Test 1 — Health Check
Visit: `https://readshift-backend.onrender.com/health`
Expected: `{ "status": "ok" }`

### ✅ Test 2 — Frontend Loads
Visit: `https://readshift.vercel.app`
Expected: ReadShift landing/auth page loads with no console errors

### ✅ Test 3 — Sign Up Flow
1. Register a new account with a real email address
2. Check your inbox for a confirmation email
3. Click the confirmation link — it should redirect to `https://readshift.vercel.app/dashboard`

### ✅ Test 4 — Dashboard Loads
After logging in, the dashboard should load your stats without any 401/403 errors in the browser console.

### ✅ Test 5 — Reading Session Works
1. Start a reading session
2. Complete the passage
3. Submit MCQ answers
4. View results screen

### ✅ Test 6 — Settings Save
1. Go to Settings
2. Change a preference (e.g., column width)
3. Save
4. Refresh the page — verify the preference persisted

---

## PHASE 9 — Production-Specific Code Changes

Before deploying, you need to make these small but critical code changes:

### Change 9.1 — Disable Dev Token

Open `server/src/middleware/auth.ts` and verify the dev token block is environment-gated:

```typescript
if (
  token === "dev-token" &&
  process.env.ALLOW_DEV_TOKEN === "true" &&
  process.env.NODE_ENV === "development"  // ← This guard protects production
) {
```

The current code already has this triple check, so setting `ALLOW_DEV_TOKEN=false` and `NODE_ENV=production` in Render environment variables is sufficient.

### Change 9.2 — Verify .gitignore Has .env

Open `.gitignore` and confirm `.env` is listed (it already is). **Never commit your `.env` file**.

### Change 9.3 — Set NODE_ENV=production in Render

Already done in Phase 5 Step 5.3. When `NODE_ENV=production`, the server:
- Disables Prisma verbose query logging
- Enables production error handling (no stack traces exposed in API responses)
- Validates tokens strictly

---

## PHASE 10 — Seed Initial Passage Pool (Important!)

The background `passageWarmingJob` generates passages via Gemini. You need to trigger an initial seed so users have passages to read on Day 1.

### Step 10.1 — Trigger Manual Seed via Admin API

Once your backend is deployed and your account has `is_admin = true` in the database, you can trigger a seed from the admin panel or directly via a curl request:

```bash
# First, get your JWT token by logging in and opening browser devtools:
# Application > Local Storage > sb-[project]-auth-token > access_token

curl -X POST https://readshift-backend.onrender.com/api/admin/seed-passages \
  -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE" \
  -H "Content-Type: application/json"
```

### Step 10.2 — Set Your Account as Admin in Supabase DB

1. Go to Supabase → **Table Editor** → `users` table
2. Find your user row (by email)
3. Set `is_admin` to `true`
4. Click **Save**

Now you can access the admin panel at `https://readshift.vercel.app/admin` and trigger passage generation from there.

---

## PHASE 11 — Monitoring & Maintenance

### Render Logs
- Render Dashboard → `readshift-backend` → **Logs**
- Filter by `[ERROR]` to catch backend issues

### Upstash Redis Monitoring
- Upstash Dashboard shows daily request counts, memory usage, and key counts

### Supabase Database Monitoring
- Supabase → **Reports** → shows query performance and database size

### Free Tier Limits to Watch

| Service | Limit | Action if Hit |
|---|---|---|
| Render | 750 hrs/month free | Service sleeps when idle — first request wakes it up |
| Upstash Redis | 10,000 cmd/day | Rate limiter uses Redis; if exceeded, falls back to in-memory automatically |
| Supabase DB | 500 MB storage | Monitor passage table growth; archive old passages if needed |
| Supabase Auth | 50,000 MAU | More than enough for early users |
| Gemini API | Free tier quota | Generation jobs are async and rate-limited by BullMQ concurrency |

---

## Troubleshooting Common Issues

### ❌ `401 Unauthorized` on all API calls
**Cause**: `CORS_ORIGIN` on Render doesn't match the Vercel URL.  
**Fix**: Double-check `CORS_ORIGIN` in Render env vars exactly matches your Vercel URL (no trailing slash).

### ❌ `500 Internal Server Error` on backend
**Cause**: Usually a missing env variable or bad `DATABASE_URL`.  
**Fix**: Check Render logs → look for startup errors. Verify all Phase 5 env vars are set.

### ❌ Email confirmation redirect goes to `localhost`
**Cause**: Supabase `Site URL` still points to localhost.  
**Fix**: Update Supabase → Authentication → URL Configuration → Site URL to Vercel URL.

### ❌ Render service takes 30s to respond on first request
**Cause**: Expected — Render free tier spins down after 15 minutes of inactivity.  
**Fix**: This is normal on the free tier. Users will experience a cold-start delay once if the service was idle. Consider upgrading to a paid Render tier ($7/month) to eliminate cold starts if this becomes an issue.

### ❌ `prisma migrate deploy` fails with SSL error
**Fix**: Add `?sslmode=require` to the end of your DATABASE_URL:
```
postgresql://postgres:[PASS]@db.YOUR_SUPABASE_REF.supabase.co:5432/postgres?schema=public&sslmode=require
```

### ❌ Redis connection error on startup
**Cause**: Upstash requires TLS (`rediss://` not `redis://`).  
**Fix**: Make sure you copied the `rediss://` URL (with double `s`) from Upstash.

---

## Summary of Final Environment Variables

### Render (Backend)
```
NODE_ENV=production
PORT=3001
DATABASE_URL=postgresql://postgres:[PASS]@db.[REF].supabase.co:6543/postgres?pgbouncer=true&connection_limit=1
REDIS_URL=rediss://default:[UPSTASH-PASS]@[HOSTNAME].upstash.io:6379
GEMINI_API_KEY=[YOUR-GEMINI-KEY]
SUPABASE_URL=https://[REF].supabase.co
ALLOW_DEV_TOKEN=false
CORS_ORIGIN=https://[YOUR-PROJECT].vercel.app
LOG_LEVEL=info
PASSAGE_POOL_MIN_THRESHOLD=50
```

### Vercel (Frontend)
```
VITE_SUPABASE_URL=https://[REF].supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_API_BASE_URL=https://readshift-backend.onrender.com/api
```

---

*Good luck! Once both services are green and all Phase 8 tests pass, ReadShift is fully live in production.* 🎉

---

## PHASE 12 — Docker Deployment (Self-hosted / VPS)

Use this phase instead of Render/Vercel if you want to self-host on a VPS (DigitalOcean, AWS EC2, Hetzner, etc.).

### Step 12.1 — Prerequisites on your server

```bash
# Install Docker + Compose plugin
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
```

### Step 12.2 — Clone and configure

```bash
git clone https://github.com/YOUR_USERNAME/readshift.git
cd readshift
cp .env.example .env
# Edit .env and fill in all real values (see Phase 11 summary)
nano .env
```

### Step 12.3 — Build and start all containers

```bash
docker compose up --build -d
```

This starts four containers:
| Container | Port | Description |
|---|---|---|
| `readshift_postgres` | 5432 | PostgreSQL database |
| `readshift_redis` | 6379 | Redis (BullMQ + cache) |
| `readshift_backend` | 3001 | Express API server |
| `readshift_frontend` | 80 | React app served by nginx |

### Step 12.4 — Apply database migrations

```bash
docker compose exec backend npx prisma migrate deploy --schema ../prisma/schema.prisma
```

### Step 12.5 — Verify all services are healthy

```bash
docker compose ps           # all containers should show "healthy"
curl http://localhost:3001/healthz   # {"status":"ok","checks":{...}}
curl http://localhost:80    # HTML of the React app
```

### Step 12.6 — Tear down / restart

```bash
docker compose down         # stop containers (data volumes preserved)
docker compose down -v      # ⚠️  also removes data volumes (destructive)
docker compose restart backend   # restart a single service
```

---

## PHASE 13 — CI/CD Pipeline (GitHub Actions)

The file `.github/workflows/ci.yml` runs automatically on every push to `main` or `develop`, and on pull requests to `main`.

### What the pipeline does

| Job | Steps |
|---|---|
| `lint-and-typecheck` | Installs all deps, runs `tsc --noEmit` on server and client |
| `test-server` | Spins up a Redis service container, runs `vitest run` in `server/` |
| `test-client` | Runs `vitest run` in `client/` with jsdom |
| `docker-build` | Builds both Docker images (no push by default — see below) |

### Enabling Docker image push

1. Go to your GitHub repo → **Settings** → **Secrets and variables** → **Actions**
2. Add the following secrets:

| Secret | Value |
|---|---|
| `DOCKER_USERNAME` | Your Docker Hub username |
| `DOCKER_PASSWORD` | Your Docker Hub access token |
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anon key |
| `VITE_API_BASE_URL` | Your production backend URL |

3. In `.github/workflows/ci.yml`, uncomment the **Login to Docker Hub** step and set `push: true` on both `docker/build-push-action` steps.

### Triggering a manual run

```bash
# Push to main — CI runs automatically
git push origin main

# Or trigger manually in GitHub UI:
# Actions → CI → Run workflow
```

---

## PHASE 14 — Health Checks and API Documentation

### Health endpoints

| Endpoint | Auth | Description |
|---|---|---|
| `GET /healthz` | None | Full health check: API + DB + Redis |
| `GET /health` | None | Legacy simple check (backward compat) |

Example response from `/healthz`:
```json
{
  "status": "ok",
  "uptime": 3600,
  "ts": "2026-06-27T12:00:00.000Z",
  "checks": {
    "api": "ok",
    "database": "ok",
    "redis": "ok"
  }
}
```

If `database` or `redis` returns `"error"` or `"degraded"`, the response status will be **503**.

### OpenAPI / Swagger UI

The interactive API documentation is available at:

```
http://localhost:3001/api-docs          # local development
https://readshift-backend.onrender.com/api-docs  # production
```

All 24 REST endpoints are documented with request/response schemas. You can authorize with your Supabase JWT token directly in the UI and make live requests.

---

## PHASE 15 — Running Tests Locally

### Server tests (Vitest + Supertest)

```bash
cd server
npm test              # run once
npm run test:watch    # watch mode
```

### Client tests (Vitest + Testing Library)

```bash
cd client
npm test              # run once
npm run test:watch    # watch mode
```

### What is tested

| Test | File | Covers |
|---|---|---|
| Health endpoint | `server/src/__tests__/health.test.ts` | `/healthz` returns 200, `/health` alias works |
| Session store | `client/src/__tests__/sessionStore.test.ts` | State machine transitions, error handling, deduplication |

---

## Environment Variable Reference (Complete)

### Backend (Render or Docker `backend` service)

| Variable | Required | Example | Notes |
|---|---|---|---|
| `NODE_ENV` | ✅ | `production` | Controls logging verbosity |
| `PORT` | ✅ | `3001` | Express port |
| `DATABASE_URL` | ✅ | `postgresql://...` | Supabase DB or local Postgres |
| `REDIS_URL` | ✅ | `rediss://...` | Upstash (TLS) or local Redis |
| `SUPABASE_URL` | ✅ | `https://xxx.supabase.co` | Supabase project URL |
| `GEMINI_API_KEY` | ✅ | `AIza...` | Google Gemini API key |
| `CORS_ORIGIN` | ✅ | `https://readshift.vercel.app` | Frontend URL (no trailing slash) |
| `ALLOW_DEV_TOKEN` | ✅ | `false` | Must be `false` in production |
| `LOG_LEVEL` | ⬜ | `info` | `debug`/`info`/`warn`/`error` |
| `PASSAGE_POOL_MIN_THRESHOLD` | ⬜ | `50` | Minimum passages per domain-level |

### Frontend (Vercel or Docker `frontend` build-arg)

| Variable | Required | Example |
|---|---|---|
| `VITE_SUPABASE_URL` | ✅ | `https://xxx.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | ✅ | `eyJ...` |
| `VITE_API_BASE_URL` | ✅ | `https://readshift-backend.onrender.com/api` |

