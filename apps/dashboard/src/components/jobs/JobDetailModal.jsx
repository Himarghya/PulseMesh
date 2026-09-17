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
    <div className="fixed inset-0 z-50 bg-black/75  flex items-center justify-center p-4 animate-fade-in">
      <div className="w-full max-w-3xl max-h-[85vh] flex flex-col bg-[#0F1420] border border-[#202A3A] rounded-xl overflow-hidden shadow-2xl">
        {/* Modal Header */}
        <div className="p-4 border-b border-[#202A3A] flex items-center justify-between bg-[#0B0F19]">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-md bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Terminal className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-mono font-bold text-sm text-[#F4F7FB]">{job.type}</span>
                <span
                  className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded border ${
                    job.status === 'succeeded'
                      ? 'bg-emerald-950/40 text-emerald-400 border-emerald-800/50'
                      : job.status === 'running'
                      ? 'bg-cyan-950/40 text-cyan-400 border-cyan-800/50'
                      : job.status === 'failed' || job.status === 'dead_letter'
                      ? 'bg-rose-950/40 text-rose-400 border-rose-800/50'
                      : 'bg-amber-950/40 text-amber-400 border-amber-800/50'
                  }`}
                >
                  {job.status}
                </span>
              </div>
              <p className="text-[11px] font-mono text-[#667085] mt-0.5">ID: {job.id}</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {(job.status === 'failed' || job.status === 'dead_letter') && (
              <button
                onClick={handleRetry}
                disabled={isLoading}
                className="px-3 py-1.5 rounded-md bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs flex items-center space-x-1 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Re-Drive Job</span>
              </button>
            )}

            {job.status === 'running' && (
              <button
                onClick={handleCancel}
                disabled={isLoading}
                className="px-3 py-1.5 rounded-md bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-semibold flex items-center space-x-1 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
                <span>Cancel Task</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-1.5 rounded-md bg-[#151C2B] text-[#98A4B7] hover:text-[#F4F7FB] border border-[#202A3A] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center space-x-4 px-5 border-b border-[#202A3A] bg-[#0B0F19]/40 text-xs">
          {[
            { id: 'payload', label: 'Payload & Result' },
            { id: 'timeline', label: `Event Stream (${events.length})` },
            { id: 'attempts', label: `Attempts (${attempts.length})` },
            { id: 'lease', label: 'Lease & Fencing' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-2.5 font-mono border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-cyan-400 text-cyan-400 font-semibold'
                  : 'border-transparent text-[#667085] hover:text-[#98A4B7]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1 font-mono text-xs">
          {activeTab === 'payload' && (
            <div className="space-y-4">
              <div>
                <span className="text-[#667085] text-[10px] uppercase font-medium block mb-1">
                  Input Payload (JSON)
                </span>
                <pre className="p-3 rounded-lg bg-[#070A12] border border-[#202A3A] text-cyan-300 overflow-x-auto">
                  {JSON.stringify(job.payload, null, 2)}
                </pre>
              </div>

              {job.result && (
                <div>
                  <span className="text-emerald-400 text-[10px] uppercase font-medium block mb-1">
                    Execution Result
                  </span>
                  <pre className="p-3 rounded-lg bg-emerald-950/20 border border-emerald-900/40 text-emerald-300 overflow-x-auto">
                    {JSON.stringify(job.result, null, 2)}
                  </pre>
                </div>
              )}

              {job.error && (
                <div>
                  <span className="text-rose-400 text-[10px] uppercase font-medium block mb-1">
                    Error Diagnostic Log
                  </span>
                  <pre className="p-3 rounded-lg bg-rose-950/20 border border-rose-900/40 text-rose-300 overflow-x-auto">
                    {JSON.stringify(job.error, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}

          {activeTab === 'timeline' && (
            <div className="space-y-2.5">
              {events.map((ev, idx) => (
                <div
                  key={ev.id || idx}
                  className="p-3 rounded-lg bg-[#0B0F19] border border-[#202A3A] flex items-start justify-between"
                >
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
                      <span className="text-cyan-300 font-semibold">{ev.type}</span>
                      <span className="text-[10px] text-[#667085]">Attempt #{ev.attempt}</span>
                    </div>
                    {ev.metadata && Object.keys(ev.metadata).length > 0 && (
                      <pre className="text-[10px] text-[#98A4B7] mt-1">
                        {JSON.stringify(ev.metadata, null, 2)}
                      </pre>
                    )}
                  </div>
                  <span className="text-[10px] text-[#667085] whitespace-nowrap">
                    {new Date(ev.created_at).toLocaleTimeString()}
                  </span>
                </div>
              ))}
              {events.length === 0 && (
                <div className="py-8 text-center text-[#667085]">No events logged for this job.</div>
              )}
            </div>
          )}

          {activeTab === 'attempts' && (
            <div className="space-y-2.5">
              {attempts.map((att) => (
                <div
                  key={att.id}
                  className="p-3 rounded-lg bg-[#0B0F19] border border-[#202A3A] space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[#F4F7FB] font-semibold">Attempt #{att.attempt_number}</span>
                    <span
                      className={`text-[10px] uppercase px-2 py-0.5 rounded border ${
                        att.status === 'succeeded'
                          ? 'bg-emerald-950/40 text-emerald-400 border-emerald-800/50'
                          : 'bg-rose-950/40 text-rose-400 border-rose-800/50'
                      }`}
                    >
                      {att.status}
                    </span>
                  </div>
                  <div className="text-[11px] text-[#98A4B7]">
                    Started: {new Date(att.started_at).toLocaleTimeString()}
                    {att.finished_at && ` • Finished: ${new Date(att.finished_at).toLocaleTimeString()}`}
                  </div>
                  {att.error_details && (
                    <pre className="p-2 rounded bg-rose-950/20 text-rose-300 text-[10px] border border-rose-900/30">
                      {JSON.stringify(att.error_details, null, 2)}
                    </pre>
                  )}
                </div>
              ))}
            </div>
          )}

          {activeTab === 'lease' && (
            <div className="p-4 rounded-lg bg-[#0B0F19] border border-[#202A3A] space-y-3">
              <div className="flex items-center space-x-2 text-cyan-400 font-semibold">
                <ShieldCheck className="w-4 h-4" />
                <span>Distributed Fencing Context</span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-[11px] pt-1">
                <div>
                  <span className="text-[#667085] block">Current Lease Token:</span>
                  <span className="text-[#F4F7FB] font-mono">{job.lease_token || 'None (Unassigned)'}</span>
                </div>
                <div>
                  <span className="text-[#667085] block">Leased Until:</span>
                  <span className="text-[#F4F7FB]">
                    {job.leased_until ? new Date(job.leased_until).toLocaleTimeString() : 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="text-[#667085] block">Execution Generation:</span>
                  <span className="text-cyan-400 font-bold">{job.execution_generation || 0}</span>
                </div>
                <div>
                  <span className="text-[#667085] block">Durable Version:</span>
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
