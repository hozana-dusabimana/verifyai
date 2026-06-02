import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import {
  PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import {
  Activity, Users, Database, FileText, Search, Upload, AlertTriangle,
  RefreshCw, Brain, Cpu, BarChart3, Zap, UserPlus, Building2, Trash2,
  ChevronLeft, CheckCircle2, ShieldCheck, HardDrive, Server,
  Download, SlidersHorizontal, Plus, Save,
} from 'lucide-react';
import { adminAPI, usersAPI } from '../../services/api';
import Modal from '../../components/Modal';

// Build a CSV string from an array of objects (or array of arrays) and trigger a download.
function downloadCSV(filename, rows) {
  if (!rows || rows.length === 0) return;
  const esc = (v) => {
    const s = v == null ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  let lines;
  if (Array.isArray(rows[0])) {
    lines = rows.map((r) => r.map(esc).join(','));
  } else {
    const headers = Object.keys(rows[0]);
    lines = [headers.join(','), ...rows.map((r) => headers.map((h) => esc(r[h])).join(','))];
  }
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const statusDot = (status) => {
  const s = (status || '').toLowerCase();
  if (['healthy', 'ready', 'ok'].includes(s)) return 'bg-emerald-500';
  if (['unhealthy', 'unavailable', 'models missing'].includes(s)) return 'bg-red-500';
  return 'bg-amber-500';
};

const SERVICE_ICON = {
  database: Database,
  redis: Server,
  celery: Cpu,
  ml_engine: Brain,
  storage: HardDrive,
};

// ─── System Health ─────────────────────────────────────────────────
function HealthPanel() {
  const [health, setHealth] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchHealth = async () => {
    setLoading(true);
    try {
      const [hRes, mRes] = await Promise.allSettled([adminAPI.getSystemHealth(), adminAPI.getMetrics()]);
      if (hRes.status === 'fulfilled') setHealth(hRes.value.data.data);
      if (mRes.status === 'fulfilled') setMetrics(mRes.value.data.data);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchHealth(); }, []);

  if (loading) return <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-2 border-brand-500 border-t-transparent" /></div>;

  const services = health?.services || {};
  const overall = health?.overall || 'unknown';

  const metricCards = [
    { label: 'Total Users', value: metrics?.total_users },
    { label: 'Articles', value: metrics?.total_articles },
    { label: 'Total Analyses', value: metrics?.total_analyses },
    { label: 'Completed', value: metrics?.completed_analyses },
    { label: 'Pending', value: metrics?.pending_analyses },
    { label: 'Open Alerts', value: metrics?.open_alerts },
    { label: 'Escalated', value: metrics?.escalated_alerts },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900">System Health</h2>
          <p className="text-sm text-slate-500 mt-0.5">Live status of every platform service.</p>
        </div>
        <button onClick={fetchHealth} className="flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-xl text-sm font-bold hover:bg-slate-200">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      <div className={`rounded-2xl p-4 border flex items-center gap-3 ${overall === 'healthy' ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
        <span className={`w-3 h-3 rounded-full ${statusDot(overall)}`} />
        <p className={`text-sm font-bold capitalize ${overall === 'healthy' ? 'text-emerald-700' : 'text-amber-700'}`}>
          Overall status: {overall}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Object.entries(services).map(([name, status]) => {
          const Icon = SERVICE_ICON[name] || Activity;
          return (
            <div key={name} className="glass rounded-2xl p-5 flex items-center gap-4">
              <div className="p-2 bg-slate-100 rounded-lg text-slate-600"><Icon className="w-5 h-5" /></div>
              <div className="flex-1">
                <p className="text-sm font-bold text-slate-900 capitalize">{name.replace('_', ' ')}</p>
                <p className="text-xs text-slate-500 capitalize">{status}</p>
              </div>
              <div className={`w-3 h-3 rounded-full ${statusDot(status)}`} />
            </div>
          );
        })}
      </div>

      {metrics && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {metricCards.map((m, i) => (
            <div key={i} className="glass rounded-2xl p-4 text-center">
              <p className="text-2xl font-bold text-slate-900 tabular-nums">{m.value ?? '—'}</p>
              <p className="text-[11px] text-slate-500 font-medium mt-1">{m.label}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── User Management ───────────────────────────────────────────────
const ROLE_BADGES = {
  admin:      'bg-purple-100 text-purple-800 border-purple-200',
  government: 'bg-blue-100   text-blue-800   border-blue-200',
  journalist: 'bg-amber-100  text-amber-800  border-amber-200',
  citizen:    'bg-slate-100  text-slate-700  border-slate-200',
};

function CreateUserModal({ open, onClose, onCreated }) {
  const [form, setForm] = useState({
    first_name: '', last_name: '', email: '',
    organization: '', role: 'government', password: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      const res = await usersAPI.createUser(form);
      onCreated(res.data.data);
      onClose();
    } catch (err) {
      const data = err.response?.data?.error;
      if (typeof data === 'object') {
        setError(Object.entries(data).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`).join(' | '));
      } else {
        setError(data || 'Failed to create user.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      icon={UserPlus}
      title="Create user"
      subtitle="Provision an account with any role, including Government and Admin."
    >
      <form onSubmit={submit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-xl text-sm font-medium">{error}</div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-600 mb-1 block">First name</label>
              <input name="first_name" required value={form.first_name} onChange={handleChange}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none" />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-600 mb-1 block">Last name</label>
              <input name="last_name" required value={form.last_name} onChange={handleChange}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none" />
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-600 mb-1 block">Email</label>
            <input name="email" type="email" required value={form.email} onChange={handleChange}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-600 mb-1 block">Role</label>
              <select name="role" value={form.role} onChange={handleChange}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-medium capitalize focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none bg-white">
                <option value="citizen">Citizen</option>
                <option value="journalist">Journalist</option>
                <option value="government">Government</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-600 mb-1 block">
                Organization {(form.role === 'government' || form.role === 'journalist') && <span className="text-red-500">*</span>}
              </label>
              <input name="organization" value={form.organization} onChange={handleChange}
                required={form.role === 'government' || form.role === 'journalist'}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none" />
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-600 mb-1 block">Initial password (8+ chars)</label>
            <input name="password" type="text" required minLength={8} value={form.password} onChange={handleChange}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-mono focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none" />
            <p className="text-[11px] text-slate-500 mt-1">Share this with the user. They can change it after first login.</p>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100 rounded-lg">Cancel</button>
            <button type="submit" disabled={submitting}
              className="px-4 py-2 text-sm font-bold text-white bg-brand-600 hover:bg-brand-700 rounded-lg shadow-sm disabled:opacity-50 inline-flex items-center gap-2">
              {submitting ? 'Creating…' : <>Create user <UserPlus className="w-4 h-4" /></>}
            </button>
          </div>
        </form>
    </Modal>
  );
}

function UsersPanel() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [activity, setActivity] = useState(null);

  const fetchUsers = useCallback(async (term) => {
    setLoading(true);
    try {
      const res = await usersAPI.listUsers({ search: term });
      const data = res.data?.data;
      setUsers(Array.isArray(data) ? data : (data?.results || []));
    } catch {
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchUsers(''); }, [fetchUsers]);

  const handleRoleChange = async (userId, role) => {
    try {
      await usersAPI.updateUserRole(userId, role);
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role } : u)));
    } catch { /* ignore */ }
  };

  const handleDeactivate = async (userId) => {
    if (!confirm('Deactivate this user?')) return;
    try {
      await usersAPI.deactivateUser(userId);
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, is_active: false } : u)));
    } catch { /* ignore */ }
  };

  const counts = users.reduce((acc, u) => {
    acc[u.role] = (acc[u.role] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900">User Management</h2>
          <p className="text-sm text-slate-500 mt-0.5">Provision and manage all platform accounts.</p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-bold shadow-md hover:shadow-lg transition-all w-fit">
          <UserPlus className="w-4 h-4" /> Create user
        </button>
      </div>

      {!loading && users.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {['admin', 'government', 'journalist', 'citizen'].map((r) => (
            <span key={r} className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border capitalize ${ROLE_BADGES[r]}`}>
              {r} <span className="ml-1.5 px-1.5 rounded bg-white/60 tabular-nums">{counts[r] || 0}</span>
            </span>
          ))}
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border bg-white text-slate-700 border-slate-200">
            Total <span className="ml-1.5 px-1.5 rounded bg-slate-100 tabular-nums">{users.length}</span>
          </span>
        </div>
      )}

      <form onSubmit={(e) => { e.preventDefault(); fetchUsers(search); }} className="relative max-w-md">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input type="text" placeholder="Search by name, email, or organization…"
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
          value={search} onChange={(e) => setSearch(e.target.value)} />
      </form>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-brand-500 border-t-transparent" />
        </div>
      ) : users.length === 0 ? (
        <div className="glass rounded-2xl py-16 px-6 text-center">
          <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-sm font-bold text-slate-800">No users found</p>
          <p className="text-xs text-slate-500 mt-1 mb-4">
            {search ? 'Try a different search term.' : 'Create the first user to get started.'}
          </p>
        </div>
      ) : (
        <div className="glass rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">User</th>
                  <th className="px-6 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">Organization</th>
                  <th className="px-6 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">Role</th>
                  <th className="px-6 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">Joined</th>
                  <th className="px-6 py-3 text-right text-[11px] font-bold text-slate-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-bold text-sm flex-shrink-0">
                          {(u.first_name?.[0] || u.email[0] || '?').toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-slate-900 truncate">{u.full_name?.trim() || u.email}</p>
                          <p className="text-xs text-slate-500 truncate">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-700 max-w-[200px] truncate">{u.organization || '—'}</td>
                    <td className="px-6 py-4">
                      <select
                        className={`rounded-lg border py-1 px-2 text-xs font-bold capitalize ${ROLE_BADGES[u.role] || 'border-slate-300'}`}
                        value={u.role}
                        onChange={(e) => handleRoleChange(u.id, e.target.value)}
                      >
                        <option value="citizen">Citizen</option>
                        <option value="journalist">Journalist</option>
                        <option value="government">Government</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-bold border ${u.is_active ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${u.is_active ? 'bg-emerald-500' : 'bg-red-500'}`} />
                        {u.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500 tabular-nums">{new Date(u.created_at).toLocaleDateString()}</td>
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      <button
                        onClick={() => setActivity(u.id)}
                        className="text-xs font-bold text-brand-600 hover:text-brand-700 px-2 py-1 rounded hover:bg-brand-50"
                      >
                        View
                      </button>
                      {u.is_active && (
                        <button
                          onClick={() => handleDeactivate(u.id)}
                          className="text-xs font-bold text-red-600 hover:text-red-700 px-2 py-1 rounded hover:bg-red-50"
                        >
                          Deactivate
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <CreateUserModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={(newUser) => setUsers((prev) => [newUser, ...prev])}
      />
      <UserActivityModal userId={activity} onClose={() => setActivity(null)} />
    </div>
  );
}

// ─── User Activity (searches) modal ────────────────────────────────
const CLS_BADGE = {
  FAKE: 'bg-red-100 text-red-700',
  REAL: 'bg-emerald-100 text-emerald-700',
  UNCERTAIN: 'bg-amber-100 text-amber-700',
};

function UserActivityModal({ userId, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!userId) return;
    let active = true;
    (async () => {
      setLoading(true);
      setData(null);
      try {
        const res = await adminAPI.getUserActivity(userId);
        if (active) setData(res.data.data);
      } catch {
        if (active) setData(null);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [userId]);

  if (!userId) return null;
  const u = data?.user;
  const s = data?.stats;

  return (
    <Modal open={!!userId} onClose={onClose} icon={Users} title={u?.full_name || 'User activity'} subtitle={u?.email}>
      <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
        {loading ? (
          <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-8 w-8 border-2 border-brand-500 border-t-transparent" /></div>
        ) : !data ? (
          <p className="text-sm text-slate-500 text-center py-8">Could not load activity.</p>
        ) : (
          <>
            <div className="flex flex-wrap gap-2 text-xs">
              <span className={`px-2 py-1 rounded-full font-bold border capitalize ${ROLE_BADGES[u.role] || ''}`}>{u.role}</span>
              <span className="px-2 py-1 rounded-full font-bold border bg-slate-50 text-slate-700 border-slate-200">{u.organization}</span>
              <span className={`px-2 py-1 rounded-full font-bold border ${u.is_active ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'}`}>{u.is_active ? 'Active' : 'Inactive'}</span>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {[
                { label: 'Analyzed', value: s.total_analyzed },
                { label: 'Fake', value: s.fake_count },
                { label: 'Real', value: s.real_count },
                { label: 'Avg cred.', value: `${Math.round(s.average_credibility)}%` },
                { label: 'Open alerts', value: s.open_alerts },
              ].map((m, i) => (
                <div key={i} className="bg-slate-50 rounded-xl p-3 text-center">
                  <p className="text-lg font-bold text-slate-900 tabular-nums">{m.value}</p>
                  <p className="text-[10px] text-slate-500 font-medium">{m.label}</p>
                </div>
              ))}
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900 mb-2">Recent analyses (searches)</h4>
              {data.recent_analyses.length === 0 ? (
                <p className="text-xs text-slate-500 py-4 text-center">No analyses yet.</p>
              ) : (
                <div className="space-y-1.5">
                  {data.recent_analyses.map((a) => (
                    <div key={a.id} className="flex items-center justify-between gap-3 bg-white border border-slate-100 rounded-lg px-3 py-2">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate">{a.title}</p>
                        <p className="text-[11px] text-slate-500 truncate">{a.source_name} · {new Date(a.created_at).toLocaleDateString()}</p>
                      </div>
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${CLS_BADGE[a.classification] || 'bg-slate-100 text-slate-600'}`}>
                        {a.classification || a.status} {a.credibility_score != null && `· ${Math.round(a.credibility_score)}%`}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}

// ─── Dataset Manager ───────────────────────────────────────────────
function DatasetsPanel() {
  const [datasets, setDatasets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    adminAPI.getDatasets().then(res => setDatasets(res.data.data || [])).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('name', file.name.replace(/\.[^.]+$/, ''));
      fd.append('description', `Uploaded on ${new Date().toLocaleDateString()}`);
      fd.append('file', file);
      const res = await adminAPI.uploadDataset(fd);
      setDatasets(prev => [res.data.data, ...prev]);
    } catch (err) {
      const data = err.response?.data?.error;
      if (typeof data === 'object') {
        setError(Object.entries(data).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`).join(' | '));
      } else {
        setError(data || 'Upload failed.');
      }
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this dataset? The file will be removed.')) return;
    try {
      await adminAPI.deleteDataset(id);
      setDatasets(prev => prev.filter(d => d.id !== id));
    } catch { /* ignore */ }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900">Dataset Manager</h2>
          <p className="text-sm text-slate-500 mt-0.5">Labeled training data for model retraining.</p>
        </div>
        <label className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-xl font-bold cursor-pointer hover:bg-brand-700 shadow-md">
          <Upload className="w-4 h-4" /> {uploading ? 'Uploading…' : 'Upload Dataset'}
          <input type="file" className="hidden" accept=".csv,.json" onChange={handleUpload} disabled={uploading} />
        </label>
      </div>

      <div className="rounded-xl bg-blue-50 border border-blue-200 px-4 py-3 text-xs text-blue-800">
        <strong>Format:</strong> CSV or JSON with a text column (<code>text</code>, <code>content</code>, <code>article</code>, or <code>body</code>) and a label
        column (<code>label</code>, <code>target</code>, <code>class</code>, or <code>fake</code>). Labels accept <code>fake</code>/<code>real</code> or <code>1</code>/<code>0</code>. Minimum 20 rows with both classes.
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm font-medium flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" /> <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-2 border-brand-500 border-t-transparent" /></div>
      ) : datasets.length > 0 ? (
        <div className="space-y-3">
          {datasets.map((ds) => (
            <div key={ds.id} className="glass rounded-2xl p-5 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-bold text-slate-900 truncate">{ds.name}</p>
                <p className="text-xs text-slate-500 mt-0.5 truncate">{ds.description} · {ds.uploaded_by_email || 'system'} · {new Date(ds.created_at).toLocaleDateString()}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-full font-bold tabular-nums">{ds.record_count} records</span>
                <button onClick={() => handleDelete(ds.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg" title="Delete dataset">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="glass rounded-2xl p-12 text-center">
          <Database className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">No datasets uploaded yet.</p>
        </div>
      )}
    </div>
  );
}

// ─── Audit Logs ────────────────────────────────────────────────────
function AuditPanel() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminAPI.getAuditLogs().then(res => setLogs(res.data.data || [])).catch(() => {}).finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-extrabold text-slate-900">Audit Logs</h2>

      {loading ? (
        <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-2 border-brand-500 border-t-transparent" /></div>
      ) : logs.length > 0 ? (
        <div className="glass rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Action</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">User</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Resource</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">IP</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/50">
                    <td className="px-6 py-3 text-sm font-bold text-slate-900">{log.action}</td>
                    <td className="px-6 py-3 text-sm text-slate-600">{log.user_email || 'system'}</td>
                    <td className="px-6 py-3 text-sm text-slate-500">{log.resource_type} {log.resource_id ? `#${log.resource_id.slice(0, 8)}` : ''}</td>
                    <td className="px-6 py-3 text-sm text-slate-500">{log.ip_address || '-'}</td>
                    <td className="px-6 py-3 text-sm text-slate-500">{new Date(log.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="glass rounded-2xl p-12 text-center">
          <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">No audit logs recorded yet.</p>
        </div>
      )}
    </div>
  );
}

// ─── Statistics ────────────────────────────────────────────────────
const ROLE_COLORS = { admin: '#a855f7', government: '#3b82f6', journalist: '#f59e0b', citizen: '#64748b' };
const CLS_COLORS = { fake: '#ef4444', real: '#10b981', uncertain: '#f59e0b' };

function StatCardSmall({ label, value, color }) {
  return (
    <div className="glass rounded-2xl p-5">
      <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</p>
      <p className={`text-3xl font-extrabold mt-1 tabular-nums ${color || 'text-slate-900'}`}>{value}</p>
    </div>
  );
}

function exportStats(stats) {
  const cls = stats.classification || {};
  const rows = [
    ['Metric', 'Value'],
    ['Window (days)', stats.window_days],
    ['Total users', stats.total_users],
    ['Active users', stats.active_users],
    ['Total analyses', cls.total],
    ['Fake', cls.fake],
    ['Real', cls.real],
    ['Uncertain', cls.uncertain],
    ['Average credibility', cls.average_credibility],
    [],
    ['Users by role', 'Count'],
    ...Object.entries(stats.users_by_role || {}),
    [],
    ['Top organizations', 'Analyses', 'Fake', 'Avg credibility'],
    ...(stats.top_organizations || []).map((o) => [o.organization, o.total, o.fake, o.average_credibility]),
    [],
    ['Date', 'Real', 'Fake', 'Uncertain'],
    ...(stats.trend || []).map((t) => [t.date, t.real_count, t.fake_count, t.uncertain_count]),
  ];
  downloadCSV('verifyai_statistics.csv', rows);
}

function StatisticsPanel() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await adminAPI.getStatistics({ days: 30 });
      setStats(res.data.data);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchStats(); }, []);

  if (loading) return <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-2 border-brand-500 border-t-transparent" /></div>;
  if (!stats) return <p className="text-sm text-slate-500">Could not load statistics.</p>;

  const cls = stats.classification || {};
  const pieData = [
    { name: 'Real', key: 'real', value: cls.real || 0 },
    { name: 'Fake', key: 'fake', value: cls.fake || 0 },
    { name: 'Uncertain', key: 'uncertain', value: cls.uncertain || 0 },
  ].filter(d => d.value > 0);

  const roleData = Object.entries(stats.users_by_role || {}).map(([role, count]) => ({ role, count }));
  const trend = (stats.trend || []).map(r => ({
    name: new Date(r.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    real: r.real_count, fake: r.fake_count,
  }));

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900">Platform Statistics</h2>
          <p className="text-sm text-slate-500 mt-0.5">Last {stats.window_days} days · platform-wide.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => exportStats(stats)} className="flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-xl text-sm font-bold hover:bg-slate-200">
            <Download className="w-4 h-4" /> Export CSV
          </button>
          <button onClick={fetchStats} className="flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-xl text-sm font-bold hover:bg-slate-200">
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCardSmall label="Total users" value={stats.total_users} />
        <StatCardSmall label="Total analyses" value={cls.total} />
        <StatCardSmall label="Avg credibility" value={`${Math.round(cls.average_credibility || 0)}%`} color="text-emerald-600" />
        <StatCardSmall label={`New (${stats.window_days}d)`} value={stats.new_analyses_window} color="text-brand-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass rounded-2xl p-6">
          <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2"><PieChartIcon /> Classification mix</h3>
          {pieData.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} innerRadius={50} paddingAngle={2}>
                    {pieData.map((d) => <Cell key={d.key} fill={CLS_COLORS[d.key]} />)}
                  </Pie>
                  <Tooltip />
                  <Legend iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : <p className="text-sm text-slate-500 py-10 text-center">No analyses yet.</p>}
        </div>

        <div className="glass rounded-2xl p-6">
          <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2"><Users className="w-5 h-5 text-brand-600" /> Users by role</h3>
          <div className="space-y-3 pt-2">
            {roleData.map((r) => {
              const max = Math.max(...roleData.map(x => x.count), 1);
              return (
                <div key={r.role} className="flex items-center gap-3">
                  <span className="text-xs font-bold text-slate-700 w-24 capitalize">{r.role}</span>
                  <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${(r.count / max) * 100}%`, background: ROLE_COLORS[r.role] || '#64748b' }} />
                  </div>
                  <span className="text-sm font-bold text-slate-700 w-8 text-right tabular-nums">{r.count}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="glass rounded-2xl p-6">
        <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2"><BarChart3 className="w-5 h-5 text-brand-600" /> Real vs Fake — {stats.window_days} days</h3>
        <div className="h-64">
          {trend.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} allowDecimals={false} />
                <Tooltip />
                <Legend iconType="circle" />
                <Line type="monotone" dataKey="real" name="Real" stroke="#10b981" strokeWidth={2.5} dot={false} />
                <Line type="monotone" dataKey="fake" name="Fake" stroke="#ef4444" strokeWidth={2.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : <p className="text-sm text-slate-500 py-10 text-center">No trend data yet.</p>}
        </div>
      </div>

      <div className="glass rounded-2xl p-6">
        <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2"><Building2 className="w-5 h-5 text-brand-600" /> Top organizations by activity</h3>
        {(stats.top_organizations || []).length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="px-3 py-2 text-left text-[11px] font-bold text-slate-500 uppercase">Organization</th>
                  <th className="px-3 py-2 text-right text-[11px] font-bold text-slate-500 uppercase">Analyses</th>
                  <th className="px-3 py-2 text-right text-[11px] font-bold text-slate-500 uppercase">Fake</th>
                  <th className="px-3 py-2 text-right text-[11px] font-bold text-slate-500 uppercase">Avg cred.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stats.top_organizations.map((o, i) => (
                  <tr key={i} className="hover:bg-slate-50/60">
                    <td className="px-3 py-2.5 text-sm font-bold text-slate-800">{o.organization}</td>
                    <td className="px-3 py-2.5 text-sm text-right tabular-nums">{o.total}</td>
                    <td className="px-3 py-2.5 text-sm text-right text-red-600 font-bold tabular-nums">{o.fake}</td>
                    <td className="px-3 py-2.5 text-sm text-right tabular-nums">{Math.round(o.average_credibility)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p className="text-sm text-slate-500 py-6 text-center">No organization activity yet.</p>}
      </div>
    </div>
  );
}

function PieChartIcon() {
  return <BarChart3 className="w-5 h-5 text-brand-600" />;
}

// ─── Organizations (government oversight) ──────────────────────────
function OrganizationsPanel() {
  const [orgs, setOrgs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [activity, setActivity] = useState(null);

  useEffect(() => {
    adminAPI.getOrganizations().then(res => setOrgs(res.data.data || [])).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const openOrg = async (name) => {
    setDetailLoading(true);
    setDetail({ organization: name, members: [] });
    try {
      const res = await adminAPI.getOrganizationDetail(name);
      setDetail(res.data.data);
    } catch { setDetail(null); }
    finally { setDetailLoading(false); }
  };

  if (loading) return <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-2 border-brand-500 border-t-transparent" /></div>;

  if (detail) {
    return (
      <div className="space-y-6">
        <button onClick={() => setDetail(null)} className="inline-flex items-center gap-1.5 text-sm font-bold text-brand-600 hover:text-brand-700">
          <ChevronLeft className="w-4 h-4" /> All organizations
        </button>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2"><Building2 className="w-6 h-6 text-brand-600" /> {detail.organization}</h2>
            <p className="text-sm text-slate-500 mt-0.5">{detail.member_count} members · their users, details & searches.</p>
          </div>
          {detail.members?.length > 0 && (
            <button
              onClick={() => downloadCSV(`org_${detail.organization}_members.csv`, detail.members.map((m) => ({
                name: m.full_name, email: m.email, role: m.role, active: m.is_active,
                analyses: m.total_analyses, fake: m.fake_count, real: m.real_count,
                avg_credibility: m.average_credibility, open_alerts: m.open_alerts,
              })))}
              className="flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-xl text-sm font-bold hover:bg-slate-200 whitespace-nowrap"
            >
              <Download className="w-4 h-4" /> Export CSV
            </button>
          )}
        </div>

        {detailLoading ? (
          <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-2 border-brand-500 border-t-transparent" /></div>
        ) : (
          <div className="glass rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-[11px] font-bold text-slate-500 uppercase">Member</th>
                    <th className="px-6 py-3 text-left text-[11px] font-bold text-slate-500 uppercase">Role</th>
                    <th className="px-6 py-3 text-right text-[11px] font-bold text-slate-500 uppercase">Analyses</th>
                    <th className="px-6 py-3 text-right text-[11px] font-bold text-slate-500 uppercase">Fake</th>
                    <th className="px-6 py-3 text-right text-[11px] font-bold text-slate-500 uppercase">Avg cred.</th>
                    <th className="px-6 py-3 text-right text-[11px] font-bold text-slate-500 uppercase">Alerts</th>
                    <th className="px-6 py-3 text-right text-[11px] font-bold text-slate-500 uppercase">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {detail.members.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-50/60">
                      <td className="px-6 py-4">
                        <p className="text-sm font-bold text-slate-900 truncate">{m.full_name}</p>
                        <p className="text-xs text-slate-500 truncate">{m.email}</p>
                      </td>
                      <td className="px-6 py-4"><span className={`inline-flex px-2 py-0.5 rounded text-xs font-bold border capitalize ${ROLE_BADGES[m.role] || ''}`}>{m.role}</span></td>
                      <td className="px-6 py-4 text-sm text-right tabular-nums">{m.total_analyses}</td>
                      <td className="px-6 py-4 text-sm text-right text-red-600 font-bold tabular-nums">{m.fake_count}</td>
                      <td className="px-6 py-4 text-sm text-right tabular-nums">{Math.round(m.average_credibility)}%</td>
                      <td className="px-6 py-4 text-sm text-right tabular-nums">{m.open_alerts}</td>
                      <td className="px-6 py-4 text-right">
                        <button onClick={() => setActivity(m.id)} className="text-xs font-bold text-brand-600 hover:text-brand-700 px-2 py-1 rounded hover:bg-brand-50">View</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        <UserActivityModal userId={activity} onClose={() => setActivity(null)} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900">Organizations</h2>
          <p className="text-sm text-slate-500 mt-0.5">Government & newsroom organizations — drill in to see their users, details and searches.</p>
        </div>
        {orgs.length > 0 && (
          <button
            onClick={() => downloadCSV('verifyai_organizations.csv', orgs.map((o) => ({
              organization: o.organization, members: o.member_count,
              government: o.government_count, journalists: o.journalist_count, citizens: o.citizen_count,
              analyses: o.total_analyses, fake: o.fake_count,
              avg_credibility: o.average_credibility, open_alerts: o.open_alerts,
            })))}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-xl text-sm font-bold hover:bg-slate-200 whitespace-nowrap"
          >
            <Download className="w-4 h-4" /> Export CSV
          </button>
        )}
      </div>

      {orgs.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center">
          <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">No organizations yet.</p>
        </div>
      ) : (
        <div className="glass rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-[11px] font-bold text-slate-500 uppercase">Organization</th>
                  <th className="px-6 py-3 text-right text-[11px] font-bold text-slate-500 uppercase">Members</th>
                  <th className="px-6 py-3 text-right text-[11px] font-bold text-slate-500 uppercase">Gov / Journ.</th>
                  <th className="px-6 py-3 text-right text-[11px] font-bold text-slate-500 uppercase">Analyses</th>
                  <th className="px-6 py-3 text-right text-[11px] font-bold text-slate-500 uppercase">Avg cred.</th>
                  <th className="px-6 py-3 text-right text-[11px] font-bold text-slate-500 uppercase">Alerts</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {orgs.map((o, i) => (
                  <tr key={i} onClick={() => openOrg(o.organization)} className="hover:bg-brand-50/40 cursor-pointer transition-colors">
                    <td className="px-6 py-4 text-sm font-bold text-slate-900 flex items-center gap-2"><Building2 className="w-4 h-4 text-brand-500" /> {o.organization}</td>
                    <td className="px-6 py-4 text-sm text-right tabular-nums">{o.member_count}</td>
                    <td className="px-6 py-4 text-sm text-right tabular-nums">{o.government_count} / {o.journalist_count}</td>
                    <td className="px-6 py-4 text-sm text-right tabular-nums">{o.total_analyses}</td>
                    <td className="px-6 py-4 text-sm text-right tabular-nums">{Math.round(o.average_credibility)}%</td>
                    <td className={`px-6 py-4 text-sm text-right font-bold tabular-nums ${o.open_alerts > 0 ? 'text-red-600' : 'text-slate-400'}`}>{o.open_alerts}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── ML Models Panel ──────────────────────────────────────────────
const JOB_DONE = ['completed', 'failed'];

function MLModelsPanel() {
  const [modelInfo, setModelInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [datasets, setDatasets] = useState([]);
  const [selectedDataset, setSelectedDataset] = useState('');
  const [job, setJob] = useState(null);
  const [starting, setStarting] = useState(false);
  const [testText, setTestText] = useState('');
  const [testResult, setTestResult] = useState(null);
  const [testing, setTesting] = useState(false);
  const pollRef = useRef(null);

  const fetchModels = async () => {
    setLoading(true);
    try {
      const res = await adminAPI.getMLModels();
      setModelInfo(res.data.data);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  useEffect(() => {
    fetchModels();
    adminAPI.getDatasets().then(res => setDatasets(res.data.data || [])).catch(() => {});
    // Resume tracking the latest running job (e.g. after a refresh)
    adminAPI.getTrainingJobs().then(res => {
      const latest = (res.data.data || [])[0];
      if (latest && !JOB_DONE.includes(latest.status)) startPolling(latest.id);
      else if (latest) setJob(latest);
    }).catch(() => {});
    return () => clearInterval(pollRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startPolling = (jobId) => {
    clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const res = await adminAPI.getTrainingJob(jobId);
        const j = res.data.data;
        setJob(j);
        if (JOB_DONE.includes(j.status)) {
          clearInterval(pollRef.current);
          if (j.status === 'completed') fetchModels();
        }
      } catch { /* keep polling */ }
    }, 3000);
  };

  const handleRetrain = async () => {
    if (!confirm('Start model retraining? This runs in the background and may take several minutes.')) return;
    setStarting(true);
    try {
      const res = await adminAPI.retrainModels(selectedDataset || undefined);
      const jobId = res.data.data.job_id;
      setJob({ id: jobId, status: 'running', progress: 1, stage: 'Starting' });
      startPolling(jobId);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to start retraining.');
    } finally { setStarting(false); }
  };

  const handleTest = async (e) => {
    e.preventDefault();
    if (!testText.trim()) return;
    setTesting(true);
    setTestResult(null);
    try {
      const res = await adminAPI.mlPredict(testText);
      setTestResult(res.data.data);
    } catch (err) {
      alert(err.response?.data?.error || 'Prediction failed.');
    }
    finally { setTesting(false); }
  };

  if (loading) return <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-2 border-brand-500 border-t-transparent" /></div>;

  const models = modelInfo?.models_available || {};
  const metrics = modelInfo?.metrics || {};
  const weights = modelInfo?.ensemble_weights || {};
  const jobRunning = job && !JOB_DONE.includes(job.status);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-3">
        <h2 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2"><Brain className="w-6 h-6 text-brand-600" /> ML Models</h2>
        <div className="flex gap-2 flex-wrap items-center">
          <select value={selectedDataset} onChange={(e) => setSelectedDataset(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-300 text-sm font-medium bg-white outline-none focus:ring-2 focus:ring-brand-500">
            <option value="">Built-in dataset</option>
            {datasets.map(d => <option key={d.id} value={d.id}>{d.name} ({d.record_count})</option>)}
          </select>
          <button onClick={fetchModels} className="flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-xl text-sm font-bold hover:bg-slate-200">
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
          <button onClick={handleRetrain} disabled={starting || jobRunning}
            className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-xl text-sm font-bold hover:bg-brand-700 disabled:opacity-50 shadow-md">
            <Zap className="w-4 h-4" /> {jobRunning ? 'Training…' : starting ? 'Starting…' : 'Retrain Models'}
          </button>
        </div>
      </div>

      {/* Training job progress */}
      {job && (
        <div className={`rounded-2xl p-4 border ${
          job.status === 'completed' ? 'bg-emerald-50 border-emerald-200' :
          job.status === 'failed' ? 'bg-red-50 border-red-200' :
          'bg-blue-50 border-blue-200'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-bold flex items-center gap-2">
              {job.status === 'completed' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> :
               job.status === 'failed' ? <AlertTriangle className="w-4 h-4 text-red-600" /> :
               <RefreshCw className="w-4 h-4 text-blue-600 animate-spin" />}
              <span className="capitalize">{job.status}</span>
              {job.stage && <span className="text-slate-500 font-medium">· {job.stage}</span>}
            </p>
            <span className="text-sm font-bold tabular-nums">{job.progress || 0}%</span>
          </div>
          {jobRunning && (
            <div className="h-2 bg-white/70 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 rounded-full transition-all duration-500" style={{ width: `${job.progress || 0}%` }} />
            </div>
          )}
          {job.message && <p className="text-xs text-slate-600 mt-2">{job.message}</p>}
          {job.error && <p className="text-xs text-red-700 mt-1 font-mono">{job.error}</p>}
        </div>
      )}

      {/* Model Status */}
      <div className={`rounded-2xl p-4 border ${modelInfo?.all_ready ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
        <p className={`text-sm font-bold flex items-center gap-2 ${modelInfo?.all_ready ? 'text-emerald-700' : 'text-amber-700'}`}>
          <ShieldCheck className="w-4 h-4" />
          {modelInfo?.all_ready ? 'All models are trained and ready for inference.' : 'Some models are missing. Retrain before running analyses.'}
        </p>
      </div>

      {/* Model Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { key: 'naive_bayes', name: 'Naive Bayes', icon: <BarChart3 className="w-5 h-5" />, weight: weights.naive_bayes },
          { key: 'lstm', name: 'LSTM', icon: <Cpu className="w-5 h-5" />, weight: weights.lstm },
          { key: 'distilbert', name: 'DistilBERT', icon: <Brain className="w-5 h-5" />, weight: weights.distilbert },
        ].map(m => {
          const available = models[m.key];
          const met = metrics[m.key] || {};
          return (
            <div key={m.key} className="glass rounded-2xl p-5 border border-slate-200">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-brand-50 rounded-lg text-brand-600">{m.icon}</div>
                  <div>
                    <p className="font-bold text-slate-900">{m.name}</p>
                    <p className="text-xs text-slate-500">Weight: {((m.weight || 0) * 100).toFixed(0)}%</p>
                  </div>
                </div>
                <span className={`w-3 h-3 rounded-full ${available ? 'bg-emerald-500' : 'bg-red-400'}`} />
              </div>
              {met.accuracy !== undefined ? (
                <div className="space-y-2">
                  {[
                    { label: 'Accuracy', value: met.accuracy },
                    { label: 'Precision', value: met.precision },
                    { label: 'Recall', value: met.recall },
                    { label: 'F1 Score', value: met.f1_score },
                  ].map(s => (
                    <div key={s.label} className="flex justify-between items-center">
                      <span className="text-xs text-slate-500">{s.label}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-24 bg-slate-200 rounded-full h-1.5">
                          <div className="bg-brand-500 h-1.5 rounded-full" style={{ width: `${(s.value || 0) * 100}%` }} />
                        </div>
                        <span className="text-xs font-bold text-slate-700 w-12 text-right">{((s.value || 0) * 100).toFixed(1)}%</span>
                      </div>
                    </div>
                  ))}
                  {met.training_time && (
                    <p className="text-xs text-slate-400 mt-2">Trained in {met.training_time}s</p>
                  )}
                </div>
              ) : (
                <p className="text-xs text-slate-400">No metrics available</p>
              )}
            </div>
          );
        })}
      </div>

      {/* Quick Test */}
      <div className="glass rounded-2xl p-6 border border-slate-200">
        <h3 className="text-lg font-bold text-slate-900 mb-4">Quick Model Test</h3>
        <form onSubmit={handleTest} className="space-y-4">
          <textarea className="w-full h-24 border border-slate-300 rounded-xl p-3 text-sm resize-none" placeholder="Enter text to test against the ML models..."
            value={testText} onChange={e => setTestText(e.target.value)} />
          <button type="submit" disabled={testing || !testText.trim()}
            className="px-6 py-2.5 bg-brand-600 text-white rounded-xl text-sm font-bold hover:bg-brand-700 disabled:opacity-50">
            {testing ? 'Analyzing...' : 'Test Prediction'}
          </button>
        </form>
        {testResult && (
          <div className="mt-4 p-4 bg-slate-50 rounded-xl space-y-2">
            <div className="flex items-center gap-3">
              <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                testResult.classification === 'FAKE' ? 'bg-red-100 text-red-700' :
                testResult.classification === 'REAL' ? 'bg-emerald-100 text-emerald-700' :
                'bg-amber-100 text-amber-700'
              }`}>{testResult.classification}</span>
              <span className="text-sm font-bold text-slate-700">Credibility: {testResult.credibility_score}%</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="bg-white p-2 rounded-lg border"><span className="text-slate-500">NB:</span> <span className="font-bold">{(testResult.naive_bayes_score * 100).toFixed(1)}%</span></div>
              <div className="bg-white p-2 rounded-lg border"><span className="text-slate-500">LSTM:</span> <span className="font-bold">{(testResult.lstm_score * 100).toFixed(1)}%</span></div>
              <div className="bg-white p-2 rounded-lg border"><span className="text-slate-500">BERT:</span> <span className="font-bold">{(testResult.distilbert_score * 100).toFixed(1)}%</span></div>
            </div>
            <div className="text-xs text-slate-600">
              {testResult.flagging_reasons?.map((r, i) => <p key={i} className="mt-1">- {r}</p>)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Alert Rules ───────────────────────────────────────────────────
function AlertRulesPanel() {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: '', credibility_threshold: 30, is_active: true });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchRules = async () => {
    setLoading(true);
    try {
      const res = await adminAPI.getAlertRules();
      setRules(res.data.data || []);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchRules(); }, []);

  const save = async (payload) => {
    setSaving(true);
    setError('');
    try {
      await adminAPI.updateAlertRules(payload);
      await fetchRules();
      return true;
    } catch (err) {
      const data = err.response?.data?.error;
      setError(typeof data === 'object' ? JSON.stringify(data) : (data || 'Failed to save rule.'));
      return false;
    } finally { setSaving(false); }
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { setError('Rule name is required.'); return; }
    const ok = await save({
      name: form.name.trim(),
      credibility_threshold: Number(form.credibility_threshold),
      is_active: form.is_active,
    });
    if (ok) setForm({ name: '', credibility_threshold: 30, is_active: true });
  };

  const toggleActive = (rule) => save({
    name: rule.name,
    credibility_threshold: rule.credibility_threshold,
    is_active: !rule.is_active,
  });

  const editRule = (rule) => setForm({
    name: rule.name,
    credibility_threshold: rule.credibility_threshold,
    is_active: rule.is_active,
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2"><SlidersHorizontal className="w-6 h-6 text-brand-600" /> Alert Rules</h2>
        <p className="text-sm text-slate-500 mt-0.5">Global thresholds that decide when an analysis raises an alert.</p>
      </div>

      <div className="rounded-xl bg-blue-50 border border-blue-200 px-4 py-3 text-xs text-blue-800">
        An alert is raised when an analysis's <strong>credibility score</strong> falls at or below a rule's threshold. Lower threshold = fewer, higher-severity alerts.
      </div>

      {/* Add / update form */}
      <form onSubmit={submit} className="glass rounded-2xl p-5 grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
        <div className="sm:col-span-5">
          <label className="text-xs font-bold text-slate-600 mb-1 block">Rule name</label>
          <input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            placeholder="e.g. High-risk content"
            className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none" />
        </div>
        <div className="sm:col-span-3">
          <label className="text-xs font-bold text-slate-600 mb-1 block">Credibility threshold (%)</label>
          <input type="number" min={0} max={100} value={form.credibility_threshold}
            onChange={(e) => setForm((p) => ({ ...p, credibility_threshold: e.target.value }))}
            className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none" />
        </div>
        <div className="sm:col-span-2">
          <label className="text-xs font-bold text-slate-600 mb-1 block">Active</label>
          <label className="inline-flex items-center gap-2 h-[38px]">
            <input type="checkbox" checked={form.is_active}
              onChange={(e) => setForm((p) => ({ ...p, is_active: e.target.checked }))}
              className="w-4 h-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500" />
            <span className="text-sm text-slate-600">{form.is_active ? 'On' : 'Off'}</span>
          </label>
        </div>
        <div className="sm:col-span-2">
          <button type="submit" disabled={saving}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg font-bold text-sm shadow-sm disabled:opacity-50">
            {saving ? '…' : <><Save className="w-4 h-4" /> Save</>}
          </button>
        </div>
        {error && <p className="sm:col-span-12 text-xs text-red-600 font-medium">{error}</p>}
      </form>

      {loading ? (
        <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-2 border-brand-500 border-t-transparent" /></div>
      ) : rules.length > 0 ? (
        <div className="glass rounded-2xl shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-[11px] font-bold text-slate-500 uppercase">Rule</th>
                <th className="px-6 py-3 text-right text-[11px] font-bold text-slate-500 uppercase">Threshold</th>
                <th className="px-6 py-3 text-left text-[11px] font-bold text-slate-500 uppercase">Status</th>
                <th className="px-6 py-3 text-right text-[11px] font-bold text-slate-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {rules.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50/60">
                  <td className="px-6 py-4 text-sm font-bold text-slate-900">{r.name}</td>
                  <td className="px-6 py-4 text-sm text-right tabular-nums">≤ {r.credibility_threshold}%</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-bold border ${r.is_active ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${r.is_active ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                      {r.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right whitespace-nowrap">
                    <button onClick={() => editRule(r)} className="text-xs font-bold text-brand-600 hover:text-brand-700 px-2 py-1 rounded hover:bg-brand-50">Edit</button>
                    <button onClick={() => toggleActive(r)} className="text-xs font-bold text-slate-600 hover:text-slate-800 px-2 py-1 rounded hover:bg-slate-100">{r.is_active ? 'Disable' : 'Enable'}</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="glass rounded-2xl p-12 text-center">
          <SlidersHorizontal className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">No alert rules yet. Add one above.</p>
        </div>
      )}
    </div>
  );
}

// ─── Main Admin Dashboard ──────────────────────────────────────────
const AdminDashboard = () => {
  const location = useLocation();
  const currentPath = location.pathname.split('/admin/')[1] || 'health';

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2">
        <AlertTriangle className="w-5 h-5 text-red-500" />
        <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-1 rounded-full">ADMIN</span>
      </div>

      {currentPath === 'health' && <HealthPanel />}
      {currentPath === 'statistics' && <StatisticsPanel />}
      {currentPath === 'users' && <UsersPanel />}
      {currentPath === 'organizations' && <OrganizationsPanel />}
      {currentPath === 'datasets' && <DatasetsPanel />}
      {currentPath === 'alert-rules' && <AlertRulesPanel />}
      {currentPath === 'audit' && <AuditPanel />}
      {currentPath === 'models' && <MLModelsPanel />}
    </div>
  );
};

export default AdminDashboard;
