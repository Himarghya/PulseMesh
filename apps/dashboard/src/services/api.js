const API_BASE = '/api/v1';

const listeners = new Set();

export function onApiEvent(callback) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

function emitApiEvent(event) {
  listeners.forEach((cb) => {
    try {
      cb(event);
    } catch {
      // ignore
    }
  });
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('pulsemesh:api', { detail: event }));
  }
}

export async function fetchApi(path, options = {}) {
  const token = localStorage.getItem('pulsemesh_token');
  const apiKey = localStorage.getItem('pulsemesh_apikey');

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (apiKey) {
    headers['X-API-Key'] = apiKey;
  } else if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const method = options.method || 'GET';
  const fullUrl = `${API_BASE}${path}`;
  const startTime = performance.now();

  emitApiEvent({
    type: 'request',
    method,
    url: fullUrl,
    body: options.body,
    timestamp: new Date().toLocaleTimeString(),
  });

  try {
    const response = await fetch(fullUrl, {
      method,
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    const duration = Math.round(performance.now() - startTime);
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const errorMsg = data?.error?.message || `HTTP ${response.status}`;
      emitApiEvent({
        type: 'response_error',
        method,
        url: fullUrl,
        status: response.status,
        duration,
        error: errorMsg,
        timestamp: new Date().toLocaleTimeString(),
      });
      throw new Error(errorMsg);
    }

    emitApiEvent({
      type: 'response_success',
      method,
      url: fullUrl,
      status: response.status,
      duration,
      data,
      timestamp: new Date().toLocaleTimeString(),
    });

    return data;
  } catch (err) {
    const duration = Math.round(performance.now() - startTime);
    emitApiEvent({
      type: 'network_error',
      method,
      url: fullUrl,
      duration,
      error: err.message,
      timestamp: new Date().toLocaleTimeString(),
    });
    throw err;
  }
}

export const api = {
  // Auth
  register: (body) => fetchApi('/auth/register', { method: 'POST', body }),
  login: (body) => fetchApi('/auth/login', { method: 'POST', body }),
  getMe: () => fetchApi('/auth/me'),
  getApiKeys: () => fetchApi('/api-keys'),
  createApiKey: (body) => fetchApi('/api-keys', { method: 'POST', body }),
  revokeApiKey: (id) => fetchApi(`/api-keys/${id}`, { method: 'DELETE' }),

  // Jobs
  getJobs: (params = '') => fetchApi(`/jobs${params}`),
  getJob: (id) => fetchApi(`/jobs/${id}`),
  createJob: (body) => fetchApi('/jobs', { method: 'POST', body }),
  bulkCreateJobs: (jobs) => fetchApi('/jobs/bulk', { method: 'POST', body: { jobs } }),
  cancelJob: (id) => fetchApi(`/jobs/${id}/cancel`, { method: 'POST' }),
  retryJob: (id) => fetchApi(`/jobs/${id}/retry`, { method: 'POST' }),
  getJobAttempts: (id) => fetchApi(`/jobs/${id}/attempts`),
  getJobEvents: (id) => fetchApi(`/jobs/${id}/events`),

  // Queues
  getQueues: () => fetchApi('/queues'),
  pauseQueue: (name) => fetchApi(`/queues/${encodeURIComponent(name)}/pause`, { method: 'POST' }),
  resumeQueue: (name) => fetchApi(`/queues/${encodeURIComponent(name)}/resume`, { method: 'POST' }),

  // Workflows
  getWorkflows: () => fetchApi('/workflows'),
  getWorkflow: (id) => fetchApi(`/workflows/${id}`),
  createWorkflow: (body) => fetchApi('/workflows', { method: 'POST', body }),
  runWorkflow: (id, body) => fetchApi(`/workflows/${id}/run`, { method: 'POST', body }),
  getWorkflowRuns: () => fetchApi('/workflow-runs'),
  getWorkflowRun: (id) => fetchApi(`/workflow-runs/${id}`),

  // Workers
  getWorkers: () => fetchApi('/workers'),
  drainWorker: (id) => fetchApi(`/workers/${id}/drain`, { method: 'POST' }),

  // Schedules
  getSchedules: () => fetchApi('/schedules'),
  createSchedule: (body) => fetchApi('/schedules', { method: 'POST', body }),
  runScheduleNow: (id) => fetchApi(`/schedules/${id}/run-now`, { method: 'POST' }),
  pauseSchedule: (id) => fetchApi(`/schedules/${id}/pause`, { method: 'POST' }),
  resumeSchedule: (id) => fetchApi(`/schedules/${id}/resume`, { method: 'POST' }),
  getScheduleHistory: (id) => fetchApi(`/schedules/${id}/history`),
};
