import React, { useState, useEffect } from 'react';
import {
  Key,
  Shield,
  Plus,
  Trash2,
  Copy,
  Check,
  Lock,
  ShieldCheck,
  ShieldAlert,
  Code2,
  FileCode,
  Terminal,
  CheckCircle2,
  XCircle,
  Users,
  Eye,
  AlertTriangle,
  Fingerprint,
  RefreshCw,
} from 'lucide-react';
import { api } from '../../services/api.js';

export function ApiKeysAndRBAC({ tenant }) {
  const [apiKeys, setApiKeys] = useState([]);
  const [keyName, setKeyName] = useState('');
  const [selectedRole, setSelectedRole] = useState('OPERATOR');
  const [selectedExpiry, setSelectedExpiry] = useState('never');
  const [newlyCreatedKey, setNewlyCreatedKey] = useState(null);
  const [copied, setCopied] = useState(false);
  const [copiedSnippet, setCopiedSnippet] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeSnippetTab, setActiveSnippetTab] = useState('curl'); // 'curl' | 'node' | 'python'

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
      const res = await api.createApiKey({ name: keyName, role: selectedRole });
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
    if (!confirm('Are you sure you want to revoke this API key? This action is permanent.')) return;
    try {
      await api.revokeApiKey(id);
      loadKeys();
    } catch (err) {
      alert(`Revoke failed: ${err.message}`);
    }
  };

  const copyToClipboard = (text, type = 'key') => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    if (type === 'key') {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } else {
      setCopiedSnippet(true);
      setTimeout(() => setCopiedSnippet(false), 2000);
    }
  };

  const rbacMatrix = [
    {
      role: 'Cluster Admin',
      badge: 'ADMIN',
      badgeColor: 'text-rose-400 bg-rose-500/10 border-rose-500/30',
      description: 'Unrestricted cluster-wide orchestration, key provisioning, & chaos vectors.',
      permissions: {
        'jobs:read_write': true,
        'workflows:deploy': true,
        'workers:drain': true,
        'chaos:inject': true,
        'keys:manage': true,
        'schedules:manage': true,
      },
    },
    {
      role: 'Pipeline Operator',
      badge: 'OPERATOR',
      badgeColor: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
      description: 'Submit jobs, trigger DAG workflows, manage queues & retry failed tasks.',
      permissions: {
        'jobs:read_write': true,
        'workflows:deploy': true,
        'workers:drain': false,
        'chaos:inject': false,
        'keys:manage': false,
        'schedules:manage': true,
      },
    },
    {
      role: 'Worker Daemon',
      badge: 'WORKER',
      badgeColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
      description: 'Atomic job claiming (FOR UPDATE SKIP LOCKED), heartbeat renewal & completion.',
      permissions: {
        'jobs:read_write': true,
        'workflows:deploy': false,
        'workers:drain': false,
        'chaos:inject': false,
        'keys:manage': false,
        'schedules:manage': false,
      },
    },
    {
      role: 'Telemetry Auditor',
      badge: 'VIEWER',
      badgeColor: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
      description: 'Read-only access to live SSE metrics, execution timelines & audit logs.',
      permissions: {
        'jobs:read_write': false,
        'workflows:deploy': false,
        'workers:drain': false,
        'chaos:inject': false,
        'keys:manage': false,
        'schedules:manage': false,
      },
    },
  ];

  const codeSnippets = {
    curl: `curl -X POST http://localhost:3000/api/v1/jobs \\
  -H "X-API-Key: ${newlyCreatedKey || 'pm_live_9f83a2e7c10b48'}" \\
  -H "Content-Type: application/json" \\
  -d '{"type": "data_sync", "priority": 10, "payload": {"dataset": "analytics"}}'`,
    node: `import { PulseMesh } from '@pulsemesh/sdk';

const client = new PulseMesh({
  apiKey: '${newlyCreatedKey || 'pm_live_9f83a2e7c10b48'}',
  endpoint: 'http://localhost:3000/api/v1'
});

const job = await client.jobs.create({
  type: 'image_resize',
  priority: 5,
  payload: { url: 'https://cdn.example.com/asset.png' }
});
console.log('Dispatched Job:', job.id);`,
    python: `import requests

API_KEY = "${newlyCreatedKey || 'pm_live_9f83a2e7c10b48'}"
res = requests.post(
    "http://localhost:3000/api/v1/jobs",
    headers={"X-API-Key": API_KEY, "Content-Type": "application/json"},
    json={"type": "ml_inference", "priority": 8, "payload": {"model": "vision-v2"}}
)
print("Response:", res.json())`,
  };

  const activeKeysCount = apiKeys.filter((k) => !k.revoked_at).length;

  return (
    <div className="space-y-6">
      {/* Top Banner & Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-[#0d1624] to-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-full bg-cyan-500/5 blur-3xl pointer-events-none" />

        <div className="space-y-1 z-10">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-lg shadow-cyan-950/40">
              <Key className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-xl font-extrabold text-white font-mono tracking-tight">
                  API Security & Access Control
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
                  ZERO-TRUST RBAC
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Manage cryptographically hashed API keys for SDK integration and review multi-tenant role-based permissions.
              </p>
            </div>
          </div>
        </div>

        {/* Global Security Metrics */}
        <div className="flex items-center gap-3 z-10 flex-wrap">
          <div className="flex items-center space-x-2 px-3 py-2 rounded-xl bg-slate-950/80 border border-slate-800">
            <Key className="w-4 h-4 text-cyan-400" />
            <div>
              <div className="text-[10px] text-slate-500 uppercase font-mono">Active API Keys</div>
              <div className="text-xs font-bold text-cyan-300 font-mono">{activeKeysCount} Tokens</div>
            </div>
          </div>

          <div className="flex items-center space-x-2 px-3 py-2 rounded-xl bg-slate-950/80 border border-slate-800">
            <Fingerprint className="w-4 h-4 text-emerald-400" />
            <div>
              <div className="text-[10px] text-slate-500 uppercase font-mono">Hash Algorithm</div>
              <div className="text-xs font-bold text-emerald-300 font-mono">SHA-256 + Salt</div>
            </div>
          </div>

          <div className="flex items-center space-x-2 px-3 py-2 rounded-xl bg-slate-950/80 border border-slate-800">
            <ShieldCheck className="w-4 h-4 text-purple-400" />
            <div>
              <div className="text-[10px] text-slate-500 uppercase font-mono">Active Tenant</div>
              <div className="text-xs font-bold text-purple-300 font-mono">
                {tenant?.id || 'tenant-dev-primary'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Newly Created Key Flash Alert */}
      {newlyCreatedKey && (
        <div className="p-4 rounded-xl bg-gradient-to-r from-cyan-950/80 via-slate-900 to-cyan-950/80 border border-cyan-500/50 space-y-2 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-cyan-300 font-bold text-xs font-mono">
              <Key className="w-4 h-4 animate-bounce" />
              <span>⚡ New API Key Generated — Copy immediately (key is never shown again in plaintext):</span>
            </div>
            <button
              onClick={() => copyToClipboard(newlyCreatedKey, 'key')}
              className="px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs font-mono flex items-center space-x-1.5 shadow-md shadow-cyan-500/20 active:scale-95 transition-all"
            >
              {copied ? <Check className="w-3.5 h-3.5 stroke-[2.5]" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied to Clipboard!' : 'Copy API Key'}</span>
            </button>
          </div>
          <div className="p-3 rounded-lg bg-slate-950 font-mono text-xs text-cyan-200 select-all break-all border border-cyan-800/40 flex items-center justify-between">
            <span>{newlyCreatedKey}</span>
            <span className="text-[10px] text-slate-500 uppercase ml-2 shrink-0">Raw Token</span>
          </div>
        </div>
      )}

      {/* Main Dual-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Key Generator, Key List & SDK Snippets (7 Columns) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Create Key Card */}
          <div className="cyber-card rounded-xl p-5 space-y-4 bg-gradient-to-b from-[#0d1424] to-[#070b14] border-slate-800">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <h3 className="font-mono text-sm font-bold text-white flex items-center space-x-2">
                <Key className="w-4 h-4 text-cyan-400" />
                <span>Provision Integration API Key</span>
              </h3>
              <span className="text-[10px] font-mono text-slate-500">Bearer & Header Auth</span>
            </div>

            <form onSubmit={handleCreateKey} className="space-y-3.5 text-xs font-mono">
              <div>
                <label className="text-[11px] text-slate-400 block mb-1.5 font-bold">Key Description / Client Name</label>
                <input
                  type="text"
                  placeholder="e.g. Ingestion Pipeline / Production SDK Worker"
                  value={keyName}
                  onChange={(e) => setKeyName(e.target.value)}
                  className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500 transition-colors"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1.5 font-bold">RBAC Permission Role</label>
                  <select
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value)}
                    className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-cyan-300 focus:outline-none focus:border-cyan-500 font-mono transition-colors"
                  >
                    <option value="ADMIN">Cluster Admin (Full Control)</option>
                    <option value="OPERATOR">Pipeline Operator (Jobs & DAGs)</option>
                    <option value="WORKER">Worker Daemon (Claim & Lease)</option>
                    <option value="VIEWER">Telemetry Auditor (Read Only)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] text-slate-400 block mb-1.5 font-bold">Expiration Window</label>
                  <select
                    value={selectedExpiry}
                    onChange={(e) => setSelectedExpiry(e.target.value)}
                    className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 focus:outline-none focus:border-cyan-500 font-mono transition-colors"
                  >
                    <option value="never">Never Expires</option>
                    <option value="30d">30 Days (Recommended)</option>
                    <option value="90d">90 Days</option>
                    <option value="365d">1 Year</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-bold flex items-center justify-center space-x-2 shadow-lg shadow-cyan-500/20 active:scale-95 transition-all disabled:opacity-50"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>{isLoading ? 'Generating SHA-256 Key...' : 'Generate New API Key'}</span>
              </button>
            </form>
          </div>

          {/* Keys Table */}
          <div className="cyber-card rounded-xl overflow-hidden border-slate-800 bg-slate-950">
            <div className="p-4 border-b border-slate-800/80 flex items-center justify-between text-xs font-mono">
              <span className="uppercase text-slate-300 font-bold flex items-center space-x-2">
                <Lock className="w-4 h-4 text-cyan-400" />
                <span>Provisioned API Keys ({apiKeys.length})</span>
              </span>
              <span className="text-[10px] text-slate-500">Live Workspace Token Vault</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-900/80 border-b border-slate-800 text-slate-400 text-[10px] uppercase">
                  <tr>
                    <th className="py-2.5 px-4">Key Name</th>
                    <th className="py-2.5 px-4">Prefix</th>
                    <th className="py-2.5 px-4">Role</th>
                    <th className="py-2.5 px-4">Status</th>
                    <th className="py-2.5 px-4">Created</th>
                    <th className="py-2.5 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {apiKeys.map((k) => (
                    <tr key={k.id} className="hover:bg-slate-900/40 transition-colors">
                      <td className="py-3 px-4 text-white font-bold text-[11px]">{k.name}</td>
                      <td className="py-3 px-4 text-cyan-400 text-[11px]">
                        <code>{k.prefix || 'pm_live_'}••••••••</code>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-[10px] px-1.5 py-0.5 rounded font-mono font-bold bg-slate-800 text-slate-300 border border-slate-700">
                          {k.role || 'OPERATOR'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`text-[10px] uppercase px-2 py-0.5 rounded border font-bold ${
                            k.revoked_at
                              ? 'bg-rose-950/80 text-rose-400 border-rose-800/50'
                              : 'bg-emerald-950/80 text-emerald-400 border-emerald-800/50'
                          }`}
                        >
                          {k.revoked_at ? 'Revoked' : 'Active'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-500 text-[11px]">
                        {k.created_at ? new Date(k.created_at).toLocaleDateString() : 'Today'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {!k.revoked_at ? (
                          <button
                            onClick={() => handleRevoke(k.id)}
                            className="text-rose-400 hover:text-rose-300 p-1.5 rounded hover:bg-rose-950/40 transition-all"
                            title="Revoke Key Permanently"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        ) : (
                          <span className="text-[10px] text-slate-600">Archived</span>
                        )}
                      </td>
                    </tr>
                  ))}

                  {apiKeys.length === 0 && (
                    <tr>
                      <td colSpan="6" className="py-8 text-center text-slate-500 text-xs">
                        No API keys generated yet. Use the form above to generate an SDK key.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Quick SDK Integration Snippets */}
          <div className="cyber-card rounded-xl p-5 space-y-3 font-mono text-xs bg-slate-950 border border-slate-800">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2 text-white font-bold">
                <Code2 className="w-4 h-4 text-cyan-400" />
                <span>Quick SDK Authentication Examples</span>
              </div>

              <div className="flex items-center space-x-1.5">
                {['curl', 'node', 'python'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveSnippetTab(tab)}
                    className={`px-2.5 py-1 rounded text-[10px] uppercase font-bold transition-all ${
                      activeSnippetTab === tab
                        ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
                        : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    {tab === 'node' ? 'Node.js' : tab === 'python' ? 'Python' : 'cURL'}
                  </button>
                ))}

                <button
                  onClick={() => copyToClipboard(codeSnippets[activeSnippetTab], 'snippet')}
                  className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-all ml-1"
                  title="Copy Code Snippet"
                >
                  {copiedSnippet ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <pre className="p-3.5 rounded-lg bg-[#070b13] border border-slate-800/80 text-[11px] text-cyan-300 overflow-x-auto leading-relaxed select-text">
              {codeSnippets[activeSnippetTab]}
            </pre>
          </div>
        </div>

        {/* Right Column: Multi-Tenant RBAC Matrix & Isolation Guard (5 Columns) */}
        <div className="lg:col-span-5 space-y-6">
          {/* RBAC Role Permission Matrix */}
          <div className="cyber-card rounded-xl p-5 space-y-4 bg-slate-950 border border-slate-800 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <div className="flex items-center space-x-2 text-white font-bold font-mono text-sm">
                <Shield className="w-4 h-4 text-purple-400" />
                <span>RBAC Role Permission Matrix</span>
              </div>
              <span className="text-[10px] font-mono text-slate-500">4 Active Roles</span>
            </div>

            <div className="space-y-3.5">
              {rbacMatrix.map((item, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/70 space-y-2 hover:border-slate-700 transition-all font-mono"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-white font-bold text-xs">{item.role}</span>
                    <span className={`text-[9px] px-2 py-0.5 rounded border font-bold ${item.badgeColor}`}>
                      {item.badge}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-400 leading-relaxed">{item.description}</p>

                  <div className="grid grid-cols-2 gap-1.5 pt-1 text-[10px]">
                    {Object.entries(item.permissions).map(([perm, allowed]) => (
                      <div
                        key={perm}
                        className={`flex items-center space-x-1.5 px-2 py-1 rounded ${
                          allowed
                            ? 'bg-emerald-950/30 text-emerald-300 border border-emerald-900/40'
                            : 'bg-slate-950 text-slate-600 border border-slate-900'
                        }`}
                      >
                        {allowed ? (
                          <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                        ) : (
                          <XCircle className="w-3 h-3 text-slate-600 shrink-0" />
                        )}
                        <span className="truncate">{perm}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tenant Isolation Guard */}
          <div className="cyber-card rounded-xl p-5 space-y-3 font-mono text-xs bg-gradient-to-b from-[#0e1624] to-[#070b13] border-slate-800">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <div className="flex items-center space-x-2 text-cyan-400 font-bold">
                <ShieldCheck className="w-4 h-4" />
                <span>Multi-Tenant Isolation Architecture</span>
              </div>
              <span className="text-[10px] text-emerald-400 font-bold">RLS ACTIVE</span>
            </div>

            <div className="space-y-2 text-[11px] text-slate-400">
              <div className="flex items-center justify-between p-2 rounded bg-slate-950/80 border border-slate-800/60">
                <span className="text-slate-500">Tenant Namespace</span>
                <span className="text-white font-bold">{tenant?.id || 'tenant-dev-primary'}</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-slate-950/80 border border-slate-800/60">
                <span className="text-slate-500">Storage Protection</span>
                <span className="text-emerald-400 font-bold">PostgreSQL Row-Level Security</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-slate-950/80 border border-slate-800/60">
                <span className="text-slate-500">Rate Limit Tier</span>
                <span className="text-cyan-300 font-bold">10,000 req/sec (Burstable)</span>
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-amber-950/20 border border-amber-900/40 text-[10px] text-amber-300/90 leading-relaxed flex items-start space-x-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span>
                All API keys are salted and hashed via SHA-256 before storage. Plaintext keys are non-recoverable if lost.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

