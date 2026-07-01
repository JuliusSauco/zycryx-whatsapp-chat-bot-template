module.exports = {
  apps: [
    {
      name: 'zycryx-bot',
      script: 'dist/core/index.js',
      cwd: __dirname,
      interpreter: 'node',
      node_args: '--max-old-space-size=512',
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
