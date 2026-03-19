import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, User, Building, ShieldCheck, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const RegisterPage = () => {
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    username: '',
    organization: '',
    role: 'citizen',
    password: '',
    password_confirm: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { register } = useAuth();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Auto-generate username from email
  const handleEmailChange = (e) => {
    const email = e.target.value;
    setFormData({
      ...formData,
      email,
      username: email.split('@')[0] || '',
    });
  };

  const calculatePasswordStrength = (pass) => {
    let score = 0;
    if (pass.length > 8) score++;
    if (/[A-Z]/.test(pass)) score++;
    if (/[0-9]/.test(pass)) score++;
    if (/[^A-Za-z0-9]/.test(pass)) score++;
    return score;
  };

  const strength = calculatePasswordStrength(formData.password);

  const handleRegister = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.password_confirm) {
      setError('Passwords do not match.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await register(formData);
      navigate('/login', { state: { message: 'Registration successful! Please check your email to verify your account.' } });
    } catch (err) {
      const data = err.response?.data?.error;
      if (typeof data === 'object') {
        const messages = Object.entries(data).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`);
        setError(messages.join(' | '));
      } else {
        setError(data || 'Registration failed.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-xl w-full glass p-10 rounded-3xl relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 p-4 opacity-10 blur-[80px] pointer-events-none">
          <div className="w-64 h-64 bg-brand-400 rounded-full" />
        </div>

        <div className="relative z-10">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Create an account</h2>
            <p className="mt-2 text-sm text-slate-500 font-medium">Join VerifyAI to start detecting misinformation</p>
          </div>

          <form className="space-y-5" onSubmit={handleRegister}>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm font-medium">
                {error}
              </div>
            )}
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-slate-400" />
                </div>
                <input name="first_name" type="text" required placeholder="First Name"
                  className="appearance-none rounded-xl relative block w-full px-3 py-3.5 pl-10 border border-slate-300 placeholder-slate-400 text-slate-900 focus:outline-none focus:ring-brand-500 focus:border-brand-500 sm:text-sm shadow-sm"
                  value={formData.first_name} onChange={handleChange} />
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-slate-400" />
                </div>
                <input name="last_name" type="text" required placeholder="Last Name"
                  className="appearance-none rounded-xl relative block w-full px-3 py-3.5 pl-10 border border-slate-300 placeholder-slate-400 text-slate-900 focus:outline-none focus:ring-brand-500 focus:border-brand-500 sm:text-sm shadow-sm"
                  value={formData.last_name} onChange={handleChange} />
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-slate-400" />
                </div>
                <input name="email" type="email" required placeholder="Email Address"
                  className="appearance-none rounded-xl relative block w-full px-3 py-3.5 pl-10 border border-slate-300 placeholder-slate-400 text-slate-900 focus:outline-none focus:ring-brand-500 focus:border-brand-500 sm:text-sm shadow-sm"
                  value={formData.email} onChange={handleEmailChange} />
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Building className="h-5 w-5 text-slate-400" />
                </div>
                <input name="organization" type="text" placeholder="Organization (Optional)"
                  className="appearance-none rounded-xl relative block w-full px-3 py-3.5 pl-10 border border-slate-300 placeholder-slate-400 text-slate-900 focus:outline-none focus:ring-brand-500 focus:border-brand-500 sm:text-sm shadow-sm"
                  value={formData.organization} onChange={handleChange} />
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <ShieldCheck className="h-5 w-5 text-slate-400" />
              </div>
              <select name="role"
                className="appearance-none rounded-xl relative block w-full px-3 py-3.5 pl-10 border border-slate-300 text-slate-900 focus:outline-none focus:ring-brand-500 focus:border-brand-500 sm:text-sm shadow-sm bg-white"
                value={formData.role} onChange={handleChange}>
                <option value="citizen">Citizen</option>
                <option value="journalist">Journalist</option>
                <option value="government">Government</option>
              </select>
            </div>

            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-slate-400" />
              </div>
              <input name="password" type={showPassword ? 'text' : 'password'} required placeholder="Password" minLength={8}
                className="appearance-none rounded-xl relative block w-full px-3 py-3.5 pl-10 pr-10 border border-slate-300 placeholder-slate-400 text-slate-900 focus:outline-none focus:ring-brand-500 focus:border-brand-500 sm:text-sm shadow-sm"
                value={formData.password} onChange={handleChange} />
              <button type="button" className="absolute inset-y-0 right-0 pr-3 flex items-center"
                onClick={() => setShowPassword(!showPassword)}>
                {showPassword ? <EyeOff className="h-5 w-5 text-slate-400" /> : <Eye className="h-5 w-5 text-slate-400" />}
              </button>
            </div>

            {formData.password && (
              <div className="flex gap-1 mt-1">
                {[1, 2, 3, 4].map(level => (
                  <div key={level} className={`h-1.5 w-full rounded-full transition-colors ${strength >= level ? (strength > 2 ? 'bg-emerald-500' : 'bg-amber-500') : 'bg-slate-200'}`}></div>
                ))}
              </div>
            )}

            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-slate-400" />
              </div>
              <input name="password_confirm" type="password" required placeholder="Confirm Password"
                className="appearance-none rounded-xl relative block w-full px-3 py-3.5 pl-10 border border-slate-300 placeholder-slate-400 text-slate-900 focus:outline-none focus:ring-brand-500 focus:border-brand-500 sm:text-sm shadow-sm"
                value={formData.password_confirm} onChange={handleChange} />
              {formData.password_confirm && formData.password !== formData.password_confirm && (
                <p className="text-red-500 text-xs mt-1 ml-1 font-medium">Passwords do not match</p>
              )}
            </div>

            <button type="submit" disabled={loading}
              className="group relative w-full flex justify-center py-3.5 px-4 mt-6 border border-transparent text-sm font-bold rounded-xl text-white bg-brand-600 hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 shadow-md hover:shadow-lg transition-all items-center gap-2 disabled:opacity-50">
              {loading ? (
                <span className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/20 border-t-white" />
                  Creating account...
                </span>
              ) : (
                <>Sign up <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" /></>
              )}
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-slate-500 font-medium">
            Already have an account?{' '}
            <Link to="/login" className="font-bold text-brand-600 hover:text-brand-500 transition-colors">Sign in Instead</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
