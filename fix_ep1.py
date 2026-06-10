import json, urllib.request

with open(r'D:/Download/cleaner_ceo/ep001_raw_en.txt', 'r', encoding='utf-8') as f:
    raw = f.read()

prompt = f"""Below is a machine-translated English transcript of a Chinese drama episode. The translation has many errors. Your job:
1. Figure out what the original Chinese dialog likely was based on context
2. The show: a FEMALE CEO disguises herself as a CLEANER at her own company (Shengshi Group).
   She is bullied by Manager Yu and Director Fang who don't know her real identity.
3. Rewrite ALL lines into NATURAL spoken English as an SRT file
4. Keep ALL timestamps EXACTLY as they are
5. CRITICAL: The line about "pressure to hire" is WRONG. The original Chinese is "盛世集团欺压底层员工"
   which means "Shengshi Group bullies/oppresses its low-level employees"
   "欺压" = bully/oppress, NOT "under pressure"!
6. The protagonist is FEMALE - use "she/her" for her. Use "he/him" for male characters (Manager Yu).
7. Output ONLY the fixed SRT file, with NO markdown code fences, NO explanations.

Raw transcript to fix:

{raw}"""

payload = json.dumps({
    'model': 'deepseek-chat',
    'messages': [
        {'role': 'system', 'content': 'You fix machine-translated subtitles. Output corrected SRT format.'},
        {'role': 'user', 'content': prompt}
    ],
    'temperature': 0.3,
    'max_tokens': 8000
}).encode('utf-8')

req = urllib.request.Request('https://api.deepseek.com/v1/chat/completions', data=payload,
    headers={'Content-Type': 'application/json', 'Authorization': 'Bearer sk-432b823bc3954dbab53e15a08adcb90c'})

with urllib.request.urlopen(req, timeout=120) as r:
    result = json.loads(r.read().decode('utf-8'))

en = result['choices'][0]['message']['content'].strip()
if en.startswith('```'): en = '\n'.join(en.split('\n')[1:])
if en.endswith('```'): en = '\n'.join(en.split('\n')[:-1])

with open(r'D:/Download/cleaner_ceo/ep001_final.srt', 'w', encoding='utf-8') as f:
    f.write(en + '\n')

print(f'Tokens: {result["usage"]["total_tokens"]}')
print(en[:2000])
