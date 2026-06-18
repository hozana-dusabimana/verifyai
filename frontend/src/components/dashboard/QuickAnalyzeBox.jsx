import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Upload } from 'lucide-react';

const QuickAnalyzeBox = ({ title, subtitle }) => {
  const { t } = useTranslation();
  const [text, setText] = useState('');
  const navigate = useNavigate();

  const resolvedTitle = title ?? t('widgets.quickAnalyze.title');
  const resolvedSubtitle = subtitle ?? t('widgets.quickAnalyze.subtitle');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (text.trim()) navigate('/analyze', { state: { text } });
  };

  return (
    <div className="bg-slate-900 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-brand-500 rounded-full blur-[60px] opacity-30 pointer-events-none" />
      <h3 className="text-lg font-bold mb-2 flex items-center gap-2 z-10 relative">
        <Upload className="w-5 h-5 text-brand-400" /> {resolvedTitle}
      </h3>
      <p className="text-slate-400 text-sm mb-4 z-10 relative">{resolvedSubtitle}</p>
      <form onSubmit={handleSubmit} className="relative z-10">
        <textarea
          className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-sm text-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500 resize-none mb-3"
          rows="3"
          placeholder={t('widgets.quickAnalyze.placeholder')}
          value={text}
          onChange={(e) => setText(e.target.value)}
          required
        />
        <button
          type="submit"
          className="w-full py-2.5 bg-brand-600 hover:bg-brand-500 rounded-xl text-sm font-bold transition-colors"
        >
          {t('widgets.quickAnalyze.submit')}
        </button>
      </form>
    </div>
  );
};

export default QuickAnalyzeBox;
