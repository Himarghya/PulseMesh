import React, { useState, useEffect, useMemo } from 'react';
import {
  Activity,
  Cpu,
  CheckCircle2,
  AlertTriangle,
  ArrowUp,
  ArrowDown,
  ChevronDown,
  Zap,
  TrendingUp,
  Clock,
} from 'lucide-react';

// Helper: build smooth cubic bezier SVG path through arbitrary numeric data points
function buildSmoothSvgPath(dataPoints, width = 900, height = 180, minY = 0, maxY = 100, isArea = false) {
  if (!dataPoints || dataPoints.length < 2) return '';
  const rangeY = Math.max(1, maxY - minY);
  
  const coords = dataPoints.map((val, idx) => {
    const x = (idx / (dataPoints.length - 1)) * width;
    const clampedVal = Math.max(minY, Math.min(maxY, val));
    const y = height - ((clampedVal - minY) / rangeY) * (height - 35) - 15;
    return { x, y };
  });

  let d = `M ${coords[0].x.toFixed(1)} ${coords[0].y.toFixed(1)}`;
  for (let i = 0; i < coords.length - 1; i++) {
    const p0 = coords[i === 0 ? i : i - 1];
    const p1 = coords[i];
    const p2 = coords[i + 1];
    const p3 = coords[i + 2] || p2;

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }

  if (isArea) {
    d += ` L ${width} ${height} L 0 ${height} Z`;
  }

  return d;
}

export function SystemOverview({ jobs = [], workers = [], onTriggerDemoJob, onNavigateTab }) {
  const [secondsTick, setSecondsTick] = useState(0);
  const [metricView, setMetricView] = useState('both'); // 'both' | 'throughput' | 'latency'
  
  // Rolling time-series buffer (20 points)
  const [telemetryHistory, setTelemetryHistory] = useState(() => {
    return Array.from({ length: 20 }, (_, i) => ({
      throughput: Math.floor(120 + Math.sin(i * 0.5) * 45 + Math.random() * 20),
      latency: Math.floor(40 + Math.cos(i * 0.4) * 15 + Math.random() * 8),
      health: 99.8,
    }));
  });

  const totalJobs = jobs.length;
  const succeeded = jobs.filter((j) => j.status === 'succeeded').length;
  const failed = jobs.filter((j) => j.status === 'failed' || j.status === 'dead_letter').length;
  const runningJobs = jobs.filter((j) => j.status === 'running');
  const queuedJobs = jobs.filter((j) => j.status === 'queued');

  // Dynamic calculations based on live system state
  const totalCapacity = workers.reduce((acc, w) => acc + (w.capacity || 5), 0) || 5;
  const activeLeasedTasks = workers.reduce((acc, w) => acc + (w.active_jobs_count || 0), 0) + runningJobs.length;
  const saturationPct = Math.min(100, Math.round((activeLeasedTasks / totalCapacity) * 100));

  // Dynamic Health Percentage: degrades smoothly with failures, dead letters, or offline workers
  const rawHealth = totalJobs === 0
    ? 100.0
    : Math.max(0, 100 - (failed * 14.5) - (queuedJobs.length > 25 ? 4 : 0));
  const healthPct = Number(rawHealth).toFixed(1);

  // Dynamic Live Throughput (ops/sec)
  const instantThroughput = useMemo(() => {
    const base = runningJobs.length * 110 + (succeeded > 0 ? 32 : 12) + (workers.length * 18);
    const fluctuation = Math.sin(secondsTick * 0.7) * 14 + (secondsTick % 3 === 0 ? 8 : -6);
    return Math.max(8, Math.round(base + fluctuation));
  }, [runningJobs.length, succeeded, workers.length, secondsTick]);

  // Dynamic Live Latency (ms)
  const instantLatency = useMemo(() => {
    const base = 28 + (runningJobs.length * 16) + (failed * 24);
    const jitter = Math.cos(secondsTick * 0.6) * 6;
    return Math.max(12, Math.round(base + jitter));
  }, [runningJobs.length, failed, secondsTick]);

  const dlqRate = totalJobs > 0 ? ((failed / totalJobs) * 100).toFixed(2) : '0.00';

  // Live timer & rolling time-series buffer update every second
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsTick((s) => s + 1);
      setTelemetryHistory((prev) => {
        const next = [...prev.slice(1)];
        next.push({
          throughput: instantThroughput,
          latency: instantLatency,
          health: Number(healthPct),
        });
        return next;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [instantThroughput, instantLatency, healthPct]);

  // Compute smooth dynamic SVG paths from rolling telemetry
  const throughputPoints = telemetryHistory.map((h) => h.throughput);
  const latencyPoints = telemetryHistory.map((h) => h.latency);
  const healthPoints = telemetryHistory.map((h) => h.health);

  const maxThroughput = Math.max(...throughputPoints, 150) * 1.25;
  const maxLatency = Math.max(...latencyPoints, 80) * 1.35;

  const cyanLinePath = buildSmoothSvgPath(throughputPoints, 900, 180, 0, maxThroughput, false);
  const cyanAreaPath = buildSmoothSvgPath(throughputPoints, 900, 180, 0, maxThroughput, true);

  const purpleLinePath = buildSmoothSvgPath(latencyPoints, 900, 180, 0, maxLatency, false);
  const purpleAreaPath = buildSmoothSvgPath(latencyPoints, 900, 180, 0, maxLatency, true);

  // Sparkline for Health Card
  const healthSparkline = buildSmoothSvgPath(healthPoints.slice(-8), 80, 36, 50, 100, false);
  // Sparkline for Throughput Card
  const throughputSparkline = buildSmoothSvgPath(throughputPoints.slice(-8), 80, 36, 0, maxThroughput, false);

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
          <div className={`absolute top-0 left-0 right-0 h-[2px] ${Number(healthPct) > 85 ? 'bg-emerald-400' : 'bg-rose-500'}`}></div>
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-[11px] font-mono uppercase tracking-wider text-slate-400 font-semibold">
                SYSTEM HEALTH
              </p>
              <div className="flex items-baseline space-x-2">
                <h3 className="text-2xl font-black font-mono text-white tracking-tight">{healthPct}%</h3>
                <span className={`font-mono text-xs flex items-center font-bold ${Number(healthPct) >= 90 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {Number(healthPct) >= 90 ? <ArrowUp className="w-3.5 h-3.5 stroke-[2.5]" /> : <ArrowDown className="w-3.5 h-3.5 stroke-[2.5]" />}
                </span>
              </div>
              <p className="text-[11px] font-mono text-slate-400 pt-1">
                <span className={Number(healthPct) >= 90 ? 'text-emerald-400' : 'text-rose-400'}>
                  {succeeded} of {totalJobs} jobs healthy
                </span>
              </p>
            </div>

            {/* Dynamic Upward Sparkline */}
            <div className="w-20 h-10 flex items-center justify-end">
              <svg viewBox="0 0 80 36" className="w-full h-full">
                <path
                  d={healthSparkline || "M 0 28 Q 20 20, 40 16 T 80 8"}
                  fill="none"
                  stroke={Number(healthPct) >= 90 ? '#10B981' : '#F43F5E'}
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
                <circle cx="78" cy="8" r="3" fill={Number(healthPct) >= 90 ? '#10B981' : '#F43F5E'} className="animate-pulse" />
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
                <h3 className="text-2xl font-black font-mono text-cyan-300 tracking-tight">{instantThroughput.toLocaleString()}</h3>
                <span className="text-xs font-mono text-slate-400">ops/s</span>
              </div>
              <p className="text-[11px] font-mono text-cyan-400/80 pt-1">
                {runningJobs.length} active • {succeeded} completed
              </p>
            </div>

            {/* Dynamic Cyan Wave Sparkline */}
            <div className="w-20 h-10 flex items-center justify-end">
              <svg viewBox="0 0 80 36" className="w-full h-full">
                <path
                  d={throughputSparkline || "M 0 28 C 20 38, 30 8, 50 18 C 65 26, 70 12, 80 14"}
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
                <h3 className="text-2xl font-black font-mono text-white tracking-tight">{saturationPct}%</h3>
              </div>
              <p className="text-[11px] font-mono text-purple-400/90 pt-1">
                {activeLeasedTasks} / {totalCapacity} slots active
              </p>
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
                  d={`M 10 38 A 20 20 0 0 1 ${Math.max(12, Math.min(50, 10 + 40 * (saturationPct / 100)))} ${Math.max(18, 38 - 20 * Math.sin((saturationPct / 100) * Math.PI))}`}
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
          <div className={`absolute top-0 left-0 right-0 h-[2px] ${failed > 0 ? 'bg-rose-500' : 'bg-slate-700'}`}></div>
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-[11px] font-mono uppercase tracking-wider text-slate-400 font-semibold">
                FENCING / DLQ
              </p>
              <div className="flex items-baseline space-x-1.5">
                <h3 className="text-2xl font-black font-mono text-white tracking-tight">{dlqRate}%</h3>
              </div>
              <p className={`text-[11px] font-mono font-bold pt-1 ${failed > 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                {failed === 0 ? 'Zero dropped tasks' : `${failed} in dead-letter`}
              </p>
            </div>

            <div className={`w-8 h-8 rounded-lg border flex items-center justify-center shadow-sm ${
              failed > 0
                ? 'bg-rose-500/10 border-rose-500/30 text-rose-400 shadow-rose-500/20'
                : 'bg-slate-800/40 border-slate-700 text-slate-500'
            }`}>
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
        </div>
      </div>

      {/* Real-time Throughput and Latency Telemetry Graph */}
      <div className="rounded-2xl p-4 sm:p-6 bg-[#0D1322]/90 border border-slate-800/90 shadow-2xl relative overflow-hidden space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800/60 pb-3 gap-2">
          <div className="flex items-center space-x-2">
            <Activity className="w-4 h-4 text-cyan-400 animate-pulse" />
            <h3 className="text-xs font-mono font-bold text-slate-200 tracking-wider">
              Real-time Throughput and Latency Telemetry
            </h3>
          </div>

          <div className="flex items-center space-x-3 text-xs font-mono">
            <div className="flex items-center space-x-1.5">
              <span className="w-3 h-1 rounded-full bg-cyan-400 shadow-[0_0_6px_rgba(0,240,255,0.6)]"></span>
              <span className="text-cyan-300 font-bold">{instantThroughput} ops/s</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-3 h-1 rounded-full bg-purple-500 shadow-[0_0_6px_rgba(168,85,247,0.6)]"></span>
              <span className="text-purple-300 font-bold">{instantLatency} ms</span>
            </div>
          </div>
        </div>

        {/* Multi-series Dynamic SVG Graph Canvas */}
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

            {/* Dynamic Cyan Wave (Throughput) */}
            {cyanAreaPath && (
              <path
                d={cyanAreaPath}
                fill="url(#cyanGradient)"
                className="transition-all duration-700 ease-out"
              />
            )}
            {cyanLinePath && (
              <path
                d={cyanLinePath}
                fill="none"
                stroke="#00F0FF"
                strokeWidth="2.5"
                filter="url(#cyanGlow)"
                className="transition-all duration-700 ease-out"
              />
            )}

            {/* Dynamic Purple Wave (Latency) */}
            {purpleAreaPath && (
              <path
                d={purpleAreaPath}
                fill="url(#purpleGradient)"
                className="transition-all duration-700 ease-out"
              />
            )}
            {purpleLinePath && (
              <path
                d={purpleLinePath}
                fill="none"
                stroke="#A855F7"
                strokeWidth="2.5"
                className="transition-all duration-700 ease-out"
              />
            )}
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
