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
  X,
  CheckCircle2,
} from 'lucide-react';

export function Sidebar({ activeTab, setActiveTab, isOpen, onClose }) {
  const navSections = [
    {
      title: 'MONITOR',
      items: [
        { id: 'overview', label: 'System Overview', icon: LayoutDashboard, badge: 'Live' },
        { id: 'queue', label: 'Queue Explorer', icon: Layers },
        { id: 'workers', label: 'Worker Radar', icon: Cpu },
      ],
    },
    {
      title: 'WORKFLOWS',
      items: [
        { id: 'jobs', label: 'Job Inspector', icon: Database },
        { id: 'workflows', label: 'DAG Workflows', icon: GitFork },
        { id: 'schedules', label: 'Schedules', icon: Calendar },
      ],
    },
    {
      title: 'OPERATIONS',
      items: [
        { id: 'chaos', label: 'Chaos Simulator', icon: Flame, badge: 'Lab' },
        { id: 'settings', label: 'API Keys & RBAC', icon: Key },
      ],
    },
  ];

  const sidebarContent = (
    <div className="flex flex-col justify-between h-full bg-[#0A0E17]">
      {/* Top Navigation Sections */}
      <div className="p-3 space-y-5 overflow-y-auto">
        {/* Mobile Header in Drawer */}
        <div className="flex items-center justify-between px-2 pt-1 md:hidden">
          <span className="text-xs font-semibold text-[#F4F7FB] font-sans">Menu</span>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 rounded-md text-[#98A4B7] hover:text-[#F4F7FB] hover:bg-[#151C2B] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {navSections.map((section, idx) => (
          <div key={idx} className="space-y-1">
            <div className="px-2.5 py-1 text-[10px] font-mono font-semibold tracking-wider text-[#667085] uppercase">
              {section.title}
            </div>

            <div className="space-y-0.5">
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id);
                      if (onClose) onClose();
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-2 rounded-md text-xs font-medium transition-colors group ${
                      isActive
                        ? 'bg-[#151C2B] text-[#F4F7FB] border border-[#283448]'
                        : 'text-[#98A4B7] hover:text-[#F4F7FB] hover:bg-[#0F1420] border border-transparent'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5">
                      <Icon
                        className={`w-4 h-4 transition-colors shrink-0 ${
                          isActive ? 'text-cyan-400' : 'text-[#667085] group-hover:text-[#98A4B7]'
                        }`}
                      />
                      <span className={isActive ? 'font-semibold text-[#F4F7FB]' : ''}>{item.label}</span>
                    </div>

                    {item.badge && (
                      <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded border ${
                        item.badge === 'Live'
                          ? 'bg-emerald-950/40 text-emerald-400 border-emerald-800/40'
                          : 'bg-rose-950/40 text-rose-400 border-rose-800/40'
                      }`}>
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Bottom Status Panel */}
      <div className="p-3 border-t border-[#202A3A] bg-[#070A12]/80 space-y-1">
        <div className="flex items-center space-x-2 text-[11px] text-[#98A4B7] font-sans">
          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
          <span className="text-[#F4F7FB] font-medium">All systems operational</span>
        </div>
        <div className="text-[10px] text-[#667085] font-mono pl-4">
          Fencing: Monotonic v1
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Fixed/Sticky Sidebar */}
      <aside className="hidden md:flex flex-col w-56 border-r border-[#202A3A] bg-[#0A0E17] shrink-0 min-h-[calc(100vh-3.5rem)] sticky top-14 self-start">
        {sidebarContent}
      </aside>

      {/* Mobile Off-Canvas Drawer Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 md:hidden transition-opacity"
        />
      )}

      {/* Mobile Off-Canvas Drawer Container */}
      <div
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-[#0A0E17] border-r border-[#202A3A] shadow-2xl md:hidden transform transition-transform duration-200 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {sidebarContent}
      </div>
    </>
  );
}
