import { SchedulerService } from './scheduler.js';
import { initDbPool } from '@pulsemesh/database';

async function bootstrap() {
  initDbPool();
  const scheduler = new SchedulerService(Number(process.env.SCHEDULER_POLL_INTERVAL_MS || 1000));
  await scheduler.start();
}

bootstrap().catch((err) => {
  console.error('Fatal scheduler startup error:', err);
  process.exit(1);
});
