import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Building2, Activity, AlertTriangle, Users, Flame,
  ShieldAlert, Layers, RefreshCw, CheckCircle2, Newspaper,
  UserCog, Award,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { analyticsAPI } from '../../services/api';
import StatCard from '../../components/dashboard/StatCard';
import StatusBadge from '../../components/dashboard/StatusBadge';
import { StatRowSkeleton } from '../../components/dashboard/Skeleton';

const SEVERITY = {
  high:   { dot: 'bg-red-500',    cls: 'bg-red-50 text-red-800 border-red-200' },
  medium: { dot: 'bg-amber-500',  cls: 'bg-amber-50 text-amber-800 border-amber-200' },
  low:    { dot: 'bg-slate-400',  cls: 'bg-slate-50 text-slate-700 border-slate-200' },
};

const HEAT_BUCKETS = [
  { max: 0,  cls: 'bg-slate-100 border-slate-200'    },
  { max: 1,  cls: 'bg-amber-100 border-amber-200'    },
  { max: 3,  cls: 'bg-amber-300 border-amber-400'    },
  { max: 6,  cls: 'bg-red-400   border-red-500'      },
  { max: Infinity, cls: 'bg-red-700 border-red-800'  },
];
const heatClass = (count) => HEAT_BUCKETS.find((b) => count <= b.max).cls;
const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const credTier = (score) => {
  if (score >= 70) return { badge: 'bg-emerald-50 text-emerald-700 border-emerald-200', bar: 'bg-emerald-500' };
  if (score >= 40) return { badge: 'bg-amber-50 text-amber-700 border-amber-200', bar: 'bg-amber-500' };
  return { badge: 'bg-red-50 text-red-700 border-red-200', bar: 'bg-red-500' };
};

const ROLE_BADGE = {
  government: 'bg-blue-100 text-blue-800 border-blue-200',
  journalist: 'bg-amber-100 text-amber-800 border-amber-200',
  citizen: 'bg-slate-100 text-slate-700 border-slate-200',
};

const relativeTime = (iso) => {
  if (!iso) return 'never';
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
};

const GovernmentDashboard = () => {
  const { user } = useAuth();
  const [summary, setSummary] = useState(null);
  const [feed, setFeed] = useState({ escalation_queue: [], top_sources_by_fake: [], topic_distribution: [], heatmap: [] });
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [acting, setActing] = useState({});

  const fetchAll = useCallback(async ({ silent = false } = {}) => {
    if (silent) setRefreshing(true); else setLoading(true);
    try {
      const [s, f, m] = await Promise.allSettled([
        analyticsAPI.getOrgSummary(),
        analyticsAPI.getOrgFeed(),
        analyticsAPI.getOrgMembersPerformance(),
      ]);
      if (s.status === 'fulfilled') setSummary(s.value.data.data);
      if (f.status === 'fulfilled') {
        setFeed(f.value.data.data || { escalation_queue: [], top_sources_by_fake: [], topic_distribution: [], heatmap: [] });
      }
      if (m.status === 'fulfilled') setMembers(m.value.data.data?.members || []);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleAction = async (alertId, action) => {
    setActing((prev) => ({ ...prev, [alertId]: action }));
    try {
      await analyticsAPI.orgAlertAction(alertId, action);
      setFeed((prev) => ({
        ...prev,
        escalation_queue: prev.escalation_queue.filter((a) => a.alert_id !== alertId),
      }));
    } catch { /* user can retry */ }
    finally {
      setActing((prev) => { const next = { ...prev }; delete next[alertId]; return next; });
    }
  };

  const heatGrid = useMemo(() => {
    const counts = new Map((feed.heatmap || []).map((r) => [r.date, r.fake_count]));
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const days = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const iso = d.toISOString().slice(0, 10);
      const weekday = (d.getDay() + 6) % 7;
      days.push({
        date: iso,
        label: d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
        count: counts.get(iso) || 0,
        weekday,
      });
    }
    const firstWeekday = days[0].weekday;
    const padded = [...Array.from({ length: firstWeekday }, () => null), ...days];
    while (padded.length % 7 !== 0) padded.push(null);
    const rows = [];
    for (let i = 0; i < padded.length; i += 7) rows.push(padded.slice(i, i + 7));
    return rows;
  }, [feed.heatmap]);

  const totalFake30d = useMemo(
    () => (feed.heatmap || []).reduce((sum, r) => sum + (r.fake_count || 0), 0),
    [feed.heatmap],
  );

  const orgName = summary?.organization || user?.organization || 'Your organization';
  const queueCount = feed.escalation_queue.length;
  const journalists = members.filter((m) => m.role === 'journalist');
  const roster = useMemo(
    () => [...members].sort((a, b) => b.total_analyzed - a.total_analyzed),
    [members],
  );

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col sm:flex-row justify-between sm:items-end gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-brand-600 mb-1 flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5" /> {orgName}
          </p>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Management console</h1>
          <p className="text-slate-500 font-medium mt-1">Manage and evaluate the journalists in your organization.</p>
        </div>
        <div className="flex gap-2">
          <Link
            to="/org/members"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-600 text-white rounded-xl font-semibold shadow-md hover:bg-brand-700 transition-colors w-fit"
          >
            <UserCog className="w-4 h-4" /> Manage members
          </Link>
          <button
            onClick={() => fetchAll({ silent: true })}
            disabled={refreshing || loading}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl font-semibold hover:bg-slate-50 transition-colors w-fit disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      </header>

      {loading ? (
        <StatRowSkeleton count={4} />
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Journalists"
            value={journalists.length.toString()}
            icon={<Newspaper className="w-6 h-6" />}
            color="bg-amber-50 text-amber-600"
            hint="Members with the journalist role"
          />
          <StatCard
            label="Org analyses (30d)"
            value={summary?.org_total?.toLocaleString() || '0'}
            icon={<Activity className="w-6 h-6" />}
            color="bg-blue-50 text-blue-600"
          />
          <StatCard
            label="Org avg credibility"
            value={`${Math.round(summary?.org_average_credibility || 0)}%`}
            icon={<Award className="w-6 h-6" />}
            color="bg-emerald-50 text-emerald-600"
          />
          <StatCard
            label="Open + escalated"
            value={summary?.open_alerts?.toString() || '0'}
            icon={<AlertTriangle className="w-6 h-6" />}
            color="bg-red-50 text-red-600"
            alert={(summary?.open_alerts || 0) > 0}
          />
        </div>
      )}

      {/* ── Journalist roster & evaluation ───────────────────────── */}
      <div className="glass rounded-2xl p-6 shadow-sm">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-brand-600" /> Team roster & evaluation
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">Performance of every member in your organization.</p>
          </div>
          <Link to="/org/members" className="text-xs font-bold text-brand-600 hover:text-brand-700">Manage →</Link>
        </div>

        {loading ? (
          <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-8 w-8 border-2 border-brand-500 border-t-transparent" /></div>
        ) : roster.length > 0 ? (
          <div className="overflow-x-auto -mx-2">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="px-2 py-2 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">Member</th>
                  <th className="px-2 py-2 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">Role</th>
                  <th className="px-2 py-2 text-right text-[11px] font-bold text-slate-500 uppercase tracking-wider">Vetted</th>
                  <th className="px-2 py-2 text-right text-[11px] font-bold text-slate-500 uppercase tracking-wider hidden sm:table-cell">30d</th>
                  <th className="px-2 py-2 text-right text-[11px] font-bold text-slate-500 uppercase tracking-wider">Fake</th>
                  <th className="px-2 py-2 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider w-40">Avg credibility</th>
                  <th className="px-2 py-2 text-right text-[11px] font-bold text-slate-500 uppercase tracking-wider">Alerts</th>
                  <th className="px-2 py-2 text-right text-[11px] font-bold text-slate-500 uppercase tracking-wider hidden md:table-cell">Active</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {roster.map((m) => {
                  const tier = credTier(m.average_credibility);
                  const width = Math.max(4, Math.round(m.average_credibility));
                  return (
                    <tr key={m.id} className={`hover:bg-slate-50/60 transition-colors ${!m.is_active ? 'opacity-50' : ''}`}>
                      <td className="px-2 py-3">
                        <p className="text-sm font-bold text-slate-900 truncate max-w-[180px]">{m.full_name}</p>
                        <p className="text-xs text-slate-500 truncate max-w-[180px]">{m.email}</p>
                      </td>
                      <td className="px-2 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded text-[11px] font-bold border capitalize ${ROLE_BADGE[m.role] || 'border-slate-200'}`}>{m.role}</span>
                      </td>
                      <td className="px-2 py-3 text-sm text-right font-bold text-slate-800 tabular-nums">{m.total_analyzed}</td>
                      <td className="px-2 py-3 text-sm text-right text-slate-500 tabular-nums hidden sm:table-cell">{m.recent_analyzed}</td>
                      <td className="px-2 py-3 text-sm text-right text-red-600 font-bold tabular-nums">{m.fake_count}</td>
                      <td className="px-2 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden min-w-[48px]">
                            <div className={`h-full rounded-full ${tier.bar}`} style={{ width: `${width}%` }} />
                          </div>
                          <span className={`inline-flex px-1.5 py-0.5 rounded text-[11px] font-bold border tabular-nums ${tier.badge}`}>
                            {Math.round(m.average_credibility)}%
                          </span>
                        </div>
                      </td>
                      <td className={`px-2 py-3 text-sm text-right font-bold tabular-nums ${m.open_alerts > 0 ? 'text-red-600' : 'text-slate-400'}`}>{m.open_alerts}</td>
                      <td className="px-2 py-3 text-xs text-right text-slate-500 hidden md:table-cell whitespace-nowrap">{relativeTime(m.last_active)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-10 px-6 border-2 border-dashed border-slate-200 rounded-xl">
            <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-700 font-semibold">No members yet</p>
            <p className="text-xs text-slate-500 mt-1 mb-3">Add journalists to your organization to start evaluating them.</p>
            <Link to="/org/members" className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-bold hover:bg-brand-700">
              <UserCog className="w-4 h-4" /> Manage members
            </Link>
          </div>
        )}
      </div>

      {/* ── Alerts for your analysts' analyses ───────────────────── */}
      <div className="glass rounded-2xl p-6 shadow-sm">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" /> Alerts — your analysts' analyses
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">Open and escalated alerts raised on analyses submitted by your members.</p>
          </div>
          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${queueCount > 0 ? 'bg-red-100 text-red-800' : 'bg-emerald-100 text-emerald-800'}`}>
            {queueCount} pending
          </span>
        </div>
        {queueCount > 0 ? (
          <div className="overflow-x-auto -mx-2">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="px-2 py-2 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">Article</th>
                  <th className="px-2 py-2 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider hidden md:table-cell">Submitted by</th>
                  <th className="px-2 py-2 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">Severity</th>
                  <th className="px-2 py-2 text-right text-[11px] font-bold text-slate-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {feed.escalation_queue.map((item) => {
                  const sev = SEVERITY[item.severity] || SEVERITY.low;
                  return (
                    <tr key={item.alert_id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-2 py-3 max-w-[260px]">
                        <p className="text-sm font-bold text-slate-900 truncate">{item.title}</p>
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          <StatusBadge status={item.classification} score={item.credibility_score} />
                          <span className="text-xs text-slate-500 truncate">{item.source_name}</span>
                        </div>
                      </td>
                      <td className="px-2 py-3 text-sm text-slate-600 hidden md:table-cell truncate max-w-[140px]">{item.submitted_by}</td>
                      <td className="px-2 py-3">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-bold border uppercase tracking-wider ${sev.cls}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${sev.dot}`} /> {item.severity}
                        </span>
                      </td>
                      <td className="px-2 py-3 text-right">
                        <div className="inline-flex gap-1">
                          <button
                            onClick={() => handleAction(item.alert_id, 'resolve')}
                            disabled={!!acting[item.alert_id]}
                            className="text-xs font-bold px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-100 disabled:opacity-50"
                          >
                            {acting[item.alert_id] === 'resolve' ? '…' : 'Resolve'}
                          </button>
                          <button
                            onClick={() => handleAction(item.alert_id, 'escalate')}
                            disabled={!!acting[item.alert_id] || item.status === 'escalated'}
                            className="text-xs font-bold px-2.5 py-1.5 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 border border-red-100 disabled:opacity-50 disabled:cursor-not-allowed"
                            title={item.status === 'escalated' ? 'Already escalated' : 'Escalate this alert'}
                          >
                            {acting[item.alert_id] === 'escalate' ? '…' : 'Escalate'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12 px-6 border-2 border-dashed border-emerald-200 rounded-xl bg-emerald-50/40">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-3" />
            <p className="text-sm text-slate-800 font-bold">Queue is clear</p>
            <p className="text-xs text-slate-500 mt-1">No pending alerts on your members' analyses right now.</p>
          </div>
        )}
      </div>

      {/* ── Organization intelligence (secondary) ────────────────── */}
      <div className="glass rounded-2xl p-6 shadow-sm">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Flame className="w-5 h-5 text-red-500" /> Fake content heatmap
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">Daily FAKE classifications across the organization, last 30 days.</p>
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-wider text-slate-500 font-bold">Total</p>
            <p className="text-2xl font-extrabold text-red-600 tabular-nums">{totalFake30d}</p>
          </div>
        </div>

        <div className="flex items-start gap-6 flex-wrap">
          <div className="flex-1 min-w-[280px] max-w-2xl">
            <div className="grid grid-cols-7 gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              {WEEKDAY_LABELS.map((d) => <div key={d} className="text-center">{d[0]}</div>)}
            </div>
            <div className="space-y-1.5">
              {heatGrid.map((row, rIdx) => (
                <div key={rIdx} className="grid grid-cols-7 gap-1.5">
                  {row.map((d, cIdx) => d ? (
                    <div
                      key={d.date}
                      title={`${d.label}: ${d.count} fake ${d.count === 1 ? 'article' : 'articles'}`}
                      className={`aspect-square rounded border ${heatClass(d.count)} cursor-default transition-transform hover:scale-110`}
                    />
                  ) : (
                    <div key={`pad-${rIdx}-${cIdx}`} className="aspect-square" />
                  ))}
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1.5 text-xs text-slate-500 min-w-[80px]">
            <span className="font-bold uppercase tracking-wider text-slate-600 mb-1 text-[10px]">Density</span>
            <div className="flex items-center gap-2"><span className="w-3.5 h-3.5 rounded bg-slate-100 border border-slate-200" /> 0</div>
            <div className="flex items-center gap-2"><span className="w-3.5 h-3.5 rounded bg-amber-100 border border-amber-200" /> 1</div>
            <div className="flex items-center gap-2"><span className="w-3.5 h-3.5 rounded bg-amber-300 border border-amber-400" /> 2–3</div>
            <div className="flex items-center gap-2"><span className="w-3.5 h-3.5 rounded bg-red-400 border border-red-500" /> 4–6</div>
            <div className="flex items-center gap-2"><span className="w-3.5 h-3.5 rounded bg-red-700 border border-red-800" /> 7+</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 glass rounded-2xl p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900 mb-1 flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-red-500" /> Top spreading sources
          </h2>
          <p className="text-xs text-slate-500 mb-4">Outlets ranked by FAKE-classified article volume in the last 30 days.</p>
          {feed.top_sources_by_fake.length > 0 ? (
            <div className="overflow-x-auto -mx-2">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="px-3 py-2 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">Source</th>
                    <th className="px-3 py-2 text-right text-[11px] font-bold text-slate-500 uppercase tracking-wider">Fake articles</th>
                    <th className="px-3 py-2 text-right text-[11px] font-bold text-slate-500 uppercase tracking-wider">Avg credibility</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {feed.top_sources_by_fake.map((s, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-3 py-3 text-sm font-bold text-slate-800 uppercase truncate max-w-[260px]">{s.source_name}</td>
                      <td className="px-3 py-3 text-right">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-red-100 text-red-800 border border-red-200 tabular-nums">{s.fake_count}</span>
                      </td>
                      <td className="px-3 py-3 text-sm text-right text-slate-600 font-bold tabular-nums">{Math.round(s.average_credibility)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-10 px-6 border-2 border-dashed border-slate-200 rounded-xl">
              <ShieldAlert className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-700 font-semibold">No flagged sources yet</p>
            </div>
          )}
        </div>

        <div className="glass rounded-2xl p-6 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 mb-1 flex items-center gap-2">
            <Layers className="w-5 h-5 text-brand-600" /> Topic mix
          </h3>
          <p className="text-xs text-slate-500 mb-4">Themes across analyses, last 30 days.</p>
          {feed.topic_distribution.length > 0 ? (
            <ul className="space-y-2.5">
              {feed.topic_distribution.map((t, idx) => {
                const max = feed.topic_distribution[0].count || 1;
                const width = Math.max(8, Math.round((t.count / max) * 100));
                return (
                  <li key={idx} className="flex items-center gap-2.5">
                    <span className="text-xs font-bold text-slate-700 w-24 capitalize truncate">{t.topic}</span>
                    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-brand-400 to-brand-600 rounded-full" style={{ width: `${width}%` }} />
                    </div>
                    <span className="text-xs font-bold text-slate-600 w-8 text-right tabular-nums">{t.count}</span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="text-center py-8">
              <Layers className="w-7 h-7 text-slate-300 mx-auto mb-2" />
              <p className="text-xs text-slate-500">No topic data yet.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GovernmentDashboard;
