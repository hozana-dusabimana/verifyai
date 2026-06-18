import { useState, useRef, useEffect } from 'react';
import { Globe, Check, ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { SUPPORTED_LANGUAGES } from '../i18n';

/**
 * Language picker used in the public navbar and the dashboard layout.
 * `variant="compact"` renders a small globe button (navbars); `variant="block"`
 * renders a full-width labelled control (mobile menus / settings).
 */
const LanguageSwitcher = ({ variant = 'compact', className = '' }) => {
  const { i18n, t } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const current =
    SUPPORTED_LANGUAGES.find((l) => l.code === i18n.resolvedLanguage) ||
    SUPPORTED_LANGUAGES.find((l) => l.code === (i18n.language || '').split('-')[0]) ||
    SUPPORTED_LANGUAGES[0];

  useEffect(() => {
    const onClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const choose = (code) => {
    i18n.changeLanguage(code);
    setOpen(false);
  };

  return (
    <div className={`relative ${className}`} ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={t('common.language')}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={
          variant === 'block'
            ? 'w-full flex items-center justify-between gap-2 px-4 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors'
            : 'flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-sm font-medium text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors'
        }
      >
        <span className="flex items-center gap-1.5">
          <Globe className="w-4 h-4" />
          <span className={variant === 'compact' ? 'hidden sm:inline' : ''}>
            {current.native}
          </span>
        </span>
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <ul
          role="listbox"
          className={`absolute z-50 mt-2 w-44 rounded-xl bg-white shadow-lg ring-1 ring-black/5 py-1 ${
            variant === 'block' ? 'left-0' : 'right-0'
          }`}
        >
          {SUPPORTED_LANGUAGES.map((lng) => (
            <li key={lng.code}>
              <button
                type="button"
                role="option"
                aria-selected={lng.code === current.code}
                onClick={() => choose(lng.code)}
                className="w-full flex items-center justify-between px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <span>
                  <span className="font-medium">{lng.native}</span>
                  <span className="text-slate-400 ml-1.5 text-xs">{lng.label}</span>
                </span>
                {lng.code === current.code && <Check className="w-4 h-4 text-brand-600" />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default LanguageSwitcher;
