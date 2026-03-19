import { useState, useEffect } from 'react';
import { User, Lock, Bell, Key, Save, Plus, Trash2, CheckCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { usersAPI, alertsAPI } from '../services/api';

const SettingsPage = () => {
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

  useEffect(() => {
    if (user) {
      setProfileForm({ first_name: user.first_name || '', last_name: user.last_name || '', organization: user.organization || '' });
    }
  }, [user]);

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
      showMsg('Profile updated.');
    } catch (err) {
      showErr(err.response?.data?.error || 'Update failed.');
    }
  };

  const handlePasswordChange = async () => {
    if (passwordForm.new_password !== passwordForm.confirm) { showErr('Passwords do not match.'); return; }
    try {
      await usersAPI.changePassword({ old_password: passwordForm.old_password, new_password: passwordForm.new_password });
      setPasswordForm({ old_password: '', new_password: '', confirm: '' });
      showMsg('Password changed.');
    } catch (err) {
      const msg = err.response?.data?.error;
      showErr(typeof msg === 'object' ? JSON.stringify(msg) : msg || 'Password change failed.');
    }
  };

  const handleNotifSave = async () => {
    try {
      await alertsAPI.updateSettings(notifPrefs);
      showMsg('Notification preferences saved.');
    } catch { showErr('Failed to save preferences.'); }
  };

  const handleCreateKey = async () => {
    if (!newKeyName) return;
    try {
      const res = await usersAPI.createAPIKey(newKeyName);
      setNewKeyValue(res.data.data.key);
      setNewKeyName('');
      usersAPI.getAPIKeys().then(r => setApiKeys(r.data.data || []));
      showMsg('API key created. Copy it now — it won\'t be shown again.');
    } catch (err) {
      showErr(err.response?.data?.error || 'Failed to create key.');
    }
  };

  const handleDeleteKey = async (id) => {
    try {
      await usersAPI.deleteAPIKey(id);
      setApiKeys(prev => prev.filter(k => k.id !== id));
      showMsg('API key revoked.');
    } catch { showErr('Failed to revoke key.'); }
  };

  const tabs = [
    { id: 'profile', label: 'Profile', icon: <User className="w-4 h-4" /> },
    { id: 'security', label: 'Security', icon: <Lock className="w-4 h-4" /> },
    { id: 'notifications', label: 'Notifications', icon: <Bell className="w-4 h-4" /> },
    { id: 'apikeys', label: 'API Keys', icon: <Key className="w-4 h-4" /> },
  ];

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Settings</h1>

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
              <label className="block text-sm font-bold text-slate-700 mb-1">First Name</label>
              <input type="text" className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm focus:ring-brand-500 focus:border-brand-500"
                value={profileForm.first_name} onChange={(e) => setProfileForm({ ...profileForm, first_name: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Last Name</label>
              <input type="text" className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm focus:ring-brand-500 focus:border-brand-500"
                value={profileForm.last_name} onChange={(e) => setProfileForm({ ...profileForm, last_name: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Organization</label>
              <input type="text" className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm focus:ring-brand-500 focus:border-brand-500"
                value={profileForm.organization} onChange={(e) => setProfileForm({ ...profileForm, organization: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Email</label>
              <input type="email" disabled className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm bg-slate-50 text-slate-500" value={user?.email || ''} />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Role</label>
              <input type="text" disabled className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm bg-slate-50 text-slate-500 capitalize" value={user?.role || ''} />
            </div>
            <button onClick={handleProfileSave} className="flex items-center gap-2 px-6 py-2.5 bg-brand-600 text-white rounded-xl font-bold hover:bg-brand-700 shadow-md">
              <Save className="w-4 h-4" /> Save Changes
            </button>
          </div>
        )}

        {/* Security Tab */}
        {activeTab === 'security' && (
          <div className="space-y-5 max-w-lg">
            <h3 className="text-lg font-bold text-slate-900">Change Password</h3>
            <input type="password" placeholder="Current Password"
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm focus:ring-brand-500 focus:border-brand-500"
              value={passwordForm.old_password} onChange={(e) => setPasswordForm({ ...passwordForm, old_password: e.target.value })} />
            <input type="password" placeholder="New Password"
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm focus:ring-brand-500 focus:border-brand-500"
              value={passwordForm.new_password} onChange={(e) => setPasswordForm({ ...passwordForm, new_password: e.target.value })} />
            <input type="password" placeholder="Confirm New Password"
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm focus:ring-brand-500 focus:border-brand-500"
              value={passwordForm.confirm} onChange={(e) => setPasswordForm({ ...passwordForm, confirm: e.target.value })} />
            <button onClick={handlePasswordChange} className="flex items-center gap-2 px-6 py-2.5 bg-brand-600 text-white rounded-xl font-bold hover:bg-brand-700 shadow-md">
              <Lock className="w-4 h-4" /> Update Password
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
                <p className="text-sm font-bold text-slate-700">Email on high-risk detection</p>
                <p className="text-xs text-slate-500">Get notified when content is flagged as high risk</p>
              </div>
            </label>
            <label className="flex items-center gap-3 p-4 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50">
              <input type="checkbox" className="rounded text-brand-600" checked={notifPrefs.email_on_analysis_complete}
                onChange={(e) => setNotifPrefs({ ...notifPrefs, email_on_analysis_complete: e.target.checked })} />
              <div>
                <p className="text-sm font-bold text-slate-700">Email on analysis complete</p>
                <p className="text-xs text-slate-500">Get notified when an analysis finishes</p>
              </div>
            </label>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Alert Threshold Score</label>
              <input type="number" min="0" max="100" className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm"
                value={notifPrefs.alert_threshold} onChange={(e) => setNotifPrefs({ ...notifPrefs, alert_threshold: parseInt(e.target.value) || 0 })} />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Email Frequency</label>
              <select className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm"
                value={notifPrefs.email_frequency} onChange={(e) => setNotifPrefs({ ...notifPrefs, email_frequency: e.target.value })}>
                <option value="immediate">Immediate</option>
                <option value="daily">Daily Digest</option>
                <option value="weekly">Weekly Digest</option>
              </select>
            </div>
            <button onClick={handleNotifSave} className="flex items-center gap-2 px-6 py-2.5 bg-brand-600 text-white rounded-xl font-bold hover:bg-brand-700 shadow-md">
              <Save className="w-4 h-4" /> Save Preferences
            </button>
          </div>
        )}

        {/* API Keys Tab */}
        {activeTab === 'apikeys' && (
          <div className="space-y-5">
            <div className="flex gap-3 max-w-lg">
              <input type="text" placeholder="Key name (e.g. 'Production')" className="flex-1 rounded-xl border border-slate-300 px-4 py-3 text-sm"
                value={newKeyName} onChange={(e) => setNewKeyName(e.target.value)} />
              <button onClick={handleCreateKey} className="flex items-center gap-2 px-5 py-2.5 bg-brand-600 text-white rounded-xl font-bold hover:bg-brand-700 shadow-md">
                <Plus className="w-4 h-4" /> Generate
              </button>
            </div>

            {newKeyValue && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                <p className="text-sm font-bold text-emerald-800 mb-2 flex items-center gap-2"><CheckCircle className="w-4 h-4" /> New API Key (copy now):</p>
                <code className="text-sm bg-white px-3 py-2 rounded-lg border border-emerald-200 block break-all select-all">{newKeyValue}</code>
              </div>
            )}

            {apiKeys.length > 0 ? (
              <div className="space-y-3">
                {apiKeys.map((key) => (
                  <div key={key.id} className="flex items-center justify-between p-4 rounded-xl border border-slate-200 hover:bg-slate-50">
                    <div>
                      <p className="font-bold text-slate-900 text-sm">{key.name}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{key.prefix}... | Created: {new Date(key.created_at).toLocaleDateString()}
                        {key.last_used_at && ` | Last used: ${new Date(key.last_used_at).toLocaleDateString()}`}
                      </p>
                    </div>
                    <button onClick={() => handleDeleteKey(key.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg" title="Revoke">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-400 text-center py-8">No API keys. Generate one to enable programmatic access.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SettingsPage;
