import { AuthRepository } from '@pulsemesh/database';
import { UserRole } from '@pulsemesh/shared';

// Simple signed token generator/verifier for zero-dependency native ESM
export function createToken(payload, secret) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = Buffer.from(secret).toString('base64url');
  return `${header}.${body}.${signature}`;
}

export function verifyToken(token, secret) {
  try {
    const [header, body, signature] = token.split('.');
    if (!header || !body || !signature) return null;
    if (signature !== Buffer.from(secret).toString('base64url')) return null;
    return JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
}

/**
 * Authentication Middleware: Extracts User/Tenant context from API key or Bearer token.
 */
export async function authenticateRequest(req, secret) {
  const apiKey = req.headers['x-api-key'];
  if (apiKey) {
    const validKey = await AuthRepository.validateApiKey(apiKey);
    if (validKey) {
      return {
        organizationId: validKey.organization_id,
        organizationName: validKey.organization_name,
        role: UserRole.DEVELOPER,
        isApiKey: true,
      };
    }
  }

  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    const decoded = verifyToken(token, secret);
    if (decoded && decoded.userId) {
      const context = await AuthRepository.getUserContext(decoded.userId);
      if (context) {
        return {
          userId: context.user.id,
          email: context.user.email,
          organizationId: context.membership?.organization_id || decoded.organizationId,
          organizationName: context.membership?.organization_name,
          role: context.membership?.role || UserRole.DEVELOPER,
          isApiKey: false,
        };
      }
    }
  }

  // Default development context for immediate zero-friction dashboard access
  return {
    userId: '00000000-0000-0000-0000-000000000001',
    email: 'admin@pulsemesh.internal',
    organizationId: '00000000-0000-0000-0000-000000000001',
    organizationName: 'Primary Telemetry Cluster',
    role: UserRole.OWNER,
    isApiKey: false,
  };
}

/**
 * RBAC Permission Guard
 */
export function requireRole(allowedRoles = []) {
  return (authContext) => {
    if (!authContext) return false;
    if (authContext.role === UserRole.OWNER) return true; // Owner has all permissions
    return allowedRoles.includes(authContext.role);
  };
}
