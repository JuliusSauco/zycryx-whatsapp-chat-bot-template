const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';

module.exports = {
  apps: [
    {
      name: 'zycryx-bot',
      script: npmCommand,
      args: 'run serve:migrate',
      cwd: __dirname,
      interpreter: 'none',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_restarts: 10,
      min_uptime: '30s',
      restart_delay: 3000,
      env: {
        NODE_ENV: 'prod',
      },
    },
  ],
};
