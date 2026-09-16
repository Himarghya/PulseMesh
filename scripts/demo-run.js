import { initDbPool, AuthRepository, WorkflowRepository, JobRepository } from '@pulsemesh/database';
import { WorkflowRunner } from '@pulsemesh/workflow-engine';
import { getHandler } from '../apps/worker/src/handlers/index.js';

async function runDemo() {
  console.log('🎬 [PulseMesh Demo] Initiating Live Recruiter Demo Sequence...\n');
  initDbPool();

  // 1. Setup Tenant
  console.log('1️⃣ Authenticating Tenant & Generating API Key...');
  const { organization } = await AuthRepository.registerUser(
    `demo_${Date.now()}@pulsemesh.internal`,
    'Password123!',
    'DevOps Orchestrator',
    'Quantum Data Labs'
  );
  console.log(`   Tenant: ${organization.name} (${organization.id})\n`);

  // 2. Define 4-Step DAG
  console.log('2️⃣ Defining 4-Step DAG Workflow with Parallel Branches...');
  const dagDef = {
    name: 'parallel-etl-orchestration',
    description: 'Concurrent branch execution with join aggregation',
    tasks: [
      { id: 'fetch_data', type: 'csv_processing', dependsOn: [], payload: { rowCount: 3000 } },
      { id: 'resize_thumbnails', type: 'image_resize', dependsOn: [], payload: { width: 1024, height: 768 } },
      { id: 'aggregate_report', type: 'report_generation', dependsOn: ['fetch_data', 'resize_thumbnails'], payload: { reportType: 'multi_branch_summary' } },
      { id: 'settle_audit', type: 'mock_payment', dependsOn: ['aggregate_report'], payload: { amount: 850 } },
    ],
  };

  const wf = await WorkflowRepository.createWorkflow(organization.id, dagDef.name, dagDef.description, dagDef);
  console.log(`   Workflow Created: ${wf.workflow.name} (Version ID: ${wf.version.id})\n`);

  // 3. Start Workflow Run
  console.log('3️⃣ Triggering Workflow Run Execution...');
  const run = await WorkflowRepository.startWorkflowRun(wf.version.id, organization.id, { batchId: 'DEMO_2026' });
  console.log(`   Run ID: ${run.id} (Status: ${run.status})\n`);

  // 4. Initial Ready Tasks
  console.log('4️⃣ Workflow Engine Evaluates In-Degree Counters...');
  await WorkflowRunner.processWorkflowRun(run.id);

  // 5. Worker execution loop
  console.log('5️⃣ Simulating Worker Fleet Processing DAG Nodes in Parallel...\n');

  let active = true;
  while (active) {
    const job = await JobRepository.claimNextJob('default', 'demo-worker-node', 30);
    if (!job) {
      const updatedRun = await WorkflowRepository.getWorkflowRun(run.id);
      if (updatedRun.status === 'succeeded' || updatedRun.status === 'failed') {
        console.log(`\n🎉 Workflow Run Completed with Status: ${updatedRun.status.toUpperCase()}!`);
        console.log('📊 Final Aggregated Outputs:');
        console.log(JSON.stringify(updatedRun.output, null, 2));
        active = false;
        break;
      }
      await new Promise((r) => setTimeout(r, 200));
      continue;
    }

    const taskId = job.payload?._workflowContext?.taskId || job.type;
    console.log(`   ⚡ [Worker] Claimed Task Node: '${taskId}' (Attempt ${job.attempt_number})`);

    const handler = getHandler(job.type);
    const result = await handler(job.payload, { jobId: job.id, workerId: 'demo-worker-node' });
    await JobRepository.completeJob(job.id, job.lease_token, job.version, result);

    if (job.payload?._workflowContext?.workflowRunId) {
      console.log(`   ✅ [Worker] Succeeded Task: '${taskId}'. Advancing DAG graph...`);
      await WorkflowRunner.handleTaskCompletion(
        job.payload._workflowContext.workflowRunId,
        job.payload._workflowContext.taskId,
        result
      );
    }
  }

  console.log('\n🏁 Demo sequence completed flawlessly!');
}

runDemo().catch((err) => {
  console.error('Demo error:', err);
  process.exit(1);
});
