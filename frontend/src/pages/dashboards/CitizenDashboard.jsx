import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Lightbulb, Search, ArrowRight, Shield } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { analyticsAPI, analysisAPI } from '../../services/api';
import StatusBadge from '../../components/dashboard/StatusBadge';
import QuickAnalyzeBox from '../../components/dashboard/QuickAnalyzeBox';
import TrustGauge from '../../components/dashboard/TrustGauge';
import Skeleton from '../../components/dashboard/Skeleton';

const TIPS = [
  { title: 'Watch for emotional headlines', body: 'Sensationalist or fear-inducing headlines are a common signal of low-credibility content. Pause before sharing.' },
  { title: 'Check the source', body: 'Unfamiliar domains, lookalike URLs, and missing author bylines are red flags. Search the outlet name independently.' },
  { title: 'Cross-reference the story', body: 'Real news is rarely reported by only one outlet. If no other credible source covers it, treat it with suspicion.' },
  { title: 'Read past the headline', body: 'Many misleading articles have headlines that don\'t match the actual content. Read the full piece before forming an opinion.' },
  { title: 'Reverse-image search photos', body: 'Images are often reused out of context. A quick reverse search can reveal the original date and source.' },
  { title: 'Check the date', body: 'Old stories often resurface as if they were new. Always check publication dates before reacting.' },
  { title: 'Beware perfect quotes', body: 'Fabricated stories often include suspiciously polished quotes from public figures that can\'t be verified elsewhere.' },
];

const CitizenDashboard = () => {
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

  const [tip] = useState(() => {
    const day = Math.floor(Date.now() / 86_400_000);
    return TIPS[day % TIPS.length];
  });

  const trustScore = useMemo(() => {
    const total = (summary.real_count || 0) + (summary.fake_count || 0) + (summary.uncertain_count || 0);
    if (!total) return null;
    return Math.round(((summary.real_count || 0) / total) * 100);
  }, [summary]);

  const trustCopy = (score) => {
    if (score === null) return 'Run your first check to see your personal trust score.';
    if (score >= 70) return 'Most of what you check turns out to be credible. Keep verifying before you share.';
    if (score >= 40) return 'Mixed signals — stay alert before sharing what you read.';
    return 'You catch a lot of suspect content. That vigilance protects everyone around you.';
  };

  const displayName = user?.first_name || 'there';

  return (
    <div className="flex flex-col gap-6">
      <header>
        <p className="text-xs font-bold uppercase tracking-widest text-brand-600 mb-1">Citizen workspace</p>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Hi {displayName} — verify before you share.</h1>
        <p className="text-slate-500 font-medium mt-1">Paste a link, get a verdict in seconds.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <QuickAnalyzeBox
            title="Is it real?"
            subtitle="Paste a link or article excerpt. We'll run it through three models in seconds."
          />
        </div>

        <div className="glass rounded-2xl p-6 shadow-sm flex flex-col items-center text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3 flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5" /> Personal trust score
          </p>
          {loading ? (
            <Skeleton className="w-[140px] h-[140px] rounded-full" />
          ) : (
            <TrustGauge score={trustScore ?? 0} />
          )}
          <p className="text-sm text-slate-600 mt-4 max-w-xs leading-relaxed">{trustCopy(trustScore)}</p>
          {trustScore !== null && (
            <p className="text-xs text-slate-400 mt-2">Based on {summary.total_analyzed} {summary.total_analyzed === 1 ? 'check' : 'checks'}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 glass rounded-2xl p-6 shadow-sm">
          <div className="flex justify-between items-center mb-5">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Your recent checks</h2>
              <p className="text-xs text-slate-500 mt-0.5">The reasoning shown is the model's top flag for each item.</p>
            </div>
            <Link to="/history" className="text-sm font-semibold text-brand-600 hover:text-brand-700 inline-flex items-center gap-1">
              View all <ArrowRight className="w-3.5 h-3.5" />
            </Link>
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
                      <p className="text-sm font-bold text-slate-900 truncate group-hover:text-brand-700 transition-colors">{item.title || 'Untitled article'}</p>
                      <p className="text-xs text-slate-500 mt-0.5 truncate">
                        {reason || item.source_name || 'No additional reasoning available.'}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="text-center py-10 px-6 border-2 border-dashed border-slate-200 rounded-xl">
              <Search className="w-8 h-8 text-slate-300 mx-auto mb-3" />
              <p className="text-sm text-slate-700 font-semibold">Nothing checked yet</p>
              <p className="text-xs text-slate-500 mt-1">Paste a link in the box above to run your first verification.</p>
            </div>
          )}
        </div>

        <div className="rounded-2xl p-6 shadow-sm bg-gradient-to-br from-amber-50 via-amber-50 to-amber-100 border border-amber-200/60 relative overflow-hidden">
          <div className="absolute -top-6 -right-6 w-24 h-24 bg-amber-300/30 rounded-full blur-2xl pointer-events-none" />
          <p className="text-xs font-bold uppercase tracking-widest text-amber-700 mb-2 flex items-center gap-1.5">
            <Lightbulb className="w-3.5 h-3.5" /> Tip of the day
          </p>
          <h3 className="text-base font-bold text-amber-950 mb-2 leading-snug relative">{tip.title}</h3>
          <p className="text-sm text-amber-900/90 leading-relaxed relative">{tip.body}</p>
        </div>
      </div>
    </div>
  );
};

export default CitizenDashboard;
