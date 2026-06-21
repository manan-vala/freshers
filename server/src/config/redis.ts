import IORedis from 'ioredis';
import { env } from '@/config/env';

export const redis = new IORedis(env.REDIS_URL, {
  maxRetriesPerRequest: null,    // Required for BullMQ compatibility
  enableReadyCheck: false,
  lazyConnect: false,
  family: 4,
  retryStrategy: (times) => Math.min(times * 50, 2000),
});

redis.on('connect', () => console.log('✓ Redis connected'));
redis.on('error', (err) => console.error('Redis error:', err));
