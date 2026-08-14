import { Queue } from 'bullmq';
import { getRedisConnection } from '../config/redis.js';

let fingerprintQueue = null;
let analysisQueue = null;

export function getFingerprintQueue() {
  if (!fingerprintQueue) {
    fingerprintQueue = new Queue('fingerprint-queue', {
      connection: getRedisConnection(),
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: { count: 100 },
        removeOnFail: { count: 50 },
      },
    });
  }
  return fingerprintQueue;
}

export function getAnalysisQueue() {
  if (!analysisQueue) {
    analysisQueue = new Queue('analysis-queue', {
      connection: getRedisConnection(),
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
        removeOnComplete: { count: 50 },
        removeOnFail: { count: 50 },
      },
    });
  }
  return analysisQueue;
}
