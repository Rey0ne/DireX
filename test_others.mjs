import { readFileSync } from 'fs';

const script = readFileSync('test_script.txt', 'utf-8');
const endpoint = process.argv[2] || 'space';

const urlMap = {
  space: '/api/agent/script/scene-architect',
  props: '/api/agent/script/props',
};
const url = urlMap[endpoint];
const resultKey = endpoint === 'space' ? 'designs' : 'props';

console.log(`=== Testing ${endpoint} ===`);
const t0 = Date.now();

const resp = await fetch(`http://localhost:3001${url}`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ scriptText: script }),
  signal: AbortSignal.timeout(600_000),
});

const data = await resp.json();
console.log(`Done in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
console.log('success:', data.success);
console.log(`${resultKey}:`, Object.keys(data[resultKey] || {}).length);
for (const [k, v] of Object.entries(data[resultKey] || {})) {
  console.log(`  [${k}]:`, (v).slice(0, 150).replace(/\n/g, '\\n'));
}
