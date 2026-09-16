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
  server.listen(config.port, config.host, () => {
    console.log(`🚀 [PulseMesh API] Cyber-Telemetry REST API listening at http://${config.host}:${config.port}`);
  });
}

bootstrap().catch((err) => {
  console.error('Fatal API startup error:', err);
  process.exit(1);
});
