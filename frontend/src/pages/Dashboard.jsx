import { useState, useEffect } from 'react';
import { ShieldAlert, CheckCircle, HelpCircle, Activity, TrendingUp, Search, Bell, AlertTriangle, FileText, Upload } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const chartData = [
  { name: 'Mar 1', score: 85 }, { name: 'Mar 5', score: 82 },
  { name: 'Mar 10', score: 88 }, { name: 'Mar 15', score: 91 },
  { name: 'Mar 20', score: 78 }, { name: 'Mar 25', score: 84 },
  { name: 'Mar 30', score: 89 },
];

const resentAnalyses = [
  { id: '1', title: 'Local Mayor Addresses Water Quality Input...', source: 'local-news.org', score: 92, status: 'REAL', date: '2 mins ago' },
  { id: '2', title: 'SHOCKING: Central Bank to Seize all assets', source: 'truth-patriot-xyz.net', score: 12, status: 'FAKE', date: '1 hour ago' },
  { id: '3', title: 'New Tech Startup Promises Infinite Energy', source: 'tech-guru-blog.co', score: 45, status: 'UNCERTAIN', date: '3 hours ago' },
  { id: '4', title: 'Global Markets Rally on Tech Earnings', source: 'financial-times.com', score: 88, status: 'REAL', date: '5 hours ago' },
];

const topFlagged = [
  { domain: 'truth-patriot-xyz.net', hits: 142, avgScore: 18 },
  { domain: 'global-news-update.biz', hits: 89, avgScore: 22 },
  { domain: 'freedom-press-daily.info', hits: 67, avgScore: 25 },
];

const Dashboard = ({ user }) => {
  const navigate = useNavigate();
  const [quickSubmitText, setQuickSubmitText] = useState('');

  const handleQuickSubmit = (e) => {
    e.preventDefault();
    if (quickSubmitText) {
      navigate('/analyze', { state: { text: quickSubmitText } });
    }
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
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${styles[status]}`}>
        {icons[status]} {status} ({score}%)
      </span>
    );
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-end mb-2">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Dashboard</h1>
          <p className="text-slate-500 font-medium mt-1">Welcome back, {user?.name || 'Demo User'}. Here's your daily briefing.</p>
        </div>
        <Link to="/analyze" className="hidden sm:flex px-4 py-2 bg-brand-600 text-white rounded-xl font-medium shadow-md hover:bg-brand-700 hover:shadow-lg transition-all items-center gap-2">
          <Search className="w-4 h-4" /> New Analysis
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Articles Analyzed', value: '1,284', icon: <FileText className="w-6 h-6" />, color: 'bg-blue-50 text-blue-600' },
          { label: 'Avg Credibility', value: '76%', icon: <Activity className="w-6 h-6" />, color: 'bg-emerald-50 text-emerald-600' },
          { label: 'Active Alerts', value: '12', icon: <Bell className="w-6 h-6" />, color: 'bg-red-50 text-red-600', alert: true },
          { label: 'Pending Reviews', value: '5', icon: <AlertTriangle className="w-6 h-6" />, color: 'bg-amber-50 text-amber-600' },
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
              <div className={`p-3 rounded-xl ${stat.color} transition-transform group-hover:scale-110`}>
                {stat.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-2">
        {/* Main Content Area */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* Chart Area */}
          <div className="glass rounded-2xl p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-brand-600" /> Credibility Trend (30 Days)
            </h2>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} domain={[0, 100]} />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}/>
                  <Line type="monotone" dataKey="score" stroke="#0ea5e9" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Recent Analyses Area */}
          <div className="glass rounded-2xl px-6 py-5 shadow-sm">
            <div className="flex justify-between items-center mb-5">
               <h2 className="text-lg font-bold text-slate-900">Recent Analyses</h2>
               <Link to="/history" className="text-sm font-medium text-brand-600 hover:text-brand-700">View All</Link>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead>
                  <tr>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Article</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider hidden sm:table-cell">Source</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Result</th>
                    <th className="px-3 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {resentAnalyses.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors cursor-pointer" onClick={() => navigate('/analyze')}>
                      <td className="px-3 py-4">
                        <p className="text-sm font-bold text-slate-900 truncate max-w-[200px] md:max-w-xs">{item.title}</p>
                        <p className="text-xs text-slate-500 sm:hidden mt-1">{item.source}</p>
                      </td>
                      <td className="px-3 py-4 hidden sm:table-cell text-sm text-slate-600 font-medium">
                        {item.source}
                      </td>
                      <td className="px-3 py-4">
                        <StatusBadge status={item.status} score={item.score} />
                      </td>
                      <td className="px-3 py-4 text-right text-sm text-slate-500 hidden md:table-cell">
                        {item.date}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="flex flex-col gap-6">
          {/* Quick Submit Widget */}
          <div className="bg-slate-900 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
             <div className="absolute top-0 right-0 w-32 h-32 bg-brand-500 rounded-full blur-[60px] opacity-30 pointer-events-none"></div>
             <h3 className="text-lg font-bold mb-2 flex items-center gap-2 z-10 relative">
                <Upload className="w-5 h-5 text-brand-400" /> Quick Analysis
             </h3>
             <p className="text-slate-400 text-sm mb-4 z-10 relative">Drop a URL or snippet to verify instantly.</p>
             
             <form onSubmit={handleQuickSubmit} className="relative z-10">
               <textarea 
                 className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-sm text-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500 resize-none mb-3"
                 rows="3"
                 placeholder="Paste article content or URL here..."
                 value={quickSubmitText}
                 onChange={(e) => setQuickSubmitText(e.target.value)}
                 required
               ></textarea>
               <button type="submit" className="w-full py-2.5 bg-brand-600 hover:bg-brand-500 rounded-xl text-sm font-bold transition-colors">
                 Analyze Content
               </button>
             </form>
          </div>

          {/* Top Flagged Sources */}
          <div className="glass rounded-2xl p-6 shadow-sm">
             <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-red-500" /> Top Flagged Sources
             </h3>
             <div className="space-y-4">
                {topFlagged.map((source, idx) => (
                  <div key={idx} className="flex justify-between items-center group">
                     <div className="flex-1 min-w-0 pr-4">
                        <p className="text-sm font-bold text-slate-800 truncate group-hover:text-red-600 transition-colors uppercase cursor-pointer">{source.domain}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{source.hits} flagged articles</p>
                     </div>
                     <div className="flex-shrink-0 text-right">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800 border border-red-200">
                          {source.avgScore}% avg
                        </span>
                     </div>
                  </div>
                ))}
             </div>
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
