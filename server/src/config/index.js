import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017/codeguard',

  jwtSecret: process.env.JWT_SECRET || 'fallback-secret-not-for-production',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',

  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',

  defaultK: parseInt(process.env.DEFAULT_K || '5', 10),
  defaultWindowSize: parseInt(process.env.DEFAULT_WINDOW_SIZE || '4', 10),
  defaultSimilarityThreshold: parseFloat(process.env.DEFAULT_SIMILARITY_THRESHOLD || '0.5'),
  defaultBoilerplateThreshold: parseFloat(process.env.DEFAULT_BOILERPLATE_THRESHOLD || '0.7'),

  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
  rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),

  maxCodeSizeKB: parseInt(process.env.MAX_CODE_SIZE_KB || '500', 10),

  aiProvider: process.env.AI_PROVIDER || '',
  aiApiKey: process.env.AI_API_KEY || '',
  aiModel: process.env.AI_MODEL || '',
};
