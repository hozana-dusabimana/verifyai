import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Lock, CheckCircle } from 'lucide-react';
import { authAPI } from '../services/api';

const ResetPasswordPage = () => {
  const { token } = useParams();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await authAPI.resetPassword({ token, new_password: password });
      setDone(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Reset failed. Token may be expired.');
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center py-12 px-4">
        <div className="max-w-md w-full glass p-10 rounded-3xl shadow-2xl text-center">
          <div className="mx-auto w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="w-8 h-8 text-emerald-600" />
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900">Password Reset</h2>
          <p className="mt-2 text-slate-600">Your password has been reset successfully.</p>
          <Link to="/login" className="mt-6 inline-block px-6 py-3 bg-brand-600 text-white rounded-xl font-bold hover:bg-brand-700">
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full glass p-10 rounded-3xl shadow-2xl">
        <h2 className="text-3xl font-extrabold text-slate-900 text-center">New Password</h2>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && <p className="text-red-600 text-sm font-medium">{error}</p>}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Lock className="h-5 w-5 text-slate-400" />
            </div>
            <input type="password" required minLength={8} placeholder="New password"
              className="appearance-none rounded-xl block w-full px-3 py-3.5 pl-10 border border-slate-300 text-slate-900 focus:ring-brand-500 focus:border-brand-500 sm:text-sm shadow-sm"
              value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Lock className="h-5 w-5 text-slate-400" />
            </div>
            <input type="password" required placeholder="Confirm password"
              className="appearance-none rounded-xl block w-full px-3 py-3.5 pl-10 border border-slate-300 text-slate-900 focus:ring-brand-500 focus:border-brand-500 sm:text-sm shadow-sm"
              value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          </div>
          <button type="submit" disabled={loading}
            className="w-full py-3.5 text-sm font-bold rounded-xl text-white bg-brand-600 hover:bg-brand-700 shadow-md disabled:opacity-50">
            {loading ? 'Resetting...' : 'Reset Password'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
