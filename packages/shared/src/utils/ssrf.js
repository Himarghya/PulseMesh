import dns from 'dns/promises';
import { URL } from 'url';

/**
 * Checks if an IPv4 or IPv6 address is private, loopback, or cloud link-local.
 *
 * @param {string} ip
 * @returns {boolean}
 */
export function isPrivateIp(ip) {
  if (!ip) return true;
  if (ip === '127.0.0.1' || ip === '::1' || ip === '0.0.0.0' || ip === 'localhost') {
    return true;
  }

  // Cloud metadata endpoint (AWS, GCP, Azure, DigitalOcean)
  if (ip === '169.254.169.254') {
    return true;
  }

  const parts = ip.split('.').map(Number);
  if (parts.length === 4 && !parts.some(isNaN)) {
    if (parts[0] === 10) return true;
    if (parts[0] === 127) return true;
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
    if (parts[0] === 192 && parts[1] === 168) return true;
    if (parts[0] === 169 && parts[1] === 254) return true;
  }

  return false;
}

/**
 * Performs pre-flight DNS lookup to prevent SSRF and DNS rebinding attacks.
 *
 * @param {string} targetUrl
 * @returns {Promise<{isValid: boolean, reason?: string}>}
 */
export async function validateSsrfUrl(targetUrl) {
  let parsed;
  try {
    parsed = new URL(targetUrl);
  } catch {
    return { isValid: false, reason: 'Invalid URL format' };
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { isValid: false, reason: 'Only HTTP and HTTPS protocols are permitted' };
  }

  const hostname = parsed.hostname;
  if (isPrivateIp(hostname)) {
    return { isValid: false, reason: `Direct access to private address '${hostname}' is prohibited` };
  }

  try {
    const lookup = await dns.lookup(hostname);
    if (isPrivateIp(lookup.address)) {
      return {
        isValid: false,
        reason: `DNS resolved '${hostname}' to private/metadata IP '${lookup.address}'`,
      };
    }
  } catch (err) {
    return { isValid: false, reason: `DNS lookup failed for '${hostname}': ${err.message}` };
  }

  return { isValid: true };
}
