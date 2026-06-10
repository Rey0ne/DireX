"""
Batch transcribe 100 Chinese videos → English SRT subtitles
faster-whisper large-v3 + CUDA + torchaudio loader
"""
import os, sys, time, glob, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

INPUT_DIR = r"D:\Download\公司保洁员竟是女总裁.1080P（100集）------ 王美淇&嘉言"
OUTPUT_DIR = os.path.join(INPUT_DIR, "english_subtitles")
os.makedirs(OUTPUT_DIR, exist_ok=True)

all_mp4 = sorted(
    glob.glob(os.path.join(INPUT_DIR, "*.mp4")),
    key=lambda x: int(''.join(c for c in os.path.basename(x) if c.isdigit()) or 0)
)
print(f"Found {len(all_mp4)} videos")

from faster_whisper import WhisperModel

print("Loading faster-whisper large-v3 on CUDA...")
model = WhisperModel("large-v3", device="cuda", compute_type="float16")
print("Model ready.")

def format_srt(segments):
    lines = []
    for i, seg in enumerate(segments, 1):
        start = seg.start
        end = seg.end
        text = seg.text.strip()
        if not text:
            continue
        def to_hms(t):
            h = int(t // 3600); m = int((t % 3600) // 60)
            s = int(t % 60); ms = int((t - int(t)) * 1000)
            return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"
        lines.append(str(i))
        lines.append(f"{to_hms(start)} --> {to_hms(end)}")
        lines.append(text)
        lines.append("")
    return "\n".join(lines)

success, fail, skipped = 0, 0, 0
total_start = time.time()

for idx, video_path in enumerate(all_mp4):
    fname = os.path.splitext(os.path.basename(video_path))[0]
    out_path = os.path.join(OUTPUT_DIR, f"{fname}.srt")

    if os.path.exists(out_path) and os.path.getsize(out_path) > 80:
        skipped += 1
        continue

    t0 = time.time()
    try:
        # faster-whisper transcribe: task="translate" for Chinese→English
        segments_gen, info = model.transcribe(
            video_path,
            task="translate",
            language="zh",
            beam_size=5,
            vad_filter=True,
            vad_parameters=dict(min_silence_duration_ms=500),
        )
        segments = list(segments_gen)
        srt = format_srt(segments)
        with open(out_path, "w", encoding="utf-8") as f:
            f.write(srt)

        elapsed = time.time() - t0
        dur = info.duration
        speed = dur / elapsed if elapsed > 0 else 0
        success += 1
        done = success + fail + skipped
        eta = (time.time() - total_start) / max(success, 1) * (len(all_mp4) - done)
        print(f"[{done}/{len(all_mp4)}] OK {fname} | {dur:.0f}s->{elapsed:.0f}s ({speed:.1f}x) | ETA {eta/60:.0f}m")

    except Exception as e:
        fail += 1
        done = success + fail + skipped
        print(f"[{done}/{len(all_mp4)}] FAIL {fname}: {str(e)[:100]}")

total = time.time() - total_start
print(f"\nDone: {success} ok, {skipped} skip, {fail} fail | {total/60:.1f} min")
print(f"Output: {OUTPUT_DIR}")
