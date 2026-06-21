import { readFileSync } from 'fs';

const script = readFileSync('test_script.txt', 'utf-8');
console.log('Script length:', script.length, 'chars');

const t0 = Date.now();
const resp = await fetch('http://localhost:3001/api/agent/script/sound', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ scriptText: script }),
  signal: AbortSignal.timeout(600_000),
});

const data = await resp.json();
console.log('Done in', ((Date.now() - t0) / 1000).toFixed(1), 's');
console.log('success:', data.success);
console.log('soundScenes:', Object.keys(data.soundScenes || {}).length);
for (const [k, v] of Object.entries(data.soundScenes || {})) {
  console.log(`  [${k}]:`, (v).slice(0, 120));
}
console.log('sunoPrompts:', Object.keys(data.sunoPrompts || {}).length);
for (const [k, v] of Object.entries(data.sunoPrompts || {})) {
  console.log(`  [${k}]:`, v.slice(0, 300));
}
