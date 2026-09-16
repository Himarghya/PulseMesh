import React from 'react';

export function MetricCard({ title, value, subtitle, icon: Icon, color = 'cyan', badge }) {
  const colorMap = {
    cyan: 'border-cyan-500/30 text-cyan-400 bg-cyan-500/10 shadow-cyan-500/10',
    emerald: 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10 shadow-emerald-500/10',
    amber: 'border-amber-500/30 text-amber-400 bg-amber-500/10 shadow-amber-500/10',
    rose: 'border-rose-500/30 text-rose-400 bg-rose-500/10 shadow-rose-500/10',
    purple: 'border-purple-500/30 text-purple-400 bg-purple-500/10 shadow-purple-500/10',
  };

  const glowClass = colorMap[color] || colorMap.cyan;

  return (
    <div className="cyber-card rounded-xl p-5 relative overflow-hidden group hover:border-slate-700 transition-all">
      {/* Top indicator glow bar */}
      <div className={`absolute top-0 left-0 right-0 h-[2px] bg-${color === 'rose' ? 'rose' : color === 'emerald' ? 'emerald' : color === 'amber' ? 'amber' : color === 'purple' ? 'purple' : 'cyan'}-500/40`}></div>

      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-mono uppercase tracking-wider text-slate-400 mb-1">{title}</p>
          <h3 className="text-2xl font-extrabold text-white tracking-tight">{value}</h3>
          {subtitle && <p className="text-xs text-slate-500 mt-1">{subtitle}</p>}
        </div>

        <div className={`w-10 h-10 rounded-lg flex items-center justify-center border shadow-md ${glowClass}`}>
          {Icon && <Icon className="w-5 h-5" />}
        </div>
      </div>

      {badge && (
        <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
          <span>{badge.label}</span>
          <span className="font-mono text-slate-300 font-semibold">{badge.value}</span>
        </div>
      )}
    </div>
  );
}
