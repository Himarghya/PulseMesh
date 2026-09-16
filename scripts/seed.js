import { memoryDb, initDbPool, AuthRepository, WorkflowRepository, ScheduleRepository, JobRepository } from '@pulsemesh/database';

async function seed() {
  console.log('🌱 [PulseMesh Seeder] Seeding demo workspace and initial DAG blueprints...');
  initDbPool();

  try {
    // 1. Create Default User & Organization
    const { user, organization } = await AuthRepository.registerUser(
      'admin@pulsemesh.internal',
      'PulseMeshAdmin2026!',
      'Alex Mercer (Lead Systems Architect)',
      'Primary Telemetry Cluster'
    );
    console.log(`✅ Organization created: ${organization.name} (${organization.id})`);
    console.log(`✅ Default admin created: ${user.email}`);

    // 2. Create API Key
    const apiKey = await AuthRepository.createApiKey(organization.id, 'Demo Ingestion Service Key');
    console.log(`🔑 Demo API Key Generated: ${apiKey.rawApiKey}`);

    // 3. Create Sample 4-Step DAG Workflow
    const sampleDag = {
      name: 'etl-analytics-pipeline',
      description: 'End-to-end telemetry ingestion, transformation, report generation, and settlement verification',
      tasks: [
        {
          id: 'ingest_logs',
          type: 'csv_processing',
          dependsOn: [],
          payload: { rowCount: 5000, datasetName: 'cluster_telemetry_stream.csv' },
        },
        {
          id: 'transform_metrics',
          type: 'data_transform',
          dependsOn: ['ingest_logs'],
          payload: { mapping: 'normalize', filterKey: 'valid' },
        },
        {
          id: 'generate_summary',
          type: 'report_generation',
          dependsOn: ['transform_metrics'],
          payload: { reportType: 'cluster_health', period: '24h' },
        },
        {
          id: 'settle_billing',
          type: 'mock_payment',
          dependsOn: ['generate_summary'],
          payload: { transactionId: 'tx_seed_001', amount: 1500, currency: 'USD' },
        },
      ],
    };

    const wf = await WorkflowRepository.createWorkflow(
      organization.id,
      sampleDag.name,
      sampleDag.description,
      sampleDag
    );
    console.log(`📊 Sample DAG Blueprint created: ${wf.workflow.name} (Version 1)`);

    // 4. Create Sample Schedule
    const sched = await ScheduleRepository.createSchedule({
      organizationId: organization.id,
      name: 'hourly-cluster-aggregation',
      targetType: 'job',
      targetPayload: { type: 'report_generation', payload: { period: '1h' } },
      cronExpression: '0 * * * *',
    });
    console.log(`⏱️ Sample Schedule registered: ${sched.name} (${sched.cron_expression})`);

    // 5. Enqueue an initial task
    await JobRepository.createJob({
      organizationId: organization.id,
      type: 'image_resize',
      payload: { width: 1920, height: 1080, format: 'webp' },
      priority: 7,
    });
    console.log(`⚡ Sample background task enqueued in 'default' queue.`);

    console.log('\n🎉 Seeding complete! You are ready to start the PulseMesh stack.');
  } catch (err) {
    console.error('Seeding error:', err.message);
  }
}

seed().then(() => process.exit(0)).catch(() => process.exit(1));
