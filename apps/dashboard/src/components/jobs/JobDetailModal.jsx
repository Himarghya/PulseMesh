import React, { useState, useEffect } from 'react';
import { X, Clock, Terminal, Activity, RotateCcw, ShieldCheck, CheckCircle2, AlertTriangle } from 'lucide-react';
import { api } from '../../services/api.js';

export function JobDetailModal({ job, onClose, onJobUpdated }) {
  const [attempts, setAttempts] = useState([]);
  const [events, setEvents] = useState([]);
  const [activeTab, setActiveTab] = useState('payload');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!job) return;
    async function loadTelemetry() {
      try {
        const [attRes, evRes] = await Promise.all([
          api.getJobAttempts(job.id),
          api.getJobEvents(job.id),
        ]);
        setAttempts(attRes.data || []);
        setEvents(evRes.data || []);
      } catch (err) {
        console.warn('Failed loading attempts/events:', err.message);
      }
    }
    loadTelemetry();
  }, [job]);

  if (!job) return null;

  const handleRetry = async () => {
    setIsLoading(true);
    try {
      await api.retryJob(job.id);
      if (onJobUpdated) onJobUpdated();
      onClose();
    } catch (err) {
      alert(`Retry failed: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = async () => {
    setIsLoading(true);
    try {
      await api.cancelJob(job.id);
      if (onJobUpdated) onJobUpdated();
      onClose();
    } catch (err) {
      alert(`Cancel failed: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="cyber-card rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col border-slate-700 overflow-hidden shadow-2xl">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-[#0A0E1A]">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-mono font-bold text-base text-white">{job.type}</span>
                <span
                  className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded border ${
                    job.status === 'succeeded'
                      ? 'bg-emerald-950/80 text-emerald-400 border-emerald-800/50'
                      : job.status === 'running'
                      ? 'bg-cyan-950/80 text-cyan-400 border-cyan-800/50'
                      : job.status === 'failed' || job.status === 'dead_letter'
                      ? 'bg-rose-950/80 text-rose-400 border-rose-800/50'
                      : 'bg-amber-950/80 text-amber-400 border-amber-800/50'
                  }`}
                >
                  {job.status}
                </span>
              </div>
              <p className="text-[11px] font-mono text-slate-500 mt-0.5">ID: {job.id}</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {(job.status === 'failed' || job.status === 'dead_letter') && (
              <button
                onClick={handleRetry}
                disabled={isLoading}
                className="px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs flex items-center space-x-1 transition-all"
              >
                <RotateCcw className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Re-Drive Job</span>
              </button>
            )}

            {job.status === 'running' && (
              <button
                onClick={handleCancel}
                disabled={isLoading}
                className="px-3 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 border border-rose-500/40 text-xs font-semibold flex items-center space-x-1 transition-all"
              >
                <X className="w-3.5 h-3.5" />
                <span>Cancel Task</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center space-x-4 px-6 border-b border-slate-800/80 bg-slate-950/40 text-xs">
          {[
            { id: 'payload', label: 'Payload & Result' },
            { id: 'timeline', label: `Event Stream (${events.length})` },
            { id: 'attempts', label: `Attempts (${attempts.length})` },
            { id: 'lease', label: 'Lease & Fencing' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-3 font-mono border-b-2 transition-all ${
                activeTab === tab.id
                  ? 'border-cyan-400 text-cyan-400 font-bold'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1 font-mono text-xs">
          {activeTab === 'payload' && (
            <div className="space-y-4">
              <div>
                <span className="text-slate-500 text-[11px] block mb-1 uppercase tracking-wider">
                  Input Payload (JSON)
                </span>
                <pre className="p-3.5 rounded-lg bg-slate-950 border border-slate-800/80 text-cyan-300 overflow-x-auto">
                  {JSON.stringify(job.payload, null, 2)}
                </pre>
              </div>

              {job.result && (
                <div>
                  <span className="text-emerald-400 text-[11px] block mb-1 uppercase tracking-wider">
                    Execution Result
                  </span>
                  <pre className="p-3.5 rounded-lg bg-emerald-950/20 border border-emerald-900/50 text-emerald-300 overflow-x-auto">
                    {JSON.stringify(job.result, null, 2)}
                  </pre>
                </div>
              )}

              {job.error && (
                <div>
                  <span className="text-rose-400 text-[11px] block mb-1 uppercase tracking-wider">
                    Error Diagnostic Log
                  </span>
                  <pre className="p-3.5 rounded-lg bg-rose-950/20 border border-rose-900/50 text-rose-300 overflow-x-auto">
                    {JSON.stringify(job.error, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}

          {activeTab === 'timeline' && (
            <div className="space-y-3">
              {events.map((ev, idx) => (
                <div
                  key={ev.id || idx}
                  className="p-3 rounded-lg bg-slate-900/70 border border-slate-800 flex items-start justify-between"
                >
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
                      <span className="text-cyan-300 font-bold">{ev.type}</span>
                      <span className="text-[10px] text-slate-500">Attempt #{ev.attempt}</span>
                    </div>
                    {ev.metadata && Object.keys(ev.metadata).length > 0 && (
                      <pre className="text-[10px] text-slate-400 mt-1">
                        {JSON.stringify(ev.metadata, null, 2)}
                      </pre>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-500 whitespace-nowrap">
                    {new Date(ev.created_at).toLocaleTimeString()}
                  </span>
                </div>
              ))}
              {events.length === 0 && (
                <div className="py-8 text-center text-slate-500">No events logged for this job.</div>
              )}
            </div>
          )}

          {activeTab === 'attempts' && (
            <div className="space-y-3">
              {attempts.map((att) => (
                <div
                  key={att.id}
                  className="p-3.5 rounded-lg bg-slate-900/80 border border-slate-800 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-slate-200 font-bold">Attempt #{att.attempt_number}</span>
                    <span
                      className={`text-[10px] uppercase px-2 py-0.5 rounded border ${
                        att.status === 'succeeded'
                          ? 'bg-emerald-950/80 text-emerald-400 border-emerald-800/50'
                          : 'bg-rose-950/80 text-rose-400 border-rose-800/50'
                      }`}
                    >
                      {att.status}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Started: {new Date(att.started_at).toLocaleTimeString()}
                    {att.finished_at && ` • Finished: ${new Date(att.finished_at).toLocaleTimeString()}`}
                  </div>
                  {att.error_details && (
                    <pre className="p-2 rounded bg-rose-950/30 text-rose-300 text-[10px]">
                      {JSON.stringify(att.error_details, null, 2)}
                    </pre>
                  )}
                </div>
              ))}
            </div>
          )}

          {activeTab === 'lease' && (
            <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 space-y-3">
              <div className="flex items-center space-x-2 text-cyan-400 font-bold">
                <ShieldCheck className="w-4 h-4" />
                <span>Distributed Fencing Context</span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-[11px] pt-2">
                <div>
                  <span className="text-slate-500 block">Current Lease Token:</span>
                  <span className="text-slate-200">{job.lease_token || 'None (Unassigned)'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Leased Until:</span>
                  <span className="text-slate-200">
                    {job.leased_until ? new Date(job.leased_until).toLocaleTimeString() : 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Execution Generation:</span>
                  <span className="text-cyan-400 font-bold">{job.execution_generation || 0}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Durable Version:</span>
                  <span className="text-cyan-400 font-bold">{job.version || 1}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
