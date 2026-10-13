"""Fetch a small pinned public APL graphic-data subset; no credentials or handwriting upload."""
from pathlib import Path
import urllib.request,urllib.parse,json,hashlib,re
root=Path(__file__).resolve().parent
def get(url):
    request=urllib.request.Request(url,headers={'User-Agent':'HanyuFlow-local-data-build'})
    with urllib.request.urlopen(request,timeout=30) as response:return response.read()
commit=json.loads(get('https://api.github.com/repos/chanind/hanzi-writer-data/commits/master'))['sha']
assert re.fullmatch('[0-9a-f]{40}',commit)
prefix='https://raw.githubusercontent.com/chanind/hanzi-writer-data/'+commit+'/'
vendor=root/'vendor';vendor.mkdir(parents=True,exist_ok=True)
for name in ['ARPHICPL.TXT','README.md']:(vendor/name).write_bytes(get(prefix+name))
entries=[]
for character in '一二三十你好我人大小中口':
    raw=get(prefix+'data/'+urllib.parse.quote(character)+'.json');data=json.loads(raw)
    assert isinstance(data['strokes'],list) and len(data['strokes'])==len(data['medians']) and 1<=len(data['strokes'])<=40
    assert all(isinstance(p,str) and p.startswith('M') and len(p)<20000 for p in data['strokes'])
    assert all(len(s)>=2 and all(len(p)==2 and all(isinstance(v,(int,float)) for v in p) for p in s) for s in data['medians'])
    (vendor/(character+'.json')).write_bytes(raw)
    entries.append({'character':character,'strokes':len(data['strokes']),'file':character+'.json','sha256':hashlib.sha256(raw).hexdigest(),'source':prefix+'data/'+urllib.parse.quote(character)+'.json'})
manifest={'dataset':'Hanzi Writer Data','version':'2.0.1','commit':commit,'derivedFrom':'Make Me A Hanzi / Arphic fonts','copyright':'Copyright (C) 1999 Arphic Technology Co., Ltd.','license':'Arphic Public License, retained verbatim in vendor/ARPHICPL.TXT','selectionNotice':'2026-10-13: HanyuFlow selected these 12 characters; each original JSON is unmodified. Coordinate transforms and approximate checking live in separate app code. Data may be redistributed under APL; no warranty. No claim of official certification or human review of this app.','entries':entries}
(root/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({'characters':len(entries),'strokeCounts':[e['strokes'] for e in entries],'commit':commit,'license':'APL'}))
