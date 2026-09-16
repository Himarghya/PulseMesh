import { query, withTransaction } from '../pool.js';
import { randomUUID } from 'crypto';
import { WorkflowRunStatus, WorkflowTaskStatus } from '@pulsemesh/shared';

export class WorkflowRepository {
  /**
   * Creates a workflow with its initial immutable version.
   */
  static async createWorkflow(orgId, name, description, definition) {
    return withTransaction(async (tx) => {
      const workflowId = randomUUID();
      const versionId = randomUUID();

      // 1. Insert Workflow
      const insertWfSql = `
        INSERT INTO workflows (id, organization_id, name, description)
        VALUES ($1, $2, $3, $4)
        RETURNING *;
      `;
      const wfRes = await tx.query(insertWfSql, [workflowId, orgId, name, description]);
      const workflow = wfRes.rows[0];

      // 2. Insert Version 1 (Immutable)
      const insertVerSql = `
        INSERT INTO workflow_versions (id, workflow_id, version, definition)
        VALUES ($1, $2, $3, $4)
        RETURNING *;
      `;
      const verRes = await tx.query(insertVerSql, [versionId, workflowId, 1, definition]);
      const version = verRes.rows[0];

      return { workflow, version };
    });
  }

  static async listWorkflows(orgId) {
    const res = await query('SELECT * FROM workflows WHERE organization_id = $1 ORDER BY created_at DESC;', [orgId]);
    return res.rows;
  }

  static async getWorkflowById(workflowId) {
    const wfRes = await query('SELECT * FROM workflows WHERE id = $1;', [workflowId]);
    const workflow = wfRes.rows[0];
    if (!workflow) return null;

    const verRes = await query(
      'SELECT * FROM workflow_versions WHERE workflow_id = $1 ORDER BY version DESC LIMIT 1;',
      [workflowId]
    );
    const latestVersion = verRes.rows[0] || null;

    return { ...workflow, latestVersion };
  }

  /**
   * Starts a new workflow run and pre-populates its task nodes with deterministic IDs.
   */
  static async startWorkflowRun(workflowVersionId, orgId, input = {}, timeoutMs = 900000) {
    return withTransaction(async (tx) => {
      const runId = randomUUID();

      // 1. Get version definition
      const verRes = await tx.query('SELECT * FROM workflow_versions WHERE id = $1;', [workflowVersionId]);
      const version = verRes.rows[0];
      if (!version) {
        throw new Error(`Workflow version not found: ${workflowVersionId}`);
      }

      const definition = version.definition;

      // 2. Create Workflow Run
      const insertRunSql = `
        INSERT INTO workflow_runs (id, workflow_version_id, organization_id, status, input, timeout_ms)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *;
      `;
      const runRes = await tx.query(insertRunSql, [
        runId,
        workflowVersionId,
        orgId,
        WorkflowRunStatus.RUNNING,
        input,
        timeoutMs,
      ]);
      const run = runRes.rows[0];

      // 3. Pre-populate Task Runs (Deterministic Idempotency per Run)
      for (const task of definition.tasks) {
        const taskRunId = randomUUID();
        const insertTaskSql = `
          INSERT INTO workflow_task_runs (
            id, workflow_run_id, task_id, status, dependencies, inputs
          ) VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING *;
        `;
        await tx.query(insertTaskSql, [
          taskRunId,
          runId,
          task.id,
          WorkflowTaskStatus.PENDING,
          task.dependsOn || [],
          task.payload || {},
        ]);
      }

      return run;
    });
  }

  static async getWorkflowRun(runId) {
    const runRes = await query('SELECT * FROM workflow_runs WHERE id = $1;', [runId]);
    const run = runRes.rows[0];
    if (!run) return null;

    const tasksRes = await query('SELECT * FROM workflow_task_runs WHERE workflow_run_id = $1;', [runId]);
    return { ...run, tasks: tasksRes.rows };
  }

  static async listWorkflowRuns(orgId) {
    const res = await query('SELECT * FROM workflow_runs WHERE organization_id = $1 ORDER BY started_at DESC;', [
      orgId,
    ]);
    return res.rows;
  }

  static async updateTaskRunStatus(workflowRunId, taskId, status, outputs = null) {
    const sql = `
      UPDATE workflow_task_runs
      SET status = $3,
          outputs = COALESCE($4, outputs),
          completed_at = CASE WHEN $3 IN ('succeeded', 'failed', 'skipped') THEN NOW() ELSE completed_at END
      WHERE workflow_run_id = $1 AND task_id = $2
      RETURNING *;
    `;
    const res = await query(sql, [workflowRunId, taskId, status, outputs]);
    return res.rows[0] || null;
  }

  static async completeWorkflowRun(runId, status = 'succeeded', output = null) {
    const sql = `
      UPDATE workflow_runs
      SET status = $2,
          output = $3,
          completed_at = NOW()
      WHERE id = $1
      RETURNING *;
    `;
    const res = await query(sql, [runId, status, output]);
    return res.rows[0] || null;
  }
}
