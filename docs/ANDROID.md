# HanyuFlow Android — offline first

The user's latest delivery target is an installable Android APK. Accounts and AI conversation are deferred. Pre-generated neural Mandarin audio is included offline. The Android app opens in device mode and offers **Mulai langsung / Start now**; personalization is optional. No laptop URL, login, API key, hosted backend or subscription is required to learn.

## Install and use

Download `HanyuFlow-Android-debug.apk` to your Android phone, open it, and allow installation from the downloading app when Android asks. The APK declares Android 8.0/API 26 minimum and targets API 36. Use an updated Android System WebView. Compatibility has been checked by native API lint and APK metadata; the tested emulator version and physical-device limits are recorded in ANDROID_VERIFICATION.md.

This is a development/debug-signed APK for local use, not a Google Play release. It uses the laptop's existing Android debug keystore. No new signing key was created and no private key is packaged or uploaded. This update increments the version to 0.4.1-android / code 4, retaining SQLite schema 2 (v3 originally migrated 1 to 2). Install it over v1, v2 or v3 with the same signer; do not uninstall or clear data. Future updates must use the same signing certificate to retain app-private data. A production release key requires explicit approval and a separate release process.

Tap **Mulai langsung**, then **Lanjut belajar**. The main path now contains four sound-foundation modules and six practical goals, with 60 varied tasks, 12 two-turn exchanges and three mixed forms of 10 items. The 30 v2 lessons (210 template exercises) remain under **Latihan tambahan asli v2 / Additional original v2 practice**. There are 82 vocabulary entries and ten legacy grammar patterns. Lesson answers are graded by Android Java code from the bundled curriculum, and attempts/progress/review schedules are stored in app-private SQLite. A wrong answer remains in first-try accuracy even after a successful retry. Duplicate completion does not award points twice.

The points are explicitly labeled **device practice points**, not server-verified XP. They are not uploaded or promoted to server XP. The APK is a usable offline learning client, not a wrapper dependent on laptop `127.0.0.1`.

## Features available without an account

- Immediate start, optional local profile/personalization, Indonesian/English, dark/system theme.
- Four foundations: pinyin syllables/tone marks, four tones/neutral tone, sound contrasts and connected tone changes.
- Six practical goals: introduce yourself, request repetition, order a drink, ask/understand price, ask/understand location and make a simple time plan.
- Recognition, hidden-script listening, dialogue response, ordering and typed recall. Tone-number spelling and declared valid word-order alternatives are accepted; tone marks remain meaningful.
- Separate recognition/listening/application evidence from the first completed guided run, with provisional phonetic examples excluded.
- Three mixed forms, each with five listening and five recall items. Retention needs at least 80% unhinted first-attempt evidence twice, on different fresh forms at least 24 hours apart and on a later profile-calendar day. Reused forms remain practice only.
- Actual-mistake practice, due tomorrow after a correct response or in ten minutes after an incorrect one; no repeat points.
- Existing ten units and 30 template lessons remain playable with their old progress and new repeat access.
- Hints, explanations, retries, actual first-try accuracy, process-restart resume and idempotent local points.
- SQLite vocabulary reviews with Again/Hard/Good/Easy and the documented SM-2-inspired intervals.
- Local dashboard, progress, streak, vocabulary search/favorites, grammar and four original Hanzi stroke guides.
- 200 bundled neural AI-generated Mandarin clips, native normal/0.65x playback, no Android voice pack needed. See OFFLINE_AUDIO.md for model/voice provenance and regeneration.
- Original blue Pinyin raster mascot, airy zigzag lesson path, raised controls, illustrated answer cards, success/retry sheets and reduced-motion support.
- Opt-in Android microphone recording, local replay/slow replay/deletion, maximum 60 seconds. No audio is uploaded in device mode.
- Device-data export using Android's file picker and confirmed deletion of local learning data.

Original curriculum is a draft awaiting human linguistic review. It has no official HSK accreditation or validated readiness estimate. Stroke feedback compares original geometric guides; it is not handwriting recognition. Recording/replay records attempted self-check only and does not assess pronunciation. Generated tone/contrast examples are labelled provisional and excluded from skill evidence. Existing SRS repetition is labelled repeated review, never mastery. The finite forms and later-level gaps are visible in the app. Some detailed new feedback explanations are primarily Indonesian; a complete English editorial pass remains pending.

## Architecture and privacy

The Android application uses Java native SQLite/MediaPlayer/MediaRecorder with a bundled React UI loaded through AndroidX WebViewAssetLoader. Assets load at the app-owned virtual HTTPS origin `appassets.androidplatform.net`; that address does not contact a web server. This follows Android's documented in-app content pattern: https://developer.android.com/develop/ui/views/layout/webapps/load-local-content

The native bridge is exposed only to bundled device-mode content. External resources are blocked there. Optional backend mode creates a separate WebView with the device bridge removed. HTTPS errors are never bypassed and cleartext HTTP is disabled. Microphone access is requested only after a user action; remote WebView requests are limited to audio capture from the configured backend origin. AndroidX back dispatch supports current back behavior. App-private automatic cloud/device-transfer backups are excluded; users can explicitly export data instead.

Uninstalling clears local SQLite data. Export first if it matters. Native recordings are app-private cache files and can be deleted in the speaking screen. AI/STT, billing, background reminders, server accounts and cloud synchronization are deferred and not required by this delivery.

## Optional future backend

The retained backend setting is optional. For server login, server-verified XP, AI or CMS later, supply a compatible reachable **HTTPS origin** with a trusted certificate. A successful `/api/capabilities` check is required before the app opens online mode. `localhost`, `127.0.0.1`, invalid schemes and embedded credentials are rejected; these would point to the phone rather than the laptop or violate the connection policy.

No backend is configured by default, no laptop service is exposed publicly, and no hosting/deployment was performed. Server-mode operation on a physical phone remains unverified because no reachable HTTPS backend was authorized/configured. Local points and online account XP remain independent; there is no pretend synchronization.

## Rebuild

Requires Node/npm, JDK 17+ (tested with Android Studio JBR 21), Android SDK/platform/build tools 36 and an existing debug keystore.

```sh
npm ci
npm run android:assets
# Windows:
android\gradlew.bat -p android assembleDebug testDebugUnitTest lintDebug
# macOS/Linux:
./android/gradlew -p android assembleDebug testDebugUnitTest lintDebug
```

Set `ANDROID_HOME` or an untracked `android/local.properties` SDK path. On Windows, escape the drive colon in the property, for example `sdk.dir=C\:/Users/NAME/AppData/Local/Android/Sdk`. The Gradle build uses `HANYUFLOW_DEBUG_KEYSTORE` when supplied, otherwise the existing `~/.android/debug.keystore`. It fails if that key does not exist instead of creating a persistent signing credential without approval.

APK output: `android/app/build/outputs/apk/debug/app-debug.apk`. Java source is in `android/app/src/main/java`; UI source in `android/web`; shared original curriculum in `src/lib/content.ts`. Run the asset build after changing UI/content. Generated bundles contain curriculum, the original Pinyin image and pre-generated audio, never `.env`, neural model files or server credentials.

Native instrumentation tests require a disposable emulator: `android/gradlew -p android connectedDebugAndroidTest`. The device UI script `node android/tests/device-flow.mjs` selects `emulator-5556` by default, clears only this app's data and toggles that emulator's network for the offline test. It never silently selects a physical phone. Set `HANYUFLOW_ANDROID_SERIAL` deliberately when using a different disposable emulator.

For the verified version-1 → version-2 persistence test, `android/tests/upgrade-baseline.mjs` captures a populated old APK, then install the new APK with `adb install -r` and run `android/tests/upgrade-offline.mjs`. That script never clears data. It proves exact state retention before testing the new UI, all120 offline native audio clips, normal/slow controls and reduced motion. Run destructive SQLite instrumentation only on a disposable emulator; `LocalStoreTest` clears its app data.

The final v2 screenshots in `screenshots/android-v2/` are native Android framebuffer captures. Original v1 verification is archived in ANDROID_VERIFICATION_V1.md. The v2 audio/UI flow completed across a main run and bounded continuation after a test apostrophe mismatch; all120 native audio results and prior exact upgrade evidence are retained in android-v2-device-results.json.

## v3 evidence and remaining scope

See [v3 verification](ANDROID_VERIFICATION.md) and [scope audit](V3_SCOPE.md). The new UI/native harness is `node android/tests/v3-device.mjs baseline`, then install v3 over a populated v2 APK with `adb install -r`, then run `node android/tests/v3-device.mjs flow` and `node android/tests/v3-device.mjs audio`. The baseline mode saves exact v2 state; the flow does not clear it. Test fixtures answer through native grading and are explicitly separated from the UI-covered tasks. Native instrumentation tests an injected clock for the positive next-day retention case; the production bridge has no clock override.

Current source includes the retained web backend; this release changes Android only. v1/v2 scripts and reports are historical evidence, not commands for the new Academy UI. Later levels, wider/longer dialogue and reading/writing, qualified linguistic/acoustic review, extra fresh forms, physical-device testing, live AI and assessed pronunciation remain unfinished. No claim of learning all Mandarin or completing HSK1-6 is made.

Latest correction: [0.4.1 patch evidence](CORRECTIVE_PATCH.md). Follow-up forms must be opened after the delay; postponing Finish on an early-exposed form cannot confirm retention. Existing data are retained, and invalid old badges are recalculated from their original timestamps.
