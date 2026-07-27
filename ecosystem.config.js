module.exports = {
  apps: [{
    name: 'thaesu',
    script: 'npm',
    args: 'run start',
    env: {
      NODE_ENV: 'production',
      DATABASE_URL: "postgresql://neondb_owner:npg_HaN3Y5tcopWv@ep-damp-block-ahynqyj4-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=verify-full",
      JWT_SECRET: "thaesu-secret-key-2024-prod-v2"
    }
  }]
};
