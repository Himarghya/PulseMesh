import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  LayoutDashboard,
  Layers,
  Database,
  GitFork,
  Cpu,
  Calendar,
  Flame,
  Key,
  Zap,
  ArrowRight,
  Command,
  X,
  Radio,
  Clock,
  CheckCircle2,
} from 'lucide-react';

export function CommandPalette({
  isOpen,
  onClose,
  onNavigateTab,
  onTriggerDispatch,
  jobs = [],
  workers = [],
  queues = [],
  workflows = [],
  schedules = [],
}) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Handle global ⌘K / Ctrl+K keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) {
          onClose();
        } else {
          onNavigateTab('open_search');
        }
      } else if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, onNavigateTab]);

  if (!isOpen) return null;

  // Build searchable items list
  const navItems = [
    { id: 'overview', title: 'System Overview', category: 'Navigation', icon: LayoutDashboard, desc: 'Real-time infrastructure health and telemetry' },
    { id: 'queue', title: 'Queue Explorer', category: 'Navigation', icon: Layers, desc: 'Fair-share scheduler and partition depths' },
    { id: 'jobs', title: 'Job Inspector', category: 'Navigation', icon: Database, desc: 'Task execution history and atomic audit logs' },
    { id: 'workflows', title: 'DAG Workflows', category: 'Navigation', icon: GitFork, desc: 'Topological DAG graphs and step execution' },
    { id: 'workers', title: 'Worker Radar', category: 'Navigation', icon: Cpu, desc: 'Compute instance fleet and memory telemetry' },
    { id: 'schedules', title: 'Schedules', category: 'Navigation', icon: Calendar, desc: 'Deterministic cron execution and tick dedup' },
    { id: 'chaos', title: 'Chaos Simulator', category: 'Navigation', icon: Flame, desc: 'Distributed failure injection and lease tests' },
    { id: 'settings', title: 'API Keys & RBAC', category: 'Navigation', icon: Key, desc: 'Zero-trust security and multi-tenant roles' },
  ];

  const actionItems = [
    {
      id: 'action_dispatch',
      title: 'Dispatch New Task',
      category: 'Actions',
      icon: Zap,
      desc: 'Enqueue a background job with payload and priority',
      action: () => {
        onClose();
        if (onTriggerDispatch) onTriggerDispatch();
      },
    },
  ];

  // Dynamic entity items
  const dynamicJobs = jobs.slice(0, 5).map((j) => ({
    id: `job_${j.id}`,
    title: `Job: ${j.type} (${j.id.substring(0, 8)}...)`,
    category: 'Jobs',
    icon: Database,
    desc: `Status: ${j.status.toUpperCase()} • Priority: P${j.priority || 5}`,
    action: () => {
      onClose();
      onNavigateTab('jobs');
    },
  }));

  const dynamicWorkers = workers.map((w) => ({
    id: `worker_${w.id}`,
    title: `Worker: ${w.hostname || w.id.substring(0, 8)}`,
    category: 'Workers',
    icon: Cpu,
    desc: `Status: ${w.status.toUpperCase()} • ${w.active_jobs_count || 0}/${w.capacity || 5} active slots`,
    action: () => {
      onClose();
      onNavigateTab('workers');
    },
  }));

  const allItems = [...navItems, ...actionItems, ...dynamicJobs, ...dynamicWorkers];

  const filteredItems = query.trim() === ''
    ? allItems
    : allItems.filter((item) =>
        item.title.toLowerCase().includes(query.toLowerCase()) ||
        item.category.toLowerCase().includes(query.toLowerCase()) ||
        (item.desc && item.desc.toLowerCase().includes(query.toLowerCase()))
      );

  const handleSelect = (item) => {
    if (item.action) {
      item.action();
    } else if (item.category === 'Navigation') {
      onNavigateTab(item.id);
      onClose();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredItems.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredItems.length) % Math.max(1, filteredItems.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredItems[selectedIndex]) {
        handleSelect(filteredItems[selectedIndex]);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75  flex items-start justify-center pt-20 sm:pt-28 px-4 animate-fade-in">
      <div className="w-full max-w-xl bg-[#0F1420] border border-[#202A3A] rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[70vh]">
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-[#202A3A] bg-[#0B0F19]">
          <Search className="w-4 h-4 text-[#667085] mr-3 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Search commands, jobs, workers, workflows... (Type to filter)"
            className="w-full bg-transparent text-sm text-[#F4F7FB] placeholder-[#667085] focus:outline-none font-sans"
          />
          <button
            onClick={onClose}
            className="p-1 rounded text-[#667085] hover:text-[#F4F7FB] hover:bg-[#151C2B] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search Results List */}
        <div className="overflow-y-auto p-2 space-y-1 divide-y divide-[#18202E]/60">
          {filteredItems.map((item, index) => {
            const Icon = item.icon;
            const isSelected = index === selectedIndex;
            return (
              <div
                key={item.id}
                onClick={() => handleSelect(item)}
                onMouseEnter={() => setSelectedIndex(index)}
                className={`flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer transition-colors text-xs ${
                  isSelected
                    ? 'bg-[#151C2B] text-[#F4F7FB] border border-[#283448]'
                    : 'text-[#98A4B7] hover:bg-[#121827] border border-transparent'
                }`}
              >
                <div className="flex items-center space-x-3 truncate">
                  <div className={`p-1.5 rounded-md ${isSelected ? 'bg-cyan-500/10 text-cyan-400' : 'bg-[#18202E] text-[#667085]'}`}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <div className="truncate">
                    <div className="font-medium text-[#F4F7FB] truncate">{item.title}</div>
                    {item.desc && (
                      <div className="text-[11px] text-[#667085] truncate">{item.desc}</div>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-2 shrink-0 ml-3">
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#18202E] text-[#98A4B7] border border-[#202A3A]">
                    {item.category}
                  </span>
                  {isSelected && <ArrowRight className="w-3.5 h-3.5 text-cyan-400" />}
                </div>
              </div>
            );
          })}

          {filteredItems.length === 0 && (
            <div className="py-10 text-center text-xs text-[#667085] font-sans">
              No matching commands or entities found for "{query}".
            </div>
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="px-4 py-2 bg-[#070A12] border-t border-[#202A3A] flex items-center justify-between text-[11px] text-[#667085] font-mono">
          <div className="flex items-center space-x-3">
            <span><kbd className="px-1 py-0.5 rounded bg-[#151C2B] border border-[#202A3A]">↑</kbd> <kbd className="px-1 py-0.5 rounded bg-[#151C2B] border border-[#202A3A]">↓</kbd> Navigate</span>
            <span><kbd className="px-1.5 py-0.5 rounded bg-[#151C2B] border border-[#202A3A]">↵</kbd> Select</span>
            <span><kbd className="px-1.5 py-0.5 rounded bg-[#151C2B] border border-[#202A3A]">ESC</kbd> Close</span>
          </div>
          <span className="hidden sm:inline">PulseMesh Command Matrix</span>
        </div>
      </div>
    </div>
  );
}
