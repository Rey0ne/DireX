#!/bin/bash
# Test Sound Composer endpoint
cd c:/Users/ROG/direx-isolated
echo "=== Testing Sound Composer ==="
RESP=$(curl -s -X POST http://localhost:3001/api/agent/script/sound \
  -H 'Content-Type: application/json' \
  --data-binary @test_script.json \
  --max-time 600 2>&1)
echo "$RESP" | python -c "import sys,json; d=json.load(sys.stdin); print('success:', d.get('success')); print('soundScenes:', len(d.get('soundScenes',{}))); print('sunoPrompts:', len(d.get('sunoPrompts',{}))); [print(f'  [{k}]: {v[:100]}') for k,v in list(d.get('sunoPrompts',{}).items())[:3]]" 2>&1
