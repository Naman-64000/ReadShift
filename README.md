# ⚡ ReadShift — Speed Reading Trainer

> Train your brain to read faster without sacrificing comprehension.
> Targeting GMAT · CAT · Competitive Exam Candidates
> `v1.0 · June 2026`

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [Monorepo Structure](#3-monorepo-structure)
4. [Prerequisites](#4-prerequisites)
5. [Local Development Setup](#5-local-development-setup)
6. [Environment Variables](#6-environment-variables)
7. [Database Setup](#7-database-setup)
8. [Running the App](#8-running-the-app)
9. [Background Jobs](#9-background-jobs)
10. [Database Schema](#10-database-schema)
11. [API Reference](#11-api-reference)
12. [Build Phases & Milestones](#12-build-phases--milestones)
13. [Deployment](#13-deployment)
14. [Scientific Foundation](#14-scientific-foundation)

---

## 1. Project Overview

ReadShift is a web application that trains exam candidates to read faster without degrading comprehension. It uses three clinically-backed techniques — phrase-chunk highlighting, text fading (Reading Acceleration Effect), and a pacing guide — combined in an adaptive session engine that responds to a user's real-time WPM baseline.

### Core Goals

- Target an increase in reading speed by **20–40%** over 4–6 weeks of daily practice *(Projected target; pending user cohort A/B testing)*
- Maintain or improve comprehension accuracy (target: ≥ 75% MCQ accuracy at target WPM)
- Use cognitively realistic techniques — no artificial one-word RSVP flashing
- Serve high-quality, exam-relevant passages dynamically (no repeated content)
- Give users clear progress feedback: WPM trend, accuracy trend, session history

---

## 2. Tech Stack

### Frontend (`/client`)

| Technology | Version | Purpose |
| :--- | :--- | :--- |
| React | 18 | Component architecture for the session state machine |
| TypeScript | 5.4 | End-to-end type safety |
| Vite | 5 | Build tooling and dev server |
| Tailwind CSS | 3.4 | Utility-first styling |
| Framer Motion | 11 | Chunk highlight transitions and animations |
| Zustand | 4.5 | Lightweight state management (session + user state) |
| React Router | v6 | Client-side routing |
| Recharts | 2.12 | WPM and accuracy trend charts on dashboard |
| Axios | 1.7 | HTTP client with interceptors for auth |
| Supabase Auth JS | 2.x | Authentication UI/session management via Supabase Auth |
| vite-plugin-pwa | 1.3 | PWA manifest + service worker for offline caching |

### Backend (`/server`)

| Technology | Version | Purpose |
| :--- | :--- | :--- |
| Node.js | 20 LTS | Runtime |
| TypeScript | 5.4 | Type-safe server code |
| Express | 4.19 | HTTP framework |
| Prisma | 5.14 | Type-safe ORM, schema-as-code, migrations |
| PostgreSQL | 15 | Primary relational database |
| Redis | 7 | BullMQ job queue backing store & dashboard caching |
| BullMQ | 5.7 | Background job queue (passage generation, pool health) |
| ioredis | 5.3 | Redis client (BullMQ-compatible) |
| Pino | 9 | Structured JSON logging |
| Zod | 3.23 | Runtime request body validation |
| jose | 5 | JWT verification (Supabase JWKS) |
| @google/generative-ai | 0.24 | Google Gemini API for passage + MCQ generation |

### ⚡ Latency & Caching Performance

To minimize database load and ensure instantaneous UI response, ReadShift implements caching on the complex, computationally-heavy dashboard metrics calculation:
* **Target Endpoint**: `GET /api/dashboard/summary`
* **Caching Strategy**: Redis Key-Value store with a 15-minute Time-to-Live (TTL), auto-invalidated on session submission or calibration update.

ReadShift includes a verifiable performance benchmark script to compare database and cache access latency. You can run the benchmark in two modes to see the difference between a local development container and a simulated production environment.

#### 📊 Performance Comparison Tables

##### 1. Local Docker Mode (Default)
Useful for local integration checking and verifying caching correctness with a warm local PostgreSQL instance (no network latency and small dataset of 50 rows).
* **Command**: `npm run benchmark:perf`
* **Results**:
  | Metric | Direct PostgreSQL (Cache Miss) | Redis Caching (Cache Hit) | Latency Reduction | Speed Factor |
  | :--- | :--- | :--- | :--- | :--- |
  | **Cold Start Response** | `~307.9 ms` | `~0.17 ms` | **99.9%** | **~1790x faster** |
  | **Warm Query Response** | `~0.33 ms` | `~0.17 ms` | **47.4%** | **~1.9x faster** |

##### 2. Simulated Production Mode
Simulates a real cloud deployment (e.g., Railway/Render with a PostgreSQL RTT network delay of 120ms and a realistic dataset of 1,000+ session records).
* **Command**: `npm run benchmark:perf -- --simulate-production`
* **Results**:
  | Metric | Direct PostgreSQL (Cache Miss) | Redis Caching (Cache Hit) | Latency Reduction | Speed Factor |
  | :--- | :--- | :--- | :--- | :--- |
  | **Cold Start Response** | `~410.4 ms` | `~5.6 ms` | **98.6%** | **~73x faster** |
  | **Warm Query Response** | `~267.6 ms` | `~5.6 ms` | **97.9%** | **~48x faster** |

---

## 3. Monorepo Structure

```
ReadShift/                          # Monorepo root
├── package.json                    # Workspace root (npm workspaces)
├── docker-compose.yml              # Local PostgreSQL + Redis
├── .env.example                    # All required env vars (copy → .env)
├── .gitignore
│
├── prisma/
│   ├── schema.prisma               # Complete DB schema (10 tables)
│   └── seed.ts                     # Dev/staging seed data
│
├── e2e/                            # Playwright end-to-end tests
│   ├── playwright.config.ts
│   └── specs/
│       └── timer-drift.spec.ts     # Timer accuracy regression tests
│
├── artifacts/
│   └── lighthouse-reading.json     # Lighthouse audit output
│
├── client/                         # React 18 + Vite frontend
│   ├── package.json
│   ├── vite.config.ts              # Vite + PWA plugin config
│   ├── tailwind.config.js
│   ├── tsconfig.json
│   ├── index.html
│   └── src/
│       ├── main.tsx                # Entry point — mounts React + Supabase + Router
│       ├── App.tsx                 # Route tree
│       ├── index.css               # Tailwind base + design tokens
│       │
│       ├── screens/                # One file per screen/route
│       │   ├── AuthScreen.tsx
│       │   ├── OnboardingScreen.tsx
│       │   ├── CalibrationScreen.tsx
│       │   ├── SessionConfigScreen.tsx
│       │   ├── ReadingScreen.tsx
│       │   ├── MCQScreen.tsx
│       │   ├── ResultsScreen.tsx
│       │   ├── DashboardScreen.tsx
│       │   ├── SettingsScreen.tsx
│       │   ├── AdminScreen.tsx          # Admin-only panel (passage/user management)
│       │   └── MetronomeDrillScreen.tsx # Subvocalization metronome drills
│       │
│       ├── components/
│       │   ├── session/            # Reading engine, WPM slider, MCQ card, result card, progress bar
│       │   ├── dashboard/          # WPM chart, accuracy chart, stat card, streak badge, recommendation card, advanced diagnostics
│       │   ├── onboarding/         # Domain selector, reading aid toggle, step indicator
│       │   └── shared/             # Button, Navbar, LoadingSpinner, ErrorBoundary, Toast
│       │
│       ├── store/                  # Zustand state slices
│       │   ├── index.ts            # Barrel export
│       │   ├── userSlice.ts        # User + preferences state
│       │   ├── sessionSlice.ts     # Active session state machine
│       │   ├── dashboardSlice.ts   # Dashboard summary cache
│       │   └── uiSlice.ts          # Toasts, modals, fullscreen, theme
│       │
│       ├── hooks/                  # Custom React hooks
│       │   ├── useReadingTimer.ts  # Drift-corrected interval timer
│       │   ├── useSession.ts       # Session store wrapper + computed values
│       │   ├── useDashboard.ts     # Dashboard data fetcher
│       │   └── useUserProfile.ts   # User profile loader
│       │
│       ├── lib/
│       │   ├── apiClient.ts        # Axios instance + Supabase JWT interceptor
│       │   ├── supabase.ts         # Supabase client initialization
│       │   ├── utils.ts            # WPM math, formatting helpers
│       │   └── constants.ts        # WPM levels, domains, allowed values
│       │
│       └── types/                  # TypeScript interfaces
│           └── index.ts            # Barrel exports
│
└── server/                         # Node.js + Express backend
    ├── package.json
    ├── tsconfig.json
    └── src/
        ├── index.ts                # Express app entry + worker registration
        ├── worker.ts               # BullMQ worker startup
        │
        ├── routes/                 # Router modules (thin — delegate to controllers)
        │   ├── users.ts            # GET /me, POST /, PATCH /me/preferences, DELETE /me
        │   ├── sessions.ts         # POST /start, POST /, GET /, GET /:id, GET /domain-status
        │   ├── passages.ts         # GET /, POST /:id/flag
        │   ├── calibrations.ts     # POST /, GET /, GET /latest
        │   ├── dashboard.ts        # GET /summary
        │   ├── admin.ts            # Admin-only passage/user management
        │   └── drills.ts           # POST /start, POST /complete (metronome drills)
        │
        ├── controllers/            # Request handlers (validate → call service → respond)
        │   ├── users.ts
        │   ├── sessions.ts
        │   ├── passages.ts
        │   ├── calibrations.ts
        │   ├── dashboard.ts
        │   ├── admin.ts
        │   └── drills.ts
        │
        ├── services/               # Business logic (no Express types)
        │   ├── sessionService.ts   # pickPassage(), createSession(), adaptive difficulty
        │   ├── passageService.ts   # getPoolDepth(), getUnseen(), flagPassage()
        │   ├── dashboardService.ts # buildSummary() with Redis caching
        │   ├── aiService.ts        # generatePassage(), generateQuestions()
        │   ├── authService.ts      # verifyToken(), getUserBySupabaseId()
        │   └── passageQualityService.ts  # Passage quality scoring + filtering
        │
        ├── middleware/
        │   ├── auth.ts             # requireAuth — validates Supabase JWT
        │   ├── admin.ts            # requireAdmin — is_admin flag guard
        │   ├── timezone.ts         # Reads X-Timezone-Offset header for streak logic
        │   ├── rateLimiter.ts      # globalRateLimit, sessionRateLimit
        │   └── errorHandler.ts     # Global error → JSON envelope mapper
        │
        ├── jobs/                   # BullMQ workers
        │   ├── passageWarmingJob.ts # Generates passages via Gemini when pool is low
        │   ├── poolHealthJob.ts     # Scheduled: checks pool depth, enqueues warming jobs
        │   └── streakResetJob.ts    # Daily: timezone-aware streak reset for inactive users
        │
        ├── scripts/
        │   └── benchmarkDashboard.ts  # Performance benchmark: DB vs Redis cache latency
        │
        └── lib/
            ├── prisma.ts           # PrismaClient singleton
            ├── redis.ts            # ioredis singleton (BullMQ-compatible)
            ├── queue.ts            # BullMQ Queue instances + queue name constants
            ├── env.ts              # dotenv loader
            └── logger.ts           # Pino logger (pretty in dev, JSON in prod)
```

---

## 4. Prerequisites

| Requirement | Version | Install |
| :--- | :--- | :--- |
| Node.js | 20 LTS | [nodejs.org](https://nodejs.org) or `nvm install 20` |
| npm | 10+ | Bundled with Node.js 20 |
| Docker Desktop | Latest | [docker.com](https://www.docker.com/products/docker-desktop/) |
| Git | 2.x+ | Pre-installed on macOS |

You will also need accounts and API keys for:
- **Supabase** — [supabase.com](https://supabase.com) (Auth + anon/public keys)
- **Google AI Studio** — [aistudio.google.com](https://aistudio.google.com) (Gemini API key)

---

## 5. Local Development Setup

### Step 1 — Clone and install dependencies
```bash
git clone <repo-url> ReadShift
cd ReadShift
npm install
```

### Step 2 — Configure environment variables
```bash
cp .env.example .env
```

### Step 3 — Start the database and Redis
```bash
docker compose up -d
```

### Step 4 — Run database migrations and seed
```bash
cd server
npm run db:generate
npm run db:migrate
npm run db:seed
```

### Step 5 — Start the development servers
```bash
npm run dev
```

---

## 6. Environment Variables

| Variable | Required | Description |
| :--- | :--- | :--- |
| `NODE_ENV` | ✅ | `development` \| `staging` \| `production` |
| `DATABASE_URL` | ✅ | Full Prisma PostgreSQL connection string |
| `REDIS_URL` | ✅ | Redis connection URL |
| `PORT` | ✅ | Express server port (default `3001`) |
| `CORS_ORIGIN` | ✅ | Allowed CORS origin for the API (Vite dev: `http://localhost:5173`) |
| `SUPABASE_URL` | ✅ | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Supabase service role key (server-side JWT verification) |
| `VITE_SUPABASE_URL` | ✅ | Same as above — exposed to the Vite client |
| `VITE_SUPABASE_ANON_KEY` | ✅ | Supabase anon key — exposed to the Vite client |
| `GEMINI_API_KEY` | ✅ | Google Gemini API key |
| `VITE_API_BASE_URL` | ✅ | Backend API base URL seen by the client |
| `LOG_LEVEL` | ✅ | `debug` \| `info` \| `warn` \| `error` |
| `PASSAGE_POOL_MIN_THRESHOLD` | ✅ | Passages per domain before top-up triggers (default `50`) |
| `VITE_DEV_MODE` | ⬜ | Set to `"true"` in dev to bypass Supabase email confirmation check |

---

## 7. Database Setup

### Schema overview
The Prisma schema is at `prisma/schema.prisma` and defines **10 tables**:

| Table | Purpose |
| :--- | :--- |
| `users` | Core identity record, stores Supabase UID |
| `user_prefs` | Reading preferences — one row per user |
| `passages` | Shared AI-generated content pool (250–350 words each) |
| `questions` | 3 MCQs per passage (main_idea, inference, vocab) |
| `sessions` | One row per completed reading session |
| `responses` | One MCQ answer row per question per session |
| `calibrations` | Baseline WPM measurements per user |
| `user_passage_seen` | Join table preventing passage repetition per user |
| `passage_assignments` | Tracks which passage was assigned per user + session context |
| `drill_passages` | Short passages (65–85 words) for metronome subvocalization drills |
| `user_drill_seen` | Join table preventing drill passage repetition per user |

### Common database commands

```bash
# From /server

npm run db:generate    # Regenerate Prisma client after schema changes
npm run db:migrate     # Apply pending migrations (creates new migration file)
npm run db:seed        # Run prisma/seed.ts to populate dev data
npm run db:studio      # Open Prisma Studio at http://localhost:5555
```

---

## 8. Running the App

### Development (both services)

```bash
# From monorepo root
npm run dev
```

### Development (individual services)

```bash
# Frontend only
cd client && npm run dev

# Backend only
cd server && npm run dev
```

### Type checking

```bash
npm run type-check
```

### Linting

```bash
npm run lint
```

### Quality Assurance (QA) & E2E Testing

```bash
# Run Lighthouse performance audit on the reading screen
npm run qa:lighthouse:reading

# Run Playwright end-to-end tests
npm run qa:e2e:staging
npm run qa:e2e:staging:headed
```

### Performance Benchmark

```bash
# Compare PostgreSQL vs Redis cache latency (local Docker mode)
npm run benchmark:perf

# Simulated production mode (120ms DB RTT, 1000+ rows)
npm run benchmark:perf -- --simulate-production
```

---

## 9. Background Jobs

| Job | Queue | Schedule | Purpose |
| :--- | :--- | :--- | :--- |
| `passageWarmingJob` | `passage-warming` | On-demand | Calls Gemini to generate passages + MCQs |
| `poolHealthJob` | `pool-health` | Every 30 min | Checks passage pool depth, enqueues warming jobs |
| `streakResetJob` | `streak-reset` | Daily | Timezone-aware streak reset for inactive users |

---

## 10. Database Schema

### Content Domains
`philosophy` · `psychology` · `history` · `arts_and_museum` · `society` · `culture` · `biology` · `science_and_technology`

**Pool target:** 400 passages (50 per domain) before repetition.

### Passage Status Lifecycle
`draft` → `ready` → `flagged` → `retired`

---

## 11. API Reference

All API routes are prefixed with `/api`. All protected routes require a Supabase JWT in the `Authorization: Bearer <token>` header.

### Users

| Method | Path | Auth | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/users/me` | ✅ | Get authenticated user + preferences |
| `POST` | `/api/users` | ✅ | Create user record on first Supabase login |
| `PATCH` | `/api/users/me/preferences` | ✅ | Update reading preferences (partial) |
| `DELETE` | `/api/users/me` | ✅ | Delete account and all associated data |

### Sessions

| Method | Path | Auth | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/sessions/start` | ✅ | Pick an unseen passage; returns `{ passage, questions }` |
| `POST` | `/api/sessions` | ✅ | Submit a completed session with MCQ responses |
| `GET` | `/api/sessions` | ✅ | List session history (paginated) |
| `GET` | `/api/sessions/:id` | ✅ | Get a single session by ID |
| `GET` | `/api/sessions/domain-status` | ✅ | Unseen passage counts per domain for the current user |

### Passages

| Method | Path | Auth | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/passages` | ✅ | List passages with pool depth summary (admin) |
| `POST` | `/api/passages/:id/flag` | ✅ | Flag a passage for quality review |

### Calibrations

| Method | Path | Auth | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/calibrations` | ✅ | Submit a calibration result |
| `GET` | `/api/calibrations` | ✅ | List all calibrations for the user |
| `GET` | `/api/calibrations/latest` | ✅ | Get the most recent (current baseline) |

### Dashboard

| Method | Path | Auth | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/dashboard/summary` | ✅ | Full dashboard summary (WPM trend, accuracy, streak, recommendation) — Redis-cached |

### Admin *(requires `is_admin = true`)*

| Method | Path | Auth | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/admin/summary` | ✅ Admin | Platform-wide stats |
| `GET` | `/api/admin/passages` | ✅ Admin | List all passages with status |
| `PATCH` | `/api/admin/passages/:id` | ✅ Admin | Update passage status/quality |
| `GET` | `/api/admin/users` | ✅ Admin | List all users |
| `PATCH` | `/api/admin/users/:id` | ✅ Admin | Update user (e.g. grant admin) |
| `GET` | `/api/admin/users/:id/seen-passages` | ✅ Admin | List passages seen by a specific user |
| `DELETE` | `/api/admin/users/:id/seen-passages/:passageId` | ✅ Admin | Reset seen status for a passage |

### Drills *(Metronome Subvocalization Drills)*

| Method | Path | Auth | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/drills/start` | ✅ | Pick an unseen drill passage for the metronome drill |
| `POST` | `/api/drills/complete` | ✅ | Submit drill result and mark passage seen |

### API Response Envelope

All responses follow a consistent shape:

```json
// Success
{ "success": true, "data": { ... } }

// Error
{ "success": false, "error": { "code": "POOL_EXHAUSTED", "message": "No passages available for this domain." } }
```

### Known Error Codes

| Code | HTTP | Meaning |
| :--- | :--- | :--- |
| `POOL_EXHAUSTED` | 404 | No unseen passages for the selected domain |
| `UNAUTHORIZED` | 401 | Missing or invalid JWT |
| `FORBIDDEN` | 403 | Authenticated but not permitted (e.g. non-admin on admin route) |
| `NOT_FOUND` | 404 | Resource does not exist |
| `VALIDATION_ERROR` | 400 | Request body failed Zod validation |
| `INTERNAL_ERROR` | 500 | Unexpected server error |

---

## 12. Build Phases & Milestones

### Phase 1 — Core Reading Engine (Weeks 1–2)
> **Goal:** A user can read a hardcoded passage with chunk highlighting and see their WPM at the end.

- [x] Implement `useReadingTimer` with drift-corrected interval
- [x] Build `ReadingEngine` component (chunking, highlighting, fading, guide)
- [x] Build `WpmSlider` and `SessionConfigScreen`
- [x] Build basic `ResultsScreen`
- [x] Verify: timer accurate within 200ms over a full session (Playwright harness confirmed; timer-drift.spec.ts passes)

### Phase 2 — Backend + Auth + DB (Weeks 3–4)
> **Goal:** Users can create accounts, sessions are saved, passages are fetched from the database.

- [x] Configure auth + `requireAuth` middleware (Supabase JWT verification)
- [x] Implement `authService.verifyToken()` and user lookup/create service
- [x] Implement all route controllers (users, sessions, calibrations)
- [x] Implement `sessionService.pickPassage()` and `createSession()`
- [x] Seed DB with manual passages for testing (`prisma/seed.ts`)
- [x] Build `CalibrationScreen` and `calibrationsController`
- [x] Build `AuthScreen` (Supabase-powered sign-in/sign-up UI)

### Phase 3 — AI Content Pipeline + Dashboard (Weeks 5–6)
> **Goal:** Gemini generates passages and MCQs. Dashboard shows real data.

- [x] Implement `aiService.generatePassage()` and `generateQuestions()` (Gemini-based)
- [x] Implement `passageWarmingJob` BullMQ worker
- [x] Implement `poolHealthJob` scheduler
- [x] Implement `dashboardService.buildSummary()` with Redis caching
- [x] Build `DashboardScreen` with `WpmChart`, `AccuracyChart`, `AdvancedDiagnostics`
- [x] Build `MCQScreen` with per-question timer (configurable, default off)
- [x] Implement `passageQualityService` for AI output validation and scoring

### Phase 4 — Polish + Launch (Weeks 7–8)
> **Goal:** App feels complete: smooth UX, adaptive difficulty, onboarding, error handling.

- [x] Implement adaptive difficulty (level promotion and demotion logic)
- [x] Implement Spaced Repetition for resurfacing challenging passages
- [x] Implement Timezone-Aware streak tracking
- [x] Periodic Recalibration triggers
- [x] Build `OnboardingScreen` multi-step flow
- [x] Implement `SettingsScreen` with auto-save preferences
- [x] Build `AdminScreen` (passage + user management for `is_admin` users)
- [x] Build `MetronomeDrillScreen` (subvocalization suppression drills)
- [x] Add PWA support via `vite-plugin-pwa` (service worker + manifest)
- [x] Lighthouse score ≥ 85 on ReadingScreen (Achieved via PWA caching)
- [x] All E2E tests pass in staging (Timer drift Playwright specs passed)
- [~] Polish all animations (Framer Motion) — ongoing
- [~] Ensure mobile responsiveness (375px viewport) — ReadingScreen pass completed; full-app pass pending

### Milestones

| Milestone | Week | Done When |
| :--- | :--- | :--- |
| M1: Reading Engine | 2 | Chunk highlighting + timer accurate across 4 browsers |
| M2: Auth + DB | 4 | Registration, session save, no passage repeats |
| M3: AI Content | 6 | Gemini generates, MCQs work, scores saved |
| M4: Full Dashboard | 6 | WPM trend + accuracy charts show real data < 300ms |
| M5: Adaptive Difficulty | 7 | Level promotion fires correctly on seeded test data |
| M6: Drills + Admin | 8 | Metronome drill flow complete; admin panel live |
| M7: Production Launch | 8 | All Phase 4 criteria passed, custom domain live |

---

## 13. Deployment

### Frontend — Vercel

```bash
cd client
npm run build        # Outputs to client/dist/
# Deploy dist/ to Vercel via CLI or GitHub integration
```

Set all `VITE_*` environment variables in the Vercel project settings.

### Backend — Railway (preferred) or Render

```bash
cd server
npm run build        # Compiles TypeScript to dist/
npm start            # Runs node dist/index.js
```

Set all non-`VITE_*` environment variables in the Railway/Render dashboard.

**Railway-specific:** Use Railway's managed PostgreSQL and Redis add-ons. The connection URLs are injected automatically — set `DATABASE_URL` and `REDIS_URL` from Railway's variable references.

### Database migrations in production

```bash
# Run from the server directory in CI/CD before starting the server
npx prisma migrate deploy
```

---

## 14. Scientific Foundation

### Technique 1 — Phrase Chunk Highlighting
Fluent readers make 3–4 fixations per line, each covering a 3–5 word cluster. The app advances a highlight box in phrase-sized chunks (2–3 words, configurable) at the user's target WPM. The full text remains visible — unlike RSVP, peripheral vision is engaged and re-reading is possible.

### Technique 2 — Text Fading (Reading Acceleration Effect)
A 2024 Frontiers in Psychology study (N=90) found participants read **40% faster** under the Reading Acceleration Procedure while maintaining the same comprehension. In fading mode, text behind the highlight fades to 20% opacity after a short delay, training forward momentum without fully removing the text. Off by default.

### Technique 3 — Pacing Guide (Meta-Guiding)
A 1px horizontal guide line moves down the passage at the line-crossing rate. Suppresses regressions (the habit of re-reading) and gives the eye a target to follow. Enabled by default.

### Technique 4 — Metronome Subvocalization Drill
Short 65–85 word passages read under a rhythmic audio metronome cue. Gradually increases BPM across 6 levels to reduce inner-speech pacing. Comprehension verified with a 2-option question after each drill.

### What the App Does NOT Use

| Technique | Why Excluded |
| :--- | :--- |
| **Pure RSVP (1-word flash)** | Eliminates natural eye movement; comprehension drops sharply on dense argumentative text |
| **Bionic Reading** | 2025 eye-tracking study found no significant difference in fixation duration, count, or speed vs standard text |
| **Subvocalization elimination** | Fully eliminating inner speech reduces comprehension on complex text — the app reduces, not eliminates |

---

> *This repository is the authoritative reference for the ReadShift v1 build. Questions about any section should be directed to the product lead. Updates require a version bump.*


