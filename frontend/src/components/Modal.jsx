import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';

/**
 * Portal-rendered modal that escapes any ancestor containing block.
 * Closes on Escape key and on backdrop click. Locks body scroll while open.
 */
const Modal = ({ open, onClose, title, subtitle, icon: Icon, children, maxWidth = 'max-w-lg' }) => {
  const { t } = useTranslation();
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className={`bg-white rounded-2xl shadow-2xl w-full ${maxWidth} max-h-[90vh] overflow-y-auto`}
        onClick={(e) => e.stopPropagation()}
      >
        {(title || subtitle) && (
          <div className="flex items-start justify-between px-6 py-4 border-b border-slate-200">
            <div className="min-w-0 pr-4">
              {title && (
                <h3 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                  {Icon && <Icon className="w-5 h-5 text-brand-600 flex-shrink-0" />}
                  {title}
                </h3>
              )}
              {subtitle && <div className="text-xs text-slate-500 mt-0.5">{subtitle}</div>}
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 flex-shrink-0"
              aria-label={t('common.close')}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}
        {children}
      </div>
    </div>,
    document.body,
  );
};

export default Modal;
