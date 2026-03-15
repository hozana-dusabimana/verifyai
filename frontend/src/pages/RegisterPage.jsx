import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, User, Building, ShieldCheck, ArrowRight, Eye, EyeOff } from 'lucide-react';

const RegisterPage = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    organization: '',
    role: 'Citizen',
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const calculatePasswordStrength = (pass) => {
    let score = 0;
    if (pass.length > 8) score++;
    if (/[A-Z]/.test(pass)) score++;
    if (/[0-9]/.test(pass)) score++;
    if (/[^A-Za-z0-9]/.test(pass)) score++;
    return score; // 0 to 4
  };

  const strength = calculatePasswordStrength(formData.password);

  const handleRegister = (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      alert("Passwords do not match");
      return;
    }
    // Mock registration success
    alert("Confirmation email sent! Please check your inbox.");
    navigate('/login');
  };

  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-xl w-full glass p-10 rounded-3xl relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 p-4 opacity-10 blur-[80px] pointer-events-none">
           <div className="w-64 h-64 bg-brand-400 rounded-full" />
        </div>

        <div className="relative z-10">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              Create an account
            </h2>
            <p className="mt-2 text-sm text-slate-500 font-medium">
              Join VerifyAI to start detecting misinformation
            </p>
          </div>
          
          <form className="space-y-5" onSubmit={handleRegister}>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  name="name"
                  type="text"
                  required
                  className="appearance-none rounded-xl relative block w-full px-3 py-3.5 pl-10 border border-slate-300 placeholder-slate-400 text-slate-900 focus:outline-none focus:ring-brand-500 focus:border-brand-500 sm:text-sm shadow-sm transition-all"
                  placeholder="Full Name"
                  value={formData.name}
                  onChange={handleChange}
                />
              </div>

              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  name="email"
                  type="email"
                  required
                  className="appearance-none rounded-xl relative block w-full px-3 py-3.5 pl-10 border border-slate-300 placeholder-slate-400 text-slate-900 focus:outline-none focus:ring-brand-500 focus:border-brand-500 sm:text-sm shadow-sm transition-all"
                  placeholder="Email Address"
                  value={formData.email}
                  onChange={handleChange}
                />
              </div>

              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Building className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  name="organization"
                  type="text"
                  className="appearance-none rounded-xl relative block w-full px-3 py-3.5 pl-10 border border-slate-300 placeholder-slate-400 text-slate-900 focus:outline-none focus:ring-brand-500 focus:border-brand-500 sm:text-sm shadow-sm transition-all"
                  placeholder="Organization (Optional)"
                  value={formData.organization}
                  onChange={handleChange}
                />
              </div>

              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <ShieldCheck className="h-5 w-5 text-slate-400" />
                </div>
                <select
                  name="role"
                  className="appearance-none rounded-xl relative block w-full px-3 py-3.5 pl-10 border border-slate-300 text-slate-900 focus:outline-none focus:ring-brand-500 focus:border-brand-500 sm:text-sm shadow-sm transition-all bg-white"
                  value={formData.role}
                  onChange={handleChange}
                >
                  <option value="Citizen">Citizen</option>
                  <option value="Journalist">Journalist</option>
                  <option value="Government">Government</option>
                </select>
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-slate-400" />
              </div>
              <input
                name="password"
                type={showPassword ? "text" : "password"}
                required
                className="appearance-none rounded-xl relative block w-full px-3 py-3.5 pl-10 pr-10 border border-slate-300 placeholder-slate-400 text-slate-900 focus:outline-none focus:ring-brand-500 focus:border-brand-500 sm:text-sm shadow-sm transition-all"
                placeholder="Password"
                value={formData.password}
                onChange={handleChange}
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="h-5 w-5 text-slate-400 hover:text-slate-600" /> : <Eye className="h-5 w-5 text-slate-400 hover:text-slate-600" />}
              </button>
            </div>
            
            {/* Password Strength Indicator */}
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
              <input
                name="confirmPassword"
                type="password"
                required
                className="appearance-none rounded-xl relative block w-full px-3 py-3.5 pl-10 border border-slate-300 placeholder-slate-400 text-slate-900 focus:outline-none focus:ring-brand-500 focus:border-brand-500 sm:text-sm shadow-sm transition-all"
                placeholder="Confirm Password"
                value={formData.confirmPassword}
                onChange={handleChange}
              />
              {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                <p className="text-red-500 text-xs mt-1 ml-1 font-medium">Passwords do not match</p>
              )}
            </div>

            <button
              type="submit"
              className="group relative w-full flex justify-center py-3.5 px-4 mt-6 border border-transparent text-sm font-bold rounded-xl text-white bg-brand-600 hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 shadow-md hover:shadow-lg transition-all items-center gap-2"
            >
              Sign up
              <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </form>
          
          <p className="mt-8 text-center text-sm text-slate-500 font-medium">
            Already have an account?{' '}
            <Link to="/login" className="font-bold text-brand-600 hover:text-brand-500 transition-colors">
              Sign in Instead
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
