"""
Batch transcribe 100 Chinese videos -> English SRT
faster-whisper large-v3 CUDA + ASCII paths
"""
import os, sys, time, glob, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

INPUT_DIR = r"D:/Download/cleaner_ceo"
OUTPUT_DIR = os.path.join(INPUT_DIR, "english_subtitles")
os.makedirs(OUTPUT_DIR, exist_ok=True)

all_mp4 = sorted(glob.glob(os.path.join(INPUT_DIR, "ep*.mp4")))
print(f"Found {len(all_mp4)} videos")

from faster_whisper import WhisperModel

print("Loading model...")
model = WhisperModel("large-v3", device="cuda", compute_type="int8")
print("Model ready.")

def format_srt(segments):
    lines = []
    for i, seg in enumerate(segments, 1):
        s, e, t = seg.start, seg.end, seg.text.strip()
        if not t: continue
        def hms(x):
            h=int(x//3600); m=int((x%3600)//60); s=int(x%60); ms=int((x-int(x))*1000)
            return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"
        lines.append(str(i))
        lines.append(f"{hms(s)} --> {hms(e)}")
        lines.append(t)
        lines.append("")
    return "\n".join(lines)

ok, fail, skip = 0, 0, 0
t0 = time.time()

for idx, vp in enumerate(all_mp4):
    fn = os.path.splitext(os.path.basename(vp))[0]
    op = os.path.join(OUTPUT_DIR, f"{fn}.srt")
    if os.path.exists(op) and os.path.getsize(op) > 80:
        skip += 1; continue
    t1 = time.time()
    try:
        segs, info = model.transcribe(vp, task="translate", language="zh", beam_size=1)
        srt = format_srt(list(segs))
        with open(op, "w", encoding="utf-8") as f: f.write(srt)
        el = time.time() - t1
        ok += 1
        done = ok + fail + skip
        eta = (time.time() - t0) / max(ok, 1) * (len(all_mp4) - done)
        print(f"[{done}/{len(all_mp4)}] OK {fn} {info.duration:.0f}s->{el:.0f}s ({info.duration/el:.1f}x) ETA{eta/60:.0f}m")
    except Exception as e:
        fail += 1
        done = ok + fail + skip
        print(f"[{done}/{len(all_mp4)}] FAIL {fn}: {str(e)[:120]}")

ttl = time.time() - t0
print(f"\nDone: ok={ok} skip={skip} fail={fail} | {ttl/60:.1f} min")
print(f"Output: {OUTPUT_DIR}")
