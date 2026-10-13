# Android 0.3.0 verification · 2026-10-12 UTC

Installable offline APK: package `com.hanyuflow.android`, version **0.3.0-android / code 2**, minimum API 26 and target/compile API 36. Accounts and AI conversation are deferred. Speech is pre-generated neural Mandarin audio, not a live AI or pronunciation assessor.

## Actual results

- APK build/install succeeded. The existing Android Debug signer was reused. APK Signature Scheme v2 verification passed; certificate SHA-256: `6670d93c8556b701b6d7f38eeeab82dce13943f4bb3ffdebb8a6de28eb22420a`. No private signing key or new credential is exported.
- **11 Android checks passed**, with **zero captured JavaScript errors**. Exact evidence: `android-v2-device-results.json`.
- **120/120 clips decoded with Android MediaPlayer**, and all120 subsequently reached actual native playing/completion events with Wi-Fi and mobile data disabled. Every clip had a positive decoded duration and measured elapsed playback. Longer clips additionally reported advancing position. Nine short clips reported position 0 on this virtual sink; genuine events/duration/time were used instead of inventing an offset.
- Visible normal and **0.65×** controls started native playback. Slow mode retained pitch 1.0. The UI indicator handles Java float rounding. No installed Mandarin system voice was required.
- **Exact v1 → v2 SQLite state retention** was verified: profile, theme, favorites, attempts, unfinished cursor, completed lesson, reviews, 39 local points and writing. Database schema remains version 1.
- All seven existing native-graded exercise types worked in the updated UI. One intentional wrong first answer followed by correction produced **86% first-try accuracy and 37 additional local points**. Total points became 76. Duplicate completion did not award points again; offline restart retained old and new progress.
- Android Back returned to the previous screen. Reduced motion disabled mascot/feedback/transition animations. The actual generated Pinyin PNG loaded beside raised path nodes.
- Native framebuffer screenshots were visually inspected for the roadmap, selected answer, success sheet and dialogue. A Check-button overflow found during QA was corrected and rechecked. Final viewport measured left margin 20 px and right edge 391.43 px in a 411 px viewport. The layout-only rebuild retained 76 points. Screenshots: `screenshots/android-v2/`.
- TypeScript and ESLint passed. Retained earlier checks passed **27 Vitest tests**, **10 Android Java unit tests**, **6 Android SQLite instrumentation tests**, and the separate decoder instrumentation test covering all120 clips. Android lint: **0 errors, 1 warning** about a newer Gradle release. Native grading/audio code and encoded clips were unchanged by the final layout-only rebuild. The retained Next.js source also built successfully.

## Environment and continuation

Windows, Android Studio JBR Java 21, SDK/build tools 36, Gradle 9.1.0 and AGP 9.0.1. Checks used a separate **read-only, no-snapshot, no-window, no-audio** Pixel 8 emulator on port 5556, reporting Android 17/API 37 x86_64. Saved AVD and physical-phone data were not modified.

Connection loss ended temporary emulator sessions. Exact upgrade evidence was retained; a native-graded disposable fixture was recreated only for remaining UI/audio checks. The successful flow spans the main run, `finish-v2-ui.mjs` after correcting a test apostrophe matcher, and `verify-v2-layout.mjs` for the final layout. No score, position or completed test was fabricated. `ANDROID_VERIFICATION_V1.md` archives the earlier v1 result and installed-voice limitation that this update removes.

## Limits

No physical phone or acoustic speaker/microphone quality test was available. Codec/playback evidence does not establish pronunciation quality; original curriculum and generated speech await a qualified Mandarin review. No official HSK accreditation, pronunciation score or handwriting recognition is claimed. Every Android 8–16/OEM WebView combination remains unverified; keep Android System WebView updated.

This remains a debug APK for local use. No store release, hosting, public deployment, paid service or external account was created. AI conversation/transcription, pronunciation assessment, cloud accounts and billing remain unconfigured/deferred. The Android document-picker export UI was not completed by UI automation; export data itself was verified in the SQLite suite. Keystores, private credentials, `.env`, local databases, SDK installation/configuration files, caches and neural model/runtime are excluded from the archive.

Provenance, generator instructions and licenses: `OFFLINE_AUDIO.md`. The APK carries120 clips (about1.07 MB) and the original imagegen Pinyin asset, not the 326 MB neural model.
