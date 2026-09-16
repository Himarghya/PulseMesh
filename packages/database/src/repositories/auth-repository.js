import { query, withTransaction } from '../pool.js';
import { randomUUID } from 'crypto';
import { hashPassword, hashApiKey, generateApiKey, UserRole } from '@pulsemesh/shared';

export class AuthRepository {
  /**
   * Registers a user and creates their default tenant organization.
   */
  static async registerUser(email, password, fullName, orgName) {
    return withTransaction(async (tx) => {
      const userId = randomUUID();
      const orgId = randomUUID();
      const pwdHash = hashPassword(password);
      const slug = (orgName || fullName).toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + Math.floor(Math.random() * 1000);

      // 1. Create Organization
      const orgRes = await tx.query(
        'INSERT INTO organizations (id, name, slug) VALUES ($1, $2, $3) RETURNING *;',
        [orgId, orgName || `${fullName}'s Workspace`, slug]
      );
      const organization = orgRes.rows[0];

      // 2. Create User
      const userRes = await tx.query(
        'INSERT INTO users (id, email, password_hash, full_name) VALUES ($1, $2, $3, $4) RETURNING id, email, full_name, created_at;',
        [userId, email, pwdHash, fullName]
      );
      const user = userRes.rows[0];

      // 3. Create Membership as Owner
      await tx.query(
        'INSERT INTO organization_members (id, organization_id, user_id, role) VALUES ($1, $2, $3, $4);',
        [randomUUID(), orgId, userId, UserRole.OWNER]
      );

      return { user, organization, role: UserRole.OWNER };
    });
  }

  static async findUserByEmail(email) {
    const res = await query('SELECT * FROM users WHERE email = $1;', [email]);
    return res.rows[0] || null;
  }

  static async getUserContext(userId) {
    const userRes = await query('SELECT id, email, full_name, created_at FROM users WHERE id = $1;', [userId]);
    const user = userRes.rows[0];
    if (!user) return null;

    const memberRes = await query(
      `SELECT om.role, o.id as organization_id, o.name as organization_name, o.slug as organization_slug
       FROM organization_members om
       JOIN organizations o ON om.organization_id = o.id
       WHERE om.user_id = $1
       LIMIT 1;`,
      [userId]
    );
    const membership = memberRes.rows[0] || null;

    return { user, membership };
  }

  static async createApiKey(orgId, name, expiresInDays = null) {
    const { key, hash, prefix } = generateApiKey();
    const expiresAt = expiresInDays ? new Date(Date.now() + expiresInDays * 86400000).toISOString() : null;

    const sql = `
      INSERT INTO api_keys (id, organization_id, name, key_hash, prefix, expires_at)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, organization_id, name, prefix, expires_at, created_at;
    `;
    const res = await query(sql, [randomUUID(), orgId, name, hash, prefix, expiresAt]);
    return { ...res.rows[0], rawApiKey: key };
  }

  static async validateApiKey(rawKey) {
    const hash = hashApiKey(rawKey);
    const sql = `
      SELECT ak.*, o.name as organization_name, o.slug as organization_slug
      FROM api_keys ak
      JOIN organizations o ON ak.organization_id = o.id
      WHERE ak.key_hash = $1
        AND ak.revoked_at IS NULL
        AND (ak.expires_at IS NULL OR ak.expires_at > NOW());
    `;
    const res = await query(sql, [hash]);
    return res.rows[0] || null;
  }

  static async listApiKeys(orgId) {
    const res = await query(
      'SELECT id, name, prefix, revoked_at, expires_at, created_at FROM api_keys WHERE organization_id = $1 ORDER BY created_at DESC;',
      [orgId]
    );
    return res.rows;
  }

  static async revokeApiKey(id, orgId) {
    const res = await query(
      'UPDATE api_keys SET revoked_at = NOW() WHERE id = $1 AND organization_id = $2 RETURNING *;',
      [id, orgId]
    );
    return res.rowCount === 1;
  }

  static async recordAuditLog(orgId, userId, action, resourceType, resourceId, metadata = {}, ipAddress = null) {
    const sql = `
      INSERT INTO audit_logs (id, organization_id, user_id, action, resource_type, resource_id, metadata, ip_address)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *;
    `;
    const res = await query(sql, [
      randomUUID(),
      orgId,
      userId,
      action,
      resourceType,
      resourceId,
      metadata,
      ipAddress,
    ]);
    return res.rows[0];
  }
}
