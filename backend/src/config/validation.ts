/* eslint-disable prettier/prettier */
// backend/src/config/validation.ts
export interface EnvironmentVariables {
  PORT: number;
  NODE_ENV: string;
  JWT_SECRET: string;
  MONGODB_URI: string;
  AI_SERVICE_URL?: string;
  AI_SERVICE_TIMEOUT_MS?: number;
  AI_SERVICE_API_KEY?: string;
}

export function validateConfig(config: Record<string, any>) {
  const requiredEnvVars = ['JWT_SECRET', 'MONGODB_URI'];
  
  for (const envVar of requiredEnvVars) {
    if (!config[envVar]) {
      throw new Error(`Missing required environment variable: ${envVar}`);
    }
  }

  if (config.AI_SERVICE_TIMEOUT_MS != null) {
    const n = Number(config.AI_SERVICE_TIMEOUT_MS);
    if (!Number.isFinite(n) || n < 1000 || n > 60000) {
      throw new Error('AI_SERVICE_TIMEOUT_MS must be a number between 1000 and 60000');
    }
  }

  if (config.AI_SERVICE_URL != null && String(config.AI_SERVICE_URL).trim()) {
    try {
      // eslint-disable-next-line no-new
      new URL(String(config.AI_SERVICE_URL));
    } catch {
      throw new Error('AI_SERVICE_URL must be a valid URL');
    }
  }

  return config;
}