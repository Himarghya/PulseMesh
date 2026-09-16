import React, { useState } from 'react';
import { GitFork, CheckCircle2, Play, Clock, AlertTriangle, ChevronRight, Zap } from 'lucide-react';

export function PulseDAGCanvas({ workflow, workflowRun, onTaskSelect }) {
  const [selectedTask, setSelectedTask] = useState(null);

  const definition = workflow?.latestVersion?.definition || { tasks: [] };
  const tasks = definition.tasks || [];
  const taskRuns = workflowRun?.tasks || [];

  const taskStatusMap = {};
  for (const tr of taskRuns) {
    taskStatusMap[tr.task_id] = tr.status;
  }

  // Calculate layered positions for DAG nodes
  // Simple layered layout: group tasks by their in-degree/depth
  const levels = [];
  const placed = new Set();
  const taskMap = new Map(tasks.map((t) => [t.id, t]));

  let currentLevel = tasks.filter((t) => (!t.dependsOn || t.dependsOn.length === 0));
  if (currentLevel.length === 0 && tasks.length > 0) currentLevel = [tasks[0]];

  while (currentLevel.length > 0) {
    levels.push(currentLevel);
    currentLevel.forEach((t) => placed.add(t.id));

    const nextLevel = tasks.filter(
      (t) => !placed.has(t.id) && (t.dependsOn || []).every((d) => placed.has(d))
    );
    if (nextLevel.length === 0) {
      // Add any remaining unplaced nodes
      const remaining = tasks.filter((t) => !placed.has(t.id));
      if (remaining.length > 0) levels.push(remaining);
      break;
    }
    currentLevel = nextLevel;
  }

  // Node position map: taskId -> { x, y }
  const nodePositions = {};
  const levelWidth = 240;
  const nodeHeight = 80;

  levels.forEach((levelTasks, colIndex) => {
    levelTasks.forEach((task, rowIndex) => {
      const x = 50 + colIndex * levelWidth;
      const y = 60 + rowIndex * (nodeHeight + 40);
      nodePositions[task.id] = { x, y };
    });
  });

  const canvasWidth = Math.max(700, (levels.length + 1) * levelWidth);
  const maxRows = Math.max(...levels.map((l) => l.length), 1);
  const canvasHeight = Math.max(380, maxRows * (nodeHeight + 50) + 80);

  return (
    <div className="cyber-card rounded-2xl p-6 relative overflow-hidden flex flex-col space-y-4">
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
            <GitFork className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-white">Live Pulse DAG Canvas</h3>
            <p className="text-[11px] text-slate-400">
              Interactive topological dependency stream with live energy pulse signals.
            </p>
          </div>
        </div>

        {workflowRun && (
          <div className="flex items-center space-x-2 text-xs font-mono">
            <span className="text-slate-400">Run Status:</span>
            <span
              className={`px-2 py-0.5 rounded border uppercase text-[10px] ${
                workflowRun.status === 'succeeded'
                  ? 'bg-emerald-950/80 text-emerald-400 border-emerald-800/50'
                  : workflowRun.status === 'running'
                  ? 'bg-cyan-950/80 text-cyan-400 border-cyan-800/50 animate-pulse'
                  : 'bg-rose-950/80 text-rose-400 border-rose-800/50'
              }`}
            >
              {workflowRun.status}
            </span>
          </div>
        )}
      </div>

      {/* SVG Canvas Area */}
      <div className="w-full overflow-x-auto overflow-y-hidden rounded-xl bg-[#080C16] border border-slate-800/80 p-4 relative">
        <svg width={canvasWidth} height={canvasHeight} className="min-w-full">
          <defs>
            {/* Glow filters for edges and nodes */}
            <filter id="glow-cyan" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            <filter id="glow-emerald" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>

            {/* Marker arrow */}
            <marker
              id="arrow-cyan"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 10 5 L 0 9 z" fill="#06B6D4" />
            </marker>
            <marker
              id="arrow-slate"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 10 5 L 0 9 z" fill="#334155" />
            </marker>
          </defs>

          {/* Draw Dependency Edges with Animated Electric Pulses */}
          {tasks.map((task) => {
            const toPos = nodePositions[task.id];
            if (!toPos) return null;

            return (task.dependsOn || []).map((depId) => {
              const fromPos = nodePositions[depId];
              if (!fromPos) return null;

              const startX = fromPos.x + 160;
              const startY = fromPos.y + 35;
              const endX = toPos.x;
              const endY = toPos.y + 35;
              const controlX1 = startX + 40;
              const controlX2 = endX - 40;

              const pathD = `M ${startX} ${startY} C ${controlX1} ${startY}, ${controlX2} ${endY}, ${endX} ${endY}`;
              const isSourceCompleted = taskStatusMap[depId] === 'succeeded';
              const isTargetActive = taskStatusMap[task.id] === 'running';

              return (
                <g key={`${depId}->${task.id}`}>
                  {/* Background base path */}
                  <path
                    d={pathD}
                    fill="none"
                    stroke={isSourceCompleted ? '#06B6D4' : '#1E293B'}
                    strokeWidth="2"
                    markerEnd={isSourceCompleted ? 'url(#arrow-cyan)' : 'url(#arrow-slate)'}
                    opacity={isSourceCompleted ? 0.8 : 0.4}
                  />

                  {/* Animated glowing energy pulse signal */}
                  {(isSourceCompleted || isTargetActive) && (
                    <path
                      d={pathD}
                      fill="none"
                      stroke="#38BDF8"
                      strokeWidth="2.5"
                      strokeDasharray="6, 12"
                      className="animate-flow-edge"
                      filter="url(#glow-cyan)"
                    />
                  )}
                </g>
              );
            });
          })}

          {/* Draw Task Nodes */}
          {tasks.map((task) => {
            const pos = nodePositions[task.id];
            if (!pos) return null;
            const status = taskStatusMap[task.id] || 'pending';
            const isSelected = selectedTask?.id === task.id;

            return (
              <g
                key={task.id}
                transform={`translate(${pos.x}, ${pos.y})`}
                onClick={() => {
                  setSelectedTask(task);
                  if (onTaskSelect) onTaskSelect(task);
                }}
                className="cursor-pointer group"
              >
                {/* Node Box */}
                <rect
                  width="160"
                  height="70"
                  rx="10"
                  className={`transition-all ${
                    status === 'succeeded'
                      ? 'fill-[#0E1F1A] stroke-emerald-500/80 stroke-2'
                      : status === 'running'
                      ? 'fill-[#0C1A2E] stroke-cyan-400 stroke-2'
                      : status === 'failed'
                      ? 'fill-[#240F15] stroke-rose-500 stroke-2'
                      : status === 'skipped'
                      ? 'fill-[#12141D] stroke-slate-700 stroke-1'
                      : 'fill-[#0D1322] stroke-slate-800 stroke-1'
                  } ${isSelected ? 'stroke-cyan-300 filter drop-shadow(0 0 10px rgba(6,182,212,0.5))' : ''}`}
                />

                {/* Status Indicator Dot */}
                <circle
                  cx="18"
                  cy="22"
                  r="5"
                  className={
                    status === 'succeeded'
                      ? 'fill-emerald-400'
                      : status === 'running'
                      ? 'fill-cyan-400 animate-pulse'
                      : status === 'failed'
                      ? 'fill-rose-400'
                      : 'fill-slate-600'
                  }
                />

                {/* Task ID / Label */}
                <text
                  x="30"
                  y="26"
                  fill="#F1F5F9"
                  fontSize="12"
                  fontWeight="bold"
                  fontFamily="JetBrains Mono"
                >
                  {task.id.length > 14 ? task.id.substring(0, 12) + '..' : task.id}
                </text>

                {/* Task Type */}
                <text
                  x="18"
                  y="48"
                  fill="#06B6D4"
                  fontSize="10"
                  fontFamily="JetBrains Mono"
                  opacity="0.9"
                >
                  {task.type}
                </text>

                {/* Status Label */}
                <text
                  x="145"
                  y="48"
                  textAnchor="end"
                  fill={
                    status === 'succeeded'
                      ? '#34D399'
                      : status === 'running'
                      ? '#38BDF8'
                      : status === 'failed'
                      ? '#F87171'
                      : '#64748B'
                  }
                  fontSize="9"
                  fontFamily="JetBrains Mono"
                  textTransform="uppercase"
                  fontWeight="bold"
                >
                  {status}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Selected Task Details Bar */}
      {selectedTask && (
        <div className="p-3.5 rounded-lg bg-slate-900/90 border border-slate-800 text-xs font-mono flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center space-x-3">
            <span className="text-cyan-400 font-bold">Selected Node: {selectedTask.id}</span>
            <span className="text-slate-400">Type: {selectedTask.type}</span>
            <span className="text-slate-400">
              Depends On: [{selectedTask.dependsOn?.join(', ') || 'None'}]
            </span>
          </div>
          <button
            onClick={() => setSelectedTask(null)}
            className="text-[11px] text-slate-500 hover:text-slate-300"
          >
            Clear Selection
          </button>
        </div>
      )}
    </div>
  );
}
