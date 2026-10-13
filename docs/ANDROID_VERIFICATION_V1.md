# Android verification — 2026-10-12

Delivery target: installable, immediately usable offline APK. Accounts and AI are deferred by the user's latest instruction.

## Actual results

- `assembleDebug`: successful. APK installed successfully on the isolated emulator.
- `testDebugUnitTest`: **8 Android Java unit tests passed** (grading, tones, ordering/matching, scheduler, streak/timezone and backend-origin policy).
- AndroidJUnit instrumentation: **6 tests passed on Android SQLite**, covering bundled 30/60 content counts, profile persistence, genuine accuracy/idempotent points, incomplete attempts, review conflicts and writing/export records.
- Android lint: **0 errors, 1 warning**. The warning reports a newer Gradle release; Gradle 9.1.0/AGP 9.0.1 are intentionally pinned. Deprecation notices from compatible framework APIs remain.
- Android UI/native flow: **13 checks verified** using the installed APK and actual Android WebView/native bridge. See `android-device-results.json` for exact checks and captured capabilities.
- TypeScript and ESLint checks passed for the Android client. Generated assets are excluded from source linting.
- `apksigner verify`: successful APK Signature Scheme v2 verification. The signer is the existing Android Debug certificate; no new signing credential was created.
- Manifest metadata: package `com.hanyuflow.android`, version `0.2.0-android` / code 1, minimum SDK 26, target/compile SDK 36. No packaged native ABI library is required; Java/UI use Android System WebView.

## Test environment and demonstrated behavior

Windows host, Android Studio JBR Java 21.0.10, SDK/build tools 36, Gradle 9.1.0 and AGP 9.0.1. Testing used the existing Pixel 8 emulator in **read-only, no-snapshot, no-window** mode on port 5556. Its installed system image reported **Android 17/API 37, x86_64**. Existing saved emulator data was not modified.

The APK's first launch allowed **Mulai langsung** without an account or AI setup. Local name/language/timezone changes survived process termination. A real lesson was answered through the UI across all seven exercise types. One intentional wrong first attempt produced **86%** first-try accuracy and **37 local practice points**, even after the retry was correct. Duplicate completion left points unchanged. One Good review produced two points and updated the due queue. A writing session was drawn and persisted.

Actual Android Back navigation returned to the previous screen. The real OS microphone dialog was denied and the app showed a denial message. The test then granted this app's microphone permission on the emulator and exercised native record/stop/replay/delete. This proves the code/permission flow and a virtual audio file; it does not prove physical-phone microphone or speaker quality.

Wi-Fi and mobile data were disabled before force-stopping and reopening the APK. The app loaded its bundled lessons and retained **39 points, one completed lesson, one writing session and dark theme**. These are device-local records; `serverVerified` remained false. No laptop or hosted backend was used by this learning flow.

The 13 checks were completed across the main run and bounded continuation after test-harness issues were corrected (timezone selector, Android key injection, unavailable optional automation driver and continuation variable scope). No Android UI JavaScript errors were reported in the captured checks. The remaining permission interaction used Android's actual UI hierarchy and ADB input; no mocked permission result or invented score was used.

## Honest limits

- The emulator's native TTS capability reported **no installed offline Mandarin voice**. The explicit unavailable message was verified. Successful spoken Mandarin playback requires an installed offline Mandarin voice on the user's phone and was not acoustically verified here.
- No physical phone is connected. Actual physical-device installation, Android 8–16 runtime combinations, OEM WebViews, accessibility tools and acoustic quality remain unverified. API lint and min-SDK metadata are compatibility checks, not a guarantee for every device. Use an updated Android System WebView.
- Android's document-picker export UI was wired but not completed in the UI automation; actual export data was checked in the SQLite instrumentation suite.
- No reachable HTTPS backend was configured or deployed. Online login/cloud XP/AI/CMS and sync are outside this immediate offline delivery. Phone-local `127.0.0.1` backend configuration was explicitly rejected.
- The APK is debug signed, not a store-ready release. A new persistent release key requires approval. Private signing keys, `.env`, local databases, caches and SDK paths are excluded from the source archive.
- Original curriculum awaits human linguistic review; no official HSK accreditation, pronunciation accuracy or handwriting recognition is claimed.
