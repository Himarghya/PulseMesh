import React, { useState, useEffect } from 'react';
import {
  Activity,
  Cpu,
  CheckCircle2,
  AlertTriangle,
  ArrowUp,
  ChevronDown,
  Zap,
} from 'lucide-react';

export function SystemOverview({ jobs = [], workers = [], onTriggerDemoJob, onNavigateTab }) {
  const [secondsTick, setSecondsTick] = useState(0);

  // Live timer tick every second for real-time countdowns
  useEffect(() => {
    const timer = setInterval(() => setSecondsTick((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const totalJobs = jobs.length;
  const succeeded = jobs.filter((j) => j.status === 'succeeded').length;
  const failed = jobs.filter((j) => j.status === 'failed' || j.status === 'dead_letter').length;
  const activeWorkers = workers.filter((w) => w.status === 'online' || w.status === 'busy').length;

  const runningJobs = jobs.filter((j) => j.status === 'running');
  const queuedJobs = jobs.filter((j) => j.status === 'queued');

  // Format job execution timers (e.g. 00:00:23)
  const formatTimer = (job, index) => {
    if (!job.created_at) return '00:00:05';
    const elapsed = Math.floor((Date.now() - new Date(job.created_at).getTime()) / 1000);
    const secs = Math.max(0, elapsed % 60);
    const mins = Math.floor(elapsed / 60) % 60;
    const hrs = Math.floor(elapsed / 3600);
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6">
      {/* 4 KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: System Health */}
        <div className="rounded-xl p-5 bg-[#0D1322]/90 border border-slate-800/80 relative overflow-hidden shadow-lg group hover:border-slate-700 transition-all">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-emerald-400"></div>
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-[11px] font-mono uppercase tracking-wider text-slate-400 font-semibold">
                SYSTEM HEALTH
              </p>
              <div className="flex items-baseline space-x-2">
                <h3 className="text-2xl font-black font-mono text-white tracking-tight">99.992%</h3>
                <span className="text-emerald-400 font-mono text-xs flex items-center font-bold">
                  <ArrowUp className="w-3.5 h-3.5 stroke-[2.5]" />
                </span>
              </div>
              <p className="text-[11px] font-mono text-emerald-400/90 pt-1">Spark sparkline</p>
            </div>

            {/* Green Upward Sparkline */}
            <div className="w-20 h-10 flex items-center justify-end">
              <svg viewBox="0 0 80 40" className="w-full h-full">
                <path
                  d="M 0 32 Q 20 28, 35 22 T 60 14 T 80 6"
                  fill="none"
                  stroke="#10B981"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
                <circle cx="80" cy="6" r="3" fill="#10B981" />
              </svg>
            </div>
          </div>
        </div>

        {/* Card 2: Throughput */}
        <div className="rounded-xl p-5 bg-[#0D1322]/90 border border-slate-800/80 relative overflow-hidden shadow-lg group hover:border-slate-700 transition-all">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-cyan-400"></div>
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-[11px] font-mono uppercase tracking-wider text-slate-400 font-semibold">
                THROUGHPUT
              </p>
              <div className="flex items-baseline space-x-1.5">
                <h3 className="text-2xl font-black font-mono text-white tracking-tight">48,210</h3>
                <span className="text-xs font-mono text-slate-400">ops/s</span>
              </div>
              <p className="text-[11px] font-mono text-cyan-400/80 pt-1">p50: 1.9ms • p99: 4.8ms</p>
            </div>

            {/* Cyan Wave Sparkline */}
            <div className="w-20 h-10 flex items-center justify-end">
              <svg viewBox="0 0 80 40" className="w-full h-full">
                <path
                  d="M 0 28 C 20 38, 30 8, 50 18 C 65 26, 70 12, 80 14"
                  fill="none"
                  stroke="#00F0FF"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Card 3: Worker Saturation */}
        <div className="rounded-xl p-5 bg-[#0D1322]/90 border border-slate-800/80 relative overflow-hidden shadow-lg group hover:border-slate-700 transition-all">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-purple-500"></div>
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-[11px] font-mono uppercase tracking-wider text-slate-400 font-semibold">
                WORKER SATURATION
              </p>
              <div className="flex items-baseline space-x-1.5">
                <h3 className="text-2xl font-black font-mono text-white tracking-tight">78.4%</h3>
              </div>
              <p className="text-[11px] font-mono text-purple-400/90 pt-1">Capacity Arc</p>
            </div>

            {/* Purple Glowing Radial Capacity Arc */}
            <div className="w-14 h-12 flex items-center justify-center">
              <svg viewBox="0 0 60 45" className="w-full h-full">
                {/* Background Arc */}
                <path
                  d="M 10 38 A 20 20 0 0 1 50 38"
                  fill="none"
                  stroke="#1E293B"
                  strokeWidth="6"
                  strokeLinecap="round"
                />
                {/* Active Purple Arc */}
                <path
                  d="M 10 38 A 20 20 0 0 1 44 20"
                  fill="none"
                  stroke="#A855F7"
                  strokeWidth="6"
                  strokeLinecap="round"
                  filter="drop-shadow(0 0 6px rgba(168,85,247,0.6))"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Card 4: Fencing / DLQ */}
        <div className="rounded-xl p-5 bg-[#0D1322]/90 border border-slate-800/80 relative overflow-hidden shadow-lg group hover:border-slate-700 transition-all">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-rose-500"></div>
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-[11px] font-mono uppercase tracking-wider text-slate-400 font-semibold">
                FENCING / DLQ
              </p>
              <div className="flex items-baseline space-x-1.5">
                <h3 className="text-2xl font-black font-mono text-white tracking-tight">0.001%</h3>
              </div>
              <p className="text-[11px] font-mono text-rose-400 font-bold pt-1">Alert</p>
            </div>

            <div className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 shadow-sm shadow-rose-500/20">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
        </div>
      </div>

      {/* Real-time Throughput and Latency Telemetry Graph */}
      <div className="rounded-2xl p-6 bg-[#0D1322]/90 border border-slate-800/90 shadow-2xl relative overflow-hidden space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800/60 pb-3">
          <h3 className="text-xs font-mono font-bold text-slate-200 tracking-wider">
            Real-time Throughput and Latency Telemetry
          </h3>

          <div className="flex items-center space-x-4 text-xs font-mono">
            <div className="flex items-center space-x-1.5">
              <span className="w-3 h-1 rounded-full bg-cyan-400"></span>
              <span className="text-slate-300">Graph</span>
            </div>
            <div className="flex items-center space-x-1 px-2 py-1 rounded bg-slate-900 border border-slate-800 text-slate-300 cursor-pointer">
              <span className="w-3 h-1 rounded-full bg-purple-500"></span>
              <span>Latency</span>
              <ChevronDown className="w-3 h-3 text-slate-500" />
            </div>
          </div>
        </div>

        {/* Multi-series SVG Graph Canvas */}
        <div className="w-full h-44 relative">
          <svg viewBox="0 0 900 180" preserveAspectRatio="none" className="w-full h-full">
            <defs>
              <linearGradient id="cyanGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#00F0FF" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#00F0FF" stopOpacity="0.0" />
              </linearGradient>
              <linearGradient id="purpleGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#A855F7" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#A855F7" stopOpacity="0.0" />
              </linearGradient>
              <filter id="cyanGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {/* Subtle Grid Lines */}
            <line x1="0" y1="45" x2="900" y2="45" stroke="#1E293B" strokeWidth="0.8" strokeDasharray="4 4" />
            <line x1="0" y1="90" x2="900" y2="90" stroke="#1E293B" strokeWidth="0.8" strokeDasharray="4 4" />
            <line x1="0" y1="135" x2="900" y2="135" stroke="#1E293B" strokeWidth="0.8" strokeDasharray="4 4" />

            {/* Cyan Wave Fill & Stroke */}
            <path
              d="M 0 110 C 120 70, 200 140, 320 80 C 440 20, 520 120, 640 60 C 760 10, 840 70, 900 65 L 900 180 L 0 180 Z"
              fill="url(#cyanGradient)"
            />
            <path
              d="M 0 110 C 120 70, 200 140, 320 80 C 440 20, 520 120, 640 60 C 760 10, 840 70, 900 65"
              fill="none"
              stroke="#00F0FF"
              strokeWidth="2.5"
              filter="url(#cyanGlow)"
            />

            {/* Purple Latency Fill & Stroke */}
            <path
              d="M 0 135 C 100 120, 220 160, 350 110 C 480 60, 560 140, 700 95 C 800 60, 850 110, 900 100 L 900 180 L 0 180 Z"
              fill="url(#purpleGradient)"
            />
            <path
              d="M 0 135 C 100 120, 220 160, 350 110 C 480 60, 560 140, 700 95 C 800 60, 850 110, 900 100"
              fill="none"
              stroke="#A855F7"
              strokeWidth="2.5"
            />
          </svg>
        </div>
      </div>

      {/* High-Density Telemetry Execution Table */}
      <div className="rounded-2xl bg-[#0D1322]/90 border border-slate-800/90 shadow-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800/80 bg-slate-950/40 text-[11px] font-mono text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-5">Status ↑</th>
                <th className="py-3 px-5">Job</th>
                <th className="py-3 px-5">Worker Hostname</th>
                <th className="py-3 px-5">Priority</th>
                <th className="py-3 px-5">Attempt</th>
                <th className="py-3 px-5">Timer ↕</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
              {jobs.length > 0 ? (
                jobs.slice(0, 7).map((job, idx) => {
                  const isRunning = job.status === 'running';
                  const isSuccess = job.status === 'succeeded';
                  const isFailed = job.status === 'failed' || job.status === 'dead_letter';

                  return (
                    <tr
                      key={job.id}
                      className="hover:bg-slate-900/50 transition-colors group cursor-pointer"
                      onClick={() => onNavigateTab && onNavigateTab('jobs')}
                    >
                      {/* Status Badge */}
                      <td className="py-3 px-5">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase border ${
                            isRunning
                              ? 'bg-cyan-950/80 text-cyan-300 border-cyan-400 shadow-sm shadow-cyan-500/30 animate-pulse'
                              : isSuccess
                              ? 'bg-emerald-950/80 text-emerald-400 border-emerald-500/80'
                              : isFailed
                              ? 'bg-rose-950/80 text-rose-400 border-rose-500/80'
                              : 'bg-slate-900 text-slate-300 border-slate-700'
                          }`}
                        >
                          {job.status}
                        </span>
                      </td>

                      {/* Job Snippet */}
                      <td className="py-3 px-5 font-semibold text-slate-200 group-hover:text-cyan-400 transition-colors">
                        Distributed job...{job.id.substring(0, 14)}
                      </td>

                      {/* Worker Hostname */}
                      <td className="py-3 px-5 text-slate-300">
                        {workers[idx % Math.max(workers.length, 1)]?.hostname || `Worker hostname0${(idx % 4) + 1}`}
                      </td>

                      {/* Priority */}
                      <td className="py-3 px-5 text-slate-200 font-bold">
                        {job.priority || 1}
                      </td>

                      {/* Attempt Generation Pill */}
                      <td className="py-3 px-5">
                        <span className="text-[11px] text-purple-300 bg-purple-950/40 px-2 py-0.5 rounded border border-purple-800/40">
                          Gen #{job.execution_generation || 2}
                        </span>
                      </td>

                      {/* Timer */}
                      <td className="py-3 px-5 text-slate-400 font-mono">
                        {formatTimer(job, idx)}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-xs text-slate-500 font-mono">
                    No active distributed jobs found in telemetry stream.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
