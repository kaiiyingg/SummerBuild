import React, { createContext, useContext, useState } from 'react';
import translations from '../translations';

export const LANGUAGES = [
  { code: 'en', label: 'English', nativeLabel: 'English'  },
  { code: 'zh', label: 'Chinese', nativeLabel: '中文'      },
  { code: 'ms', label: 'Malay',   nativeLabel: 'Melayu'   },
  { code: 'ta', label: 'Tamil',   nativeLabel: 'தமிழ்'    },
];

const LanguageContext = createContext({
  language: 'en',
  setLanguage: (_code) => {},
  t: (_key) => '',
  LANGUAGES,
});

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState('en');

  function t(key) {
    const parts = key.split('.');
    let node = translations;
    for (const part of parts) {
      if (node && typeof node === 'object' && part in node) {
        node = node[part];
      } else {
        return key;
      }
    }
    if (typeof node === 'object' && node !== null) {
      return node[language] ?? node['en'] ?? key;
    }
    return key;
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, LANGUAGES }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useTranslation() {
  return useContext(LanguageContext);
}
