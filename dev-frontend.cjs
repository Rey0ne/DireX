const { spawn } = require('child_process');
const path = require('path');
const vitePath = path.join(__dirname, 'node_modules', '.bin', 'vite.cmd');
const child = spawn(vitePath, ['--port', '5173', '--host'], {
  cwd: __dirname,
  stdio: 'ignore',
  shell: true,
  windowsHide: true,
});
child.on('exit', (code) => console.log('Vite exited with', code));
child.unref();
