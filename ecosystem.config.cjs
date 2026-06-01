module.exports = {
  apps: [{
    name: 'tapnow-server',
    cwd: './server',
    script: 'node_modules/.bin/tsx',
    args: 'src/index.ts',
    watch: false,
    autorestart: true,
    max_restarts: 10,
    restart_delay: 3000,
    env: {
      NODE_ENV: 'production',
    },
  }],
};
