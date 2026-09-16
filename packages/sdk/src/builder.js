/**
 * Fluent Workflow Builder for PulseMesh SDK
 */
export class WorkflowBuilder {
  constructor(name, description = '') {
    this.name = name;
    this.description = description;
    this.tasks = [];
    this.timeoutMs = 900000;
  }

  addTask(taskConfig) {
    if (!taskConfig.id) throw new Error('Task must have an `id`');
    if (!taskConfig.type) throw new Error('Task must have a `type`');

    this.tasks.push({
      id: taskConfig.id,
      name: taskConfig.name || taskConfig.id,
      type: taskConfig.type,
      dependsOn: taskConfig.dependsOn || [],
      payload: taskConfig.payload || {},
      condition: taskConfig.condition || null,
      timeoutMs: taskConfig.timeoutMs || 60000,
    });
    return this;
  }

  setTimeout(ms) {
    this.timeoutMs = ms;
    return this;
  }

  build() {
    return {
      name: this.name,
      description: this.description,
      timeoutMs: this.timeoutMs,
      tasks: this.tasks,
    };
  }
}
