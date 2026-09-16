/**
 * PulseMesh Job and Workflow Status Definitions & Transition Guarantees
 */

export const JobStatus = {
  CREATED: 'created',
  QUEUED: 'queued',
  RUNNING: 'running',
  RETRY_WAIT: 'retry_wait',
  SUCCEEDED: 'succeeded',
  FAILED: 'failed',
  CANCEL_REQUESTED: 'cancel_requested',
  CANCELLED: 'cancelled',
  DEAD_LETTER: 'dead_letter',
};

export const WorkflowRunStatus = {
  RUNNING: 'running',
  PAUSED: 'paused',
  SUCCEEDED: 'succeeded',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
};

export const WorkflowTaskStatus = {
  PENDING: 'pending',
  QUEUED: 'queued',
  RUNNING: 'running',
  SUCCEEDED: 'succeeded',
  FAILED: 'failed',
  SKIPPED: 'skipped',
  CANCELLED: 'cancelled',
};

export const WorkerStatus = {
  ONLINE: 'online',
  BUSY: 'busy',
  DRAINING: 'draining',
  OFFLINE: 'offline',
};

export const UserRole = {
  OWNER: 'owner',
  ADMIN: 'admin',
  DEVELOPER: 'developer',
  VIEWER: 'viewer',
};

/**
 * Valid Job State Transition Matrix
 * Guarantees state monotonicity and prevents illegal state mutations (e.g. succeeded -> running)
 */
export const VALID_JOB_TRANSITIONS = {
  [JobStatus.CREATED]: [JobStatus.QUEUED, JobStatus.CANCELLED],
  [JobStatus.QUEUED]: [JobStatus.RUNNING, JobStatus.CANCEL_REQUESTED, JobStatus.CANCELLED],
  [JobStatus.RUNNING]: [
    JobStatus.SUCCEEDED,
    JobStatus.FAILED,
    JobStatus.RETRY_WAIT,
    JobStatus.CANCEL_REQUESTED,
    JobStatus.CANCELLED,
    JobStatus.DEAD_LETTER,
  ],
  [JobStatus.RETRY_WAIT]: [JobStatus.QUEUED, JobStatus.CANCELLED],
  [JobStatus.SUCCEEDED]: [], // Terminal immutable state
  [JobStatus.FAILED]: [JobStatus.QUEUED], // Manual replay/retry allowed
  [JobStatus.CANCEL_REQUESTED]: [JobStatus.CANCELLED, JobStatus.FAILED, JobStatus.SUCCEEDED],
  [JobStatus.CANCELLED]: [], // Terminal immutable state
  [JobStatus.DEAD_LETTER]: [JobStatus.QUEUED], // Manual re-drive allowed
};

export function isValidJobTransition(fromStatus, toStatus) {
  if (fromStatus === toStatus) return true;
  const allowed = VALID_JOB_TRANSITIONS[fromStatus];
  return Boolean(allowed && allowed.includes(toStatus));
}
