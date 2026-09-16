import React from 'react';
import { ShieldCheck, Zap, RefreshCw, Search, ChevronDown } from 'lucide-react';

export function Header({ currentTenant, activeTab, onRefresh, isRefreshing, onTriggerDemoJob }) {
  return (
    <header className="h-16 border-b border-[#162238] bg-[#080D1C]/85 backdrop-blur-xl px-6 flex items-center justify-between sticky top-0 z-30 shadow-md shadow-black/40">
      {/* Brand & Logo */}
      <div className="flex items-center space-x-6">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#00E5FF] to-[#6366F1] flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <Zap className="w-4 h-4 text-slate-950 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-extrabold text-base tracking-wider bg-gradient-to-r from-white via-slate-100 to-cyan-400 bg-clip-text text-transparent">
                PULSEMESH
              </span>
              <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-cyan-950/60 text-cyan-300 border border-cyan-700/40">
                v1.0 ESM
              </span>
            </div>
          </div>
        </div>

        {/* Real-time Global Search */}
        <div className="hidden md:flex items-center relative">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 pointer-events-none" />
          <input
            type="text"
            placeholder="Real-time search..."
            className="bg-[#0B1324] border border-[#18263F] text-slate-200 placeholder-slate-500 text-xs font-mono rounded-lg pl-8 pr-10 py-1.5 w-64 focus:outline-none focus:border-cyan-500/70 focus:ring-1 focus:ring-cyan-500/30 transition-all"
          />
          <kbd className="absolute right-2.5 px-1.5 py-0.5 text-[10px] font-mono bg-[#141E33] text-slate-400 rounded border border-[#223352]">
            ⌘K
          </kbd>
        </div>
      </div>

      {/* Center Stream & Cluster Controls */}
      <div className="flex items-center space-x-3">
        {/* SSE Stream Live Beacon */}
        <div className="flex items-center space-x-2 px-3 py-1.5 rounded-full bg-[#081A26] border border-cyan-500/30 text-[11px] font-mono text-cyan-300 shadow-sm shadow-cyan-500/10">
          <span className="w-2 h-2 rounded-full bg-[#00E5FF] animate-ping"></span>
          <span className="font-semibold tracking-wide">SSE STREAM LIVE</span>
        </div>

        {/* Cluster Region Selector */}
        <div className="hidden lg:flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-[#0B1324] border border-[#18263F] text-xs font-mono text-slate-300">
          <span className="text-slate-500 text-[11px]">Cluster Region:</span>
          <span className="text-slate-200 font-semibold">US-EAST</span>
          <ChevronDown className="w-3 h-3 text-slate-500 ml-0.5" />
        </div>

        {/* Dispatch Task Primary Button */}
        {onTriggerDemoJob && (
          <button
            onClick={onTriggerDemoJob}
            className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-[#00E5FF] to-[#3B82F6] hover:from-cyan-300 hover:to-blue-400 text-slate-950 font-extrabold text-xs font-mono flex items-center space-x-1.5 shadow-md shadow-cyan-500/20 transition-all active:scale-95"
          >
            <Zap className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Dispatch Task</span>
          </button>
        )}

        {/* Workspace Tenant Badge */}
        <div className="hidden sm:flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-[#0B1324] border border-[#18263F] text-xs">
          <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-slate-400">Org:</span>
          <span className="text-slate-200 font-medium">{currentTenant?.organizationName || 'Primary Cluster'}</span>
        </div>

        {/* Refresh button */}
        <button
          onClick={onRefresh}
          className="p-2 rounded-lg bg-[#0B1324] hover:bg-[#111C33] border border-[#18263F] text-slate-400 hover:text-cyan-400 transition-colors"
          title="Refresh Telemetry"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-cyan-400' : ''}`} />
        </button>
      </div>
    </header>
  );
}

