module.exports = {
  apps: [{
    name: 'thaesu',
    script: 'npm',
    args: 'start',
    instances: 1,
    exec_mode: 'fork',
    watch: false,
    env: { NODE_ENV: 'production' },
  }],
};
