import React, { useState } from 'react';
import { X, Zap, Terminal, Plus } from 'lucide-react';
import { api } from '../../services/api.js';

export function SubmitJobModal({ isOpen, onClose, onJobCreated }) {
  const [taskType, setTaskType] = useState('image_resize');
  const [queueName, setQueueName] = useState('default');
  const [priority, setPriority] = useState(5);
  const [idempotencyKey, setIdempotencyKey] = useState('');
  const [payloadJson, setPayloadJson] = useState('{\n  "width": 1024,\n  "height": 768,\n  "format": "png"\n}');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleTypeChange = (type) => {
    setTaskType(type);
    if (type === 'image_resize') {
      setPayloadJson('{\n  "width": 1024,\n  "height": 768,\n  "format": "png"\n}');
    } else if (type === 'csv_processing') {
      setPayloadJson('{\n  "rowCount": 5000,\n  "datasetName": "transactions_2026.csv"\n}');
    } else if (type === 'report_generation') {
      setPayloadJson('{\n  "reportType": "cluster_analytics",\n  "period": "24h"\n}');
    } else if (type === 'mock_payment') {
      setPayloadJson('{\n  "transactionId": "tx_cyber_01",\n  "amount": 250,\n  "currency": "USD"\n}');
    } else if (type === 'data_transform') {
      setPayloadJson('{\n  "mapping": "normalize",\n  "data": { "node": "alpha", "latency": 12 }\n}');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    let parsedPayload;
    try {
      parsedPayload = JSON.parse(payloadJson);
    } catch {
      setError('Invalid JSON payload syntax.');
      setIsSubmitting(false);
      return;
    }

    try {
      await api.createJob({
        type: taskType,
        queue_name: queueName,
        priority: Number(priority),
        idempotency_key: idempotencyKey || undefined,
        payload: parsedPayload,
      });

      if (onJobCreated) onJobCreated();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75  flex items-center justify-center p-4 animate-fade-in">
      <div className="w-full max-w-lg bg-[#0F1420] border border-[#202A3A] rounded-xl shadow-2xl overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="p-4 border-b border-[#202A3A] flex items-center justify-between bg-[#0B0F19]">
          <div className="flex items-center space-x-2.5">
            <div className="w-7 h-7 rounded-md bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Zap className="w-4 h-4" />
            </div>
            <h3 className="font-semibold text-sm text-[#F4F7FB] font-sans">Dispatch Background Task</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-[#98A4B7] hover:text-[#F4F7FB] hover:bg-[#151C2B] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs font-mono">
          {error && (
            <div className="p-2.5 rounded-lg bg-rose-950/40 border border-rose-800/50 text-rose-300 text-xs">
              {error}
            </div>
          )}

          <div className="space-y-1">
            <label className="text-[#98A4B7] block font-sans text-xs font-medium">Task Type (Allowlist Handler)</label>
            <select
              value={taskType}
              onChange={(e) => handleTypeChange(e.target.value)}
              className="w-full p-2 rounded-md bg-[#0B0F19] border border-[#202A3A] text-[#F4F7FB] focus:border-cyan-500/70 focus:outline-none transition-colors"
            >
              <option value="image_resize">image_resize (Image processing)</option>
              <option value="csv_processing">csv_processing (Data validation)</option>
              <option value="report_generation">report_generation (Summary stats)</option>
              <option value="mock_payment">mock_payment (Idempotent financial)</option>
              <option value="data_transform">data_transform (JSON manipulation)</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[#98A4B7] block font-sans text-xs font-medium">Queue Name</label>
              <input
                type="text"
                value={queueName}
                onChange={(e) => setQueueName(e.target.value)}
                className="w-full p-2 rounded-md bg-[#0B0F19] border border-[#202A3A] text-[#F4F7FB] focus:border-cyan-500/70 focus:outline-none transition-colors"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[#98A4B7] block font-sans text-xs font-medium">Priority (1 - 10)</label>
              <input
                type="number"
                min="1"
                max="10"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full p-2 rounded-md bg-[#0B0F19] border border-[#202A3A] text-cyan-400 font-bold focus:border-cyan-500/70 focus:outline-none transition-colors"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[#98A4B7] block font-sans text-xs font-medium">Idempotency Key (Optional)</label>
            <input
              type="text"
              placeholder="e.g. idempotency_req_12345"
              value={idempotencyKey}
              onChange={(e) => setIdempotencyKey(e.target.value)}
              className="w-full p-2 rounded-md bg-[#0B0F19] border border-[#202A3A] text-[#F4F7FB] placeholder-[#667085] focus:border-cyan-500/70 focus:outline-none transition-colors"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[#98A4B7] block font-sans text-xs font-medium">JSON Payload</label>
            <textarea
              rows="4"
              value={payloadJson}
              onChange={(e) => setPayloadJson(e.target.value)}
              className="w-full p-2.5 rounded-md bg-[#070A12] border border-[#202A3A] text-cyan-300 font-mono text-xs focus:border-cyan-500/70 focus:outline-none transition-colors"
            />
          </div>

          <div className="pt-2 border-t border-[#202A3A] flex items-center justify-end space-x-2.5 font-sans">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-md bg-[#151C2B] hover:bg-[#1B2436] text-[#98A4B7] hover:text-[#F4F7FB] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-3.5 py-1.5 rounded-md bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold flex items-center space-x-1.5 transition-colors disabled:opacity-50"
            >
              <Zap className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>{isSubmitting ? 'Enqueuing...' : 'Enqueue Task'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
