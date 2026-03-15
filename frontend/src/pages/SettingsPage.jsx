import { useState } from 'react';
import { User, Lock, Bell, Key, ShieldCheck, Mail, Save, Plus, Trash2, Smartphone, CheckCircle } from 'lucide-react';

const SettingsPage = () => {
  const [activeTab, setActiveTab] = useState('profile');
  const [apiKeys, setApiKeys] = useState([
    { id: '1', name: 'Production Pipeline', key: 'vfc_prod_8f9...3b21', created: '2026-01-15 10:30', used: '2 mins ago' },
    { id: '2', name: 'Dev Environment', key: 'vfc_dev_3e2...9a0c', created: '2026-02-10 14:15', used: 'Yesterday' }
  ]);

  const tabs = [
    { id: 'profile', label: 'Profile Settings', icon: <User className="w-4 h-4 mr-2" /> },
    { id: 'security', label: 'Security', icon: <Lock className="w-4 h-4 mr-2" /> },
    { id: 'notifications', label: 'Notifications', icon: <Bell className="w-4 h-4 mr-2" /> },
    { id: 'api', label: 'API Keys', icon: <Key className="w-4 h-4 mr-2" /> },
  ];

  return (
    <div className="flex flex-col md:flex-row gap-8">
      
      {/* Sidebar Navigation */}
      <div className="w-full md:w-64 flex-shrink-0">
         <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight mb-6">Settings</h1>
         <nav className="flex flex-row md:flex-col gap-2 overflow-x-auto pb-4 md:pb-0">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center whitespace-nowrap px-4 py-3 text-sm font-bold rounded-xl transition-all ${
                  activeTab === tab.id
                    ? 'bg-brand-50 text-brand-700 border border-brand-200 shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100/50 hover:text-slate-900 border border-transparent'
                }`}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
         </nav>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 glass rounded-3xl p-8 shadow-sm min-h-[500px]">
        
        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div className="animate-in fade-in max-w-2xl">
            <h2 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2"><User className="w-5 h-5 text-brand-600"/> Personal Information</h2>
            
            <div className="flex items-center gap-6 mb-8 pb-8 border-b border-slate-200">
               <div className="w-24 h-24 rounded-full bg-brand-100 flex items-center justify-center text-brand-600 text-3xl font-extrabold shadow-sm border-2 border-brand-200">
                  DU
               </div>
               <div>
                  <button className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-bold text-slate-700 hover:bg-slate-50 shadow-sm transition-colors">
                     Change Photo
                  </button>
                  <p className="text-xs font-medium text-slate-500 mt-2">JPG, GIF, or PNG. Max size 2MB.</p>
               </div>
            </div>

            <form className="space-y-6">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Full Name</label>
                    <input type="text" defaultValue="Demo User" className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 bg-white" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Email Address</label>
                    <input type="email" defaultValue="demo@verifyai.net" disabled className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 text-slate-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Organization</label>
                    <input type="text" defaultValue="Independent Press" className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 bg-white" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Role</label>
                    <select disabled className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 text-slate-500 appearance-none">
                      <option>Journalist</option>
                    </select>
                    <p className="text-xs font-medium text-amber-600 mt-1 flex items-center gap-1"><ShieldCheck className="w-3 h-3"/> Contact support to change role</p>
                  </div>
               </div>
               <button className="px-6 py-3 bg-brand-600 text-white rounded-xl font-bold flex items-center gap-2 hover:bg-brand-700 shadow-md transition-all mt-4">
                  <Save className="w-4 h-4" /> Save Changes
               </button>
            </form>
          </div>
        )}

        {/* Security Tab */}
        {activeTab === 'security' && (
          <div className="animate-in fade-in max-w-2xl">
            <h2 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2"><Lock className="w-5 h-5 text-brand-600"/> Security Settings</h2>
            
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 mb-8 flex justify-between items-center">
               <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                     <Smartphone className="w-4 h-4 text-emerald-600"/> Two-Factor Authentication (2FA)
                  </h3>
                  <p className="text-sm font-medium text-slate-500 mt-1">Currently disabled. We highly recommend enabling TOTP 2FA.</p>
               </div>
               <button className="px-4 py-2 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-colors shadow-md">
                  Enable
               </button>
            </div>

            <form className="space-y-6">
               <h3 className="text-sm font-bold text-slate-900 border-b border-slate-200 pb-2">Change Password</h3>
               <div>
                 <label className="block text-sm font-bold text-slate-700 mb-1">Current Password</label>
                 <input type="password" placeholder="••••••••" className="w-full md:w-2/3 px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 bg-white" />
               </div>
               <div>
                 <label className="block text-sm font-bold text-slate-700 mb-1">New Password</label>
                 <input type="password" placeholder="••••••••" className="w-full md:w-2/3 px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 bg-white" />
               </div>
               <div>
                 <label className="block text-sm font-bold text-slate-700 mb-1">Confirm New Password</label>
                 <input type="password" placeholder="••••••••" className="w-full md:w-2/3 px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 bg-white" />
               </div>
               <button className="px-6 py-3 bg-slate-200 text-slate-700 hover:bg-slate-300 rounded-xl font-bold transition-all">
                  Update Password
               </button>
            </form>
          </div>
        )}

        {/* API Tab */}
        {activeTab === 'api' && (
          <div className="animate-in fade-in">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
               <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                 <Key className="w-5 h-5 text-brand-600"/> API Keys 
                 <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full font-bold">Pro Tier</span>
               </h2>
               <button className="px-4 py-2 bg-brand-600 text-white rounded-xl font-bold flex items-center gap-2 hover:bg-brand-700 shadow-md transition-all">
                  <Plus className="w-4 h-4" /> Generate New Key
               </button>
            </div>
            
            <p className="text-sm font-medium text-slate-500 mb-8 max-w-3xl">API keys allow programmatic access to the ML inference engine and analysis submission endpoints. Do not share your keys publicly.</p>

            <div className="overflow-x-auto border border-slate-200 rounded-2xl bg-white">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Name / Purpose</th>
                    <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Key (Truncated)</th>
                    <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider hidden sm:table-cell">Created</th>
                    <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider hidden md:table-cell">Last Used</th>
                    <th scope="col" className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {apiKeys.map((k) => (
                    <tr key={k.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-slate-900">
                        {k.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono bg-slate-100 text-slate-600 px-2 py-1 rounded inline-flex mt-3 ml-6 mb-3 border border-slate-200">
                        {k.key}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-500 hidden sm:table-cell">
                        {k.created}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-emerald-600 hidden md:table-cell">
                        {k.used}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-lg transition-colors" title="Revoke Key">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        
        {/* Notifications mock padding */}
        {activeTab === 'notifications' && (
           <div className="animate-in fade-in max-w-2xl">
             <h2 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2"><Bell className="w-5 h-5 text-brand-600"/> Notification Preferences</h2>
             <p className="text-sm text-slate-500">Go to the Alerts center to configure advanced threshold settings.</p>
           </div>
        )}

      </div>
    </div>
  );
};

export default SettingsPage;
