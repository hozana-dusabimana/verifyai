import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Download, TrendingUp, AlertTriangle, ShieldCheck, Tag, Cloud, Users, Globe, ShieldAlert } from 'lucide-react';

const trendData = [
  { name: 'Week 1', real: 120, fake: 35 },
  { name: 'Week 2', real: 132, fake: 42 },
  { name: 'Week 3', real: 101, fake: 56 },
  { name: 'Week 4', real: 145, fake: 32 },
];

const topicData = [
  { name: 'Politics', value: 400, color: '#0ea5e9' },
  { name: 'Economy', value: 300, color: '#f59e0b' },
  { name: 'Health', value: 300, color: '#10b981' },
  { name: 'Tech', value: 200, color: '#8b5cf6' },
  { name: 'Entertainment', value: 100, color: '#ec4899' },
];

const keywordsFake = ['shocking', 'truth', 'secret', 'banned', 'elite', 'revealed', 'hoax'];
const keywordsReal = ['report', 'announced', 'according', 'study', 'official', 'statement'];

const AnalyticsPage = () => {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4 mb-2">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Analytics & Reports</h1>
          <p className="text-slate-500 font-medium mt-1">Deep dive into platform-wide misinformation trends.</p>
        </div>
        <button className="px-4 py-2 bg-brand-600 text-white rounded-xl font-bold flex items-center gap-2 hover:bg-brand-700 shadow-md transition-all">
          <Download className="w-4 h-4" /> Generate Full Report
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Detection Trends */}
        <div className="glass rounded-3xl p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-brand-600" /> Real vs. Fake Articles
          </h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trendData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                <RechartsTooltip cursor={{fill: 'transparent'}} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Bar dataKey="real" name="Credible (Real)" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={40} />
                <Bar dataKey="fake" name="High Risk (Fake)" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Topic Heatmap / Distribution */}
        <div className="glass rounded-3xl p-6 shadow-sm flex flex-col">
          <h2 className="text-lg font-bold text-slate-900 mb-2 flex items-center gap-2">
            <Globe className="w-5 h-5 text-brand-600" /> Analyzed Topics Distribution
          </h2>
          <div className="flex-1 flex items-center justify-center relative">
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={topicData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value">
                  {topicData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                  ))}
                </Pie>
                <RechartsTooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
              </PieChart>
            </ResponsiveContainer>
            
            {/* Custom Legend */}
            <div className="absolute right-0 top-1/2 -translate-y-1/2 flex flex-col gap-3">
               {topicData.map((topic, i) => (
                 <div key={i} className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full" style={{backgroundColor: topic.color}}></span>
                    <span className="text-sm font-bold text-slate-700">{topic.name}</span>
                 </div>
               ))}
            </div>
          </div>
        </div>

        {/* Source Leaderboard */}
        <div className="glass rounded-3xl p-6 shadow-sm lg:col-span-2">
          <div className="flex justify-between items-center mb-6">
             <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
               <AlertTriangle className="w-5 h-5 text-brand-600" /> Source Credibility Leaderboard
             </h2>
             <span className="text-sm font-medium px-3 py-1 bg-slate-100 rounded-full text-slate-600">Last 30 Days</span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
             {/* Lowest */}
             <div>
                <h3 className="text-sm font-bold text-red-600 uppercase tracking-wide mb-4 flex items-center gap-2"><ShieldAlert className="w-4 h-4"/> Lowest Credibility</h3>
                <div className="space-y-3">
                   {[
                     { domain: 'truthpatriot.xyz', score: 12, fakeCount: 450 },
                     { domain: 'globalnet-news.info', score: 18, fakeCount: 320 },
                     { domain: 'daily-outrage.com', score: 25, fakeCount: 289 },
                   ].map((src, i) => (
                      <div key={i} className="flex justify-between items-center p-3 rounded-xl bg-red-50/50 border border-red-100">
                         <div>
                            <p className="font-bold text-slate-900">{i+1}. {src.domain}</p>
                            <p className="text-xs font-medium text-slate-500 mt-0.5">{src.fakeCount} flagged articles</p>
                         </div>
                         <div className="text-right">
                            <span className="text-lg font-extrabold text-red-600">{src.score}%</span>
                         </div>
                      </div>
                   ))}
                </div>
             </div>
             
             {/* Highest */}
             <div>
                <h3 className="text-sm font-bold text-emerald-600 uppercase tracking-wide mb-4 flex items-center gap-2"><ShieldCheck className="w-4 h-4"/> Highest Credibility</h3>
                <div className="space-y-3">
                   {[
                     { domain: 'reuters.com', score: 98, realCount: 1200 },
                     { domain: 'bbc.com/news', score: 96, realCount: 950 },
                     { domain: 'apnews.com', score: 95, realCount: 840 },
                   ].map((src, i) => (
                      <div key={i} className="flex justify-between items-center p-3 rounded-xl bg-emerald-50/50 border border-emerald-100">
                         <div>
                            <p className="font-bold text-slate-900">{i+1}. {src.domain}</p>
                            <p className="text-xs font-medium text-slate-500 mt-0.5">{src.realCount} verified articles</p>
                         </div>
                         <div className="text-right">
                            <span className="text-lg font-extrabold text-emerald-600">{src.score}%</span>
                         </div>
                      </div>
                   ))}
                </div>
             </div>
          </div>
        </div>

        {/* Keyword Cloud Mock */}
        <div className="glass rounded-3xl p-6 shadow-sm lg:col-span-2">
           <h2 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
             <Cloud className="w-5 h-5 text-brand-600" /> Dominant Keywords
           </h2>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="border border-slate-200 rounded-2xl p-6">
                 <h3 className="text-sm font-bold text-red-600 mb-4 flex items-center gap-2">High-Risk Articles (Fake)</h3>
                 <div className="flex flex-wrap gap-2">
                    {keywordsFake.map((word, i) => (
                      <span key={i} className={`inline-block border border-red-200 bg-red-50 text-red-800 rounded-full px-3 py-1 font-bold ${i < 2 ? 'text-lg' : i < 4 ? 'text-base' : 'text-sm'}`}>
                         #{word}
                      </span>
                    ))}
                 </div>
              </div>
              <div className="border border-slate-200 rounded-2xl p-6">
                 <h3 className="text-sm font-bold text-emerald-600 mb-4 flex items-center gap-2">Credible Articles (Real)</h3>
                 <div className="flex flex-wrap gap-2">
                    {keywordsReal.map((word, i) => (
                      <span key={i} className={`inline-block border border-emerald-200 bg-emerald-50 text-emerald-800 rounded-full px-3 py-1 font-bold ${i < 2 ? 'text-lg' : i < 4 ? 'text-base' : 'text-sm'}`}>
                         #{word}
                      </span>
                    ))}
                 </div>
              </div>
           </div>
        </div>

      </div>
    </div>
  );
};

export default AnalyticsPage;
