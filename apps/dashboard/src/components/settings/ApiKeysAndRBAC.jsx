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
  Code2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Fingerprint,
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
      badgeColor: 'text-violet-400 bg-violet-500/10 border-violet-500/30',
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#202A3A]">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-[#F4F7FB]">
            API Security & Access Control
          </h1>
          <p className="text-xs sm:text-sm text-[#98A4B7] mt-0.5">
            Manage hashed API keys for SDK integration and review multi-tenant role-based permissions.
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <div className="flex items-center space-x-2 px-3 py-1.5 rounded-md bg-[#0F1420] border border-[#202A3A] text-xs font-mono text-cyan-400">
            <Key className="w-3.5 h-3.5" />
            <span>{activeKeysCount} Active Tokens</span>
          </div>
        </div>
      </div>

      {/* Newly Created Key Banner */}
      {newlyCreatedKey && (
        <div className="p-4 rounded-xl bg-[#0F1420] border border-cyan-500/50 space-y-2 animate-fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-cyan-300 font-semibold text-xs font-mono">
              <Key className="w-4 h-4 text-cyan-400" />
              <span>New API Key Generated — Copy immediately (key is never shown again in plaintext):</span>
            </div>
            <button
              onClick={() => copyToClipboard(newlyCreatedKey, 'key')}
              className="px-3 py-1 rounded-md bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs font-mono flex items-center space-x-1.5 transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 stroke-[2.5]" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied!' : 'Copy Key'}</span>
            </button>
          </div>
          <div className="p-2.5 rounded-lg bg-[#070A12] font-mono text-xs text-cyan-200 select-all break-all border border-[#202A3A] flex items-center justify-between">
            <span>{newlyCreatedKey}</span>
            <span className="text-[10px] text-[#667085] uppercase ml-2 shrink-0">Raw Token</span>
          </div>
        </div>
      )}

      {/* Main Dual-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Key Generator, Key List & SDK Snippets */}
        <div className="lg:col-span-7 space-y-4">
          {/* Create Key Card */}
          <div className="rounded-xl p-4 space-y-3 bg-[#0F1420] border border-[#202A3A]">
            <div className="flex items-center justify-between border-b border-[#202A3A] pb-2.5">
              <h3 className="font-mono text-xs font-semibold text-[#F4F7FB] flex items-center space-x-2">
                <Key className="w-3.5 h-3.5 text-cyan-400" />
                <span>Provision Integration API Key</span>
              </h3>
            </div>

            <form onSubmit={handleCreateKey} className="space-y-3 text-xs font-mono">
              <div>
                <label className="text-[11px] text-[#98A4B7] block mb-1">Key Description / Client Name</label>
                <input
                  type="text"
                  placeholder="e.g. Ingestion Pipeline Worker"
                  value={keyName}
                  onChange={(e) => setKeyName(e.target.value)}
                  className="w-full p-2 rounded-md bg-[#0B0F19] border border-[#202A3A] text-[#F4F7FB] placeholder-[#667085] focus:outline-none focus:border-cyan-500/70"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-[#98A4B7] block mb-1">RBAC Permission Role</label>
                  <select
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value)}
                    className="w-full p-2 rounded-md bg-[#0B0F19] border border-[#202A3A] text-cyan-300 focus:outline-none focus:border-cyan-500/70"
                  >
                    <option value="ADMIN">Cluster Admin (Full Control)</option>
                    <option value="OPERATOR">Pipeline Operator (Jobs & DAGs)</option>
                    <option value="WORKER">Worker Daemon (Claim & Lease)</option>
                    <option value="VIEWER">Telemetry Auditor (Read Only)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] text-[#98A4B7] block mb-1">Expiration Window</label>
                  <select
                    value={selectedExpiry}
                    onChange={(e) => setSelectedExpiry(e.target.value)}
                    className="w-full p-2 rounded-md bg-[#0B0F19] border border-[#202A3A] text-[#F4F7FB] focus:outline-none focus:border-cyan-500/70"
                  >
                    <option value="never">Never Expires</option>
                    <option value="30d">30 Days</option>
                    <option value="90d">90 Days</option>
                    <option value="365d">1 Year</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2 rounded-md bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold flex items-center justify-center space-x-1.5 transition-colors disabled:opacity-50 font-sans"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>{isLoading ? 'Generating Key...' : 'Generate New API Key'}</span>
              </button>
            </form>
          </div>

          {/* Keys Table */}
          <div className="rounded-xl overflow-hidden border border-[#202A3A] bg-[#0F1420]">
            <div className="p-3 border-b border-[#202A3A] flex items-center justify-between text-xs font-mono">
              <span className="uppercase text-[#F4F7FB] font-semibold flex items-center space-x-1.5">
                <Lock className="w-3.5 h-3.5 text-cyan-400" />
                <span>Active Keys ({apiKeys.length})</span>
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-[#0B0F19]/80 border-b border-[#202A3A] text-[#667085] text-[10px] uppercase">
                  <tr>
                    <th className="py-2.5 px-3.5">Name</th>
                    <th className="py-2.5 px-3.5">Prefix</th>
                    <th className="py-2.5 px-3.5">Role</th>
                    <th className="py-2.5 px-3.5">Status</th>
                    <th className="py-2.5 px-3.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#18202E]">
                  {apiKeys.map((k) => (
                    <tr key={k.id} className="hover:bg-[#151C2B]/50 transition-colors">
                      <td className="py-2.5 px-3.5 text-[#F4F7FB] font-medium text-[11px]">{k.name}</td>
                      <td className="py-2.5 px-3.5 text-cyan-400 text-[11px]">
                        <code>{k.prefix || 'pm_live_'}••••••••</code>
                      </td>
                      <td className="py-2.5 px-3.5">
                        <span className="text-[10px] px-1.5 py-0.2 rounded font-mono font-semibold bg-[#151C2B] text-[#98A4B7] border border-[#202A3A]">
                          {k.role || 'OPERATOR'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3.5">
                        <span className={`text-[10px] uppercase px-1.5 py-0.2 rounded border font-semibold ${
                          k.revoked_at
                            ? 'bg-rose-950/40 text-rose-400 border-rose-800/50'
                            : 'bg-emerald-950/40 text-emerald-400 border-emerald-800/50'
                        }`}>
                          {k.revoked_at ? 'Revoked' : 'Active'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3.5 text-right">
                        {!k.revoked_at ? (
                          <button
                            onClick={() => handleRevoke(k.id)}
                            className="text-rose-400 hover:text-rose-300 p-1 rounded hover:bg-rose-950/40 transition-colors"
                            title="Revoke Key"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <span className="text-[10px] text-[#667085]">Archived</span>
                        )}
                      </td>
                    </tr>
                  ))}

                  {apiKeys.length === 0 && (
                    <tr>
                      <td colSpan="5" className="py-8 text-center text-[#667085] text-xs">
                        No API keys generated yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Code Snippets */}
          <div className="rounded-xl p-4 space-y-2.5 font-mono text-xs bg-[#0F1420] border border-[#202A3A]">
            <div className="flex items-center justify-between border-b border-[#202A3A] pb-2">
              <div className="flex items-center space-x-2 text-[#F4F7FB] font-semibold">
                <Code2 className="w-3.5 h-3.5 text-cyan-400" />
                <span>SDK Authentication Snippets</span>
              </div>

              <div className="flex items-center space-x-1.5">
                {['curl', 'node', 'python'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveSnippetTab(tab)}
                    className={`px-2 py-0.5 rounded text-[10px] uppercase font-semibold transition-colors ${
                      activeSnippetTab === tab
                        ? 'bg-[#151C2B] text-cyan-400 border border-[#283448]'
                        : 'text-[#667085] hover:text-[#98A4B7]'
                    }`}
                  >
                    {tab === 'node' ? 'Node.js' : tab === 'python' ? 'Python' : 'cURL'}
                  </button>
                ))}

                <button
                  onClick={() => copyToClipboard(codeSnippets[activeSnippetTab], 'snippet')}
                  className="p-1 text-[#667085] hover:text-[#F4F7FB] rounded transition-colors ml-1"
                  title="Copy Snippet"
                >
                  {copiedSnippet ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <pre className="p-3 rounded-lg bg-[#070A12] border border-[#202A3A] text-[11px] text-cyan-300 overflow-x-auto leading-relaxed select-text">
              {codeSnippets[activeSnippetTab]}
            </pre>
          </div>
        </div>

        {/* Right Column: RBAC Matrix */}
        <div className="lg:col-span-5 space-y-4">
          <div className="rounded-xl p-4 space-y-3 bg-[#0F1420] border border-[#202A3A]">
            <div className="flex items-center justify-between border-b border-[#202A3A] pb-2">
              <span className="text-[#F4F7FB] font-semibold font-mono text-xs flex items-center space-x-1.5">
                <Shield className="w-3.5 h-3.5 text-violet-400" />
                <span>Role Permission Matrix</span>
              </span>
            </div>

            <div className="space-y-2.5">
              {rbacMatrix.map((item, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-lg bg-[#0B0F19] border border-[#202A3A] space-y-1.5 font-mono"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[#F4F7FB] font-semibold text-xs">{item.role}</span>
                    <span className={`text-[9px] px-1.5 py-0.2 rounded border font-semibold ${item.badgeColor}`}>
                      {item.badge}
                    </span>
                  </div>

                  <p className="text-[10px] text-[#98A4B7] leading-relaxed font-sans">{item.description}</p>

                  <div className="grid grid-cols-2 gap-1 pt-1 text-[9px]">
                    {Object.entries(item.permissions).map(([perm, allowed]) => (
                      <div
                        key={perm}
                        className={`flex items-center space-x-1 px-1.5 py-0.5 rounded ${
                          allowed
                            ? 'bg-emerald-950/30 text-emerald-300'
                            : 'bg-[#070A12] text-[#667085]'
                        }`}
                      >
                        {allowed ? (
                          <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400 shrink-0" />
                        ) : (
                          <XCircle className="w-2.5 h-2.5 text-[#667085] shrink-0" />
                        )}
                        <span className="truncate">{perm}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
