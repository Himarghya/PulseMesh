import { WorkflowRepository } from '@pulsemesh/database';
import { WorkflowValidator, WorkflowRunner } from '@pulsemesh/workflow-engine';

export async function handleWorkflowRoutes(req, res, url, body, authContext) {
  // POST /api/v1/workflows (Create Workflow with Immutable Version 1)
  if (url.pathname === '/api/v1/workflows' && req.method === 'POST') {
    if (!authContext) return sendJson(res, 401, { error: { code: 'UNAUTHORIZED', message: 'Auth required' } });

    const { name, description, definition } = body || {};
    if (!name || !definition) {
      return sendJson(res, 400, { error: { code: 'INVALID_INPUT', message: 'Workflow `name` and `definition` required' } });
    }

    const validation = WorkflowValidator.validate(definition);
    if (!validation.isValid) {
      return sendJson(res, 400, { error: { code: 'INVALID_DAG', message: 'DAG validation failed', details: validation.errors } });
    }

    const result = await WorkflowRepository.createWorkflow(authContext.organizationId, name, description, definition);
    return sendJson(res, 201, { success: true, data: result });
  }

  // GET /api/v1/workflows (List Workflows)
  if (url.pathname === '/api/v1/workflows' && req.method === 'GET') {
    if (!authContext) return sendJson(res, 401, { error: { code: 'UNAUTHORIZED', message: 'Auth required' } });
    const workflows = await WorkflowRepository.listWorkflows(authContext.organizationId);
    return sendJson(res, 200, { success: true, data: workflows });
  }

  // GET /api/v1/workflows/:id
  if (url.pathname.match(/^\/api\/v1\/workflows\/[^/]+$/) && req.method === 'GET') {
    if (!authContext) return sendJson(res, 401, { error: { code: 'UNAUTHORIZED', message: 'Auth required' } });
    const workflowId = url.pathname.split('/')[4];
    const workflow = await WorkflowRepository.getWorkflowById(workflowId);
    if (!workflow) return sendJson(res, 404, { error: { code: 'NOT_FOUND', message: 'Workflow not found' } });
    return sendJson(res, 200, { success: true, data: workflow });
  }

  // POST /api/v1/workflows/:id/run (Trigger Execution)
  if (url.pathname.match(/^\/api\/v1\/workflows\/[^/]+\/run$/) && req.method === 'POST') {
    if (!authContext) return sendJson(res, 401, { error: { code: 'UNAUTHORIZED', message: 'Auth required' } });
    const workflowId = url.pathname.split('/')[4];
    const workflow = await WorkflowRepository.getWorkflowById(workflowId);
    if (!workflow || !workflow.latestVersion) {
      return sendJson(res, 404, { error: { code: 'NOT_FOUND', message: 'Workflow version not found' } });
    }

    const { input } = body || {};
    const run = await WorkflowRepository.startWorkflowRun(workflow.latestVersion.id, authContext.organizationId, input || {});

    // Kick off initial root steps in DAG
    await WorkflowRunner.processWorkflowRun(run.id);

    return sendJson(res, 201, { success: true, data: run });
  }

  // GET /api/v1/workflow-runs/:id
  if (url.pathname.match(/^\/api\/v1\/workflow-runs\/[^/]+$/) && req.method === 'GET') {
    if (!authContext) return sendJson(res, 401, { error: { code: 'UNAUTHORIZED', message: 'Auth required' } });
    const runId = url.pathname.split('/')[4];
    const run = await WorkflowRepository.getWorkflowRun(runId);
    if (!run) return sendJson(res, 404, { error: { code: 'NOT_FOUND', message: 'Workflow run not found' } });
    return sendJson(res, 200, { success: true, data: run });
  }

  // GET /api/v1/workflow-runs
  if (url.pathname === '/api/v1/workflow-runs' && req.method === 'GET') {
    if (!authContext) return sendJson(res, 401, { error: { code: 'UNAUTHORIZED', message: 'Auth required' } });
    const runs = await WorkflowRepository.listWorkflowRuns(authContext.organizationId);
    return sendJson(res, 200, { success: true, data: runs });
  }

  return false;
}

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
  return true;
}
