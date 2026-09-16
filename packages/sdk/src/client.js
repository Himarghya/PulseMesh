import { WorkflowBuilder } from './builder.js';

export class PulseMesh {
  /**
   * @param {{apiKey: string, endpoint?: string, token?: string}} options
   */
  constructor(options = {}) {
    this.apiKey = options.apiKey;
    this.token = options.token;
    this.endpoint = (options.endpoint || 'http://localhost:3000').replace(/\/$/, '');

    this.jobs = {
      create: async (jobInput) => this.request('/api/v1/jobs', { method: 'POST', body: jobInput }),
      bulkCreate: async (jobs) => this.request('/api/v1/jobs/bulk', { method: 'POST', body: { jobs } }),
      get: async (id) => this.request(`/api/v1/jobs/${id}`),
      list: async (filters = {}) => {
        const query = new URLSearchParams(filters).toString();
        return this.request(`/api/v1/jobs${query ? `?${query}` : ''}`);
      },
      cancel: async (id) => this.request(`/api/v1/jobs/${id}/cancel`, { method: 'POST' }),
      retry: async (id) => this.request(`/api/v1/jobs/${id}/retry`, { method: 'POST' }),
      getAttempts: async (id) => this.request(`/api/v1/jobs/${id}/attempts`),
      getEvents: async (id) => this.request(`/api/v1/jobs/${id}/events`),
    };

    this.workflows = {
      create: async (workflowInput) => this.request('/api/v1/workflows', { method: 'POST', body: workflowInput }),
      get: async (id) => this.request(`/api/v1/workflows/${id}`),
      list: async () => this.request('/api/v1/workflows'),
      run: async (id, input = {}) => this.request(`/api/v1/workflows/${id}/run`, { method: 'POST', body: { input } }),
      getRun: async (runId) => this.request(`/api/v1/workflow-runs/${runId}`),
      builder: (name, description) => new WorkflowBuilder(name, description),
    };

    this.queues = {
      list: async () => this.request('/api/v1/queues'),
      get: async (name) => this.request(`/api/v1/queues/${name}`),
      pause: async (name) => this.request(`/api/v1/queues/${name}/pause`, { method: 'POST' }),
      resume: async (name) => this.request(`/api/v1/queues/${name}/resume`, { method: 'POST' }),
    };

    this.schedules = {
      create: async (scheduleInput) => this.request('/api/v1/schedules', { method: 'POST', body: scheduleInput }),
      list: async () => this.request('/api/v1/schedules'),
      runNow: async (id) => this.request(`/api/v1/schedules/${id}/run-now`, { method: 'POST' }),
      pause: async (id) => this.request(`/api/v1/schedules/${id}/pause`, { method: 'POST' }),
      resume: async (id) => this.request(`/api/v1/schedules/${id}/resume`, { method: 'POST' }),
    };

    this.workers = {
      list: async () => this.request('/api/v1/workers'),
      drain: async (id) => this.request(`/api/v1/workers/${id}/drain`, { method: 'POST' }),
    };
  }

  async request(path, options = {}) {
    const url = `${this.endpoint}${path}`;
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.apiKey) {
      headers['X-API-Key'] = this.apiKey;
    } else if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(url, {
      method: options.method || 'GET',
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data?.error?.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    return data;
  }
}
