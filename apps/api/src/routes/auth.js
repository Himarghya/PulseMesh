import { AuthRepository } from '@pulsemesh/database';
import { verifyPassword } from '@pulsemesh/shared';
import { createToken } from '../middleware/auth.js';
import { config } from '../config.js';

export async function handleAuthRoutes(req, res, url, body, authContext) {
  // POST /api/v1/auth/register
  if (url.pathname === '/api/v1/auth/register' && req.method === 'POST') {
    const { email, password, fullName, organizationName } = body || {};
    if (!email || !password || !fullName) {
      return sendJson(res, 400, { error: { code: 'INVALID_INPUT', message: 'Missing required fields' } });
    }

    try {
      const existing = await AuthRepository.findUserByEmail(email);
      if (existing) {
        return sendJson(res, 409, { error: { code: 'USER_EXISTS', message: 'User already exists with this email' } });
      }

      const { user, organization, role } = await AuthRepository.registerUser(email, password, fullName, organizationName);
      const token = createToken({ userId: user.id, organizationId: organization.id, role }, config.jwtSecret);

      return sendJson(res, 201, {
        success: true,
        data: { user, organization, token },
      });
    } catch (err) {
      return sendJson(res, 500, { error: { code: 'INTERNAL_ERROR', message: err.message } });
    }
  }

  // POST /api/v1/auth/login
  if (url.pathname === '/api/v1/auth/login' && req.method === 'POST') {
    const { email, password } = body || {};
    if (!email || !password) {
      return sendJson(res, 400, { error: { code: 'INVALID_INPUT', message: 'Email and password required' } });
    }

    const user = await AuthRepository.findUserByEmail(email);
    if (!user || !verifyPassword(password, user.password_hash)) {
      return sendJson(res, 401, { error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' } });
    }

    const context = await AuthRepository.getUserContext(user.id);
    const token = createToken(
      {
        userId: user.id,
        organizationId: context.membership?.organization_id,
        role: context.membership?.role,
      },
      config.jwtSecret
    );

    return sendJson(res, 200, {
      success: true,
      data: {
        user: { id: user.id, email: user.email, fullName: user.full_name },
        organization: context.membership,
        token,
      },
    });
  }

  // GET /api/v1/auth/me
  if (url.pathname === '/api/v1/auth/me' && req.method === 'GET') {
    if (!authContext) {
      return sendJson(res, 401, { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
    }
    return sendJson(res, 200, { success: true, data: authContext });
  }

  // POST /api/v1/api-keys
  if (url.pathname === '/api/v1/api-keys' && req.method === 'POST') {
    if (!authContext) {
      return sendJson(res, 401, { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
    }
    const { name, expiresInDays } = body || {};
    const keyRecord = await AuthRepository.createApiKey(authContext.organizationId, name || 'API Key', expiresInDays);
    return sendJson(res, 201, { success: true, data: keyRecord });
  }

  // GET /api/v1/api-keys
  if (url.pathname === '/api/v1/api-keys' && req.method === 'GET') {
    if (!authContext) {
      return sendJson(res, 401, { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
    }
    const keys = await AuthRepository.listApiKeys(authContext.organizationId);
    return sendJson(res, 200, { success: true, data: keys });
  }

  // DELETE /api/v1/api-keys/:id
  if (url.pathname.startsWith('/api/v1/api-keys/') && req.method === 'DELETE') {
    if (!authContext) {
      return sendJson(res, 401, { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
    }
    const keyId = url.pathname.split('/')[4];
    await AuthRepository.revokeApiKey(keyId, authContext.organizationId);
    return sendJson(res, 200, { success: true, message: 'API key revoked' });
  }

  return false;
}

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
  return true;
}
