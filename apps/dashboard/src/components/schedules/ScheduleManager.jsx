import React, { useState } from 'react';
import { Calendar, Play, Pause, Plus, RefreshCw, Clock, History, Zap } from 'lucide-react';
import { api } from '../../services/api.js';

export function ScheduleManager({ schedules = [], onRefresh }) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [name, setName] = useState('nightly-report-sync');
  const [cron, setCron] = useState('0 0 * * *');
  const [targetType, setTargetType] = useState('job');

  const handleRunNow = async (id) => {
    try {
      await api.runScheduleNow(id);
      alert('Schedule executed immediately via deterministic tick!');
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
        target_payload: { type: 'report_generation', payload: { period: '24h' } },
        cron_expression: cron,
      });
      setIsCreateOpen(false);
      if (onRefresh) onRefresh();
    } catch (err) {
      alert(`Create failed: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-extrabold text-white">Distributed Schedulers</h2>
          <p className="text-xs text-slate-400">
            Cron expressions, timezone-aware recurring tasks, and deterministic tick deduplication.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setIsCreateOpen(true)}
            className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs flex items-center space-x-1.5 shadow-lg shadow-cyan-500/20"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>New Schedule</span>
          </button>
          <button onClick={onRefresh} className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {schedules.map((s) => (
          <div key={s.id} className="cyber-card rounded-xl p-5 space-y-4 font-mono text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-cyan-400" />
                <span className="font-bold text-white text-sm">{s.name}</span>
              </div>
              <span
                className={`text-[10px] uppercase px-2 py-0.5 rounded border ${
                  s.status === 'active'
                    ? 'bg-emerald-950/80 text-emerald-400 border-emerald-800/50'
                    : 'bg-amber-950/80 text-amber-400 border-amber-800/50'
                }`}
              >
                {s.status}
              </span>
            </div>

            <div className="space-y-2 text-[11px]">
              <div className="flex justify-between">
                <span className="text-slate-500">Cron Pattern:</span>
                <span className="text-cyan-300 font-bold">{s.cron_expression}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Target Type:</span>
                <span className="text-purple-400 uppercase">{s.target_type}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Next Scheduled Tick:</span>
                <span className="text-slate-300">{new Date(s.next_run_at).toLocaleTimeString()}</span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800 flex items-center space-x-2">
              <button
                onClick={() => handleRunNow(s.id)}
                className="flex-1 py-1.5 rounded bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-[11px] font-sans flex items-center justify-center space-x-1"
              >
                <Zap className="w-3 h-3" />
                <span>Run Now</span>
              </button>
              <button
                onClick={() => handleToggle(s)}
                className="px-3 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-400 text-[11px] font-sans"
              >
                {s.status === 'active' ? 'Pause' : 'Resume'}
              </button>
            </div>
          </div>
        ))}

        {schedules.length === 0 && (
          <div className="col-span-full py-12 text-center text-slate-500 font-mono text-xs">
            No active schedules configured. Click "New Schedule" to register a cron.
          </div>
        )}
      </div>

      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="cyber-card rounded-2xl w-full max-w-md border-slate-700 p-6 space-y-4">
            <h3 className="font-bold text-sm text-white font-mono">Create Cron Schedule</h3>
            <form onSubmit={handleCreate} className="space-y-3 text-xs font-mono">
              <div>
                <label className="text-slate-400 block mb-1">Schedule Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full p-2 rounded bg-slate-900 border border-slate-800 text-slate-200"
                  required
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Cron Expression</label>
                <input
                  type="text"
                  value={cron}
                  onChange={(e) => setCron(e.target.value)}
                  className="w-full p-2 rounded bg-slate-900 border border-slate-800 text-cyan-400"
                  required
                />
              </div>
              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-3 py-1.5 rounded bg-slate-900 text-slate-400"
                >
                  Cancel
                </button>
                <button type="submit" className="px-3 py-1.5 rounded bg-cyan-500 text-black font-bold">
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
