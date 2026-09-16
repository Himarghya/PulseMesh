import React from 'react';
import {
  LayoutDashboard,
  Layers,
  GitFork,
  Cpu,
  Calendar,
  Flame,
  Key,
  Database,
  Radio,
} from 'lucide-react';

export function Sidebar({ activeTab, setActiveTab }) {
  const navItems = [
    { id: 'overview', label: 'System Overview', icon: LayoutDashboard, badge: 'Live' },
    { id: 'queue', label: 'Queue Explorer', icon: Layers },
    { id: 'jobs', label: 'Job Inspector', icon: Database },
    { id: 'workflows', label: 'DAG Workflows', icon: GitFork, pulse: true },
    { id: 'workers', label: 'Worker Radar', icon: Cpu },
    { id: 'schedules', label: 'Schedules', icon: Calendar },
    { id: 'chaos', label: 'Chaos Simulator', icon: Flame, color: 'text-rose-400' },
    { id: 'settings', label: 'API Keys & RBAC', icon: Key },
  ];

  return (
    <aside className="w-64 border-r border-[#162238] bg-[#070B16]/95 backdrop-blur-xl flex flex-col justify-between shrink-0 min-h-[calc(100vh-4rem)] shadow-lg shadow-black/30">
      <div className="p-4 space-y-1.5">
        <div className="px-3 py-2 text-[11px] font-mono tracking-wider text-slate-500 uppercase">
          Command & Control
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all group ${
                isActive
                  ? 'bg-gradient-to-r from-cyan-500/15 via-cyan-500/5 to-transparent text-cyan-300 border-l-2 border-l-cyan-400 border-t border-b border-r border-[#162B44] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#0C1426] border border-transparent'
              }`}
            >
              <div className="flex items-center space-x-3">
                <Icon
                  className={`w-4 h-4 transition-colors ${
                    isActive ? 'text-cyan-400 drop-shadow-[0_0_6px_rgba(0,229,255,0.4)]' : item.color || 'text-slate-500 group-hover:text-slate-300'
                  }`}
                />
                <span className={isActive ? 'font-bold text-white' : ''}>{item.label}</span>
              </div>

              {item.badge && (
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-800/40">
                  {item.badge}
                </span>
              )}

              {item.pulse && (
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_6px_rgba(0,229,255,0.6)]"></span>
              )}
            </button>
          );
        })}
      </div>

      {/* Footer Node Info */}
      <div className="p-4 border-t border-[#162238] bg-[#050812]/70">
        <div className="flex items-center space-x-2 text-[11px] text-slate-400 font-mono">
          <Radio className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
          <span className="text-slate-300 font-semibold">Fencing: Monotonic v1</span>
        </div>
        <div className="text-[10px] text-slate-500 mt-1">
          PostgreSQL Truth • At-Least-Once
        </div>
      </div>
    </aside>
  );
}

