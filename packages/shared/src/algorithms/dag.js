/**
 * PulseMesh DAG Engine Algorithms
 * Implements Kahn's Algorithm, DFS Cycle Detection, Topological Layers, and Dynamic Value Interpolation.
 */

/**
 * Validates a workflow DAG:
 * 1. Checks that all tasks have unique IDs
 * 2. Checks that all dependencies point to existing tasks
 * 3. Detects self-loops and directed cycles with exact path
 * 4. Generates topological sorting and parallel execution layers using Kahn's algorithm
 *
 * @param {Array<{id: string, dependsOn?: string[], type: string}>} tasks
 * @returns {{isValid: boolean, errors: string[], topologicalOrder?: string[], layers?: string[][], hasCycle?: boolean, cyclePath?: string[]}}
 */
export function validateAndSortDAG(tasks = []) {
  const errors = [];
  const taskMap = new Map();
  const inDegree = new Map();
  const adjacencyList = new Map(); // u -> list of tasks that depend on u

  // 1. Check duplicate task IDs and build map
  for (const task of tasks) {
    if (!task || !task.id) {
      errors.push('Each task must have a non-empty string `id`');
      continue;
    }
    if (taskMap.has(task.id)) {
      errors.push(`Duplicate task ID detected: '${task.id}'`);
    }
    taskMap.set(task.id, task);
    inDegree.set(task.id, 0);
    adjacencyList.set(task.id, []);
  }

  if (errors.length > 0) {
    return { isValid: false, errors };
  }

  // 2. Validate dependencies & build adjacency graph
  for (const task of tasks) {
    const deps = task.dependsOn || [];
    for (const depId of deps) {
      if (depId === task.id) {
        errors.push(`Self-loop detected: Task '${task.id}' depends on itself.`);
      } else if (!taskMap.has(depId)) {
        errors.push(`Task '${task.id}' depends on non-existent task '${depId}'.`);
      } else {
        adjacencyList.get(depId).push(task.id);
        inDegree.set(task.id, (inDegree.get(task.id) || 0) + 1);
      }
    }
  }

  // 3. Cycle Detection via DFS
  const visited = new Map(); // 0: unvisited, 1: visiting, 2: visited
  let cyclePath = null;

  function findCycleDFS(node, currentPath) {
    visited.set(node, 1);
    currentPath.push(node);

    const neighbors = adjacencyList.get(node) || [];
    for (const neighbor of neighbors) {
      const state = visited.get(neighbor) || 0;
      if (state === 1) {
        const cycleStartIndex = currentPath.indexOf(neighbor);
        cyclePath = currentPath.slice(cycleStartIndex).concat(neighbor);
        return true;
      }
      if (state === 0) {
        if (findCycleDFS(neighbor, currentPath)) {
          return true;
        }
      }
    }

    currentPath.pop();
    visited.set(node, 2);
    return false;
  }

  for (const task of tasks) {
    if ((visited.get(task.id) || 0) === 0) {
      if (findCycleDFS(task.id, [])) {
        errors.push(`Cycle detected in DAG: ${cyclePath?.join(' -> ')}`);
        return {
          isValid: false,
          errors,
          hasCycle: true,
          cyclePath,
        };
      }
    }
  }

  if (errors.length > 0) {
    return { isValid: false, errors };
  }

  // 4. Kahn's Algorithm for Topological Sorting & Execution Layers
  const inDegreeCopy = new Map(inDegree);
  const queue = [];
  const topologicalOrder = [];
  const layers = [];

  // Find all root nodes (inDegree === 0)
  for (const [taskId, deg] of inDegreeCopy.entries()) {
    if (deg === 0) {
      queue.push(taskId);
    }
  }

  while (queue.length > 0) {
    const layerSize = queue.length;
    const currentLayer = [];

    for (let i = 0; i < layerSize; i++) {
      const current = queue.shift();
      currentLayer.push(current);
      topologicalOrder.push(current);

      const dependents = adjacencyList.get(current) || [];
      for (const dep of dependents) {
        const newDeg = inDegreeCopy.get(dep) - 1;
        inDegreeCopy.set(dep, newDeg);
        if (newDeg === 0) {
          queue.push(dep);
        }
      }
    }

    layers.push(currentLayer);
  }

  if (topologicalOrder.length !== tasks.length) {
    errors.push('Topological sort could not resolve all tasks; cycle may exist.');
    return {
      isValid: false,
      errors,
      hasCycle: true,
    };
  }

  return {
    isValid: true,
    errors: [],
    topologicalOrder,
    layers,
    hasCycle: false,
  };
}

/**
 * Returns tasks ready to be executed (all dependencies met and not yet started).
 *
 * @param {Array<{id: string, dependsOn?: string[]}>} tasks
 * @param {Set<string>} completedTaskIds
 * @param {Set<string>} inFlightOrFinishedTaskIds
 * @returns {Array<object>}
 */
export function getReadyTasks(tasks, completedTaskIds, inFlightOrFinishedTaskIds) {
  const ready = [];

  for (const task of tasks) {
    if (inFlightOrFinishedTaskIds.has(task.id)) {
      continue;
    }
    const deps = task.dependsOn || [];
    const allDepsMet = deps.every((dep) => completedTaskIds.has(dep));
    if (allDepsMet) {
      ready.push(task);
    }
  }

  return ready;
}

/**
 * Resolves mustache-style dynamic references in task payloads (e.g. `{{tasks.download.outputs.file_url}}` or `{{input.dataset}}`)
 *
 * @param {object} payload
 * @param {{input?: object, tasks?: object}} context
 * @returns {object}
 */
export function interpolatePayload(payload = {}, context = {}) {
  const jsonStr = JSON.stringify(payload);
  const regex = /\{\{\s*([a-zA-Z0-9_$.]+)\s*\}\}/g;

  const interpolated = jsonStr.replace(regex, (_, path) => {
    const parts = path.split('.');
    let current = context;
    for (const part of parts) {
      if (current === undefined || current === null) return '';
      current = current[part];
    }
    if (current === undefined || current === null) return '';
    return typeof current === 'object' ? JSON.stringify(current) : String(current);
  });

  try {
    return JSON.parse(interpolated);
  } catch {
    return payload;
  }
}

/**
 * Evaluates a simple condition expression for conditional branching
 * Example condition: "tasks.validate.outputs.isValid === true"
 *
 * @param {string} condition
 * @param {{input?: object, tasks?: object}} context
 * @returns {boolean}
 */
export function evaluateCondition(condition, context = {}) {
  if (!condition || typeof condition !== 'string' || condition.trim() === '') {
    return true; // No condition means unconditional execution
  }

  try {
    // Safe lookup-based comparison
    // Format supported: <path> <operator> <value>
    // e.g. "tasks.check.outputs.count > 10" or "input.mode == 'fast'"
    const tokens = condition.trim().split(/\s+(===|==|!==|!=|>=|<=|>|<)\s+/);
    if (tokens.length !== 3) {
      return true;
    }

    const [leftPath, op, rightValStr] = tokens;
    const parts = leftPath.split('.');
    let leftVal = context;
    for (const p of parts) {
      if (leftVal === undefined || leftVal === null) {
        leftVal = undefined;
        break;
      }
      leftVal = leftVal[p];
    }

    let rightVal = rightValStr;
    if (rightValStr === 'true') rightVal = true;
    else if (rightValStr === 'false') rightVal = false;
    else if (rightValStr === 'null') rightVal = null;
    else if (!isNaN(Number(rightValStr))) rightVal = Number(rightValStr);
    else if ((rightValStr.startsWith("'") && rightValStr.endsWith("'")) || (rightValStr.startsWith('"') && rightValStr.endsWith('"'))) {
      rightVal = rightValStr.slice(1, -1);
    }

    switch (op) {
      case '===':
      case '==':
        return leftVal === rightVal;
      case '!==':
      case '!=':
        return leftVal !== rightVal;
      case '>':
        return leftVal > rightVal;
      case '<':
        return leftVal < rightVal;
      case '>=':
        return leftVal >= rightVal;
      case '<=':
        return leftVal <= rightVal;
      default:
        return true;
    }
  } catch {
    return true;
  }
}
