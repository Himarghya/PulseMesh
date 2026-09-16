import React, { useState } from 'react';
import { Database, Search, Filter, Plus, RefreshCw, Eye, RotateCcw, XCircle, Zap } from 'lucide-react';
import { JobDetailModal } from './JobDetailModal.jsx';
import { SubmitJobModal } from './SubmitJobModal.jsx';
import { api } from '../../services/api.js';

export function JobInspector({ jobs = [], onRefresh }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedJob, setSelectedJob] = useState(null);
  const [isSubmitOpen, setIsSubmitOpen] = useState(false);

  const filteredJobs = jobs.filter((j) => {
    const matchesSearch =
      j.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      j.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      j.queue_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || j.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-white">Job Inspector</h2>
          <p className="text-xs text-slate-400">
            Durable task history, atomic execution attempts, and audit event logs.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setIsSubmitOpen(true)}
            className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs flex items-center space-x-1.5 shadow-lg shadow-cyan-500/20 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Enqueue Job</span>
          </button>

          <button
            onClick={onRefresh}
            className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-cyan-400"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="cyber-card rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search by Job ID, Type, or Queue..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
          />
        </div>

        <div className="flex items-center space-x-2 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {['ALL', 'queued', 'running', 'succeeded', 'failed', 'retry_wait', 'dead_letter'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono uppercase transition-all whitespace-nowrap ${
                statusFilter === st
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Jobs Table */}
      <div className="cyber-card rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Job ID</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Queue</th>
                <th className="py-3 px-4">Priority</th>
                <th className="py-3 px-4">Attempts</th>
                <th className="py-3 px-4">Created</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredJobs.map((job) => (
                <tr key={job.id} className="hover:bg-slate-900/40 transition-colors group">
                  <td className="py-3 px-4">
                    <span
                      className={`inline-flex items-center text-[10px] uppercase px-2 py-0.5 rounded border ${
                        job.status === 'succeeded'
                          ? 'bg-emerald-950/80 text-emerald-400 border-emerald-800/50'
                          : job.status === 'running'
                          ? 'bg-cyan-950/80 text-cyan-400 border-cyan-800/50 animate-pulse'
                          : job.status === 'failed' || job.status === 'dead_letter'
                          ? 'bg-rose-950/80 text-rose-400 border-rose-800/50'
                          : 'bg-amber-950/80 text-amber-400 border-amber-800/50'
                      }`}
                    >
                      {job.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-300 font-bold">{job.id.substring(0, 8)}...</td>
                  <td className="py-3 px-4 text-cyan-300">{job.type}</td>
                  <td className="py-3 px-4 text-slate-400">{job.queue_name}</td>
                  <td className="py-3 px-4">
                    <span className="font-bold text-cyan-400">P{job.priority}</span>
                  </td>
                  <td className="py-3 px-4 text-slate-400">
                    {job.attempt_number} / {job.max_attempts}
                  </td>
                  <td className="py-3 px-4 text-slate-500">
                    {new Date(job.created_at).toLocaleTimeString()}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => setSelectedJob(job)}
                      className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-sans inline-flex items-center space-x-1"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Inspect</span>
                    </button>
                  </td>
                </tr>
              ))}

              {filteredJobs.length === 0 && (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-slate-500">
                    No matching jobs found in state storage.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedJob && (
        <JobDetailModal
          job={selectedJob}
          onClose={() => setSelectedJob(null)}
          onJobUpdated={onRefresh}
        />
      )}

      {isSubmitOpen && (
        <SubmitJobModal
          isOpen={isSubmitOpen}
          onClose={() => setIsSubmitOpen(false)}
          onJobCreated={onRefresh}
        />
      )}
    </div>
  );
}
