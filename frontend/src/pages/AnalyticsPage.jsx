import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Download, TrendingUp, ShieldAlert, Tag, Globe } from 'lucide-react';
import { analyticsAPI, reportsAPI } from '../services/api';

const COLORS = ['#10b981', '#ef4444', '#f59e0b', '#3b82f6', '#8b5cf6'];

const AnalyticsPage = () => {
  const [trendData, setTrendData] = useState([]);
  const [sources, setSources] = useState([]);
  const [keywords, setKeywords] = useState({ fake_keywords: [], real_keywords: [] });
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [trendsRes, sourcesRes, keywordsRes, topicsRes] = await Promise.allSettled([
          analyticsAPI.getTrends({ days: 30 }),
          analyticsAPI.getSources(),
          analyticsAPI.getKeywords(),
          analyticsAPI.getTopics(),
        ]);
        if (trendsRes.status === 'fulfilled') {
          setTrendData((trendsRes.value.data.data || []).map(t => ({
            name: new Date(t.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            real: t.real_count,
            fake: t.fake_count,
          })));
        }
        if (sourcesRes.status === 'fulfilled') setSources(sourcesRes.value.data.data || []);
        if (keywordsRes.status === 'fulfilled') setKeywords(keywordsRes.value.data.data || { fake_keywords: [], real_keywords: [] });
        if (topicsRes.status === 'fulfilled') setTopics(topicsRes.value.data.data || []);
      } catch { /* ignore */ }
      finally { setLoading(false); }
    };
    fetchAll();
  }, []);

  const handleExportReport = async (format) => {
    try {
      await reportsAPI.generate({
        title: `Analytics Report - ${new Date().toLocaleDateString()}`,
        report_format: format,
      });
      alert(`${format.toUpperCase()} report generation queued.`);
    } catch { /* ignore */ }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Analytics & Reports</h1>
          <p className="text-slate-500 font-medium mt-1">Insights from your content analysis activity.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => handleExportReport('pdf')} className="hidden sm:flex px-4 py-2 bg-brand-600 text-white rounded-xl font-medium shadow-md hover:bg-brand-700 items-center gap-2">
            <Download className="w-4 h-4" /> Export PDF
          </button>
          <button onClick={() => handleExportReport('csv')} className="hidden sm:flex px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-medium hover:bg-slate-200 items-center gap-2">
            <Download className="w-4 h-4" /> Export CSV
          </button>
        </div>
      </div>

      {/* Detection Trend */}
      <div className="glass rounded-2xl p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-brand-600" /> Detection Trends (30 Days)
        </h2>
        <div className="h-72 w-full">
          {trendData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trendData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <RechartsTooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Bar dataKey="real" fill="#10b981" radius={[4, 4, 0, 0]} name="Real" />
                <Bar dataKey="fake" fill="#ef4444" radius={[4, 4, 0, 0]} name="Fake" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-400 text-sm">No trend data available yet.</div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Topic Distribution */}
        <div className="glass rounded-2xl p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Tag className="w-5 h-5 text-brand-600" /> Topic Distribution
          </h2>
          {topics.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={topics} dataKey="count" nameKey="topic" cx="50%" cy="50%" outerRadius={90} label={({ topic, percent }) => `${topic} ${(percent * 100).toFixed(0)}%`}>
                    {topics.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <RechartsTooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-slate-400 text-sm">No topic data yet.</div>
          )}
        </div>

        {/* Source Credibility Leaderboard */}
        <div className="glass rounded-2xl p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Globe className="w-5 h-5 text-brand-600" /> Source Credibility
          </h2>
          {sources.length > 0 ? (
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {sources.map((s, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:bg-slate-50">
                  <div className="flex-1 min-w-0 pr-3">
                    <p className="text-sm font-bold text-slate-800 truncate">{s.source_name}</p>
                    <p className="text-xs text-slate-500">{s.article_count} articles</p>
                  </div>
                  <div className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
                    s.average_credibility > 60 ? 'bg-emerald-100 text-emerald-800 border-emerald-200' :
                    s.average_credibility > 30 ? 'bg-amber-100 text-amber-800 border-amber-200' :
                    'bg-red-100 text-red-800 border-red-200'
                  }`}>
                    {Math.round(s.average_credibility)}%
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-slate-400 text-sm">No source data yet.</div>
          )}
        </div>
      </div>

      {/* Keyword Cloud */}
      <div className="glass rounded-2xl p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-red-500" /> Top Keywords
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-sm font-bold text-red-600 uppercase mb-3">In Fake Articles</h3>
            <div className="flex flex-wrap gap-2">
              {(keywords.fake_keywords || []).slice(0, 15).map((k, i) => (
                <span key={i} className="px-3 py-1.5 bg-red-50 text-red-700 rounded-full text-xs font-bold border border-red-100">
                  {k.keyword} ({k.count})
                </span>
              ))}
              {(!keywords.fake_keywords || keywords.fake_keywords.length === 0) && (
                <span className="text-sm text-slate-400">No data yet</span>
              )}
            </div>
          </div>
          <div>
            <h3 className="text-sm font-bold text-emerald-600 uppercase mb-3">In Real Articles</h3>
            <div className="flex flex-wrap gap-2">
              {(keywords.real_keywords || []).slice(0, 15).map((k, i) => (
                <span key={i} className="px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-full text-xs font-bold border border-emerald-100">
                  {k.keyword} ({k.count})
                </span>
              ))}
              {(!keywords.real_keywords || keywords.real_keywords.length === 0) && (
                <span className="text-sm text-slate-400">No data yet</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPage;
