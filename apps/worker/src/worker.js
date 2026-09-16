import { randomUUID } from 'crypto';
import os from 'os';
import { JobRepository, WorkerRepository } from '@pulsemesh/database';
import { WorkflowRunner } from '@pulsemesh/workflow-engine';
import { WorkerStatus } from '@pulsemesh/shared';
import { getHandler } from './handlers/index.js';

export class WorkerInstance {
  constructor(options = {}) {
    this.workerId = options.id || randomUUID();
    this.queueName = options.queueName || '*';
    this.capacity = options.capacity || Number(process.env.WORKER_CONCURRENCY || 5);
    this.activeJobs = new Map(); // jobId -> { leaseToken, version, timer }
    this.status = WorkerStatus.ONLINE;
    this.isRunning = false;
    this.heartbeatTimer = null;
    this.pollTimer = null;
    this.hostname = os.hostname();
  }

  async start() {
    this.isRunning = true;
    console.log(`⚡ [Worker ${this.workerId}] Starting instance on ${this.hostname} (Capacity: ${this.capacity})`);

    // 1. Send initial heartbeat
    await this.sendHeartbeat();

    // 2. Start periodic heartbeat loop (every 5 seconds)
    this.heartbeatTimer = setInterval(() => this.sendHeartbeat(), 5000);

    // 3. Start task consumption loop
    this.runLoop();

    // 4. Register graceful shutdown handlers
    this.setupGracefulShutdown();
  }

  async sendHeartbeat() {
    try {
      await WorkerRepository.registerHeartbeat({
        id: this.workerId,
        hostname: this.hostname,
        status: this.status,
        activeJobsCount: this.activeJobs.size,
        capacity: this.capacity,
        metadata: {
          uptime: process.uptime(),
          memoryUsageMb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          activeJobIds: Array.from(this.activeJobs.keys()),
        },
      });
    } catch (err) {
      console.warn(`[Worker ${this.workerId}] Heartbeat failed:`, err.message);
    }
  }

  async runLoop() {
    while (this.isRunning) {
      if (this.status === WorkerStatus.DRAINING) {
        if (this.activeJobs.size === 0) {
          console.log(`[Worker ${this.workerId}] Draining complete. Shutting down.`);
          await this.stop();
          break;
        }
        await new Promise((r) => setTimeout(r, 500));
        continue;
      }

      // Check worker capacity
      if (this.activeJobs.size < this.capacity) {
        try {
          const job = await JobRepository.claimNextJob(this.queueName, this.workerId, 30);
          if (job) {
            this.executeJob(job);
          } else {
            // Queue empty, wait briefly before next claim
            await new Promise((r) => setTimeout(r, 500));
          }
        } catch (err) {
          console.error(`[Worker ${this.workerId}] Claim error:`, err.message);
          await new Promise((r) => setTimeout(r, 1000));
        }
      } else {
        // At max capacity, throttle claim attempts
        await new Promise((r) => setTimeout(r, 200));
      }
    }
  }

  async executeJob(job) {
    const { id: jobId, lease_token: leaseToken, version, type, payload } = job;
    this.activeJobs.set(jobId, { leaseToken, version });

    // Periodic heartbeat renewal while executing
    const renewalInterval = setInterval(async () => {
      if (!this.activeJobs.has(jobId)) {
        clearInterval(renewalInterval);
        return;
      }
      const renewed = await JobRepository.renewHeartbeat(jobId, leaseToken, 30);
      if (!renewed) {
        console.warn(`[Worker ${this.workerId}] Lease renewal rejected for job ${jobId}. Stale lease.`);
        clearInterval(renewalInterval);
      }
    }, 10000);

    try {
      const handler = getHandler(type);
      if (!handler) {
        throw new Error(`No registered task handler for type '${type}'`);
      }

      // Execute task handler
      const result = await handler(payload, { jobId, workerId: this.workerId });

      // Conditional commit with fencing token
      const completeRes = await JobRepository.completeJob(jobId, leaseToken, version, result);
      if (!completeRes.success) {
        console.warn(`[Worker ${this.workerId}] Completion rejected for job ${jobId}: ${completeRes.reason}`);
      } else {
        // Check if job belongs to a workflow run
        if (payload?._workflowContext?.workflowRunId) {
          await WorkflowRunner.handleTaskCompletion(
            payload._workflowContext.workflowRunId,
            payload._workflowContext.taskId,
            result
          );
        }
      }
    } catch (err) {
      console.error(`[Worker ${this.workerId}] Execution failed for job ${jobId}:`, err.message);
      const shouldRetry = job.attempt_number < job.max_attempts;

      const failRes = await JobRepository.failJob(
        jobId,
        leaseToken,
        version,
        { message: err.message, stack: err.stack },
        shouldRetry
      );

      if (!shouldRetry && payload?._workflowContext?.workflowRunId) {
        await WorkflowRunner.handleTaskFailure(
          payload._workflowContext.workflowRunId,
          payload._workflowContext.taskId,
          { message: err.message }
        );
      }
    } finally {
      clearInterval(renewalInterval);
      this.activeJobs.delete(jobId);
    }
  }

  async drain() {
    console.log(`[Worker ${this.workerId}] Entering draining mode...`);
    this.status = WorkerStatus.DRAINING;
    await this.sendHeartbeat();
  }

  async stop() {
    this.isRunning = false;
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    await WorkerRepository.markWorkerOffline(this.workerId);
    console.log(`[Worker ${this.workerId}] Stopped gracefully.`);
  }

  setupGracefulShutdown() {
    const onSignal = async (signal) => {
      console.log(`\n[Worker ${this.workerId}] Received ${signal}. Starting graceful drain...`);
      await this.drain();
      if (this.activeJobs.size === 0) {
        await this.stop();
        process.exit(0);
      }
    };

    process.on('SIGINT', () => onSignal('SIGINT'));
    process.on('SIGTERM', () => onSignal('SIGTERM'));
  }
}
