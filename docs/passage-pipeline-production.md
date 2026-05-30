# Passage Pipeline: Production Design

## 1. Current Baseline

- Source: passages are persisted in PostgreSQL (`passages`, `questions`), then served by backend.
- Acquisition:
  - seed data (`generated_by = "seed"`) from `prisma/seed.ts`
  - generated data (`generated_by` model tag) from Gemini worker path
- Serving: `POST /api/sessions/start` returns one unseen passage for the user.

## 2. Target Architecture

1. Ingestion layer
- Background workers generate candidate passage + MCQs.
- Optional manual import path for curated passages.

2. Validation layer
- Enforce schema and quality checks before a passage is eligible:
  - word count range
  - exactly 3 MCQs (main_idea, inference, vocab)
  - 4 options each, one correct index
  - banned patterns (labels like `[Passage n]`, headings, boilerplate)

3. Review/approval layer
- Passage state machine:
  - `draft` -> `ready` -> (`flagged` or `retired`)
- Only `ready` and unflagged passages are served.

4. Serving layer
- Session assignment service selects unseen passage with weighted randomization by domain/level.
- Assignment logged and made idempotent for retry-safe behavior.

## 3. Data Model Additions

Add fields to `passages`:
- `status`: `draft | ready | flagged | retired`
- `source`: `seed | gemini | curated`
- `quality_score`: numeric (0-100)
- `topic_key`: normalized topical tag for diversity balancing
- `hash`: content hash for dedupe
- `approved_at`, `approved_by` (nullable)

Optional new table:
- `passage_assignment`:
  - `id`, `user_id`, `passage_id`, `domain_requested`, `level_requested`, `assigned_at`, `session_id?`
  - supports observability and idempotent assignment retry

## 4. API Contract (Stable)

`POST /api/sessions/start` response:
```json
{
  "success": true,
  "data": {
    "passage": { "...": "..." },
    "questions": [{ "...": "..." }]
  }
}
```

Rules:
- Keep this shape stable for client simplicity.
- Do not leak `correct_index` to client before submission.

## 5. Selection Algorithm (Production)

Input:
- user_id
- requested domain (or random)
- target level (user level default)

Filters:
- `status = ready`
- `flagged = false`
- `level = target`
- domain if requested
- unseen by user

Ranking/selection:
1. Build candidate set.
2. Apply diversity weighting:
- downweight same `topic_key` recently seen by user
- slight freshness boost for newer content
3. Weighted random pick.
4. Persist assignment + mark seen atomically.

Fallback policy:
- If requested domain empty:
  - try same level across other preferred domains
  - then adjacent level bands if enabled
  - otherwise return `POOL_EXHAUSTED`

## 6. Quality Gates for Passage Content

- Automated:
  - min/max word count
  - MCQ structure validity
  - lexical diversity threshold
  - duplicate detection via `hash` + similarity check
- Human/ops:
  - admin review UI for `draft` and `flagged`
  - quick approve/retire actions

## 7. Operational SLOs

- Pool depth target: per domain-level minimum threshold (already partially implemented).
- Assignment latency target: < 300ms p95.
- Duplicate exposure target: < 1% per user over 30 sessions.
- Dashboard metrics:
  - pool depth by domain/level/status
  - generation success/failure rates
  - flagged ratio
  - assignment failure rates

## 8. Rollout Plan

Phase A: Contract hardening
1. Standardize `/sessions/start` response shape.
2. Add integration test for response shape and unseen guarantee.

Phase B: Data quality
1. Add `status/source/quality_score/hash` migration.
2. Run backfill script:
- legacy seed -> `source=seed`, evaluate/set `status`
- AI content -> evaluate quality and mark `ready` only when valid.

Phase C: Selection upgrade
1. Introduce weighted-random selector.
2. Add fallback policy and assignment logging.

Phase D: Ops and governance
1. Admin tooling for review/flag/retire.
2. Alerts for low pool depth and generation failures.

## 9. Immediate Practical Guidance

- Development:
  - keep seed passages realistic for local UX
  - test with small but varied pool
- Staging/production:
  - prefer AI/curated `ready` content
  - keep seed content disabled or retired
