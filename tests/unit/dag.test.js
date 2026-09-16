import { describe, it } from 'node:test';
import assert from 'node:assert';
import { validateAndSortDAG, interpolatePayload, evaluateCondition } from '@pulsemesh/shared';

describe('DAG Engine Algorithms', () => {
  it('detects self-loops correctly', () => {
    const tasks = [
      { id: 'task_a', type: 'image_resize', dependsOn: ['task_a'] },
    ];
    const result = validateAndSortDAG(tasks);
    assert.strictEqual(result.isValid, false);
    assert.ok(result.errors.some((e) => e.includes('Self-loop')));
  });

  it('detects circular dependencies and reports exact cycle path', () => {
    const tasks = [
      { id: 'A', type: 'step', dependsOn: ['C'] },
      { id: 'B', type: 'step', dependsOn: ['A'] },
      { id: 'C', type: 'step', dependsOn: ['B'] },
    ];
    const result = validateAndSortDAG(tasks);
    assert.strictEqual(result.isValid, false);
    assert.strictEqual(result.hasCycle, true);
    assert.ok(result.cyclePath);
  });

  it('performs Kahn topological sorting with parallel layer generation', () => {
    const tasks = [
      { id: 'download', type: 'download', dependsOn: [] },
      { id: 'validate', type: 'validate', dependsOn: ['download'] },
      { id: 'thumbnail', type: 'image_resize', dependsOn: ['download'] },
      { id: 'aggregate', type: 'report_generation', dependsOn: ['validate', 'thumbnail'] },
    ];

    const result = validateAndSortDAG(tasks);
    assert.strictEqual(result.isValid, true);
    assert.strictEqual(result.hasCycle, false);

    // First layer should be download
    assert.deepStrictEqual(result.layers[0], ['download']);

    // Second parallel layer should have validate and thumbnail
    assert.ok(result.layers[1].includes('validate'));
    assert.ok(result.layers[1].includes('thumbnail'));

    // Final join layer should be aggregate
    assert.deepStrictEqual(result.layers[2], ['aggregate']);
  });

  it('interpolates dynamic mustache variables from predecessor outputs', () => {
    const payload = {
      sourceUrl: '{{tasks.download.outputs.fileUrl}}',
      batchId: '{{input.batch}}',
    };
    const context = {
      input: { batch: 'BATCH_2026' },
      tasks: {
        download: {
          outputs: { fileUrl: 'https://cdn.pulsemesh.internal/raw.csv' },
        },
      },
    };

    const resolved = interpolatePayload(payload, context);
    assert.strictEqual(resolved.sourceUrl, 'https://cdn.pulsemesh.internal/raw.csv');
    assert.strictEqual(resolved.batchId, 'BATCH_2026');
  });

  it('evaluates conditions for conditional branching correctly', () => {
    const context = {
      tasks: {
        check: { outputs: { count: 15, isValid: true } },
      },
    };

    assert.strictEqual(evaluateCondition('tasks.check.outputs.count > 10', context), true);
    assert.strictEqual(evaluateCondition('tasks.check.outputs.count < 5', context), false);
    assert.strictEqual(evaluateCondition('tasks.check.outputs.isValid === true', context), true);
  });
});
