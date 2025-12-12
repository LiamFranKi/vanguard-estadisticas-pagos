module.exports = {
  apps: [
    {
      name: 'estadisticas-backend',
      script: 'server.js',
      cwd: '/var/www/estadisticas/backend',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 5001
      },
      error_file: '/var/log/pm2/estadisticas-backend-error.log',
      out_file: '/var/log/pm2/estadisticas-backend-out.log',
      log_file: '/var/log/pm2/estadisticas-backend-combined.log',
      time: true,
      max_restarts: 10,
      min_uptime: '10s',
      watch: false,
      ignore_watch: ['node_modules', 'uploads', 'logs'],
      max_memory_restart: '500M'
    }
  ]
};
