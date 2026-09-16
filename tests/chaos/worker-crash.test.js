import { memoryDb, JobRepository, WorkerRepository } from '@pulsemesh/database';
import { RecoveryService } from '../../apps/recovery/src/recovery.js';
import { randomUUID } from 'crypto';

async function runChaosTest() {
  console.log('🧪 [Chaos Suite] Starting Worker Crash & Fencing Rejection Simulation...\n');
  memoryDb.reset();

  const orgId = randomUUID();

  // 1. Submit Job
  console.log('1️⃣ Submitting high-priority background job...');
  const job = await JobRepository.createJob({
    organizationId: orgId,
    type: 'csv_processing',
    payload: { rowCount: 10000 },
    priority: 8,
  });
  console.log(`   Job ID: ${job.id} (Status: ${job.status})\n`);

  // 2. Worker 1 claims job
  console.log('2️⃣ Worker Node A claims the job (Attempt 1)...');
  const claimA = await JobRepository.claimNextJob('default', 'worker-node-A', 5); // 5s lease
  console.log(`   Worker Node A received Lease Token: ${claimA.lease_token}`);
  console.log(`   Execution Generation: ${claimA.execution_generation}\n`);

  // 3. Worker Node A crashes
  console.log('3️⃣ Simulating Worker Node A network partition / process crash...');
  // Sleep / wait for lease to expire
  console.log('   Waiting for lease duration to expire...');
  // Force lease expiration in memory
  const target = memoryDb.tables.jobs.get(job.id);
  target.leased_until = new Date(Date.now() - 1000).toISOString();

  // 4. Recovery service runs
  console.log('4️⃣ Recovery Watchdog scans for abandoned leases...');
  const recovery = new RecoveryService({ staleWorkerTimeoutSeconds: 5 });
  await recovery.recoverExpiredLeases();
  console.log(`   Job status after recovery: ${target.status} (Re-queued for healthy workers)\n`);

  // 5. Worker Node B claims the resurrected job
  console.log('5️⃣ Worker Node B claims the resurrected job (Attempt 2)...');
  const claimB = await JobRepository.claimNextJob('default', 'worker-node-B', 30);
  console.log(`   Worker Node B received New Lease Token: ${claimB.lease_token}`);
  console.log(`   Execution Generation: ${claimB.execution_generation}\n`);

  // 6. Zombie Worker Node A wakes up and attempts to commit completion with stale token
  console.log('6️⃣ Zombie Worker Node A wakes up and attempts to commit with stale lease token...');
  const zombieCommit = await JobRepository.completeJob(
    job.id,
    claimA.lease_token,
    claimA.version,
    { completedBy: 'zombie-worker-A' }
  );

  console.log(`   Mutation Result: ${zombieCommit.success ? 'ACCEPTED' : 'REJECTED'}`);
  console.log(`   Rejection Reason: ${zombieCommit.reason || 'None'}`);

  if (zombieCommit.success) {
    throw new Error('❌ FENCING FAILURE: Stale worker mutation was incorrectly accepted!');
  }
  console.log('   ✅ Correctness Verified: Stale mutation was blocked by fencing token.\n');

  // 7. Worker Node B successfully commits
  console.log('7️⃣ Worker Node B commits valid completion...');
  const validCommit = await JobRepository.completeJob(
    job.id,
    claimB.lease_token,
    claimB.version,
    { completedBy: 'healthy-worker-B', rowsProcessed: 10000 }
  );

  console.log(`   Final Job Status: ${validCommit.job.status}`);
  console.log('   ✅ Chaos & Recovery Simulation Passed Successfully!\n');
}

runChaosTest().catch((err) => {
  console.error('Chaos test failed:', err);
  process.exit(1);
});
