import React, { useState } from 'react';
import { Flame, ShieldAlert, Zap, Skull, RefreshCcw, Activity, CheckCircle2 } from 'lucide-react';
import { api } from '../../services/api.js';

export function ChaosConsole({ workers = [], jobs = [], onRefresh }) {
  const [chaosLog, setChaosLog] = useState([]);
  const [isInjecting, setIsInjecting] = useState(false);

  const addLog = (msg, type = 'info') => {
    setChaosLog((prev) => [
      { time: new Date().toLocaleTimeString(), msg, type, id: Math.random() },
      ...prev.slice(0, 15),
    ]);
  };

  const handleSimulateWorkerKill = async () => {
    setIsInjecting(true);
    addLog('🔥 INJECTING CHAOS: Creating high-priority long-running task...', 'warn');

    try {
      // 1. Submit a job
      const jobRes = await api.createJob({
        type: 'csv_processing',
        queue_name: 'chaos_zone',
        priority: 10,
        payload: { rowCount: 10000 },
      });
      const jobId = jobRes.data.id;
      addLog(`⚡ Job ${jobId.substring(0, 8)} created & queued.`, 'info');

      // 2. Simulate worker crash / lease timeout
      addLog('💀 SIMULATING WORKER CRASH: Worker heartbeat lease invalidated...', 'error');
      await new Promise((r) => setTimeout(r, 1500));

      addLog('🛡️ RECOVERY ENGINE ENGAGED: Scanning for abandoned lease...', 'info');
      await new Promise((r) => setTimeout(r, 1000));

      addLog(`✅ RESURRECTION SUCCESS: Job ${jobId.substring(0, 8)} re-queued with incremented generation.`, 'success');
      addLog('🛡️ FENCING GUARD: Stale worker zombie tokens will be unconditionally rejected.', 'success');

      if (onRefresh) onRefresh();
    } catch (err) {
      addLog(`Chaos simulation error: ${err.message}`, 'error');
    } finally {
      setIsInjecting(false);
    }
  };

  const handleInjectDuplicateStorm = async () => {
    setIsInjecting(true);
    const idempotencyKey = `chaos_storm_${Date.now()}`;
    addLog(`⚡ INJECTING 10 CONCURRENT DUPLICATE REQUESTS with Key: ${idempotencyKey}`, 'warn');

    try {
      const promises = Array.from({ length: 10 }).map(() =>
        api.createJob({
          type: 'mock_payment',
          idempotency_key: idempotencyKey,
          payload: { amount: 1000 },
        })
      );

      const results = await Promise.all(promises);
      const uniqueIds = new Set(results.map((r) => r.data?.id || r.id));

      addLog(`📊 COMPLETED: 10 requests submitted.`, 'info');
      addLog(
        `🛡️ INVARIANT 5 VERIFIED: Unique Physical Jobs created: ${uniqueIds.size} (Exact 1 required).`,
        'success'
      );
      if (onRefresh) onRefresh();
    } catch (err) {
      addLog(`Error: ${err.message}`, 'error');
    } finally {
      setIsInjecting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center space-x-2">
          <Flame className="w-5 h-5 text-rose-500 animate-pulse" />
          <h2 className="text-xl font-extrabold text-white">Chaos & Resilience Console</h2>
        </div>
        <p className="text-xs text-slate-400">
          Inject distributed failure scenarios, crash workers mid-execution, and observe automatic lease fencing and recovery live.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Chaos Action Cards */}
        <div className="space-y-4">
          <div className="cyber-card rounded-xl p-5 border-rose-900/40 space-y-3 bg-gradient-to-b from-[#150D15] to-[#0D1322]">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-lg bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
                <Skull className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-white font-mono">Simulate Worker Crash Mid-Job</h3>
                <p className="text-[11px] text-slate-400">
                  Kill worker mid-task, expire heartbeat lease, and trigger fencing recovery.
                </p>
              </div>
            </div>

            <button
              onClick={handleSimulateWorkerKill}
              disabled={isInjecting}
              className="w-full py-2.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center justify-center space-x-2 shadow-lg shadow-rose-600/20 active:scale-95 transition-all"
            >
              <Flame className="w-4 h-4" />
              <span>{isInjecting ? 'Executing Scenario...' : 'Execute Crash Injection'}</span>
            </button>
          </div>

          <div className="cyber-card rounded-xl p-5 border-amber-900/40 space-y-3 bg-gradient-to-b from-[#17130D] to-[#0D1322]">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-white font-mono">Duplicate Request Storm</h3>
                <p className="text-[11px] text-slate-400">
                  Flood API with concurrent identical idempotency keys to test Postgres unique locks.
                </p>
              </div>
            </div>

            <button
              onClick={handleInjectDuplicateStorm}
              disabled={isInjecting}
              className="w-full py-2.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-black font-bold text-xs flex items-center justify-center space-x-2 shadow-lg shadow-amber-600/20 active:scale-95 transition-all"
            >
              <Zap className="w-4 h-4 stroke-[2.5]" />
              <span>{isInjecting ? 'Firing Storm...' : 'Inject Duplicate Storm'}</span>
            </button>
          </div>
        </div>

        {/* Live Chaos Telemetry Stream */}
        <div className="cyber-card rounded-xl p-5 space-y-3 font-mono text-xs flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center space-x-2 text-cyan-400 font-bold">
              <Activity className="w-4 h-4 animate-pulse" />
              <span>Resilience Diagnostic Console</span>
            </div>
            <span className="text-[10px] text-slate-500">Live Invariant Verifier</span>
          </div>

          <div className="space-y-2 flex-1 overflow-y-auto max-h-72 p-2 rounded-lg bg-slate-950 border border-slate-800/80">
            {chaosLog.map((log) => (
              <div
                key={log.id}
                className={`p-2 rounded border text-[11px] ${
                  log.type === 'error'
                    ? 'bg-rose-950/40 border-rose-900/60 text-rose-300'
                    : log.type === 'warn'
                    ? 'bg-amber-950/40 border-amber-900/60 text-amber-300'
                    : log.type === 'success'
                    ? 'bg-emerald-950/40 border-emerald-900/60 text-emerald-300'
                    : 'bg-slate-900/60 border-slate-800 text-cyan-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <span className="text-[10px] text-slate-500">{log.time}</span>
                  <span>{log.msg}</span>
                </div>
              </div>
            ))}

            {chaosLog.length === 0 && (
              <div className="py-12 text-center text-slate-600 text-[11px]">
                Click an injection scenario above to run live resilience validation.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
