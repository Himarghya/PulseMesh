import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { memoryDb } from '@pulsemesh/database';
import { JobRepository, WorkflowRepository, ScheduleRepository } from '@pulsemesh/database';
import { validateAndSortDAG, getReadyTasks, JobStatus } from '@pulsemesh/shared';
import { randomUUID } from 'crypto';

describe('PulseMesh Distributed Systems Invariant Suite', () => {
  beforeEach(() => {
    memoryDb.reset();
  });

  it('Invariant 1: Mutual Lease Exclusivity - A job cannot have two active valid leases simultaneously', async () => {
    const orgId = randomUUID();
    const job = await JobRepository.createJob({
      organizationId: orgId,
      type: 'image_resize',
      payload: { width: 800 },
    });

    // Worker 1 claims job
    const claim1 = await JobRepository.claimNextJob('default', 'worker-1', 30);
    assert.ok(claim1, 'Worker 1 should claim the job');
    assert.strictEqual(claim1.leased_by_worker_id, 'worker-1');

    // Worker 2 attempts to claim while Worker 1 holds the lease
    const claim2 = await JobRepository.claimNextJob('default', 'worker-2', 30);
    assert.strictEqual(claim2, null, 'Worker 2 must be prevented from claiming an actively leased job');
  });

  it('Invariant 2: State Monotonicity - A succeeded or terminal job cannot return to running or queued', async () => {
    const orgId = randomUUID();
    const job = await JobRepository.createJob({
      organizationId: orgId,
      type: 'report_generation',
      payload: {},
    });

    const claimed = await JobRepository.claimNextJob('default', 'worker-1', 30);
    const completeRes = await JobRepository.completeJob(claimed.id, claimed.lease_token, claimed.version, { done: true });
    assert.strictEqual(completeRes.success, true);

    // Attempt invalid state transition from succeeded back to running
    const illegalClaim = await JobRepository.claimNextJob('default', 'worker-2', 30);
    assert.strictEqual(illegalClaim, null, 'Succeeded job must never be claimed again');
  });

  it('Invariant 3: Fencing Token Enforcement - Stale worker mutations are rejected', async () => {
    const orgId = randomUUID();
    const job = await JobRepository.createJob({
      organizationId: orgId,
      type: 'csv_processing',
      payload: { rowCount: 100 },
    });

    // Attempt 1: Worker A claims the job
    const attempt1 = await JobRepository.claimNextJob('default', 'worker-A', 30);
    const oldLeaseToken = attempt1.lease_token;
    const oldVersion = attempt1.version;

    // Simulate recovery service re-queuing the job after simulated timeout
    await JobRepository.retryJob(attempt1.id);

    // Attempt 2: Worker B claims the job with a new lease token
    const attempt2 = await JobRepository.claimNextJob('default', 'worker-B', 30);
    assert.notStrictEqual(attempt2.lease_token, oldLeaseToken);

    // Zombie Worker A wakes up and attempts to commit completion using stale lease token
    const zombieCommit = await JobRepository.completeJob(attempt1.id, oldLeaseToken, oldVersion, {
      staleResult: true,
    });

    assert.strictEqual(zombieCommit.success, false, 'Stale worker mutation must be rejected');
    assert.strictEqual(zombieCommit.reason, 'STALE_LEASE_REJECTED');
  });

  it('Invariant 4: DAG Precedence - No task executes before 100% of prerequisites succeed', () => {
    const tasks = [
      { id: 'extract', type: 'csv_processing', dependsOn: [] },
      { id: 'transform', type: 'data_transform', dependsOn: ['extract'] },
      { id: 'load', type: 'report_generation', dependsOn: ['transform'] },
    ];

    // Initial state: nothing completed
    const readyAtStart = getReadyTasks(tasks, new Set(), new Set());
    assert.deepStrictEqual(readyAtStart.map((t) => t.id), ['extract']);

    // Extract completed
    const readyAfterExtract = getReadyTasks(tasks, new Set(['extract']), new Set(['extract']));
    assert.deepStrictEqual(readyAfterExtract.map((t) => t.id), ['transform']);

    // Transform completed
    const readyAfterTransform = getReadyTasks(
      tasks,
      new Set(['extract', 'transform']),
      new Set(['extract', 'transform'])
    );
    assert.deepStrictEqual(readyAfterTransform.map((t) => t.id), ['load']);
  });

  it('Invariant 5: Idempotency Uniqueness - Duplicate submissions create exactly one physical job', async () => {
    const orgId = randomUUID();
    const idempotencyKey = 'req_payment_invoice_98765';

    const job1 = await JobRepository.createJob({
      organizationId: orgId,
      type: 'mock_payment',
      payload: { amount: 500 },
      idempotencyKey,
    });

    const job2 = await JobRepository.createJob({
      organizationId: orgId,
      type: 'mock_payment',
      payload: { amount: 500 },
      idempotencyKey,
    });

    assert.strictEqual(job1.id, job2.id, 'Idempotency key must return the exact same physical job');
    const allJobs = await JobRepository.listJobs(orgId);
    assert.strictEqual(allJobs.length, 1, 'Only one physical job record should exist in storage');
  });

  it('Invariant 6: Scheduler Deduplication - Concurrent triggers on the same tick produce 1 run', async () => {
    const schedId = randomUUID();
    const tickTime = '2026-09-16T12:00:00.000Z';

    const trigger1 = await ScheduleRepository.recordExecution(schedId, tickTime, 'entity-1');
    const trigger2 = await ScheduleRepository.recordExecution(schedId, tickTime, 'entity-2');

    assert.strictEqual(trigger1.success, true, 'First scheduler tick execution must succeed');
    assert.strictEqual(trigger2.success, false, 'Duplicate scheduler tick must be deduplicated and rejected');
  });
});
