import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { User, Lock, Bell, Key, Save, Plus, Trash2, CheckCircle, Copy, Terminal, Check } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { usersAPI, alertsAPI } from '../services/api';
import { roleLabelKey, roleLabel } from '../utils/roles';

// ─── API example builder ──────────────────────────────────────────────
const buildExamples = (baseUrl) => [
  {
    id: 'submit-text',
    titleKey: 'settings.apiKeys.examples.submitText.title',
    descriptionKey: 'settings.apiKeys.examples.submitText.description',
    method: 'POST',
    path: '/analysis/submit',
    snippets: {
      curl: `curl -X POST ${baseUrl}/analysis/submit \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "input_type": "text",
    "content": "Scientists confirm a new vaccine reduces infection rates by 95%...",
    "title": "Vaccine breakthrough study",
    "source_name": "example.com"
  }'`,
      js: `const res = await fetch('${baseUrl}/analysis/submit', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    input_type: 'text',
    content: 'Scientists confirm a new vaccine reduces infection rates by 95%...',
    title: 'Vaccine breakthrough study',
    source_name: 'example.com',
  }),
});
const { data } = await res.json();
console.log(data.id);  // analysis id to poll`,
      py: `import requests

res = requests.post(
    "${baseUrl}/analysis/submit",
    headers={"Authorization": "Bearer YOUR_API_KEY"},
    json={
        "input_type": "text",
        "content": "Scientists confirm a new vaccine reduces...",
        "title": "Vaccine breakthrough study",
        "source_name": "example.com",
    },
)
print(res.json()["data"]["id"])  # analysis id to poll`,
    },
  },
  {
    id: 'submit-url',
    titleKey: 'settings.apiKeys.examples.submitUrl.title',
    descriptionKey: 'settings.apiKeys.examples.submitUrl.description',
    method: 'POST',
    path: '/analysis/submit',
    snippets: {
      curl: `curl -X POST ${baseUrl}/analysis/submit \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "input_type": "url",
    "url": "https://example.com/news/article-123"
  }'`,
      js: `const res = await fetch('${baseUrl}/analysis/submit', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    input_type: 'url',
    url: 'https://example.com/news/article-123',
  }),
});
const { data } = await res.json();`,
      py: `import requests

res = requests.post(
    "${baseUrl}/analysis/submit",
    headers={"Authorization": "Bearer YOUR_API_KEY"},
    json={
        "input_type": "url",
        "url": "https://example.com/news/article-123",
    },
)
print(res.json()["data"])`,
    },
  },
  {
    id: 'get-result',
    titleKey: 'settings.apiKeys.examples.getResult.title',
    descriptionKey: 'settings.apiKeys.examples.getResult.description',
    method: 'GET',
    path: '/analysis/{id}',
    snippets: {
      curl: `curl ${baseUrl}/analysis/8f3e1c0a-1234-4abc-9def-0123456789ab \\
  -H "Authorization: Bearer YOUR_API_KEY"`,
      js: `const res = await fetch(
  '${baseUrl}/analysis/8f3e1c0a-1234-4abc-9def-0123456789ab',
  { headers: { 'Authorization': 'Bearer YOUR_API_KEY' } },
);
const { data } = await res.json();
console.log(data.classification, data.credibility_score);`,
      py: `import requests

res = requests.get(
    "${baseUrl}/analysis/8f3e1c0a-1234-4abc-9def-0123456789ab",
    headers={"Authorization": "Bearer YOUR_API_KEY"},
)
result = res.json()["data"]
print(result["classification"], result["credibility_score"])`,
    },
  },
  {
    id: 'history',
    titleKey: 'settings.apiKeys.examples.history.title',
    descriptionKey: 'settings.apiKeys.examples.history.description',
    method: 'GET',
    path: '/analysis/history',
    snippets: {
      curl: `curl "${baseUrl}/analysis/history?page=1&page_size=20" \\
  -H "Authorization: Bearer YOUR_API_KEY"`,
      js: `const res = await fetch(
  '${baseUrl}/analysis/history?page=1&page_size=20',
  { headers: { 'Authorization': 'Bearer YOUR_API_KEY' } },
);
const { data, meta } = await res.json();
console.log(\`\${data.length} of \${meta.count}\`);`,
      py: `import requests

res = requests.get(
    "${baseUrl}/analysis/history",
    headers={"Authorization": "Bearer YOUR_API_KEY"},
    params={"page": 1, "page_size": 20},
)
print(res.json()["data"])`,
    },
  },
];

const LANG_LABELS = { curl: 'cURL', js: 'JavaScript', py: 'Python' };
const METHOD_COLORS = {
  GET: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  POST: 'bg-blue-100 text-blue-700 border-blue-200',
  PUT: 'bg-amber-100 text-amber-700 border-amber-200',
  DELETE: 'bg-red-100 text-red-700 border-red-200',
};

function ApiExampleCard({ example, currentKey }) {
  const { t } = useTranslation();
  const [lang, setLang] = useState('curl');
  const [copied, setCopied] = useState(false);

  const code = useMemo(() => {
    const raw = example.snippets[lang];
    return currentKey ? raw.replaceAll('YOUR_API_KEY', currentKey) : raw;
  }, [example.snippets, lang, currentKey]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* ignore */ }
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100">
        <div className="flex items-center gap-2 mb-1.5">
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border tracking-wider ${METHOD_COLORS[example.method] || 'bg-slate-100 text-slate-700 border-slate-200'}`}>
            {example.method}
          </span>
          <code className="text-xs font-mono text-slate-700 font-semibold">{example.path}</code>
        </div>
        <p className="text-sm font-bold text-slate-900">{t(example.titleKey)}</p>
        <p className="text-xs text-slate-500 mt-1 leading-relaxed">{t(example.descriptionKey)}</p>
      </div>

      <div className="flex items-center justify-between px-3 py-2 bg-slate-50 border-b border-slate-100">
        <div className="flex gap-1">
          {Object.keys(example.snippets).map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => setLang(l)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-colors ${
                lang === l ? 'bg-white text-slate-900 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {LANG_LABELS[l]}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={copy}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold text-slate-600 hover:bg-white hover:text-slate-900 transition-colors"
        >
          {copied ? <><Check className="w-3 h-3 text-emerald-600" /> {t('settings.apiKeys.copied')}</> : <><Copy className="w-3 h-3" /> {t('settings.apiKeys.copy')}</>}
        </button>
      </div>

      <pre className="p-4 bg-slate-900 text-slate-100 text-xs font-mono leading-relaxed overflow-x-auto">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function ApiKeysTab({ apiKeys, newKeyName, setNewKeyName, newKeyValue, handleCreateKey, handleDeleteKey }) {
  const { t } = useTranslation();
  const baseUrl = useMemo(() => {
    const env = import.meta.env.VITE_API_URL;
    if (env && /^https?:/.test(env)) return env;
    if (typeof window !== 'undefined') {
      return `${window.location.origin}${env || '/api/v1'}`;
    }
    return env || '/api/v1';
  }, []);

  const examples = useMemo(() => buildExamples(baseUrl), [baseUrl]);

  return (
    <div className="space-y-8">
      {/* ─── Keys management ─────────────────────────────── */}
      <section className="space-y-4">
        <div>
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Key className="w-5 h-5 text-brand-600" /> {t('settings.apiKeys.yourKeys')}
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {t('settings.apiKeys.yourKeysDesc')}
          </p>
        </div>

        <div className="flex gap-3 max-w-lg">
          <input type="text" placeholder={t('settings.apiKeys.keyNamePlaceholder')}
            className="flex-1 rounded-xl border border-slate-300 px-4 py-3 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
            value={newKeyName} onChange={(e) => setNewKeyName(e.target.value)} />
          <button onClick={handleCreateKey}
            className="flex items-center gap-2 px-5 py-2.5 bg-brand-600 text-white rounded-xl font-bold hover:bg-brand-700 shadow-md">
            <Plus className="w-4 h-4" /> {t('settings.apiKeys.generate')}
          </button>
        </div>

        {newKeyValue && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
            <p className="text-sm font-bold text-emerald-800 mb-2 flex items-center gap-2">
              <CheckCircle className="w-4 h-4" /> {t('settings.apiKeys.newKeyNotice')}
            </p>
            <code className="text-sm bg-white px-3 py-2 rounded-lg border border-emerald-200 block break-all select-all font-mono">{newKeyValue}</code>
          </div>
        )}

        {apiKeys.length > 0 ? (
          <div className="space-y-3">
            {apiKeys.map((key) => (
              <div key={key.id} className="flex items-center justify-between p-4 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors">
                <div className="min-w-0">
                  <p className="font-bold text-slate-900 text-sm truncate">{key.name}</p>
                  <p className="text-xs text-slate-500 mt-0.5 font-mono">
                    {key.prefix}…  ·  {t('settings.apiKeys.createdOn', { date: new Date(key.created_at).toLocaleDateString() })}
                    {key.last_used_at && `  ·  ${t('settings.apiKeys.lastUsed', { date: new Date(key.last_used_at).toLocaleDateString() })}`}
                  </p>
                </div>
                <button onClick={() => handleDeleteKey(key.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg" title={t('settings.apiKeys.revoke')}>
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 px-6 border-2 border-dashed border-slate-200 rounded-xl">
            <Key className="w-7 h-7 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-700">{t('settings.apiKeys.emptyTitle')}</p>
            <p className="text-xs text-slate-500 mt-1">{t('settings.apiKeys.emptyDesc')}</p>
          </div>
        )}
      </section>

      {/* ─── Example requests ────────────────────────────── */}
      <section className="space-y-4 pt-2 border-t border-slate-200">
        <div>
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Terminal className="w-5 h-5 text-brand-600" /> {t('settings.apiKeys.exampleRequests')}
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {t('settings.apiKeys.exampleAuthPrefix')} <code className="px-1.5 py-0.5 rounded bg-slate-100 font-mono text-[11px]">Authorization: Bearer YOUR_API_KEY</code>.
            {' '}{t('settings.apiKeys.exampleBaseUrl')} <code className="px-1.5 py-0.5 rounded bg-slate-100 font-mono text-[11px]">{baseUrl}</code>
            {newKeyValue && <> · <span className="font-bold text-emerald-700">{t('settings.apiKeys.examplePrefilled')}</span></>}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {examples.map((ex) => (
            <ApiExampleCard key={ex.id} example={ex} currentKey={newKeyValue} />
          ))}
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 text-xs text-slate-600 leading-relaxed">
          <p className="font-bold text-slate-700 mb-1">{t('settings.apiKeys.responseEnvelope')}</p>
          All endpoints return <code className="px-1 rounded bg-white border border-slate-200 font-mono">{`{ success, data, error, meta? }`}</code>.
          On success, <code className="font-mono">data</code> contains the result; on error, <code className="font-mono">error</code> is a string or
          field-level object. List endpoints include <code className="font-mono">meta.count</code>, <code className="font-mono">meta.next</code>,
          and <code className="font-mono">meta.previous</code> for pagination.
        </div>
      </section>
    </div>
  );
}

const SettingsPage = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('profile');
  const { user, refreshProfile } = useAuth();
  const [profileForm, setProfileForm] = useState({ first_name: '', last_name: '', organization: '' });
  const [passwordForm, setPasswordForm] = useState({ old_password: '', new_password: '', confirm: '' });
  const [notifPrefs, setNotifPrefs] = useState({ email_on_high_risk: true, email_on_analysis_complete: false, alert_threshold: 30, email_frequency: 'immediate' });
  const [apiKeys, setApiKeys] = useState([]);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyValue, setNewKeyValue] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [syncedUserId, setSyncedUserId] = useState(null);

  // Sync the form when the user object first arrives (or changes identity)
  if (user && user.id !== syncedUserId) {
    setSyncedUserId(user.id);
    setProfileForm({
      first_name: user.first_name || '',
      last_name: user.last_name || '',
      organization: user.organization || '',
    });
  }

  useEffect(() => {
    if (activeTab === 'notifications') {
      alertsAPI.getSettings().then(res => { if (res.data.data) setNotifPrefs(res.data.data); }).catch(() => {});
    }
    if (activeTab === 'apikeys') {
      usersAPI.getAPIKeys().then(res => setApiKeys(res.data.data || [])).catch(() => {});
    }
  }, [activeTab]);

  const showMsg = (msg) => { setMessage(msg); setError(''); setTimeout(() => setMessage(''), 3000); };
  const showErr = (msg) => { setError(msg); setMessage(''); };

  const handleProfileSave = async () => {
    try {
      await usersAPI.updateProfile(profileForm);
      await refreshProfile();
      showMsg(t('settings.profile.updated'));
    } catch (err) {
      showErr(err.response?.data?.error || t('settings.profile.updateFailed'));
    }
  };

  const handlePasswordChange = async () => {
    if (passwordForm.new_password !== passwordForm.confirm) { showErr(t('settings.security.passwordsDoNotMatch')); return; }
    try {
      await usersAPI.changePassword({ old_password: passwordForm.old_password, new_password: passwordForm.new_password });
      setPasswordForm({ old_password: '', new_password: '', confirm: '' });
      showMsg(t('settings.security.passwordChanged'));
    } catch (err) {
      const msg = err.response?.data?.error;
      showErr(typeof msg === 'object' ? JSON.stringify(msg) : msg || t('settings.security.passwordChangeFailed'));
    }
  };

  const handleNotifSave = async () => {
    try {
      await alertsAPI.updateSettings(notifPrefs);
      showMsg(t('settings.notifications.preferencesSaved'));
    } catch { showErr(t('settings.notifications.preferencesFailed')); }
  };

  const handleCreateKey = async () => {
    if (!newKeyName) return;
    try {
      const res = await usersAPI.createAPIKey(newKeyName);
      setNewKeyValue(res.data.data.key);
      setNewKeyName('');
      usersAPI.getAPIKeys().then(r => setApiKeys(r.data.data || []));
      showMsg(t('settings.apiKeys.created'));
    } catch (err) {
      showErr(err.response?.data?.error || t('settings.apiKeys.createFailed'));
    }
  };

  const handleDeleteKey = async (id) => {
    try {
      await usersAPI.deleteAPIKey(id);
      setApiKeys(prev => prev.filter(k => k.id !== id));
      showMsg(t('settings.apiKeys.revoked'));
    } catch { showErr(t('settings.apiKeys.revokeFailed')); }
  };

  // Citizens are casual users — no programmatic API access.
  const isCitizen = user?.role === 'citizen';
  const tabs = [
    { id: 'profile', label: t('settings.tabs.profile'), icon: <User className="w-4 h-4" /> },
    { id: 'security', label: t('settings.tabs.security'), icon: <Lock className="w-4 h-4" /> },
    { id: 'notifications', label: t('settings.tabs.notifications'), icon: <Bell className="w-4 h-4" /> },
    ...(!isCitizen ? [{ id: 'apikeys', label: t('settings.tabs.apiKeys'), icon: <Key className="w-4 h-4" /> }] : []),
  ];

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">{t('settings.title')}</h1>

      {(message || error) && (
        <div className={`px-4 py-3 rounded-xl text-sm font-medium ${message ? 'bg-emerald-50 border border-emerald-200 text-emerald-700' : 'bg-red-50 border border-red-200 text-red-700'}`}>
          {message || error}
        </div>
      )}

      <div className="flex gap-2 overflow-x-auto pb-1">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-colors ${
              activeTab === t.id ? 'bg-brand-600 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      <div className="glass rounded-2xl p-6 shadow-sm">
        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div className="space-y-5 max-w-lg">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">{t('settings.profile.firstName')}</label>
              <input type="text" className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm focus:ring-brand-500 focus:border-brand-500"
                value={profileForm.first_name} onChange={(e) => setProfileForm({ ...profileForm, first_name: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">{t('settings.profile.lastName')}</label>
              <input type="text" className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm focus:ring-brand-500 focus:border-brand-500"
                value={profileForm.last_name} onChange={(e) => setProfileForm({ ...profileForm, last_name: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">{t('settings.profile.organization')}</label>
              <input type="text" className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm focus:ring-brand-500 focus:border-brand-500"
                value={profileForm.organization} onChange={(e) => setProfileForm({ ...profileForm, organization: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">{t('settings.profile.email')}</label>
              <input type="email" disabled className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm bg-slate-50 text-slate-500" value={user?.email || ''} />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">{t('settings.profile.role')}</label>
              <input type="text" disabled className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm bg-slate-50 text-slate-500 capitalize" value={t(roleLabelKey(user?.role), { defaultValue: roleLabel(user?.role) })} />
            </div>
            <button onClick={handleProfileSave} className="flex items-center gap-2 px-6 py-2.5 bg-brand-600 text-white rounded-xl font-bold hover:bg-brand-700 shadow-md">
              <Save className="w-4 h-4" /> {t('settings.profile.saveChanges')}
            </button>
          </div>
        )}

        {/* Security Tab */}
        {activeTab === 'security' && (
          <div className="space-y-5 max-w-lg">
            <h3 className="text-lg font-bold text-slate-900">{t('settings.security.changePassword')}</h3>
            <input type="password" placeholder={t('settings.security.currentPassword')}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm focus:ring-brand-500 focus:border-brand-500"
              value={passwordForm.old_password} onChange={(e) => setPasswordForm({ ...passwordForm, old_password: e.target.value })} />
            <input type="password" placeholder={t('settings.security.newPassword')}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm focus:ring-brand-500 focus:border-brand-500"
              value={passwordForm.new_password} onChange={(e) => setPasswordForm({ ...passwordForm, new_password: e.target.value })} />
            <input type="password" placeholder={t('settings.security.confirmNewPassword')}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm focus:ring-brand-500 focus:border-brand-500"
              value={passwordForm.confirm} onChange={(e) => setPasswordForm({ ...passwordForm, confirm: e.target.value })} />
            <button onClick={handlePasswordChange} className="flex items-center gap-2 px-6 py-2.5 bg-brand-600 text-white rounded-xl font-bold hover:bg-brand-700 shadow-md">
              <Lock className="w-4 h-4" /> {t('settings.security.updatePassword')}
            </button>
          </div>
        )}

        {/* Notifications Tab */}
        {activeTab === 'notifications' && (
          <div className="space-y-5 max-w-lg">
            <label className="flex items-center gap-3 p-4 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50">
              <input type="checkbox" className="rounded text-brand-600" checked={notifPrefs.email_on_high_risk}
                onChange={(e) => setNotifPrefs({ ...notifPrefs, email_on_high_risk: e.target.checked })} />
              <div>
                <p className="text-sm font-bold text-slate-700">{t('settings.notifications.emailOnHighRisk')}</p>
                <p className="text-xs text-slate-500">{t('settings.notifications.emailOnHighRiskDesc')}</p>
              </div>
            </label>
            <label className="flex items-center gap-3 p-4 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50">
              <input type="checkbox" className="rounded text-brand-600" checked={notifPrefs.email_on_analysis_complete}
                onChange={(e) => setNotifPrefs({ ...notifPrefs, email_on_analysis_complete: e.target.checked })} />
              <div>
                <p className="text-sm font-bold text-slate-700">{t('settings.notifications.emailOnAnalysisComplete')}</p>
                <p className="text-xs text-slate-500">{t('settings.notifications.emailOnAnalysisCompleteDesc')}</p>
              </div>
            </label>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">{t('settings.notifications.alertThreshold')}</label>
              <input type="number" min="0" max="100" className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm"
                value={notifPrefs.alert_threshold} onChange={(e) => setNotifPrefs({ ...notifPrefs, alert_threshold: parseInt(e.target.value) || 0 })} />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">{t('settings.notifications.emailFrequency')}</label>
              <select className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm"
                value={notifPrefs.email_frequency} onChange={(e) => setNotifPrefs({ ...notifPrefs, email_frequency: e.target.value })}>
                <option value="immediate">{t('settings.notifications.frequencyImmediate')}</option>
                <option value="daily">{t('settings.notifications.frequencyDaily')}</option>
                <option value="weekly">{t('settings.notifications.frequencyWeekly')}</option>
              </select>
            </div>
            <button onClick={handleNotifSave} className="flex items-center gap-2 px-6 py-2.5 bg-brand-600 text-white rounded-xl font-bold hover:bg-brand-700 shadow-md">
              <Save className="w-4 h-4" /> {t('settings.notifications.savePreferences')}
            </button>
          </div>
        )}

        {/* API Keys Tab */}
        {activeTab === 'apikeys' && !isCitizen && <ApiKeysTab
          apiKeys={apiKeys}
          newKeyName={newKeyName}
          setNewKeyName={setNewKeyName}
          newKeyValue={newKeyValue}
          handleCreateKey={handleCreateKey}
          handleDeleteKey={handleDeleteKey}
        />}
      </div>
    </div>
  );
};

export default SettingsPage;
