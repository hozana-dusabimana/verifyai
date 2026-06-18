import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { authAPI } from '../services/api';

const ForgotPasswordPage = () => {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await authAPI.forgotPassword(email);
      setSent(true);
    } catch {
      setSent(true); // Don't reveal if email exists
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full glass p-10 rounded-3xl shadow-2xl">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-slate-900">{t('forgotPassword.title')}</h2>
          <p className="mt-2 text-sm text-slate-500 font-medium">
            {t('forgotPassword.subtitle')}
          </p>
        </div>

        {sent ? (
          <div className="mt-8 text-center">
            <div className="mx-auto w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
              <Mail className="w-8 h-8 text-emerald-600" />
            </div>
            <p className="text-slate-700 font-medium">{t('forgotPassword.sentMessage')}</p>
            <Link to="/login" className="mt-6 inline-flex items-center gap-2 text-brand-600 font-bold hover:text-brand-700">
              <ArrowLeft className="w-4 h-4" /> {t('forgotPassword.backToLogin')}
            </Link>
          </div>
        ) : (
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            {error && <p className="text-red-600 text-sm font-medium">{error}</p>}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-slate-400" />
              </div>
              <input
                type="email"
                required
                className="appearance-none rounded-xl block w-full px-3 py-3.5 pl-10 border border-slate-300 placeholder-slate-400 text-slate-900 focus:outline-none focus:ring-brand-500 focus:border-brand-500 sm:text-sm shadow-sm"
                placeholder={t('forgotPassword.emailPlaceholder')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 border border-transparent text-sm font-bold rounded-xl text-white bg-brand-600 hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 shadow-md disabled:opacity-50"
            >
              {loading ? t('forgotPassword.sending') : t('forgotPassword.sendResetLink')}
            </button>
            <p className="text-center text-sm text-slate-500">
              <Link to="/login" className="font-bold text-brand-600 hover:text-brand-500">{t('forgotPassword.backToLogin')}</Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
