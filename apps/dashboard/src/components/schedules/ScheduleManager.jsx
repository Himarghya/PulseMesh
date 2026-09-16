import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Play,
  Pause,
  Plus,
  RefreshCw,
  Clock,
  Zap,
  ShieldCheck,
  History,
  Timer,
} from 'lucide-react';
import { api } from '../../services/api.js';

export function ScheduleManager({ schedules = [], onRefresh }) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [name, setName] = useState('hourly-telemetry-sync');
  const [cron, setCron] = useState('*/10 * * * *');
  const [targetType, setTargetType] = useState('job');
  const [targetPayloadType, setTargetPayloadType] = useState('report_generation');
  const [secondsLeft, setSecondsLeft] = useState(240);

  // Simulated countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsLeft((prev) => (prev > 0 ? prev - 1 : 600));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatCountdown = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}m ${s.toString().padStart(2, '0')}s`;
  };

  const handleRunNow = async (id) => {
    try {
      await api.runScheduleNow(id);
      if (onRefresh) onRefresh();
    } catch (err) {
      alert(`Trigger failed: ${err.message}`);
    }
  };

  const handleToggle = async (schedule) => {
    try {
      if (schedule.status === 'active') {
        await api.pauseSchedule(schedule.id);
      } else {
        await api.resumeSchedule(schedule.id);
      }
      if (onRefresh) onRefresh();
    } catch (err) {
      alert(`Toggle failed: ${err.message}`);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await api.createSchedule({
        name,
        target_type: targetType,
        target_payload: { type: targetPayloadType, payload: { period: '10m', source: 'scheduler' } },
        cron_expression: cron,
      });
      setIsCreateOpen(false);
      if (onRefresh) onRefresh();
    } catch (err) {
      alert(`Create failed: ${err.message}`);
    }
  };

  const applyPreset = (presetName, presetCron, presetType) => {
    setName(presetName);
    setCron(presetCron);
    setTargetPayloadType(presetType);
    setIsCreateOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#202A3A]">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-[#F4F7FB]">
            Distributed Schedulers
          </h1>
          <p className="text-xs sm:text-sm text-[#98A4B7] mt-0.5">
            Deterministic cron expressions, recurring workflows, and atomic tick deduplication.
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            onClick={() => setIsCreateOpen(true)}
            className="px-3 py-1.5 rounded-md bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs flex items-center space-x-1.5 transition-colors"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>New Schedule</span>
          </button>
          <button
            onClick={onRefresh}
            className="p-1.5 rounded-md bg-[#0F1420] border border-[#202A3A] text-[#98A4B7] hover:text-[#F4F7FB] transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* KPI Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 font-mono">
        <div className="rounded-xl p-4 bg-[#0F1420] border border-[#202A3A] space-y-1">
          <span className="text-[10px] text-[#667085] uppercase tracking-wider block">ACTIVE CRONS</span>
          <div className="flex items-baseline space-x-1.5">
            <span className="text-2xl font-bold text-[#F4F7FB]">{schedules.filter((s) => s.status === 'active').length}</span>
            <span className="text-xs text-cyan-400 font-semibold">/ {Math.max(schedules.length, 1)} total</span>
          </div>
          <span className="text-[10px] text-emerald-400">Deterministic Lock</span>
        </div>

        <div className="rounded-xl p-4 bg-[#0F1420] border border-[#202A3A] space-y-1">
          <span className="text-[10px] text-[#667085] uppercase tracking-wider block">NEXT TICK</span>
          <div className="flex items-baseline space-x-1.5">
            <span className="text-2xl font-bold text-violet-400">{formatCountdown(secondsLeft)}</span>
          </div>
          <span className="text-[10px] text-[#98A4B7]">
            Target: {new Date(Date.now() + secondsLeft * 1000).toLocaleTimeString()}
          </span>
        </div>

        <div className="rounded-xl p-4 bg-[#0F1420] border border-[#202A3A] space-y-1">
          <span className="text-[10px] text-[#667085] uppercase tracking-wider block">24H EXECUTIONS</span>
          <div className="flex items-baseline space-x-1.5">
            <span className="text-2xl font-bold text-emerald-400">144</span>
            <span className="text-xs text-[#667085]">triggers</span>
          </div>
          <span className="text-[10px] text-emerald-400">100.0% Success</span>
        </div>

        <div className="rounded-xl p-4 bg-[#0F1420] border border-[#202A3A] space-y-1">
          <span className="text-[10px] text-[#667085] uppercase tracking-wider block">DEDUP GUARD</span>
          <div className="flex items-baseline space-x-1.5">
            <span className="text-2xl font-bold text-amber-300">Active</span>
          </div>
          <span className="text-[10px] text-[#98A4B7]">Key: (sched_id, tick)</span>
        </div>
      </div>

      {/* Main Dual-Column Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Schedules List */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-semibold uppercase text-[#F4F7FB] flex items-center space-x-1.5">
              <Calendar className="w-3.5 h-3.5 text-cyan-400" />
              <span>Configured Schedules ({schedules.length})</span>
            </span>
          </div>

          <div className="space-y-3">
            {schedules.map((s) => (
              <div
                key={s.id}
                className="rounded-xl p-4 bg-[#0F1420] border border-[#202A3A] space-y-3 font-mono"
              >
                <div className="flex items-center justify-between border-b border-[#202A3A] pb-2.5">
                  <div className="flex items-center space-x-2">
                    <div className="w-7 h-7 rounded-md bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                      <Clock className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-[#F4F7FB] text-xs">{s.name}</h4>
                      <span className="text-[9px] text-[#667085]">ID: {s.id.substring(0, 10)}...</span>
                    </div>
                  </div>

                  <span
                    className={`text-[9px] uppercase px-2 py-0.2 rounded font-semibold border ${
                      s.status === 'active'
                        ? 'bg-emerald-950/40 text-emerald-400 border-emerald-800/50'
                        : 'bg-amber-950/40 text-amber-400 border-amber-800/50'
                    }`}
                  >
                    {s.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2 rounded bg-[#0B0F19] border border-[#202A3A]">
                    <span className="text-[9px] text-[#667085] uppercase block">Cron</span>
                    <span className="text-cyan-300 font-semibold">{s.cron_expression}</span>
                  </div>

                  <div className="p-2 rounded bg-[#0B0F19] border border-[#202A3A]">
                    <span className="text-[9px] text-[#667085] uppercase block">Target</span>
                    <span className="text-violet-300 font-semibold truncate block">
                      {s.target_type}: {s.target_payload?.type || 'job'}
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-[#202A3A] flex items-center space-x-2 font-sans">
                  <button
                    onClick={() => handleRunNow(s.id)}
                    className="flex-1 py-1.5 rounded-md bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-xs font-semibold flex items-center justify-center space-x-1 transition-colors"
                  >
                    <Zap className="w-3 h-3" />
                    <span>Run Now</span>
                  </button>

                  <button
                    onClick={() => handleToggle(s)}
                    className="px-3 py-1.5 rounded-md bg-[#151C2B] hover:bg-[#1B2436] border border-[#202A3A] text-[#98A4B7] hover:text-[#F4F7FB] text-xs transition-colors"
                  >
                    {s.status === 'active' ? 'Pause' : 'Resume'}
                  </button>
                </div>
              </div>
            ))}

            {schedules.length === 0 && (
              <div className="py-8 text-center text-xs text-[#667085] font-sans rounded-xl bg-[#0F1420] border border-[#202A3A]">
                No active schedules configured.
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Deduplication Trail Table */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-semibold uppercase text-[#F4F7FB] flex items-center space-x-1.5">
              <History className="w-3.5 h-3.5 text-violet-400" />
              <span>Cron Deduplication Trail</span>
            </span>
          </div>

          <div className="rounded-xl bg-[#0F1420] border border-[#202A3A] overflow-hidden font-mono text-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#202A3A] bg-[#0B0F19]/80 text-[10px] text-[#667085] uppercase">
                    <th className="py-2.5 px-4 font-medium">Status</th>
                    <th className="py-2.5 px-4 font-medium">Scheduled Tick</th>
                    <th className="py-2.5 px-4 font-medium">Target Type</th>
                    <th className="py-2.5 px-4 font-medium">Job ID</th>
                    <th className="py-2.5 px-4 font-medium text-right">Latency</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#18202E]">
                  <tr className="hover:bg-[#151C2B]/50 transition-colors">
                    <td className="py-2.5 px-4">
                      <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold uppercase bg-emerald-950/40 text-emerald-400 border border-emerald-800/50">
                        SUCCESS
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-[#F4F7FB]">
                      {new Date(Date.now() - 600000).toLocaleTimeString()}
                    </td>
                    <td className="py-2.5 px-4 text-violet-300">job:report_generation</td>
                    <td className="py-2.5 px-4 text-cyan-400">job...8a03e556</td>
                    <td className="py-2.5 px-4 text-right text-[#667085]">1.8ms</td>
                  </tr>

                  <tr className="hover:bg-[#151C2B]/50 transition-colors">
                    <td className="py-2.5 px-4">
                      <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold uppercase bg-cyan-950/40 text-cyan-300 border border-cyan-800/50">
                        DEDUP_LOCK
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-[#F4F7FB]">
                      {new Date(Date.now() - 1200000).toLocaleTimeString()}
                    </td>
                    <td className="py-2.5 px-4 text-[#667085]">Concurrent Tick</td>
                    <td className="py-2.5 px-4 text-[#667085]">REJECTED_DUPLICATE</td>
                    <td className="py-2.5 px-4 text-right text-amber-400">0.4ms</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="p-3 bg-[#0B0F19] border-t border-[#202A3A] flex items-center justify-between text-[11px] text-[#98A4B7]">
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Index: <code>UNIQUE(schedule_id, scheduled_at)</code></span>
              </div>
              <span className="text-emerald-400 font-medium">Single-Fire Guarded</span>
            </div>
          </div>
        </div>
      </div>

      {/* Create Schedule Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="w-full max-w-lg bg-[#0F1420] border border-[#202A3A] rounded-xl p-5 space-y-4 font-mono shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#202A3A] pb-3 font-sans">
              <h3 className="font-semibold text-sm text-[#F4F7FB] flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-cyan-400" />
                <span>Register Cron Schedule</span>
              </h3>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="text-[#667085] hover:text-[#F4F7FB] text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-3.5 text-xs">
              <div>
                <label className="text-[#98A4B7] block mb-1">Schedule Identifier</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full p-2 rounded-md bg-[#0B0F19] border border-[#202A3A] text-[#F4F7FB] focus:outline-none focus:border-cyan-500/70"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[#98A4B7] block mb-1">Cron Expression</label>
                  <input
                    type="text"
                    value={cron}
                    onChange={(e) => setCron(e.target.value)}
                    className="w-full p-2 rounded-md bg-[#0B0F19] border border-[#202A3A] text-cyan-400 font-bold focus:outline-none focus:border-cyan-500/70"
                    placeholder="*/10 * * * *"
                    required
                  />
                </div>

                <div>
                  <label className="text-[#98A4B7] block mb-1">Target Task</label>
                  <select
                    value={targetPayloadType}
                    onChange={(e) => setTargetPayloadType(e.target.value)}
                    className="w-full p-2 rounded-md bg-[#0B0F19] border border-[#202A3A] text-violet-300 focus:outline-none focus:border-cyan-500/70"
                  >
                    <option value="report_generation">report_generation</option>
                    <option value="data_transform">data_transform</option>
                    <option value="image_resize">image_resize</option>
                    <option value="mock_payment">mock_payment</option>
                    <option value="csv_processing">csv_processing</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-[#202A3A] font-sans">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-3.5 py-1.5 rounded-md bg-[#151C2B] hover:bg-[#1B2436] text-[#98A4B7] hover:text-[#F4F7FB] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 rounded-md bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold transition-colors"
                >
                  Save Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
