import React, { useContext, useState, useRef, useEffect } from 'react';
import { LanguageContext } from '../../context/LanguageContext';
import { t } from '../../utils/messages';

export default function LanguageSwitcher() {
  const { lang, setLang } = useContext(LanguageContext);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function onDocClick(e) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, []);

  const wrapper = {
    position: 'relative',
    display: 'inline-block'
  };

  const triggerStyle = {
    padding: '6px 10px',
    borderRadius: 6,
    border: '1px solid #ddd',
    background: '#fff',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 13
  };

  const menuStyle = {
    position: 'absolute',
    right: 0,
    marginTop: 8,
    minWidth: 140,
    background: '#fff',
    border: '1px solid #ddd',
    borderRadius: 6,
    boxShadow: '0 6px 18px rgba(0,0,0,0.08)',
    zIndex: 40
  };

  const itemStyle = {
    padding: '8px 12px',
    cursor: 'pointer',
    fontSize: 13,
    background: 'transparent',
    border: 'none',
    textAlign: 'left',
    width: '100%'
  };

  const handleSelect = (l) => {
    setLang(l);
    setOpen(false);
  };

  return (
    <div style={wrapper} ref={ref}>
      <button
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen(s => !s)}
        style={triggerStyle}
        title={t('app_title')}
        type="button"
      >
        <span>{lang === 'en' ? t('lang_english') : t('lang_indonesian')}</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M7 10l5 5 5-5" stroke="#333" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
      </button>

      {open && (
        <div role="menu" style={menuStyle}>
          <button role="menuitem" style={{ ...itemStyle, ...(lang === 'en' ? { fontWeight: 700 } : {}) }} onClick={() => handleSelect('en')} type="button">{t('lang_english')}</button>
          <button role="menuitem" style={{ ...itemStyle, ...(lang === 'id' ? { fontWeight: 700 } : {}) }} onClick={() => handleSelect('id')} type="button">{t('lang_indonesian')}</button>
        </div>
      )}
    </div>
  );
}
