import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Download, TrendingUp, ShieldAlert, Tag, Globe, FileText } from 'lucide-react';
import { analyticsAPI } from '../services/api';

const COLORS = ['#10b981', '#ef4444', '#f59e0b', '#3b82f6', '#8b5cf6'];

const csvEscape = (v) => {
  const s = v == null ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

const AnalyticsPage = () => {
  const { t } = useTranslation();
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

  const exportCSV = () => {
    const rows = [
      [t('analytics.report.title')],
      [t('analytics.report.generatedLabel'), new Date().toLocaleString()],
      [],
      [t('analytics.trends.csvSection')],
      [t('analytics.columns.date'), t('common.verdict.real'), t('common.verdict.fake')],
      ...trendData.map((d) => [d.name, d.real, d.fake]),
      [],
      [t('analytics.sources.csvSection')],
      [t('analytics.columns.source'), t('analytics.columns.articles'), t('analytics.columns.avgCredibility')],
      ...sources.map((s) => [s.source_name, s.article_count, Math.round(s.average_credibility)]),
      [],
      [t('analytics.topics.csvSection')],
      [t('analytics.columns.topic'), t('analytics.columns.count')],
      ...topics.map((tp) => [tp.topic, tp.count]),
      [],
      [t('analytics.keywords.csvFakeSection')],
      [t('analytics.columns.keyword'), t('analytics.columns.count')],
      ...(keywords.fake_keywords || []).map((k) => [k.keyword, k.count]),
      [],
      [t('analytics.keywords.csvRealSection')],
      [t('analytics.columns.keyword'), t('analytics.columns.count')],
      ...(keywords.real_keywords || []).map((k) => [k.keyword, k.count]),
    ];
    const csv = rows.map((r) => r.map(csvEscape).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `verifyai_analytics_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportPDF = () => {
    const tbl = (cols, data) =>
      data.length === 0
        ? `<p style="color:#64748b">${t('analytics.report.noData')}</p>`
        : `<table><thead><tr>${cols.map((c) => `<th>${c}</th>`).join('')}</tr></thead><tbody>${
            data.map((row) => `<tr>${row.map((c) => `<td>${c}</td>`).join('')}</tr>`).join('')
          }</tbody></table>`;
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>${t('analytics.report.title')}</title>
      <style>
        body{font-family:system-ui,Arial,sans-serif;color:#0f172a;margin:32px;}
        h1{font-size:22px;margin:0 0 4px;} .sub{color:#64748b;margin:0 0 24px;font-size:13px;}
        h2{font-size:15px;margin:24px 0 8px;border-bottom:2px solid #e2e8f0;padding-bottom:4px;}
        table{border-collapse:collapse;width:100%;font-size:12px;margin-bottom:8px;}
        th,td{border:1px solid #e2e8f0;padding:6px 8px;text-align:left;} th{background:#f8fafc;}
        @media print{button{display:none;}}
      </style></head><body>
      <h1>${t('analytics.report.heading')}</h1>
      <p class="sub">${t('analytics.report.generated', { datetime: new Date().toLocaleString() })}</p>
      <h2>${t('analytics.trends.csvSection')}</h2>
      ${tbl([t('analytics.columns.date'), t('common.verdict.real'), t('common.verdict.fake')], trendData.map((d) => [d.name, d.real, d.fake]))}
      <h2>${t('analytics.sources.csvSection')}</h2>
      ${tbl([t('analytics.columns.source'), t('analytics.columns.articles'), t('analytics.columns.avgCredibility')], sources.map((s) => [s.source_name, s.article_count, Math.round(s.average_credibility)]))}
      <h2>${t('analytics.topics.csvSection')}</h2>
      ${tbl([t('analytics.columns.topic'), t('analytics.columns.count')], topics.map((tp) => [tp.topic, tp.count]))}
      <h2>${t('analytics.keywords.pdfFakeSection')}</h2>
      ${tbl([t('analytics.columns.keyword'), t('analytics.columns.count')], (keywords.fake_keywords || []).map((k) => [k.keyword, k.count]))}
      <h2>${t('analytics.keywords.pdfRealSection')}</h2>
      ${tbl([t('analytics.columns.keyword'), t('analytics.columns.count')], (keywords.real_keywords || []).map((k) => [k.keyword, k.count]))}
      <button onclick="window.print()" style="margin-top:24px;padding:8px 16px;font-weight:bold;cursor:pointer">${t('analytics.report.printSave')}</button>
      <script>window.onload=function(){setTimeout(function(){window.print();},300);};</script>
      </body></html>`;
    const w = window.open('', '_blank');
    if (!w) { alert(t('analytics.report.popupBlocked')); return; }
    w.document.write(html);
    w.document.close();
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
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">{t('analytics.title')}</h1>
          <p className="text-slate-500 font-medium mt-1">{t('analytics.subtitle')}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportPDF} className="hidden sm:flex px-4 py-2 bg-brand-600 text-white rounded-xl font-medium shadow-md hover:bg-brand-700 items-center gap-2">
            <FileText className="w-4 h-4" /> {t('analytics.exportPdf')}
          </button>
          <button onClick={exportCSV} className="hidden sm:flex px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-medium hover:bg-slate-200 items-center gap-2">
            <Download className="w-4 h-4" /> {t('analytics.exportCsv')}
          </button>
        </div>
      </div>

      {/* Detection Trend */}
      <div className="glass rounded-2xl p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-brand-600" /> {t('analytics.trends.title')}
        </h2>
        <div className="h-72 w-full">
          {trendData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trendData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <RechartsTooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Bar dataKey="real" fill="#10b981" radius={[4, 4, 0, 0]} name={t('common.verdict.real')} />
                <Bar dataKey="fake" fill="#ef4444" radius={[4, 4, 0, 0]} name={t('common.verdict.fake')} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-400 text-sm">{t('analytics.trends.empty')}</div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Topic Distribution */}
        <div className="glass rounded-2xl p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Tag className="w-5 h-5 text-brand-600" /> {t('analytics.topics.title')}
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
            <div className="h-64 flex items-center justify-center text-slate-400 text-sm">{t('analytics.topics.empty')}</div>
          )}
        </div>

        {/* Source Credibility Leaderboard */}
        <div className="glass rounded-2xl p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Globe className="w-5 h-5 text-brand-600" /> {t('analytics.sources.title')}
          </h2>
          {sources.length > 0 ? (
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {sources.map((s, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:bg-slate-50">
                  <div className="flex-1 min-w-0 pr-3">
                    <p className="text-sm font-bold text-slate-800 truncate">{s.source_name}</p>
                    <p className="text-xs text-slate-500">{t('analytics.sources.articles', { count: s.article_count })}</p>
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
            <div className="h-64 flex items-center justify-center text-slate-400 text-sm">{t('analytics.sources.empty')}</div>
          )}
        </div>
      </div>

      {/* Keyword Cloud */}
      <div className="glass rounded-2xl p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-red-500" /> {t('analytics.keywords.title')}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-sm font-bold text-red-600 uppercase mb-3">{t('analytics.keywords.inFake')}</h3>
            <div className="flex flex-wrap gap-2">
              {(keywords.fake_keywords || []).slice(0, 15).map((k, i) => (
                <span key={i} className="px-3 py-1.5 bg-red-50 text-red-700 rounded-full text-xs font-bold border border-red-100">
                  {k.keyword} ({k.count})
                </span>
              ))}
              {(!keywords.fake_keywords || keywords.fake_keywords.length === 0) && (
                <span className="text-sm text-slate-400">{t('analytics.keywords.empty')}</span>
              )}
            </div>
          </div>
          <div>
            <h3 className="text-sm font-bold text-emerald-600 uppercase mb-3">{t('analytics.keywords.inReal')}</h3>
            <div className="flex flex-wrap gap-2">
              {(keywords.real_keywords || []).slice(0, 15).map((k, i) => (
                <span key={i} className="px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-full text-xs font-bold border border-emerald-100">
                  {k.keyword} ({k.count})
                </span>
              ))}
              {(!keywords.real_keywords || keywords.real_keywords.length === 0) && (
                <span className="text-sm text-slate-400">{t('analytics.keywords.empty')}</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPage;
