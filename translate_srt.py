"""
Step 2: Translate Chinese SRT -> Natural English SRT via DeepSeek API
Reads from chinese_subtitles/, writes to english_subtitles_v2/
"""
import os, glob, json, time, urllib.request

SRC = r"D:/Download/cleaner_ceo/chinese_subtitles"
DST = r"D:/Download/cleaner_ceo/english_subtitles_v2"
os.makedirs(DST, exist_ok=True)

API_KEY = "sk-432b823bc3954dbab53e15a08adcb90c"
API_URL = "https://api.deepseek.com/v1/chat/completions"

SYSTEM_PROMPT = """You are a subtitle translator. Translate Chinese subtitles into natural spoken English for a TV drama. Rules:
1. Keep ALL timestamps and index numbers EXACTLY as they are
2. Only translate the dialog/text lines — do NOT modify timestamps or indices
3. Use natural spoken English, not literal translation
4. CRITICAL: The protagonist is FEMALE. When translating 他/她, use "she/her" for the CEO/cleaner main character. Use "he/him" only for clearly male characters (manager, male colleagues, etc.). When gender is ambiguous from speech alone, default to "she/her" for the protagonist and use context clues for others.
5. The drama: a female CEO disguises herself as a cleaner. She's bullied and looked down upon until her true identity is revealed. Tone: dramatic, revenge, corporate power dynamics.
6. Output ONLY the complete translated SRT, with NO markdown fences, NO explanations."""

files = sorted(glob.glob(os.path.join(SRC, "ep*.srt")))
ok, fail, skip = 0, 0, 0
ts = time.time()

for idx, fp in enumerate(files):
    fn = os.path.basename(fp)
    op = os.path.join(DST, fn)

    if os.path.exists(op) and os.path.getsize(op) > 100:
        skip += 1; continue

    with open(fp, "r", encoding="utf-8") as f:
        chinese_srt = f.read()

    if len(chinese_srt.strip()) < 50:
        skip += 1; continue

    t0 = time.time()
    try:
        payload = json.dumps({
            "model": "deepseek-chat",
            "messages": [
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": f"Translate this SRT file:\n\n{chinese_srt}"}
            ],
            "temperature": 0.3,
            "max_tokens": 16000,
            "stream": False
        }).encode("utf-8")

        req = urllib.request.Request(API_URL, data=payload, headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {API_KEY}"
        })

        with urllib.request.urlopen(req, timeout=120) as resp:
            result = json.loads(resp.read().decode("utf-8"))

        english_srt = result["choices"][0]["message"]["content"].strip()

        # Strip markdown code blocks if present
        if english_srt.startswith("```"):
            english_srt = "\n".join(english_srt.split("\n")[1:])
        if english_srt.endswith("```"):
            english_srt = "\n".join(english_srt.split("\n")[:-1])

        with open(op, "w", encoding="utf-8") as f:
            f.write(english_srt + "\n")

        el = time.time() - t0
        ok += 1
        done = ok + fail + skip
        eta = (time.time() - ts) / max(ok, 1) * (len(files) - done)
        print(f"[{done:3d}/{len(files)}] {fn} | {el:.0f}s | tokens {result['usage']['total_tokens']} | ETA {eta/60:.0f}m")

    except Exception as e:
        fail += 1
        done = ok + fail + skip
        print(f"[{done:3d}/{len(files)}] {fn} FAIL: {str(e)[:100]}")
        time.sleep(2)  # back off on error

tt = time.time() - ts
print(f"\nDone: ok={ok} skip={skip} fail={fail} | {tt/60:.1f} min")
print(f"Output: {DST}")
