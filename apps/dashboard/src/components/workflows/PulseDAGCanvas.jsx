import React, { useState } from 'react';
import { GitFork, CheckCircle2, Play, Clock, AlertTriangle, ChevronRight, Zap, Cpu, Terminal, Shield } from 'lucide-react';

export function PulseDAGCanvas({ workflow, workflowRun, onTaskSelect }) {
  const [selectedTask, setSelectedTask] = useState(null);

  const definition = workflow?.latestVersion?.definition || { tasks: [] };
  const tasks = definition.tasks || [];
  const taskRuns = workflowRun?.tasks || [];

  const taskStatusMap = {};
  for (const tr of taskRuns) {
    taskStatusMap[tr.task_id] = tr.status;
  }

  // Calculate layered positions for DAG nodes via topological levels
  const levels = [];
  const placed = new Set();

  let currentLevel = tasks.filter((t) => !t.dependsOn || t.dependsOn.length === 0);
  if (currentLevel.length === 0 && tasks.length > 0) currentLevel = [tasks[0]];

  while (currentLevel.length > 0) {
    levels.push(currentLevel);
    currentLevel.forEach((t) => placed.add(t.id));

    const nextLevel = tasks.filter(
      (t) => !placed.has(t.id) && (t.dependsOn || []).every((d) => placed.has(d))
    );
    if (nextLevel.length === 0) {
      const remaining = tasks.filter((t) => !placed.has(t.id));
      if (remaining.length > 0) levels.push(remaining);
      break;
    }
    currentLevel = nextLevel;
  }

  // Node dimensions & layout spacing
  const nodeWidth = 190;
  const nodeHeight = 80;
  const levelWidth = 260;

  const nodePositions = {};
  levels.forEach((levelTasks, colIndex) => {
    levelTasks.forEach((task, rowIndex) => {
      const x = 40 + colIndex * levelWidth;
      const y = 50 + rowIndex * (nodeHeight + 35);
      nodePositions[task.id] = { x, y };
    });
  });

  const canvasWidth = Math.max(760, (levels.length + 0.5) * levelWidth);
  const maxRows = Math.max(...levels.map((l) => l.length), 1);
  const canvasHeight = Math.max(260, maxRows * (nodeHeight + 40) + 70);

  return (
    <div className="cyber-card rounded-2xl p-6 relative overflow-hidden flex flex-col space-y-4 bg-slate-950 border border-slate-800 shadow-2xl">
      <div className="flex flex-wrap items-center justify-between border-b border-slate-800/80 pb-3 gap-2">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
            <GitFork className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-white font-mono">Live Pulse DAG Canvas</h3>
            <p className="text-[11px] text-slate-400">
              Interactive topological dependency stream with live energy pulse signals.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3 text-xs font-mono">
          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded bg-slate-900 border border-slate-800">
            <span className="text-slate-500">Stages:</span>
            <span className="text-cyan-400 font-bold">{levels.length} Parallel Layers</span>
          </div>

          {workflowRun && (
            <div className="flex items-center space-x-2">
              <span className="text-slate-400">Run:</span>
              <span
                className={`px-2.5 py-0.5 rounded border uppercase text-[10px] font-bold ${
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
      </div>

      {/* SVG Canvas Area */}
      <div className="w-full overflow-x-auto overflow-y-hidden rounded-xl bg-[#060912] border border-slate-800/90 p-3 relative">
        <svg width={canvasWidth} height={canvasHeight} className="min-w-full">
          <defs>
            <filter id="glow-cyan" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            <filter id="glow-purple" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>

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
              id="arrow-emerald"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 10 5 L 0 9 z" fill="#10B981" />
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

              const startX = fromPos.x + nodeWidth;
              const startY = fromPos.y + 40;
              const endX = toPos.x;
              const endY = toPos.y + 40;
              const controlX1 = startX + 45;
              const controlX2 = endX - 45;

              const pathD = `M ${startX} ${startY} C ${controlX1} ${startY}, ${controlX2} ${endY}, ${endX} ${endY}`;
              const isSourceCompleted = taskStatusMap[depId] === 'succeeded';
              const isTargetActive = taskStatusMap[task.id] === 'running';

              return (
                <g key={`${depId}->${task.id}`}>
                  {/* Base path */}
                  <path
                    d={pathD}
                    fill="none"
                    stroke={isSourceCompleted ? '#10B981' : '#1E293B'}
                    strokeWidth="2"
                    markerEnd={isSourceCompleted ? 'url(#arrow-emerald)' : 'url(#arrow-slate)'}
                    opacity={isSourceCompleted ? 0.9 : 0.5}
                  />

                  {/* Animated energy pulse signal */}
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
                  width={nodeWidth}
                  height={nodeHeight}
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
                  } ${isSelected ? 'stroke-cyan-300 filter drop-shadow(0 0 12px rgba(6,182,212,0.6))' : ''}`}
                />

                {/* Status Indicator Dot */}
                <circle
                  cx="16"
                  cy="24"
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

                {/* Task ID Label */}
                <text
                  x="28"
                  y="28"
                  fill="#F8FAFC"
                  fontSize="12"
                  fontWeight="bold"
                  fontFamily="JetBrains Mono"
                >
                  {task.id.length > 16 ? task.id.substring(0, 14) + '..' : task.id}
                </text>

                {/* Task Type Badge Area */}
                <rect
                  x="14"
                  y="44"
                  width={Math.min(105, task.type.length * 8 + 12)}
                  height="18"
                  rx="4"
                  className="fill-cyan-950/60 stroke-cyan-800/40 stroke-1"
                />
                <text
                  x="18"
                  y="57"
                  fill="#22D3EE"
                  fontSize="9"
                  fontFamily="JetBrains Mono"
                  fontWeight="600"
                >
                  {task.type.length > 14 ? task.type.substring(0, 12) + '..' : task.type}
                </text>

                {/* Status Pill on Right */}
                <rect
                  x={nodeWidth - 56}
                  y="44"
                  width="44"
                  height="18"
                  rx="4"
                  className={
                    status === 'succeeded'
                      ? 'fill-emerald-950/70 stroke-emerald-700/50 stroke-1'
                      : status === 'running'
                      ? 'fill-cyan-950/70 stroke-cyan-700/50 stroke-1'
                      : status === 'failed'
                      ? 'fill-rose-950/70 stroke-rose-700/50 stroke-1'
                      : 'fill-slate-900 stroke-slate-800 stroke-1'
                  }
                />
                <text
                  x={nodeWidth - 34}
                  y="57"
                  textAnchor="middle"
                  fill={
                    status === 'succeeded'
                      ? '#34D399'
                      : status === 'running'
                      ? '#38BDF8'
                      : status === 'failed'
                      ? '#F87171'
                      : '#94A3B8'
                  }
                  fontSize="8.5"
                  fontFamily="JetBrains Mono"
                  style={{ textTransform: 'uppercase' }}
                  fontWeight="bold"
                >
                  {status}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Selected Task Inspection Bar */}
      {selectedTask && (
        <div className="p-3.5 rounded-xl bg-slate-900/95 border border-cyan-500/30 text-xs font-mono flex flex-wrap items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center space-x-3 flex-wrap">
            <span className="text-cyan-300 font-bold flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
              <span>Inspecting Node: {selectedTask.id}</span>
            </span>
            <span className="text-slate-400">
              Type: <code className="text-purple-300">{selectedTask.type}</code>
            </span>
            <span className="text-slate-400">
              Prerequisites:{' '}
              <code className="text-emerald-300">
                {selectedTask.dependsOn?.length ? `[${selectedTask.dependsOn.join(', ')}]` : 'ROOT (None)'}
              </code>
            </span>
          </div>

          <button
            onClick={() => setSelectedTask(null)}
            className="text-[11px] text-slate-400 hover:text-white px-2 py-0.5 rounded hover:bg-slate-800 transition-all"
          >
            Close Inspector
          </button>
        </div>
      )}
    </div>
  );
}

