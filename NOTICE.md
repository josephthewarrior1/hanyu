# Assets and third-party notices

Original HanyuFlow code is covered by the root MIT license. Separately licensed data/assets retain their own terms; the root MIT license does not relabel them.

The twelve Hanzi JSON files in `android/handwriting/vendor/` are unmodified selections from Hanzi Writer Data2.0.1, commit `68d10a4b21150cae5e1ebbd223eed289cf32d90c`. That project derives its graphics from Make Me A Hanzi and Arphic fonts. Copyright (C)1999 Arphic Technology Co., Ltd. Data redistribution/modification follows the Arphic Public License, retained verbatim in `ARPHICPL.TXT`; there is no warranty. Selection/date/source hashes are in `android/handwriting/manifest.json`. The complete selected data are supplied here under those terms. No official endorsement or human review of this app is claimed. See [Hanzi Writer Data licensing](https://github.com/chanind/hanzi-writer-data#license).

Bundled Mandarin clips are generated neural speech with provenance in `docs/OFFLINE_AUDIO.md` and `android/audio/`. Kokoro/sherpa-onnx generator source licenses are retained in `android/audio/licenses/`. Generated outputs are not automatically called Apache-licensed or exclusively copyrighted because the generator is Apache-licensed. Model weights and runtime are not included.

Pinyin the blue dumpling dragon is an original imagegen asset, not another app's mascot. The old four numeric geometric stroke guides in `src/lib/strokes.ts` are original CC0 examples and do not claim handwriting recognition. New approximate checking app code is separate from the Arphic-derived graphic data.

Dependencies, including React, Lucide, Next.js and the Gradle wrapper, retain their respective licenses. Package versions are locked; compiled UI retains bundler legal comments. Consult dependency distributions for their complete notices.
