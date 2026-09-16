import React, { useState, useEffect } from 'react';
import { GitFork, Play, Plus, RefreshCw, Layers, Clock, CheckCircle2, ChevronRight, Activity } from 'lucide-react';
import { PulseDAGCanvas } from './PulseDAGCanvas.jsx';
import { CreateWorkflowModal } from './CreateWorkflowModal.jsx';
import { api } from '../../services/api.js';

export function WorkflowManager({ workflows = [], onRefresh }) {
  const [selectedWorkflow, setSelectedWorkflow] = useState(null);
  const [currentRun, setCurrentRun] = useState(null);
  const [runs, setRuns] = useState([]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isRunningTrigger, setIsRunningTrigger] = useState(false);

  useEffect(() => {
    if (workflows.length > 0 && !selectedWorkflow) {
      loadWorkflowDetails(workflows[0].id);
    }
  }, [workflows]);

  const loadWorkflowDetails = async (wfId) => {
    try {
      const res = await api.getWorkflow(wfId);
      setSelectedWorkflow(res.data);
      const runsRes = await api.getWorkflowRuns();
      const matchingRuns = (runsRes.data || []).filter(
        (r) => r.workflow_version_id === res.data.latestVersion?.id
      );
      setRuns(matchingRuns);
      if (matchingRuns.length > 0) {
        const activeRun = await api.getWorkflowRun(matchingRuns[0].id);
        setCurrentRun(activeRun.data);
      } else {
        setCurrentRun(null);
      }
    } catch (err) {
      console.warn('Failed loading workflow details:', err.message);
    }
  };

  const handleRunWorkflow = async () => {
    if (!selectedWorkflow) return;
    setIsRunningTrigger(true);
    try {
      const res = await api.runWorkflow(selectedWorkflow.id, {
        dataset: 'live_telemetry_batch.csv',
        initiatedAt: new Date().toISOString(),
      });
      const runRes = await api.getWorkflowRun(res.data.id);
      setCurrentRun(runRes.data);
      setRuns((prev) => [runRes.data, ...prev]);
      if (onRefresh) onRefresh();
    } catch (err) {
      alert(`Trigger failed: ${err.message}`);
    } finally {
      setIsRunningTrigger(false);
    }
  };

  const handleSelectRun = async (runId) => {
    try {
      const res = await api.getWorkflowRun(runId);
      setCurrentRun(res.data);
    } catch (err) {
      console.warn('Failed fetching run:', err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-white">DAG Workflow Orchestration</h2>
          <p className="text-xs text-slate-400">
            Kahn's topological sorting, fan-out/fan-in branching, deterministic task runs, and live energy pulse streams.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setIsCreateOpen(true)}
            className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center space-x-1.5 shadow-lg shadow-purple-600/20 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>New DAG Workflow</span>
          </button>

          <button
            onClick={() => selectedWorkflow && loadWorkflowDetails(selectedWorkflow.id)}
            className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-cyan-400"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Column: Workflow Selector */}
        <div className="cyber-card rounded-xl p-4 space-y-3 lg:col-span-1">
          <div className="text-xs font-mono uppercase text-slate-400 pb-2 border-b border-slate-800 flex items-center space-x-2">
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            <span>Workflow Blueprints</span>
          </div>

          <div className="space-y-2">
            {workflows.map((wf) => (
              <button
                key={wf.id}
                onClick={() => loadWorkflowDetails(wf.id)}
                className={`w-full p-3 rounded-lg text-left text-xs transition-all border ${
                  selectedWorkflow?.id === wf.id
                    ? 'bg-purple-950/40 border-purple-500/40 text-white shadow-sm shadow-purple-500/10'
                    : 'bg-slate-900/40 border-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                <div className="flex items-center justify-between font-mono">
                  <span className="font-bold text-slate-200">{wf.name}</span>
                  <span className="text-[10px] text-purple-400">v1</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1 line-clamp-1">
                  {wf.description || 'No description provided'}
                </p>
              </button>
            ))}

            {workflows.length === 0 && (
              <div className="py-8 text-center text-xs text-slate-500 font-mono">
                No workflows created. Click "New DAG Workflow".
              </div>
            )}
          </div>
        </div>

        {/* Right 3 Columns: DAG Canvas & Run Console */}
        <div className="lg:col-span-3 space-y-6">
          {selectedWorkflow ? (
            <>
              {/* DAG Canvas View */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-white font-mono">{selectedWorkflow.name}</h3>
                    <p className="text-xs text-slate-400">{selectedWorkflow.description}</p>
                  </div>

                  <button
                    onClick={handleRunWorkflow}
                    disabled={isRunningTrigger}
                    className="px-4 py-2.5 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-bold text-xs flex items-center space-x-2 shadow-lg shadow-cyan-500/20 transition-all active:scale-95"
                  >
                    <Play className="w-3.5 h-3.5 fill-black" />
                    <span>{isRunningTrigger ? 'Dispatching...' : 'Trigger Workflow Run'}</span>
                  </button>
                </div>

                <PulseDAGCanvas
                  workflow={selectedWorkflow}
                  workflowRun={currentRun}
                />
              </div>

              {/* Execution Runs History */}
              <div className="cyber-card rounded-xl p-5 space-y-3">
                <div className="text-xs font-mono uppercase text-slate-400 pb-2 border-b border-slate-800 flex items-center justify-between">
                  <span className="flex items-center space-x-2">
                    <Clock className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Run Execution History ({runs.length})</span>
                  </span>
                  <span className="text-[11px] text-slate-500">Deterministic Task Runs</span>
                </div>

                <div className="space-y-2">
                  {runs.map((r) => (
                    <div
                      key={r.id}
                      onClick={() => handleSelectRun(r.id)}
                      className={`p-3 rounded-lg border text-xs font-mono flex items-center justify-between cursor-pointer transition-all ${
                        currentRun?.id === r.id
                          ? 'bg-cyan-950/30 border-cyan-500/40 text-white'
                          : 'bg-slate-900/40 border-slate-800 text-slate-400 hover:bg-slate-900/80 hover:text-slate-200'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            r.status === 'succeeded'
                              ? 'bg-emerald-400'
                              : r.status === 'running'
                              ? 'bg-cyan-400 animate-pulse'
                              : 'bg-rose-400'
                          }`}
                        ></span>
                        <span className="font-bold text-slate-300">Run: {r.id.substring(0, 8)}...</span>
                      </div>

                      <div className="flex items-center space-x-4">
                        <span
                          className={`text-[10px] uppercase px-2 py-0.5 rounded border ${
                            r.status === 'succeeded'
                              ? 'bg-emerald-950/80 text-emerald-400 border-emerald-800/50'
                              : r.status === 'running'
                              ? 'bg-cyan-950/80 text-cyan-400 border-cyan-800/50'
                              : 'bg-rose-950/80 text-rose-400 border-rose-800/50'
                          }`}
                        >
                          {r.status}
                        </span>
                        <span className="text-slate-500 text-[10px]">
                          {new Date(r.started_at).toLocaleTimeString()}
                        </span>
                        <ChevronRight className="w-4 h-4 text-slate-600" />
                      </div>
                    </div>
                  ))}

                  {runs.length === 0 && (
                    <div className="py-6 text-center text-xs text-slate-500 font-mono">
                      No executions recorded yet. Click "Trigger Workflow Run" to test the DAG engine.
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="cyber-card rounded-2xl p-12 text-center text-slate-500 font-mono text-xs">
              Select or create a workflow to view its interactive DAG graph.
            </div>
          )}
        </div>
      </div>

      {isCreateOpen && (
        <CreateWorkflowModal
          isOpen={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
          onCreated={onRefresh}
        />
      )}
    </div>
  );
}
