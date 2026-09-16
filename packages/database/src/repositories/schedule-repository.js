import { query, withTransaction } from '../pool.js';
import { randomUUID } from 'crypto';

export class ScheduleRepository {
  static async createSchedule(scheduleData) {
    const sql = `
      INSERT INTO schedules (
        id, organization_id, name, target_type, target_payload,
        cron_expression, timezone, status, next_run_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *;
    `;
    const res = await query(sql, [
      scheduleData.id || randomUUID(),
      scheduleData.organizationId,
      scheduleData.name,
      scheduleData.targetType,
      scheduleData.targetPayload || {},
      scheduleData.cronExpression,
      scheduleData.timezone || 'UTC',
      scheduleData.status || 'active',
      scheduleData.nextRunAt || new Date().toISOString(),
    ]);
    return res.rows[0];
  }

  static async listSchedules(organizationId) {
    const res = await query('SELECT * FROM schedules WHERE organization_id = $1 ORDER BY created_at DESC;', [
      organizationId,
    ]);
    return res.rows;
  }

  static async getScheduleById(id) {
    const res = await query('SELECT * FROM schedules WHERE id = $1;', [id]);
    return res.rows[0] || null;
  }

  static async updateSchedule(id, updates) {
    const sql = `
      UPDATE schedules
      SET name = COALESCE($2, name),
          cron_expression = COALESCE($3, cron_expression),
          status = COALESCE($4, status),
          next_run_at = COALESCE($5, next_run_at)
      WHERE id = $1
      RETURNING *;
    `;
    const res = await query(sql, [id, updates.name, updates.cronExpression, updates.status, updates.nextRunAt]);
    return res.rows[0] || null;
  }

  static async deleteSchedule(id) {
    const res = await query('DELETE FROM schedules WHERE id = $1 RETURNING *;', [id]);
    return res.rowCount === 1;
  }

  /**
   * Deterministic Trigger Execution Guard:
   * Guarantees that across multiple distributed scheduler instances, only ONE execution is created for a given tick.
   */
  static async recordExecution(scheduleId, scheduledAt, triggeredEntityId = null) {
    try {
      const sql = `
        INSERT INTO schedule_executions (id, schedule_id, scheduled_at, status, triggered_entity_id)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (schedule_id, scheduled_at) DO NOTHING
        RETURNING *;
      `;
      const res = await query(sql, [randomUUID(), scheduleId, scheduledAt, 'triggered', triggeredEntityId]);
      return { success: res.rowCount === 1, execution: res.rows[0] || null };
    } catch {
      return { success: false, duplicate: true };
    }
  }

  static async getExecutionHistory(scheduleId) {
    const res = await query(
      'SELECT * FROM schedule_executions WHERE schedule_id = $1 ORDER BY scheduled_at DESC LIMIT 50;',
      [scheduleId]
    );
    return res.rows;
  }
}
