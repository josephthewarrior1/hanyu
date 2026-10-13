# Bundled Mandarin audio · Android 0.4.0

All 200 distinct shipped Mandarin utterances are generated once on the developer's CPU and packaged inside the APK. Installation needs no voice pack, key, account or network. This is pre-generated neural speech, not live AI conversation or a pronunciation assessor.

## Provenance

- Model: **Kokoro-82M-v1.1-zh**, official author [hexgrad model card](https://huggingface.co/hexgrad/Kokoro-82M-v1.1-zh).
- ONNX distribution: **kokoro-multi-lang-v1_1**, downloaded from the official [sherpa-onnx release](https://github.com/k2-fsa/sherpa-onnx/releases/download/tts-models/kokoro-multi-lang-v1_1.tar.bz2).
- Runtime: **sherpa-onnx 1.13.8**, CPU, two threads. [Official configuration and speaker mapping](https://k2-fsa.github.io/sherpa/onnx/tts/all/Chinese-English/kokoro-multi-lang-v1_1.html).
- Voice: **zf_001**, speaker ID **3**, Mandarin female. Generation speed **1.0**, 24 kHz mono PCM source; AAC 64 kbps/M4A delivery.
- Model checksum and each delivered clip's SHA-256, duration, sample rate and size are in `android/app/src/main/assets/audio/manifest.json`. Measurement report is in `android/audio/generation-report.json`.
- Mandarin Hanzi only is sent to the model, never romanized pinyin. The 200 clips cover 82 vocabulary entries, original lesson/grammar examples, new foundation and practical exchanges, all listening controls and guided speaking phrases. 80 new clips extend the 120 v2 clips. Generated phonetic/tone samples are provisional and excluded from mastery evidence. Dialogue controls play the complete sentence rather than the underscore placeholder.

The model/Chinese voice collection and sherpa-onnx runtime are distributed under Apache 2.0. Their source license is retained in `android/audio/licenses/`; the model card credits LongMaoData for the Chinese voice recordings. This records the generators' licenses and provenance; it does **not** label generated audio as Apache-licensed merely because the model is, or promise exclusive copyright. No commercial API or per-clip charge was used. FFmpeg is a local build tool and is not bundled. Neither the 326 MB neural model, runtime wheels, eSpeak data nor signing secrets are in the APK/source archive.

## Playback

`BundledSpeech` looks up a normalized Mandarin key and plays the local asset using Android `MediaPlayer`. All M4A assets remain uncompressed in the APK for file-descriptor playback. Slow mode uses 0.65× playback speed with pitch 1.0. Normal/slow buttons show native playback events; navigation, recording, app pause and replacement playback stop/release the previous clip. Missing clips and codec failures report an error rather than pretending to play.

## Rebuild

1. Run `npm ci` and `npm run android:audio-texts` in HanyuFlow.
2. In a separate virtual environment install `sherpa-onnx==1.13.8` and `soundfile`; install FFmpeg. Download/extract the official ONNX model above outside the project.
3. Run `python android/audio/generate.py --model <model-directory> --wav-dir <temporary-wav-directory>`.
4. Run `npm run android:assets`, then the documented Gradle build.

The generator rejects empty/non-finite/clipped source waveforms and decodes every encoded M4A for signal checks. It writes deterministic text IDs and hashes; synthesis itself is not guaranteed bit-identical across runtime revisions. Audio coverage is checked during asset bundling and on the Android decoder. The original curriculum and generated pronunciation still await a qualified Mandarin speaker's linguistic review. No human review, native-speaker recording or clinical/objective pronunciation quality claim is made. The automated environment cannot listen acoustically to a phone speaker.

## Pinyin mascot

`android/mascot/pinyin.png` is an original transparent raster image produced by built-in imagegen for this update: a blue dumpling dragon with cream horns and coral scarf. It is not the Duo owl or another brand asset. The same image is animated with gentle breathing, a success bounce and supportive nod; `prefers-reduced-motion` disables these and the confetti/transition effects. Answer-card concept pictures use the device's bundled emoji artwork, mapped to the actual curriculum labels, rather than claiming a new bespoke drawing for every word.
