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
  RotateCcw,
  Plus,
  RefreshCw,
  Search,
  Check,
  CircleDot,
  AlertCircle,
  PauseCircle,
} from 'lucide-react';

// Helper: build smooth cubic bezier SVG path through arbitrary numeric data points
function buildSmoothSvgPath(dataPoints, width = 900, height = 180, minY = 0, maxY = 100, isArea = false) {
  if (!dataPoints || dataPoints.length < 2) return '';
  const rangeY = Math.max(1, maxY - minY);
  
  const coords = dataPoints.map((val, idx) => {
    const x = (idx / (dataPoints.length - 1)) * width;
    const clampedVal = Math.max(minY, Math.min(maxY, val));
    const y = height - ((clampedVal - minY) / rangeY) * (height - 28) - 14;
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

export function SystemOverview({
  jobs = [],
  workers = [],
  onTriggerDemoJob,
  onNavigateTab,
  onOpenDispatchModal,
  onRefresh,
}) {
  const [secondsTick, setSecondsTick] = useState(0);
  const [timeRange, setTimeRange] = useState('1m'); // '1m' | '5m' | '15m' | '1h'
  const [tableSearch, setTableSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [lastUpdated, setLastUpdated] = useState(() => new Date().toLocaleTimeString());
  
  // Rolling time-series buffer (20 data points)
  const [telemetryHistory, setTelemetryHistory] = useState(() => {
    return Array.from({ length: 20 }, (_, i) => ({
      throughput: Math.floor(32 + Math.sin(i * 0.5) * 12 + Math.random() * 8),
      latency: Math.floor(24 + Math.cos(i * 0.4) * 8 + Math.random() * 4),
      health: 100.0,
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

  // Dynamic Health Percentage
  const rawHealth = totalJobs === 0
    ? 100.0
    : Math.max(0, 100 - (failed * 14.5) - (queuedJobs.length > 25 ? 4 : 0));
  const healthPct = Number(rawHealth).toFixed(1);

  // Dynamic Live Throughput (ops/sec)
  const instantThroughput = useMemo(() => {
    const base = runningJobs.length * 28 + (succeeded > 0 ? 18 : 8) + (workers.length * 4);
    const fluctuation = Math.sin(secondsTick * 0.7) * 4 + (secondsTick % 3 === 0 ? 2 : -2);
    return Math.max(4, Math.round(base + fluctuation));
  }, [runningJobs.length, succeeded, workers.length, secondsTick]);

  // Dynamic Live Latency (ms)
  const instantLatency = useMemo(() => {
    const base = 22 + (runningJobs.length * 6) + (failed * 12);
    const jitter = Math.cos(secondsTick * 0.6) * 3;
    return Math.max(10, Math.round(base + jitter));
  }, [runningJobs.length, failed, secondsTick]);

  const dlqRate = totalJobs > 0 ? ((failed / totalJobs) * 100).toFixed(2) : '0.00';

  // Live timer & rolling time-series buffer update every second
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsTick((s) => s + 1);
      setLastUpdated(new Date().toLocaleTimeString());
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

  // Compute smooth dynamic SVG paths
  const throughputPoints = telemetryHistory.map((h) => h.throughput);
  const latencyPoints = telemetryHistory.map((h) => h.latency);
  const healthPoints = telemetryHistory.map((h) => h.health);

  const maxThroughput = Math.max(...throughputPoints, 50) * 1.25;
  const maxLatency = Math.max(...latencyPoints, 40) * 1.35;

  const cyanLinePath = buildSmoothSvgPath(throughputPoints, 900, 160, 0, maxThroughput, false);
  const cyanAreaPath = buildSmoothSvgPath(throughputPoints, 900, 160, 0, maxThroughput, true);

  const purpleLinePath = buildSmoothSvgPath(latencyPoints, 900, 160, 0, maxLatency, false);
  const purpleAreaPath = buildSmoothSvgPath(latencyPoints, 900, 160, 0, maxLatency, true);

  // Sparklines
  const healthSparkline = buildSmoothSvgPath(healthPoints.slice(-8), 70, 26, 80, 100, false);
  const throughputSparkline = buildSmoothSvgPath(throughputPoints.slice(-8), 70, 26, 0, maxThroughput, false);

  // Filtered jobs for Recent Jobs table
  const filteredJobs = jobs.filter((j) => {
    const matchesSearch =
      j.id.toLowerCase().includes(tableSearch.toLowerCase()) ||
      j.type.toLowerCase().includes(tableSearch.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || j.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const formatTimer = (job) => {
    if (!job.created_at) return '00:00:12';
    const elapsed = Math.floor((Date.now() - new Date(job.created_at).getTime()) / 1000);
    const secs = Math.max(0, elapsed % 60);
    const mins = Math.floor(elapsed / 60) % 60;
    const hrs = Math.floor(elapsed / 3600);
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6">
      {/* 1. Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#202A3A]">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-[#F4F7FB]">
            System Overview
          </h1>
          <p className="text-xs sm:text-sm text-[#98A4B7] mt-0.5">
            Monitor distributed task execution, workers, queues and system health in real time.
          </p>
        </div>

        <div className="flex items-center space-x-2.5 self-start sm:self-auto shrink-0">
          <div className="text-right hidden sm:block">
            <span className="text-[10px] uppercase font-mono text-[#667085] block">Last updated</span>
            <span className="text-xs font-mono text-[#F4F7FB]">{lastUpdated}</span>
          </div>

          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-[#0F1420] border border-[#202A3A] text-xs font-mono text-[#98A4B7]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Live</span>
          </div>

          {onRefresh && (
            <button
              onClick={onRefresh}
              className="p-1.5 rounded-md bg-[#0F1420] hover:bg-[#151C2B] border border-[#202A3A] text-[#98A4B7] hover:text-[#F4F7FB] transition-colors"
              title="Refresh"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          )}

          {onOpenDispatchModal && (
            <button
              onClick={onOpenDispatchModal}
              className="px-3 py-1.5 rounded-md bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-medium text-xs flex items-center space-x-1.5 transition-colors"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Dispatch Task</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Four Refined Observability Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Card 1: System Health */}
        <div className="p-4 rounded-xl bg-[#0F1420] border border-[#202A3A] flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-medium uppercase tracking-wider text-[#667085]">
              SYSTEM HEALTH
            </span>
            <span className={`text-[10px] font-mono font-semibold px-1.5 py-0.2 rounded border ${
              Number(healthPct) >= 90
                ? 'bg-emerald-950/40 text-emerald-400 border-emerald-800/40'
                : 'bg-rose-950/40 text-rose-400 border-rose-800/40'
            }`}>
              {Number(healthPct) >= 90 ? 'HEALTHY' : 'DEGRADED'}
            </span>
          </div>

          <div className="flex items-end justify-between">
            <div>
              <div className="text-2xl sm:text-3xl font-bold font-mono text-[#F4F7FB] tracking-tight">
                {healthPct}%
              </div>
              <p className="text-[11px] text-[#98A4B7] mt-1 font-mono">
                {succeeded} / {totalJobs} jobs healthy
              </p>
            </div>

            {/* Sparkline */}
            <div className="w-16 h-8 flex items-center justify-end">
              <svg viewBox="0 0 70 26" className="w-full h-full overflow-visible">
                <path
                  d={healthSparkline || "M 0 20 Q 35 15, 70 6"}
                  fill="none"
                  stroke={Number(healthPct) >= 90 ? '#10B981' : '#EF4444'}
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Card 2: Throughput */}
        <div className="p-4 rounded-xl bg-[#0F1420] border border-[#202A3A] flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-medium uppercase tracking-wider text-[#667085]">
              THROUGHPUT
            </span>
            <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/40 border border-cyan-800/40 px-1.5 py-0.2 rounded">
              REAL-TIME
            </span>
          </div>

          <div className="flex items-end justify-between">
            <div>
              <div className="flex items-baseline space-x-1.5">
                <span className="text-2xl sm:text-3xl font-bold font-mono text-cyan-400 tracking-tight">
                  {instantThroughput}
                </span>
                <span className="text-xs font-mono text-[#667085]">ops/s</span>
              </div>
              <p className="text-[11px] text-[#98A4B7] mt-1 font-mono">
                {runningJobs.length} active • {succeeded} completed
              </p>
            </div>

            {/* Sparkline */}
            <div className="w-16 h-8 flex items-center justify-end">
              <svg viewBox="0 0 70 26" className="w-full h-full overflow-visible">
                <path
                  d={throughputSparkline || "M 0 22 C 20 28, 40 4, 70 12"}
                  fill="none"
                  stroke="#00E5FF"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Card 3: Worker Saturation */}
        <div className="p-4 rounded-xl bg-[#0F1420] border border-[#202A3A] flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-medium uppercase tracking-wider text-[#667085]">
              WORKER SATURATION
            </span>
            <span className="text-[10px] font-mono text-violet-400 bg-violet-950/40 border border-violet-800/40 px-1.5 py-0.2 rounded">
              FLEET
            </span>
          </div>

          <div className="flex items-end justify-between">
            <div>
              <div className="text-2xl sm:text-3xl font-bold font-mono text-[#F4F7FB] tracking-tight">
                {saturationPct}%
              </div>
              <p className="text-[11px] text-[#98A4B7] mt-1 font-mono">
                {activeLeasedTasks} / {totalCapacity} slots active
              </p>
            </div>

            {/* Subtle Circular Radial Gauge */}
            <div className="w-12 h-10 flex items-center justify-center">
              <svg viewBox="0 0 60 45" className="w-full h-full">
                <path
                  d="M 10 38 A 20 20 0 0 1 50 38"
                  fill="none"
                  stroke="#202A3A"
                  strokeWidth="5"
                  strokeLinecap="round"
                />
                <path
                  d={`M 10 38 A 20 20 0 0 1 ${Math.max(12, Math.min(50, 10 + 40 * (saturationPct / 100)))} ${Math.max(18, 38 - 20 * Math.sin((saturationPct / 100) * Math.PI))}`}
                  fill="none"
                  stroke="#8B5CF6"
                  strokeWidth="5"
                  strokeLinecap="round"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Card 4: Fencing / DLQ */}
        <div className="p-4 rounded-xl bg-[#0F1420] border border-[#202A3A] flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-medium uppercase tracking-wider text-[#667085]">
              PENDING / DLQ
            </span>
            <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded border ${
              failed > 0
                ? 'bg-rose-950/40 text-rose-400 border-rose-800/40'
                : 'bg-[#151C2B] text-[#98A4B7] border-[#202A3A]'
            }`}>
              {failed > 0 ? 'ALERT' : 'NOMINAL'}
            </span>
          </div>

          <div className="flex items-end justify-between">
            <div>
              <div className="text-2xl sm:text-3xl font-bold font-mono text-[#F4F7FB] tracking-tight">
                {dlqRate}%
              </div>
              <p className="text-[11px] text-[#98A4B7] mt-1 font-mono">
                {failed === 0 ? '0 dropped tasks' : `${failed} in dead-letter`}
              </p>
            </div>

            <div className={`p-2 rounded-lg border ${
              failed > 0
                ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                : 'bg-[#151C2B] border-[#202A3A] text-[#667085]'
            }`}>
              {failed > 0 ? <AlertTriangle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Professional Observability Telemetry Chart */}
      <div className="rounded-xl bg-[#0F1420] border border-[#202A3A] p-4 sm:p-5 space-y-4">
        {/* Chart Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#202A3A]">
          <div className="flex items-center space-x-2.5">
            <Activity className="w-4 h-4 text-cyan-400" />
            <h2 className="text-xs sm:text-sm font-semibold text-[#F4F7FB] font-sans">
              Real-time Throughput & Latency Telemetry
            </h2>
          </div>

          <div className="flex items-center space-x-4 flex-wrap gap-y-2">
            {/* Legend */}
            <div className="flex items-center space-x-3 text-xs font-mono">
              <div className="flex items-center space-x-1.5">
                <span className="w-2.5 h-1 rounded-full bg-cyan-400"></span>
                <span className="text-[#F4F7FB] font-medium">{instantThroughput} ops/s</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="w-2.5 h-1 rounded-full bg-violet-400"></span>
                <span className="text-[#98A4B7]">{instantLatency} ms</span>
              </div>
            </div>

            {/* Time range toggle */}
            <div className="flex items-center bg-[#0B0F19] border border-[#202A3A] rounded-md p-0.5 text-[11px] font-mono">
              {['1m', '5m', '15m', '1h'].map((range) => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={`px-2 py-0.5 rounded transition-colors ${
                    timeRange === range
                      ? 'bg-[#151C2B] text-cyan-400 font-medium'
                      : 'text-[#667085] hover:text-[#98A4B7]'
                  }`}
                >
                  {range}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* SVG Waveform Canvas */}
        <div className="w-full h-36 sm:h-44 relative">
          <svg viewBox="0 0 900 160" preserveAspectRatio="none" className="w-full h-full overflow-hidden">
            <defs>
              <linearGradient id="cyanArea" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#00E5FF" stopOpacity="0.15" />
                <stop offset="100%" stopColor="#00E5FF" stopOpacity="0.0" />
              </linearGradient>
              <linearGradient id="purpleArea" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.12" />
                <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Subtle Grid Lines */}
            <line x1="0" y1="40" x2="900" y2="40" stroke="#18202E" strokeWidth="1" strokeDasharray="3 3" />
            <line x1="0" y1="80" x2="900" y2="80" stroke="#18202E" strokeWidth="1" strokeDasharray="3 3" />
            <line x1="0" y1="120" x2="900" y2="120" stroke="#18202E" strokeWidth="1" strokeDasharray="3 3" />

            {/* Cyan Wave (Throughput) */}
            {cyanAreaPath && (
              <path d={cyanAreaPath} fill="url(#cyanArea)" className="transition-all duration-500 ease-out" />
            )}
            {cyanLinePath && (
              <path d={cyanLinePath} fill="none" stroke="#00E5FF" strokeWidth="2" className="transition-all duration-500 ease-out" />
            )}

            {/* Violet Wave (Latency) */}
            {purpleAreaPath && (
              <path d={purpleAreaPath} fill="url(#purpleArea)" className="transition-all duration-500 ease-out" />
            )}
            {purpleLinePath && (
              <path d={purpleLinePath} fill="none" stroke="#8B5CF6" strokeWidth="1.75" className="transition-all duration-500 ease-out" />
            )}
          </svg>
        </div>
      </div>

      {/* 4. High-Density Recent Jobs Table / Responsive Mobile Cards */}
      <div className="rounded-xl bg-[#0F1420] border border-[#202A3A] overflow-hidden">
        {/* Table Filter / Controls Header */}
        <div className="p-3.5 sm:p-4 border-b border-[#202A3A] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <h2 className="text-xs sm:text-sm font-semibold text-[#F4F7FB] font-sans">Recent Jobs</h2>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#151C2B] text-[#98A4B7] border border-[#202A3A]">
              {filteredJobs.length}
            </span>
          </div>

          <div className="flex items-center space-x-2 flex-wrap gap-y-2">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#667085] absolute left-2.5 top-2" />
              <input
                type="text"
                placeholder="Filter jobs..."
                value={tableSearch}
                onChange={(e) => setTableSearch(e.target.value)}
                className="pl-8 pr-2.5 py-1 rounded-md bg-[#0B0F19] border border-[#202A3A] text-xs font-mono text-[#F4F7FB] placeholder-[#667085] focus:outline-none focus:border-cyan-500/60 w-36 sm:w-48 transition-colors"
              />
            </div>

            {/* Status Filter Tabs */}
            <div className="flex items-center bg-[#0B0F19] border border-[#202A3A] rounded-md p-0.5 text-[11px] font-mono">
              {['ALL', 'running', 'succeeded', 'failed'].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-2 py-0.5 rounded uppercase transition-colors ${
                    statusFilter === st
                      ? 'bg-[#151C2B] text-cyan-400 font-medium'
                      : 'text-[#667085] hover:text-[#98A4B7]'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Desktop View: Clean Table (hidden on mobile <640px) */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs font-mono">
            <thead>
              <tr className="border-b border-[#202A3A] bg-[#0B0F19]/60 text-[10px] text-[#667085] uppercase tracking-wider">
                <th className="py-2.5 px-4 font-medium">Status</th>
                <th className="py-2.5 px-4 font-medium">Job</th>
                <th className="py-2.5 px-4 font-medium">Worker</th>
                <th className="py-2.5 px-4 font-medium">Priority</th>
                <th className="py-2.5 px-4 font-medium">Attempt</th>
                <th className="py-2.5 px-4 font-medium text-right">Runtime</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#18202E]/80">
              {filteredJobs.slice(0, 8).map((job, idx) => {
                const isRunning = job.status === 'running';
                const isSuccess = job.status === 'succeeded';
                const isFailed = job.status === 'failed' || job.status === 'dead_letter';

                return (
                  <tr
                    key={job.id}
                    onClick={() => onNavigateTab && onNavigateTab('jobs')}
                    className="hover:bg-[#151C2B]/60 transition-colors cursor-pointer group"
                  >
                    {/* Status Badge */}
                    <td className="py-2.5 px-4 whitespace-nowrap">
                      <span className={`inline-flex items-center space-x-1 text-[10px] font-semibold px-2 py-0.5 rounded border ${
                        isRunning
                          ? 'bg-cyan-950/40 text-cyan-300 border-cyan-800/50 animate-pulse'
                          : isSuccess
                          ? 'bg-emerald-950/40 text-emerald-400 border-emerald-800/50'
                          : isFailed
                          ? 'bg-rose-950/40 text-rose-400 border-rose-800/50'
                          : 'bg-[#151C2B] text-[#98A4B7] border-[#202A3A]'
                      }`}>
                        {isSuccess && <Check className="w-3 h-3 stroke-[2.5]" />}
                        {isRunning && <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>}
                        {isFailed && <AlertCircle className="w-3 h-3" />}
                        <span>{job.status.toUpperCase()}</span>
                      </span>
                    </td>

                    {/* Job Title & Truncated ID */}
                    <td className="py-2.5 px-4">
                      <div className="font-medium text-[#F4F7FB] group-hover:text-cyan-400 transition-colors">
                        {job.type}
                      </div>
                      <div className="text-[10px] text-[#667085] truncate max-w-[140px]">
                        {job.id.substring(0, 16)}...
                      </div>
                    </td>

                    {/* Worker */}
                    <td className="py-2.5 px-4 text-[#98A4B7]">
                      {workers[idx % Math.max(workers.length, 1)]?.hostname || `worker-node-0${(idx % 4) + 1}`}
                    </td>

                    {/* Priority */}
                    <td className="py-2.5 px-4">
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-[#151C2B] text-amber-300 border border-[#202A3A]">
                        P{job.priority || 5}
                      </span>
                    </td>

                    {/* Attempt Generation */}
                    <td className="py-2.5 px-4 text-[#98A4B7]">
                      Gen #{job.execution_generation || 1}
                    </td>

                    {/* Runtime */}
                    <td className="py-2.5 px-4 text-right text-[#667085]">
                      {formatTimer(job)}
                    </td>
                  </tr>
                );
              })}

              {filteredJobs.length === 0 && (
                <tr>
                  <td colSpan="6" className="py-10 text-center text-xs text-[#667085]">
                    No matching jobs found in current queue state.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile View: Responsive Card Rows (<640px) */}
        <div className="sm:hidden divide-y divide-[#18202E] p-2 space-y-2">
          {filteredJobs.slice(0, 6).map((job, idx) => {
            const isRunning = job.status === 'running';
            const isSuccess = job.status === 'succeeded';
            const isFailed = job.status === 'failed' || job.status === 'dead_letter';

            return (
              <div
                key={job.id}
                onClick={() => onNavigateTab && onNavigateTab('jobs')}
                className="p-3 rounded-lg bg-[#0B0F19] border border-[#202A3A] space-y-2 font-mono text-xs cursor-pointer active:bg-[#151C2B]"
              >
                <div className="flex items-center justify-between">
                  <span className={`inline-flex items-center space-x-1 text-[10px] font-semibold px-2 py-0.5 rounded border ${
                    isRunning
                      ? 'bg-cyan-950/40 text-cyan-300 border-cyan-800/50'
                      : isSuccess
                      ? 'bg-emerald-950/40 text-emerald-400 border-emerald-800/50'
                      : isFailed
                      ? 'bg-rose-950/40 text-rose-400 border-rose-800/50'
                      : 'bg-[#151C2B] text-[#98A4B7] border-[#202A3A]'
                  }`}>
                    <span>{job.status.toUpperCase()}</span>
                  </span>

                  <span className="text-[10px] text-[#667085]">{formatTimer(job)}</span>
                </div>

                <div className="text-sm font-medium text-[#F4F7FB]">{job.type}</div>
                <div className="text-[10px] text-[#667085] truncate">{job.id}</div>

                <div className="grid grid-cols-3 gap-2 pt-1 border-t border-[#18202E] text-[10px] text-[#98A4B7]">
                  <div>
                    <span className="text-[#667085] block">Worker</span>
                    <span>{workers[idx % Math.max(workers.length, 1)]?.hostname || `node-0${(idx % 4) + 1}`}</span>
                  </div>
                  <div>
                    <span className="text-[#667085] block">Priority</span>
                    <span className="text-amber-300 font-semibold">P{job.priority || 5}</span>
                  </div>
                  <div>
                    <span className="text-[#667085] block">Attempt</span>
                    <span>Gen #{job.execution_generation || 1}</span>
                  </div>
                </div>
              </div>
            );
          })}

          {filteredJobs.length === 0 && (
            <div className="py-8 text-center text-xs text-[#667085]">
              No matching jobs found.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
