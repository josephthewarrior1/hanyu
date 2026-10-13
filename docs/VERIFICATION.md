# Verification evidence

Implementation host: Windows, Node.js 20.20.2. Verification date: 2026-10-12. Installed/locked runtime versions include Next.js 16.4.0, React 19.3.0, Auth.js/next-auth 5.0.0-beta.30 and Prisma 6.19.0. Reproduce with `npm ci` and the README commands.

## Executed checks

| Command | Verified result |
| --- | --- |
| `npx prisma validate` | PostgreSQL schema valid |
| `node scripts/prepare-migrations.mjs` | PostgreSQL and SQLite initial migration SQL generated |
| `npm run setup:local` | SQLite migration applied; original 10 units / 30 lessons / 60 words seeded |
| `npm run typecheck` | Passed, no TypeScript errors |
| `npm run lint` | Passed, no warnings/errors in final source |
| `npm test` | 27 unit tests passed across two files |
| `npm run test:integration` | 12 isolated SQLite integration tests passed |
| `npm run build` | Optimized production build passed; static public pages and dynamic protected/API routes produced |
| `npm start` | Standalone server starts on loopback at http://127.0.0.1:3000 |
| `npm run test:e2e` | All 5 Chromium end-to-end tests passed against the final standalone build (21.3 seconds) |
| `npm run test:security` | Real HTTP checks passed: invalid JWT session → 401; foreign/absent mutation Origin → 403 |

The final result is 27 unit + 12 database integration + 5 browser tests passing, plus three real HTTP security smoke checks. There is no coverage-percentage claim; these are actual test counts, not complete specification coverage.

## Browser evidence

Chromium was installed from the official Playwright distribution. All five final tests passed against the production standalone build. They verified:

1. Real signup and Auth.js login → saved onboarding and reload → optional scored quiz → lesson. An intentional wrong first attempt was retried; completion honestly reported 86% first-try accuracy and 37 XP. Duplicate completion did not award XP again. Reload preserved progress. One vocabulary review produced 2 XP and changed the due queue from two cards to one.
2. Responsive dashboard layouts at 360, 390, 768, 1024 and 1440 px without horizontal overflow; real vocabulary search; grammar detail; explicit vocabulary offline saving and offline reload via the service worker.
3. Student access to administrator APIs was denied; unconfigured AI and pronunciation states were explicit; microphone denial was simulated and displayed; missing mutation Origin and invalid timezone were rejected.
4. An administrator created a validated draft and published it through the actual CMS. A separately authenticated student accessed and completed this published lesson, earning 40 server-verified XP.
5. Dark mode persisted after reload; the actual account JSON export contained owned history and excluded password hashes; pointer strokes were drawn, checked against the original geometric guide and saved through the API. Progress reported one saved writing session.

Screenshots are in `screenshots/`; all accounts in them are test fixtures. Full-page mobile captures show the fixed bottom navigation at the viewport boundary, as expected for browser full-page capture.

## Issues discovered and corrected

- Initial schema/client setup needed the allowed Windows execution context to access installed dependencies.
- Seed authoring and CMS JSON-import syntax errors were corrected before passing checks.
- Browser testing found that `127.0.0.1` mutation origins were rejected after Next.js canonicalized the request URL. Origin checks now use the actual Host too; cross-origin and absent-origin rejection remain tested.
- Screenshot inspection found technical vocabulary IDs in distractor choices. All choice/matching option vocabulary is now fetched once and localized; the integration suite checks translated distractors and confirms grading answers are absent from the pre-attempt response.
- Roadmap rendering now keeps a student's pinned content version/progress after a new version is published.
- The expanded writing test found a React pointer-event lifetime crash. Pointer coordinates are now captured synchronously before state updaters run; the final browser suite verifies actual drawing and persistence.
- Rebuilding on Windows while the standalone server held Prisma's DLL initially failed with EPERM. Stopping only the verified local test server released the file; the subsequent production build passed. Stop the app before rebuilding on Windows.

## Unverified or unavailable

- Docker executable exists, but the Docker daemon is unavailable. No container build, live PostgreSQL migration or PostgreSQL transaction behavior was tested. SQLite execution is verified; PostgreSQL schema/SQL validation is not equivalent to deployment verification.
- Chromium's actual speech synthesis inventory contained **no Mandarin voices** (`screenshots/audio-capability.json`). The browser test verified the explicit unavailable message. Successful Mandarin playback and native speaker quality were not verified. Install/enable a Mandarin device voice or later provide properly licensed audio assets.
- No external AI/STT, email, push, billing, Google or S3 credentials were provided. AI timeout/malformed-response behavior was tested with clearly identified mocks; no successful live provider operation is claimed. Genuine pronunciation scoring is unavailable.
- Actual microphone hardware recording, push permission/delivery, mobile Safari/WebKit, Firefox, offline progress synchronization, full screen-reader testing, load tests and production security/legal/linguistic review remain unverified or backlog. See COVERAGE.md.

No remote push, public deployment, external account creation, credential purchase or production change was performed.
