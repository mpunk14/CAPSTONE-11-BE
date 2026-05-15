import './loadEnv';

const requireEnv = (name: string): string => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
};

export const env = {
  DATABASE_URL: requireEnv('DATABASE_URL'),
  PORT: process.env.PORT || '3000',
  JWT_SECRET: process.env.JWT_SECRET || 'simba_secret_key_2026',
};
