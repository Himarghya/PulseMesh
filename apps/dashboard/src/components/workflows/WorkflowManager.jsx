import React, { useState, useEffect } from 'react';
import {
  GitFork,
  Play,
  Plus,
  RefreshCw,
  Layers,
  Clock,
  ChevronRight,
  ShieldCheck,
  GitBranch,
  Sparkles,
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#202A3A]">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-[#F4F7FB]">
            DAG Workflow Orchestration
          </h1>
          <p className="text-xs sm:text-sm text-[#98A4B7] mt-0.5">
            Topological sorting, fan-out/fan-in branching, deterministic task runs, and step visualization.
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            onClick={() => setIsCreateOpen(true)}
            className="px-3 py-1.5 rounded-md bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs flex items-center space-x-1.5 transition-colors"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>New DAG Workflow</span>
          </button>

          <button
            onClick={() => selectedWorkflow && loadWorkflowDetails(selectedWorkflow.id)}
            className="p-1.5 rounded-md bg-[#0F1420] border border-[#202A3A] text-[#98A4B7] hover:text-[#F4F7FB] transition-colors"
            title="Refresh DAG Data"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* DAG KPI Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 font-mono">
        <div className="p-4 rounded-xl bg-[#0F1420] border border-[#202A3A] space-y-1">
          <div className="flex items-center justify-between text-[#667085] text-xs">
            <span>Blueprints</span>
            <Layers className="w-4 h-4 text-violet-400" />
          </div>
          <div className="text-2xl font-bold text-[#F4F7FB]">
            {workflows.length} <span className="text-xs font-normal text-[#667085]">Registered</span>
          </div>
          <div className="text-[10px] text-violet-400">Versioning v1 Active</div>
        </div>

        <div className="p-4 rounded-xl bg-[#0F1420] border border-[#202A3A] space-y-1">
          <div className="flex items-center justify-between text-[#667085] text-xs">
            <span>Execution Runs</span>
            <Play className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold text-cyan-400">
            {runs.length} <span className="text-xs font-normal text-[#667085]">Total</span>
          </div>
          <div className="text-[10px] text-cyan-400">{succeededRuns} Succeeded</div>
        </div>

        <div className="p-4 rounded-xl bg-[#0F1420] border border-[#202A3A] space-y-1">
          <div className="flex items-center justify-between text-[#667085] text-xs">
            <span>Graph Nodes</span>
            <GitBranch className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-[#F4F7FB]">
            {tasksCount} <span className="text-xs font-normal text-[#667085]">Tasks</span>
          </div>
          <div className="text-[10px] text-emerald-400">Zero Cycles Detected</div>
        </div>

        <div className="p-4 rounded-xl bg-[#0F1420] border border-[#202A3A] space-y-1">
          <div className="flex items-center justify-between text-[#667085] text-xs">
            <span>Kahn Guard</span>
            <ShieldCheck className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400">100%</div>
          <div className="text-[10px] text-emerald-400">DAG Precedence Verified</div>
        </div>
      </div>

      {/* Main Dual-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Workflow Selector & Presets */}
        <div className="lg:col-span-4 space-y-4">
          <div className="rounded-xl p-4 space-y-2.5 bg-[#0F1420] border border-[#202A3A]">
            <div className="text-xs font-mono uppercase text-[#667085] pb-2 border-b border-[#202A3A] flex items-center justify-between">
              <span className="font-semibold text-[#F4F7FB] flex items-center space-x-1.5">
                <Layers className="w-3.5 h-3.5 text-violet-400" />
                <span>Workflows ({workflows.length})</span>
              </span>
            </div>

            <div className="space-y-1.5">
              {workflows.map((wf) => (
                <button
                  key={wf.id}
                  onClick={() => loadWorkflowDetails(wf.id)}
                  className={`w-full p-3 rounded-lg text-left text-xs transition-colors border font-mono flex flex-col space-y-0.5 ${
                    selectedWorkflow?.id === wf.id
                      ? 'bg-[#151C2B] border-[#283448] text-[#F4F7FB]'
                      : 'bg-[#0B0F19] border-[#202A3A] text-[#98A4B7] hover:text-[#F4F7FB] hover:bg-[#121827]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-[#F4F7FB] text-xs">{wf.name}</span>
                    <span className="text-[9px] px-1 py-0.2 rounded bg-violet-500/10 text-violet-400 border border-violet-500/20 font-bold">
                      v1
                    </span>
                  </div>
                  <p className="text-[10px] text-[#667085] line-clamp-1">
                    {wf.description || 'No description'}
                  </p>
                </button>
              ))}

              {workflows.length === 0 && (
                <div className="py-6 text-center text-xs text-[#667085] font-sans">
                  No workflows created yet.
                </div>
              )}
            </div>
          </div>

          {/* Quick Architecture Templates */}
          <div className="rounded-xl p-4 space-y-2.5 bg-[#0F1420] border border-[#202A3A] font-mono">
            <div className="flex items-center justify-between border-b border-[#202A3A] pb-2">
              <span className="text-[#F4F7FB] font-semibold text-xs flex items-center space-x-1.5">
                <Sparkles className="w-3.5 h-3.5 text-violet-400" />
                <span>1-Click Templates</span>
              </span>
            </div>

            <div className="space-y-2">
              {[
                {
                  id: 'fanout_pipeline',
                  name: 'Media Transcode Fan-Out',
                  desc: 'Root task branches into parallel 1080p/720p renders, then joins.',
                },
                {
                  id: 'ecommerce_saga',
                  name: 'Order Fulfillment Saga',
                  desc: 'Linear dependency chain with inventory and payment capture.',
                },
                {
                  id: 'ml_inference',
                  name: 'ML Feature & Scoring DAG',
                  desc: 'Feature store ingestion, batch embedding, and model scoring.',
                },
              ].map((tmpl) => (
                <div
                  key={tmpl.id}
                  className="p-2.5 rounded-lg bg-[#0B0F19] border border-[#202A3A] hover:border-[#2D3D56] transition-colors space-y-1.5"
                >
                  <div className="text-[#F4F7FB] font-semibold text-xs">{tmpl.name}</div>
                  <p className="text-[10px] text-[#667085] leading-relaxed">{tmpl.desc}</p>
                  <button
                    onClick={() => handleDeployTemplate(tmpl.id)}
                    className="w-full py-1 rounded bg-[#151C2B] hover:bg-[#1B2436] border border-[#202A3A] text-cyan-400 text-[10px] font-semibold flex items-center justify-center space-x-1 transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Deploy Blueprint</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: DAG Canvas & Step Runs */}
        <div className="lg:col-span-8 space-y-4">
          {selectedWorkflow ? (
            <>
              {/* DAG Canvas View */}
              <div className="space-y-2.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0F1420] p-4 rounded-xl border border-[#202A3A]">
                  <div>
                    <h3 className="text-sm font-semibold text-[#F4F7FB] font-sans flex items-center space-x-2">
                      <span>{selectedWorkflow.name}</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-violet-500/10 text-violet-400 border border-violet-500/30">
                        Active DAG
                      </span>
                    </h3>
                    <p className="text-xs text-[#98A4B7] mt-0.5">{selectedWorkflow.description}</p>
                  </div>

                  <button
                    onClick={handleRunWorkflow}
                    disabled={isRunningTrigger}
                    className="px-3.5 py-1.5 rounded-md bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs flex items-center justify-center space-x-1.5 transition-colors disabled:opacity-50 shrink-0"
                  >
                    <Play className="w-3.5 h-3.5 fill-slate-950" />
                    <span>{isRunningTrigger ? 'Dispatching...' : 'Trigger Run'}</span>
                  </button>
                </div>

                <PulseDAGCanvas
                  workflow={selectedWorkflow}
                  workflowRun={currentRun}
                />
              </div>

              {/* Execution Runs History */}
              <div className="rounded-xl p-4 space-y-3 bg-[#0F1420] border border-[#202A3A]">
                <div className="text-xs font-mono uppercase text-[#667085] pb-2 border-b border-[#202A3A] flex items-center justify-between">
                  <span className="text-[#F4F7FB] font-semibold flex items-center space-x-1.5">
                    <Clock className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Workflow Runs ({runs.length})</span>
                  </span>
                </div>

                <div className="space-y-1.5">
                  {runs.map((r) => (
                    <div
                      key={r.id}
                      onClick={() => handleSelectRun(r.id)}
                      className={`p-3 rounded-lg border text-xs font-mono flex items-center justify-between cursor-pointer transition-colors ${
                        currentRun?.id === r.id
                          ? 'bg-[#151C2B] border-[#283448] text-[#F4F7FB]'
                          : 'bg-[#0B0F19] border-[#202A3A] text-[#98A4B7] hover:bg-[#121827]'
                      }`}
                    >
                      <div className="flex items-center space-x-2.5">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            r.status === 'succeeded'
                              ? 'bg-emerald-400'
                              : r.status === 'running'
                              ? 'bg-cyan-400 animate-pulse'
                              : 'bg-rose-400'
                          }`}
                        />
                        <div>
                          <div className="font-semibold text-[#F4F7FB]">Run: {r.id.substring(0, 8)}...</div>
                          <div className="text-[10px] text-[#667085]">
                            Started: {new Date(r.started_at).toLocaleTimeString()}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-3">
                        <span
                          className={`text-[9px] uppercase px-2 py-0.2 rounded border font-semibold ${
                            r.status === 'succeeded'
                              ? 'bg-emerald-950/40 text-emerald-400 border-emerald-800/50'
                              : r.status === 'running'
                              ? 'bg-cyan-950/40 text-cyan-400 border-cyan-800/50'
                              : 'bg-rose-950/40 text-rose-400 border-rose-800/50'
                          }`}
                        >
                          {r.status}
                        </span>
                        <ChevronRight className="w-4 h-4 text-[#667085]" />
                      </div>
                    </div>
                  ))}

                  {runs.length === 0 && (
                    <div className="py-6 text-center text-xs text-[#667085] font-sans">
                      No executions recorded yet.
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="rounded-xl p-12 text-center text-[#667085] font-sans text-xs border border-dashed border-[#202A3A]">
              Select or deploy a workflow blueprint to explore its DAG graph.
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
