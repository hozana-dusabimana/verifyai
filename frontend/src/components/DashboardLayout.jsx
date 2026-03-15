import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ShieldCheck, LayoutDashboard, Search, History, BarChart2, Bell, Settings, User, LogOut, Menu, X, ChevronLeft, ChevronRight, Shield, Activity, Users, Database, FileText } from 'lucide-react';

const DashboardLayout = ({ user, setUser, children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    setUser(null);
    navigate('/');
  };

  const baseLinks = [
    { name: 'Dashboard', path: '/dashboard', icon: <LayoutDashboard className="w-5 h-5 flex-shrink-0" /> },
    { name: 'Analyze Content', path: '/analyze', icon: <Search className="w-5 h-5 flex-shrink-0" /> },
    { name: 'History', path: '/history', icon: <History className="w-5 h-5 flex-shrink-0" /> },
    { name: 'Analytics', path: '/analytics', icon: <BarChart2 className="w-5 h-5 flex-shrink-0" /> },
    { name: 'Alerts', path: '/alerts', icon: <Bell className="w-5 h-5 flex-shrink-0" /> },
    { name: 'Settings', path: '/settings', icon: <Settings className="w-5 h-5 flex-shrink-0" /> },
  ];

  const adminLinks = [
    { name: 'System Health', path: '/admin/health', icon: <Activity className="w-5 h-5 flex-shrink-0" /> },
    { name: 'User Management', path: '/admin/users', icon: <Users className="w-5 h-5 flex-shrink-0" /> },
    { name: 'Dataset Manager', path: '/admin/datasets', icon: <Database className="w-5 h-5 flex-shrink-0" /> },
    { name: 'Audit Logs', path: '/admin/audit', icon: <FileText className="w-5 h-5 flex-shrink-0" /> },
  ];

  const isAdminRoute = location.pathname.startsWith('/admin');

  const navLinks = isAdminRoute 
    ? [...adminLinks, { name: 'Exit Admin', path: '/dashboard', icon: <Shield className="w-5 h-5 flex-shrink-0 text-slate-400" /> }]
    : user?.role === 'Admin' 
      ? [...baseLinks, { name: 'Admin Console', path: '/admin/health', icon: <Shield className="w-5 h-5 flex-shrink-0 text-red-500" /> }]
      : baseLinks;

  // Close mobile sidebar on route change
  useEffect(() => {
    setIsMobileOpen(false);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-slate-50 flex overflow-hidden">
      
      {/* Mobile Sidebar Overlay */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 z-40 lg:hidden" 
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={`fixed lg:static inset-y-0 left-0 z-50 glass lg:bg-white/70 border-r border-slate-200/50 shadow-xl lg:shadow-none transition-all duration-300 ease-in-out flex flex-col ${
          isMobileOpen ? 'translate-x-0 w-64' : '-translate-x-full lg:translate-x-0'
        } ${isSidebarOpen ? 'lg:w-64' : 'lg:w-20'}`}
      >
        {/* Sidebar Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-200/50">
          <Link to="/dashboard" className={`flex items-center gap-2 group ${!isSidebarOpen && 'lg:justify-center lg:w-full lg:px-0'}`}>
            <ShieldCheck className="w-8 h-8 text-brand-600 transition-transform group-hover:scale-110 flex-shrink-0" />
            <span className={`font-bold text-xl tracking-tight text-slate-900 transition-opacity duration-200 ${!isSidebarOpen && 'lg:hidden'}`}>VerifyAI</span>
          </Link>
          <button 
            className="lg:hidden text-slate-500 hover:text-slate-800"
            onClick={() => setIsMobileOpen(false)}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Sidebar Navigation */}
        <div className="flex-1 py-6 flex flex-col gap-2 px-3 overflow-y-auto">
          {navLinks.map((link) => {
             const isActive = location.pathname === link.path || location.pathname.startsWith(link.path) && link.path !== '/';
             return (
               <Link
                 key={link.name}
                 to={link.path}
                 className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group ${
                   isActive 
                     ? 'bg-brand-50 text-brand-700 font-bold shadow-sm border border-brand-100' 
                     : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 font-medium border border-transparent'
                 } ${!isSidebarOpen && 'lg:justify-center lg:px-0'}`}
                 title={!isSidebarOpen ? link.name : ''}
               >
                 {link.icon}
                 <span className={`whitespace-nowrap transition-opacity duration-200 ${!isSidebarOpen && 'lg:hidden'}`}>
                   {link.name}
                 </span>
               </Link>
             )
          })}
        </div>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-slate-200/50">
           <button 
             onClick={handleLogout} 
             className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-red-600 hover:bg-red-50 hover:text-red-700 font-medium transition-colors ${!isSidebarOpen && 'lg:justify-center lg:px-0'}`}
             title={!isSidebarOpen ? 'Sign out' : ''}
           >
              <LogOut className="w-5 h-5 flex-shrink-0" />
              <span className={`whitespace-nowrap transition-opacity duration-200 ${!isSidebarOpen && 'lg:hidden'}`}>
                Sign out
              </span>
           </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        
        {/* Topbar */}
        <header className="h-16 glass z-30 flex items-center justify-between px-4 sm:px-6 border-b border-slate-200/50 sticky top-0">
          <div className="flex items-center gap-4">
             {/* Mobile menu toggle */}
             <button 
               className="lg:hidden text-slate-500 hover:text-slate-800 focus:outline-none"
               onClick={() => setIsMobileOpen(true)}
             >
               <Menu className="w-6 h-6" />
             </button>

             {/* Desktop Sidebar Toggle */}
             <button 
               className="hidden lg:flex items-center justify-center p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 focus:outline-none transition-colors border border-transparent hover:border-slate-200"
               onClick={() => setIsSidebarOpen(!isSidebarOpen)}
               title={isSidebarOpen ? 'Close sidebar' : 'Open sidebar'}
             >
               <Menu className="w-5 h-5" />
             </button>
          </div>

          <div className="flex items-center gap-4">
             <Link to="/alerts" className="relative p-2 text-slate-400 hover:text-slate-500 transition-colors">
               <span className="absolute top-1 right-1 block w-2 h-2 rounded-full bg-red-500 ring-2 ring-white" />
               <Bell className="w-6 h-6" />
             </Link>
             
             <div className="relative group">
               <button className="flex items-center gap-2 rounded-full bg-slate-100 p-1 pr-3 hover:bg-slate-200 transition-colors focus:outline-none">
                 <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-bold border border-brand-200">
                   {user?.name ? user.name.charAt(0) : 'U'}
                 </div>
                 <span className="text-sm font-medium text-slate-700 hidden sm:block">{user?.name || 'User'}</span>
               </button>
               <div className="absolute right-0 mt-2 w-48 origin-top-right rounded-xl glass shadow-xl ring-1 ring-black ring-opacity-5 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                 <div className="py-2">
                   <div className="px-4 py-2 border-b border-slate-100 mb-1">
                      <p className="text-sm font-bold text-slate-900 truncate">{user?.name || 'Demo User'}</p>
                      <p className="text-xs font-medium text-slate-500 truncate">{user?.role || 'User'}</p>
                   </div>
                   <Link to="/settings" className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2 font-medium">
                     <User className="w-4 h-4" /> Profile Details
                   </Link>
                   <button onClick={handleLogout} className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 font-medium">
                     <LogOut className="w-4 h-4" /> Sign out
                   </button>
                 </div>
               </div>
             </div>
          </div>
        </header>

        {/* Dashboard Content */}
        <main className="flex-1 overflow-y-auto w-full p-4 sm:p-6 lg:p-8 relative">
           {/* Decorative background blobs specific to content area */}
           <div className="absolute top-[-10%] right-[-5%] w-[40%] h-[40%] bg-brand-200/40 rounded-full blur-[100px] pointer-events-none" />
           <div className="absolute bottom-[-10%] left-[-5%] w-[40%] h-[40%] bg-blue-200/40 rounded-full blur-[100px] pointer-events-none" />
           
           <div className="max-w-7xl mx-auto relative z-10">
             {children}
           </div>
        </main>
        
      </div>
    </div>
  );
};

export default DashboardLayout;
