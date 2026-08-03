import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import zhCN from './locales/zh-CN/common.json';
import en from './locales/en/common.json';
import ja from './locales/ja/common.json';
import de from './locales/de/common.json';
import fr from './locales/fr/common.json';
import it from './locales/it/common.json';

export type SupportedLang = 'zh-CN' | 'en' | 'ja' | 'de' | 'fr' | 'it';

const STORAGE_KEY = 'direx-language';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      'zh-CN': { common: zhCN },
      en: { common: en },
      ja: { common: ja },
      de: { common: de },
      fr: { common: fr },
      it: { common: it },
    },
    fallbackLng: 'zh-CN',
    defaultNS: 'common',
    interpolation: { escapeValue: false },
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: STORAGE_KEY,
      caches: ['localStorage'],
    },
  });

export default i18n;

/** 手动切换语言并持久化 */
export function setLanguage(lang: SupportedLang) {
  localStorage.setItem(STORAGE_KEY, lang);
  i18n.changeLanguage(lang);
}

export function getCurrentLanguage(): SupportedLang {
  return (localStorage.getItem(STORAGE_KEY) as SupportedLang) || 'zh-CN';
}

/** 支持的语言列表 */
export const SUPPORTED_LANGS = [
  { code: 'zh-CN' as const, label: '中文' },
  { code: 'en' as const, label: 'English' },
  { code: 'ja' as const, label: '日本語' },
  { code: 'de' as const, label: 'Deutsch' },
  { code: 'fr' as const, label: 'Français' },
  { code: 'it' as const, label: 'Italiano' },
];
