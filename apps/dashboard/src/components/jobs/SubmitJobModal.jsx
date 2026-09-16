import React, { useState } from 'react';
import { X, Zap, Terminal } from 'lucide-react';
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
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="cyber-card rounded-2xl w-full max-w-lg border-slate-700 overflow-hidden shadow-2xl">
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-[#0A0E1A]">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Zap className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-sm text-white">Dispatch New Background Job</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {error && (
            <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-800 text-rose-300 font-mono">
              {error}
            </div>
          )}

          <div className="space-y-1">
            <label className="text-slate-400 font-mono">Task Type (Allowlist Handler)</label>
            <select
              value={taskType}
              onChange={(e) => handleTypeChange(e.target.value)}
              className="w-full p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-200 font-mono focus:border-cyan-500 focus:outline-none"
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
              <label className="text-slate-400 font-mono">Queue Name</label>
              <input
                type="text"
                value={queueName}
                onChange={(e) => setQueueName(e.target.value)}
                className="w-full p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-200 font-mono focus:border-cyan-500 focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-slate-400 font-mono">Priority (1 - 10)</label>
              <input
                type="number"
                min="1"
                max="10"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-cyan-400 font-mono focus:border-cyan-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-slate-400 font-mono">Idempotency Key (Optional)</label>
            <input
              type="text"
              placeholder="e.g. idempotency_req_12345"
              value={idempotencyKey}
              onChange={(e) => setIdempotencyKey(e.target.value)}
              className="w-full p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-200 font-mono focus:border-cyan-500 focus:outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="text-slate-400 font-mono">JSON Payload</label>
            <textarea
              rows="5"
              value={payloadJson}
              onChange={(e) => setPayloadJson(e.target.value)}
              className="w-full p-3 rounded-lg bg-slate-950 border border-slate-800 text-cyan-300 font-mono focus:border-cyan-500 focus:outline-none"
            />
          </div>

          <div className="pt-2 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-bold flex items-center space-x-2 transition-all active:scale-95"
            >
              <Zap className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>{isSubmitting ? 'Enqueuing...' : 'Enqueue Job'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
