import { RecoveryService } from './recovery.js';
import { initDbPool } from '@pulsemesh/database';

async function bootstrap() {
  initDbPool();
  const recovery = new RecoveryService({
    scanIntervalMs: Number(process.env.RECOVERY_SCAN_INTERVAL_MS || 5000),
    staleWorkerTimeoutSeconds: Number(process.env.STALE_WORKER_TIMEOUT_SECONDS || 15),
  });
  await recovery.start();
}

bootstrap().catch((err) => {
  console.error('Fatal recovery startup error:', err);
  process.exit(1);
});
