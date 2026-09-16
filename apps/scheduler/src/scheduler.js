import { query, JobRepository, WorkflowRepository, ScheduleRepository } from '@pulsemesh/database';
import { WorkflowRunner } from '@pulsemesh/workflow-engine';

export class SchedulerService {
  constructor(pollIntervalMs = 1000) {
    this.pollIntervalMs = pollIntervalMs;
    this.isRunning = false;
    this.timer = null;
  }

  async start() {
    this.isRunning = true;
    console.log(`⏱️ [Scheduler Service] Started with ${this.pollIntervalMs}ms poll interval.`);
    this.timer = setInterval(() => this.tick(), this.pollIntervalMs);
  }

  async tick() {
    try {
      // Find active schedules due for execution
      const res = await query(`
        SELECT * FROM schedules
        WHERE status = 'active'
          AND next_run_at <= NOW()
        ORDER BY next_run_at ASC;
      `);

      for (const schedule of res.rows) {
        await this.processSchedule(schedule);
      }
    } catch (err) {
      console.error('[Scheduler Service] Error during tick:', err.message);
    }
  }

  async processSchedule(schedule) {
    const scheduledAt = schedule.next_run_at;

    // 1. Deterministic Execution Lock / Deduplication Guard
    const execRecord = await ScheduleRepository.recordExecution(schedule.id, scheduledAt);
    if (!execRecord.success) {
      // Another scheduler instance already claimed this tick
      return;
    }

    console.log(`⏱️ [Scheduler Service] Firing schedule '${schedule.name}' (${schedule.id}) for tick ${scheduledAt}`);

    let triggeredEntityId = null;

    try {
      if (schedule.target_type === 'job') {
        const job = await JobRepository.createJob({
          organizationId: schedule.organization_id,
          type: schedule.target_payload.type || 'scheduled_task',
          payload: schedule.target_payload.payload || {},
          priority: schedule.target_payload.priority || 6,
        });
        triggeredEntityId = job.id;
      } else if (schedule.target_type === 'workflow') {
        const wf = await WorkflowRepository.getWorkflowById(schedule.target_payload.workflowId);
        if (wf && wf.latestVersion) {
          const run = await WorkflowRepository.startWorkflowRun(
            wf.latestVersion.id,
            schedule.organization_id,
            schedule.target_payload.input || {}
          );
          await WorkflowRunner.processWorkflowRun(run.id);
          triggeredEntityId = run.id;
        }
      }

      // Update next_run_at (Calculated + 60s for simple periodic or standard interval)
      const nextRunAt = new Date(Date.now() + 60000).toISOString();
      await ScheduleRepository.updateSchedule(schedule.id, { nextRunAt });
    } catch (err) {
      console.error(`[Scheduler Service] Failed executing schedule ${schedule.id}:`, err.message);
    }
  }

  stop() {
    this.isRunning = false;
    if (this.timer) clearInterval(this.timer);
    console.log('[Scheduler Service] Stopped.');
  }
}
