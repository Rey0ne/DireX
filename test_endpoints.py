import urllib.request, json, time, sys

with open('test_script.txt', 'r', encoding='utf-8') as f:
    script = f.read()

endpoint = sys.argv[1] if len(sys.argv) > 1 else 'sound'

url_map = {
    'sound': '/api/agent/script/sound',
    'space': '/api/agent/script/scene-architect',
    'props': '/api/agent/script/props',
}

url = url_map[endpoint]
print(f'Testing {endpoint} → {url}')
print(f'Script length: {len(script)} chars')
t0 = time.time()

data = json.dumps({'scriptText': script}).encode('utf-8')
req = urllib.request.Request(
    'http://localhost:3001' + url,
    data=data,
    headers={'Content-Type': 'application/json; charset=utf-8'}
)

try:
    resp = urllib.request.urlopen(req, timeout=600)
    result = json.loads(resp.read().decode('utf-8'))
    elapsed = time.time() - t0
    print(f'Done in {elapsed:.1f}s, success={result.get("success")}')

    if 'designs' in result:
        keys = list(result['designs'].keys())
        print(f'designs: {len(keys)} entries')
        for k in keys:
            print(f'  [{k}]: {result["designs"][k][:150]}...')
    elif 'props' in result:
        keys = list(result['props'].keys())
        print(f'props: {len(keys)} entries')
        for k in keys:
            print(f'  [{k}]: {result["props"][k][:150]}...')
    elif 'soundScenes' in result:
        sc = result['soundScenes']
        print(f'soundScenes: {len(sc)} entries')
        for k in list(sc.keys()):
            print(f'  [{k}]: {sc[k][:120]}...')
        sp = result.get('sunoPrompts', {})
        print(f'sunoPrompts: {len(sp)} entries')
        for k, v in sp.items():
            print(f'  [{k}]: {v[:300]}')
    else:
        print(f'keys: {list(result.keys())}')
except Exception as e:
    print(f'Error: {e}')
