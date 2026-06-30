import { Queue } from 'bullmq';
import { env } from '@/config/env';
import type { EmailJob } from './email.types';

// BullMQ bundles its own ioredis internally. Passing the shared `redis` singleton
// from @/config/redis causes a type conflict because the two ioredis copies diverge
// at the structural level (protected properties differ). Passing a plain connection
// options object lets BullMQ create its own connection with no type clash.
export const emailQueue = new Queue<EmailJob>('emails', {
  connection: {
    host: new URL(env.REDIS_URL).hostname,
    port: Number(new URL(env.REDIS_URL).port) || 6379,
    username: new URL(env.REDIS_URL).username || undefined,
    password: new URL(env.REDIS_URL).password || undefined,
    family: 4,
    maxRetriesPerRequest: null,
  },
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: { age: 3600 },
    removeOnFail: { age: 86400 },
  },
});
