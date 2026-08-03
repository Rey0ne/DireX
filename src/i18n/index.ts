import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import zhCN from './locales/zh-CN/common.json';
import en from './locales/en/common.json';

const STORAGE_KEY = 'direx-language';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      'zh-CN': { common: zhCN },
      en: { common: en },
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
export function setLanguage(lang: 'zh-CN' | 'en') {
  localStorage.setItem(STORAGE_KEY, lang);
  i18n.changeLanguage(lang);
}

export function getCurrentLanguage(): 'zh-CN' | 'en' {
  return (localStorage.getItem(STORAGE_KEY) as 'zh-CN' | 'en') || 'zh-CN';
}

/** 支持的语言列表（后续扩展到 6 种） */
export const SUPPORTED_LANGS = [
  { code: 'zh-CN', label: '中文' },
  { code: 'en', label: 'English' },
] as const;
