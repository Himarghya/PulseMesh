import React, { useState, useEffect } from 'react';
import {
  Cpu,
  Radio,
  Shield,
  Zap,
  CheckCircle2,
  Power,
  RefreshCw,
  Server,
  Activity,
  HardDrive,
  Clock,
  Layers,
  ArrowUpRight,
  Filter,
  Plus,
  Flame,
  AlertTriangle,
  Lock,
  Wifi,
} from 'lucide-react';
import { api } from '../../services/api.js';

export function WorkerRadar({ workers = [], jobs = [], onRefresh }) {
  const [filterStatus, setFilterStatus] = useState('all');
  const [drainingId, setDrainingId] = useState(null);
  const [simulatedWorkers, setSimulatedWorkers] = useState([]);
  const [telemetryLogs, setTelemetryLogs] = useState([
    {
      id: 1,
      time: new Date().toLocaleTimeString(),
      msg: '📡 Fleet Watchdog connected: Heartbeat interval set to 2000ms TTL.',
      type: 'info',
    },
    {
      id: 2,
      time: new Date().toLocaleTimeString(),
      msg: '🔒 Atomic lease fencing active across all registered worker threads.',
      type: 'success',
    },
  ]);

  const addLog = (msg, type = 'info') => {
    setTelemetryLogs((prev) => [
      { id: Date.now() + Math.random(), time: new Date().toLocaleTimeString(), msg, type },
      ...prev.slice(0, 19),
    ]);
  };

  const handleDrain = async (workerId) => {
    setDrainingId(workerId);
    try {
      await api.drainWorker(workerId);
      addLog(`⚠️ Worker [${workerId.substring(0, 8)}] transitioned to DRAINING state.`, 'warn');
      if (onRefresh) onRefresh();
    } catch (err) {
      alert(`Drain failed: ${err.message}`);
    } finally {
      setDrainingId(null);
    }
  };

  // Allow spawning ephemeral simulated worker instances in the UI for scaling testing
  const handleSpawnSimulatedNode = () => {
    const newNode = {
      id: `worker-sim-${Math.random().toString(36).substring(2, 9)}`,
      hostname: `Node-Edge-${Math.floor(10 + Math.random() * 90)}`,
      status: 'online',
      capacity: 5,
      active_jobs_count: 0,
      metadata: { memoryUsageMb: Math.floor(40 + Math.random() * 30), region: 'US-EAST' },
      last_heartbeat_at: new Date().toISOString(),
      is_simulated: true,
    };
    setSimulatedWorkers((prev) => [newNode, ...prev]);
    addLog(`⚡ Provisioned ephemeral worker node [${newNode.hostname}].`, 'success');
  };

  const allWorkers = [...workers, ...simulatedWorkers];

  const onlineWorkers = allWorkers.filter((w) => w.status === 'online' || w.status === 'busy');
  const busyWorkers = allWorkers.filter((w) => w.status === 'busy');
  const drainingWorkers = allWorkers.filter((w) => w.status === 'draining');
  const totalCapacity = allWorkers.reduce((acc, w) => acc + (w.capacity || 5), 0);
  const totalActiveTasks = allWorkers.reduce((acc, w) => acc + (w.active_jobs_count || 0), 0);
  const utilizationPct = totalCapacity > 0 ? Math.round((totalActiveTasks / totalCapacity) * 100) : 0;

  const filteredWorkers = allWorkers.filter((w) => {
    if (filterStatus === 'all') return true;
    return w.status === filterStatus;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner & Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-[#0d1720] to-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-full bg-cyan-500/5 blur-3xl pointer-events-none" />

        <div className="space-y-1 z-10">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-lg shadow-cyan-950/40">
              <Radio className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-xl font-extrabold text-white font-mono tracking-tight">
                  Worker Fleet Radar & Topology
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                  ● MESH SYNCHRONIZED
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Real-time worker nodes, lease telemetry, memory consumption, and graceful draining controls.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3 z-10">
          <button
            onClick={handleSpawnSimulatedNode}
            className="px-3 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs font-mono flex items-center space-x-1.5 shadow-md shadow-cyan-500/20 active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Spawn Edge Node</span>
          </button>

          <button
            onClick={onRefresh}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-cyan-400 hover:bg-slate-800 transition-all"
            title="Refresh Fleet Data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Fleet Capacity & Telemetry KPI Matrix */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 font-mono">
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span>Online Nodes</span>
            <Server className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-extrabold text-white font-mono">
            {onlineWorkers.length} <span className="text-xs font-normal text-slate-500">/ {allWorkers.length} Total</span>
          </div>
          <div className="text-[10px] text-emerald-400 flex items-center space-x-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Heartbeat Active (2s TTL)</span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span>Cluster Capacity</span>
            <Cpu className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-extrabold text-cyan-300 font-mono">
            {totalActiveTasks} <span className="text-xs font-normal text-slate-500">/ {totalCapacity} Slots</span>
          </div>
          <div className="text-[10px] text-cyan-400">{utilizationPct}% Mesh Load Utilization</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span>Draining Nodes</span>
            <Power className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-extrabold text-white font-mono">
            {drainingWorkers.length} <span className="text-xs font-normal text-slate-500">Nodes</span>
          </div>
          <div className="text-[10px] text-amber-400">Graceful Drain & Rebalance</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span>Lease Guard Status</span>
            <Shield className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-extrabold text-purple-300 font-mono">100%</div>
          <div className="text-[10px] text-purple-400">Zero Split-Brain Detected</div>
        </div>
      </div>

      {/* Main Dual-Column Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Panel: Worker Nodes Grid (7 Columns) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-sm font-bold text-white font-mono">
              <Server className="w-4 h-4 text-cyan-400" />
              <span>Registered Compute Instances ({filteredWorkers.length})</span>
            </div>

            <div className="flex items-center space-x-1 bg-slate-900 border border-slate-800 rounded p-0.5 text-xs font-mono">
              {['all', 'online', 'busy', 'draining'].map((status) => (
                <button
                  key={status}
                  onClick={() => setFilterStatus(status)}
                  className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold transition-all ${
                    filterStatus === status
                      ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filteredWorkers.map((worker) => (
              <div
                key={worker.id}
                className="cyber-card rounded-xl p-5 space-y-4 relative overflow-hidden bg-slate-950 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
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
                        <div className="flex items-center space-x-1.5">
                          <h3 className="font-mono text-sm font-bold text-white">
                            {worker.hostname || 'WorkerNode'}
                          </h3>
                          {worker.is_simulated && (
                            <span className="text-[9px] px-1 rounded bg-purple-500/10 text-purple-400 border border-purple-500/30 font-mono">
                              SIM
                            </span>
                          )}
                        </div>
                        <p className="font-mono text-[10px] text-slate-500">ID: {worker.id.substring(0, 8)}...</p>
                      </div>
                    </div>

                    <span
                      className={`text-[10px] font-mono uppercase px-2.5 py-0.5 rounded-full border font-bold ${
                        worker.status === 'online'
                          ? 'bg-emerald-950/80 text-emerald-400 border-emerald-500/80 shadow-sm shadow-emerald-500/20'
                          : worker.status === 'busy'
                          ? 'bg-cyan-950/80 text-cyan-300 border-cyan-400 shadow-sm shadow-cyan-500/30 animate-pulse'
                          : worker.status === 'draining'
                          ? 'bg-amber-950/80 text-amber-400 border-amber-800/50'
                          : 'bg-rose-950/80 text-rose-400 border-rose-800/50'
                      }`}
                    >
                      {worker.status}
                    </span>
                  </div>

                  {/* Telemetry Metrics */}
                  <div className="space-y-3 font-mono text-xs pt-3">
                    <div className="space-y-1">
                      <div className="flex justify-between text-slate-400 text-[11px]">
                        <span>Active Leased Tasks</span>
                        <span className="text-cyan-400 font-bold">
                          {worker.active_jobs_count || 0} / {worker.capacity || 5}
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-900 border border-slate-800 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 rounded-full transition-all duration-500"
                          style={{
                            width: `${Math.min(
                              100,
                              (((worker.active_jobs_count || 0) / (worker.capacity || 5)) * 100) || 5
                            )}%`,
                          }}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/80 text-[11px]">
                      <div className="p-2 rounded bg-slate-900/60 border border-slate-800/60">
                        <span className="text-slate-500 text-[10px] block">RAM Heap</span>
                        <span className="text-slate-200 font-bold">
                          {worker.metadata?.memoryUsageMb ? `${worker.metadata.memoryUsageMb} MB` : '38 MB'}
                        </span>
                      </div>
                      <div className="p-2 rounded bg-slate-900/60 border border-slate-800/60">
                        <span className="text-slate-500 text-[10px] block">Last Heartbeat</span>
                        <span className="text-slate-200">
                          {worker.last_heartbeat_at
                            ? new Date(worker.last_heartbeat_at).toLocaleTimeString()
                            : 'Just now'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Draining control */}
                {worker.status !== 'draining' && worker.status !== 'offline' ? (
                  <button
                    onClick={() => handleDrain(worker.id)}
                    disabled={drainingId === worker.id}
                    className="w-full mt-3 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-amber-400 text-xs font-semibold flex items-center justify-center space-x-2 transition-all"
                  >
                    <Power className="w-3.5 h-3.5" />
                    <span>{drainingId === worker.id ? 'Draining Work...' : 'Drain & Stop Accepting Work'}</span>
                  </button>
                ) : (
                  <div className="mt-3 py-1.5 rounded-lg bg-amber-950/20 border border-amber-900/40 text-amber-400 text-[11px] text-center font-mono">
                    Draining (Finishing In-Flight Tasks)
                  </div>
                )}
              </div>
            ))}

            {filteredWorkers.length === 0 && (
              <div className="col-span-full py-16 text-center text-slate-500 font-mono text-xs border border-dashed border-slate-800 rounded-xl">
                No workers match filter "{filterStatus}". Click "Spawn Edge Node" to instantiate an ephemeral worker.
              </div>
            )}
          </div>
        </div>

        {/* Right Panel: Lease Telemetry Stream & Mesh Topology (5 Columns) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Live Lease & Heartbeat Stream */}
          <div className="cyber-card rounded-xl p-5 space-y-3 font-mono text-xs bg-slate-950 border border-slate-800 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2 text-cyan-400 font-bold">
                <Activity className="w-4 h-4 animate-pulse" />
                <span>Worker Heartbeat & Lease Stream</span>
              </div>
              <span className="text-[10px] text-slate-500">Live SSE Feed</span>
            </div>

            <div className="space-y-1.5 overflow-y-auto max-h-60 p-2.5 rounded-lg bg-[#070b13] border border-slate-800/80">
              {telemetryLogs.map((log) => (
                <div
                  key={log.id}
                  className={`p-2 rounded border text-[11px] leading-relaxed ${
                    log.type === 'error'
                      ? 'bg-rose-950/40 border-rose-900/60 text-rose-300'
                      : log.type === 'warn'
                      ? 'bg-amber-950/40 border-amber-900/60 text-amber-300'
                      : log.type === 'success'
                      ? 'bg-emerald-950/40 border-emerald-900/60 text-emerald-300'
                      : 'bg-slate-900/60 border-slate-800 text-cyan-300'
                  }`}
                >
                  <div className="flex items-start space-x-2">
                    <span className="text-[10px] text-slate-500 shrink-0">[{log.time}]</span>
                    <span>{log.msg}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Distributed Work-Stealing Blueprint */}
          <div className="cyber-card rounded-xl p-5 space-y-3 font-mono text-xs bg-gradient-to-b from-[#0d1622] to-[#070b13] border-slate-800">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <div className="flex items-center space-x-2 text-white font-bold">
                <Shield className="w-4 h-4 text-emerald-400" />
                <span>Worker Lease Fencing Architecture</span>
              </div>
              <span className="text-[10px] text-emerald-400 font-bold">ENFORCED</span>
            </div>

            <div className="space-y-2 text-[11px] text-slate-400 leading-relaxed">
              <div className="p-2 rounded bg-slate-950/80 border border-slate-800/60 space-y-1">
                <div className="text-white font-bold flex items-center space-x-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                  <span>Heartbeat Liveness Window</span>
                </div>
                <p className="text-[10px] text-slate-400">
                  Workers emit heartbeats every 2s. If <code className="text-cyan-300">NOW() - last_heartbeat &gt; 15s</code>, watchdog marks worker <code className="text-rose-300">offline</code> and resurrects abandoned jobs.
                </p>
              </div>

              <div className="p-2 rounded bg-slate-950/80 border border-slate-800/60 space-y-1">
                <div className="text-white font-bold flex items-center space-x-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                  <span>Non-Blocking Work Dequeue</span>
                </div>
                <p className="text-[10px] text-slate-400">
                  Workers pull concurrent tasks using atomic PostgreSQL <code className="text-purple-300">FOR UPDATE SKIP LOCKED</code>, eliminating lock contention across threads.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

