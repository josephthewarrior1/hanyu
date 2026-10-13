"""Rebuild shipped speech locally. Needs sherpa-onnx==1.13.8, soundfile, ffmpeg.
Download the official kokoro-multi-lang-v1_1 model separately; never bundle it.
"""
import argparse, hashlib, json, subprocess, time
from pathlib import Path
import numpy as np
import sherpa_onnx
import soundfile as sf

p=argparse.ArgumentParser()
p.add_argument('--model',type=Path,required=True)
p.add_argument('--limit',type=int,default=0)
p.add_argument('--wav-dir',type=Path,required=True)
a=p.parse_args()
root=Path(__file__).resolve().parents[2]
items=json.loads((root/'android/audio/utterances.json').read_text('utf8'))['utterances']
output=root/'android/app/src/main/assets/audio'
output.mkdir(parents=True,exist_ok=True)
a.wav_dir.mkdir(parents=True,exist_ok=True)
m=a.model.resolve()
config=sherpa_onnx.OfflineTtsConfig(model=sherpa_onnx.OfflineTtsModelConfig(kokoro=sherpa_onnx.OfflineTtsKokoroModelConfig(model=str(m/'model.onnx'),voices=str(m/'voices.bin'),tokens=str(m/'tokens.txt'),data_dir=str(m/'espeak-ng-data'),lexicon=f"{m/'lexicon-us-en.txt'},{m/'lexicon-zh.txt'}"),num_threads=2,provider='cpu'))
if not config.validate():raise ValueError('Invalid local model configuration')
tts=sherpa_onnx.OfflineTts(config)
print(f'Model loaded: {tts.num_speakers} speakers, {tts.sample_rate}Hz',flush=True)
metrics=[]
start=time.monotonic()
for i,u in enumerate(items[:a.limit] if a.limit else items):
    began=time.monotonic()
    wav=a.wav_dir/(u['id']+'.wav')
    if wav.exists():samples,sr=sf.read(wav,dtype='float32')
    else:
        result=tts.generate(text=u['text'],sid=3,speed=1.0)
        samples=np.asarray(result.samples,dtype=np.float32);sr=result.sample_rate
        if samples.size<sr*.2 or not np.isfinite(samples).all() or np.max(np.abs(samples))<.005:raise ValueError('Empty/invalid speech '+u['id'])
        sf.write(wav,samples,sr,subtype='PCM_16')
    peak=float(np.max(np.abs(samples)));rms=float(np.sqrt(np.mean(samples*samples)))
    if peak>=.9999:raise ValueError('Clipping '+u['id'])
    clip=output/(u['id']+'.m4a')
    subprocess.run(['ffmpeg','-y','-v','error','-i',str(wav),'-c:a','aac','-b:a','64k','-ar','24000','-ac','1','-movflags','+faststart',str(clip)],check=True)
    decoded=subprocess.run(['ffmpeg','-v','error','-i',str(clip),'-f','f32le','-acodec','pcm_f32le','-'],check=True,capture_output=True).stdout
    decode=np.frombuffer(decoded,dtype='<f4')
    if decode.size<sr*.2 or float(np.max(np.abs(decode)))<.005:raise ValueError('Encoded clip empty '+u['id'])
    metrics.append({**u,'file':'audio/'+clip.name,'durationMs':round(samples.size/sr*1000),'sampleRate':sr,'peak':round(peak,5),'rms':round(rms,5),'clippedSamples':int(np.sum(np.abs(samples)>=.9999)),'sha256':hashlib.sha256(clip.read_bytes()).hexdigest(),'bytes':clip.stat().st_size})
    print(f'{i+1}/{a.limit or len(items)} {u["id"]} {samples.size/sr:.2f}s rendered in {time.monotonic()-began:.2f}s',flush=True)
manifest={'version':1,'language':'zh-CN','generated':True,'model':'Kokoro-82M-v1.1-zh / sherpa-onnx kokoro-multi-lang-v1_1','runtime':'sherpa-onnx 1.13.8','speaker':'zf_001','speakerId':3,'generationSpeed':1.0,'generationProvider':'CPU offline','modelSource':'https://huggingface.co/hexgrad/Kokoro-82M-v1.1-zh','onnxSource':'https://github.com/k2-fsa/sherpa-onnx/releases/download/tts-models/kokoro-multi-lang-v1_1.tar.bz2','modelSha256':hashlib.sha256((m/'model.onnx').read_bytes()).hexdigest(),'clips':metrics}
(output/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),'utf8')
(root/'android/audio/generation-report.json').write_text(json.dumps({'total':len(metrics),'elapsedSeconds':round(time.monotonic()-start,2),'metrics':metrics},ensure_ascii=False,indent=2),'utf8')
print(f'Done: {len(metrics)} clips / {sum(x["bytes"] for x in metrics)} bytes / {time.monotonic()-start:.1f}s',flush=True)
