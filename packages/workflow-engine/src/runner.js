import {
  getReadyTasks,
  interpolatePayload,
  evaluateCondition,
  WorkflowRunStatus,
  WorkflowTaskStatus,
} from '@pulsemesh/shared';
import { JobRepository, WorkflowRepository } from '@pulsemesh/database';

export class WorkflowRunner {
  /**
   * Evaluates the current state of a workflow run:
   * 1. Finds tasks whose dependencies have succeeded
   * 2. Evaluates conditional branches (skipping if condition is false)
   * 3. Interpolates outputs from completed upstream tasks
   * 4. Enqueues new jobs for ready tasks
   * 5. Marks workflow as succeeded or failed when appropriate
   */
  static async processWorkflowRun(runId) {
    const run = await WorkflowRepository.getWorkflowRun(runId);
    if (!run || run.status !== WorkflowRunStatus.RUNNING) {
      return { status: run?.status || 'not_found' };
    }

    const taskRuns = run.tasks || [];
    const completedTaskIds = new Set();
    const failedTaskIds = new Set();
    const skippedTaskIds = new Set();
    const inFlightOrFinishedTaskIds = new Set();
    const taskOutputs = {};

    for (const tr of taskRuns) {
      if (tr.status === WorkflowTaskStatus.SUCCEEDED) {
        completedTaskIds.add(tr.task_id);
        inFlightOrFinishedTaskIds.add(tr.task_id);
        taskOutputs[tr.task_id] = { outputs: tr.outputs || {}, status: tr.status };
      } else if (tr.status === WorkflowTaskStatus.SKIPPED) {
        completedTaskIds.add(tr.task_id); // Skipped tasks don't block downstream joins
        skippedTaskIds.add(tr.task_id);
        inFlightOrFinishedTaskIds.add(tr.task_id);
        taskOutputs[tr.task_id] = { outputs: {}, status: tr.status };
      } else if (tr.status === WorkflowTaskStatus.FAILED) {
        failedTaskIds.add(tr.task_id);
        inFlightOrFinishedTaskIds.add(tr.task_id);
      } else if (tr.status === WorkflowTaskStatus.RUNNING || tr.status === WorkflowTaskStatus.QUEUED) {
        inFlightOrFinishedTaskIds.add(tr.task_id);
      }
    }

    // If any task failed, fail the workflow run
    if (failedTaskIds.size > 0) {
      await WorkflowRepository.completeWorkflowRun(runId, WorkflowRunStatus.FAILED, {
        failedTasks: Array.from(failedTaskIds),
      });
      return { status: WorkflowRunStatus.FAILED, failedTasks: Array.from(failedTaskIds) };
    }

    // If all tasks are completed or skipped, complete the workflow
    if (completedTaskIds.size === taskRuns.length) {
      const finalOutput = {};
      for (const [taskId, data] of Object.entries(taskOutputs)) {
        finalOutput[taskId] = data.outputs;
      }
      await WorkflowRepository.completeWorkflowRun(runId, WorkflowRunStatus.SUCCEEDED, finalOutput);
      return { status: WorkflowRunStatus.SUCCEEDED, output: finalOutput };
    }

    // Find ready tasks
    const tasksDef = taskRuns.map((tr) => ({
      id: tr.task_id,
      dependsOn: tr.dependencies,
      type: tr.type || 'data_transform',
      payload: tr.inputs || {},
      condition: tr.condition,
    }));

    const readyTasks = getReadyTasks(tasksDef, completedTaskIds, inFlightOrFinishedTaskIds);
    const context = { input: run.input, tasks: taskOutputs };

    for (const readyTask of readyTasks) {
      // Check conditional branch
      if (readyTask.condition && !evaluateCondition(readyTask.condition, context)) {
        // Skip this task
        await WorkflowRepository.updateTaskRunStatus(runId, readyTask.id, WorkflowTaskStatus.SKIPPED, {});
        continue;
      }

      // Interpolate payload
      const resolvedPayload = interpolatePayload(readyTask.payload, context);

      // Create a background job for this task
      const job = await JobRepository.createJob({
        organizationId: run.organization_id,
        queueName: 'default',
        type: readyTask.type || 'data_transform',
        payload: {
          ...resolvedPayload,
          _workflowContext: {
            workflowRunId: runId,
            taskId: readyTask.id,
          },
        },
        priority: 7, // Workflow steps get higher priority
      });

      // Update task run status to queued
      await WorkflowRepository.updateTaskRunStatus(runId, readyTask.id, WorkflowTaskStatus.QUEUED);
    }

    return { status: WorkflowRunStatus.RUNNING, dispatchedTasksCount: readyTasks.length };
  }

  /**
   * Called by workers when a workflow task job completes
   */
  static async handleTaskCompletion(workflowRunId, taskId, outputs = {}) {
    await WorkflowRepository.updateTaskRunStatus(
      workflowRunId,
      taskId,
      WorkflowTaskStatus.SUCCEEDED,
      outputs
    );
    // Process next ready steps in DAG
    return this.processWorkflowRun(workflowRunId);
  }

  /**
   * Called by workers when a workflow task job fails permanently
   */
  static async handleTaskFailure(workflowRunId, taskId, error = {}) {
    await WorkflowRepository.updateTaskRunStatus(workflowRunId, taskId, WorkflowTaskStatus.FAILED, { error });
    return this.processWorkflowRun(workflowRunId);
  }
}
