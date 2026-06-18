import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Bell, ShieldAlert, CheckCircle, Mail, ArrowRight, Sliders, EyeOff } from 'lucide-react';
import { alertsAPI, newsfeedAPI } from '../services/api';

const AlertsPage = () => {
  const { t } = useTranslation();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [showPrefs, setShowPrefs] = useState(false);
  const [prefs, setPrefs] = useState({
    email_on_high_risk: true,
    email_on_analysis_complete: false,
    alert_threshold: 30,
    email_frequency: 'immediate',
  });

  const fetchAlerts = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterStatus) params.status = filterStatus;
      const res = await alertsAPI.list(params);
      setAlerts(res.data.data || []);
    } catch {
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  }, [filterStatus]);

  useEffect(() => { fetchAlerts(); }, [fetchAlerts]);

  useEffect(() => {
    alertsAPI.getSettings().then(res => {
      if (res.data.data) setPrefs(res.data.data);
    }).catch(() => {});
  }, []);

  const handleResolve = async (id) => {
    try {
      await alertsAPI.resolve(id);
      setAlerts(prev => prev.map(a => a.id === id ? { ...a, status: 'resolved' } : a));
    } catch { /* ignore */ }
  };

  const handleEscalate = async (id) => {
    try {
      await alertsAPI.escalate(id);
      setAlerts(prev => prev.map(a => a.id === id ? { ...a, status: 'escalated' } : a));
    } catch { /* ignore */ }
  };

  const handleDismiss = async (id) => {
    try {
      await alertsAPI.dismiss(id);
      setAlerts(prev => prev.filter(a => a.id !== id));
    } catch { /* ignore */ }
  };

  const handleUnpublish = async (alertItem) => {
    if (!window.confirm(t('alerts.unpublishConfirm'))) return;
    try {
      await newsfeedAPI.unpublish(alertItem.news_post_id);
      // Backend also resolves the related alerts; mirror that locally.
      setAlerts(prev => prev.map(a => a.news_post_id === alertItem.news_post_id
        ? { ...a, news_post_status: 'rejected', status: a.status === 'open' || a.status === 'escalated' ? 'resolved' : a.status }
        : a));
    } catch { /* ignore */ }
  };

  const handleSavePrefs = async () => {
    try {
      await alertsAPI.updateSettings(prefs);
      alert(t('alerts.preferencesSaved'));
    } catch { /* ignore */ }
  };

  const statusColor = (status) => {
    switch (status) {
      case 'open': return 'bg-red-100 text-red-700 border-red-200';
      case 'escalated': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'resolved': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'dismissed': return 'bg-slate-100 text-slate-600 border-slate-200';
      default: return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">{t('alerts.pageTitle')}</h1>
          <p className="text-slate-500 font-medium mt-1">{t('alerts.pageSubtitle')}</p>
        </div>
        <button onClick={() => setShowPrefs(!showPrefs)}
          className="flex px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-medium hover:bg-slate-200 items-center gap-2">
          <Sliders className="w-4 h-4" /> {t('alerts.preferences')}
        </button>
      </div>

      {/* Notification Preferences */}
      {showPrefs && (
        <div className="glass rounded-2xl p-6 shadow-sm border border-brand-100">
          <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Mail className="w-5 h-5 text-brand-600" /> {t('alerts.notificationPreferences')}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50">
              <input type="checkbox" className="rounded text-brand-600" checked={prefs.email_on_high_risk}
                onChange={(e) => setPrefs({ ...prefs, email_on_high_risk: e.target.checked })} />
              <span className="text-sm font-medium text-slate-700">{t('alerts.emailOnHighRisk')}</span>
            </label>
            <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50">
              <input type="checkbox" className="rounded text-brand-600" checked={prefs.email_on_analysis_complete}
                onChange={(e) => setPrefs({ ...prefs, email_on_analysis_complete: e.target.checked })} />
              <span className="text-sm font-medium text-slate-700">{t('alerts.emailOnAnalysisComplete')}</span>
            </label>
            <div className="p-3 rounded-xl border border-slate-200">
              <label className="text-sm font-medium text-slate-700">{t('alerts.alertThreshold')}</label>
              <input type="number" min="0" max="100" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                value={prefs.alert_threshold} onChange={(e) => setPrefs({ ...prefs, alert_threshold: parseInt(e.target.value) || 0 })} />
            </div>
            <div className="p-3 rounded-xl border border-slate-200">
              <label className="text-sm font-medium text-slate-700">{t('alerts.emailFrequency')}</label>
              <select className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                value={prefs.email_frequency} onChange={(e) => setPrefs({ ...prefs, email_frequency: e.target.value })}>
                <option value="immediate">{t('alerts.frequency.immediate')}</option>
                <option value="daily">{t('alerts.frequency.daily')}</option>
                <option value="weekly">{t('alerts.frequency.weekly')}</option>
              </select>
            </div>
          </div>
          <button onClick={handleSavePrefs} className="mt-4 px-6 py-2.5 bg-brand-600 text-white rounded-xl font-bold hover:bg-brand-700 shadow-md">
            {t('alerts.savePreferences')}
          </button>
        </div>
      )}

      {/* Filter */}
      <div className="flex gap-2">
        {['', 'open', 'escalated', 'resolved', 'dismissed'].map((s) => (
          <button key={s} onClick={() => setFilterStatus(s)}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${
              filterStatus === s ? 'bg-brand-600 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}>
            {s ? t(`alerts.filter.${s}`) : t('alerts.filter.all')}
          </button>
        ))}
      </div>

      {/* Alerts List */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-brand-500 border-t-transparent" />
        </div>
      ) : alerts.length > 0 ? (
        <div className="space-y-4">
          {alerts.map((alert) => (
            <div key={alert.id} className="glass rounded-2xl p-6 shadow-sm border-l-4 border-l-red-500 hover:shadow-md transition-shadow">
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <ShieldAlert className="w-5 h-5 text-red-500 flex-shrink-0" />
                    <h3 className="font-bold text-slate-900">{alert.article_title || t('alerts.untitledAlert')}</h3>
                  </div>
                  <p className="text-sm text-slate-600 mb-3">{alert.message}</p>
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${statusColor(alert.status)}`}>
                      {t(`alerts.status.${alert.status}`, alert.status)}
                    </span>
                    <span className="text-xs text-slate-500">
                      {t('alerts.score')} <strong className="text-red-600">{alert.credibility_score != null ? Math.round(alert.credibility_score) : '-'}%</strong>
                    </span>
                    <span className="text-xs text-slate-500 capitalize">{t('alerts.severity', { severity: alert.severity })}</span>
                    <span className="text-xs text-slate-400">{new Date(alert.created_at).toLocaleString()}</span>
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  {alert.news_post_id && alert.news_post_status === 'approved' && (
                    <button onClick={() => handleUnpublish(alert)}
                      className="px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-xs font-bold hover:bg-red-200 flex items-center gap-1">
                      <EyeOff className="w-3.5 h-3.5" /> {t('alerts.unpublishStory')}
                    </button>
                  )}
                  {alert.news_post_id && alert.news_post_status === 'rejected' && (
                    <span className="px-3 py-1.5 bg-slate-100 text-slate-500 rounded-lg text-xs font-bold flex items-center gap-1">
                      <EyeOff className="w-3.5 h-3.5" /> {t('alerts.storyUnpublished')}
                    </span>
                  )}
                  {alert.status === 'open' && (
                    <>
                      <button onClick={() => handleResolve(alert.id)}
                        className="px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-lg text-xs font-bold hover:bg-emerald-200 flex items-center gap-1">
                        <CheckCircle className="w-3.5 h-3.5" /> {t('alerts.resolve')}
                      </button>
                      <button onClick={() => handleEscalate(alert.id)}
                        className="px-3 py-1.5 bg-amber-100 text-amber-700 rounded-lg text-xs font-bold hover:bg-amber-200 flex items-center gap-1">
                        <ArrowRight className="w-3.5 h-3.5" /> {t('alerts.escalate')}
                      </button>
                    </>
                  )}
                  {alert.status !== 'dismissed' && (
                    <button onClick={() => handleDismiss(alert.id)}
                      className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-200">
                      {t('alerts.dismiss')}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="glass rounded-2xl p-12 shadow-sm text-center">
          <Bell className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500 font-medium">{t('alerts.emptyTitle')}</p>
          <p className="text-slate-400 text-sm mt-1">{t('alerts.emptyHint')}</p>
        </div>
      )}
    </div>
  );
};

export default AlertsPage;
