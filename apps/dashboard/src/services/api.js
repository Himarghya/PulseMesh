const API_BASE = '/api/v1';

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

  const response = await fetch(`${API_BASE}${path}`, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error?.message || `HTTP ${response.status}`);
  }
  return data;
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
