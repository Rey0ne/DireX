"""
Batch transcribe Chinese videos → English SRT subtitles
Uses faster-whisper large-v3 with CUDA (RTX 4080)
translate mode: Chinese speech → English text directly
"""
import os, time, glob

INPUT_DIR = r"D:\Download\公司保洁员竟是女总裁.1080P（100集）------ 王美淇&嘉言"
OUTPUT_DIR = os.path.join(INPUT_DIR, "english_subtitles")
MODEL_SIZE = "large-v3"

# ── Find all videos, sort by episode number ──
os.makedirs(OUTPUT_DIR, exist_ok=True)
all_mp4 = sorted(
    glob.glob(os.path.join(INPUT_DIR, "*.mp4")),
    key=lambda x: int(''.join(c for c in os.path.basename(x) if c.isdigit()) or 0)
)
print(f"Found {len(all_mp4)} videos to process")

# ── Load model on GPU ──
from faster_whisper import WhisperModel
print(f"Loading model: {MODEL_SIZE} on CUDA...")
model = WhisperModel(MODEL_SIZE, device="cuda", compute_type="float16")
print("Model loaded.")

# ── Process each video ──
def format_srt(segments):
    """Convert whisper segments to SRT format"""
    lines = []
    for i, seg in enumerate(segments, 1):
        start = seg.start
        end = seg.end
        text = seg.text.strip()
        if not text:
            continue
        def to_hms(t):
            h = int(t // 3600)
            m = int((t % 3600) // 60)
            s = int(t % 60)
            ms = int((t - int(t)) * 1000)
            return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"
        lines.append(f"{i}")
        lines.append(f"{to_hms(start)} --> {to_hms(end)}")
        lines.append(text)
        lines.append("")
    return "\n".join(lines)

total_start = time.time()
success, fail = 0, 0

for idx, video_path in enumerate(all_mp4):
    fname = os.path.splitext(os.path.basename(video_path))[0]
    out_path = os.path.join(OUTPUT_DIR, f"{fname}.srt")

    if os.path.exists(out_path) and os.path.getsize(out_path) > 100:
        print(f"[{idx+1}/{len(all_mp4)}] SKIP (exists): {fname}")
        success += 1
        continue

    t0 = time.time()
    try:
        # translate mode: Chinese audio → English text
        segments, info = model.transcribe(
            video_path,
            task="translate",       # Chinese speech → English text
            language="zh",
            beam_size=5,
            vad_filter=True,        # skip silence
            vad_parameters=dict(min_silence_duration_ms=500),
        )
        srt_content = format_srt(segments)
        with open(out_path, "w", encoding="utf-8") as f:
            f.write(srt_content)

        elapsed = time.time() - t0
        dur = info.duration
        speed = dur / elapsed if elapsed > 0 else 0
        success += 1
        print(f"[{idx+1}/{len(all_mp4)}] OK {fname} | {dur:.0f}s → {elapsed:.0f}s ({speed:.1f}x)")

    except Exception as e:
        fail += 1
        print(f"[{idx+1}/{len(all_mp4)}] FAIL {fname}: {e}")

total_elapsed = time.time() - total_start
print(f"\n{'='*60}")
print(f"DONE: {success} success, {fail} failed, {len(all_mp4)} total")
print(f"Total time: {total_elapsed/60:.1f} min")
print(f"Output: {OUTPUT_DIR}")
