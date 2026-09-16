import { validateSsrfUrl } from '@pulsemesh/shared';

/**
 * SSRF-Protected Outbound Webhook/HTTP Request Handler
 */
export async function handleHttpRequest(payload = {}, context = {}) {
  const { url, method = 'GET', headers = {}, body = null } = payload;

  if (!url) {
    throw new Error('Target `url` is required for http_request tasks');
  }

  // Pre-flight SSRF and DNS check
  const ssrfCheck = await validateSsrfUrl(url);
  if (!ssrfCheck.isValid) {
    throw new Error(`SSRF Blocked: ${ssrfCheck.reason}`);
  }

  // Safe outbound call
  const response = await fetch(url, {
    method,
    headers: {
      'User-Agent': 'PulseMesh-Worker/1.0',
      ...headers,
    },
    body: body ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined,
  });

  const responseText = await response.text();
  let parsedBody = responseText;
  try {
    parsedBody = JSON.parse(responseText);
  } catch {}

  return {
    status: response.status,
    statusText: response.statusText,
    headers: Object.fromEntries(response.headers.entries()),
    data: parsedBody,
  };
}
