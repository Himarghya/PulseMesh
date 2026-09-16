import React, { useState } from 'react';
import { Layers, Play, Pause, RefreshCw, BarChart2, ShieldAlert } from 'lucide-react';
import { api } from '../../services/api.js';

export function QueueExplorer({ queues = [], onRefresh }) {
  const [loadingMap, setLoadingMap] = useState({});

  const handleTogglePause = async (queueName, isPaused) => {
    setLoadingMap((prev) => ({ ...prev, [queueName]: true }));
    try {
      if (isPaused) {
        await api.resumeQueue(queueName);
      } else {
        await api.pauseQueue(queueName);
      }
      if (onRefresh) onRefresh();
    } catch (err) {
      alert(`Failed to update queue status: ${err.message}`);
    } finally {
      setLoadingMap((prev) => ({ ...prev, [queueName]: false }));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-extrabold text-white">Queue Explorer</h2>
          <p className="text-xs text-slate-400">
            Real-time queue depth telemetry, priority aging distribution, and operational controls.
          </p>
        </div>

        <button
          onClick={onRefresh}
          className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-400 hover:text-cyan-400 flex items-center space-x-2"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Queues</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {queues.map((q) => (
          <div key={q.name} className="cyber-card rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-mono text-sm font-bold text-white">{q.name}</h3>
                  <span
                    className={`text-[10px] font-mono uppercase px-1.5 py-0.2 rounded border ${
                      q.isPaused
                        ? 'bg-amber-950/80 text-amber-400 border-amber-800/50'
                        : 'bg-emerald-950/80 text-emerald-400 border-emerald-800/50'
                    }`}
                  >
                    {q.isPaused ? 'PAUSED' : 'ACTIVE'}
                  </span>
                </div>
              </div>

              <button
                onClick={() => handleTogglePause(q.name, q.isPaused)}
                disabled={loadingMap[q.name]}
                className={`p-2 rounded-lg border text-xs flex items-center space-x-1 transition-all ${
                  q.isPaused
                    ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                    : 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border-amber-500/30'
                }`}
              >
                {q.isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                <span>{q.isPaused ? 'Resume' : 'Pause'}</span>
              </button>
            </div>

            {/* Counts Matrix */}
            <div className="grid grid-cols-3 gap-2 text-center font-mono">
              <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800">
                <p className="text-[10px] text-slate-500 uppercase">Queued</p>
                <p className="text-base font-bold text-amber-400">{q.counts?.queued || 0}</p>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800">
                <p className="text-[10px] text-slate-500 uppercase">In-Flight</p>
                <p className="text-base font-bold text-cyan-400">{q.counts?.running || 0}</p>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800">
                <p className="text-[10px] text-slate-500 uppercase">Succeeded</p>
                <p className="text-base font-bold text-emerald-400">{q.counts?.succeeded || 0}</p>
              </div>
            </div>

            {/* Priority Aging Distribution */}
            <div className="space-y-2 pt-2 border-t border-slate-800/60">
              <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
                <span className="flex items-center space-x-1">
                  <BarChart2 className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Priority Distribution</span>
                </span>
                <span>Levels 1-10</span>
              </div>

              <div className="flex items-end space-x-1 h-12 pt-2">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((lvl) => {
                  const count = q.priorityDistribution?.[lvl] || 0;
                  const heightPercent = q.counts?.total > 0 ? Math.max(10, (count / q.counts.total) * 100) : 10;
                  return (
                    <div
                      key={lvl}
                      className="flex-1 flex flex-col items-center justify-end group relative cursor-pointer"
                    >
                      <div
                        className={`w-full rounded-t transition-all ${
                          count > 0 ? 'bg-gradient-to-t from-cyan-600 to-cyan-400' : 'bg-slate-800'
                        }`}
                        style={{ height: `${heightPercent}%` }}
                      ></div>
                      <span className="text-[9px] font-mono text-slate-500 mt-1">{lvl}</span>

                      {/* Tooltip */}
                      <div className="absolute -top-7 hidden group-hover:block px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 text-[10px] font-mono text-cyan-300 z-10 whitespace-nowrap">
                        P{lvl}: {count}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ))}

        {queues.length === 0 && (
          <div className="col-span-full py-12 text-center text-slate-500 font-mono text-xs">
            No active queue streams detected.
          </div>
        )}
      </div>
    </div>
  );
}
