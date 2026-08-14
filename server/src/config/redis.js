import Redis from 'ioredis';
import { config } from './index.js';

let redisConnection = null;

export function getRedisConnection() {
  if (!redisConnection) {
    redisConnection = new Redis(config.redisUrl, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      lazyConnect: true,
      retryStrategy: (times) => {
        if (times > 3) return null;
        return Math.min(times * 500, 2000);
      },
    });

    redisConnection.on('connect', () => {
      console.log('✅ Redis connected successfully');
    });

    redisConnection.on('error', (err) => {
      if (err.message.includes('ECONNREFUSED')) {
        console.warn('⚠️ Redis offline (BullMQ will use synchronous fallback)');
      } else {
        console.error('Redis error:', err.message);
      }
    });
  }
  return redisConnection;
}

export async function closeRedis() {
  if (redisConnection) {
    try {
      await redisConnection.quit();
    } catch {
      // ignore
    }
    redisConnection = null;
  }
}
