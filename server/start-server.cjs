const { spawn } = require('child_process');
const path = require('path');
const child = spawn('npx', ['tsx', 'src/index.ts'], {
  cwd: __dirname,
  stdio: 'ignore',
  shell: true,
  windowsHide: true,
});
child.on('exit', (code) => {
  console.log('Server exited with code', code);
});
