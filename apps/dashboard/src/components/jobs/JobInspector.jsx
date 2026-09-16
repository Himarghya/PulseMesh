import React, { useState } from 'react';
import { Database, Search, Plus, RefreshCw, Eye, RotateCcw, XCircle, Zap, Check, AlertCircle } from 'lucide-react';
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#202A3A]">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-[#F4F7FB]">
            Job Inspector
          </h1>
          <p className="text-xs sm:text-sm text-[#98A4B7] mt-0.5">
            Durable task execution history, atomic generation attempts, and audit event logs.
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            onClick={() => setIsSubmitOpen(true)}
            className="px-3 py-1.5 rounded-md bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs flex items-center space-x-1.5 transition-colors"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Enqueue Job</span>
          </button>

          <button
            onClick={onRefresh}
            className="p-1.5 rounded-md bg-[#0F1420] border border-[#202A3A] text-[#98A4B7] hover:text-[#F4F7FB] transition-colors"
            title="Refresh Jobs"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="rounded-xl bg-[#0F1420] border border-[#202A3A] p-3.5 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 text-[#667085] absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search Job ID, type, or queue..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 rounded-md bg-[#0B0F19] border border-[#202A3A] text-xs text-[#F4F7FB] placeholder-[#667085] focus:outline-none focus:border-cyan-500/70 font-mono transition-colors"
          />
        </div>

        <div className="flex items-center space-x-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {['ALL', 'queued', 'running', 'succeeded', 'failed', 'retry_wait', 'dead_letter'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-mono uppercase transition-colors whitespace-nowrap ${
                statusFilter === st
                  ? 'bg-[#151C2B] text-cyan-400 font-medium border border-[#283448]'
                  : 'text-[#667085] hover:text-[#98A4B7] hover:bg-[#121827] border border-transparent'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Jobs Table */}
      <div className="rounded-xl bg-[#0F1420] border border-[#202A3A] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-[#0B0F19]/80 border-b border-[#202A3A] text-[#667085] text-[10px] uppercase tracking-wider">
              <tr>
                <th className="py-2.5 px-4 font-medium">Status</th>
                <th className="py-2.5 px-4 font-medium">Job ID</th>
                <th className="py-2.5 px-4 font-medium">Type</th>
                <th className="py-2.5 px-4 font-medium">Queue</th>
                <th className="py-2.5 px-4 font-medium">Priority</th>
                <th className="py-2.5 px-4 font-medium">Attempts</th>
                <th className="py-2.5 px-4 font-medium">Created</th>
                <th className="py-2.5 px-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#18202E]/80">
              {filteredJobs.map((job) => (
                <tr key={job.id} className="hover:bg-[#151C2B]/50 transition-colors group">
                  <td className="py-2.5 px-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center space-x-1 text-[10px] font-semibold uppercase px-2 py-0.5 rounded border ${
                        job.status === 'succeeded'
                          ? 'bg-emerald-950/40 text-emerald-400 border-emerald-800/50'
                          : job.status === 'running'
                          ? 'bg-cyan-950/40 text-cyan-300 border-cyan-800/50 animate-pulse'
                          : job.status === 'failed' || job.status === 'dead_letter'
                          ? 'bg-rose-950/40 text-rose-400 border-rose-800/50'
                          : 'bg-amber-950/40 text-amber-400 border-amber-800/50'
                      }`}
                    >
                      <span>{job.status}</span>
                    </span>
                  </td>
                  <td className="py-2.5 px-4 text-[#F4F7FB] font-medium">{job.id.substring(0, 8)}...</td>
                  <td className="py-2.5 px-4 text-cyan-400">{job.type}</td>
                  <td className="py-2.5 px-4 text-[#98A4B7]">{job.queue_name}</td>
                  <td className="py-2.5 px-4">
                    <span className="font-semibold text-amber-300">P{job.priority || 5}</span>
                  </td>
                  <td className="py-2.5 px-4 text-[#98A4B7]">
                    {job.attempt_number} / {job.max_attempts}
                  </td>
                  <td className="py-2.5 px-4 text-[#667085]">
                    {new Date(job.created_at).toLocaleTimeString()}
                  </td>
                  <td className="py-2.5 px-4 text-right">
                    <button
                      onClick={() => setSelectedJob(job)}
                      className="px-2.5 py-1 rounded bg-[#151C2B] hover:bg-[#1B2436] text-[#98A4B7] hover:text-[#F4F7FB] text-[11px] font-sans inline-flex items-center space-x-1 border border-[#202A3A] transition-colors"
                    >
                      <Eye className="w-3 h-3" />
                      <span>Inspect</span>
                    </button>
                  </td>
                </tr>
              ))}

              {filteredJobs.length === 0 && (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-[#667085]">
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
