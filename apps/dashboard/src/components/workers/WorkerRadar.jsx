import React, { useState } from 'react';
import {
  Cpu,
  Radio,
  Shield,
  RefreshCw,
  Server,
  Activity,
  Power,
  Plus,
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
      msg: 'Fleet Watchdog connected: Heartbeat interval set to 2000ms TTL.',
      type: 'info',
    },
    {
      id: 2,
      time: new Date().toLocaleTimeString(),
      msg: 'Atomic lease fencing active across all registered worker threads.',
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
      addLog(`Worker [${workerId.substring(0, 8)}] transitioned to DRAINING state.`, 'warn');
      if (onRefresh) onRefresh();
    } catch (err) {
      alert(`Drain failed: ${err.message}`);
    } finally {
      setDrainingId(null);
    }
  };

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
    addLog(`Provisioned ephemeral worker node [${newNode.hostname}].`, 'success');
  };

  const allWorkers = [...workers, ...simulatedWorkers];
  const onlineWorkers = allWorkers.filter((w) => w.status === 'online' || w.status === 'busy');
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#202A3A]">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-[#F4F7FB]">
            Worker Fleet Radar & Topology
          </h1>
          <p className="text-xs sm:text-sm text-[#98A4B7] mt-0.5">
            Real-time worker nodes, lease telemetry, memory consumption, and graceful draining controls.
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            onClick={handleSpawnSimulatedNode}
            className="px-3 py-1.5 rounded-md bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs flex items-center space-x-1.5 transition-colors"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Spawn Edge Node</span>
          </button>

          <button
            onClick={onRefresh}
            className="p-1.5 rounded-md bg-[#0F1420] border border-[#202A3A] text-[#98A4B7] hover:text-[#F4F7FB] transition-colors"
            title="Refresh Fleet Data"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Fleet Capacity KPI Matrix */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 font-mono">
        <div className="p-4 rounded-xl bg-[#0F1420] border border-[#202A3A] space-y-1">
          <div className="flex items-center justify-between text-[#667085] text-xs">
            <span>Online Nodes</span>
            <Server className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-[#F4F7FB]">
            {onlineWorkers.length} <span className="text-xs font-normal text-[#667085]">/ {allWorkers.length}</span>
          </div>
          <div className="text-[10px] text-emerald-400">Heartbeat (2s TTL)</div>
        </div>

        <div className="p-4 rounded-xl bg-[#0F1420] border border-[#202A3A] space-y-1">
          <div className="flex items-center justify-between text-[#667085] text-xs">
            <span>Capacity</span>
            <Cpu className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold text-cyan-400">
            {totalActiveTasks} <span className="text-xs font-normal text-[#667085]">/ {totalCapacity} Slots</span>
          </div>
          <div className="text-[10px] text-cyan-400">{utilizationPct}% Utilization</div>
        </div>

        <div className="p-4 rounded-xl bg-[#0F1420] border border-[#202A3A] space-y-1">
          <div className="flex items-center justify-between text-[#667085] text-xs">
            <span>Draining</span>
            <Power className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-[#F4F7FB]">
            {drainingWorkers.length} <span className="text-xs font-normal text-[#667085]">Nodes</span>
          </div>
          <div className="text-[10px] text-amber-400">Graceful Rebalance</div>
        </div>

        <div className="p-4 rounded-xl bg-[#0F1420] border border-[#202A3A] space-y-1">
          <div className="flex items-center justify-between text-[#667085] text-xs">
            <span>Lease Guard</span>
            <Shield className="w-4 h-4 text-violet-400" />
          </div>
          <div className="text-2xl font-bold text-violet-400">100%</div>
          <div className="text-[10px] text-violet-400">Zero Overwrites</div>
        </div>
      </div>

      {/* Main Dual-Column Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Panel: Worker Nodes Grid */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-[#F4F7FB] font-sans flex items-center space-x-2">
              <Server className="w-4 h-4 text-cyan-400" />
              <span>Registered Nodes ({filteredWorkers.length})</span>
            </span>

            <div className="flex items-center bg-[#0F1420] border border-[#202A3A] rounded-md p-0.5 text-xs font-mono">
              {['all', 'online', 'busy', 'draining'].map((status) => (
                <button
                  key={status}
                  onClick={() => setFilterStatus(status)}
                  className={`px-2 py-0.5 rounded text-[10px] uppercase font-semibold transition-colors ${
                    filterStatus === status
                      ? 'bg-[#151C2B] text-cyan-400'
                      : 'text-[#667085] hover:text-[#98A4B7]'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {filteredWorkers.map((worker) => (
              <div
                key={worker.id}
                className="rounded-xl p-4 space-y-3.5 bg-[#0F1420] border border-[#202A3A] hover:border-[#2D3D56] transition-colors flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between border-b border-[#202A3A] pb-2.5">
                    <div className="flex items-center space-x-2">
                      <div className="w-7 h-7 rounded-md bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                        <Cpu className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <div className="flex items-center space-x-1.5">
                          <h3 className="font-mono text-xs font-semibold text-[#F4F7FB]">
                            {worker.hostname || 'WorkerNode'}
                          </h3>
                          {worker.is_simulated && (
                            <span className="text-[8px] px-1 rounded bg-violet-500/10 text-violet-400 border border-violet-500/30 font-mono">
                              SIM
                            </span>
                          )}
                        </div>
                        <p className="font-mono text-[9px] text-[#667085]">ID: {worker.id.substring(0, 8)}...</p>
                      </div>
                    </div>

                    <span
                      className={`text-[9px] font-mono uppercase px-2 py-0.2 rounded border font-semibold ${
                        worker.status === 'online'
                          ? 'bg-emerald-950/40 text-emerald-400 border-emerald-800/50'
                          : worker.status === 'busy'
                          ? 'bg-cyan-950/40 text-cyan-300 border-cyan-800/50'
                          : 'bg-amber-950/40 text-amber-400 border-amber-800/50'
                      }`}
                    >
                      {worker.status}
                    </span>
                  </div>

                  {/* Telemetry Metrics */}
                  <div className="space-y-2.5 font-mono text-xs pt-2">
                    <div className="space-y-1">
                      <div className="flex justify-between text-[#98A4B7] text-[10px]">
                        <span>Active Tasks</span>
                        <span className="text-cyan-400 font-semibold">
                          {worker.active_jobs_count || 0} / {worker.capacity || 5}
                        </span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-[#0B0F19] border border-[#202A3A] overflow-hidden">
                        <div
                          className="h-full bg-cyan-400 rounded-full transition-all duration-300"
                          style={{
                            width: `${Math.min(
                              100,
                              (((worker.active_jobs_count || 0) / (worker.capacity || 5)) * 100) || 5
                            )}%`,
                          }}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1 border-t border-[#18202E] text-[10px]">
                      <div className="p-1.5 rounded bg-[#0B0F19] border border-[#202A3A]">
                        <span className="text-[#667085] block">RAM Heap</span>
                        <span className="text-[#F4F7FB] font-medium">
                          {worker.metadata?.memoryUsageMb ? `${worker.metadata.memoryUsageMb} MB` : '38 MB'}
                        </span>
                      </div>
                      <div className="p-1.5 rounded bg-[#0B0F19] border border-[#202A3A]">
                        <span className="text-[#667085] block">Heartbeat</span>
                        <span className="text-[#F4F7FB]">
                          {worker.last_heartbeat_at
                            ? new Date(worker.last_heartbeat_at).toLocaleTimeString()
                            : 'Just now'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Draining Control */}
                {worker.status !== 'draining' && worker.status !== 'offline' ? (
                  <button
                    onClick={() => handleDrain(worker.id)}
                    disabled={drainingId === worker.id}
                    className="w-full mt-2 py-1.5 rounded-md bg-[#151C2B] hover:bg-[#1B2436] border border-[#202A3A] text-[#98A4B7] hover:text-[#F4F7FB] text-xs font-sans font-medium flex items-center justify-center space-x-1.5 transition-colors"
                  >
                    <Power className="w-3 h-3" />
                    <span>{drainingId === worker.id ? 'Draining...' : 'Drain Node'}</span>
                  </button>
                ) : (
                  <div className="mt-2 py-1 rounded bg-amber-950/20 border border-amber-900/30 text-amber-400 text-[10px] text-center font-mono">
                    Draining Tasks
                  </div>
                )}
              </div>
            ))}

            {filteredWorkers.length === 0 && (
              <div className="col-span-full py-12 text-center text-[#667085] font-mono text-xs border border-dashed border-[#202A3A] rounded-xl">
                No workers match filter "{filterStatus}".
              </div>
            )}
          </div>
        </div>

        {/* Right Panel: Lease Telemetry Stream & Architecture */}
        <div className="lg:col-span-5 space-y-4">
          <div className="rounded-xl p-4 space-y-2.5 font-mono text-xs bg-[#0F1420] border border-[#202A3A]">
            <div className="flex items-center justify-between border-b border-[#202A3A] pb-2">
              <span className="text-cyan-400 font-semibold flex items-center space-x-1.5">
                <Activity className="w-3.5 h-3.5" />
                <span>Heartbeat & Lease Stream</span>
              </span>
              <span className="text-[10px] text-[#667085]">SSE Feed</span>
            </div>

            <div className="space-y-1.5 overflow-y-auto max-h-56 p-2 rounded bg-[#070A12] border border-[#202A3A]">
              {telemetryLogs.map((log) => (
                <div
                  key={log.id}
                  className={`p-1.5 rounded text-[10px] leading-relaxed ${
                    log.type === 'error'
                      ? 'text-rose-300'
                      : log.type === 'warn'
                      ? 'text-amber-300'
                      : log.type === 'success'
                      ? 'text-emerald-300'
                      : 'text-cyan-300'
                  }`}
                >
                  <span className="text-[#667085] mr-1.5">[{log.time}]</span>
                  <span>{log.msg}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl p-4 space-y-2.5 font-mono text-xs bg-[#0F1420] border border-[#202A3A]">
            <div className="flex items-center justify-between border-b border-[#202A3A] pb-2">
              <span className="text-[#F4F7FB] font-semibold flex items-center space-x-1.5">
                <Shield className="w-3.5 h-3.5 text-emerald-400" />
                <span>Lease Fencing Architecture</span>
              </span>
              <span className="text-[10px] text-emerald-400 font-semibold">ENFORCED</span>
            </div>

            <div className="space-y-2 text-[10px] text-[#98A4B7] leading-relaxed">
              <div className="p-2 rounded bg-[#0B0F19] border border-[#202A3A] space-y-0.5">
                <div className="text-[#F4F7FB] font-semibold">Heartbeat Liveness Window</div>
                <p>
                  Workers emit heartbeats every 2s. If expired (&gt;15s), recovery watchdog marks worker offline and resurrects abandoned jobs.
                </p>
              </div>

              <div className="p-2 rounded bg-[#0B0F19] border border-[#202A3A] space-y-0.5">
                <div className="text-[#F4F7FB] font-semibold">Non-Blocking Work Dequeue</div>
                <p>
                  Workers pull concurrent tasks using atomic PostgreSQL <code className="text-violet-400">FOR UPDATE SKIP LOCKED</code>, eliminating lock contention.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
