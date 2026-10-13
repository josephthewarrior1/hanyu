# HanyuFlow

**Latest delivery: Android APK, usable offline without login or AI.** See [Android installation and architecture](docs/ANDROID.md). Android v3 adds four sound foundations, six practical goals, 12 two-turn exchanges, 60 varied tasks, three delayed-retention forms, actual-mistake practice and 200 bundled generated Mandarin clips. Existing v2/v3 progress and lessons remain available. The latest 0.4.1 correction fixes a valid numbered-pinyin alternative and requires a follow-up form to be opened after the delay; see [patch verification](docs/CORRECTIVE_PATCH.md). The web application below is retained as an optional future backend, not a required phone runtime.

Working mobile-first Mandarin learning PWA with Indonesian and English interfaces. Built locally from all 31 sections of the supplied five-page specification. No existing repository was provided, so this project is isolated from other work.

**This is a tested development implementation, not a claim of production readiness or complete specification coverage.** The original beginner content is a pedagogical draft. It has not received human linguistic review and is not mapped to an official HSK syllabus or accreditation.

## Current release and work in progress

The validated offline Android release is **0.4.1-android / version code4**, using the existing signing identity and SQLite schema2. Its source, packaged assets, build instructions and actual checks are included; see [correction evidence](docs/CORRECTIVE_PATCH.md). No production/store release is claimed.

The next everyday-situations package is **work in progress**, not available in the released APK. Current authored source contains six units, 18 lessons/scenarios, 84 guided activities, 12 four-to-six-turn dialogues, six readings, 12 private-message prompts, 103 words/chunks, and four forms with10 listening/5 reading/5 controlled-production items each. Content consistency tests and TypeScript pass. Native/UI integration, contextual speech generation and delayed/week assessment integration remain unfinished.

Finger/mouse writing is also in progress: pinned, checksummed data for12 Hanzi are present under `android/handwriting/vendor`, with the unmodified Arphic Public License and provenance. Guided tracing versus recall, tone-mark drawing/placement, accessibility alternatives and native saving are not implemented yet. Existing numeric geometric guides remain available in0.4.1. Source graphics are not claimed to be full handwriting recognition or verified proficiency. See [bounded scope](docs/EVERYDAY_PACKAGE_SCOPE.md) and [checkpoint](docs/EVERYDAY_CHECKPOINT.md).

Original generated curriculum/audio await qualified human linguistic/acoustic review. This package does not claim intermediate/expert status, complete Mandarin, HSK/CEFR certification or assessed open speaking/writing. No live AI, login requirement, external handwriting API or data upload is added.

Signing keys, real credentials/environment files, local learner databases, caches, dependencies and the large neural model/runtime are excluded from Git. The bundled generated audio, original mascot and selected licensed stroke data are included for an offline/reproducible build. Database/UI JSON reports are explicitly disposable test fixtures, not private learner records.

## Run locally on Windows, macOS or Linux

Requires Node.js 20.20+ (22 recommended), npm, and a modern browser. PostgreSQL is the default deployment schema; the SQLite development option needs no external service.

```sh
npm ci
npm run setup:local
npm run dev
```

Open http://localhost:3000. `setup:local` creates a random local Auth.js secret, SQLite `.env`, schema/client, migrations and seed data. It refuses to overwrite an existing PostgreSQL `.env`. If `.env` already exists, review it first. Never commit it.

The local setup explicitly enables three **development-only** accounts:

| Account | Role | Local password |
| --- | --- | --- |
| student@hanyuflow.local | Student | LocalStudy!2026 |
| editor@hanyuflow.local | Content editor | LocalStudy!2026 |
| admin@hanyuflow.local | Administrator | LocalStudy!2026 |

These are non-production fixtures. Seed users are disabled unless `SEED_DEV_USERS=true` and `NODE_ENV` is not `production`. The student's onboarding starts unfinished. Admin/editor accounts can open `/admin`. Normal signup always creates a student; client inputs cannot grant roles or Pro access.

To run the production build locally:

```sh
npm run build
npm start
```

The local standalone server binds to `127.0.0.1`. The included start script resolves SQLite paths correctly. It does not publish the app.

## PostgreSQL and Docker

```sh
# PowerShell: Copy-Item .env.example .env
# Bash: cp .env.example .env
# Set AUTH_SECRET to a new random secret, and change the database password.
docker compose up --build
```

The isolated Compose project is named `hanyuflow`; its database volume is `hanyuflow-db`. PostgreSQL and web ports bind to loopback. Startup applies PostgreSQL migrations and seeds original content. Docker uses a non-root web user. No test users are seeded in the production container.

Docker was present on the implementation host but its daemon was unavailable. PostgreSQL schema validation and SQL generation were verified; actual PostgreSQL execution and container builds were **not** verified. SQLite migrations, persistence, transactions, application production build, and browser flows were verified separately. Do not treat SQLite results as PostgreSQL deployment certification.

For a separately managed PostgreSQL database:

```sh
npm run db:generate
npm run db:migrate
npm run db:seed
npm run build
npm start
```

Use `.env.example` with your database URL. `prisma/schema.prisma` and `prisma/migrations/` are PostgreSQL. `prisma/local/schema.prisma` and `prisma/local/migrations/` are SQLite. Generate the appropriate client before running. Prisma 6.19 is deliberately pinned for this dual-database implementation; upgrade with a reviewed migration plan.

To create your first non-fixture administrator, set `ADMIN_EMAIL`, `ADMIN_NAME`, and `ADMIN_PASSWORD` in the process environment, then run:

```sh
npx tsx scripts/create-admin.ts
```

The password must contain at least 16 characters and is never printed. Existing accounts are not overwritten. In Docker, execute this same script in the web container with these environment variables supplied. An administrator can then manage roles and Free/Pro entitlements at `/admin/users`. Editors cannot use that API or UI. Administrators cannot demote themselves, and the last administrator cannot delete their own account.

## Working features

- Auth.js credentials signup/login/logout with bcrypt hashing, protected server routes, current database role checks, secure production session cookies, and persistent rate limits.
- Six-step resumable onboarding: interface, experience, goal, minutes, reminder/timezone and optional three-question scored placement baseline. It records a baseline without inventing a personalized advanced course.
- Ten original beginner units, three playable lessons each, 60 vocabulary entries, ten grammar patterns, and 210 scored exercises. Units cover greetings, numbers, family, food, time, shopping, directions, routines, hobbies and conversations.
- Seven functioning exercise types: meaning choice, pinyin choice, character recognition, sentence ordering, fill blank, two-word matching, and dialogue completion. Hints, explanations, retries and attempt history are real. Other exercise types are not presented as complete.
- Lesson resume after reload; server grading; all-exercise and mastery checks; separate first-try accuracy; transactional completion; unique user/lesson XP events; review cards and achievements generated only from completed work.
- Vocabulary search across Hanzi, accented pinyin, English and Indonesian; debounced queries, pagination, topic/mastery/favorite filters, examples and detail pages. Grammar library and linked lessons.
- Due reviews with Again/Hard/Good/Easy; durable histories, stale-card conflict detection, idempotency and ownership checks. Dashboard XP, streaks, charts, minutes, reviews and progress use actual stored data.
- Profile/preferences, language, pinyin, device audio, goals, timezone, dark/system theme, optional public leaderboard, data export, password change and password-confirmed account deletion.
- Browser speech synthesis using an installed Mandarin voice, slow playback and honest unavailable/error states. Permission-based microphone recording, input-level diagnostics, replay, deletion and optional explicit transcription upload.
- Server-side OpenAI-compatible tutor and transcription adapters with timeout/error handling, conversation ownership/history/deletion, durable quotas and usage accounting. No credentials are included; these external services were not live-tested.
- Touch/pointer Hanzi canvas for 一, 二, 三 and 十, original CC0 geometric stroke sequences, trace/free mode, undo, clear, replay and saved practice. Geometric sequence feedback is not handwriting recognition.
- Admin overview/analytics, user roles/entitlements, validated JSON lesson/exercise authoring, JSON import/export, preview, draft deletion, immutable publication, unit/vocabulary/grammar editors, revisions and audit records.
- Installable PWA manifest and icons; service worker shell/static caching; explicitly saved vocabulary for offline reading/self-practice. Private API responses and authenticated HTML are not cached. No offline progress/XP queue is claimed.
- Opt-in browser notifications while the app is open, study timezone and quiet hours. No background push/email scheduler is claimed.

## Scoring and persistence

Answers are validated on the server with Zod. Normalization preserves tone marks while ignoring basic punctuation and whitespace. Ordering compares sentence token order; matching checks each position. Each attempt has a UUID. Retrying a network request with the same key does not create a second attempt; changed payloads or different ownership are rejected.

Completion requires answers to every exercise and the published mastery threshold. Retries can meet mastery; reported accuracy remains the first attempt per exercise. XP is `20 + round(firstTryAccuracy / 5)` and is awarded once per logical lesson per user, across content versions. Completion, XP, cards, streak, session and achievement updates are transactional, with serialization/unique conflict retries. A started lesson stays pinned to its content version after publication of a new version.

Lesson duration measures elapsed time from start to completion, capped at 30 minutes; it is not active-attention measurement. Review recall percentages are self-reported ratings, not objectively assessed retention. A mastered card requires at least five consecutive non-Again repetitions and an interval of at least 21 days. Streaks use the saved IANA timezone and calendar days, including DST boundaries. Activity charts use XP timestamps in that timezone.

## Review scheduler

This is an explicitly documented **SM-2-inspired alternative, not FSRS**. `difficulty` currently stores an ease factor (1.3–3.5); `intervalDays` stores the interval.

| Rating | Next interval | Ease/repetitions |
| --- | --- | --- |
| Again | 10 minutes | ease −0.2, repetitions reset, lapse +1 |
| Hard | max(1 day, prior ×1.2) | ease −0.15, repetitions +1 |
| Good | first 1 day, second 3 days, then prior ×ease | ease unchanged, repetitions +1 |
| Easy | max(4 days, prior ×ease ×1.3) | ease +0.15, repetitions +1 |

Intervals are capped at 365 days. The server rejects future/not-yet-due cards and changed due timestamps. Unique review events prevent duplicate updates and XP.

## Integrations and privacy

`/api/capabilities` is the source of configured/unconfigured status. Set `AI_API_KEY`, `AI_MODEL`, and optionally `AI_BASE_URL` for text tutor. Set `TRANSCRIPTION_API_KEY` and `TRANSCRIPTION_MODEL` for STT. Keep them server-only. API-key presence means configured, not proven operational; errors remain visible until a live provider request succeeds. Text responses are displayed as text, never trusted HTML.

Free accounts have five tutor requests per study day; Pro uses `AI_DAILY_LIMIT` (default 20). Quota reserves each request before invoking the provider, so failed calls consume quota. There is a separate minute limit. Conversations send recent context and preferences to the configured provider. This version does not stream replies or retry paid calls automatically.

Recordings remain in browser memory until the learner explicitly requests transcription. This app does not store raw audio. Supported uploads are capped at 5 MB and checked by declared MIME type; hardened content sniffing/stream limits remain deployment work. Transcripts and chat history can be exported/deleted. STT does not provide genuine syllable/tone pronunciation assessment. That specialized adapter remains unavailable.

Email verification/reset, Google login, background push, object-storage uploads, specialized pronunciation assessment and billing are unconfigured/unimplemented. No accounts, API credentials, payments, or external publication were created. The browser PWA uses a Mandarin system/browser voice. Android 0.3.0 bundles 120 pre-generated neural Mandarin clips and needs no system voice pack; these are AI-generated, not native-speaker recordings. See docs/OFFLINE_AUDIO.md.

## Routes and API contracts

Public: `/`, `/login`, `/register`, `/forgot-password`, `/privacy`, `/terms`, `/offline`.

Student: `/onboarding`, `/dashboard`, `/learn`, `/learn/[unit]`, `/lesson/[id]`, `/review`, `/vocabulary`, `/vocabulary/[id]`, `/grammar`, `/grammar/[id]`, `/speaking`, `/speaking/[scenario]`, `/hanzi`, `/progress`, `/achievements`, `/leaderboard`, `/profile`, `/settings`.

Admin: `/admin` and users/curriculum/units/lessons/exercises/vocabulary/grammar/dialogues/media/ai/analytics/audit subroutes. Some studio sections are clearly marked read-only.

Auth.js owns `/api/auth/*`. Typed application handlers live in `src/app/api/[...path]/route.ts`. Responses use `{data: ...}` or `{error: {message: ...}}`. API handlers validate session/ownership and role on the server. JSON write bodies are limited to 256 KB and mutations require a same-origin `Origin` header. Custom clients must provide it. Search is paginated at 20 entries; due review requests return up to 50 cards.

## Tests and verification

```sh
npm run typecheck
npm run lint
npm test
npm run test:integration
npm run build
npm start
# In another terminal after the server is ready:
npx playwright install chromium
npm run test:e2e
npm run test:security
```

Integration tests use an isolated `prisma/local/integration.db`, apply migrations and original seed data, and restore the intended Prisma client afterward. Never point these tests at a personal or production database. Auth context is mocked only for handler integration tests; Playwright exercises real Auth.js login and cookies against the app. Browser tests create clearly labeled test learners and one published test lesson in the local development database. Run against disposable development data, not production.

Unit coverage includes answer grading, seed validity, scheduler, timezone/DST streaks, role helpers, original stroke geometry, provider errors, and CSRF origin handling. Integration coverage includes signup/hashing, resumable state, incomplete/ordered attempts, duplicate attempt ownership, concurrent XP completion, review conflicts and immutable versions. Browser coverage and exact final counts are recorded in `docs/VERIFICATION.md`. Screenshots contain test accounts only.

## Deployment checklist and remaining work

Use HTTPS, rotate all fixture secrets/passwords, configure the canonical `AUTH_URL`, disable fixture seeding, review trusted proxy/host headers and request body limits, and apply PostgreSQL migrations before serving traffic. Test backups/restores, monitoring, retention/deletion behavior and provider contracts. The Compose runner retains migration/seed dev tooling; split deployment migration jobs and prune runtime dependencies for a hardened production image.

Security implementation includes bcrypt, Auth.js session cookies/CSRF, same-origin mutations, Zod, server role/ownership checks, idempotent transactions, audit logs and database-backed rate limits. It is not a penetration test. Rate-limit rows need cleanup; global registration limiting can be denial-of-service sensitive, and a trusted reverse proxy must supply validated client IPs. Existing JWT sessions survive password changes until expiry; a revocation/session-version scheme remains backlog. Email ownership is not verified. Chinese-language experts must review all curriculum examples and explanations.

See `docs/COVERAGE.md` for all 31 specification sections and honest gaps, `docs/ARCHITECTURE.md` for design decisions, and `docs/VERIFICATION.md` for measured results. No remote push, publication, production changes or paid services were performed.
