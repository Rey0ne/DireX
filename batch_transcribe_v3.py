"""
Batch transcribe 100 Chinese videos → English SRT subtitles
Uses openai-whisper large-v2 on CUDA + torchaudio loader (no ffmpeg needed)
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

import torch
import torchaudio
import whisper
import numpy as np

print(f"CUDA: {torch.cuda.is_available()} | GPU: {torch.cuda.get_device_name(0)}")
print("Loading whisper large-v2 model...")
model = whisper.load_model("large-v2").cuda()
print("Model loaded.")

def load_audio_torch(path, sr=16000):
    """Load audio from video file using torchaudio (no ffmpeg needed)"""
    audio, orig_sr = torchaudio.load(path, backend="ffmpeg")
    if audio.shape[0] > 1:
        audio = audio.mean(dim=0, keepdim=True)  # stereo -> mono
    if orig_sr != sr:
        resampler = torchaudio.transforms.Resample(orig_sr, sr)
        audio = resampler(audio)
    return audio.squeeze(0).numpy()

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

# Patch whisper's audio loading to use our torchaudio loader
import whisper.audio
whisper.audio.load_audio = load_audio_torch

success, fail, skipped = 0, 0, 0
total_start = time.time()

for idx, video_path in enumerate(all_mp4):
    fname = os.path.splitext(os.path.basename(video_path))[0]
    out_path = os.path.join(OUTPUT_DIR, f"{fname}.srt")

    if os.path.exists(out_path) and os.path.getsize(out_path) > 100:
        skipped += 1
        continue

    t0 = time.time()
    try:
        result = model.transcribe(
            video_path,
            task="translate",
            language="zh",
            fp16=True,
            verbose=False,
        )
        srt = format_srt(result.get("segments", []))
        with open(out_path, "w", encoding="utf-8") as f:
            f.write(srt)

        elapsed = time.time() - t0
        dur = result.get("duration", 0)
        speed = dur / elapsed if elapsed > 0 else 0
        success += 1
        done = success + fail + skipped
        eta_min = 0
        if success > 0:
            avg = (time.time() - total_start) / success
            remaining = len(all_mp4) - done
            eta_min = (avg * remaining) / 60
        print(f"[{done}/{len(all_mp4)}] OK {fname} | {dur:.0f}s -> {elapsed:.0f}s ({speed:.1f}x) | ETA: {eta_min:.0f}min")

    except Exception as e:
        fail += 1
        done = success + fail + skipped
        print(f"[{done}/{len(all_mp4)}] FAIL {fname}: {e}")

total = time.time() - total_start
print(f"\nDone: {success} ok, {skipped} skipped, {fail} fail")
print(f"Total time: {total/60:.1f} min")
print(f"Output: {OUTPUT_DIR}")
