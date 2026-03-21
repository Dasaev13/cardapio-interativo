import { Queue } from 'bullmq';
import { getRedisClient } from './redis';

const connection = { connection: getRedisClient() };

export const pixTimeoutQueue = new Queue('pix-timeout', {
  ...connection,
  defaultJobOptions: {
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 50 },
  },
});

export const printQueue = new Queue('print-jobs', {
  ...connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: { count: 200 },
    removeOnFail: { count: 100 },
  },
});

export const notificationQueue = new Queue('notifications', {
  ...connection,
  defaultJobOptions: {
    attempts: 5,
    backoff: { type: 'fixed', delay: 3000 },
    removeOnComplete: { count: 500 },
    removeOnFail: { count: 100 },
  },
});
