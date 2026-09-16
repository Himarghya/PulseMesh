import React from 'react';
import { Activity, ShieldCheck, Zap, Terminal, RefreshCw } from 'lucide-react';

export function Header({ currentTenant, activeTab, onRefresh, isRefreshing }) {
  return (
    <header className="h-16 border-b border-slate-800/80 bg-[#0A0E1A]/80 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-30">
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <Zap className="w-4 h-4 text-black stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-extrabold text-base tracking-wider bg-gradient-to-r from-white via-slate-200 to-cyan-400 bg-clip-text text-transparent">
                PULSEMESH
              </span>
              <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-cyan-950/80 text-cyan-400 border border-cyan-800/50">
                v1.0 ESM
              </span>
            </div>
          </div>
        </div>

        <div className="h-4 w-[1px] bg-slate-800"></div>

        <div className="flex items-center space-x-2 text-xs text-slate-400">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
          <span className="font-mono text-emerald-400">TELEMETRY MATRIX LIVE</span>
        </div>
      </div>

      <div className="flex items-center space-x-4">
        {/* Workspace Tenant Badge */}
        <div className="hidden sm:flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-slate-900/90 border border-slate-800 text-xs">
          <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-slate-400">Org:</span>
          <span className="text-slate-200 font-medium">{currentTenant?.organizationName || 'Default Workspace'}</span>
        </div>

        <button
          onClick={onRefresh}
          className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-cyan-400 transition-colors"
          title="Refresh Telemetry"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-cyan-400' : ''}`} />
        </button>
      </div>
    </header>
  );
}
