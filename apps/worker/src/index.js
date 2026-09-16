import { WorkerInstance } from './worker.js';
import { initDbPool } from '@pulsemesh/database';

async function bootstrap() {
  initDbPool();
  const worker = new WorkerInstance({
    capacity: Number(process.env.WORKER_CONCURRENCY || 5),
  });
  await worker.start();
}

bootstrap().catch((err) => {
  console.error('Fatal worker startup error:', err);
  process.exit(1);
});
