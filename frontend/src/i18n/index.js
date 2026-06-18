import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Auto-load every locale fragment. Each JSON file owns a top-level page/area
// prefix (e.g. "login", "nav"), so merging them yields one flat namespace with
// no collisions. Adding a new <area>.json file registers automatically — no
// edits to this file needed.
const enModules = import.meta.glob('./locales/en/*.json', { eager: true });
const rwModules = import.meta.glob('./locales/rw/*.json', { eager: true });

const merge = (modules) =>
  Object.values(modules).reduce(
    (acc, mod) => ({ ...acc, ...(mod.default || mod) }),
    {},
  );

export const SUPPORTED_LANGUAGES = [
  { code: 'en', label: 'English', native: 'English' },
  { code: 'rw', label: 'Kinyarwanda', native: 'Ikinyarwanda' },
];

export const LANGUAGE_STORAGE_KEY = 'verifyai_lang';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: merge(enModules) },
      rw: { translation: merge(rwModules) },
    },
    fallbackLng: 'en',
    supportedLngs: ['en', 'rw'],
    // Treat "rw-RW", "en-GB", etc. as their base language.
    load: 'languageOnly',
    nonExplicitSupportedLngs: true,
    detection: {
      // Saved choice wins; otherwise fall back to the browser language.
      order: ['localStorage', 'navigator', 'htmlTag'],
      lookupLocalStorage: LANGUAGE_STORAGE_KEY,
      caches: ['localStorage'],
    },
    interpolation: { escapeValue: false }, // React already escapes
    returnEmptyString: false,
  });

// Keep <html lang> in sync for accessibility / correct font shaping.
const applyHtmlLang = (lng) => {
  if (typeof document !== 'undefined') {
    document.documentElement.lang = (lng || 'en').split('-')[0];
  }
};
applyHtmlLang(i18n.resolvedLanguage || i18n.language);
i18n.on('languageChanged', applyHtmlLang);

export default i18n;
