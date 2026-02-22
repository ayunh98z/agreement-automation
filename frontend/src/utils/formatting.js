/**
 * Consolidated formatting utilities for Indonesian number and date conversion
 * Used across BLAgreement and UVAgreement components
 */

/**
 * Convert numbers to Indonesian words
 * e.g., 1 → 'satu', 2008 → 'dua ribu delapan'
 */
export function getIndonesianNumberWord(num) {
  const units = ['', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'delapan', 'sembilan'];
  const spellInt = (n) => {
    n = Math.floor(n);
    if (n === 0) return 'nol';
    const parts = [];
    const billions = Math.floor(n / 1000000000);
    if (billions) { parts.push(spellInt(billions) + ' miliar'); n %= 1000000000; }
    const millions = Math.floor(n / 1000000);
    if (millions) { parts.push(spellInt(millions) + ' juta'); n %= 1000000; }
    const thousands = Math.floor(n / 1000);
    if (thousands) {
      if (thousands === 1) parts.push('seribu'); else parts.push(spellInt(thousands) + ' ribu');
      n %= 1000;
    }
    const hundreds = Math.floor(n / 100);
    if (hundreds) {
      if (hundreds === 1) parts.push('seratus'); else parts.push(units[hundreds] + ' ratus');
      n %= 100;
    }
    if (n >= 10 && n < 20) {
      if (n === 10) parts.push('sepuluh');
      else if (n === 11) parts.push('sebelas');
      else parts.push(units[n - 10] + ' belas');
    } else if (n > 0 && n < 10) {
      parts.push(units[n]);
    } else if (n >= 20) {
      const tens = Math.floor(n / 10);
      const rest = n % 10;
      const tensWord = ['','','dua puluh','tiga puluh','empat puluh','lima puluh','enam puluh','tujuh puluh','delapan puluh','sembilan puluh'][tens];
      parts.push(tensWord + (rest ? ' ' + units[rest] : ''));
    }
    return parts.join(' ').trim();
  };
  
  // helper will be applied globally from top-level toTitleCase

  try {
    if (num === '' || num === null || num === undefined) return '';
    const s = String(num).trim().replace(',', '.');
    let result = '';
    if (s.indexOf('.') >= 0) {
      const [intPart, decPart] = s.split('.', 2);
      const intNum = intPart === '' ? 0 : parseInt(intPart, 10);
      const intWords = intNum === 0 ? 'nol' : spellInt(intNum);
      const decWords = decPart.split('').map(d => units[parseInt(d,10)] || d).join(' ');
      result = (intWords + ' koma ' + decWords).trim();
    } else {
      const n = parseInt(s, 10);
      result = spellInt(n);
    }
    return toTitleCase(result);
  } catch (e) { return toTitleCase(String(num)); }
}

/**
 * Convert a string to Title Case (capitalize first letter of each word)
 */
export function toTitleCase(s) {
  try {
    if (s === null || s === undefined) return '';
    const str = String(s).trim();
    if (str === '') return '';
    return str.split(/\s+/).map(w => (w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())).join(' ');
  } catch (e) { return s; }
}

/**
 * Recursively convert string fields in an object to Title Case.
 * Skips keys listed in numericFields and common identifier/contact keys.
 */
export function titleCasePayload(obj, numericFields = []) {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'string') return toTitleCase(obj);
  if (typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(item => titleCasePayload(item, numericFields));

  const out = {};
  Object.keys(obj).forEach((k) => {
    try {
      const v = obj[k];
      const lk = String(k).toLowerCase();
      // Explicitly exclude certain fields from any title-casing
      const _excludedKeys = ['location_of_land', 'street_of_debtor'];
      if (_excludedKeys.includes(lk)) { out[k] = v; return; }
      // Skip numeric fields
      if (Array.isArray(numericFields) && numericFields.includes(k)) { out[k] = v; return; }
      // Skip obvious identifiers/contact fields
      if (/^(contract_number|email|e_mail|id|pk)$/.test(lk) || /@|http|mailto|nik|npwp|url/.test(String(v))) { out[k] = v; return; }
      // Skip date/display/word fields (they are handled separately)
      if (/_in_word$|_by_word$|_date$|_display$/.test(k)) { out[k] = v; return; }

      if (typeof v === 'string') {
        // Default title-case
        let transformed = toTitleCase(v);
        try {
          const lkKey = String(k).toLowerCase();
          // Preserve RT/RW uppercase for address-like fields
          const rtRwFields = ['street_name_of_debtor', 'location_of_land', 'street_of_debtor', 'street_name'];
          const preserveAcronym = (text, acronym) => {
            const ac = String(acronym).toLowerCase();
            const re = new RegExp('(^|[^A-Za-z])(' + ac + ')([^A-Za-z]|$)', 'gi');
            return text.replace(re, (m, p1, p2, p3) => p1 + acronym.toUpperCase() + p3);
          };

          if (rtRwFields.includes(lkKey)) {
            transformed = preserveAcronym(transformed, 'rt');
            transformed = preserveAcronym(transformed, 'rw');
          }

          // Preserve collateral acronyms (AJB, SHM)
          if (lkKey === 'collateral_type') {
            transformed = preserveAcronym(transformed, 'ajb');
            transformed = preserveAcronym(transformed, 'shm');
          }
        } catch (e) { /* non-fatal */ }
        out[k] = transformed;
      }
      else if (Array.isArray(v)) out[k] = v.map(item => titleCasePayload(item, numericFields));
      else if (v && typeof v === 'object') out[k] = titleCasePayload(v, numericFields);
      else out[k] = v;
    } catch (e) { out[k] = obj[k]; }
  });
  return out;
}

/**
 * Convert date string to Indonesian words
 * e.g., '2008-01-15' → 'lima belas januari dua ribu delapan'
 */
export function getIndonesianDateInWords(dateString) {
  if (!dateString) return '';
  const iso = parseDateFromDisplay(dateString);
  if (!iso) return '';
  const date = new Date(iso + 'T00:00:00');
  if (isNaN(date.getTime())) return '';
  const monthsInWords = ['januari', 'februari', 'maret', 'april', 'mei', 'juni','juli', 'agustus', 'september', 'oktober', 'november', 'desember'];
  const day = date.getDate();
  const month = monthsInWords[date.getMonth()];
  const year = date.getFullYear();
  const composed = `${getIndonesianNumberWord(day)} ${month} ${getIndonesianNumberWord(year)}`;
  return toTitleCase(composed);
}

/**
 * Get Indonesian day name
 * e.g., 0 → 'Minggu', 1 → 'Senin', etc.
 */
export function getIndonesianDayName(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString + 'T00:00:00');
  if (isNaN(date.getTime())) return '';
  const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  // ensure sentence-case (first letter capital, rest lowercase)
  const d = days[date.getDay()] || '';
  return d.charAt(0).toUpperCase() + d.slice(1).toLowerCase();
}

/**
 * Format date display in Indonesian format
 * e.g., '2008-01-15' → '15 Januari 2008'
 */
export function getIndonesianDateDisplay(dateString) {
  if (!dateString) return '';
  const iso = parseDateFromDisplay(dateString);
  if (!iso) return '';
  const date = new Date(iso + 'T00:00:00');
  if (isNaN(date.getTime())) return '';
  const months = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

/**
 * Format date for display (alias for getIndonesianDateDisplay)
 */
export function formatDateDisplay(dateString) {
  return getIndonesianDateDisplay(dateString);
}

/**
 * Format number with dots separator (thousands)
 * e.g., 1000000 → '1.000.000'
 */
export function formatNumberWithDots(val) {
  try {
    if (val === null || val === undefined || val === '') return '';
    const v = parseFloat(String(val).replace(/,/g, '.'));
    if (isNaN(v)) return String(val);
    return v.toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  } catch (e) {
    return String(val);
  }
}

/**
 * Parse date from various display formats to ISO YYYY-MM-DD
 * e.g., '15/01/2008', '15-01-2008', '15 01 2008' → '2008-01-15'
 */
export function parseDateFromDisplay(display) {
  if (!display) return '';
  const s = String(display).trim();
  const m1 = s.match(new RegExp('^(\\d{2})[\\/\\-\\s](\\d{2})[\\/\\-\\s]?(\\d{4})$'));
  if (m1) { const [, dd, mm, yyyy] = m1; return `${yyyy}-${mm}-${dd}`; }
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const isoDate = new Date(s);
  if (!isNaN(isoDate.getTime())) {
    const y = isoDate.getFullYear();
    const m = String(isoDate.getMonth() + 1).padStart(2, '0');
    const d = String(isoDate.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  return '';
}

/**
 * Check if a field name is a date field
 */
export function isDateFieldName(fieldName) {
  if (!fieldName) return false;
  const f = String(fieldName).toLowerCase();
  // Treat as date when field explicitly contains 'date', or is an agreement/sp3 related field
  if (f.includes('date') || f.includes('agreement') || f.includes('sp3')) return true;
  // Only treat 'birth' as date when 'date' is also present (e.g. 'date_birth_of_bm')
  if (f.includes('birth') && f.includes('date')) return true;
  return false;
}

/**
 * Check if a string is ISO date format (YYYY-MM-DD)
 */
export function isIsoDate(s) {
  if (!s) return false;
  return /^\d{4}-\d{2}-\d{2}$/.test(String(s));
}

/**
 * Format field name for display (convert snake_case to Title Case)
 * e.g., 'name_of_debtor' → 'Name Of Debtor'
 */
export function formatFieldName(name) {
  if (!name) return '';
  try {
    // handle known frontend-only label overrides centrally so all components
    // using `formatFieldName` will show the desired display names
    const isWord = /(_in_word|_by_word)$/.test(name);
    const base = name.replace(/(_in_word|_by_word)$/, '');
    if (base === 'notaris_fee') return isWord ? 'Handling Fee In Word' : 'Handling Fee';
    // UX: show more user-friendly labels for previous topup and topup contract
    if (base === 'previous_topup_amount') return isWord ? 'Outstanding Previous Contract In Word' : 'Outstanding Previous Contract';
    if (base === 'topup_contract') return isWord ? 'Previous Contract In Word' : 'Previous Contract';
    // Note: `flat_rate` label intentionally not overridden here so BL can
    // display the original "Flat Rate" while UV applies its own local
    // override to show "Effective Rate". Keeping this mapping only for
    // notaris_fee ensures the change is frontend-local and scoped.

    return name
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  } catch (e) {
    return name;
  }
}


/**
 * Remove id/pk from object recursively
 */
export function removeIdPk(obj) {
  if (!obj || typeof obj !== 'object') return;
  ['id', 'pk'].forEach(k => { if (Object.prototype.hasOwnProperty.call(obj, k)) delete obj[k]; });
  Object.keys(obj).forEach(k => { try { if (obj[k] && typeof obj[k] === 'object') removeIdPk(obj[k]); } catch (e) {} });
}
