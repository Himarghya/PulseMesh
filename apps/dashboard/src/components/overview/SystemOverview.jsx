import React from 'react';
import { MetricCard } from './MetricCard.jsx';
import {
  Activity,
  Cpu,
  Layers,
  CheckCircle2,
  AlertTriangle,
  Flame,
  ArrowUpRight,
  RefreshCw,
  Zap,
} from 'lucide-react';

export function SystemOverview({ stats, jobs = [], workers = [], onTriggerDemoJob, onNavigateTab }) {
  const totalJobs = jobs.length;
  const succeeded = jobs.filter((j) => j.status === 'succeeded').length;
  const failed = jobs.filter((j) => j.status === 'failed' || j.status === 'dead_letter').length;
  const activeWorkers = workers.filter((w) => w.status === 'online' || w.status === 'busy').length;
  const successRate = totalJobs > 0 ? ((succeeded / totalJobs) * 100).toFixed(1) : '100.0';

  const runningJobs = jobs.filter((j) => j.status === 'running');
  const queuedJobs = jobs.filter((j) => j.status === 'queued');

  return (
    <div className="space-y-6">
      {/* Top Banner Action */}
      <div className="cyber-card rounded-2xl p-6 bg-gradient-to-r from-[#0D1322] via-[#0E172B] to-[#121B33] border-slate-800 relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping"></span>
            <h2 className="text-xl font-extrabold text-white">Distributed Telemetry Matrix</h2>
          </div>
          <p className="text-xs text-slate-400 max-w-xl">
            Real-time multi-tenant job processing, atomic lease recovery, and DAG workflow orchestration with guaranteed at-least-once execution.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={onTriggerDemoJob}
            className="px-4 py-2.5 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-bold text-xs flex items-center space-x-2 shadow-lg shadow-cyan-500/20 transition-all active:scale-95"
          >
            <Zap className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Dispatch Test Task</span>
          </button>

          <button
            onClick={() => onNavigateTab('chaos')}
            className="px-4 py-2.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-semibold flex items-center space-x-2 transition-all"
          >
            <Flame className="w-3.5 h-3.5" />
            <span>Chaos Simulator</span>
          </button>
        </div>
      </div>

      {/* Telemetry Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Active Workers"
          value={activeWorkers}
          subtitle={`${workers.length} registered in pool`}
          icon={Cpu}
          color="cyan"
          badge={{ label: 'Lease Duration', value: '30s TTL' }}
        />
        <MetricCard
          title="Jobs In-Flight"
          value={runningJobs.length}
          subtitle={`${queuedJobs.length} waiting in queue`}
          icon={Activity}
          color="purple"
          badge={{ label: 'Concurrency Max', value: '5/node' }}
        />
        <MetricCard
          title="Success Rate"
          value={`${successRate}%`}
          subtitle={`${succeeded} completed jobs`}
          icon={CheckCircle2}
          color="emerald"
          badge={{ label: 'Durable Commits', value: '100% PG' }}
        />
        <MetricCard
          title="Dead-Letter / Failed"
          value={failed}
          subtitle="Auto-resurrected or archived"
          icon={AlertTriangle}
          color="rose"
          badge={{ label: 'Fencing Guard', value: 'Active' }}
        />
      </div>

      {/* Dual Section: Live Pipeline & Recent Execution Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Live Execution Matrix */}
        <div className="lg:col-span-2 cyber-card rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <div className="flex items-center space-x-2">
              <Layers className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-bold text-white">Live Execution Pipeline</h3>
            </div>
            <button
              onClick={() => onNavigateTab('jobs')}
              className="text-xs text-cyan-400 hover:underline flex items-center space-x-1"
            >
              <span>View All Jobs</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2.5">
            {jobs.slice(0, 5).map((job) => (
              <div
                key={job.id}
                className="p-3.5 rounded-lg bg-slate-900/60 border border-slate-800/60 hover:border-slate-700 flex items-center justify-between transition-all"
              >
                <div className="flex items-center space-x-3">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      job.status === 'succeeded'
                        ? 'bg-emerald-400'
                        : job.status === 'running'
                        ? 'bg-cyan-400 animate-pulse'
                        : job.status === 'failed' || job.status === 'dead_letter'
                        ? 'bg-rose-400'
                        : 'bg-amber-400'
                    }`}
                  ></div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-xs font-semibold text-white">{job.type}</span>
                      <span className="font-mono text-[10px] text-slate-500">{job.id.substring(0, 8)}...</span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Queue: <span className="text-slate-300 font-mono">{job.queue_name}</span> • Priority:{' '}
                      <span className="text-cyan-400 font-mono font-bold">{job.priority}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <span
                    className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded border ${
                      job.status === 'succeeded'
                        ? 'bg-emerald-950/80 text-emerald-400 border-emerald-800/50'
                        : job.status === 'running'
                        ? 'bg-cyan-950/80 text-cyan-400 border-cyan-800/50'
                        : job.status === 'failed' || job.status === 'dead_letter'
                        ? 'bg-rose-950/80 text-rose-400 border-rose-800/50'
                        : 'bg-amber-950/80 text-amber-400 border-amber-800/50'
                    }`}
                  >
                    {job.status}
                  </span>
                  <span className="text-[10px] font-mono text-slate-500">
                    {new Date(job.created_at).toLocaleTimeString()}
                  </span>
                </div>
              </div>
            ))}

            {jobs.length === 0 && (
              <div className="py-8 text-center text-xs text-slate-500 font-mono">
                No active background tasks in telemetry stream.
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Col: Worker Fleet Status Mini Radar */}
        <div className="cyber-card rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <div className="flex items-center space-x-2">
              <Cpu className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-bold text-white">Worker Fleet Radar</h3>
            </div>
            <button
              onClick={() => onNavigateTab('workers')}
              className="text-xs text-cyan-400 hover:underline flex items-center space-x-1"
            >
              <span>Manage Fleet</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {workers.map((w) => (
              <div
                key={w.id}
                className="p-3 rounded-lg bg-slate-900/60 border border-slate-800/60 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        w.status === 'online'
                          ? 'bg-emerald-400 shadow-sm shadow-emerald-400/50'
                          : w.status === 'busy'
                          ? 'bg-cyan-400 animate-pulse'
                          : w.status === 'draining'
                          ? 'bg-amber-400'
                          : 'bg-slate-600'
                      }`}
                    ></span>
                    <span className="font-mono text-xs font-semibold text-slate-200">
                      {w.hostname || 'WorkerNode'} ({w.id.substring(0, 6)})
                    </span>
                  </div>
                  <span className="text-[10px] font-mono uppercase text-slate-400">{w.status}</span>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                    <span>Leased Load</span>
                    <span>
                      {w.active_jobs_count || 0} / {w.capacity || 5}
                    </span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-cyan-400 rounded-full transition-all"
                      style={{
                        width: `${Math.min(100, (((w.active_jobs_count || 0) / (w.capacity || 5)) * 100))}%`,
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}

            {workers.length === 0 && (
              <div className="py-8 text-center text-xs text-slate-500 font-mono">
                No active workers connected to Redis queue.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
