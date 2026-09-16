import { createHash, randomBytes, randomUUID } from 'crypto';

export function hashApiKey(key) {
  return createHash('sha256').update(key).digest('hex');
}

export function generateApiKey(prefix = 'pm_live_') {
  const secret = randomBytes(24).toString('base64url');
  const key = `${prefix}${secret}`;
  const hash = hashApiKey(key);
  return { key, hash, prefix };
}

export function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const hash = createHash('sha256').update(`${salt}:${password}`).digest('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password, storedHash) {
  if (!storedHash) return false;
  const [salt, originalHash] = storedHash.split(':');
  if (!salt || !originalHash) return false;
  const hash = createHash('sha256').update(`${salt}:${password}`).digest('hex');
  return hash === originalHash;
}

export function generateUuid() {
  return randomUUID();
}
