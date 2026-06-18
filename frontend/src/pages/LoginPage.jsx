import { useState, useEffect } from 'react';
import { Link, Navigate, useNavigate, useLocation } from 'react-router-dom';
import {
  Mail, Lock, ArrowRight, Eye, EyeOff, ShieldCheck, AlertCircle,
  CheckCircle2, KeyRound, Sparkles, Building2, Newspaper, Users,
  ChevronDown, Award,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';

const FEATURES = [
  { icon: Sparkles, key: 'ensemble' },
  { icon: ShieldCheck, key: 'explainable' },
  { icon: Award, key: 'standards' },
];

const DEMO_ACCOUNTS = [
  { roleKey: 'admin',      email: 'admin@verifyai.demo',      password: 'AdminDemo!2026',  icon: ShieldCheck, accent: 'bg-purple-100 text-purple-700' },
  { roleKey: 'government', email: 'gov@verifyai.demo',        password: 'GovDemo!2026',     icon: Building2,   accent: 'bg-blue-100 text-blue-700' },
  { roleKey: 'journalist', email: 'journalist@verifyai.demo',  password: 'JournoDemo!2026',  icon: Newspaper,   accent: 'bg-amber-100 text-amber-700' },
  { roleKey: 'citizen',    email: 'citizen@verifyai.demo',     password: 'CitizenDemo!2026', icon: Users,       accent: 'bg-slate-100 text-slate-700' },
];

const LoginPage = () => {
  const { t } = useTranslation();
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
      // Clear the state so the message doesn't persist on refresh
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
        setError(t('login.errors.network'));
        setErrorKind('network');
      } else if (status === 403 && typeof msg === 'string' && msg.toLowerCase().includes('locked')) {
        setError(t('login.errors.lockout'));
        setErrorKind('lockout');
      } else {
        setError(typeof msg === 'string' ? msg : t('login.errors.invalid'));
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
    'block w-full px-3 py-3 pl-10 border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-shadow shadow-sm';

  return (
    <div className="min-h-[calc(100vh-8rem)] flex lg:flex-row-reverse items-stretch -my-8 -mx-4 sm:-mx-6 lg:-mx-8">
      {/* ─── Right (visually): Form card ──────────────────────── */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-8 lg:px-16 py-12 bg-slate-50/40">
        <div className="w-full max-w-md">
          <div className="mb-8">
            <p className="text-xs font-bold uppercase tracking-widest text-brand-600 mb-2">{t('login.eyebrow')}</p>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">{t('login.welcomeBack')}</h1>
            <p className="text-sm text-slate-500 mt-1.5 font-medium">
              {t('login.subtitle')}
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            {info && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl text-sm font-medium flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5 text-emerald-600" />
                <span>{info}</span>
              </div>
            )}
            {error && (
              <div
                className={`px-4 py-3 rounded-xl text-sm font-medium flex items-start gap-2 border ${
                  errorKind === 'lockout'
                    ? 'bg-amber-50 border-amber-200 text-amber-900'
                    : errorKind === 'network'
                      ? 'bg-slate-50 border-slate-200 text-slate-700'
                      : 'bg-red-50 border-red-200 text-red-700'
                }`}
              >
                <AlertCircle
                  className={`w-4 h-4 flex-shrink-0 mt-0.5 ${
                    errorKind === 'lockout' ? 'text-amber-600' : errorKind === 'network' ? 'text-slate-500' : 'text-red-600'
                  }`}
                />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-xs font-bold text-slate-700 mb-1.5">
                {t('login.emailLabel')}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  className={inputCls}
                  placeholder={t('login.emailPlaceholder')}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="password" className="block text-xs font-bold text-slate-700">
                  {t('login.passwordLabel')}
                </label>
                <Link to="/forgot-password" className="text-xs font-semibold text-brand-600 hover:text-brand-700">
                  {t('login.forgotPassword')}
                </Link>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  className={`${inputCls} pr-10`}
                  placeholder={t('login.passwordPlaceholder')}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                  onClick={() => setShowPassword((s) => !s)}
                  tabIndex={-1}
                  aria-label={showPassword ? t('login.hidePassword') : t('login.showPassword')}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center pt-1">
              <input
                type="checkbox"
                id="remember-me"
                className="h-4 w-4 text-brand-600 focus:ring-brand-500 border-slate-300 rounded cursor-pointer"
              />
              <label htmlFor="remember-me" className="ml-2 block text-sm text-slate-600 font-medium cursor-pointer">
                {t('login.keepSignedIn')}
              </label>
            </div>

            <button
              type="submit"
              disabled={loading || !email || !password}
              className="group w-full flex justify-center items-center gap-2 py-3 px-4 mt-2 text-sm font-bold rounded-xl text-white bg-brand-600 hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white" />
                  {t('login.signingIn')}
                </>
              ) : (
                <>
                  {t('login.signIn')} <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                </>
              )}
            </button>
          </form>

          {/* Demo accounts — capstone evaluation aid */}
          <div className="mt-6">
            <button
              type="button"
              onClick={() => setShowDemo((s) => !s)}
              className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl border border-dashed border-slate-300 text-xs font-bold text-slate-600 hover:bg-slate-50 hover:border-slate-400 transition-colors"
            >
              <span className="inline-flex items-center gap-2">
                <KeyRound className="w-3.5 h-3.5" /> {t('login.demo.toggle')}
              </span>
              <ChevronDown className={`w-4 h-4 transition-transform ${showDemo ? 'rotate-180' : ''}`} />
            </button>

            {showDemo && (
              <div className="mt-3 p-4 bg-slate-50/80 border border-slate-200 rounded-xl space-y-2">
                <p className="text-[11px] text-slate-500 font-medium mb-2">
                  {t('login.demo.hint')}
                </p>
                {DEMO_ACCOUNTS.map((a) => {
                  const Icon = a.icon;
                  return (
                    <button
                      key={a.email}
                      type="button"
                      onClick={() => fillDemo(a)}
                      className="w-full flex items-center gap-3 p-2.5 rounded-lg bg-white border border-slate-200 hover:border-brand-300 hover:shadow-sm transition-all text-left group"
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${a.accent}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-800">{t(`common.roles.${a.roleKey}`)}</p>
                        <p className="text-[11px] text-slate-500 truncate font-mono">{a.email}</p>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-brand-600 group-hover:translate-x-0.5 transition-all" />
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <p className="mt-8 text-center text-sm text-slate-500 font-medium">
            {t('login.noAccount')}{' '}
            <Link to="/register" className="font-bold text-brand-600 hover:text-brand-700 transition-colors">
              {t('login.createAccount')}
            </Link>
          </p>
        </div>
      </div>

      {/* ─── Left (visually): Brand panel (hidden on small screens) ── */}
      <div className="hidden lg:flex lg:w-[42%] xl:w-[38%] flex-col justify-between p-12 relative overflow-hidden text-white bg-gradient-to-br from-brand-600 via-brand-700 to-brand-800">
        {/* Subtle decorative glows that pick up the brand palette */}
        <div className="absolute top-0 right-0 w-[28rem] h-[28rem] bg-brand-300/30 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[24rem] h-[24rem] bg-brand-400/25 rounded-full blur-[110px] pointer-events-none" />
        {/* Faint grid pattern overlay for texture */}
        <div
          className="absolute inset-0 opacity-[0.06] pointer-events-none"
          style={{
            backgroundImage:
              'linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)',
            backgroundSize: '32px 32px',
          }}
        />

        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-12">
            <ShieldCheck className="w-7 h-7 text-white" />
            <span className="text-xl font-extrabold tracking-tight">VerifyAI</span>
          </div>

          <h2 className="text-3xl xl:text-4xl font-extrabold leading-tight tracking-tight">
            {t('login.brand.headlineLine1')}<br />
            <span className="text-brand-100">{t('login.brand.headlineLine2')}</span>
          </h2>
          <p className="text-brand-50/85 text-base mt-4 leading-relaxed max-w-md">
            {t('login.brand.subtext')}
          </p>

          <ul className="mt-12 space-y-5 max-w-md">
            {FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <li key={f.key} className="flex items-start gap-3.5">
                  <div className="w-9 h-9 rounded-xl bg-white/15 border border-white/25 flex items-center justify-center flex-shrink-0 backdrop-blur-sm">
                    <Icon className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">{t(`login.features.${f.key}.title`)}</p>
                    <p className="text-xs text-brand-50/80 mt-0.5 leading-relaxed">{t(`login.features.${f.key}.body`)}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="relative z-10 pt-8 border-t border-white/15">
          <p className="text-[11px] uppercase tracking-widest text-brand-100/80 font-bold mb-2">{t('login.alignedWith')}</p>
          <div className="flex flex-wrap gap-2">
            {['IFCN', 'C2PA', 'JTI', 'DSA'].map((s) => (
              <span key={s} className="text-[11px] font-bold text-white bg-white/10 border border-white/20 px-2.5 py-1 rounded-md backdrop-blur-sm">
                {s}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
