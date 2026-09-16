import React from 'react';
import { ShieldCheck, Zap, RefreshCw, Search, ChevronDown, Menu, X, Plus } from 'lucide-react';

export function Header({
  currentTenant,
  activeTab,
  onRefresh,
  isRefreshing,
  onOpenDispatchModal,
  onOpenCommandPalette,
  isMobileNavOpen,
  onToggleMobileNav,
}) {
  return (
    <header className="h-14 border-b border-[#202A3A] bg-[#0A0E17]/90 backdrop-blur-md px-3 sm:px-6 flex items-center justify-between sticky top-0 z-30">
      {/* LEFT: Product Identity & Mobile Toggle */}
      <div className="flex items-center space-x-3 sm:space-x-4 shrink-0">
        {/* Mobile Hamburger Toggle */}
        <button
          onClick={onToggleMobileNav}
          className="p-1.5 -ml-1 rounded-md md:hidden text-[#98A4B7] hover:text-[#F4F7FB] hover:bg-[#151C2B] transition-colors"
          aria-label="Toggle Navigation Menu"
        >
          {isMobileNavOpen ? <X className="w-5 h-5 text-cyan-400" /> : <Menu className="w-5 h-5" />}
        </button>

        {/* PulseMesh Brand Mark */}
        <div className="flex items-center space-x-2.5">
          <div className="w-7 h-7 rounded-md bg-gradient-to-tr from-cyan-500 to-indigo-500 flex items-center justify-center shadow-sm shrink-0">
            <Zap className="w-4 h-4 text-slate-950 stroke-[2.5]" />
          </div>
          <div className="flex items-center space-x-2">
            <span className="font-bold text-sm sm:text-base tracking-tight text-[#F4F7FB] font-sans">
              PULSE<span className="text-cyan-400">MESH</span>
            </span>
            <span className="hidden xs:inline-flex text-[10px] font-mono font-medium px-1.5 py-0.5 rounded bg-[#151C2B] text-[#98A4B7] border border-[#202A3A]">
              v1.0
            </span>
          </div>
        </div>
      </div>

      {/* CENTER: Global Search & Command Palette Trigger */}
      <div className="flex-1 max-w-md mx-4 hidden md:block">
        <button
          onClick={onOpenCommandPalette}
          className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg bg-[#0F1420] border border-[#202A3A] hover:border-[#2D3D56] text-[#667085] hover:text-[#98A4B7] transition-all text-xs group"
        >
          <div className="flex items-center space-x-2 truncate">
            <Search className="w-3.5 h-3.5 text-[#667085] group-hover:text-cyan-400 transition-colors" />
            <span className="truncate font-sans text-xs">Search jobs, workers, queues...</span>
          </div>
          <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-[#151C2B] text-[#98A4B7] rounded border border-[#283448] shrink-0">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* RIGHT: Status, Region, Primary Action & User Profile */}
      <div className="flex items-center space-x-2 sm:space-x-2.5 shrink-0">
        {/* Mobile Search Button */}
        <button
          onClick={onOpenCommandPalette}
          className="p-1.5 rounded-lg md:hidden text-[#98A4B7] hover:text-[#F4F7FB] hover:bg-[#151C2B] transition-colors"
          title="Open Command Palette"
        >
          <Search className="w-4 h-4" />
        </button>

        {/* Live SSE Stream Indicator */}
        <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-emerald-950/40 border border-emerald-800/40 text-[11px] font-mono text-emerald-400">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0"></span>
          <span className="font-medium tracking-wide">LIVE</span>
        </div>

        {/* Region Selector */}
        <div className="hidden lg:flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-[#0F1420] border border-[#202A3A] text-xs font-mono text-[#98A4B7]">
          <span className="text-[#667085]">Region:</span>
          <span className="text-[#F4F7FB] font-medium">US-EAST</span>
          <ChevronDown className="w-3 h-3 text-[#667085]" />
        </div>

        {/* Primary Action: Dispatch Task */}
        <button
          onClick={onOpenDispatchModal}
          className="px-3 py-1.5 rounded-md bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs font-sans flex items-center space-x-1.5 shadow-sm active:scale-95 transition-all shrink-0"
        >
          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
          <span className="hidden sm:inline">Dispatch Task</span>
          <span className="sm:hidden">Dispatch</span>
        </button>

        {/* Organization / Tenant */}
        <div className="hidden xl:flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-[#0F1420] border border-[#202A3A] text-xs text-[#98A4B7]">
          <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
          <span className="truncate max-w-[100px]">{currentTenant?.organizationName || 'Primary Cluster'}</span>
        </div>

        {/* Refresh button */}
        <button
          onClick={onRefresh}
          className="p-1.5 rounded-md bg-[#0F1420] hover:bg-[#151C2B] border border-[#202A3A] text-[#98A4B7] hover:text-[#F4F7FB] transition-colors shrink-0"
          title="Refresh Telemetry"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-cyan-400' : ''}`} />
        </button>
      </div>
    </header>
  );
}
