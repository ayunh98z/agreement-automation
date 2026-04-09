import React, { createContext, useState, useEffect } from 'react';
import Messages from '../utils/messages';

export const LanguageContext = createContext({ lang: Messages.getLang(), setLang: () => {} });

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(Messages.getLang());

  useEffect(() => {
    try {
      localStorage.setItem('lang', lang);
    } catch (e) {
      // ignore storage errors
    }
  }, [lang]);

  const setLang = (l) => {
    const normalized = (l || '').toString().startsWith('en') ? 'en' : 'id';
    Messages.setLang(normalized);
    setLangState(normalized);
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang }}>
      {children}
    </LanguageContext.Provider>
  );
}

export default LanguageProvider;
