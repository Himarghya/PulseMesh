import React, { useState } from 'react';
import { X, GitFork, Plus, Trash2 } from 'lucide-react';
import { api } from '../../services/api.js';

export function CreateWorkflowModal({ isOpen, onClose, onCreated }) {
  const [name, setName] = useState('data-pipeline');
  const [description, setDescription] = useState('Multi-stage ingestion, extraction, and validation pipeline');
  const [definitionJson, setDefinitionJson] = useState(
    JSON.stringify(
      {
        name: 'data-pipeline',
        tasks: [
          { id: 'download_csv', type: 'csv_processing', dependsOn: [], payload: { rowCount: 2000 } },
          { id: 'transform_data', type: 'data_transform', dependsOn: ['download_csv'], payload: { mapping: 'normalize' } },
          { id: 'generate_report', type: 'report_generation', dependsOn: ['transform_data'], payload: { reportType: 'pipeline_summary' } },
          { id: 'notify_settlement', type: 'mock_payment', dependsOn: ['generate_report'], payload: { amount: 500 } }
        ]
      },
      null,
      2
    )
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    let parsedDef;
    try {
      parsedDef = JSON.parse(definitionJson);
    } catch {
      setError('Invalid JSON syntax in DAG definition');
      setIsSubmitting(false);
      return;
    }

    try {
      await api.createWorkflow({
        name,
        description,
        definition: parsedDef,
      });
      if (onCreated) onCreated();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80  flex items-center justify-center p-4">
      <div className="cyber-card rounded-2xl w-full max-w-xl border-slate-700 overflow-hidden shadow-2xl">
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-[#0A0E1A]">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <GitFork className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-sm text-white">Create New DAG Workflow</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {error && (
            <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-800 text-rose-300 font-mono">
              {error}
            </div>
          )}

          <div className="space-y-1">
            <label className="text-slate-400 font-mono">Workflow Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-200 font-mono focus:border-cyan-500 focus:outline-none"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-slate-400 font-mono">Description</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-200 font-mono focus:border-cyan-500 focus:outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="text-slate-400 font-mono">DAG JSON Specification</label>
            <textarea
              rows="9"
              value={definitionJson}
              onChange={(e) => setDefinitionJson(e.target.value)}
              className="w-full p-3 rounded-lg bg-slate-950 border border-slate-800 text-cyan-300 font-mono focus:border-cyan-500 focus:outline-none"
              required
            />
          </div>

          <div className="pt-2 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold flex items-center space-x-2 transition-all active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Validating & Creating...' : 'Publish Immutable DAG'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
