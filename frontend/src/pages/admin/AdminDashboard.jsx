import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Shield, Users, Activity, Database, FileText, Settings, Key, Zap, CheckCircle, Search, RefreshCw, Upload, Play, AlertTriangle } from 'lucide-react';

const AdminDashboard = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Get active tab from URL, default to health
  const currentPathTab = location.pathname.split('/').pop();
  const validTabs = ['health', 'users', 'datasets', 'audit'];
  const activeTab = validTabs.includes(currentPathTab) ? currentPathTab : 'health';

  const setActiveTab = (tabId) => {
    navigate(`/admin/${tabId}`);
  };

  const tabs = [
    { id: 'health', label: 'System Health', icon: <Activity className="w-4 h-4 mr-2" /> },
    { id: 'users', label: 'User Management', icon: <Users className="w-4 h-4 mr-2" /> },
    { id: 'datasets', label: 'Dataset Manager', icon: <Database className="w-4 h-4 mr-2" /> },
    { id: 'audit', label: 'Audit Logs', icon: <FileText className="w-4 h-4 mr-2" /> },
  ];

  const mockUsers = [
    { id: 1, name: 'Demo User', email: 'demo@verifyai.net', role: 'Journalist', status: 'Active' },
    { id: 2, name: 'Sarah Jenkins', email: 'sarah.j@gov.us', role: 'Government', status: 'Active' },
    { id: 3, name: 'Alex Doe', email: 'alex@example.com', role: 'Citizen', status: 'Inactive' },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4 mb-2">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
            <Shield className="text-brand-600 w-8 h-8" /> Admin Console
          </h1>
          <p className="text-slate-500 font-medium mt-1">Manage global platform settings, access controls, and monitor system health.</p>
        </div>
        <div className="text-xs font-bold text-white bg-red-600 px-3 py-1 rounded-full uppercase tracking-wider animate-pulse flex items-center gap-1">
          <AlertTriangle className="w-3 h-3"/> Restricted Area
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 p-1 bg-slate-200/50 rounded-xl max-w-2xl border border-slate-200">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex flex-col sm:flex-row flex-1 items-center justify-center py-2.5 px-3 text-sm font-bold rounded-lg transition-all ${
              activeTab === tab.id
                ? 'bg-white text-brand-700 shadow-sm border border-slate-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50 border border-transparent'
            }`}
          >
            {tab.icon} <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      <div className="glass rounded-3xl p-6 md:p-8 shadow-sm border border-slate-200/60 min-h-[600px]">
        
        {/* System Health */}
        {activeTab === 'health' && (
          <div className="animate-in fade-in">
             <div className="flex justify-between items-center mb-8 pb-4 border-b border-slate-200">
               <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                 <Activity className="text-brand-600"/> Infrastructure Status
               </h2>
               <button className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-brand-600 transition-colors">
                  <RefreshCw className="w-4 h-4" /> Refresh
               </button>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                {[
                  { label: 'API Response (p95)', value: '184ms', desc: 'Target < 500ms', status: 'optimal' },
                  { label: 'ML Inference Temp', value: '2.1s', desc: 'DistilBERT CPU', status: 'optimal' },
                  { label: 'Task Queue Depth', value: '42', desc: 'Celery Workers: 4', status: 'warning' },
                  { label: 'System Uptime', value: '99.98%', desc: 'Last 30 days', status: 'optimal' },
                ].map((metric, i) => (
                  <div key={i} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm relative overflow-hidden">
                     <div className={`absolute top-0 right-0 w-16 h-16 blur-2xl opacity-20 ${metric.status === 'optimal' ? 'bg-emerald-500' : 'bg-amber-500'}`}></div>
                     <p className="text-sm font-bold text-slate-500 mb-1">{metric.label}</p>
                     <p className="text-3xl font-extrabold text-slate-900">{metric.value}</p>
                     <div className="mt-3 flex items-center gap-2">
                        {metric.status === 'optimal' ? <CheckCircle className="w-4 h-4 text-emerald-500"/> : <AlertTriangle className="w-4 h-4 text-amber-500"/>}
                        <p className="text-xs font-medium text-slate-600">{metric.desc}</p>
                     </div>
                  </div>
                ))}
             </div>

             <h2 className="text-lg font-bold text-slate-900 mb-4 pb-2 border-b border-slate-200 flex items-center gap-2">
               <Database className="text-brand-600"/> Service Map
             </h2>
             <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {['React.js SPA', 'Flask Backend', 'Scikit/Torch ML', 'Celery Workers', 'MySQL 8.0', 'Redis Cache'].map((node, i) => (
                   <div key={i} className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-xl">
                      <span className="font-bold text-slate-700 text-sm">{node}</span>
                      <span className="flex h-3 w-3 relative">
                         <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                         <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                      </span>
                   </div>
                ))}
             </div>
          </div>
        )}

        {/* User Management */}
        {activeTab === 'users' && (
          <div className="animate-in fade-in">
             <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 border-b border-slate-200 pb-4">
               <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                 <Users className="text-brand-600"/> User Management
               </h2>
               <div className="relative w-full md:w-64">
                 <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                   <Search className="h-4 w-4 text-slate-400" />
                 </div>
                 <input type="text" className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg text-sm bg-white" placeholder="Search users by email..." />
               </div>
             </div>

             <div className="overflow-x-auto bg-white border border-slate-200 rounded-2xl">
               <table className="min-w-full divide-y divide-slate-200">
                 <thead className="bg-slate-50">
                   <tr>
                     <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">User Name</th>
                     <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">Email</th>
                     <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">Role</th>
                     <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">Status</th>
                     <th className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase">Actions</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100">
                   {mockUsers.map((user) => (
                     <tr key={user.id} className="hover:bg-slate-50/50">
                       <td className="px-6 py-4 font-bold text-slate-900 text-sm">{user.name}</td>
                       <td className="px-6 py-4 text-slate-600 text-sm">{user.email}</td>
                       <td className="px-6 py-4">
                         <select className="text-sm bg-white border border-slate-300 rounded-md py-1 px-2 focus:ring-brand-500 cursor-pointer font-medium" defaultValue={user.role}>
                           <option>Citizen</option>
                           <option>Journalist</option>
                           <option>Government</option>
                           <option>Admin</option>
                         </select>
                       </td>
                       <td className="px-6 py-4">
                         <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${user.status === 'Active' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-800'}`}>
                           {user.status}
                         </span>
                       </td>
                       <td className="px-6 py-4 text-right">
                         <button className="text-sm font-bold text-brand-600 hover:text-brand-800 transition-colors bg-brand-50 hover:bg-brand-100 px-3 py-1 rounded-md">
                           {user.status === 'Active' ? 'Deactivate' : 'Activate'}
                         </button>
                       </td>
                     </tr>
                   ))}
                 </tbody>
               </table>
             </div>
          </div>
        )}

        {/* Dataset Manager */}
        {activeTab === 'datasets' && (
          <div className="animate-in fade-in">
             <div className="flex justify-between items-center mb-6 border-b border-slate-200 pb-4">
               <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                 <Database className="text-brand-600"/> ML Training Datasets
               </h2>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                <div className="border border-slate-300 border-dashed rounded-3xl p-10 text-center flex flex-col items-center justify-center bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer group">
                   <div className="p-4 bg-brand-100 text-brand-600 rounded-2xl group-hover:scale-110 transition-transform mb-4">
                      <Upload className="w-8 h-8" />
                   </div>
                   <h3 className="font-bold text-slate-900">Upload Dataset</h3>
                   <p className="text-sm text-slate-500 mt-1 max-w-xs">CSV or JSON format. Must contain labeled 'text' and 'classification' columns.</p>
                </div>
                
                <div className="bg-slate-900 text-white rounded-3xl p-8 relative overflow-hidden shadow-xl">
                   <div className="absolute top-0 right-0 w-48 h-48 bg-brand-600 rounded-full blur-[80px] opacity-30"></div>
                   <div className="relative z-10 w-full h-full flex flex-col justify-center">
                     <h3 className="text-xl font-bold mb-2 flex items-center gap-2">
                        <Play className="w-5 h-5 text-brand-400"/> Trigger Retraining
                     </h3>
                     <p className="text-slate-400 text-sm mb-6 max-w-sm">Initiate an asynchronous pipeline job to re-tune DistilBERT weights using the latest uploaded dataset. This will temporarily reduce inference capacity.</p>
                     <button className="self-start px-6 py-3 bg-brand-600 hover:bg-brand-500 rounded-xl font-bold text-white transition-colors shadow-lg">
                        Start Retraining Job
                     </button>
                   </div>
                </div>
             </div>

             <h3 className="text-sm font-bold text-slate-700 mb-3 border-b border-slate-100 pb-2">Available Datasets</h3>
             <ul className="space-y-3">
               {[
                 { name: 'FakeNewsNet-Cleaned.csv', rows: '24,500', date: '2026-01-10', active: true },
                 { name: 'LIAR-Dataset-V2.json', rows: '12,800', date: '2025-11-23', active: true },
                 { name: 'Custom-Political-Claims-Q1.csv', rows: '4,200', date: '2026-03-01', active: false },
               ].map((ds, i) => (
                 <li key={i} className="flex justify-between items-center p-4 bg-white border border-slate-200 rounded-xl">
                   <div className="flex items-center gap-4">
                      <FileText className="w-5 h-5 text-slate-400" />
                      <div>
                         <p className="font-bold text-slate-900 text-sm">{ds.name}</p>
                         <p className="text-xs font-medium text-slate-500">Rows: {ds.rows} | Uploaded: {ds.date}</p>
                      </div>
                   </div>
                   {ds.active ? (
                     <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded border border-emerald-200 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3"/> Active in Model
                     </span>
                   ) : (
                     <button className="text-xs font-bold text-slate-600 bg-slate-100 hover:bg-brand-50 hover:text-brand-700 px-3 py-1.5 rounded-lg transition-colors border border-slate-200">
                        Include in next training
                     </button>
                   )}
                 </li>
               ))}
             </ul>
          </div>
        )}

        {/* Audit Logs */}
        {activeTab === 'audit' && (
          <div className="animate-in fade-in">
             <div className="flex justify-between items-center mb-6 border-b border-slate-200 pb-4">
               <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                 <Shield className="text-brand-600"/> Security Audit Logs
               </h2>
               <button className="text-sm font-bold text-brand-600 hover:text-brand-700 transition-colors flex items-center gap-1">
                  Export CSV
               </button>
             </div>
             
             <div className="bg-slate-900 p-6 rounded-2xl shadow-inner font-mono text-sm h-96 overflow-y-auto w-full">
                {[
                  { time: '2026-03-15T10:14:02Z', ip: '192.168.1.45', user: 'admin@verifyai.net', action: 'ROLE_UPDATE', target: 'user_id=12' },
                  { time: '2026-03-15T10:13:58Z', ip: '192.168.1.45', user: 'admin@verifyai.net', action: 'AUTH_LOGIN_SUCCESS', target: 'session_id=xk9' },
                  { time: '2026-03-14T22:05:11Z', ip: '198.51.100.12', user: 'SYSTEM', action: 'ML_RETRAIN_JOB_COMPLETE', target: 'model_id=db_v4' },
                  { time: '2026-03-14T20:10:00Z', ip: '198.51.100.12', user: 'SYSTEM', action: 'ML_RETRAIN_JOB_STARTED', target: 'model_id=db_v4' },
                  { time: '2026-03-14T19:42:15Z', ip: '10.0.0.5', user: 'sarah.j@gov.us', action: 'ANALYSIS_EXPORT_PDF', target: 'analysis_id=992' },
                  { time: '2026-03-14T15:20:00Z', ip: '203.0.113.6', user: 'demo@verifyai.net', action: 'API_KEY_REVOKED', target: 'key_id=vfc_test' },
                  { time: '2026-03-14T10:00:12Z', ip: '203.0.113.88', user: 'UNKNOWN', action: 'AUTH_LOGIN_FAILED', target: 'attempt=3' },
                ].map((log, i) => (
                   <div key={i} className="mb-2 pb-2 border-b border-slate-800">
                      <span className="text-slate-500 mr-4">[{log.time}]</span>
                      <span className="text-amber-500 mr-4">{log.ip}</span>
                      <span className="text-blue-400 mr-4 w-32 inline-block truncate align-bottom">{log.user}</span>
                      <span className="text-emerald-400 mr-4 font-bold">{log.action}</span>
                      <span className="text-slate-300">{log.target}</span>
                   </div>
                ))}
             </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default AdminDashboard;
