import { useState, useEffect } from 'react';
import { Link, Navigate, useNavigate, useLocation } from 'react-router-dom';
import {
  Mail, Lock, ArrowRight, ArrowLeft, Eye, EyeOff, ShieldCheck, AlertCircle,
  CheckCircle2, KeyRound, Building2, Newspaper, Users, ChevronDown, Check,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const FEATURES = [
  'Instantly check if a news article is real or fake',
  'Understand every result with clear, plain-language reasons',
  'Get alerted the moment something looks misleading',
  'Independent, transparent fact-checking you can trust',
];

const DEMO_ACCOUNTS = [
  { role: 'Admin',      email: 'admin@verifyai.demo',      password: 'AdminDemo!2026',  icon: ShieldCheck, accent: 'bg-purple-500/15 text-purple-300' },
  { role: 'Government', email: 'gov@verifyai.demo',         password: 'GovDemo!2026',     icon: Building2,   accent: 'bg-blue-500/15 text-blue-300' },
  { role: 'Journalist', email: 'journalist@verifyai.demo',  password: 'JournoDemo!2026',  icon: Newspaper,   accent: 'bg-amber-500/15 text-amber-300' },
  { role: 'Citizen',    email: 'citizen@verifyai.demo',     password: 'CitizenDemo!2026', icon: Users,       accent: 'bg-slate-500/20 text-slate-300' },
];

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [errorKind, setErrorKind] = useState('error'); // 'error' | 'lockout' | 'network'
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const [showDemo, setShowDemo] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const { login, user } = useAuth();

  // Read flash message from registration redirect
  useEffect(() => {
    if (location.state?.message) {
      setInfo(location.state.message);
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  // Redirect if already logged in (idiomatic, no flash)
  if (user) return <Navigate to="/dashboard" replace />;

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setErrorKind('error');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      const status = err.response?.status;
      const msg = err.response?.data?.error;
      if (!err.response) {
        setError('Cannot reach the server. Check your connection and try again.');
        setErrorKind('network');
      } else if (status === 403 && typeof msg === 'string' && msg.toLowerCase().includes('locked')) {
        setError('Account temporarily locked after multiple failed attempts. Try again in 30 minutes or reset your password.');
        setErrorKind('lockout');
      } else {
        setError(typeof msg === 'string' ? msg : 'Invalid email or password.');
        setErrorKind('error');
      }
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (acct) => {
    setEmail(acct.email);
    setPassword(acct.password);
    setShowDemo(false);
    setError('');
  };

  const inputCls =
    'block w-full px-3 py-3 pl-10 rounded-xl bg-dark-900/60 border border-white/10 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/70 focus:border-brand-500 transition-shadow';

  return (
    <div className="min-h-screen w-full bg-dark-900 text-slate-200 flex items-center justify-center p-4 sm:p-6 relative overflow-hidden">
      {/* Ambient brand glows */}
      <div className="absolute -top-1/4 -left-1/4 w-[40rem] h-[40rem] bg-brand-500/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute -bottom-1/3 -right-1/4 w-[40rem] h-[40rem] bg-brand-700/15 rounded-full blur-[140px] pointer-events-none" />

      <div className="relative w-full max-w-5xl grid lg:grid-cols-2 rounded-3xl border border-white/10 bg-dark-800/80 backdrop-blur-xl shadow-2xl overflow-hidden">
        {/* ─── Left: brand panel ──────────────────────────────── */}
        <div className="hidden lg:flex flex-col justify-between p-10 relative overflow-hidden bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900">
          <div
            className="absolute inset-0 opacity-[0.07] pointer-events-none"
            style={{
              backgroundImage:
                'linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)',
              backgroundSize: '32px 32px',
            }}
          />
          <div className="absolute -top-16 -right-16 w-64 h-64 bg-brand-300/20 rounded-full blur-[90px] pointer-events-none" />

          <div className="relative z-10">
            <Link to="/" className="inline-flex items-center gap-3 group" aria-label="VerifyAI home">
              <div className="w-10 h-10 rounded-xl bg-white/15 border border-white/25 flex items-center justify-center backdrop-blur-sm group-hover:bg-white/25 transition-colors">
                <ShieldCheck className="w-5 h-5 text-white" />
              </div>
              <div className="leading-tight">
                <p className="text-white font-extrabold tracking-tight">VerifyAI</p>
                <p className="text-brand-100/80 text-xs font-medium">AI-powered fact verification</p>
              </div>
            </Link>

            <h2 className="mt-12 text-3xl xl:text-4xl font-extrabold text-white leading-tight tracking-tight">
              Verify what you read.<br />
              <span className="text-brand-100">Trust what you share.</span>
            </h2>
            <p className="mt-3.5 text-brand-50/85 text-sm leading-relaxed max-w-sm">
              Spot fake news in seconds. VerifyAI checks any article and tells you how trustworthy it is — in plain language anyone can understand.
            </p>

            <ul className="mt-9 space-y-4 max-w-sm">
              {FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-3">
                  <span className="mt-0.5 w-5 h-5 rounded-full bg-white/15 border border-white/25 flex items-center justify-center flex-shrink-0">
                    <Check className="w-3 h-3 text-white" strokeWidth={3} />
                  </span>
                  <span className="text-sm text-brand-50/90 leading-snug">{f}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="relative z-10 flex items-center justify-between pt-10 text-[11px] font-medium text-brand-100/70">
            <span>© 2026 VerifyAI</span>
            <span>v1.0.0</span>
          </div>
        </div>

        {/* ─── Right: sign-in form ────────────────────────────── */}
        <div className="p-8 sm:p-10">
          <div className="flex items-center justify-between mb-8">
            <Link to="/" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-400 hover:text-slate-200 transition-colors">
              <ArrowLeft className="w-4 h-4" /> Back to home
            </Link>
            {/* Compact brand mark for small screens */}
            <Link to="/" className="lg:hidden inline-flex items-center gap-2 text-slate-200 hover:text-white transition-colors" aria-label="VerifyAI home">
              <ShieldCheck className="w-5 h-5 text-brand-400" />
              <span className="font-extrabold tracking-tight">VerifyAI</span>
            </Link>
          </div>

          <h1 className="text-2xl font-extrabold text-white tracking-tight">Welcome back</h1>
          <p className="text-sm text-slate-400 mt-1.5 font-medium">
            Sign in to continue verifying content with VerifyAI.
          </p>

          <form onSubmit={handleLogin} className="space-y-4 mt-7">
            {info && (
              <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 px-4 py-3 rounded-xl text-sm font-medium flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{info}</span>
              </div>
            )}
            {error && (
              <div
                className={`px-4 py-3 rounded-xl text-sm font-medium flex items-start gap-2 border ${
                  errorKind === 'lockout'
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                    : errorKind === 'network'
                      ? 'bg-slate-500/10 border-slate-500/30 text-slate-300'
                      : 'bg-red-500/10 border-red-500/30 text-red-300'
                }`}
              >
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-xs font-bold text-slate-300 mb-1.5">
                Email address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-4 w-4 text-slate-500" />
                </div>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  className={inputCls}
                  placeholder="you@organization.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="password" className="block text-xs font-bold text-slate-300">
                  Password
                </label>
                <Link to="/forgot-password" className="text-xs font-semibold text-brand-400 hover:text-brand-300">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-slate-500" />
                </div>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  className={`${inputCls} pr-10`}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300"
                  onClick={() => setShowPassword((s) => !s)}
                  tabIndex={-1}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center pt-1">
              <input
                type="checkbox"
                id="remember-me"
                className="h-4 w-4 rounded border-white/20 bg-dark-900 text-brand-600 focus:ring-brand-500 cursor-pointer"
              />
              <label htmlFor="remember-me" className="ml-2 block text-sm text-slate-400 font-medium cursor-pointer">
                Keep me signed in on this device
              </label>
            </div>

            <button
              type="submit"
              disabled={loading || !email || !password}
              className="group w-full flex justify-center items-center gap-2 py-3 px-4 mt-2 text-sm font-bold rounded-xl text-white bg-brand-600 hover:bg-brand-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-dark-800 focus:ring-brand-500 shadow-lg shadow-brand-900/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white" />
                  Signing in…
                </>
              ) : (
                <>
                  Sign in <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                </>
              )}
            </button>
          </form>

          {/* Demo accounts — capstone evaluation aid */}
          <div className="mt-6">
            <button
              type="button"
              onClick={() => setShowDemo((s) => !s)}
              className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl border border-dashed border-white/15 text-xs font-bold text-slate-400 hover:bg-white/5 hover:border-white/25 hover:text-slate-200 transition-colors"
            >
              <span className="inline-flex items-center gap-2">
                <KeyRound className="w-3.5 h-3.5" /> Demo accounts for evaluation
              </span>
              <ChevronDown className={`w-4 h-4 transition-transform ${showDemo ? 'rotate-180' : ''}`} />
            </button>

            {showDemo && (
              <div className="mt-3 p-4 bg-dark-900/50 border border-white/10 rounded-xl space-y-2">
                <p className="text-[11px] text-slate-500 font-medium mb-2">
                  Click any account to fill the form.
                </p>
                {DEMO_ACCOUNTS.map((a) => {
                  const Icon = a.icon;
                  return (
                    <button
                      key={a.email}
                      type="button"
                      onClick={() => fillDemo(a)}
                      className="w-full flex items-center gap-3 p-2.5 rounded-lg bg-dark-800/80 border border-white/10 hover:border-brand-500/40 hover:bg-dark-800 transition-all text-left group"
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${a.accent}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-200">{a.role}</p>
                        <p className="text-[11px] text-slate-500 truncate font-mono">{a.email}</p>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-brand-400 group-hover:translate-x-0.5 transition-all" />
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <p className="mt-8 text-center text-sm text-slate-400 font-medium">
            New to VerifyAI?{' '}
            <Link to="/register" className="font-bold text-brand-400 hover:text-brand-300 transition-colors">
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
