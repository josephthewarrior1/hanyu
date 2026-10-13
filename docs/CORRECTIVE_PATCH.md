# Android 0.4.1 corrective patch - 2026-10-13 UTC

Package `com.hanyuflow.android`, version code **4**, same debug signer and SQLite schema **2**. This is a narrow correctness release; learning scope remains 10 guided modules, 30 legacy lessons, 82 entries and 200 generated clips. No new expert/intermediate level is claimed.

## Corrected behavior

`check-3:3` now accepts the existing dictionary-tone number spelling `qing3 shuo1 man4 yi1 dian3 r`, consistently with guided `use-2:3`. Existing alternatives remain accepted; an incorrect `qing2` tone remains rejected. Bundled `program.json` was regenerated and the new alternative is verified inside the actual APK.

Delayed retention compares an earlier passing form's completion with the different follow-up form's **started_at**, requiring at least 24 hours and a later profile-calendar day; follow-up completion must not precede its start. Opening/answering a form early and delaying Finish no longer confirms retention. Early forms remain resumable/repeatable practice. The UI explains this rule explicitly.

No database migration, history reset or silent regrading occurs. Run IDs, cursor, attempts, first-attempt accuracy, help usage, due schedules and points remain unchanged. Existing false badges are recomputed from historical timestamps on read. Previously rejected stored pinyin attempts keep their original result rather than fabricating a new first attempt.

## Actual verification

Both defects were reproduced before applying the correction: the new actual Vitest regression fails against old content; the focused native Android SQLite regression fails against the released v3 APK at its false retention assertion. The minimal proposal was inspected and reconciled with current source, not blindly copied.

- TypeScript, ESLint, APK build and Android lint passed (zero lint errors, one pinned-version update warning).
- **33 Vitest tests, 15 Java unit tests and 17 Android instrumentation tests passed**. Native tests retain the normal eligible delayed-pass case and cover preanswered/early-opened resume, no-answer early exposure, clock sanity, preserving attempts, actual bundled pinyin acceptance and wrong-tone rejection. Native suite also decodes all 200 clips. Result: `android-correction-native-test-output.txt`, `OK (17 tests)` in 30.269 seconds.
- **Five actual device upgrade/UI checks passed**, with zero captured JavaScript errors; `android-correction-device-results.json` records the evidence.
- A populated released-v3 fixture reproduced the false badge through real UI. The fixture used genuine native grading for original/guided/check answers; only its run/attempt timestamps were explicitly adjusted to model an earlier day. It is not an actual 24-hour learner experiment, and no score/mastery flag was assigned in SQLite.
- Install v3 to code 4 with `adb install -r`, without clearing data: every SQLite table, column, row and schema version matched exactly. Profile, favorites, old attempts/unfinished cursor, reviews, writing, new run history and **439 test-fixture points** were retained. The invalid computed badge became false.
- Real offline mixed-check UI then accepted the newly supported pinyin, maintained hidden-script audio gating, and confirmed scoped retention only for the new unseen form opened after the required delay. Check completion awarded zero points. Restart retained the result, and the earlier form remained repeatable with its original completed history intact.
- APK Signature Scheme v2 verified with the unchanged certificate SHA-256 `6670d93c8556b701b6d7f38eeeab82dce13943f4bb3ffdebb8a6de28eb22420a`. No key was created or exported. All 200 audio files and the original Pinyin mascot are byte-identical to delivered v3.

Native framebuffer screenshots in `screenshots/android-correction/` were visually inspected. They show disposable emulator fixtures, not a user's acquired proficiency.

## Reproduce / limits

Use only a disposable isolated emulator. `correction-upgrade.mjs seed/capture/verify` uses real native grading and UI. `correction-fixture.py` restricts its local database path to the task's LibraryPatch directory and adjusts timestamps or emits exact SQL snapshots. The production native bridge has no test-clock override. Instrumentation's injected clock also proves the positive/negative delay boundaries. Historical v3 evidence is retained in `ANDROID_VERIFICATION_V3.md`.

Environment: Windows, JBR Java 21, SDK 36, Gradle 9.1.0/AGP 9.0.1; separate read-only/no-snapshot/no-window/no-audio Pixel 8 emulator, serial emulator-5556, API 37. No saved AVD or physical-phone data was touched. No hosting, external account, paid service or public release occurred.

Human linguistic/acoustic review, physical-phone/OEM testing, later curriculum levels, complete English feedback editing, live AI/STT/cloud sync/billing and genuine pronunciation assessment remain absent. Tone/contrast examples remain provisional and excluded from skill evidence. This is a local debug APK with a bounded product criterion, not fluency or HSK/CEFR certification. Source archives exclude keys, actual environment files, local databases, SDK configuration, caches and the neural runtime/model.
