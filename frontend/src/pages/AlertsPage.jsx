import { useState } from 'react';
import { Bell, ShieldAlert, CheckCircle, Mail, HelpCircle, ArrowRight, Settings, Sliders, ChevronDown } from 'lucide-react';

const mockAlerts = [
  { id: 'al-01', title: 'Global Banking Collapse Imminent', score: 12, time: '14 mins ago', assigned: 'Unassigned', snippet: 'Top level executives at the central bank have secretly met to discuss seizing all citizen deposits by Friday...', status: 'open' },
  { id: 'al-02', title: 'New Voting Machines Found Pre-Hacked', score: 8, time: '1 hour ago', assigned: 'Sarah Jenkins', snippet: 'A whistleblower has released documents showing that the new tabulators come with a built-in algorithm to flip 10% of votes...', status: 'open' },
  { id: 'al-03', title: 'Miracle Cure for Cancer Suppressed by FDA', score: 22, time: '3 hours ago', assigned: 'Unassigned', snippet: 'The common dandelion root has been proven to cure stage 4 cancer in 48 hours, but big pharma is suppressing the study...', status: 'escalated' },
];

const AlertsPage = () => {
  const [alerts, setAlerts] = useState(mockAlerts);
  const [showSettings, setShowSettings] = useState(false);

  const handleAction = (id, action) => {
    if (action === 'dismiss') {
       setAlerts(alerts.filter(a => a.id !== id));
    } else if (action === 'resolve') {
       setAlerts(alerts.map(a => a.id === id ? { ...a, status: 'resolved' } : a));
       setTimeout(() => setAlerts(prev => prev.filter(a => a.id !== id)), 1000); // remove after animation
    } else if (action === 'escalate') {
       setAlerts(alerts.map(a => a.id === id ? { ...a, status: 'escalated' } : a));
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4 mb-2">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
            <Bell className="text-brand-600 w-8 h-8" /> Alert Center
          </h1>
          <p className="text-slate-500 font-medium mt-1">Manage high-risk content flags and system notifications.</p>
        </div>
        <button 
           onClick={() => setShowSettings(!showSettings)}
           className="px-4 py-2 bg-white text-slate-700 hover:bg-slate-50 border border-slate-300 rounded-xl font-bold flex items-center gap-2 shadow-sm transition-all"
        >
          <Settings className="w-4 h-4" /> Preferences
        </button>
      </div>

      {showSettings && (
         <div className="glass rounded-3xl p-6 shadow-sm border border-brand-200 animate-in fade-in slide-in-from-top-4">
            <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
               <Sliders className="w-5 h-5 text-brand-600" /> Notification Thresholds
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <div className="space-y-4">
                  <div className="flex justify-between items-center">
                     <span className="text-sm font-bold text-slate-700">Email Alerts</span>
                     <label className="relative inline-flex items-center cursor-pointer">
                       <input type="checkbox" className="sr-only peer" defaultChecked />
                       <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-600"></div>
                     </label>
                  </div>
                  <div>
                     <label className="text-sm font-medium text-slate-500 mb-1 block">Trigger Threshold (Credibility &lt; %)</label>
                     <input type="range" min="0" max="50" defaultValue="30" className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500" />
                     <div className="flex justify-between text-xs text-slate-400 mt-1 font-bold">
                        <span>0%</span>
                        <span className="text-brand-600">30%</span>
                        <span>50%</span>
                     </div>
                  </div>
               </div>
               <div className="space-y-4">
                  <div className="flex justify-between items-center">
                     <span className="text-sm font-bold text-slate-700">Push Notifications</span>
                     <label className="relative inline-flex items-center cursor-pointer">
                       <input type="checkbox" className="sr-only peer" defaultChecked />
                       <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-600"></div>
                     </label>
                  </div>
                  <div className="flex items-center justify-between p-3 border border-slate-200 rounded-xl bg-slate-50">
                     <div className="flex items-center gap-3">
                        <Mail className="w-5 h-5 text-slate-500" />
                        <span className="text-sm font-medium text-slate-700">Daily Digest Email</span>
                     </div>
                     <label className="relative inline-flex items-center cursor-pointer">
                       <input type="checkbox" className="sr-only peer" />
                       <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-600"></div>
                     </label>
                  </div>
               </div>
            </div>
         </div>
      )}

      {/* Alert Cards */}
      <div className="grid grid-cols-1 gap-6">
         {alerts.length === 0 ? (
            <div className="glass rounded-3xl p-12 text-center flex flex-col items-center shadow-sm">
               <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-4">
                  <CheckCircle className="w-8 h-8" />
               </div>
               <h3 className="text-lg font-bold text-slate-900 mb-2">You're all caught up!</h3>
               <p className="text-slate-500 font-medium">No active high-risk alerts require your attention right now.</p>
            </div>
         ) : alerts.map((alert) => (
            <div 
               key={alert.id} 
               className={`glass rounded-2xl shadow-sm border-l-4 p-6 transition-all duration-300 ${
                  alert.status === 'resolved' ? 'border-l-emerald-500 opacity-50 translate-x-full' :
                  alert.status === 'escalated' ? 'border-l-amber-500 bg-amber-50/10' :
                  'border-l-red-500'
               }`}
            >
               <div className="flex flex-col lg:flex-row gap-6">
                  
                  {/* Left Column: Visual Score */}
                  <div className="flex flex-col items-center justify-center w-24 flex-shrink-0 border-r border-slate-200 pr-6 lg:border-r-0 lg:pr-0">
                     <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Score</span>
                     <div className="relative flex items-center justify-center w-16 h-16 rounded-full bg-red-50 border-4 border-red-100">
                        <span className="text-2xl font-extrabold text-red-600">{alert.score}</span>
                     </div>
                  </div>

                  {/* Middle Column: Details */}
                  <div className="flex-1">
                     <div className="flex flex-wrap items-center gap-3 mb-2">
                        <h3 className="text-xl font-bold text-slate-900">{alert.title}</h3>
                        <span className={`text-xs font-bold px-2 py-1 rounded-full border ${
                           alert.status === 'escalated' ? 'bg-amber-100 text-amber-800 border-amber-200' : 'bg-red-100 text-red-800 border-red-200'
                        }`}>
                           {alert.status.toUpperCase()}
                        </span>
                     </div>
                     <p className="text-sm font-medium text-slate-600 italic border-l-2 border-slate-300 pl-3 mb-4 line-clamp-2">"{alert.snippet}"</p>
                     
                     <div className="flex flex-wrap items-center gap-4 text-xs font-bold text-slate-500">
                        <span><ShieldAlert className="w-4 h-4 inline mr-1 text-slate-400"/> Triggered: {alert.time}</span>
                        <span>Assignee: {alert.assigned}</span>
                     </div>
                  </div>

                  {/* Right Column: Actions */}
                  <div className="flex flex-row lg:flex-col gap-3 justify-center border-t border-slate-200 pt-4 lg:border-t-0 lg:pt-0 lg:border-l lg:pl-6 shrink-0 flex-wrap">
                     <button 
                        onClick={() => handleAction(alert.id, 'resolve')}
                        disabled={alert.status === 'resolved'}
                        className="px-4 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors flex-1 lg:flex-none"
                     >
                        <CheckCircle className="w-4 h-4"/> Mark Reviewed
                     </button>
                     <button 
                        onClick={() => handleAction(alert.id, 'escalate')}
                        disabled={alert.status === 'escalated' || alert.status === 'resolved'}
                        className="px-4 py-2 bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors flex-1 lg:flex-none"
                     >
                        <HelpCircle className="w-4 h-4"/> Escalate
                     </button>
                     <button 
                        onClick={() => handleAction(alert.id, 'dismiss')}
                        className="px-4 py-2 bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors w-full"
                     >
                        Dismiss
                     </button>
                  </div>

               </div>
            </div>
         ))}
      </div>
    </div>
  );
};

export default AlertsPage;
