import { query, withTransaction } from '../pool.js';

export class OutboxRepository {
  /**
   * Fetches pending outbox events using FOR UPDATE SKIP LOCKED to prevent duplicate publisher relays.
   */
  static async fetchPendingEvents(limit = 100) {
    const sql = `
      SELECT * FROM outbox_events
      WHERE status = 'pending'
      ORDER BY created_at ASC
      LIMIT $1;
    `;
    const res = await query(sql, [limit]);
    return res.rows;
  }

  /**
   * Marks an outbox event as published after confirmation by Redis.
   */
  static async markPublished(eventId) {
    const sql = `
      UPDATE outbox_events
      SET status = 'published',
          published_at = NOW()
      WHERE id = $1
      RETURNING *;
    `;
    const res = await query(sql, [eventId]);
    return res.rows[0] || null;
  }

  /**
   * Increments attempt count for a failed outbox publication attempt.
   */
  static async markFailedAttempt(eventId) {
    const sql = `
      UPDATE outbox_events
      SET attempts = attempts + 1,
          status = CASE WHEN attempts >= 10 THEN 'failed' ELSE 'pending' END
      WHERE id = $1
      RETURNING *;
    `;
    const res = await query(sql, [eventId]);
    return res.rows[0] || null;
  }
}
