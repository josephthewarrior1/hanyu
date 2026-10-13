# Specification coverage and backlog

The delivery target was subsequently changed to Android, then narrowed to immediate offline use without account login or AI conversation. Android v3 / 0.4.0 adds four sound foundations, six practical goals, 60 varied tasks, 12 two-turn exchanges, three mixed delayed-retention forms, actual-mistake practice, 22 functional vocabulary entries and 200 bundled generated clips. Thirty legacy lessons and their progress remain available; ANDROID_VERIFICATION.md documents the current APK while the broader matrix below retains the original PWA scope. The installable APK and its real local learning flow are documented in ANDROID.md and ANDROID_VERIFICATION.md. The matrix below retains the broader original specification's scope; its cloud/auth/CMS backlog does not block the current offline Android delivery.

All 31 sections of the five-page attachment were read in full (262 extracted lines). This matrix describes actual implementation, not a promise of complete feature parity.

| Section | Delivered | Remaining / limits |
| --- | --- | --- |
| 01 Mission | Original working local full-stack app | Production hardening and linguistic specialists |
| 02 Execution | End-to-end code, persistence, checks and honest states | Exact verification in VERIFICATION.md |
| 03 Product | ID/EN beginner PWA, responsive layouts | Advanced tracks, official HSK syllabus mapping, Traditional data |
| 04 Design | Calm blue UI, original code illustration, dark mode, focus and reduced motion | Full assistive-tech/contrast audit, richer loading skeletons |
| 05 Stack | Next/TS/Tailwind/PostgreSQL/Prisma/Auth.js/Zod/Docker/Vitest/Playwright | shadcn/Motion/Query omitted as unnecessary; S3 integration absent |
| 06 Auth | Signup/login/logout, bcrypt, roles, profile, password change, export/deletion | Verification/reset email and Google login unavailable; JWT revocation after password change |
| 07 Onboarding | Saved six-step choices, resume, scored optional quiz, actual next lesson/reviews | Adaptive placement beyond a recorded baseline |
| 08 Curriculum | 10 units, 30 lessons, 60 words, grammar/dialogues, versions | Human review is pending; no official HSK alignment |
| 09 Exercises | Seven playable, server-graded types with hints/history/retries | Listening/dictation/tone/timed/grammar-correction/speaking assessment types |
| 10 Player | Resume, progress, feedback, completion, threshold, idempotent XP | Full automatic mistake-only review mode and next-lesson direct CTA |
| 11 AI | Server adapter, scenarios, support modes, history/delete, quotas/errors/usage | No live credentials/test, streaming, provider retries, custom prompt administration |
| 12 Instruction | Patient Mandarin system instruction with corrections and pronunciation honesty | Tune with reviewed examples and provider evaluation |
| 13 Speech | Permission/diagnostics/record/replay, explicit STT upload adapter | No live STT test; genuine pronunciation/syllable/tone scoring unavailable |
| 14 Audio | Android:120 bundled Kokoro Mandarin clips, native normal/0.65x playback and complete dialogue audio; PWA:system TTS | Human linguistic/acoustic review and additional listening exercise types |
| 15 Writing | Four CC0 guides, canvas, trace/free/undo/clear/replay/save, geometric sequence checks | Larger licensed character data, handwriting recognizer, pointer-free drawing access |
| 16 SRS | Documented SM-2-inspired alternative, four ratings, due/lapses/history/conflicts | Actual FSRS, review-model calibration |
| 17 Gamification | XP ledger, timezone streak, achievements, daily lesson mission records, daily XP goal, opt-in leaderboard | Streak freeze, configurable missions, weekly target, advanced leaderboards |
| 18 Dashboard | Actual statistics, roadmap, continue, review, weekly chart, vocabulary/grammar | More speaking prompts and richer linked content |
| 19 Progress | Accuracy, recall rating, elapsed minutes, content progress, settings | Validated HSK readiness and active-time measurement |
| 20 CMS | Draft builder, validation, preview/publish, versions, units/words/grammar, user roles, audit, JSON import/export | CSV/bulk import, visual builder, dialogue/media/scenario/achievement editors, level CRUD and content deletion beyond drafts |
| 21 Schema | All requested concepts represented, constraints/indexes/ownership/cascades | Several future models are schema-only; no PostgreSQL runtime verification |
| 22 APIs | Typed actions, Zod, roles/ownership/origin, pagination/rates, idempotency | Standalone achievement/notification management API, hardened streamed uploads |
| 23 Routes | Public/student/admin routes implemented, unsupported areas labeled | Fully editable content across every CMS subsection |
| 24 Offline/notifications | PWA shell, saved vocabulary reading, open-tab timezone reminders/quiet hours | Selected lesson caching, offline score queue/sync/conflicts, background push/email |
| 25 Subscriptions | Free/Pro role-controlled quota architecture, admin entitlements | Configurable plan catalog, premium lesson gates, billing/webhooks unavailable |
| 26 Security/a11y | Hashes, cookies, CSRF/origin, validation, role/ownership, rates, export/delete, visible focus | Pen test, JWT revocation, production HTTPS/proxy policy, MIME sniffing, retention and legal review |
| 27 Testing | Unit/integration/build/browser flows and five responsive widths | Firefox/WebKit/real mobile, full screen reader/axe audit, PostgreSQL/load tests and bundle budgets |
| 28 Phases | Working vertical slice, then content/reviews/adapters/CMS/writing/PWA | Prioritized subsets explicitly documented |
| 29 Acceptance | Real signup→onboarding→scored lesson→XP→refresh→review; local publishing | Sample TTS depends on installed Mandarin voice; no external service availability claim |
| 30 Deliverables | Source, schemas/migrations, seed, env, Docker, docs, tests, screenshots and archive | Live deployment explicitly not authorized or performed |
| 31 Execution | Inspected empty workspace, isolated project, implemented and tested | No planning-only output |

Suggested next work: linguistic review and licensed audio; real PostgreSQL/Docker deployment rehearsal; accessibility audit; session revocation; full CMS editors and prerequisites builder; remaining exercise types; robust offline lesson queue; configured provider evaluation; background notification delivery; optional billing only after explicit authorization.
