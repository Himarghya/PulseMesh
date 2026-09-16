import React from 'react';
import { Cpu, Radio, Shield, Zap, CheckCircle2, Power, RefreshCw } from 'lucide-react';
import { api } from '../../services/api.js';

export function WorkerRadar({ workers = [], onRefresh }) {
  const handleDrain = async (workerId) => {
    try {
      await api.drainWorker(workerId);
      if (onRefresh) onRefresh();
    } catch (err) {
      alert(`Drain failed: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-extrabold text-white">Worker Fleet Radar</h2>
          <p className="text-xs text-slate-400">
            Real-time worker nodes, lease telemetry, memory consumption, and graceful draining controls.
          </p>
        </div>

        <button
          onClick={onRefresh}
          className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-cyan-400"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {workers.map((worker) => (
          <div key={worker.id} className="cyber-card rounded-xl p-5 space-y-4 relative overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2.5">
                <div
                  className={`w-9 h-9 rounded-lg flex items-center justify-center border ${
                    worker.status === 'online'
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                      : worker.status === 'busy'
                      ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400'
                      : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                  }`}
                >
                  <Cpu className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-mono text-sm font-bold text-white">
                    {worker.hostname || 'WorkerNode'}
                  </h3>
                  <p className="font-mono text-[10px] text-slate-500">ID: {worker.id.substring(0, 8)}...</p>
                </div>
              </div>

              <span
                className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded border ${
                  worker.status === 'online'
                    ? 'bg-emerald-950/80 text-emerald-400 border-emerald-800/50'
                    : worker.status === 'busy'
                    ? 'bg-cyan-950/80 text-cyan-400 border-cyan-800/50'
                    : 'bg-amber-950/80 text-amber-400 border-amber-800/50'
                }`}
              >
                {worker.status}
              </span>
            </div>

            {/* Telemetry Metrics */}
            <div className="space-y-3 font-mono text-xs">
              <div className="space-y-1">
                <div className="flex justify-between text-slate-400 text-[11px]">
                  <span>Active Leased Tasks</span>
                  <span className="text-cyan-400 font-bold">
                    {worker.active_jobs_count || 0} / {worker.capacity || 5}
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-900 border border-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-cyan-400 rounded-full transition-all"
                    style={{
                      width: `${Math.min(100, (((worker.active_jobs_count || 0) / (worker.capacity || 5)) * 100))}%`,
                    }}
                  ></div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/80 text-[11px]">
                <div className="p-2 rounded bg-slate-950/60 border border-slate-800/60">
                  <span className="text-slate-500 text-[10px] block">RAM Heap:</span>
                  <span className="text-slate-300 font-bold">
                    {worker.metadata?.memoryUsageMb ? `${worker.metadata.memoryUsageMb} MB` : '38 MB'}
                  </span>
                </div>
                <div className="p-2 rounded bg-slate-950/60 border border-slate-800/60">
                  <span className="text-slate-500 text-[10px] block">Last Heartbeat:</span>
                  <span className="text-slate-300">
                    {new Date(worker.last_heartbeat_at).toLocaleTimeString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Draining control */}
            {worker.status !== 'draining' && worker.status !== 'offline' && (
              <button
                onClick={() => handleDrain(worker.id)}
                className="w-full py-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-amber-400 text-xs font-semibold flex items-center justify-center space-x-2 transition-all"
              >
                <Power className="w-3.5 h-3.5" />
                <span>Drain & Stop Accepting Work</span>
              </button>
            )}
          </div>
        ))}

        {workers.length === 0 && (
          <div className="col-span-full py-12 text-center text-slate-500 font-mono text-xs">
            No workers currently sending heartbeats. Start worker instances using <code className="text-cyan-400">npm run dev:worker</code>.
          </div>
        )}
      </div>
    </div>
  );
}
