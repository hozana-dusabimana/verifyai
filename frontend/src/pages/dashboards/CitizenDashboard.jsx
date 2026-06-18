import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Lightbulb, Search, ArrowRight, Shield } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { analyticsAPI, analysisAPI } from '../../services/api';
import StatusBadge from '../../components/dashboard/StatusBadge';
import QuickAnalyzeBox from '../../components/dashboard/QuickAnalyzeBox';
import TrustGauge from '../../components/dashboard/TrustGauge';
import Skeleton from '../../components/dashboard/Skeleton';

// Tip keys map to citizenDash.tips.* (title/body) in the locale files.
const TIP_KEYS = [
  'emotionalHeadlines',
  'checkSource',
  'crossReference',
  'readPastHeadline',
  'reverseImage',
  'checkDate',
  'perfectQuotes',
];

const CitizenDashboard = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [summary, setSummary] = useState({ total_analyzed: 0, real_count: 0, fake_count: 0, uncertain_count: 0 });
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [s, h] = await Promise.allSettled([
        analyticsAPI.getSummary(),
        analysisAPI.getHistory({ page_size: 5 }),
      ]);
      if (s.status === 'fulfilled') setSummary(s.value.data.data);
      if (h.status === 'fulfilled') setRecent(h.value.data.data || []);
      setLoading(false);
    })();
  }, []);

  const [tipKey] = useState(() => {
    const day = Math.floor(Date.now() / 86_400_000);
    return TIP_KEYS[day % TIP_KEYS.length];
  });

  const trustScore = useMemo(() => {
    const total = (summary.real_count || 0) + (summary.fake_count || 0) + (summary.uncertain_count || 0);
    if (!total) return null;
    return Math.round(((summary.real_count || 0) / total) * 100);
  }, [summary]);

  const trustCopy = (score) => {
    if (score === null) return t('citizenDash.trust.copyNone');
    if (score >= 70) return t('citizenDash.trust.copyHigh');
    if (score >= 40) return t('citizenDash.trust.copyMixed');
    return t('citizenDash.trust.copyLow');
  };

  const displayName = user?.first_name || t('citizenDash.fallbackName');

  return (
    <div className="flex flex-col gap-6">
      <header>
        <p className="text-xs font-bold uppercase tracking-widest text-brand-600 mb-1">{t('citizenDash.workspace')}</p>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">{t('citizenDash.greeting', { name: displayName })}</h1>
        <p className="text-slate-500 font-medium mt-1">{t('citizenDash.subtitle')}</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <QuickAnalyzeBox
            title={t('citizenDash.quickAnalyze.title')}
            subtitle={t('citizenDash.quickAnalyze.subtitle')}
          />
        </div>

        <div className="glass rounded-2xl p-6 shadow-sm flex flex-col items-center text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3 flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5" /> {t('citizenDash.trust.label')}
          </p>
          {loading ? (
            <Skeleton className="w-[140px] h-[140px] rounded-full" />
          ) : (
            <TrustGauge score={trustScore ?? 0} />
          )}
          <p className="text-sm text-slate-600 mt-4 max-w-xs leading-relaxed">{trustCopy(trustScore)}</p>
          {trustScore !== null && (
            <p className="text-xs text-slate-400 mt-2">{t('citizenDash.trust.basedOn', { count: summary.total_analyzed })}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 glass rounded-2xl p-6 shadow-sm">
          <div className="mb-5">
            <h2 className="text-lg font-bold text-slate-900">{t('citizenDash.recent.heading')}</h2>
            <p className="text-xs text-slate-500 mt-0.5">{t('citizenDash.recent.subtitle')}</p>
          </div>
          {loading ? (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex items-center gap-3 py-2">
                  <Skeleton className="h-6 w-24 rounded-full" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3.5 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : recent.length > 0 ? (
            <ul className="divide-y divide-slate-100">
              {recent.map((item) => {
                const reason = (item.flagging_reasons && item.flagging_reasons[0]) || null;
                return (
                  <li key={item.id} className="py-3 flex items-start gap-3 group">
                    <div className="flex-shrink-0 pt-0.5">
                      <StatusBadge status={item.classification} score={item.credibility_score} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-900 truncate group-hover:text-brand-700 transition-colors">{item.title || t('citizenDash.recent.untitled')}</p>
                      <p className="text-xs text-slate-500 mt-0.5 truncate">
                        {reason || item.source_name || t('citizenDash.recent.noReason')}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="text-center py-10 px-6 border-2 border-dashed border-slate-200 rounded-xl">
              <Search className="w-8 h-8 text-slate-300 mx-auto mb-3" />
              <p className="text-sm text-slate-700 font-semibold">{t('citizenDash.recent.emptyTitle')}</p>
              <p className="text-xs text-slate-500 mt-1">{t('citizenDash.recent.emptyBody')}</p>
            </div>
          )}
        </div>

        <div className="rounded-2xl p-6 shadow-sm bg-gradient-to-br from-amber-50 via-amber-50 to-amber-100 border border-amber-200/60 relative overflow-hidden">
          <div className="absolute -top-6 -right-6 w-24 h-24 bg-amber-300/30 rounded-full blur-2xl pointer-events-none" />
          <p className="text-xs font-bold uppercase tracking-widest text-amber-700 mb-2 flex items-center gap-1.5">
            <Lightbulb className="w-3.5 h-3.5" /> {t('citizenDash.tipOfTheDay')}
          </p>
          <h3 className="text-base font-bold text-amber-950 mb-2 leading-snug relative">{t(`citizenDash.tips.${tipKey}.title`)}</h3>
          <p className="text-sm text-amber-900/90 leading-relaxed relative">{t(`citizenDash.tips.${tipKey}.body`)}</p>
        </div>
      </div>
    </div>
  );
};

export default CitizenDashboard;
