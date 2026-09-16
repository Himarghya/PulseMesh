/**
 * Pure Functional JSON Data Transformation Handler
 */
export async function handleDataTransform(payload = {}, context = {}) {
  const { data = {}, mapping = 'passthrough', filterKey = null } = payload;

  await new Promise((resolve) => setTimeout(resolve, 50));

  let transformed = { ...data };

  if (mapping === 'uppercase_keys') {
    transformed = Object.fromEntries(Object.entries(data).map(([k, v]) => [k.toUpperCase(), v]));
  } else if (mapping === 'normalize') {
    transformed = {
      ...data,
      _normalizedAt: new Date().toISOString(),
      _status: 'valid',
    };
  }

  return {
    transformed,
    originalKeysCount: Object.keys(data).length,
    timestamp: new Date().toISOString(),
  };
}
