import { query } from '../pool.js';
import { WorkerStatus } from '@pulsemesh/shared';

export class WorkerRepository {
  /**
   * Registers or updates a worker's heartbeat and telemetry metrics.
   */
  static async registerHeartbeat(workerData) {
    const sql = `
      INSERT INTO workers (
        id, hostname, ip_address, status, active_jobs_count, capacity, last_heartbeat_at, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), $7)
      ON CONFLICT (id) DO UPDATE
      SET status = EXCLUDED.status,
          active_jobs_count = EXCLUDED.active_jobs_count,
          capacity = EXCLUDED.capacity,
          last_heartbeat_at = NOW(),
          metadata = EXCLUDED.metadata
      RETURNING *;
    `;
    const res = await query(sql, [
      workerData.id,
      workerData.hostname || 'localhost',
      workerData.ipAddress || '127.0.0.1',
      workerData.status || WorkerStatus.ONLINE,
      workerData.activeJobsCount || 0,
      workerData.capacity || 5,
      workerData.metadata || {},
    ]);
    return res.rows[0];
  }

  static async listWorkers() {
    const res = await query('SELECT * FROM workers ORDER BY last_heartbeat_at DESC;');
    return res.rows;
  }

  static async getWorkerById(workerId) {
    const res = await query('SELECT * FROM workers WHERE id = $1;', [workerId]);
    return res.rows[0] || null;
  }

  static async setWorkerDraining(workerId) {
    const res = await query(
      "UPDATE workers SET status = 'draining', last_heartbeat_at = NOW() WHERE id = $1 RETURNING *;",
      [workerId]
    );
    return res.rows[0] || null;
  }

  /**
   * Finds workers whose heartbeats have expired beyond the timeout threshold.
   */
  static async findStaleWorkers(timeoutSeconds = 15) {
    const sql = `
      SELECT * FROM workers
      WHERE status != 'offline'
        AND last_heartbeat_at < NOW() - ($1 || ' seconds')::INTERVAL;
    `;
    const res = await query(sql, [timeoutSeconds]);
    return res.rows;
  }

  static async markWorkerOffline(workerId) {
    const res = await query(
      "UPDATE workers SET status = 'offline', active_jobs_count = 0 WHERE id = $1 RETURNING *;",
      [workerId]
    );
    return res.rows[0] || null;
  }
}
