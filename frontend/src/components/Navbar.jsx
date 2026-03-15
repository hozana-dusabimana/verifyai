import { Link, useLocation } from 'react-router-dom';
import { ShieldCheck, Bell, User, LogOut, Menu, X } from 'lucide-react';
import { useState } from 'react';

const Navbar = ({ user, setUser }) => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  const handleLogout = () => {
    setUser(null);
  };

  const navLinks = user ? [
    { name: 'Dashboard', path: '/dashboard' },
    { name: 'Analyze', path: '/analyze' },
    { name: 'History', path: '/history' },
    { name: 'Analytics', path: '/analytics' },
  ] : [
    { name: 'How It Works', path: '/#how-it-works' },
    { name: 'Pricing', path: '/#pricing' },
    { name: 'About Us', path: '/#about' },
    { name: 'Contact Us', path: '/#contact' },
  ];

  return (
    <nav className="sticky top-0 z-50 glass">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 justify-between items-center">
          {/* Logo */}
          <div className="flex px-2 lg:px-0">
            <Link to="/" className="flex flex-shrink-0 items-center gap-2 group">
              <ShieldCheck className="w-8 h-8 text-brand-600 transition-transform group-hover:scale-110" />
              <span className="font-bold text-xl tracking-tight text-slate-900">VerifyAI</span>
            </Link>
          </div>
          
          {/* Desktop Menu */}
          <div className="hidden lg:ml-6 lg:flex lg:space-x-8">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                to={link.path}
                className={`inline-flex items-center px-1 pt-1 text-sm font-medium transition-colors ${
                  location.pathname === link.path
                    ? 'text-brand-600 border-b-2 border-brand-500'
                    : 'text-slate-500 hover:text-slate-800 hover:border-b-2 hover:border-slate-300'
                }`}
              >
                {link.name}
              </Link>
            ))}
          </div>

          {/* Right Side - Auth / Buttons */}
          <div className="hidden lg:ml-6 lg:flex lg:items-center gap-4">
            {user ? (
              <>
                <Link to="/alerts" className="relative p-2 text-slate-400 hover:text-slate-500 transition-colors">
                  <span className="absolute top-1 right-1 block w-2 h-2 rounded-full bg-red-500 ring-2 ring-white" />
                  <Bell className="w-6 h-6" />
                </Link>
                
                <div className="relative group">
                  <button className="flex items-center gap-2 rounded-full bg-slate-100 p-1 pr-3 hover:bg-slate-200 transition-colors">
                    <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-bold">
                      {user.name ? user.name.charAt(0) : 'U'}
                    </div>
                    <span className="text-sm font-medium text-slate-700">{user.name || 'User'}</span>
                  </button>
                  <div className="absolute right-0 mt-2 w-48 origin-top-right rounded-md glass shadow-lg ring-1 ring-black ring-opacity-5 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                    <div className="py-1">
                      <Link to="/settings" className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2">
                        <User className="w-4 h-4" /> Profile
                      </Link>
                      <button onClick={handleLogout} className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2">
                        <LogOut className="w-4 h-4" /> Sign out
                      </button>
                    </div>
                  </div>
                </div>
              </>
            ) : (
               <div className="flex gap-4">
                  <Link to="/login" className="text-slate-600 hover:text-brand-600 font-medium px-3 py-2 transition-colors">Log in</Link>
                  <Link to="/register" className="bg-brand-600 text-white hover:bg-brand-700 px-4 py-2 rounded-lg font-medium transition-colors shadow-md hover:shadow-lg">
                    Sign up
                  </Link>
               </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="flex items-center justify-center lg:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="inline-flex items-center justify-center rounded-md p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-500 focus:outline-none"
            >
              {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="lg:hidden glass border-t border-slate-200/50">
          <div className="space-y-1 pb-3 pt-2">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                to={link.path}
                className={`block px-4 py-2 text-base font-medium ${
                  location.pathname === link.path
                    ? 'bg-brand-50 text-brand-700'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800'
                }`}
                onClick={() => setIsOpen(false)}
              >
                {link.name}
              </Link>
            ))}
          </div>
          <div className="border-t border-slate-200 pb-4 pt-4">
             {user ? (
                <div className="flex flex-col gap-2 px-4">
                  <Link to="/settings" onClick={() => setIsOpen(false)} className="text-base font-medium text-slate-600 hover:text-slate-800">Profile & Settings</Link>
                  <button onClick={() => { handleLogout(); setIsOpen(false); }} className="text-left text-base font-medium text-red-600 hover:text-red-800">Sign out</button>
                </div>
             ) : (
                <div className="flex flex-col gap-2 px-4">
                  <Link to="/login" onClick={() => setIsOpen(false)} className="block text-center rounded-md bg-slate-100 px-4 py-2 text-base font-medium text-slate-700 hover:bg-slate-200">Log in</Link>
                  <Link to="/register" onClick={() => setIsOpen(false)} className="block text-center rounded-md bg-brand-600 px-4 py-2 text-base font-medium text-white hover:bg-brand-700">Sign up</Link>
                </div>
             )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
