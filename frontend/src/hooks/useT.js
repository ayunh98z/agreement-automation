import { useContext, useCallback } from 'react';
import { LanguageContext } from '../context/LanguageContext';
import { t as _t } from '../utils/messages';

export default function useT() {
  const { lang } = useContext(LanguageContext);
  return useCallback((key, l) => _t(key, l || lang), [lang]);
}
