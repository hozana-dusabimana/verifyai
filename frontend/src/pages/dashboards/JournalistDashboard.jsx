import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import {
  FileText, Activity, Bell, TrendingUp,
  ShieldAlert, Megaphone, Search, Newspaper,
  Building2, Users, Award,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { analyticsAPI, analysisAPI } from '../../services/api';
import StatCard from '../../components/dashboard/StatCard';
import RecentAnalysesTable from '../../components/dashboard/RecentAnalysesTable';
import { StatRowSkeleton } from '../../components/dashboard/Skeleton';

const tierStyles = (score) => {
  if (score >= 70) return { badge: 'bg-emerald-50 text-emerald-700 border-emerald-200', bar: 'bg-emerald-500' };
  if (score >= 40) return { badge: 'bg-amber-50 text-amber-700 border-amber-200', bar: 'bg-amber-500' };
  return { badge: 'bg-red-50 text-red-700 border-red-200', bar: 'bg-red-500' };
};

const JournalistDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({ total_analyzed: 0, average_credibility: 0, active_alerts: 0, fake_count: 0 });
  const [recent, setRecent] = useState([]);
  const [trends, setTrends] = useState([]);
  const [sources, setSources] = useState([]);
  const [keywords, setKeywords] = useState([]);
  const [sourcesFlagged, setSourcesFlagged] = useState(0);
  const [org, setOrg] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [s, h, t, src, kw, o] = await Promise.allSettled([
        analyticsAPI.getSummary(),
        analysisAPI.getHistory({ page_size: 6 }),
        analyticsAPI.getTrends({ days: 30 }),
        analyticsAPI.getSources(),
        analyticsAPI.getKeywords(),
        analyticsAPI.getMyOrg(),
      ]);

      if (s.status === 'fulfilled') setStats(s.value.data.data);
      if (o.status === 'fulfilled') setOrg(o.value.data.data);
      if (h.status === 'fulfilled') setRecent(h.value.data.data || []);
      if (t.status === 'fulfilled') {
        const rows = t.value.data.data || [];
        setTrends(rows.map((r) => ({
          name: new Date(r.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          real: r.real_count,
          fake: r.fake_count,
        })));
      }
      if (src.status === 'fulfilled') {
        const rows = src.value.data.data || [];
        setSources(rows.slice(0, 8));
        setSourcesFlagged(rows.filter((r) => r.average_credibility < 50).length);
      }
      if (kw.status === 'fulfilled') {
        const fake = kw.value.data.data?.fake_keywords || [];
        setKeywords(fake.slice(0, 10));
      }
      setLoading(false);
    })();
  }, []);

  const displayName = user?.full_name || user?.first_name || 'journalist';
  const orgName = user?.organization || 'Independent';

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col sm:flex-row justify-between sm:items-end gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-brand-600 mb-1 flex items-center gap-1.5">
            <Newspaper className="w-3.5 h-3.5" /> {orgName}
          </p>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Newsroom briefing</h1>
          <p className="text-slate-500 font-medium mt-1">Source intelligence and narrative tracking for {displayName}.</p>
        </div>
        <Link
          to="/analyze"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-900 text-white rounded-xl font-semibold shadow-md hover:bg-slate-800 hover:shadow-lg transition-all w-fit"
        >
          <Search className="w-4 h-4" /> Vet new article
        </Link>
      </header>

      {loading ? (
        <StatRowSkeleton count={4} />
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Articles vetted"
            value={stats.total_analyzed?.toLocaleString() || '0'}
            icon={<FileText className="w-6 h-6" />}
            color="bg-blue-50 text-blue-600"
          />
          <StatCard
            label="Avg credibility"
            value={`${Math.round(stats.average_credibility || 0)}%`}
            icon={<Activity className="w-6 h-6" />}
            color="bg-emerald-50 text-emerald-600"
          />
          <StatCard
            label="Sources flagged"
            value={sourcesFlagged.toString()}
            icon={<ShieldAlert className="w-6 h-6" />}
            color="bg-red-50 text-red-600"
            alert={sourcesFlagged > 0}
            hint="Avg credibility below 50%"
          />
          <StatCard
            label="Open alerts"
            value={stats.active_alerts?.toString() || '0'}
            icon={<Bell className="w-6 h-6" />}
            color="bg-amber-50 text-amber-600"
            alert={stats.active_alerts > 0}
          />
        </div>
      )}

      {/* ── Your organization ────────────────────────────────────── */}
      {org?.has_org && (
        <div className="glass rounded-2xl p-6 shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-brand-600" /> Your organization — {org.organization}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">How your newsroom is performing across all its members.</p>
            </div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-brand-50 text-brand-700 border border-brand-100">
              <Users className="w-3.5 h-3.5" /> {org.journalist_count} journalists
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
            {[
              { label: 'Members', value: org.member_count, icon: <Users className="w-4 h-4" />, color: 'text-slate-900' },
              { label: 'Org analyses', value: org.org_total_analyses, icon: <Activity className="w-4 h-4" />, color: 'text-blue-600' },
              { label: 'Avg credibility', value: `${Math.round(org.org_average_credibility || 0)}%`, icon: <Award className="w-4 h-4" />, color: 'text-emerald-600' },
              { label: 'Open alerts', value: org.org_open_alerts, icon: <Bell className="w-4 h-4" />, color: org.org_open_alerts > 0 ? 'text-red-600' : 'text-slate-900' },
            ].map((m, i) => (
              <div key={i} className="bg-slate-50/70 rounded-xl p-4">
                <div className="flex items-center gap-1.5 text-slate-400 mb-1">{m.icon}<span className="text-[11px] font-bold uppercase tracking-wider">{m.label}</span></div>
                <p className={`text-2xl font-extrabold tabular-nums ${m.color}`}>{m.value}</p>
              </div>
            ))}
          </div>

          {org.colleagues?.length > 0 && (
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Most active colleagues</h3>
              <ul className="divide-y divide-slate-100">
                {org.colleagues.map((c, idx) => (
                  <li key={idx} className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-bold text-xs flex-shrink-0">
                        {(c.name?.[0] || '?').toUpperCase()}
                      </div>
                      <span className="text-sm font-semibold text-slate-800 truncate">{c.name}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs flex-shrink-0">
                      <span className="text-slate-500 tabular-nums">{c.total} vetted</span>
                      <span className="font-bold text-emerald-600 tabular-nums">{Math.round(c.average_credibility)}%</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <div className="glass rounded-2xl p-6 shadow-sm">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-brand-600" /> Real vs Fake — last 30 days
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">Daily classifications across all articles you've vetted.</p>
          </div>
        </div>
        <div className="h-64 w-full">
          {trends.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trends} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.1)' }} />
                <Legend wrapperStyle={{ paddingTop: 10, fontSize: 12 }} iconType="circle" />
                <Line type="monotone" dataKey="real" name="Real" stroke="#10b981" strokeWidth={2.5} dot={{ r: 3, fill: '#10b981' }} activeDot={{ r: 5 }} />
                <Line type="monotone" dataKey="fake" name="Fake" stroke="#ef4444" strokeWidth={2.5} dot={{ r: 3, fill: '#ef4444' }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-400">
              <TrendingUp className="w-8 h-8 text-slate-300 mb-2" />
              <p className="text-sm">No trend data yet — vet some articles to see the breakdown.</p>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 glass rounded-2xl p-6 shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-red-500" /> Source reliability matrix
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">Outlets ranked by average credibility across your analyses.</p>
            </div>
          </div>
          {sources.length > 0 ? (
            <div className="overflow-x-auto -mx-2">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="px-2 py-2 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">Source</th>
                    <th className="px-2 py-2 text-right text-[11px] font-bold text-slate-500 uppercase tracking-wider">Articles</th>
                    <th className="px-2 py-2 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider w-1/3">Credibility</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sources.map((s, idx) => {
                    const tier = tierStyles(s.average_credibility);
                    const width = Math.max(4, Math.round(s.average_credibility));
                    return (
                      <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-2 py-3 text-sm font-bold text-slate-800 uppercase truncate max-w-[200px]">{s.source_name}</td>
                        <td className="px-2 py-3 text-sm text-right text-slate-600 tabular-nums">{s.article_count}</td>
                        <td className="px-2 py-3">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden min-w-[60px]">
                              <div className={`h-full rounded-full ${tier.bar} transition-all`} style={{ width: `${width}%` }} />
                            </div>
                            <span className={`inline-flex px-1.5 py-0.5 rounded text-[11px] font-bold border tabular-nums ${tier.badge}`}>
                              {Math.round(s.average_credibility)}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-10 px-6 border-2 border-dashed border-slate-200 rounded-xl">
              <ShieldAlert className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-700 font-semibold">No source data yet</p>
              <p className="text-xs text-slate-500 mt-1">Vet articles with a known source to populate this matrix.</p>
            </div>
          )}
        </div>

        <div className="glass rounded-2xl p-6 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 mb-1 flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-red-500" /> Disinfo narratives
          </h3>
          <p className="text-xs text-slate-500 mb-4">Top keywords from FAKE-classified articles.</p>
          {keywords.length > 0 ? (
            <ul className="space-y-2.5">
              {keywords.map((k, idx) => {
                const max = keywords[0].count || 1;
                const width = Math.max(8, Math.round((k.count / max) * 100));
                return (
                  <li key={idx} className="flex items-center gap-2.5">
                    <span className="text-xs font-bold text-slate-700 w-24 truncate" title={k.keyword}>{k.keyword}</span>
                    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-red-400 to-red-500 rounded-full" style={{ width: `${width}%` }} />
                    </div>
                    <span className="text-xs font-bold text-slate-600 w-8 text-right tabular-nums">{k.count}</span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="text-center py-8">
              <Megaphone className="w-7 h-7 text-slate-300 mx-auto mb-2" />
              <p className="text-xs text-slate-500">No narratives detected yet.</p>
            </div>
          )}
        </div>
      </div>

      <RecentAnalysesTable items={recent} showSource showCite />
    </div>
  );
};

export default JournalistDashboard;
