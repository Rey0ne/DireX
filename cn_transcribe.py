import os, time, glob
from faster_whisper import WhisperModel

d = r'D:/Download/cleaner_ceo'
out = os.path.join(d, 'chinese_subtitles')
os.makedirs(out, exist_ok=True)
files = sorted(glob.glob(os.path.join(d, 'ep*.mp4')))
print(f'Total: {len(files)}')

model = WhisperModel('large-v3', device='cuda', compute_type='int8')
print('Model ready')

def hms(x):
    h=int(x//3600); m=int((x%3600)//60); s=int(x%60); ms=int((x-int(x))*1000)
    return f'{h:02d}:{m:02d}:{s:02d},{ms:03d}'

ok, fail, skip = 0, 0, 0
ts = time.time()
td = 0

for idx, vp in enumerate(files):
    fn = os.path.splitext(os.path.basename(vp))[0]
    op = os.path.join(out, f'{fn}.srt')
    if os.path.exists(op) and os.path.getsize(op) > 80:
        skip += 1; continue
    t1 = time.time()
    try:
        segs, info = model.transcribe(vp, task='transcribe', language='zh', beam_size=5)
        sl = list(segs)
        el = time.time() - t1
        with open(op, 'w', encoding='utf-8') as f:
            for i, s in enumerate(sl, 1):
                if not s.text.strip(): continue
                f.write(f'{i}\n{hms(s.start)} --> {hms(s.end)}\n{s.text.strip()}\n\n')
        ok += 1; td += info.duration
        ddd = ok + fail + skip
        sp = info.duration / el if el > 0 else 0
        avg = td / (time.time() - ts) if (time.time() - ts) > 0 else 0
        rem = len(files) - ddd
        eta = (time.time() - ts) / max(ok, 1) * rem
        print(f'[{ddd:3d}/{len(files)}] {fn} | {info.duration:.0f}s:{el:.0f}s x{sp:.0f} | avg x{avg:.0f} | ETA {eta/60:.0f}m')
    except Exception as e:
        fail += 1
        print(f'[{ok+fail+skip}/{len(files)}] {fn} FAIL: {e}')

tt = time.time() - ts
print(f'\nok={ok} skip={skip} fail={fail} | dur={td/3600:.1f}h | time={tt/60:.1f}m | avg x{td/tt:.0f}')
print(out)
