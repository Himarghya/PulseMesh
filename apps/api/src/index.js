import { createServer } from './server.js';
import { config } from './config.js';
import { runMigrations, initDbPool } from '@pulsemesh/database';

async function bootstrap() {
  console.log('⚡ [PulseMesh API] Initializing database and services...');
  initDbPool(config.databaseUrl);
  try {
    await runMigrations();
  } catch (err) {
    console.warn('⚠️ [PulseMesh API] Migration check bypassed (using memory fallback if offline)');
  }

  // Seed default workspace data if empty
  try {
    const { WorkflowRepository, ScheduleRepository, JobRepository, AuthRepository } = await import('@pulsemesh/database');
    const orgId = '00000000-0000-0000-0000-000000000001';
    
    // Seed API Key
    await AuthRepository.createApiKey(orgId, 'Primary Telemetry Stream Key', 365).catch(() => {});

    // Seed Sample DAG
    await WorkflowRepository.createWorkflow(orgId, 'etl-telemetry-pipeline', 'Distributed log transformation, metrics aggregation, and settlement', {
      name: 'etl-telemetry-pipeline',
      tasks: [
        { id: 'fetch_data', type: 'csv_processing', dependsOn: [], payload: { rowCount: 12000 } },
        { id: 'resize_thumbnails', type: 'image_resize', dependsOn: ['fetch_data'], payload: { format: 'webp' } },
        { id: 'aggregate_report', type: 'report_generation', dependsOn: ['resize_thumbnails'], payload: { type: 'summary' } },
        { id: 'settle_audit', type: 'mock_payment', dependsOn: ['aggregate_report'], payload: { amount: 2500 } },
      ],
    }).catch(() => {});

    // Seed Sample Schedule
    await ScheduleRepository.createSchedule({
      organizationId: orgId,
      name: 'hourly-telemetry-sync',
      targetType: 'job',
      targetPayload: { type: 'report_generation', payload: { period: '1h' } },
      cronExpression: '*/10 * * * *',
    }).catch(() => {});

    // Seed Initial Jobs
    await JobRepository.createJob({
      organizationId: orgId,
      type: 'image_resize',
      payload: { width: 3840, height: 2160, format: 'avif' },
      priority: 8,
    }).catch(() => {});

    await JobRepository.createJob({
      organizationId: orgId,
      type: 'data_transform',
      payload: { mapping: 'strict_schema_v2' },
      priority: 6,
    }).catch(() => {});
  } catch (err) {
    console.warn('⚠️ [PulseMesh API] Initial data seed bypassed:', err.message);
  }

  const server = createServer();
  
  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`\x1b[31m🛑 [PulseMesh API] Port ${config.port} is already in use by another process. Run 'npm run dev' to automatically clean up and restart.\x1b[0m`);
    } else {
      console.error('🛑 [PulseMesh API] Server error:', err.message);
    }
    process.exit(1);
  });

  server.listen(config.port, config.host, async () => {
    console.log(`🚀 [PulseMesh API] Cyber-Telemetry REST API listening at http://${config.host}:${config.port}`);

    // In zero-config dev mode, start embedded worker, recovery, and scheduler inside the same shared memory space
    if (process.env.STANDALONE_API !== 'true') {
      try {
        const { WorkerInstance } = await import('../../worker/src/worker.js');
        const { RecoveryService } = await import('../../recovery/src/recovery.js');
        const { SchedulerService } = await import('../../scheduler/src/scheduler.js');

        const worker = new WorkerInstance({ capacity: 5 });
        await worker.start();

        const recovery = new RecoveryService({ scanIntervalMs: 5000 });
        await recovery.start();

        const scheduler = new SchedulerService(5000);
        await scheduler.start();

        console.log('⚡ [PulseMesh Engine] Embedded Worker, Recovery Watchdog & Scheduler active.');
      } catch (err) {
        console.warn('⚠️ [PulseMesh Engine] Failed to start embedded background services:', err.message);
      }
    }
  });
}

bootstrap().catch((err) => {
  console.error('Fatal API startup error:', err);
  process.exit(1);
});
