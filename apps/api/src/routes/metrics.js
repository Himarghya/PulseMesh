import { JobRepository, WorkerRepository, query } from '@pulsemesh/database';

export async function handleMetricsRoutes(req, res, url) {
  if (url.pathname === '/metrics' && req.method === 'GET') {
    const jobs = await query('SELECT status, count(*) as count FROM jobs GROUP BY status;');
    const workers = await WorkerRepository.listWorkers();

    let output = '# HELP pulsemesh_jobs_total Total number of jobs by status\n';
    output += '# TYPE pulsemesh_jobs_total gauge\n';
    for (const r of jobs.rows) {
      output += `pulsemesh_jobs_total{status="${r.status}"} ${r.count}\n`;
    }

    output += '\n# HELP pulsemesh_active_workers Total active workers\n';
    output += '# TYPE pulsemesh_active_workers gauge\n';
    const activeWorkers = workers.filter((w) => w.status === 'online' || w.status === 'busy').length;
    output += `pulsemesh_active_workers ${activeWorkers}\n`;

    res.writeHead(200, { 'Content-Type': 'text/plain; version=0.0.4' });
    res.end(output);
    return true;
  }

  return false;
}
