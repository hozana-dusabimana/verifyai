import { useState, useEffect } from 'react';
import { ShieldAlert, CheckCircle, HelpCircle, Activity, TrendingUp, Search, Bell, AlertTriangle, FileText, Upload } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useAuth } from '../contexts/AuthContext';
import { analyticsAPI, analysisAPI, alertsAPI } from '../services/api';

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [quickSubmitText, setQuickSubmitText] = useState('');
  const [stats, setStats] = useState({ total_analyzed: 0, average_credibility: 0, active_alerts: 0, fake_count: 0 });
  const [recentAnalyses, setRecentAnalyses] = useState([]);
  const [trendData, setTrendData] = useState([]);
  const [topFlagged, setTopFlagged] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [summaryRes, historyRes, trendsRes, sourcesRes] = await Promise.allSettled([
          analyticsAPI.getSummary(),
          analysisAPI.getHistory({ page_size: 5 }),
          analyticsAPI.getTrends({ days: 30 }),
          analyticsAPI.getSources(),
        ]);

        if (summaryRes.status === 'fulfilled') setStats(summaryRes.value.data.data);
        if (historyRes.status === 'fulfilled') setRecentAnalyses(historyRes.value.data.data || []);
        if (trendsRes.status === 'fulfilled') {
          const trends = trendsRes.value.data.data || [];
          setTrendData(trends.map(t => ({
            name: new Date(t.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            score: t.real_count + t.fake_count > 0
              ? Math.round((t.real_count / (t.real_count + t.fake_count + t.uncertain_count)) * 100)
              : 0,
          })));
        }
        if (sourcesRes.status === 'fulfilled') {
          const sources = sourcesRes.value.data.data || [];
          setTopFlagged(sources.slice(0, 3).map(s => ({
            domain: s.source_name,
            hits: s.article_count,
            avgScore: Math.round(s.average_credibility),
          })));
        }
      } catch {
        // silently handle
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleQuickSubmit = (e) => {
    e.preventDefault();
    if (quickSubmitText) navigate('/analyze', { state: { text: quickSubmitText } });
  };

  const StatusBadge = ({ status, score }) => {
    const styles = {
      REAL: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      FAKE: 'bg-red-100 text-red-800 border-red-200',
      UNCERTAIN: 'bg-amber-100 text-amber-800 border-amber-200',
    };
    const icons = {
      REAL: <CheckCircle className="w-3.5 h-3.5 mr-1" />,
      FAKE: <ShieldAlert className="w-3.5 h-3.5 mr-1" />,
      UNCERTAIN: <HelpCircle className="w-3.5 h-3.5 mr-1" />,
    };
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${styles[status] || styles.UNCERTAIN}`}>
        {icons[status] || icons.UNCERTAIN} {status} {score != null && `(${Math.round(score)}%)`}
      </span>
    );
  };

  const displayName = user?.full_name || user?.first_name || 'User';

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-end mb-2">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Dashboard</h1>
          <p className="text-slate-500 font-medium mt-1">Welcome back, {displayName}. Here's your daily briefing.</p>
        </div>
        <Link to="/analyze" className="hidden sm:flex px-4 py-2 bg-brand-600 text-white rounded-xl font-medium shadow-md hover:bg-brand-700 hover:shadow-lg transition-all items-center gap-2">
          <Search className="w-4 h-4" /> New Analysis
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Articles Analyzed', value: stats.total_analyzed?.toLocaleString() || '0', icon: <FileText className="w-6 h-6" />, color: 'bg-blue-50 text-blue-600' },
          { label: 'Avg Credibility', value: `${Math.round(stats.average_credibility || 0)}%`, icon: <Activity className="w-6 h-6" />, color: 'bg-emerald-50 text-emerald-600' },
          { label: 'Active Alerts', value: stats.active_alerts?.toString() || '0', icon: <Bell className="w-6 h-6" />, color: 'bg-red-50 text-red-600', alert: stats.active_alerts > 0 },
          { label: 'Fake Detected', value: stats.fake_count?.toString() || '0', icon: <AlertTriangle className="w-6 h-6" />, color: 'bg-amber-50 text-amber-600' },
        ].map((stat, idx) => (
          <div key={idx} className="glass rounded-2xl p-6 relative overflow-hidden group hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">{stat.label}</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-3xl font-bold text-slate-900">{stat.value}</p>
                  {stat.alert && <span className="flex h-3 w-3 relative ml-1">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                  </span>}
                </div>
              </div>
              <div className={`p-3 rounded-xl ${stat.color} transition-transform group-hover:scale-110`}>{stat.icon}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-2">
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* Chart */}
          <div className="glass rounded-2xl p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-brand-600" /> Credibility Trend (30 Days)
            </h2>
            <div className="h-64 w-full">
              {trendData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} domain={[0, 100]} />
                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    <Line type="monotone" dataKey="score" stroke="#0ea5e9" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                  No trend data yet. Start analyzing articles to see trends.
                </div>
              )}
            </div>
          </div>

          {/* Recent Analyses */}
          <div className="glass rounded-2xl px-6 py-5 shadow-sm">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-lg font-bold text-slate-900">Recent Analyses</h2>
              <Link to="/history" className="text-sm font-medium text-brand-600 hover:text-brand-700">View All</Link>
            </div>
            <div className="overflow-x-auto">
              {recentAnalyses.length > 0 ? (
                <table className="min-w-full divide-y divide-slate-200">
                  <thead>
                    <tr>
                      <th className="px-3 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Article</th>
                      <th className="px-3 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider hidden sm:table-cell">Source</th>
                      <th className="px-3 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Result</th>
                      <th className="px-3 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {recentAnalyses.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/50 transition-colors cursor-pointer" onClick={() => navigate('/analyze')}>
                        <td className="px-3 py-4">
                          <p className="text-sm font-bold text-slate-900 truncate max-w-[200px] md:max-w-xs">{item.title || 'Untitled'}</p>
                        </td>
                        <td className="px-3 py-4 hidden sm:table-cell text-sm text-slate-600 font-medium">{item.source_name || '-'}</td>
                        <td className="px-3 py-4">
                          <StatusBadge status={item.classification} score={item.credibility_score} />
                        </td>
                        <td className="px-3 py-4 text-right text-sm text-slate-500 hidden md:table-cell">
                          {new Date(item.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="text-center text-slate-400 py-8 text-sm">No analyses yet. Submit your first article to get started.</p>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="flex flex-col gap-6">
          <div className="bg-slate-900 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-brand-500 rounded-full blur-[60px] opacity-30 pointer-events-none"></div>
            <h3 className="text-lg font-bold mb-2 flex items-center gap-2 z-10 relative">
              <Upload className="w-5 h-5 text-brand-400" /> Quick Analysis
            </h3>
            <p className="text-slate-400 text-sm mb-4 z-10 relative">Drop a URL or snippet to verify instantly.</p>
            <form onSubmit={handleQuickSubmit} className="relative z-10">
              <textarea
                className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-sm text-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500 resize-none mb-3"
                rows="3" placeholder="Paste article content or URL here..."
                value={quickSubmitText} onChange={(e) => setQuickSubmitText(e.target.value)} required
              ></textarea>
              <button type="submit" className="w-full py-2.5 bg-brand-600 hover:bg-brand-500 rounded-xl text-sm font-bold transition-colors">Analyze Content</button>
            </form>
          </div>

          <div className="glass rounded-2xl p-6 shadow-sm">
            <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-red-500" /> Top Flagged Sources
            </h3>
            {topFlagged.length > 0 ? (
              <div className="space-y-4">
                {topFlagged.map((source, idx) => (
                  <div key={idx} className="flex justify-between items-center group">
                    <div className="flex-1 min-w-0 pr-4">
                      <p className="text-sm font-bold text-slate-800 truncate group-hover:text-red-600 transition-colors uppercase cursor-pointer">{source.domain}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{source.hits} articles</p>
                    </div>
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800 border border-red-200">
                      {source.avgScore}% avg
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-400 text-center py-4">No flagged sources yet.</p>
            )}
            <Link to="/analytics" className="block text-center text-sm font-medium text-brand-600 mt-5 pt-3 border-t border-slate-100 hover:text-brand-700">
              View Source Analytics
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
