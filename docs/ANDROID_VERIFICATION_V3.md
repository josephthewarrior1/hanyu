# Android v3 / 0.4.0 verification - 2026-10-13 UTC

Package `com.hanyuflow.android`, version **0.4.0-android / code 3**, minimum API 26 and target/compile API 36. Offline local use, existing debug signer, no login or live AI required. The retained web backend was not changed by this release.

## Delivered learning scope

Four sound-foundation modules and six practical goals, six varied activities each (60), 12 two-turn dialogue variants, three mixed forms of ten items (30), 22 added functional vocabulary entries (82 total), and 200 bundled generated Mandarin clips. The original 30 v2 template lessons/210 activities remain accessible with their historical progress and repeat access. This is an original beginner draft, not a complete Mandarin/HSK course.

Recognition, listening meaning and application use unhinted first attempts from the first completed guided run per module. Twelve provisional phonetic audio tasks are excluded from these scores. SRS repetition is labelled repeated review. A recording is an attempted self-check only; no pronunciation is assessed.

## Actual checks

- Build/install and APK Signature Scheme v2 verification passed. Certificate SHA-256 remains `6670d93c8556b701b6d7f38eeeab82dce13943f4bb3ffdebb8a6de28eb22420a`. No new key, private keystore or credential was created/exported.
- TypeScript and ESLint passed. **32 Vitest**, **14 Java unit** and **14 Android instrumentation tests** passed. Instrumentation includes seven new ProgramStore real-SQLite tests, six retained LocalStore tests and one decoder test covering all **200 clips**. Raw native result: `android-v3-native-test-output.txt` (`OK (14 tests)`, 18.785 seconds). Android lint has zero errors and one version-update warning.
- **11 native device-flow/layout checks passed**, with zero captured JavaScript errors. Detailed evidence, actual native durations/elapsed times and test-fixture states are in `android-v3-device-results.json`.
- Exact populated **v2 to v3 SQLite retention** passed through `adb install -r`: local profile, favorites, old attempts, unfinished cursor, completed lesson, reviews, 39 device points and writing all remain equal. Database migration 1 to 2 only adds tables/backfills the actual-mistake queue; old progress does not backfill new skill/mastery scores. Baseline: `android-v3-upgrade-before.json`.
- Real UI: wrong first answer and retry, persisted hint, tone-number typed recall, ordering, interrupted-process resume, hidden-script listening, stopped/failed audio not auto-graded, correct feedback and completion. A real wrong-first/hinted module produced **83% first attempt / 67% unhinted / 37 new local points**. Duplicate completion and later repeats award zero additional points and do not overwrite skill evidence.
- Real UI: two-turn self-introduction variants and all six practical tasks; actual old/new mistake practice with tomorrow's due date and zero practice points.
- Microphone denial leaves all learning accessible and records no speaking attempt. After emulator permission grant, actual MediaRecorder start/stop produces a duration-tagged local attempt. UI invokes native replay, saves optional personal impression and deletes the audio. No acoustic microphone/speaker quality or pronunciation judgement is claimed.
- Remaining eight modules and two mixed forms are an **explicit native-graded test fixture**, not claimed UI coverage of every activity. All 60 guided task answers reach native grading. Three assisted check answers produce 100% raw but 70% unhinted and fail. A different fresh 100% form still does not establish retention; an immediate third fresh form is blocked. No fixture assigns points or mastery directly.
- Positive delayed retention is verified with an injected test clock in native tests: different fresh form, at least 24 hours, later profile-calendar day. The production bridge has no clock override. No real learner or actual 24-hour study experiment was tested.
- All **80 new clips** additionally reach real native playing/completion with Wi-Fi/mobile data disabled, positive decoded duration and measured elapsed playback. Clips >=750 ms also show advancing position. Short clips can report zero position on this virtual audio sink. The existing 120 had the same playback verification in v2; all 200 have current decoder coverage. These checks do not validate linguistic/acoustic accuracy.
- Offline process restart retains all program runs, help usage, mistake due dates, points and recording attempts. The final layout-only APK upgrade retains 436 test-fixture points. Native framebuffer screenshots were visually inspected; self-check buttons fit the mobile viewport after correcting the generic notice flex layout. Screenshots contain disposable emulator test fixtures, never a user's achieved proficiency.

## Environment and reproducibility

Windows, Android Studio JBR Java 21, SDK/build tools 36, Gradle 9.1.0, AGP 9.0.1. Separate read-only, no-snapshot/no-window/no-audio Pixel 8 emulator, serial **emulator-5556**, Android 17/API 37 x86_64. No saved AVD or physical phone data was touched.

`android/tests/v3-device.mjs baseline` saves the populated v2 snapshot; install v3 without clearing data; `flow` runs UI/native checks; `audio` checks the 80 new clips. `v3-layout.mjs` verifies the final layout rebuild. Historical v1/v2 reports and scripts remain archived. Use instrumentation only on a disposable test emulator, as retained LocalStore tests clear that app's data.

## Remaining limits

This is a debug APK for local use, not a store release or production-readiness claim. No physical phone/OEM/older Android matrix or acoustic test was available. Original curriculum and generated speech await qualified human linguistic/acoustic review; tone/contrast clips are labelled provisional. English menus/prompts/notes are present, but some detailed new feedback explanations remain primarily Indonesian and need an English editorial pass.

Only three fresh forms are supplied; reused/abandoned forms cannot earn new evidence. Later levels, longer dialogue/listening, wider vocabulary and reading/writing, expanded fresh forms and human speaking assessment remain unfinished and visible as unavailable. The app does not promise learning all Mandarin, HSK1-6, CEFR alignment or guaranteed fluency.

Live AI conversation/STT, genuine pronunciation scoring, server accounts/cloud sync, billing and email remain deferred/unconfigured. Geometric writing guides are not handwriting recognition. Android document-picker export was not driven to a saved document in UI automation; actual native export contents are tested. No hosting, publication, remote push, paid service or new account was performed. Source excludes private keys, `.env`, local databases, SDK configuration, caches and the neural model/runtime.

See `V3_SCOPE.md`, `ANDROID.md`, `OFFLINE_AUDIO.md` and prior `ANDROID_VERIFICATION_V2.md` for scope, setup, audio provenance and historical evidence.
