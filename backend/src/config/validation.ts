/* eslint-disable prettier/prettier */
// backend/src/config/validation.ts
export interface EnvironmentVariables {
  PORT: number;
  NODE_ENV: string;
  JWT_SECRET: string;
  MONGODB_URI: string;
}

export function validateConfig(config: Record<string, any>) {
  const requiredEnvVars = ['JWT_SECRET', 'MONGODB_URI'];
  
  for (const envVar of requiredEnvVars) {
    if (!config[envVar]) {
      throw new Error(`Missing required environment variable: ${envVar}`);
    }
  }
  
  return config;
}