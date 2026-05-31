import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Mail, Lock, User, Building, ArrowRight, ArrowLeft, Eye, EyeOff,
  Check, Newspaper, Users, ShieldCheck, Info,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const FEATURES = [
  'Instantly check if a news article is real or fake',
  'Understand every result with clear, plain-language reasons',
  'Get alerted the moment something looks misleading',
  'Independent, transparent fact-checking you can trust',
];

const ROLES = [
  {
    value: 'citizen',
    label: 'Citizen',
    icon: Users,
    accent: 'brand',
    tagline: 'Personal use — verify before you share.',
    bullets: ['Quick "Is it real?" checks', 'Personal trust score', 'Daily verification tips'],
  },
  {
    value: 'journalist',
    label: 'Journalist',
    icon: Newspaper,
    accent: 'blue',
    tagline: 'Newsroom workflow — vet sources and track narratives.',
    bullets: ['Source reliability matrix', 'Disinfo narrative tracker', 'PDF citation export'],
  },
];

const STEPS = [
  { num: 1, label: 'Identity' },
  { num: 2, label: 'Role' },
  { num: 3, label: 'Security' },
];

const calculateStrength = (pass) => {
  let score = 0;
  if (pass.length >= 8) score++;
  if (/[A-Z]/.test(pass)) score++;
  if (/[0-9]/.test(pass)) score++;
  if (/[^A-Za-z0-9]/.test(pass)) score++;
  return score;
};

const Stepper = ({ current }) => (
  <div className="flex items-center justify-center gap-2 mb-8">
    {STEPS.map((step, idx) => {
      const isDone = current > step.num;
      const isActive = current === step.num;
      return (
        <div key={step.num} className="flex items-center">
          <div className="flex flex-col items-center">
            <div
              className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all ${
                isDone
                  ? 'bg-brand-600 text-white border-brand-600'
                  : isActive
                    ? 'bg-dark-900 text-brand-300 border-brand-500 shadow-md'
                    : 'bg-dark-900 text-slate-500 border-white/15'
              }`}
            >
              {isDone ? <Check className="w-4 h-4" /> : step.num}
            </div>
            <span
              className={`text-[11px] font-bold uppercase tracking-wider mt-1.5 ${
                isActive ? 'text-brand-300' : isDone ? 'text-slate-300' : 'text-slate-500'
              }`}
            >
              {step.label}
            </span>
          </div>
          {idx < STEPS.length - 1 && (
            <div
              className={`w-12 sm:w-16 h-0.5 mx-2 mb-5 transition-colors ${
                current > step.num ? 'bg-brand-600' : 'bg-white/10'
              }`}
            />
          )}
        </div>
      );
    })}
  </div>
);

const ROLE_ACCENTS = {
  brand: {
    selected: 'border-brand-500 bg-brand-500/10 ring-2 ring-brand-500/30',
    icon: 'bg-brand-500/15 text-brand-300',
  },
  blue: {
    selected: 'border-blue-500 bg-blue-500/10 ring-2 ring-blue-500/30',
    icon: 'bg-blue-500/15 text-blue-300',
  },
};

const RegisterPage = () => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    username: '',
    organization: '',
    role: '',
    password: '',
    password_confirm: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { register } = useAuth();

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleEmailChange = (e) => {
    const email = e.target.value;
    setFormData((prev) => ({
      ...prev,
      email,
      username: email.split('@')[0] || '',
    }));
  };

  const strength = useMemo(() => calculateStrength(formData.password), [formData.password]);
  const passwordsMatch = formData.password && formData.password === formData.password_confirm;

  const canAdvanceFromStep1 =
    formData.first_name.trim() && formData.last_name.trim() && /\S+@\S+\.\S+/.test(formData.email);
  const canAdvanceFromStep2 = !!formData.role;
  const canSubmit =
    formData.password.length >= 8 &&
    passwordsMatch &&
    (formData.role !== 'journalist' || formData.organization.trim());

  const goNext = () => {
    setError('');
    setStep((s) => Math.min(3, s + 1));
  };

  const goBack = () => {
    setError('');
    setStep((s) => Math.max(1, s - 1));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    setError('');
    setLoading(true);
    try {
      await register(formData);
      navigate('/login', {
        state: { message: 'Registration successful! Please check your email to verify your account.' },
      });
    } catch (err) {
      const data = err.response?.data?.error;
      if (typeof data === 'object') {
        const messages = Object.entries(data).map(
          ([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`
        );
        setError(messages.join(' | '));
      } else {
        setError(data || 'Registration failed.');
      }
    } finally {
      setLoading(false);
    }
  };

  const inputCls =
    'appearance-none rounded-xl block w-full px-3 py-3.5 pl-10 bg-dark-900/60 border border-white/10 placeholder-slate-500 text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500/70 focus:border-brand-500 sm:text-sm transition-shadow';

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
              Join the fight<br />
              <span className="text-brand-100">against misinformation.</span>
            </h2>
            <p className="mt-3.5 text-brand-50/85 text-sm leading-relaxed max-w-sm">
              Create a free account to check any article and find out, in plain language, whether you can trust it.
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

        {/* ─── Right: registration form ───────────────────────── */}
        <div className="p-8 sm:p-10">
          <div className="flex items-center justify-between mb-8">
            <Link to="/" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-400 hover:text-slate-200 transition-colors">
              <ArrowLeft className="w-4 h-4" /> Back to home
            </Link>
            <Link to="/" className="lg:hidden inline-flex items-center gap-2 text-slate-200 hover:text-white transition-colors" aria-label="VerifyAI home">
              <ShieldCheck className="w-5 h-5 text-brand-400" />
              <span className="font-extrabold tracking-tight">VerifyAI</span>
            </Link>
          </div>

          <div className="text-center mb-2">
            <h1 className="text-2xl font-extrabold text-white tracking-tight">Create your account</h1>
            <p className="mt-1.5 text-sm text-slate-400 font-medium">Three quick steps to start verifying.</p>
          </div>

          <Stepper current={step} />

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-300 px-4 py-3 rounded-xl text-sm font-medium mb-5">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* ─── Step 1: Identity ─────────────────────────────── */}
            {step === 1 && (
              <div className="space-y-5">
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <User className="h-5 w-5 text-slate-500" />
                    </div>
                    <input
                      name="first_name"
                      type="text"
                      required
                      placeholder="First name"
                      autoComplete="given-name"
                      className={inputCls}
                      value={formData.first_name}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <User className="h-5 w-5 text-slate-500" />
                    </div>
                    <input
                      name="last_name"
                      type="text"
                      required
                      placeholder="Last name"
                      autoComplete="family-name"
                      className={inputCls}
                      value={formData.last_name}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-slate-500" />
                  </div>
                  <input
                    name="email"
                    type="email"
                    required
                    placeholder="Email address"
                    autoComplete="email"
                    className={inputCls}
                    value={formData.email}
                    onChange={handleEmailChange}
                  />
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={goNext}
                    disabled={!canAdvanceFromStep1}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl font-bold shadow-lg shadow-brand-900/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Continue <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            {/* ─── Step 2: Role selection ───────────────────────── */}
            {step === 2 && (
              <div className="space-y-5">
                <div>
                  <h3 className="text-base font-bold text-white">How will you use VerifyAI?</h3>
                  <p className="text-sm text-slate-400 mt-0.5">Pick the experience that fits you best — you can request a role change later.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {ROLES.map((r) => {
                    const Icon = r.icon;
                    const isSelected = formData.role === r.value;
                    const accent = ROLE_ACCENTS[r.accent];
                    return (
                      <button
                        key={r.value}
                        type="button"
                        onClick={() => setFormData((prev) => ({ ...prev, role: r.value }))}
                        className={`text-left p-4 rounded-2xl border-2 transition-all relative ${
                          isSelected
                            ? accent.selected
                            : 'border-white/10 bg-dark-900/50 hover:border-white/20'
                        }`}
                      >
                        {isSelected && (
                          <span className="absolute top-3 right-3 w-5 h-5 rounded-full bg-brand-600 text-white flex items-center justify-center">
                            <Check className="w-3 h-3" strokeWidth={3} />
                          </span>
                        )}
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${accent.icon}`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <p className="text-sm font-bold text-white">{r.label}</p>
                        <p className="text-xs text-slate-400 mt-0.5 leading-snug">{r.tagline}</p>
                        <ul className="mt-3 space-y-1">
                          {r.bullets.map((b) => (
                            <li key={b} className="text-[11px] text-slate-400 flex items-center gap-1.5">
                              <Check className="w-3 h-3 text-brand-400 flex-shrink-0" /> {b}
                            </li>
                          ))}
                        </ul>
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-start gap-2 p-3 bg-dark-900/50 border border-white/10 rounded-xl">
                  <Info className="w-4 h-4 text-slate-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-slate-400 leading-relaxed">
                    <span className="font-bold text-slate-300">Government and Admin accounts</span> are provisioned by a platform administrator.
                    If your organization needs one, please contact your admin after creating a Citizen account.
                  </p>
                </div>

                <div className="flex justify-between pt-2">
                  <button
                    type="button"
                    onClick={goBack}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-dark-900/60 border border-white/10 text-slate-300 rounded-xl font-semibold hover:bg-dark-900 transition-colors"
                  >
                    <ArrowLeft className="h-4 w-4" /> Back
                  </button>
                  <button
                    type="button"
                    onClick={goNext}
                    disabled={!canAdvanceFromStep2}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl font-bold shadow-lg shadow-brand-900/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Continue <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            {/* ─── Step 3: Security ─────────────────────────────── */}
            {step === 3 && (
              <div className="space-y-5">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-brand-400" /> Secure your account
                  </h3>
                  <p className="text-sm text-slate-400 mt-0.5">
                    Choose a strong password{formData.role === 'journalist' ? ' and add your newsroom' : ''}.
                  </p>
                </div>

                {formData.role === 'journalist' && (
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Building className="h-5 w-5 text-slate-500" />
                    </div>
                    <input
                      name="organization"
                      type="text"
                      required
                      placeholder="Newsroom or publication"
                      autoComplete="organization"
                      className={inputCls}
                      value={formData.organization}
                      onChange={handleChange}
                    />
                  </div>
                )}

                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-slate-500" />
                  </div>
                  <input
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Password (8+ characters)"
                    autoComplete="new-password"
                    minLength={8}
                    className={`${inputCls} pr-10`}
                    value={formData.password}
                    onChange={handleChange}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>

                {formData.password && (
                  <div>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4].map((level) => (
                        <div
                          key={level}
                          className={`h-1.5 w-full rounded-full transition-colors ${
                            strength >= level
                              ? strength >= 3
                                ? 'bg-emerald-500'
                                : 'bg-amber-500'
                              : 'bg-white/10'
                          }`}
                        />
                      ))}
                    </div>
                    <p className="text-[11px] font-medium text-slate-400 mt-1.5">
                      {strength <= 1 ? 'Weak — add length, capitals, numbers, or symbols.'
                        : strength === 2 ? 'Fair — keep going.'
                          : strength === 3 ? 'Strong.'
                            : 'Excellent.'}
                    </p>
                  </div>
                )}

                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-slate-500" />
                  </div>
                  <input
                    name="password_confirm"
                    type="password"
                    required
                    placeholder="Confirm password"
                    autoComplete="new-password"
                    className={inputCls}
                    value={formData.password_confirm}
                    onChange={handleChange}
                  />
                  {formData.password_confirm && !passwordsMatch && (
                    <p className="text-red-400 text-xs mt-1 ml-1 font-medium">Passwords do not match</p>
                  )}
                </div>

                <div className="flex justify-between pt-2">
                  <button
                    type="button"
                    onClick={goBack}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-dark-900/60 border border-white/10 text-slate-300 rounded-xl font-semibold hover:bg-dark-900 transition-colors"
                  >
                    <ArrowLeft className="h-4 w-4" /> Back
                  </button>
                  <button
                    type="submit"
                    disabled={loading || !canSubmit}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl font-bold shadow-lg shadow-brand-900/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white" />
                        Creating account…
                      </>
                    ) : (
                      <>Create account <ArrowRight className="h-4 w-4" /></>
                    )}
                  </button>
                </div>
              </div>
            )}
          </form>

          <p className="mt-8 text-center text-sm text-slate-400 font-medium">
            Already have an account?{' '}
            <Link to="/login" className="font-bold text-brand-400 hover:text-brand-300 transition-colors">
              Sign in instead
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
