import { useState, useEffect } from 'react';
import { useLocation, useNavigate, Routes, Route } from 'react-router-dom';
import { Activity, Users, Database, FileText, CheckCircle, Search, Upload, AlertTriangle, RefreshCw } from 'lucide-react';
import { adminAPI, usersAPI } from '../../services/api';

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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-extrabold text-slate-900">System Health</h2>
        <button onClick={fetchHealth} className="flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-xl text-sm font-bold hover:bg-slate-200">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {Object.entries(services).map(([name, status]) => (
          <div key={name} className="glass rounded-2xl p-5 flex items-center gap-4">
            <div className={`w-3 h-3 rounded-full ${status === 'healthy' ? 'bg-emerald-500' : status === 'unhealthy' ? 'bg-red-500' : 'bg-amber-500'}`} />
            <div>
              <p className="text-sm font-bold text-slate-900 capitalize">{name}</p>
              <p className="text-xs text-slate-500 capitalize">{status}</p>
            </div>
          </div>
        ))}
      </div>

      {metrics && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Total Users', value: metrics.total_users },
            { label: 'Total Articles', value: metrics.total_articles },
            { label: 'Completed Analyses', value: metrics.completed_analyses },
            { label: 'Open Alerts', value: metrics.open_alerts },
          ].map((m, i) => (
            <div key={i} className="glass rounded-2xl p-5 text-center">
              <p className="text-2xl font-bold text-slate-900">{m.value}</p>
              <p className="text-xs text-slate-500 font-medium mt-1">{m.label}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── User Management ───────────────────────────────────────────────
function UsersPanel() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await usersAPI.listUsers({ search });
      setUsers(res.data.data?.results || res.data.data || []);
    } catch { setUsers([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleRoleChange = async (userId, role) => {
    try {
      await usersAPI.updateUserRole(userId, role);
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role } : u));
    } catch { /* ignore */ }
  };

  const handleDeactivate = async (userId) => {
    if (!confirm('Deactivate this user?')) return;
    try {
      await usersAPI.deactivateUser(userId);
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_active: false } : u));
    } catch { /* ignore */ }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-extrabold text-slate-900">User Management</h2>

      <form onSubmit={(e) => { e.preventDefault(); fetchUsers(); }} className="relative max-w-md">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input type="text" placeholder="Search users..." className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-sm"
          value={search} onChange={(e) => setSearch(e.target.value)} />
      </form>

      {loading ? (
        <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-2 border-brand-500 border-t-transparent" /></div>
      ) : (
        <div className="glass rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">User</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Role</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Joined</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/50">
                    <td className="px-6 py-4">
                      <p className="text-sm font-bold text-slate-900">{u.full_name || u.email}</p>
                      <p className="text-xs text-slate-500">{u.email}</p>
                    </td>
                    <td className="px-6 py-4">
                      <select className="rounded-lg border border-slate-300 py-1 px-2 text-xs font-bold capitalize"
                        value={u.role} onChange={(e) => handleRoleChange(u.id, e.target.value)}>
                        <option value="citizen">Citizen</option>
                        <option value="journalist">Journalist</option>
                        <option value="government">Government</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-bold ${u.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                        {u.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500">{new Date(u.created_at).toLocaleDateString()}</td>
                    <td className="px-6 py-4 text-right">
                      {u.is_active && (
                        <button onClick={() => handleDeactivate(u.id)} className="text-xs font-bold text-red-600 hover:text-red-700">Deactivate</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {users.length === 0 && <p className="text-center text-slate-400 py-8 text-sm">No users found.</p>}
        </div>
      )}
    </div>
  );
}

// ─── Dataset Manager ───────────────────────────────────────────────
function DatasetsPanel() {
  const [datasets, setDatasets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    adminAPI.getDatasets().then(res => setDatasets(res.data.data || [])).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('name', file.name.replace(/\.[^.]+$/, ''));
      fd.append('description', `Uploaded on ${new Date().toLocaleDateString()}`);
      fd.append('file', file);
      const res = await adminAPI.uploadDataset(fd);
      setDatasets(prev => [res.data.data, ...prev]);
    } catch { /* ignore */ }
    finally { setUploading(false); }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-extrabold text-slate-900">Dataset Manager</h2>
        <label className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-xl font-bold cursor-pointer hover:bg-brand-700 shadow-md">
          <Upload className="w-4 h-4" /> {uploading ? 'Uploading...' : 'Upload Dataset'}
          <input type="file" className="hidden" accept=".csv,.json,.txt" onChange={handleUpload} disabled={uploading} />
        </label>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-2 border-brand-500 border-t-transparent" /></div>
      ) : datasets.length > 0 ? (
        <div className="space-y-3">
          {datasets.map((ds) => (
            <div key={ds.id} className="glass rounded-2xl p-5 flex items-center justify-between">
              <div>
                <p className="font-bold text-slate-900">{ds.name}</p>
                <p className="text-xs text-slate-500 mt-0.5">{ds.description} | Uploaded by: {ds.uploaded_by_email || 'system'} | {new Date(ds.created_at).toLocaleDateString()}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-full font-bold">{ds.record_count} records</span>
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
      {currentPath === 'users' && <UsersPanel />}
      {currentPath === 'datasets' && <DatasetsPanel />}
      {currentPath === 'audit' && <AuditPanel />}
    </div>
  );
};

export default AdminDashboard;
