"""
Batch transcribe 100 Chinese videos → English SRT subtitles
Uses openai-whisper large-v3 with CUDA (RTX 4080)
"""
import os, time, glob, sys

# Fix torch module path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'whisper_module'))

INPUT_DIR = r"D:\Download\公司保洁员竟是女总裁.1080P（100集）------ 王美淇&嘉言"
OUTPUT_DIR = os.path.join(INPUT_DIR, "english_subtitles")
MODEL_SIZE = "large"

os.makedirs(OUTPUT_DIR, exist_ok=True)

all_mp4 = sorted(
    glob.glob(os.path.join(INPUT_DIR, "*.mp4")),
    key=lambda x: int(''.join(c for c in os.path.basename(x) if c.isdigit()) or 0)
)
print(f"Found {len(all_mp4)} videos")

import whisper
print(f"Loading model: {MODEL_SIZE} on CUDA...")
model = whisper.load_model(MODEL_SIZE).cuda()
print("Model loaded.")

def format_srt(segments):
    lines = []
    for i, seg in enumerate(segments, 1):
        start = seg.get("start", 0)
        end = seg.get("end", 0)
        text = seg.get("text", "").strip()
        if not text:
            continue
        def to_hms(t):
            h = int(t // 3600)
            m = int((t % 3600) // 60)
            s = int(t % 60)
            ms = int((t - int(t)) * 1000)
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

    if os.path.exists(out_path) and os.path.getsize(out_path) > 100:
        skipped += 1
        if skipped == 1:
            print(f"  (skipping existing files...)")
        continue

    t0 = time.time()
    try:
        result = model.transcribe(
            video_path,
            task="translate",      # Chinese → English
            language="zh",
            fp16=True,
            verbose=False,
        )
        srt_content = format_srt(result.get("segments", []))
        with open(out_path, "w", encoding="utf-8") as f:
            f.write(srt_content)

        elapsed = time.time() - t0
        dur = result.get("duration", 0)
        speed = dur / elapsed if elapsed > 0 else 0
        success += 1
        real_num = success + fail + skipped
        eta = (total_start + (time.time() - total_start) / max(success, 1) * (len(all_mp4) - real_num)) if success > 0 else 0
        print(f"[{real_num}/{len(all_mp4)}] ✓ {fname} | {dur:.0f}s→{elapsed:.0f}s ({speed:.1f}x) | ETA: {eta/60:.0f}min" if eta else f"[{real_num}/{len(all_mp4)}] ✓ {fname} | {dur:.0f}s→{elapsed:.0f}s ({speed:.1f}x)")

    except Exception as e:
        fail += 1
        real_num = success + fail + skipped
        print(f"[{real_num}/{len(all_mp4)}] ✗ {fname}: {str(e)[:120]}")

total_elapsed = time.time() - total_start
print(f"\n{'='*60}")
print(f"DONE: {success} ok, {skipped} skipped, {fail} failed, {len(all_mp4)} total")
print(f"Time: {total_elapsed/60:.1f} min")
print(f"Output: {OUTPUT_DIR}")
