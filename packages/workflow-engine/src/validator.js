import { validateAndSortDAG } from '@pulsemesh/shared';

export class WorkflowValidator {
  /**
   * Validates workflow structure, task IDs, dependencies, and cycle freedom.
   *
   * @param {object} definition
   * @returns {{isValid: boolean, errors: string[], topologicalOrder?: string[], layers?: string[][]}}
   */
  static validate(definition) {
    if (!definition || !Array.isArray(definition.tasks) || definition.tasks.length === 0) {
      return {
        isValid: false,
        errors: ['Workflow definition must include a non-empty array of `tasks`.'],
      };
    }

    return validateAndSortDAG(definition.tasks);
  }
}
