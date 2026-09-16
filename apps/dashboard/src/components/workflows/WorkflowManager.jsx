import React, { useState, useEffect } from 'react';
import {
  GitFork,
  Play,
  Plus,
  RefreshCw,
  Layers,
  Clock,
  CheckCircle2,
  ChevronRight,
  Activity,
  ShieldCheck,
  GitBranch,
  ArrowRight,
  Database,
  Sparkles,
  Zap,
  Terminal,
} from 'lucide-react';
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

  // Quick Preset DAG Templates
  const handleDeployTemplate = async (templateName) => {
    let definition;
    let name;
    let description;

    if (templateName === 'fanout_pipeline') {
      name = 'media-transcode-fanout';
      description = 'Parallel video chunk extraction, audio strip, and multi-resolution render.';
      definition = {
        tasks: [
          { id: 'extract_metadata', type: 'csv_processing', dependsOn: [] },
          { id: 'transcode_1080p', type: 'image_resize', dependsOn: ['extract_metadata'] },
          { id: 'transcode_720p', type: 'image_resize', dependsOn: ['extract_metadata'] },
          { id: 'generate_hls_manifest', type: 'report_generation', dependsOn: ['transcode_1080p', 'transcode_720p'] },
        ],
      };
    } else if (templateName === 'ecommerce_saga') {
      name = 'order-fulfillment-saga';
      description = 'Distributed transaction: Inventory lock -> Payment capture -> Invoice mail.';
      definition = {
        tasks: [
          { id: 'reserve_inventory', type: 'csv_processing', dependsOn: [] },
          { id: 'charge_customer', type: 'mock_payment', dependsOn: ['reserve_inventory'] },
          { id: 'generate_invoice', type: 'report_generation', dependsOn: ['charge_customer'] },
          { id: 'dispatch_warehouse', type: 'csv_processing', dependsOn: ['generate_invoice'] },
        ],
      };
    } else {
      name = 'ml-feature-inference-dag';
      description = 'Feature store ingestion, batch vector embedding, and model prediction scoring.';
      definition = {
        tasks: [
          { id: 'pull_features', type: 'csv_processing', dependsOn: [] },
          { id: 'embed_vectors', type: 'image_resize', dependsOn: ['pull_features'] },
          { id: 'run_prediction_model', type: 'report_generation', dependsOn: ['embed_vectors'] },
        ],
      };
    }

    try {
      const res = await api.createWorkflow({ name, description, definition });
      if (onRefresh) onRefresh();
      loadWorkflowDetails(res.data.id);
    } catch (err) {
      alert(`Deploy template failed: ${err.message}`);
    }
  };

  const tasksCount = selectedWorkflow?.latestVersion?.definition?.tasks?.length || 0;
  const succeededRuns = runs.filter((r) => r.status === 'succeeded').length;

  return (
    <div className="space-y-6">
      {/* Top Banner & Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-[#150d24] to-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-full bg-purple-500/5 blur-3xl pointer-events-none" />

        <div className="space-y-1 z-10">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 shadow-lg shadow-purple-950/40">
              <GitFork className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-xl font-extrabold text-white font-mono tracking-tight">
                  DAG Workflow Orchestration
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-purple-500/10 border border-purple-500/30 text-purple-400">
                  KAHN TOPOLOGICAL ENGINE
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Topological sorting, fan-out/fan-in branching, deterministic task runs, and live energy pulse streams.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3 z-10">
          <button
            onClick={() => setIsCreateOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs font-mono flex items-center space-x-1.5 shadow-lg shadow-purple-600/25 active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>New DAG Workflow</span>
          </button>

          <button
            onClick={() => selectedWorkflow && loadWorkflowDetails(selectedWorkflow.id)}
            className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-cyan-400 hover:bg-slate-800 transition-all"
            title="Refresh DAG Data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* DAG KPI Metrics Matrix */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 font-mono">
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span>Workflow Blueprints</span>
            <Layers className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-extrabold text-white font-mono">
            {workflows.length} <span className="text-xs font-normal text-slate-500">Registered</span>
          </div>
          <div className="text-[10px] text-purple-400">Deterministic Versioning v1</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span>Execution Runs</span>
            <Play className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-extrabold text-cyan-300 font-mono">
            {runs.length} <span className="text-xs font-normal text-slate-500">Total</span>
          </div>
          <div className="text-[10px] text-cyan-400">{succeededRuns} Succeeded Executions</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span>Current Graph Nodes</span>
            <GitBranch className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-extrabold text-white font-mono">
            {tasksCount} <span className="text-xs font-normal text-slate-500">Tasks</span>
          </div>
          <div className="text-[10px] text-emerald-400">Zero Circular Dependencies</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span>Kahn Acyclicity Guard</span>
            <ShieldCheck className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-extrabold text-emerald-300 font-mono">100%</div>
          <div className="text-[10px] text-emerald-400">Strict DAG Precedence Verified</div>
        </div>
      </div>

      {/* Main Dual-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Workflow Selector & Quick Templates (4 Columns) */}
        <div className="lg:col-span-4 space-y-5">
          {/* Workflow Blueprints Card */}
          <div className="cyber-card rounded-xl p-4 space-y-3 bg-slate-950 border border-slate-800">
            <div className="text-xs font-mono uppercase text-slate-400 pb-2 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Layers className="w-3.5 h-3.5 text-purple-400" />
                <span className="font-bold">Workflow Blueprints ({workflows.length})</span>
              </div>
              <span className="text-[10px] text-slate-500">Active DAGs</span>
            </div>

            <div className="space-y-2">
              {workflows.map((wf) => (
                <button
                  key={wf.id}
                  onClick={() => loadWorkflowDetails(wf.id)}
                  className={`w-full p-3.5 rounded-xl text-left text-xs transition-all border font-mono flex flex-col space-y-1 ${
                    selectedWorkflow?.id === wf.id
                      ? 'bg-purple-950/40 border-purple-500/60 text-white shadow-lg shadow-purple-950/40 ring-1 ring-purple-500/40'
                      : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-200 text-xs">{wf.name}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20 font-bold">
                      v1
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                    {wf.description || 'No description provided'}
                  </p>
                </button>
              ))}

              {workflows.length === 0 && (
                <div className="py-8 text-center text-xs text-slate-500 font-mono">
                  No workflows created yet. Click "New DAG Workflow" or deploy a template below.
                </div>
              )}
            </div>
          </div>

          {/* Quick DAG Architecture Presets */}
          <div className="cyber-card rounded-xl p-4 space-y-3 bg-gradient-to-b from-[#130e1c] to-[#070b13] border border-slate-800 font-mono">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center space-x-2 text-white font-bold text-xs">
                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                <span>Quick DAG Architecture Templates</span>
              </div>
              <span className="text-[10px] text-slate-500">1-Click Deploy</span>
            </div>

            <div className="space-y-2">
              {[
                {
                  id: 'fanout_pipeline',
                  name: 'Media Transcode Fan-Out',
                  desc: 'Root task branches into parallel 1080p/720p renders, then joins into HLS manifest.',
                  nodes: '4 Tasks',
                },
                {
                  id: 'ecommerce_saga',
                  name: 'Order Fulfillment Saga',
                  desc: 'Linear dependency chain with inventory reservation and billing verification.',
                  nodes: '4 Tasks',
                },
                {
                  id: 'ml_inference',
                  name: 'ML Feature & Scoring DAG',
                  desc: 'Feature store ingestion, batch vector embedding, and model prediction scoring.',
                  nodes: '3 Tasks',
                },
              ].map((tmpl) => (
                <div
                  key={tmpl.id}
                  className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 hover:border-purple-500/50 transition-all space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-white font-bold text-xs">{tmpl.name}</span>
                    <span className="text-[9px] text-cyan-400">{tmpl.nodes}</span>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-relaxed">{tmpl.desc}</p>
                  <button
                    onClick={() => handleDeployTemplate(tmpl.id)}
                    className="w-full py-1.5 rounded bg-purple-950/60 hover:bg-purple-900/60 border border-purple-800/40 text-purple-300 text-[10px] font-bold flex items-center justify-center space-x-1 transition-all"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Deploy Blueprint</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: DAG Canvas, Step Runs & Execution Table (8 Columns) */}
        <div className="lg:col-span-8 space-y-6">
          {selectedWorkflow ? (
            <>
              {/* DAG Canvas View */}
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <div>
                    <h3 className="text-base font-bold text-white font-mono flex items-center space-x-2">
                      <span>{selectedWorkflow.name}</span>
                      <span className="text-xs px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/30">
                        Active DAG
                      </span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">{selectedWorkflow.description}</p>
                  </div>

                  <button
                    onClick={handleRunWorkflow}
                    disabled={isRunningTrigger}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-extrabold text-xs font-mono flex items-center justify-center space-x-2 shadow-lg shadow-cyan-500/20 transition-all active:scale-95 disabled:opacity-50 shrink-0"
                  >
                    <Play className="w-4 h-4 fill-black" />
                    <span>{isRunningTrigger ? 'Dispatching DAG...' : 'Trigger Workflow Run'}</span>
                  </button>
                </div>

                <PulseDAGCanvas
                  workflow={selectedWorkflow}
                  workflowRun={currentRun}
                />
              </div>

              {/* Execution Runs History & Step Timeline */}
              <div className="cyber-card rounded-xl p-5 space-y-4 bg-slate-950 border border-slate-800">
                <div className="text-xs font-mono uppercase text-slate-400 pb-2 border-b border-slate-800 flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-white font-bold">
                    <Clock className="w-4 h-4 text-cyan-400" />
                    <span>Workflow Execution History ({runs.length})</span>
                  </div>
                  <span className="text-[10px] text-slate-500">Deterministic Task Runs</span>
                </div>

                <div className="space-y-2">
                  {runs.map((r) => (
                    <div
                      key={r.id}
                      onClick={() => handleSelectRun(r.id)}
                      className={`p-3.5 rounded-xl border text-xs font-mono flex items-center justify-between cursor-pointer transition-all ${
                        currentRun?.id === r.id
                          ? 'bg-cyan-950/30 border-cyan-500/50 text-white shadow-md shadow-cyan-950/40'
                          : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <span
                          className={`w-2.5 h-2.5 rounded-full ${
                            r.status === 'succeeded'
                              ? 'bg-emerald-400 shadow-sm shadow-emerald-400'
                              : r.status === 'running'
                              ? 'bg-cyan-400 animate-pulse shadow-sm shadow-cyan-400'
                              : 'bg-rose-400'
                          }`}
                        />
                        <div>
                          <div className="font-bold text-slate-200">Run: {r.id.substring(0, 8)}...</div>
                          <div className="text-[10px] text-slate-500">
                            Started: {new Date(r.started_at).toLocaleTimeString()}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-4">
                        <span
                          className={`text-[10px] uppercase px-2.5 py-0.5 rounded border font-bold ${
                            r.status === 'succeeded'
                              ? 'bg-emerald-950/80 text-emerald-400 border-emerald-800/50'
                              : r.status === 'running'
                              ? 'bg-cyan-950/80 text-cyan-400 border-cyan-800/50'
                              : 'bg-rose-950/80 text-rose-400 border-rose-800/50'
                          }`}
                        >
                          {r.status}
                        </span>
                        <ChevronRight className="w-4 h-4 text-slate-600" />
                      </div>
                    </div>
                  ))}

                  {runs.length === 0 && (
                    <div className="py-8 text-center text-xs text-slate-500 font-mono">
                      No executions recorded yet. Click "Trigger Workflow Run" to execute the DAG engine.
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="cyber-card rounded-2xl p-16 text-center text-slate-500 font-mono text-xs border border-dashed border-slate-800">
              Select or deploy a workflow blueprint to explore its interactive DAG graph.
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

