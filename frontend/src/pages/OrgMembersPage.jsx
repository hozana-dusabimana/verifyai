import { useState, useEffect, useCallback } from 'react';
import { useTranslation, Trans } from 'react-i18next';
import { Building2, Users, UserPlus, Search, Newspaper, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { orgAPI } from '../services/api';
import { roleLabel, roleLabelKey } from '../utils/roles';
import Modal from '../components/Modal';

const ROLE_BADGES = {
  citizen:    'bg-slate-100 text-slate-700  border-slate-200',
  journalist: 'bg-amber-100 text-amber-800  border-amber-200',
  government: 'bg-blue-100  text-blue-800   border-blue-200',
  admin:      'bg-purple-100 text-purple-800 border-purple-200',
};

function CreateMemberModal({ open, orgName, onClose, onCreated }) {
  const { t } = useTranslation();
  const [form, setForm] = useState({
    first_name: '', last_name: '', email: '',
    role: 'journalist', password: '',  // organizations are made up of journalists
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (form.password.length < 8) {
      setError(t('orgMembers.errors.passwordTooShort'));
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      const res = await orgAPI.createMember(form);
      onCreated(res.data.data);
      onClose();
    } catch (err) {
      const data = err.response?.data?.error;
      if (typeof data === 'object') {
        setError(Object.entries(data).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`).join(' | '));
      } else {
        setError(data || t('orgMembers.errors.createMember'));
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
      title={t('orgMembers.modal.title')}
      subtitle={<Trans i18nKey="orgMembers.modal.subtitle" values={{ orgName }} components={{ bold: <span className="font-bold text-slate-700" /> }} />}
    >
      <form onSubmit={submit} className="p-6 space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-xl text-sm font-medium flex items-start gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-bold text-slate-600 mb-1 block">{t('orgMembers.modal.firstName')}</label>
            <input name="first_name" required value={form.first_name} onChange={handleChange}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none" />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-600 mb-1 block">{t('orgMembers.modal.lastName')}</label>
            <input name="last_name" required value={form.last_name} onChange={handleChange}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none" />
          </div>
        </div>

        <div>
          <label className="text-xs font-bold text-slate-600 mb-1 block">{t('orgMembers.modal.email')}</label>
          <input name="email" type="email" required value={form.email} onChange={handleChange}
            className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none" />
        </div>

        <div>
          <label className="text-xs font-bold text-slate-600 mb-1 block">{t('orgMembers.modal.role')}</label>
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg border-2 border-brand-500 bg-brand-50 text-brand-700 text-sm font-bold">
            <Newspaper className="w-4 h-4" /> {t(roleLabelKey('journalist'), { defaultValue: roleLabel('journalist') })}
          </div>
          <p className="text-[11px] text-slate-500 mt-1.5">
            {t('orgMembers.modal.roleNote')}
          </p>
        </div>

        <div>
          <label className="text-xs font-bold text-slate-600 mb-1 block">{t('orgMembers.modal.password')}</label>
          <input name="password" type="text" required minLength={8} value={form.password} onChange={handleChange}
            className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-mono focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none" />
          <p className="text-[11px] text-slate-500 mt-1">{t('orgMembers.modal.passwordNote')}</p>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100 rounded-lg">{t('common.cancel')}</button>
          <button type="submit" disabled={submitting}
            className="px-4 py-2 text-sm font-bold text-white bg-brand-600 hover:bg-brand-700 rounded-lg shadow-sm disabled:opacity-50 inline-flex items-center gap-2">
            {submitting ? t('orgMembers.adding') : <>{t('orgMembers.addMember')} <UserPlus className="w-4 h-4" /></>}
          </button>
        </div>
      </form>
    </Modal>
  );
}

const OrgMembersPage = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [error, setError] = useState('');

  const orgName = user?.organization || t('orgMembers.orgFallback');

  const fetchMembers = useCallback(async (term) => {
    setLoading(true);
    setError('');
    try {
      const res = await orgAPI.listMembers({ search: term });
      setMembers(res.data?.data || []);
    } catch (err) {
      const msg = err.response?.data?.error;
      setError(typeof msg === 'string' ? msg : t('orgMembers.errors.loadMembers'));
      setMembers([]);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => { fetchMembers(''); }, [fetchMembers]);

  const handleRoleChange = async (userId, role) => {
    try {
      await orgAPI.updateMemberRole(userId, role);
      setMembers((prev) => prev.map((m) => (m.id === userId ? { ...m, role } : m)));
    } catch { /* ignore */ }
  };

  const handleDeactivate = async (userId, name) => {
    if (!confirm(t('orgMembers.confirmDeactivate', { name }))) return;
    try {
      await orgAPI.deactivateMember(userId);
      setMembers((prev) => prev.map((m) => (m.id === userId ? { ...m, is_active: false } : m)));
    } catch { /* ignore */ }
  };

  const counts = members.reduce((acc, m) => {
    acc[m.role] = (acc[m.role] || 0) + 1;
    if (m.is_active) acc._active = (acc._active || 0) + 1;
    return acc;
  }, {});

  // Caller has no organization — show a helpful empty state instead of an error table
  if (error && /no organization/i.test(error)) {
    return (
      <div className="flex flex-col gap-6">
        <header>
          <p className="text-xs font-bold uppercase tracking-widest text-brand-600 mb-1 flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5" /> {t('orgMembers.eyebrow')}
          </p>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">{t('orgMembers.title')}</h1>
        </header>
        <div className="glass rounded-2xl py-16 px-6 text-center">
          <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-sm font-bold text-slate-800">{t('orgMembers.noOrg.title')}</p>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            <Trans i18nKey="orgMembers.noOrg.body" components={{ mono: <span className="font-mono" /> }} />
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-brand-600 mb-1 flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5" /> {orgName}
          </p>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">{t('orgMembers.title')}</h1>
          <p className="text-slate-500 font-medium mt-1">{t('orgMembers.subtitle')}</p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-bold shadow-md hover:shadow-lg transition-all w-fit">
          <UserPlus className="w-4 h-4" /> {t('orgMembers.addMember')}
        </button>
      </header>

      {error && !/no organization/i.test(error) && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm font-medium flex items-start gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Stats row */}
      {!loading && members.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="glass rounded-xl p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{t('orgMembers.stats.total')}</p>
            <p className="text-2xl font-extrabold text-slate-900 mt-1 tabular-nums">{members.length}</p>
          </div>
          <div className="glass rounded-xl p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-emerald-600">{t('orgMembers.stats.active')}</p>
            <p className="text-2xl font-extrabold text-slate-900 mt-1 tabular-nums">{counts._active || 0}</p>
          </div>
          <div className="glass rounded-xl p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-amber-700">{t('orgMembers.stats.journalists')}</p>
            <p className="text-2xl font-extrabold text-slate-900 mt-1 tabular-nums">{counts.journalist || 0}</p>
          </div>
          <div className="glass rounded-xl p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-blue-700">{t('orgMembers.stats.managers')}</p>
            <p className="text-2xl font-extrabold text-slate-900 mt-1 tabular-nums">{counts.government || 0}</p>
          </div>
        </div>
      )}

      <form onSubmit={(e) => { e.preventDefault(); fetchMembers(search); }} className="relative max-w-md">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input type="text" placeholder={t('orgMembers.searchPlaceholder')}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
          value={search} onChange={(e) => setSearch(e.target.value)} />
      </form>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-brand-500 border-t-transparent" />
        </div>
      ) : members.length === 0 ? (
        <div className="glass rounded-2xl py-16 px-6 text-center">
          <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-sm font-bold text-slate-800">{t('orgMembers.empty.title')}</p>
          <p className="text-xs text-slate-500 mt-1 mb-4">
            {search ? t('orgMembers.empty.tryDifferent') : t('orgMembers.empty.addFirst', { orgName })}
          </p>
          {!search && (
            <button onClick={() => setShowCreate(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-sm font-bold">
              <UserPlus className="w-4 h-4" /> {t('orgMembers.addMember')}
            </button>
          )}
        </div>
      ) : (
        <div className="glass rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">{t('orgMembers.table.member')}</th>
                  <th className="px-6 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">{t('orgMembers.table.role')}</th>
                  <th className="px-6 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">{t('orgMembers.table.status')}</th>
                  <th className="px-6 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">{t('orgMembers.table.joined')}</th>
                  <th className="px-6 py-3 text-right text-[11px] font-bold text-slate-500 uppercase tracking-wider">{t('orgMembers.table.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {members.map((m) => {
                  const isSelf = m.id === user?.id;
                  const isManageable = ['citizen', 'journalist'].includes(m.role);
                  return (
                    <tr key={m.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-bold text-sm flex-shrink-0">
                            {(m.first_name?.[0] || m.email[0] || '?').toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-slate-900 truncate">
                              {m.full_name?.trim() || m.email}
                              {isSelf && <span className="ml-2 text-[11px] font-bold text-brand-600 bg-brand-50 px-1.5 py-0.5 rounded">{t('orgMembers.you')}</span>}
                            </p>
                            <p className="text-xs text-slate-500 truncate">{m.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex px-2 py-0.5 rounded text-xs font-bold border capitalize ${ROLE_BADGES[m.role] || 'border-slate-300'}`}>
                            {t(roleLabelKey(m.role), { defaultValue: roleLabel(m.role) })}
                          </span>
                          {/* Legacy citizens can be converted to journalists to align the org */}
                          {m.role === 'citizen' && !isSelf && (
                            <button
                              onClick={() => handleRoleChange(m.id, 'journalist')}
                              className="text-[11px] font-bold text-brand-600 hover:text-brand-700 px-1.5 py-0.5 rounded hover:bg-brand-50"
                            >
                              {t('orgMembers.makeJournalist')}
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-bold border ${m.is_active ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${m.is_active ? 'bg-emerald-500' : 'bg-red-500'}`} />
                          {m.is_active ? t('orgMembers.statusActive') : t('orgMembers.statusInactive')}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500 tabular-nums">{new Date(m.created_at).toLocaleDateString()}</td>
                      <td className="px-6 py-4 text-right">
                        {m.is_active && isManageable && !isSelf && (
                          <button
                            onClick={() => handleDeactivate(m.id, m.full_name?.trim() || m.email)}
                            className="text-xs font-bold text-red-600 hover:text-red-700 px-2 py-1 rounded hover:bg-red-50"
                          >
                            {t('orgMembers.deactivate')}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <CreateMemberModal
        open={showCreate}
        orgName={orgName}
        onClose={() => setShowCreate(false)}
        onCreated={(newMember) => setMembers((prev) => [newMember, ...prev])}
      />
    </div>
  );
};

export default OrgMembersPage;
