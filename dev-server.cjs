const { spawn } = require('child_process');
const child = spawn('npx', ['vite', '--port', '5173', '--host'], {
  cwd: __dirname,
  stdio: 'ignore',
  shell: true,
  windowsHide: true,
  env: { ...process.env }
});
child.on('exit', (code) => console.log('Vite exited with', code));
child.unref();
