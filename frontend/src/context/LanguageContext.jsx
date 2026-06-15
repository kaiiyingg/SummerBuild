/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState } from 'react';
import en from '../locale/en.json';
import zh from '../locale/zh.json';
import ms from '../locale/ms.json';
import ta from '../locale/ta.json';

export const LANGUAGES = [
  { code: 'en', label: 'English', nativeLabel: 'English'  },
  { code: 'zh', label: 'Chinese', nativeLabel: '中文'      },
  { code: 'ms', label: 'Malay',   nativeLabel: 'Bahasa Melayu' },
  { code: 'ta', label: 'Tamil',   nativeLabel: 'தமிழ்'    },
];

const locales = { en, zh, ms, ta };

/**
 * @type {import('react').Context<{
 *   language: string;
 *   setLanguage: (code: string) => void;
 *   t: (key: string, vars?: Record<string, unknown>) => string;
 *   getLanguageLabel: (code: string) => string;
 *   LANGUAGES: { code: string; label: string; nativeLabel: string }[];
 * }>}
 */
const LanguageContext = createContext({
  language: 'en',
  setLanguage: () => {},
  t: () => '',
  getLanguageLabel: () => '',
  LANGUAGES,
});

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState('en');

  function interpolate(template, vars) {
    if (!vars) return template;
    return template.replace(/\{\{\s*([^}]+)\s*\}\}/g, (_, key) => {
      const value = vars[key];
      return value === undefined || value === null ? `{{${key}}}` : String(value);
    });
  }

  function getLanguageLabel(code) {
    return LANGUAGES.find((entry) => entry.code === code)?.nativeLabel || code;
  }

  function t(key, vars) {
    const locale = locales[language] ?? locales['en'];
    const parts = key.split('.');
    let node = locale;
    for (const part of parts) {
      if (node && typeof node === 'object' && part in node) {
        node = node[part];
      } else {
        // Fallback to English if key is missing in selected locale
        let fallback = locales['en'];
        for (const p of parts) {
          if (fallback && typeof fallback === 'object' && p in fallback) {
            fallback = fallback[p];
          } else {
            return key;
          }
        }
        if (typeof fallback === 'string') {
          return interpolate(fallback, vars);
        }
        return key;
      }
    }
    if (typeof node === 'string') {
      return interpolate(node, vars);
    }
    return key;
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, getLanguageLabel, LANGUAGES }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useTranslation() {
  return useContext(LanguageContext);
}
