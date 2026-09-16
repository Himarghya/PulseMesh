import { ScheduleRepository, JobRepository, WorkflowRepository } from '@pulsemesh/database';
import { WorkflowRunner } from '@pulsemesh/workflow-engine';

export async function handleScheduleRoutes(req, res, url, body, authContext) {
  // POST /api/v1/schedules
  if (url.pathname === '/api/v1/schedules' && req.method === 'POST') {
    if (!authContext) return sendJson(res, 401, { error: { code: 'UNAUTHORIZED', message: 'Auth required' } });

    const { name, target_type, target_payload, cron_expression, timezone } = body || {};
    if (!name || !target_type || !cron_expression) {
      return sendJson(res, 400, { error: { code: 'INVALID_INPUT', message: 'Missing schedule fields' } });
    }

    const schedule = await ScheduleRepository.createSchedule({
      organizationId: authContext.organizationId,
      name,
      targetType: target_type,
      targetPayload: target_payload || {},
      cronExpression: cron_expression,
      timezone: timezone || 'UTC',
    });

    return sendJson(res, 201, { success: true, data: schedule });
  }

  // GET /api/v1/schedules
  if (url.pathname === '/api/v1/schedules' && req.method === 'GET') {
    if (!authContext) return sendJson(res, 401, { error: { code: 'UNAUTHORIZED', message: 'Auth required' } });
    const schedules = await ScheduleRepository.listSchedules(authContext.organizationId);
    return sendJson(res, 200, { success: true, data: schedules });
  }

  // POST /api/v1/schedules/:id/run-now
  if (url.pathname.match(/^\/api\/v1\/schedules\/[^/]+\/run-now$/) && req.method === 'POST') {
    if (!authContext) return sendJson(res, 401, { error: { code: 'UNAUTHORIZED', message: 'Auth required' } });
    const scheduleId = url.pathname.split('/')[4];
    const schedule = await ScheduleRepository.getScheduleById(scheduleId);
    if (!schedule) return sendJson(res, 404, { error: { code: 'NOT_FOUND', message: 'Schedule not found' } });

    let triggeredId = null;
    if (schedule.target_type === 'job') {
      const job = await JobRepository.createJob({
        organizationId: schedule.organization_id,
        type: schedule.target_payload.type || 'scheduled_task',
        payload: schedule.target_payload.payload || {},
        priority: schedule.target_payload.priority || 6,
      });
      triggeredId = job.id;
    } else if (schedule.target_type === 'workflow') {
      const wf = await WorkflowRepository.getWorkflowById(schedule.target_payload.workflowId);
      if (wf && wf.latestVersion) {
        const run = await WorkflowRepository.startWorkflowRun(
          wf.latestVersion.id,
          schedule.organization_id,
          schedule.target_payload.input || {}
        );
        await WorkflowRunner.processWorkflowRun(run.id);
        triggeredId = run.id;
      }
    }

    await ScheduleRepository.recordExecution(scheduleId, new Date().toISOString(), triggeredId);
    return sendJson(res, 200, { success: true, message: 'Schedule triggered immediately', triggeredId });
  }

  // POST /api/v1/schedules/:id/pause
  if (url.pathname.match(/^\/api\/v1\/schedules\/[^/]+\/pause$/) && req.method === 'POST') {
    if (!authContext) return sendJson(res, 401, { error: { code: 'UNAUTHORIZED', message: 'Auth required' } });
    const scheduleId = url.pathname.split('/')[4];
    const updated = await ScheduleRepository.updateSchedule(scheduleId, { status: 'paused' });
    return sendJson(res, 200, { success: true, data: updated });
  }

  // POST /api/v1/schedules/:id/resume
  if (url.pathname.match(/^\/api\/v1\/schedules\/[^/]+\/resume$/) && req.method === 'POST') {
    if (!authContext) return sendJson(res, 401, { error: { code: 'UNAUTHORIZED', message: 'Auth required' } });
    const scheduleId = url.pathname.split('/')[4];
    const updated = await ScheduleRepository.updateSchedule(scheduleId, { status: 'active' });
    return sendJson(res, 200, { success: true, data: updated });
  }

  // GET /api/v1/schedules/:id/history
  if (url.pathname.match(/^\/api\/v1\/schedules\/[^/]+\/history$/) && req.method === 'GET') {
    if (!authContext) return sendJson(res, 401, { error: { code: 'UNAUTHORIZED', message: 'Auth required' } });
    const scheduleId = url.pathname.split('/')[4];
    const history = await ScheduleRepository.getExecutionHistory(scheduleId);
    return sendJson(res, 200, { success: true, data: history });
  }

  return false;
}

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
  return true;
}
