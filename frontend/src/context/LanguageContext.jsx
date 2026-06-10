import React, { createContext, useContext, useState } from 'react';
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

const LanguageContext = createContext({
  language: 'en',
  setLanguage: (_code) => {},
  t: (_key) => '',
  getLanguageLabel: (_code) => '',
  LANGUAGES,
});

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState('en');

  function getLanguageLabel(code) {
    return LANGUAGES.find((entry) => entry.code === code)?.nativeLabel || code;
  }

  function t(key) {
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
        return typeof fallback === 'string' ? fallback : key;
      }
    }
    return typeof node === 'string' ? node : key;
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
