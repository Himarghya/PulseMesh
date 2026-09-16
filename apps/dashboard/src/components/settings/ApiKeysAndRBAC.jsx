import React, { useState, useEffect } from 'react';
import { Key, Shield, Plus, Trash2, Copy, Check, Lock } from 'lucide-react';
import { api } from '../../services/api.js';

export function ApiKeysAndRBAC({ tenant }) {
  const [apiKeys, setApiKeys] = useState([]);
  const [keyName, setKeyName] = useState('');
  const [newlyCreatedKey, setNewlyCreatedKey] = useState(null);
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadKeys();
  }, []);

  const loadKeys = async () => {
    try {
      const res = await api.getApiKeys();
      setApiKeys(res.data || []);
    } catch (err) {
      console.warn('Failed loading API keys:', err.message);
    }
  };

  const handleCreateKey = async (e) => {
    e.preventDefault();
    if (!keyName) return;
    setIsLoading(true);
    try {
      const res = await api.createApiKey({ name: keyName });
      setNewlyCreatedKey(res.data?.rawApiKey);
      setKeyName('');
      loadKeys();
    } catch (err) {
      alert(`Create failed: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRevoke = async (id) => {
    if (!confirm('Are you sure you want to revoke this API key?')) return;
    try {
      await api.revokeApiKey(id);
      loadKeys();
    } catch (err) {
      alert(`Revoke failed: ${err.message}`);
    }
  };

  const copyToClipboard = () => {
    if (!newlyCreatedKey) return;
    navigator.clipboard.writeText(newlyCreatedKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-xl font-extrabold text-white">API Keys & Access Control</h2>
        <p className="text-xs text-slate-400">
          Manage SHA-256 hashed API keys for SDK integration and review multi-tenant role-based permissions.
        </p>
      </div>

      {/* Newly Created Key Alert */}
      {newlyCreatedKey && (
        <div className="p-4 rounded-xl bg-cyan-950/50 border border-cyan-500/50 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-cyan-300 font-bold text-xs font-mono">
              ⚡ New API Key Generated (Copy now, it will not be displayed again):
            </span>
            <button
              onClick={copyToClipboard}
              className="px-3 py-1 rounded bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs font-mono flex items-center space-x-1"
            >
              {copied ? <Check className="w-3.5 h-3.5 stroke-[2.5]" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied!' : 'Copy Key'}</span>
            </button>
          </div>
          <p className="p-2.5 rounded bg-slate-950 font-mono text-xs text-cyan-200 select-all break-all border border-cyan-800/40">
            {newlyCreatedKey}
          </p>
        </div>
      )}

      {/* Create Key Card */}
      <div className="cyber-card rounded-xl p-5 space-y-4">
        <h3 className="font-mono text-sm font-bold text-white flex items-center space-x-2">
          <Key className="w-4 h-4 text-cyan-400" />
          <span>Generate API Key</span>
        </h3>

        <form onSubmit={handleCreateKey} className="flex gap-3 text-xs font-mono">
          <input
            type="text"
            placeholder="Key Name (e.g. Production Ingestion Service)"
            value={keyName}
            onChange={(e) => setKeyName(e.target.value)}
            className="flex-1 p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-200 focus:outline-none focus:border-cyan-500"
            required
          />
          <button
            type="submit"
            disabled={isLoading}
            className="px-4 py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-bold flex items-center space-x-1.5 transition-all"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>{isLoading ? 'Creating...' : 'Create Key'}</span>
          </button>
        </form>
      </div>

      {/* Keys Table */}
      <div className="cyber-card rounded-xl overflow-hidden">
        <div className="p-4 border-b border-slate-800 text-xs font-mono uppercase text-slate-400">
          Active API Keys ({apiKeys.length})
        </div>

        <table className="w-full text-left text-xs font-mono">
          <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400">
            <tr>
              <th className="py-3 px-4">Name</th>
              <th className="py-3 px-4">Key Prefix</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Created</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {apiKeys.map((k) => (
              <tr key={k.id} className="hover:bg-slate-900/40 transition-colors">
                <td className="py-3 px-4 text-white font-bold">{k.name}</td>
                <td className="py-3 px-4 text-cyan-400">{k.prefix}••••••••</td>
                <td className="py-3 px-4">
                  <span
                    className={`text-[10px] uppercase px-2 py-0.5 rounded border ${
                      k.revoked_at
                        ? 'bg-rose-950/80 text-rose-400 border-rose-800/50'
                        : 'bg-emerald-950/80 text-emerald-400 border-emerald-800/50'
                    }`}
                  >
                    {k.revoked_at ? 'Revoked' : 'Active'}
                  </span>
                </td>
                <td className="py-3 px-4 text-slate-500">{new Date(k.created_at).toLocaleDateString()}</td>
                <td className="py-3 px-4 text-right">
                  {!k.revoked_at && (
                    <button
                      onClick={() => handleRevoke(k.id)}
                      className="text-rose-400 hover:text-rose-300 p-1 rounded hover:bg-rose-950/30"
                      title="Revoke API Key"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </td>
              </tr>
            ))}

            {apiKeys.length === 0 && (
              <tr>
                <td colSpan="5" className="py-8 text-center text-slate-500">
                  No API keys generated yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
