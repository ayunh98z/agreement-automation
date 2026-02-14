/* eslint-disable unicode-bom, no-unused-vars, react-hooks/exhaustive-deps */
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../UserManagement/UserManagement.css';
import docxIcon from '../../assets/icons/docx-icon.svg';
import pdfIcon from '../../assets/icons/pdf-icon.svg';
 
// --- Helper utilities copied from AgreementForm ---
const parseDateFromDisplay = (display) => {
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
};

const getIndonesianDayName = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString + 'T00:00:00');
  const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  return days[date.getDay()];
};

const getIndonesianDateInWords = (dateString) => {
  if (!dateString) return '';
  const iso = parseDateFromDisplay(dateString);
  if (!iso) return '';
  const date = new Date(iso + 'T00:00:00');
  if (isNaN(date.getTime())) return '';
  const monthsInWords = ['januari', 'februari', 'maret', 'april', 'mei', 'juni','juli', 'agustus', 'september', 'oktober', 'november', 'desember'];
  const day = date.getDate();
  const month = monthsInWords[date.getMonth()];
  const year = date.getFullYear();
  return `${getIndonesianNumberWord(day)} ${month} ${getIndonesianNumberWord(year)}`;
};

const getIndonesianDateDisplay = (dateString) => {
  if (!dateString) return '';
  const iso = parseDateFromDisplay(dateString);
  if (!iso) return '';
  const date = new Date(iso + 'T00:00:00');
  if (isNaN(date.getTime())) return '';
  const months = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
};

const isIsoDate = (s) => {
  if (!s) return false;
  return /^\d{4}-\d{2}-\d{2}$/.test(String(s));
};

const getIndonesianNumberWord = (num) => {
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
    if (n >= 20) {
      const tens = Math.floor(n / 10);
      const rest = n % 10;
      const tensWord = ['','','dua puluh','tiga puluh','empat puluh','lima puluh','enam puluh','tujuh puluh','delapan puluh','sembilan puluh'][tens];
      parts.push(tensWord + (rest ? ' ' + units[rest] : ''));
      return parts.join(' ').trim();
    }
    if (n >= 10 && n < 20) {
      if (n === 10) parts.push('sepuluh');
      else if (n === 11) parts.push('sebelas');
      else parts.push(units[n - 10] + ' belas');
    } else if (n > 0 && n < 10) {
      parts.push(units[n]);
    }
    return parts.join(' ').trim();
  };
  try {
    if (num === '' || num === null || num === undefined) return '';
    const s = String(num).trim().replace(',', '.');
    if (s.indexOf('.') >= 0) {
      const [intPart, decPart] = s.split('.', 2);
      const intNum = intPart === '' ? 0 : parseInt(intPart, 10);
      const intWords = intNum === 0 ? 'nol' : spellInt(intNum);
      const decWords = decPart.split('').map(d => units[parseInt(d,10)] || d).join(' ');
      return (intWords + ' koma ' + decWords).trim();
    } else {
      const n = parseInt(s, 10);
      return spellInt(n);
    }
  } catch (e) { return String(num); }
};

const getMonthInRomanNumeral = (monthNumber) => {
  const romanNumerals = ['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII'];
  return romanNumerals[monthNumber - 1] || '';
};

// Recursively remove any primary-key keys from payloads to avoid duplicate-PK insertions
const stripIdKeys = (obj) => {
  if (!obj || typeof obj !== 'object') return;
  if (Array.isArray(obj)) {
    obj.forEach(item => stripIdKeys(item));
    return;
  }
  if (Object.prototype.hasOwnProperty.call(obj, 'id')) delete obj.id;
  if (Object.prototype.hasOwnProperty.call(obj, 'pk')) delete obj.pk;
  Object.keys(obj).forEach(k => {
    try {
      if (obj[k] && typeof obj[k] === 'object') stripIdKeys(obj[k]);
    } catch (e) {
      // ignore
    }
  });
};

// Styles constant used by the inlined form
const styles = {
  container: { padding: '20px', backgroundColor: '#f5f5f5', minHeight: '100vh' },
  label: { fontSize: '13px', fontWeight: '600', color: '#333', letterSpacing: '0.5px' },
  input: { padding: '10px 12px', fontSize: '14px', border: '1px solid #ddd', borderRadius: '6px', outline: 'none', backgroundColor: '#f9f9f9', fontFamily: 'inherit' },
  btnPrimary: { padding: '10px 20px', fontSize: '14px', fontWeight: '600', background: 'linear-gradient(135deg, #0a1e3d 0%, #051626 100%)', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' },
  btnSecondary: { padding: '10px 20px', fontSize: '14px', fontWeight: '600', backgroundColor: 'white', color: '#0a1e3d', border: '2px solid #0a1e3d', borderRadius: '6px', cursor: 'pointer' }
};

// --- End helpers ---
// Helper to resolve current username from localStorage or token when not available in component state
const getCurrentUsername = () => {
  try {
    const raw = localStorage.getItem('user_data');
    if (raw) {
      try { const parsed = JSON.parse(raw); return parsed.username || parsed.full_name || ''; } catch (e) { }
    }
    const token = localStorage.getItem('access_token');
    if (token) {
      const parts = token.split('.');
      if (parts.length >= 2) {
        try {
          const payload = JSON.parse(window.atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
          return payload.username || payload.user_name || payload.name || payload.full_name || '';
        } catch (e) { }
      }
    }
  } catch (e) { }
  return '';
};
function BLAgreementForm({ initialContractNumber = '', initialContractData = null, onSaved, onContractSaved, contractOnly = false, editOnly = false, createOnly = false, hideFilter = false, hideHeader = false, isUV = false, inModal = false } = {}) {
  // State UI lokal
  // BL SP3 page is independent of UV data — force UV mode off here
  isUV = false;
  const [saving, setSaving] = useState(false);
  const [usernameDisplay, setUsernameDisplay] = useState('');

  useEffect(() => {
    try {
      const raw = localStorage.getItem('user_data');
      if (raw) {
        try { const parsed = JSON.parse(raw); setUsernameDisplay(parsed.username || parsed.full_name || ''); } catch (e) {}
      }
      (async () => {
        try {
          const token = localStorage.getItem('access_token');
          if (!token) return;
          const res = await axios.get('http://localhost:8000/api/whoami/', { headers: { 'Authorization': `Bearer ${token}` } });
          setUsernameDisplay(res.data.username || res.data.full_name || '');
          return;
        } catch (err) { /* ignore */ }
      
        try {
          // fallback: try decode JWT payload to get username
          const token = localStorage.getItem('access_token');
          if (token) {
            const parts = token.split('.');
            if (parts.length >= 2) {
              try {
                const payload = JSON.parse(window.atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
                const uname = payload.username || payload.user_name || payload.name || payload.full_name || payload.sub || '';
                if (uname) setUsernameDisplay(uname);
              } catch (e) { /* ignore decode errors */ }
            }
          }
        } catch (e) { /* ignore */ }
      })();
    } catch (e) { /* ignore */ }
  }, []);

  // Pembantu: unduh DOCX untuk nomor kontrak
  const triggerDocxDownload = async (contractNum, accessToken, templateName) => {
    if (!contractNum || String(contractNum).trim() === '') return;
    try {
      const token = accessToken || localStorage.getItem('access_token');
      const base = isUV ? 'uv-agreement' : 'bl-agreement';
      const tplParam = templateName ? `&template=${encodeURIComponent(templateName)}` : '';
      const url = `http://localhost:8000/api/${base}/download-docx/?contract_number=${encodeURIComponent(contractNum)}${tplParam}`;
      const resp = await axios.get(url, {
        responseType: 'blob',
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      const contentType = (resp.headers && resp.headers['content-type']) || '';
      const isPdf = contentType.includes('pdf');
      const blob = new Blob([resp.data], { type: contentType || (isPdf ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') });
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = `${isUV ? 'uv_agreement' : 'BL_SP3'}_${contractNum}${isPdf ? '.pdf' : '.docx'}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(link.href);
    } catch (e) {
      console.error('DOCX download failed', e);
    }
  };

  // Fungsi untuk menangani penyimpanan (dengan refresh token saat kadaluwarsa)
  const handleSave = async () => {
    setSaving(true);
    setError('');

    const doSave = async (accessToken) => {
        // Siapkan payload dan pastikan field turunan "_in_word" / "_by_word" disertakan
        const contractDataToSave = { ...contractData };
        contractFields.forEach((f) => {
          if (/_in_word$|_by_word$/.test(f)) {
            const base = f.replace(/(_in_word|_by_word)$/, '');
            if (/date|birth/i.test(base)) {
              contractDataToSave[f] = getIndonesianDateInWords(contractData[base]) || contractData[f] || '';
            } else {
              const n = Number(contractData[base] || 0) || 0;
              contractDataToSave[f] = getIndonesianNumberWord(n) || contractData[f] || '';
            }
          }
        });

        const bmDataToSave = { ...bmData };
        bmFields.forEach((f) => {
          if (/_in_word$|_by_word$/.test(f)) {
            const base = f.replace(/(_in_word|_by_word)$/, '');
            if (/date|birth/i.test(base)) {
              bmDataToSave[f] = getIndonesianDateInWords(bmData[base]) || bmData[f] || '';
            } else {
              const n = Number(bmData[base] || 0) || 0;
              bmDataToSave[f] = getIndonesianNumberWord(n) || bmData[f] || '';
            }
          }
        });

        const headerFieldsToSave = { ...headerFields };
        // (no _display fields added — visual formatting handled in inputs)
        if (headerFieldsToSave.agreement_date) {
          headerFieldsToSave.agreement_day_in_word = getIndonesianDayName(headerFieldsToSave.agreement_date) || headerFieldsToSave.agreement_day_in_word || '';
          headerFieldsToSave.agreement_date_in_word = getIndonesianDateInWords(headerFieldsToSave.agreement_date) || headerFieldsToSave.agreement_date_in_word || '';
          headerFieldsToSave.agreement_date_display = `(${getIndonesianDateDisplay(headerFieldsToSave.agreement_date)})` || headerFieldsToSave.agreement_date_display || '';
        }
        if (headerFieldsToSave.sp3_date) {
          headerFieldsToSave.sp3_date_in_word = getIndonesianDateInWords(headerFieldsToSave.sp3_date) || headerFieldsToSave.sp3_date_in_word || '';
          headerFieldsToSave.sp3_date_display = `(${getIndonesianDateDisplay(headerFieldsToSave.sp3_date)})` || headerFieldsToSave.sp3_date_display || '';
        }
        if (headerFieldsToSave.date_of_delegated) {
          headerFieldsToSave.date_of_delegated_in_word = getIndonesianDateInWords(headerFieldsToSave.date_of_delegated) || headerFieldsToSave.date_of_delegated_in_word || '';
          headerFieldsToSave.date_of_delegated_display = `(${getIndonesianDateDisplay(headerFieldsToSave.date_of_delegated)})` || headerFieldsToSave.date_of_delegated_display || '';
        }
        headerFieldsToSave.name_of_debtor = headerFieldsToSave.name_of_debtor || (contractDataToSave && contractDataToSave.name_of_debtor) || '';
        headerFieldsToSave.phone_number_of_lolc = headerFieldsToSave.phone_number_of_lolc || headerFieldsToSave.phone_number_of_lolc || '';

        const debtorToSave = { ...contractDataToSave };
        const effectiveContractNumber = (contractNumber && String(contractNumber).trim()) ? contractNumber : (initialContractNumber || '');
        const payload = {
          contract_number: effectiveContractNumber,
          branch_id: selectedBranchId,
          director: selectedDirector,
          bm_data: bmDataToSave,
          branch_data: branchData,
          contract_data: contractDataToSave,
          debtor: debtorToSave,
          collateral_data: collateralData,
          header_fields: headerFieldsToSave,
          created_by: usernameDisplay,
          edit_only: !!(typeof editOnly !== 'undefined' ? editOnly : false),
          create_only: !!(typeof createOnly !== 'undefined' ? createOnly : false)
        };

        // Prevent backend "create_only" duplicate error when saving BL agreements
        // for the BL SP3 create/download flow: don't send create_only to the
        // BL agreement endpoint (it's intended for strict-create semantics and
        // causes an error if a record already exists). The BL SP3 table is
        // handled separately below, so omit this flag for BL saves.
        if (!isUV && payload.create_only) {
          delete payload.create_only;
        }

        if (editOnly || initialContractNumber) {
          Object.keys(extraFields || {}).forEach((k) => {
            if (!payload.hasOwnProperty(k)) payload[k] = extraFields[k];
          });
        }
        try { console.log('Agreement save payload (contract_number):', effectiveContractNumber, payload); } catch (e) {}
        const saveBase = isUV ? 'uv-agreement' : 'bl-agreement';
        try {
          const nowIso = new Date().toISOString();
          if (isUV && !(editOnly || initialContractNumber)) {
            payload.created_by = payload.created_by || usernameDisplay || '';
            payload.created_at = payload.created_at || nowIso;
            payload.updated_at = payload.updated_at || nowIso;
          }
        } catch (e) { /* ignore */ }
        const headers = {
          'Authorization': accessToken ? `Bearer ${accessToken}` : `Bearer ${localStorage.getItem('access_token')}`,
          'Content-Type': 'application/json'
        };
        // Backend does not accept PATCH for the agreement endpoint in this deployment.
        // Use POST and recursively strip id/pk to avoid primary-key insertion errors.
        try { stripIdKeys(payload); } catch (e) { /* ignore */ }
        return axios.post(`http://localhost:8000/api/${saveBase}/`, payload, { headers });
    };
    try {
      await doSave(localStorage.getItem('access_token'));
      // After saving agreement, also persist a bl_sp3 entry for create flows
        try {
        const sp3Payload = {
          contract_number: contractNumber || initialContractNumber || '',
          header_fields: headerFields,
          contract_data: contractData,
          debtor: contractData,
          collateral_data: collateralData,
          bm_data: bmData,
          branch_data: branchData,
          extra_fields: extraFields,
          created_by: usernameDisplay
        };
        try { stripIdKeys(sp3Payload); } catch (e) { /* ignore */ }
        await axios.post('http://localhost:8000/api/bl-sp3/create-public/', sp3Payload, { headers: { 'Content-Type': 'application/json' } });
      } catch (e) {
        console.warn('Failed to save bl_sp3 entry', e);
      }
      const savedContractNumber = contractNumber || initialContractNumber || '';
      if (typeof onSaved === 'function') {
        try { onSaved(savedContractNumber); } catch (e) { console.warn('onSaved callback failed', e); }
      }
      if (!(editOnly || initialContractNumber)) {
        try { await triggerDocxDownload(savedContractNumber, localStorage.getItem('access_token'), 'uv_sp3_template.docx'); } catch (e) { /* ignore download errors */ }
      }
    } catch (err) {
      const respData = err?.response?.data || {};
      const isTokenExpired = respData.code === 'token_not_valid' || (respData.messages && Array.isArray(respData.messages) && respData.messages.some(m => m.message && m.message.toLowerCase().includes('expired')));

      if (isTokenExpired) {
        try {
          const refresh = localStorage.getItem('refresh_token');
          if (!refresh) throw new Error('No refresh token available');
          const r = await axios.post('http://localhost:8000/api/token/refresh/', { refresh });
          const newAccess = r.data.access;
            if (newAccess) {
              localStorage.setItem('access_token', newAccess);
              await doSave(newAccess);
              const savedContractNumberRetry = contractNumber || initialContractNumber || '';
              if (typeof onSaved === 'function') {
                try { onSaved(savedContractNumberRetry); } catch (e) { console.warn('onSaved callback failed', e); }
              }
              if (!(editOnly || initialContractNumber)) {
                try { await triggerDocxDownload(savedContractNumberRetry, newAccess, 'uv_sp3_template.docx'); } catch (e) { /* ignore */ }
              }
            } else {
              throw new Error('Refresh failed');
            }
        } catch (refreshErr) {
          console.error('Token refresh failed', refreshErr);
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          setError('Session expired. Please login again.');
        }
      } else {
        const resp = err?.response;
        if (resp) {
          const status = resp.status;
          const url = resp.request?.responseURL || resp.config?.url || 'unknown';
          let body = '';
          try { body = typeof resp.data === 'string' ? resp.data : JSON.stringify(resp.data); } catch (e) { body = String(resp.data); }
          setError(`Failed to save (${status}) ${url}: ${body && body.substring(0,200)}`);
          console.error('Save error response:', resp);
        } else {
          setError('Failed to save data: ' + (err.message || 'unknown error'));
          console.error('Save error:', err);
        }
      }
    } finally {
      setSaving(false);
    }
  };

  

  // Load BL SP3 entry for given contract (latest)
  const loadBLSP3 = async (cn) => {
    if (!cn) return;
    try {
      const token = localStorage.getItem('access_token');
      const res = await axios.get('http://localhost:8000/api/bl-sp3/', { params: { contract_number: cn }, headers: token ? { Authorization: `Bearer ${token}` } : {} });
      const sp3 = res.data?.sp3 || null;
      if (sp3) {
        // Map known keys into headerFields and other states
        setHeaderFields(prev => ({ ...prev, sp3_number: sp3.sp3_number ?? prev.sp3_number, sp3_date: sp3.sp3_date ?? prev.sp3_date }));
        // Attempt to apply other sections if present in sp3 row
        try {
          if (sp3.contract_number) setContractNumber(sp3.contract_number);
          // If columns exist for debtor/contract/collateral fields, merge them
          const keys = Object.keys(sp3 || {});
          const contractMap = {};
          keys.forEach(k => {
            if (k in contractData) contractMap[k] = sp3[k];
          });
          if (Object.keys(contractMap).length > 0) setContractData(prev => ({ ...prev, ...contractMap }));
        } catch (e) { /* ignore mapping errors */ }
      }
    } catch (err) {
      if (err?.response && err.response.status === 404) return;
      console.warn('Failed to load bl_sp3 for contract', cn, err);
    }
  };

  const [contractNumber, setContractNumber] = useState('');
  useEffect(() => { if (initialContractNumber) setContractNumber(initialContractNumber); }, [initialContractNumber]);

  useEffect(() => {
    if (!initialContractData) return;
    if (initialContractNumber) return;
    try {
      if (initialContractData.contract_number) setContractNumber(initialContractData.contract_number);
      setContractData(prev => ({ ...prev, ...initialContractData }));
    } catch (e) { console.warn('Failed to apply initialContractData to form', e); }
  }, [initialContractData, initialContractNumber]);

  // On edit/open, try to load existing bl_sp3 record for this contract
  useEffect(() => {
    const cn = initialContractNumber || contractNumber || '';
    if (!cn) return;
    // Load BL SP3 specific row (if exists) to populate sp3-specific fields
    loadBLSP3(cn);
    // Also ensure base contract/collateral data is loaded when opening edit modal
    if (initialContractNumber) {
      try { handleView(initialContractNumber).catch(() => {}); } catch (e) { /* ignore */ }
    }
  }, [initialContractNumber, contractNumber]);

  const handleContractOnlySave = async () => {
    setContractOnlySaving(true);
    setContractOnlyError('');
    try {
      const token = localStorage.getItem('access_token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const payload = {};
      Object.keys(contractData || {}).forEach((k) => {
        if (/_in_word$|_by_word$/.test(k)) return;
        let v = contractData[k];
        if (numericFields.includes(k) && v !== undefined && v !== null && v !== '') {
          const n = Number(String(v).replace(/\./g, '').replace(/,/g, ''));
          v = Number.isNaN(n) ? v : n;
        }
        payload[k] = v;
      });
      try { payload.created_by = usernameDisplay || '' } catch (e) { payload.created_by = ''; }
      const nowIso = new Date().toISOString();
      payload.created_at = nowIso;
      payload.updated_at = nowIso;

      const res = await axios.post('http://localhost:8000/api/contracts/', payload, { headers });
      if (typeof onContractSaved === 'function') {
        try { onContractSaved(res.data || payload); } catch (e) { console.warn('onContractSaved failed', e); }
      }
    } catch (err) {
      console.error('Failed saving contract-only', err);
      const resp = err?.response;
      if (resp) {
        const status = resp.status;
        const url = resp.request?.responseURL || resp.config?.url || 'unknown';
        let body = '';
        try { body = typeof resp.data === 'string' ? resp.data : JSON.stringify(resp.data); } catch (e) { body = String(resp.data); }
        setContractOnlyError(`Failed saving contract (${status}) ${url}: ${body && body.substring(0,200)}`);
        console.error('Contract-only save response:', resp);
      } else {
        setContractOnlyError('Failed saving contract: ' + (err.message || 'unknown error'));
      }
    } finally {
      setContractOnlySaving(false);
    }
  };

  const [contracts, setContracts] = useState([]);
  const [filteredContracts, setFilteredContracts] = useState([]);
  const [showContractDropdown, setShowContractDropdown] = useState(false);
  const [branches, setBranches] = useState([]);
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [selectedDirector, setSelectedDirector] = useState('');
  React.useEffect(() => { if (inModal && (createOnly || editOnly) && !selectedDirector) setSelectedDirector('Supriyono Soekarno'); }, [inModal, createOnly, editOnly]);
  const [directors, setDirectors] = useState([]);
  React.useEffect(() => {
    if (!selectedDirector) return;
    const found = (directors || []).find(d => String(d.id) === String(selectedDirector) || d.name === selectedDirector || d.name_of_director === selectedDirector || (typeof d === 'string' && d === selectedDirector));
    if (found) {
      if (typeof found === 'string') {
        setHeaderFields(prev => ({ ...prev, name_of_director: found || prev.name_of_director || '' }));
      } else {
        setHeaderFields(prev => ({
          ...prev,
          name_of_director: found.name_of_director || found.name || prev.name_of_director || '',
          phone_number_of_lolc: found.phone_number_of_lolc || found.phone_number_of_director || prev.phone_number_of_lolc || ''
        }));
      }
    }
  }, [selectedDirector, directors]);
  const [loadingBranches, setLoadingBranches] = useState(true);
  const [loadingDirectors, setLoadingDirectors] = useState(true);
  const [loadingContracts, setLoadingContracts] = useState(true);
  const [bmData, setBmData] = useState({});
  const [branchData, setBranchData] = useState({});
  const [contractData, setContractData] = useState({});
  const [collateralData, setCollateralData] = useState({});
  const [uvCollateralFields, setUvCollateralFields] = useState([]);
  const [extraFields, setExtraFields] = useState({});

  const findValueInObj = (obj, targetKey) => {
    if (!obj || !targetKey) return undefined;
    const normalize = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const nt = normalize(targetKey);
    if (obj.hasOwnProperty(targetKey)) return obj[targetKey];
    if (obj.hasOwnProperty(targetKey.toLowerCase())) return obj[targetKey.toLowerCase()];
    for (const k of Object.keys(obj)) { if (normalize(k) === nt) return obj[k]; }
    const parts = targetKey.split('_').map(p => p.toLowerCase()).filter(Boolean);
    for (const k of Object.keys(obj)) {
      const lk = k.toLowerCase();
      let score = 0;
      for (const p of parts) if (p.length > 2 && lk.includes(p)) score++;
      if (score >= Math.max(1, Math.floor(parts.length / 2))) return obj[k];
    }
    return undefined;
  };
  const [headerFields, setHeaderFields] = useState({
    agreement_date: new Date().toISOString().split('T')[0],
    place_of_agreement: '',
    agreement_day_in_word: '',
    agreement_date_in_word: '',
    // backward-compatible keys requested by UI: agreement_day_inword, agreement_date_inword
    agreement_day_inword: '',
    agreement_date_inword: '',
    name_of_director: '',
    date_of_delegated: new Date().toISOString().split('T')[0],
    sp3_number: '',
    sp3_date: new Date().toISOString().split('T')[0],
    phone_number_of_lolc: ''
  });

  // Auto-fill day name and date-in-words whenever agreement_date changes
  useEffect(() => {
    try {
      const ad = headerFields?.agreement_date;
      if (!ad) return;
      const iso = parseDateFromDisplay(ad) || ad;
      const dayName = getIndonesianDayName(iso) || '';
      const dateWords = getIndonesianDateInWords(iso) || '';
      setHeaderFields(prev => ({ ...prev,
        agreement_day_in_word: dayName || prev.agreement_day_in_word || '',
        agreement_date_in_word: dateWords || prev.agreement_date_in_word || '',
        agreement_day_inword: dayName || prev.agreement_day_inword || '',
        agreement_date_inword: dateWords || prev.agreement_date_inword || ''
      }));
    } catch (e) { /* ignore */ }
  }, [headerFields?.agreement_date]);

  // Auto-generate SP3 Number when agreement date or contract number changes
  useEffect(() => {
    const cn = (contractData && contractData.contract_number) || (contractNumber || '');
    const dateSource = headerFields.sp3_date || '';
    if (!dateSource || !cn) return;
    try {
      const sp3Date = new Date(String(dateSource) + 'T00:00:00');
      if (isNaN(sp3Date.getTime())) return;
      const month = sp3Date.getMonth() + 1;
      const year = sp3Date.getFullYear();
      const romanMonth = getMonthInRomanNumeral(month);
      const generatedSP3Number = `${cn}/OL/LOLCVI/${romanMonth}/${year}`;
      setHeaderFields(prev => ({ ...prev, sp3_number: generatedSP3Number }));
    } catch (e) {
      // ignore
    }
  }, [headerFields.sp3_date, contractData.contract_number, contractNumber]);

  // Auto-fill BM date birth in words when date_birth_of_bm changes
  useEffect(() => {
    try {
      const raw = bmData?.date_birth_of_bm;
      if (!raw || String(raw).trim() === '') return;
      const iso = parseDateFromDisplay(raw) || raw;
      const words = getIndonesianDateInWords(iso || raw) || '';
      setBmData(prev => {
        if (prev.date_birth_of_bm === iso && prev.date_birth_of_bm_in_word === words) return prev;
        const out = { ...prev, date_birth_of_bm_in_word: words };
        if (iso && prev.date_birth_of_bm !== iso) out.date_birth_of_bm = iso;
        return out;
      });
    } catch (e) { /* ignore */ }
  }, [bmData?.date_birth_of_bm]);
  const [debtor, setDebtor] = useState(null);
  const [collateral, setCollateral] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [contractOnlySaving, setContractOnlySaving] = useState(false);
  const [contractOnlyError, setContractOnlyError] = useState('');

  const bmFields = [
    'name_of_bm','place_birth_of_bm','date_birth_of_bm','date_birth_of_bm_in_word',
    'street_of_bm','subdistrict_of_bm','district_of_bm','city_of_bm','province_of_bm',
    'nik_number_of_bm','phone_number_of_bm'
  ];

  const branchFields = ['street_name','subdistrict','district','city','province'];

  const collateralFields = [
    'collateral_type','number_of_certificate','number_of_ajb','surface_area','name_of_collateral_owner','capacity_of_building','location_of_land'
  ];

  const numericFields = ['loan_amount','notaris_fee','admin_fee','net_amount','previous_topup_amount','mortgage_amount','tlo','life_insurance',
    'stamp_amount','financing_agreement_amount','security_agreement_amount','upgrading_land_rights_amount','total_amount'];

  const contractFields = [
    'contract_number','nik_number_of_debtor','name_of_debtor','place_birth_of_debtor','date_birth_of_debtor','date_birth_of_debtor_in_word',
    'street_of_debtor','subdistrict_of_debtor','district_of_debtor','city_of_debtor','province_of_debtor',
    'phone_number_of_debtor','business_partners_relationship','business_type',
    // Bank fields
    'bank_account_number','name_of_bank','name_of_account_holder','virtual_account_number',
    // New numeric fields to show in create-contract modal
    'loan_amount','loan_amount_in_word','term','term_by_word','flat_rate','flat_rate_by_word','notaris_fee','notaris_fee_in_word','admin_fee','admin_fee_in_word',
    'mortgage_amount','mortgage_amount_in_word','net_amount','net_amount_in_word','admin_rate','admin_rate_in_word','tlo','tlo_in_word','life_insurance','life_insurance_in_word',
    'topup_contract','previous_topup_amount','stamp_amount','financing_agreement_amount','security_agreement_amount','upgrading_land_rights_amount','total_amount'
  ];

  const hiddenForUV = new Set(['mortgage_amount', 'mortgage_amount_in_word']);
  const hiddenForBLCreate = new Set(['tlo', 'tlo_in_word', 'life_insurance', 'life_insurance_in_word']);

  const getVisibleContractFields = (forContractOnly = false) => {
    const shouldHide = forContractOnly || !!createOnly;
    if (!shouldHide) return contractFields;
    if (isUV) return contractFields.filter(f => !hiddenForUV.has(f));
    return contractFields.filter(f => !hiddenForBLCreate.has(f));
  };

  const loadContracts = async () => {
    setLoadingContracts(true);
    const token = localStorage.getItem('access_token');
    if (!token) { setContracts([]); setLoadingContracts(false); return; }
    try {
      const response = await axios.get('http://localhost:8000/api/bl-agreement/contracts/', { headers: { 'Authorization': `Bearer ${token}` } });
      setContracts(response.data.contracts || []);
    } catch (err) {
      console.error('Error loading contracts:', err);
      if (!err.response || err.response.status !== 401) setError('Gagal memuat daftar kontrak');
    } finally { setLoadingContracts(false); }
  };

  const loadBranches = async () => {
    setLoadingBranches(true);
    const token = localStorage.getItem('access_token');
    try {
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
      const res = await axios.get('http://localhost:8000/api/branches/', { headers });
      const items = res.data.branches || [];
      setBranches(items);
    } catch (err) {
      console.error('Error loading branches:', err);
      if (!err.response || err.response.status !== 401) setError('Gagal memuat daftar cabang');
    } finally { setLoadingBranches(false); }
  };

  useEffect(() => { loadContracts(); loadBranches(); loadDirectors(); }, []);

  // Keep total_amount in sync with component numeric fields
  useEffect(() => {
    const getNum = (v) => { if (v === undefined || v === null || v === '') return 0; const s = String(v).replace(/\./g, '').replace(/,/g, '').trim(); const n = Number(s); return Number.isNaN(n) ? 0 : n; };
    try {
      const sum = getNum(contractData.stamp_amount) + getNum(contractData.financing_agreement_amount) + getNum(contractData.security_agreement_amount) + getNum(contractData.upgrading_land_rights_amount);
      if (String(contractData.total_amount || '') !== String(sum)) {
        setContractData(prev => ({ ...prev, total_amount: sum }));
      }
    } catch (e) { /* ignore */ }
  }, [contractData.stamp_amount, contractData.financing_agreement_amount, contractData.security_agreement_amount, contractData.upgrading_land_rights_amount]);

  useEffect(() => {
    if (!selectedDirector) return;
    // Try to find director in already-loaded list first
    let found = (directors || []).find(d => String(d.id) === String(selectedDirector) || d.name === selectedDirector || d.name_of_director === selectedDirector || (typeof d === 'string' && d === selectedDirector));
    // If directors list contains plain strings (e.g. ["Name A"]), treat that as a match (handled above)
    if (found) {
      if (typeof found === 'string') {
        // set name immediately then try to fetch details (phone) from API below
        setHeaderFields(prev => ({ ...prev, name_of_director: found || prev.name_of_director || '' }));
      } else {
        setHeaderFields(prev => ({
          ...prev,
          name_of_director: found.name_of_director || found.name || prev.name_of_director || '',
          phone_number_of_lolc: found.phone_number_of_lolc || found.phone_number_of_director || prev.phone_number_of_lolc || ''
        }));
        return; // already have phone number
      }
    }

    (async () => {
      try {
        const token = localStorage.getItem('access_token');
        const res = await axios.get('http://localhost:8000/api/directors/', {
          params: { id: selectedDirector, name: selectedDirector },
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        const director = res.data.director || (Array.isArray(res.data.directors) ? res.data.directors[0] : null) || null;
        if (director) {
          setHeaderFields(prev => ({
            ...prev,
            name_of_director: director.name_of_director || director.name || prev.name_of_director || '',
            phone_number_of_lolc: director.phone_number_of_lolc || director.phone_number_of_director || prev.phone_number_of_lolc || ''
          }));
        }
      } catch (err) { console.warn('Failed to load director details', err); }
    })();
  }, [selectedDirector]);

  const loadDirectors = async () => {
    setLoadingDirectors(true);
    const token = localStorage.getItem('access_token');
    if (!token) { setDirectors([]); setLoadingDirectors(false); return; }
    try {
      const res = await axios.get('http://localhost:8000/api/directors/', { headers: { 'Authorization': `Bearer ${token}` } });
      setDirectors(res.data.directors || []);
    } catch (err) {
      console.error('Error loading directors:', err);
      if (!err.response || err.response.status !== 401) setError('Gagal memuat daftar direktur');
    } finally { setLoadingDirectors(false); }
  };

  // Pembantu untuk mengisi data branch dan BM dari daftar `branches`
  const handleBranchSelectLoad = (branchId) => {
    if (!branchId) return;
    const sel = (branches || []).find(b => String(b.id) === String(branchId));
    console.log('handleBranchSelectLoad called for branchId=', branchId, 'branchesLoaded=', (branches||[]).length);
    if (!sel) { console.warn('handleBranchSelectLoad: branch not found for id', branchId); return; }
    setBranchData({
      street_name: sel.street_name ?? sel.street_of_bm ?? '',
      subdistrict: sel.subdistrict ?? sel.subdistrict_of_bm ?? '',
      district: sel.district ?? sel.district_of_bm ?? '',
      city: sel.city ?? sel.city_of_bm ?? sel.name ?? '',
      province: sel.province ?? sel.province_of_bm ?? ''
    });
    // Setel `place_of_agreement` ke nama cabang untuk alur pembuatan (dan berguna secara umum)
    setHeaderFields(prev => ({ ...prev, place_of_agreement: sel.name ?? prev.place_of_agreement ?? '' }));
    setBmData(prev => ({
      ...prev,
      name_of_bm: sel.name_of_bm ?? sel.name ?? prev.name_of_bm ?? '',
      place_birth_of_bm: sel.place_birth_of_bm ?? sel.place_of_birth_of_bm ?? prev.place_birth_of_bm ?? '',
      date_birth_of_bm: sel.date_birth_of_bm ?? sel.date_of_birth_of_bm ?? prev.date_birth_of_bm ?? '',
      street_of_bm: sel.street_name_of_bm ?? sel.street_of_bm ?? sel.street_name ?? prev.street_of_bm ?? '',
      subdistrict_of_bm: sel.subdistrict_of_bm ?? sel.subdistrict ?? prev.subdistrict_of_bm ?? '',
      district_of_bm: sel.district_of_bm ?? sel.district ?? prev.district_of_bm ?? '',
      city_of_bm: sel.city_of_bm ?? sel.city ?? sel.name ?? prev.city_of_bm ?? '',
      province_of_bm: sel.province_of_bm ?? sel.province ?? prev.province_of_bm ?? '',
      nik_number_of_bm: sel.nik_number_of_bm ?? prev.nik_number_of_bm ?? '',
      phone_number_of_bm: sel.phone_number_of_bm ?? prev.phone_number_of_bm ?? ''
    }));
    if ((!sel.name_of_bm || !sel.date_birth_of_bm) && sel.bm_id) loadBMByCity(sel.bm_id);
  };

  const loadBMByCity = async (city) => {
    if (!city) return;
    try {
      const params = {};
      if (String(city).match(/^\d+$/)) params.bm_id = city; else params.city = city;
      const res = await axios.get('http://localhost:8000/api/branch-manager/', { params, headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` } });
      const bm = res.data.bm || {};
      setBmData(prevBmData => {
        const newBm = { ...prevBmData };
        bmFields.forEach((f) => { if (bm[f] !== undefined && bm[f] !== null && bm[f] !== '') newBm[f] = bm[f]; });
        return newBm;
      });
    } catch (err) { console.error('Error loading BM for city/bm_id:', err); }
  };

  const handleView = async (overrideContractNumber, forCreate = false) => {
    const cn = (overrideContractNumber !== undefined && overrideContractNumber !== null) ? String(overrideContractNumber) : String(contractNumber);
    if (!cn || !cn.trim()) { setDebtor(null); setCollateral(null); setError(''); return; }
    setLoading(true); setError('');
    try {
      const base = isUV ? 'uv-agreement' : 'bl-agreement';
      const response = await axios.get(`http://localhost:8000/api/${base}/`, { params: { contract_number: cn }, headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` } });

      setDebtor(response.data.debtor || null);
      setCollateral(response.data.collateral || null);

      if (editOnly || initialContractNumber) {
        const blRow = response.data.debtor || response.data || {};
        const directContractData = {};
        contractFields.forEach((f) => { directContractData[f] = findValueInObj(blRow, f) ?? ''; });
        const directBmData = {};
        bmFields.forEach((f) => { directBmData[f] = findValueInObj(blRow, f) ?? ''; });
        const branchResp = response.data.branch || {};
        const directBranchData = {
          street_name: blRow.street_name ?? blRow.street_of_bm ?? '',
          subdistrict: blRow.subdistrict ?? blRow.subdistrict_of_bm ?? '',
          district: blRow.district ?? blRow.district_of_bm ?? '',
          city: blRow.city ?? blRow.city_of_bm ?? '',
          province: blRow.province ?? blRow.province_of_bm ?? ''
        };

        const coll = response.data.collateral || {};
        let directCollateralData = {};
        if (isUV) {
          directCollateralData = { ...(coll || {}) };
          try { const uvKeys = Object.keys(directCollateralData).filter(k => !/^id$|contract_number$/i.test(k)); setUvCollateralFields(uvKeys); } catch (e) {}
        } else {
          collateralFields.forEach((f) => { directCollateralData[f] = findValueInObj(coll, f) ?? findValueInObj(blRow, f) ?? ''; });
        }

        const directHeader = {
          ...headerFields,
          agreement_date: blRow.agreement_date ?? headerFields.agreement_date,
          place_of_agreement: blRow.city ?? headerFields.place_of_agreement,
          name_of_director: blRow.name_of_director ?? blRow.Name_of_director ?? headerFields.name_of_director,
          phone_number_of_lolc: blRow.phone_number_of_lolc ?? blRow.phone_number_of_lolc ?? headerFields.phone_number_of_lolc,
          sp3_number: blRow.sp3_number ?? blRow.sp3No ?? headerFields.sp3_number,
          sp3_date: blRow.sp3_date ?? blRow.sp3Date ?? headerFields.sp3_date
        };

        setContractData(directContractData);
        setBmData(directBmData);
        setBranchData(directBranchData);
        setCollateralData(directCollateralData);
        const known = new Set([...contractFields, ...bmFields, ...branchFields, ...collateralFields, Object.keys(directHeader || {})]);
        const extras = {};
        Object.keys(blRow || {}).forEach(k => { if (!known.has(k) && k !== 'id') extras[k] = blRow[k]; });
        setExtraFields(extras);
        setHeaderFields(prev => ({ ...prev, ...directHeader }));
        if (!response.data.collateral) setCollateral(response.data.collateral || null);
        return;
      }

      const d = response.data.debtor || {};
      const c = response.data.collateral || {};
      const newContractData = {};
      contractFields.forEach((f) => { newContractData[f] = d[f] ?? '' });

      const newBmData = {};
      bmFields.forEach((f) => { newBmData[f] = '' });
      const bmFromResp = response.data.bm || response.data.branch_manager || response.data.bm_data || {};
      if (bmFromResp && Object.keys(bmFromResp).length > 0) {
        const respKeys = Object.keys(bmFromResp || {});
        const normalize = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '').replace(/of/g, '');
        const normMap = {};
        respKeys.forEach(k => { normMap[normalize(k)] = k; });
        bmFields.forEach((f) => {
          const candidates = [f, f.replace(/_of_/g, '_'), f.replace(/_of_/g, '_of_'), f.replace(/_birth_/g, '_of_birth_')];
          let found = null;
          for (const cnd of candidates) { if (bmFromResp[cnd] !== undefined) { found = cnd; break; } }
          if (!found) {
            const nf = normalize(f);
            if (normMap[nf]) found = normMap[nf];
            else {
              const parts = f.split('_').filter(p => p && p !== 'of');
              for (const k of respKeys) {
                const lk = k.toLowerCase();
                const matches = parts.reduce((acc, p) => acc + (p && p.length > 2 && lk.includes(p) ? 1 : 0), 0);
                if (matches >= Math.max(1, Math.floor(parts.length / 2))) { found = k; break; }
              }
            }
          }
          const value = found ? bmFromResp[found] : undefined;
          newBmData[f] = value !== undefined && value !== null ? value : '';
        });
        const debtorObj = d || {};
        const debtorKeys = Object.keys(debtorObj || {});
        const normalizeKey = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '').replace(/of/g, '');
        const debtorNormMap = {};
        debtorKeys.forEach(k => { debtorNormMap[normalizeKey(k)] = k; });
        bmFields.forEach((f) => {
          if (newBmData[f] && String(newBmData[f]).trim() !== '') return;
          const variants = [f, f.replace(/_of_/g, '_'), f.replace(/_of_/g, '_of_'), f.replace(/_birth_/g, '_of_birth_'), f.replace(/_of_bm/g, ''), f.replace(/_bm/g, '')];
          let foundKey = null;
          for (const v of variants) { if (debtorObj[v] !== undefined) { foundKey = v; break; } }
          if (!foundKey) {
            const nf = normalizeKey(f);
            if (debtorNormMap[nf]) foundKey = debtorNormMap[nf];
            else {
              const parts = f.split('_').filter(p => p && p !== 'of');
              for (const k of debtorKeys) {
                const lk = k.toLowerCase();
                const matches = parts.reduce((acc, p) => acc + (p && p.length > 2 && lk.includes(p) ? 1 : 0), 0);
                if (matches >= Math.max(1, Math.floor(parts.length / 2))) { foundKey = k; break; }
              }
            }
          }
          if (foundKey) { newBmData[f] = debtorObj[foundKey] ?? ''; }
        });
      } else {
        let mapped = false;
        const debtorKeys = Object.keys(d || {}).map(k => k.toLowerCase());
        bmFields.forEach((f) => {
          const lf = f.toLowerCase();
          if (d[f] !== undefined) { newBmData[f] = d[f] ?? ''; mapped = true; return; }
          if (f === 'place_birth_of_bm' && d['place_of_birth_of_bm'] !== undefined) { newBmData[f] = d['place_of_birth_of_bm'] ?? ''; mapped = true; return; }
          if (f === 'date_birth_of_bm' && d['date_of_birth_of_bm'] !== undefined) { newBmData[f] = d['date_of_birth_of_bm'] ?? ''; mapped = true; return; }
          const parts = lf.split('_').filter(p => p && p !== 'of' && p !== 'number' && p !== 'the');
          let foundKey = null;
          for (const k of Object.keys(d || {})) {
            const lk = k.toLowerCase();
            const mentionsBM = lk.includes('bm') || lk.includes('branch_manager') || lk.includes('branchmanager');
            const tokenMatch = parts.some(p => p.length > 2 && lk.includes(p));
            if (tokenMatch && mentionsBM) { foundKey = k; break; }
            if (!foundKey && tokenMatch) foundKey = k;
          }
          if (foundKey) { newBmData[f] = d[foundKey] ?? ''; mapped = true; }
        });
        if (!mapped && selectedBranchId) {
          const selectedBranch = (branches || []).find(b => String(b.id) === String(selectedBranchId));
          if (selectedBranch) {
            newBmData.street_of_bm = selectedBranch.street_name_of_bm ?? selectedBranch.street_of_bm ?? selectedBranch.street_name ?? newBmData.street_of_bm;
            newBmData.subdistrict_of_bm = selectedBranch.subdistrict_of_bm ?? selectedBranch.subdistrict ?? newBmData.subdistrict_of_bm;
            newBmData.district_of_bm = selectedBranch.district_of_bm ?? selectedBranch.district ?? newBmData.district_of_bm;
            newBmData.city_of_bm = selectedBranch.city_of_bm ?? selectedBranch.city ?? selectedBranch.name ?? newBmData.city_of_bm;
            newBmData.province_of_bm = selectedBranch.province_of_bm ?? selectedBranch.province ?? newBmData.province_of_bm;
            newBmData.name_of_bm = selectedBranch.name_of_bm ?? selectedBranch.name_of_bm ?? newBmData.name_of_bm;
            newBmData.place_birth_of_bm = selectedBranch.place_birth_of_bm ?? selectedBranch.place_birth_of_bm ?? newBmData.place_birth_of_bm;
            newBmData.date_birth_of_bm = selectedBranch.date_birth_of_bm ?? selectedBranch.date_of_birth_of_bm ?? newBmData.date_birth_of_bm;
            newBmData.nik_number_of_bm = selectedBranch.nik_number_of_bm ?? newBmData.nik_number_of_bm;
            newBmData.phone_number_of_bm = selectedBranch.phone_number_of_bm ?? newBmData.phone_number_of_bm;
            if ((!newBmData.place_birth_of_bm || !newBmData.date_birth_of_bm || !newBmData.name_of_bm) && selectedBranch.bm_id) { loadBMByCity(selectedBranch.bm_id); }
            mapped = true;
          }
        }
        if (!mapped) {
          let bmLookup = response.data.branch?.bm_id || d.bm_id || response.data.branch?.city_of_bm || d.city_of_debtor || d.city || response.data.branch?.name;
          if (bmLookup) loadBMByCity(bmLookup);
        }
      }

      let newCollateralData = {};
      if (isUV) {
        newCollateralData = { ...(c || {}) };
        const keys = Object.keys(newCollateralData).filter(k => !/^id$|contract_number$/i.test(k));
        setUvCollateralFields(keys);
      } else {
        newCollateralData = {};
        collateralFields.forEach((f) => { newCollateralData[f] = c[f] ?? '' });
      }

      const newHeaderFields = { ...headerFields, phone_number_of_lolc: d.phone_number_of_lolc ?? headerFields.phone_number_of_lolc, name_of_director: selectedDirector || headerFields.name_of_director };
      if (!forCreate) { setHeaderFields(prev => ({ ...prev, phone_number_of_lolc: (d && d.phone_number_of_lolc) ? d.phone_number_of_lolc : (prev.phone_number_of_lolc || ''), name_of_director: selectedDirector || prev.name_of_director })); }

      setContractData(newContractData);
      setCollateralData(newCollateralData);
      if (!forCreate) setBmData(newBmData);

      let newBranchData = {};
      if (selectedBranchId) {
        const sel = (branches || []).find(b => String(b.id) === String(selectedBranchId));
        if (sel) { newBranchData = { street_name: sel.street_name ?? sel.street_of_bm ?? '', subdistrict: sel.subdistrict ?? sel.subdistrict_of_bm ?? '', district: sel.district ?? sel.district_of_bm ?? '', city: sel.city ?? sel.city_of_bm ?? sel.name ?? '', province: sel.province ?? sel.province_of_bm ?? '' }; }
      }
      if (!Object.keys(newBranchData).length) {
        const branchResp = response.data.branch || {};
        newBranchData = { street_name: branchResp.street_of_bm ?? branchResp.street_name ?? '', subdistrict: branchResp.subdistrict_of_bm ?? branchResp.subdistrict ?? '', district: branchResp.district_of_bm ?? branchResp.district ?? '', city: branchResp.city_of_bm ?? branchResp.city ?? branchResp.name ?? '', province: branchResp.province_of_bm ?? branchResp.province ?? '' };
      }
      if (!forCreate) {
        setBranchData(newBranchData);
        if (selectedBranchId) {
          const branch = (branches || []).find(b => String(b.id) === String(selectedBranchId));
          if (branch) setHeaderFields(prev => ({ ...prev, place_of_agreement: branch.name }));
        } else if (newBmData.city_of_bm) {
          setHeaderFields(prev => ({ ...prev, place_of_agreement: newBmData.city_of_bm }));
        }
        if (selectedDirector) setHeaderFields(prev => ({ ...prev, name_of_director: selectedDirector }));
      }

      if (!response.data.debtor && !response.data.collateral) setError('Data tidak ditemukan untuk nomor kontrak ini');
    } catch (err) {
      console.error('Error:', err);
      if (err.response?.status === 404) setError('Data tidak ditemukan untuk nomor kontrak ini'); else setError(err.response?.data?.error || 'Gagal mengambil data');
      setDebtor(null); setCollateral(null);
    } finally { setLoading(false); }
  };

  const handleReset = () => {
    setContractNumber(''); setSelectedBranchId(''); setSelectedDirector(''); setDebtor(null); setCollateral(null); setError(''); setBmData({}); setBranchData({}); setContractData({}); setCollateralData({}); setHeaderFields({ agreement_date: new Date().toISOString().split('T')[0], place_of_agreement: '', agreement_day_in_word: '', agreement_date_in_word: '', name_of_director: '', date_of_delegated: new Date().toISOString().split('T')[0], sp3_number: '', sp3_date: '' });
  };

  const formatFieldName = (fieldName) => {
    return fieldName.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase()).trim();
  };

  const formatFieldValue = (value) => {
    if (value === null || value === undefined) return '-';
    if (typeof value === 'boolean') return value ? 'Ya' : 'Tidak';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  };

  const isDateFieldName = (name) => {
    if (!name) return false;
    const s = String(name).toLowerCase();
    // common date-related tokens
    if (/date|birth|born|ttl|tanggal|tgl/.test(s)) {
      // explicit exceptions that contain 'birth' or 'date' but are not date inputs
      if (s.includes('place_birth') || s.includes('place_of_birth')) return false;
      return true;
    }
    return false;
  };

  const handleContractNumberChange = (value) => {
    setContractNumber(value);
    if (value && value.trim()) {
      const q = value.toString().toLowerCase();
      const filtered = (contracts || []).filter(c => String(c).toLowerCase().includes(q));
      setFilteredContracts(filtered); setShowContractDropdown(filtered.length > 0);
    } else { setFilteredContracts(contracts || []); setShowContractDropdown(false); }
  };

  useEffect(() => {
    if (hideFilter) return undefined;
    if (initialContractNumber) return undefined;
    const shouldTrigger = (contractNumber && contractNumber.toString().trim() !== '') || (selectedBranchId && selectedBranchId !== '') || (selectedDirector && selectedDirector !== '');
    if (!shouldTrigger) return undefined;
    const timer = setTimeout(() => {
      if (contractNumber && contractNumber.toString().trim() !== '') { handleView(undefined, createOnly).catch(() => {}); return; }
      if (selectedBranchId && selectedBranchId !== '') { try { handleBranchSelectLoad(selectedBranchId); } catch (e) { console.warn('Branch preload failed', e); } return; }
    }, 600);
    return () => clearTimeout(timer);
  }, [contractNumber, selectedBranchId, selectedDirector, hideFilter, createOnly, initialContractNumber]);

  const handleSelectContract = (contract) => { setContractNumber(contract); setShowContractDropdown(false); setFilteredContracts([]); handleView(contract, createOnly).catch(() => {}); };

  const handleInputChange = (section, field, value) => {
    if (section === 'bm') {
      if (String(field).toLowerCase().includes('nik')) {
        const raw = String(value || '').replace(/\D/g, '').slice(0,16);
        setBmData(prev => ({ ...prev, [field]: raw }));
      } else if (isDateFieldName(field)) {
        const iso = parseDateFromDisplay(value); setBmData(prev => ({ ...prev, [field]: iso }));
      } else { setBmData(prev => ({ ...prev, [field]: value })); }
    }
    if (section === 'branch') setBranchData(prev => ({ ...prev, [field]: value }));
    if (section === 'contract') {
      if (String(field).toLowerCase().includes('nik')) {
        const raw = String(value || '').replace(/\D/g, '').slice(0,16);
        setContractData(prev => ({ ...prev, [field]: raw }));
        return;
      }
      if (numericFields.includes(field)) {
        const raw = (value || '').toString().replace(/\./g, '').replace(/,/g, '').trim();
        // update numeric field and recompute total_amount
        setContractData(prev => {
          const updated = { ...prev, [field]: raw };
          try {
            const getNum = (v) => { if (v === undefined || v === null || v === '') return 0; const s = String(v).replace(/\./g, '').replace(/,/g, '').trim(); const n = Number(s); return Number.isNaN(n) ? 0 : n; };
            const sum = getNum(updated.stamp_amount) + getNum(updated.financing_agreement_amount) + getNum(updated.security_agreement_amount) + getNum(updated.upgrading_land_rights_amount);
            updated.total_amount = sum;
          } catch (e) { /* ignore */ }
          return updated;
        });
      } else { if (isDateFieldName(field)) { const iso = parseDateFromDisplay(value); setContractData(prev => ({ ...prev, [field]: iso })); } else { setContractData(prev => ({ ...prev, [field]: value })); } }
    }
    if (section === 'collateral') { if (numericFields.includes(field)) { const raw = (value || '').toString().replace(/\./g, '').replace(/,/g, '').trim(); setCollateralData(prev => ({ ...prev, [field]: raw })); } else { if (isDateFieldName(field)) { const iso = parseDateFromDisplay(value); setCollateralData(prev => ({ ...prev, [field]: iso })); } else { setCollateralData(prev => ({ ...prev, [field]: value })); } } }
    if (section === 'header') { if (isDateFieldName(field)) { const iso = parseDateFromDisplay(value); setHeaderFields(prev => ({ ...prev, [field]: iso })); } else { setHeaderFields(prev => ({ ...prev, [field]: value })); } }
  };

  const formatNumberWithDots = (val) => { if (val === null || val === undefined || val === '') return ''; try { const s = String(val).replace(/\./g, '').replace(/,/g, ''); if (s === '') return ''; const n = Number(s); if (Number.isNaN(n)) return val; return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.'); } catch (e) { return val; } };

  const formatDateDisplay = (isoDate) => { if (!isoDate) return ''; try { const s = String(isoDate).trim(); if ((new RegExp('^\\d{2}[-/\\s]\\d{2}[-/\\s]\\d{4}$')).test(s)) return s.replace(/-/g, '/'); const d = s.split('T')[0]; const parts = d.split('-'); if (parts.length === 3) { return `${parts[2]}/${parts[1]}/${parts[0]}`; } return s; } catch (e) { return isoDate; } };

  const parseDateFromDisplay = (display) => { if (!display) return ''; const s = String(display).trim(); const m1 = s.match(new RegExp('^(\\d{2})[\\/\\-\\s](\\d{2})[\\/\\-\\s]?(\\d{4})$')); if (m1) { const [, dd, mm, yyyy] = m1; return `${yyyy}-${mm}-${dd}`; } if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s; const isoDate = new Date(s); if (!isNaN(isoDate.getTime())) { const y = isoDate.getFullYear(); const m = String(isoDate.getMonth() + 1).padStart(2, '0'); const d = String(isoDate.getDate()).padStart(2, '0'); return `${y}-${m}-${d}`; } return ''; };

  // compact styles when rendered inside modal to better fit header
  const compact = !!inModal;
  const labelStyle = compact ? { ...styles.label, fontSize: 12, marginBottom: 4 } : styles.label;
  const inputStyle = compact ? { ...styles.input, padding: '8px 10px', fontSize: 13, borderRadius: 4 } : styles.input;
  const sectionPadding = compact ? 8 : 12;
  const h4Style = { marginTop: 0, fontSize: compact ? 14 : 16 };

  // Contract fields and renderer (keeps JSX concise)
  const contractFieldList = ['name_of_debtor','place_birth_of_debtor','date_birth_of_debtor','street_of_debtor','subdistrict_of_debtor','district_of_debtor','city_of_debtor','province_of_debtor','nik_number_of_debtor','phone_number_of_debtor','business_partners_relationship','business_type','topup_contract','previous_topup_amount','bank_account_number','name_of_bank','name_of_account_holder','virtual_account_number','loan_amount','loan_amount_in_word','term','term_by_word','flat_rate','flat_rate_by_word','notaris_fee','notaris_fee_in_word','admin_fee','admin_fee_in_word','admin_rate','admin_rate_in_word','mortgage_amount','stamp_amount','financing_agreement_amount','security_agreement_amount','upgrading_land_rights_amount','total_amount'];
  const renderContractField = (f) => {
    const isWordField = /(_in_word|_by_word)$/.test(f);
    const baseField = f.replace(/(_in_word|_by_word)$/, '');
    let value = '';
    if (isWordField) {
      if (/date|birth/i.test(baseField)) {
        value = getIndonesianDateInWords(contractData[baseField]) || contractData[f] || '';
      } else {
        const n = Number(contractData[baseField] || 0) || 0;
        value = getIndonesianNumberWord(n) || contractData[f] || '';
      }
      return (
        <div key={f} style={{ display: 'flex', flexDirection: 'column' }}>
          <label style={labelStyle}>{formatFieldName(f)}</label>
          <input type="text" placeholder="" style={inputStyle} value={value} disabled />
        </div>
      );
    }
    const isNumericField = /amount|loan|flat_rate|mortgage|previous_topup_amount|notaris_fee|admin_fee|tlo|stamp_amount|financing_agreement_amount|security_agreement_amount|upgrading_land_rights_amount|net_amount|total_amount|life_insurance/i.test(f) || numericFields.includes(f);
    if (isNumericField) {
      return (
        <div key={f} style={{ display: 'flex', flexDirection: 'column' }}>
          <label style={labelStyle}>{formatFieldName(f)}</label>
          <input
            type="text"
            value={formatNumberWithDots(contractData[f])}
            onChange={(e) => {
              const raw = (e.target.value || '').toString().replace(/\./g, '').replace(/,/g, '').trim();
              handleInputChange('contract', f, raw);
            }}
            style={inputStyle}
          />
        </div>
      );
    }
    const inputType = isDateFieldName(f) ? 'date' : 'text';
    return (
      <div key={f} style={{ display: 'flex', flexDirection: 'column' }}>
        <label style={labelStyle}>{formatFieldName(f)}</label>
        <input type={inputType} value={contractData[f] ?? ''} onChange={(e) => handleInputChange('contract', f, e.target.value)} style={inputStyle} />
      </div>
    );
  };

  if (contractOnly) {
    const visibleContractFields = getVisibleContractFields(true);
    // Reorder so that bank fields appear immediately after `business_type` in contract-only modal
    const bankFieldsOrder = ['bank_account_number', 'name_of_bank', 'name_of_account_holder'];
    let visibleOrdered = visibleContractFields.filter(f => !bankFieldsOrder.includes(f));
    const insertIdx = visibleOrdered.indexOf('business_type');
    const banksToInsert = bankFieldsOrder.filter(f => visibleContractFields.includes(f));
    if (insertIdx >= 0) {
      visibleOrdered.splice(insertIdx + 1, 0, ...banksToInsert);
    } else if (banksToInsert.length) {
      visibleOrdered = visibleOrdered.concat(banksToInsert);
    }
    return (
      <div style={{ padding: 20, minWidth: 560 }}>
        {contractOnlyError && <div style={{ marginBottom: 12, color: '#a33' }}>{contractOnlyError}</div>}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {visibleOrdered.map(f => {
            const isWordField = /(_in_word|_by_word)$/.test(f);
            const baseField = f.replace(/(_in_word|_by_word)$/, '');
            let value = '';
            let disabled = false;
            if (isWordField) {
              disabled = true;
              if (isDateFieldName(baseField)) { value = getIndonesianDateInWords(contractData[baseField]) || contractData[f] || ''; } else { const num = Number(contractData[baseField] || 0) || 0; value = getIndonesianNumberWord(num) || contractData[f] || ''; }
            } else { if (isDateFieldName(f)) { value = formatDateDisplay(contractData[f]); } else if (numericFields.includes(f)) { value = formatNumberWithDots(contractData[f]); } else { value = contractData[f] ?? ''; } }
            if (f === 'business_partners_relationship') {
              return (
                <div key={f} style={{ display: 'flex', flexDirection: 'column' }}>
                  <label style={styles.label}>{formatFieldName(f)}</label>
                  <select
                    value={contractData[f] ?? ''}
                    onChange={(e) => handleInputChange('contract', f, e.target.value)}
                    style={styles.input}
                  >
                    <option value="">-- Select relationship --</option>
                    <option value="Suami">Suami</option>
                    <option value="Istri">Istri</option>
                    <option value="Anak Kandung">Anak Kandung</option>
                    <option value="Saudara Kandung">Saudara Kandung</option>
                    <option value="Orangtua">Orangtua</option>
                  </select>
                </div>
              );
            }
            return (
              <div key={f} style={{ display: 'flex', flexDirection: 'column' }}>
                <label style={styles.label}>{formatFieldName(f)}</label>
                {(!isWordField && isDateFieldName(f)) ? (
                  <input type="date" style={styles.input} value={disabled ? value : (contractData[f] || '')} disabled={disabled} onChange={(e) => { if (!disabled) handleInputChange('contract', f, e.target.value); }} />
                ) : (
                  (numericFields.includes(f) && !isWordField) ? (
                    <input
                      type="text"
                      style={styles.input}
                      value={disabled ? value : formatNumberWithDots(contractData[f])}
                      disabled={disabled}
                      onChange={(e) => { if (!disabled) handleInputChange('contract', f, e.target.value); }}
                    />
                  ) : (
                    <input type="text" placeholder={isDateFieldName(f) ? 'DD/MM/YYYY' : ''} style={styles.input} value={disabled ? value : value} disabled={disabled} onChange={(e) => { if (!disabled) handleInputChange('contract', f, e.target.value); }} />
                  )
                )}
              </div>
            );
          })}
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
          <button className="btn-save" onClick={handleContractOnlySave} disabled={contractOnlySaving}>{contractOnlySaving ? 'Saving...' : 'Save Contract'}</button>
        </div>
      </div>
    );
  }

  return (
    <div style={inModal ? { padding: 12, backgroundColor: 'transparent' } : styles.container}>
      {/* main form UI (trimmed here since BLAgreement page uses modal wrappers) */}
      {/* Filter moved to top per UX request - rendered below when not hidden */}
      {/* Added full form sections requested: Filter, Contract, Collateral, Branch Manager, Branches */}
      <div style={{ marginTop: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16 }}>
          {/* Filter (moved to the top per UX request) */}
          <div style={{ border: '1px solid #e6e6e6', padding: sectionPadding, borderRadius: 6 }}>
            <h4 style={h4Style}>Filter</h4>
            <div style={{ display: 'flex', gap: 8 }}>
              <input placeholder="Contract Number" value={contractNumber} onChange={(e) => handleContractNumberChange(e.target.value)} style={inputStyle} />
              <select value={selectedBranchId || ''} onChange={(e) => { setSelectedBranchId(e.target.value); handleBranchSelectLoad(e.target.value); }} style={inputStyle}>
                <option value="">-- Select Branch --</option>
                {(branches || []).map(b => <option key={b.id} value={b.id}>{b.name || b.branch_name || b.city || b.id}</option>)}
              </select>
                <select value={selectedDirector || ''} onChange={(e) => {
                  const v = e.target.value;
                  setSelectedDirector(v);
                    const found = (directors || []).find(d => String(d.id) === String(v) || d.name === v || d.name_of_director === v || (typeof d === 'string' && d === v));
                    if (found) {
                          if (typeof found === 'string') {
                            setHeaderFields(prev => ({ ...prev, name_of_director: found || prev.name_of_director || '' }));
                          } else {
                            setHeaderFields(prev => ({
                              ...prev,
                              name_of_director: found.name_of_director || found.name || prev.name_of_director || '',
                              phone_number_of_lolc: found.phone_number_of_lolc || found.phone_number_of_director || prev.phone_number_of_lolc || ''
                            }));
                          }
                        }
                  }} style={inputStyle}>
                  <option value="">-- Select Director --</option>
                  {(directors || []).map((d, i) => {
                    if (!d) return null;
                    if (typeof d === 'string') return <option key={`dir_${i}`} value={d}>{d}</option>;
                    const key = d.id ?? d.name_of_director ?? d.name ?? `dir_${i}`;
                    const value = d.id ?? d.name_of_director ?? d.name ?? '';
                    const label = d.name_of_director || d.name || d.id || value;
                    return <option key={key} value={value}>{label}</option>;
                  })}
                </select>
            </div>
          </div>

          {/* Agreement Detail container (compact when in modal) */}
          <div style={inModal ? { marginTop: 12 } : { marginTop: 12, border: '1px solid #e6e6e6', padding: sectionPadding, borderRadius: 6 }}>
            <h4 style={h4Style}>Agreement Detail</h4>
              <div style={{ display: 'grid', gridTemplateColumns: inModal ? '1fr 1fr' : '1fr 1fr 1fr', gap: 8 }}>
                {(() => {
                  const modalOrder = ['date_of_delegated','agreement_date','sp3_date','sp3_number','name_of_director','phone_number_of_lolc'];
                  const normalOrder = ['agreement_date','agreement_day_in_word','agreement_date_in_word','sp3_date','sp3_number','date_of_delegated','name_of_director','phone_number_of_lolc'];
                  const order = inModal ? modalOrder : normalOrder;
                  return order.map(f => (
                    <div key={f} style={{ display: 'flex', flexDirection: 'column' }}>
                      <label style={labelStyle}>{formatFieldName(f)}</label>
                      <input type={/(^(agreement_date|date_of_delegated)$|_date$|^sp3_date$)/i.test(f) ? 'date' : 'text'} value={headerFields[f] ?? ''} onChange={(e) => handleInputChange('header', f, e.target.value)} style={inputStyle} />
                    </div>
                  ));
                })()}
              </div>
          </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
            {/* Contract container */}
            <div style={inModal ? {} : { border: '1px solid #e6e6e6', padding: sectionPadding, borderRadius: 6 }}>
              <h4 style={h4Style}>Contract</h4>
              <div style={{ display: 'grid', gridTemplateColumns: inModal ? '1fr 1fr' : '1fr 1fr 1fr', gap: 8 }}>
                {contractFieldList.map(renderContractField)}
              </div>
            </div>

            {/* Collateral container */}
              <div style={inModal ? {} : { border: '1px solid #e6e6e6', padding: sectionPadding, borderRadius: 6 }}>
              <h4 style={h4Style}>Collateral</h4>
              <div style={{ display: 'grid', gridTemplateColumns: inModal ? '1fr 1fr' : '1fr 1fr 1fr', gap: 8 }}>
                {['collateral_type','number_of_certificate','number_of_ajb','surface_area','name_of_collateral_owner','capacity_of_building','location_of_land'].map(f => (
                  <div key={f} style={{ display: 'flex', flexDirection: 'column' }}>
                    <label style={labelStyle}>{formatFieldName(f)}</label>
                    <input type={numericFields.includes(f) ? 'number' : 'text'} value={collateralData[f] ?? ''} onChange={(e) => handleInputChange('collateral', f, e.target.value)} style={inputStyle} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16, marginTop: 12 }}>
          {/* Branch Manager */}
          <div style={inModal ? {} : { border: '1px solid #e6e6e6', padding: sectionPadding, borderRadius: 6 }}>
            <h4 style={h4Style}>Branch Manager</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {['name_of_bm','place_birth_of_bm','date_birth_of_bm','date_birth_of_bm_in_word','nik_number_of_bm','street_of_bm','subdistrict_of_bm','district_of_bm','city_of_bm','province_of_bm','phone_number_of_bm'].map(f => (
                  <div key={f} style={{ display: 'flex', flexDirection: 'column' }}>
                    <label style={labelStyle}>{formatFieldName(f)}</label>
                    {f === 'date_birth_of_bm_in_word' ? (
                      <input type="text" value={bmData[f] ?? ''} disabled style={{ ...inputStyle, backgroundColor: '#f5f5f5' }} />
                    ) : (
                      <input type={/date/i.test(f) ? 'date' : 'text'} value={bmData[f] ?? ''} onChange={(e) => handleInputChange('bm', f, e.target.value)} style={inputStyle} />
                    )}
                  </div>
                ))}
            </div>
          </div>

          {/* Branches */}
          <div style={inModal ? {} : { border: '1px solid #e6e6e6', padding: sectionPadding, borderRadius: 6 }}>
            <h4 style={h4Style}>Branches</h4>
            <div style={{ display: 'grid', gridTemplateColumns: inModal ? '1fr 1fr' : '1fr', gap: 8 }}>
              {['street_name','subdistrict','district','city','province'].map(f => (
                <div key={f} style={{ display: 'flex', flexDirection: 'column' }}>
                  <label style={labelStyle}>{formatFieldName(f)}</label>
                  <input type="text" value={branchData[f] ?? ''} onChange={(e) => handleInputChange('branch', f, e.target.value)} style={inputStyle} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom row: user display and primary action (Save / Download) */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ fontSize: 14, color: '#333', fontWeight: 600 }}>User:</div>
          <div style={{ padding: '8px 12px', backgroundColor: '#fff', border: '1px solid #ddd', borderRadius: 6 }}>{usernameDisplay || '-'}</div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
          <button style={{ ...styles.btnPrimary, minWidth: 120 }} onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : (createOnly ? 'Save & Download' : ((editOnly || initialContractNumber) ? 'Update' : 'Save'))}</button>
        </div>
      </div>
    </div>
  );
}

// Sediakan pembungkus lokal sehingga Create/Edit dapat diimpor dari file ini
export function BLAgreementCreate(props = {}) {
  return <BLAgreementForm {...props} createOnly={true} editOnly={false} hideFilter={false} hideHeader={false} isUV={false} />;
}

export function BLAgreementEdit({ initialContractNumber = '', onSaved, ...rest } = {}) {
  return <BLAgreementForm initialContractNumber={initialContractNumber} onSaved={onSaved} createOnly={false} editOnly={true} hideFilter={true} hideHeader={true} isUV={false} inModal={true} {...rest} />;
}

export default function BLAgreement() {
  const [agreements, setAgreements] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create' or 'edit'
  const [contractNumber, setContractNumber] = useState('');
  const [formDebtorName, setFormDebtorName] = useState('');
  const [formNik, setFormNik] = useState('');
  const [formCollateralType, setFormCollateralType] = useState('');
  const [savingModal, setSavingModal] = useState(false);
  const [contractOnlyMode, setContractOnlyMode] = useState(false);
  const [collateralMode, setCollateralMode] = useState(false);
  const [lastSavedContract, setLastSavedContract] = useState(null);
  const [collateralForm, setCollateralForm] = useState({
    contract_number: '',
    name_of_debtor: '',
    collateral_type: '',
    number_of_certificate: '',
    number_of_ajb: '',
    surface_area: '',
    name_of_collateral_owner: '',
    capacity_of_building: '',
    location_of_land: ''
  });
  const [collateralSaving, setCollateralSaving] = useState(false);
  const [collateralError, setCollateralError] = useState('');

  // Additional fields for Create Document modal
  const [agreementData, setAgreementData] = useState({ agreement_date: '', agreement_type: '' });
  const [branchManager, setBranchManager] = useState('');
  const [branchData, setBranchData] = useState({ branch_name: '', branch_code: '' });
  const [contractData, setContractData] = useState({ contract_date: '', contract_amount: '' });

  const requestWithAuth = async (config) => {
    const doRequest = async (token) => {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      return axios({ ...config, headers });
    };

    try {
      const access = localStorage.getItem('access_token');
      return await doRequest(access);
    } catch (err) {
      const respData = err?.response?.data || {};
      const isTokenExpired = respData.code === 'token_not_valid' || (respData.messages && Array.isArray(respData.messages) && respData.messages.some(m => m.message && m.message.toLowerCase().includes('expired')));
      if (err.response?.status === 401 || isTokenExpired) {
        try {
          const refresh = localStorage.getItem('refresh_token');
          if (!refresh) throw err;
          const r = await axios.post('http://localhost:8000/api/token/refresh/', { refresh });
          const newAccess = r.data.access;
          if (newAccess) {
            localStorage.setItem('access_token', newAccess);
            return await doRequest(newAccess);
          }
        } catch (refreshErr) {
          console.error('Token refresh failed', refreshErr);
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          throw err;
        }
      }
      throw err;
    }
  };

  // Gaya field form lokal agar sesuai dengan form lain
  const fieldLabelStyle = { fontSize: 13, fontWeight: 600, color: '#333', marginBottom: 6 };
  const fieldInputStyle = { padding: '10px 12px', fontSize: 14, border: '1px solid #ddd', borderRadius: 6, outline: 'none', width: '100%', boxSizing: 'border-box' };
  const fieldGroupStyle = { display: 'flex', flexDirection: 'column' };

  useEffect(() => { loadAgreements(); }, []);

  const loadAgreements = async () => {
    setLoading(true);
    setError('');
    try {
      // load rows from bl_sp3 table via backend
      const res = await requestWithAuth({ method: 'get', url: 'http://localhost:8000/api/bl-sp3/' });
      let items = res.data?.sp3s || res.data?.results || res.data || [];
      if (!Array.isArray(items)) items = items ? [items] : [];
      const rows = items.map(item => ({
        agreement_date: item.sp3_date || item.agreement_date || item.created_at || item.created || item.date_created || '',
        contract_number: item.contract_number || '',
        name_of_debtor: item.name_of_debtor || item.contract_data?.name_of_debtor || '',
        nik_number_of_debtor: item.nik_number_of_debtor || item.contract_data?.nik_number_of_debtor || '',
        collateral_type: item.collateral_type || item.collateral_data?.collateral_type || item.collateral_data?.collateral_type || '',
        created_by: item.created_by || ''
      }));
      setAgreements(rows);
    } catch (err) {
      console.error('Error loading bl_sp3 rows', err);
      setError('Failed to load BL SP3 rows');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async (row) => {
    const cn = row.contract_number;
    setError('');
    if (!cn) {
      setModalMode('create'); setContractNumber(''); setFormDebtorName(''); setFormNik(''); setFormCollateralType(''); setShowCreateModal(true); return;
    }

    // Untuk Edit: JANGAN gabungkan nilai lokal — biarkan BLAgreement2 memuat semua data langsung
    setContractNumber(cn);
    setModalMode('edit');
    setShowCreateModal(true);
  };

  const fetchContractData = async (cn) => {
    try {
      const res = await requestWithAuth({ method: 'get', url: `http://localhost:8000/api/bl-agreement/?contract_number=${encodeURIComponent(cn)}` });
      // backend mengembalikan { debtor: ..., collateral: ... }
      return res.data || {};
    } catch (err) {
      console.error('Failed fetch contract', err);
      return {};
    }
  };

  const handleDownloadRow = async (row) => {
    if (!row.contract_number) { setError('Contract number not available'); return; }
    try {
      // Minta PDF jika tersedia
      const url = `http://localhost:8000/api/bl-agreement/download-docx/?contract_number=${encodeURIComponent(row.contract_number)}&template=${encodeURIComponent('bl_sp3_template.docx')}`;
      const res = await requestWithAuth({ method: 'get', url, responseType: 'blob' });
      const contentType = (res.headers && res.headers['content-type']) || '';
      const blob = new Blob([res.data], { type: contentType || 'application/octet-stream' });
      // If server returned JSON (error), parse and show message instead of downloading
      if (contentType.includes('application/json')) {
        const text = await blob.text();
        try {
          const js = JSON.parse(text);
          const msg = js.error || js.detail || JSON.stringify(js);
          setError(`Download failed: ${msg}`);
          return;
        } catch (e) {
          setError('Download failed: unable to parse server response');
          return;
        }
      }
      const isPdf = contentType.includes('pdf');
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = `BL_SP3_${row.contract_number}${isPdf ? '.pdf' : '.docx'}`;
      document.body.appendChild(link);
      link.click(); link.remove();
    } catch (err) {
      console.error('Download failed', err); setError('Failed to download the document');
    }
  };

  const handleDownloadPdf = async (row) => {
    if (!row.contract_number) { setError('Contract number not available'); return; }
    try {
      const url = `http://localhost:8000/api/bl-agreement/download-docx/?contract_number=${encodeURIComponent(row.contract_number)}&template=${encodeURIComponent('bl_sp3_template.docx')}&download=pdf`;
      const res = await requestWithAuth({ method: 'get', url, responseType: 'blob' });
      const contentType = (res.headers && res.headers['content-type']) || '';
      const blob = new Blob([res.data], { type: contentType || 'application/pdf' });
      if (contentType.includes('application/json')) {
        const text = await blob.text();
        try { const js = JSON.parse(text); setError(js.error || js.detail || 'PDF conversion failed'); return; } catch (e) { setError('PDF conversion failed'); return; }
      }
      const link = document.createElement('a'); link.href = window.URL.createObjectURL(blob); link.download = `BL_SP3_${row.contract_number}.pdf`; document.body.appendChild(link); link.click(); link.remove();
    } catch (err) {
      console.error('PDF download failed', err);
      try {
        const resp = err?.response;
        if (resp) {
          const status = resp.status;
          const contentType = (resp.headers && resp.headers['content-type']) || '';
          if (contentType.includes('application/json')) {
            const data = resp.data;
            if (data && typeof data.text === 'function') {
              const txt = await data.text();
              try { const js = JSON.parse(txt); setError(`PDF conversion failed (${status}): ${js.error || js.detail || JSON.stringify(js)}`); return; } catch (e) { setError(`PDF conversion failed (${status})`); return; }
            }
            setError(`PDF conversion failed (${status})`);
            return;
          }
          setError(`PDF download failed (${status})`);
          return;
        }
      } catch (e) { console.error('Error while formatting PDF download error', e); }
      setError('Failed to download PDF');
    }
  };

  const handleSaveModal = async () => {
    setSavingModal(true);
    try {
      const payload = {
        contract_number: contractNumber,
        debtor: { name_of_debtor: formDebtorName, nik_number_of_debtor: formNik },
        collateral_data: { collateral_type: formCollateralType },
        created_by: getCurrentUsername()
      };
      ['id', 'pk'].forEach(k => { if (payload.hasOwnProperty(k)) delete payload[k]; });
      await axios.post('http://localhost:8000/api/bl-sp3/create-public/', payload, { headers: { 'Content-Type': 'application/json' } });
      setShowCreateModal(false);
      await loadAgreements();
    } catch (err) {
      console.error('Save failed', err);
      setError('Failed to save');
    } finally {
      setSavingModal(false);
    }
  };

  const handleSaveAndDownload = async () => {
    setSavingModal(true);
    try {
      const payload = {
        contract_number: contractNumber,
        debtor: { name_of_debtor: formDebtorName, nik_number_of_debtor: formNik },
        collateral_data: { collateral_type: formCollateralType },
        created_by: getCurrentUsername()
      };
      ['id', 'pk'].forEach(k => { if (payload.hasOwnProperty(k)) delete payload[k]; });
      await axios.post('http://localhost:8000/api/bl-sp3/create-public/', payload, { headers: { 'Content-Type': 'application/json' } });
      // refresh daftar lalu unduh
      await loadAgreements();
      // Request PDF when available
      const url = `http://localhost:8000/api/bl-agreement/download-docx/?contract_number=${encodeURIComponent(contractNumber)}&template=${encodeURIComponent('bl_sp3_template.docx')}`;
      const res = await requestWithAuth({ method: 'get', url, responseType: 'blob' });
      const contentType = (res.headers && res.headers['content-type']) || '';
      const blob = new Blob([res.data], { type: contentType || 'application/octet-stream' });
      if (contentType.includes('application/json')) {
        const text = await blob.text();
        try {
          const js = JSON.parse(text);
          const msg = js.error || js.detail || JSON.stringify(js);
          setError(`Download failed: ${msg}`);
          setShowCreateModal(false);
          setSavingModal(false);
          return;
        } catch (e) {
          setError('Download failed: unable to parse server response');
          setShowCreateModal(false);
          setSavingModal(false);
          return;
        }
      }
      const isPdf = contentType.includes('pdf');
      const link = document.createElement('a'); link.href = window.URL.createObjectURL(blob); link.download = `BL_SP3_${contractNumber}${isPdf ? '.pdf' : '.docx'}`; document.body.appendChild(link); link.click(); link.remove();
      setShowCreateModal(false);
    } catch (err) {
      console.error('Save & Download failed', err);
      setError('Failed to save and download');
    } finally {
      setSavingModal(false);
    }
  };

  const handleModalDownload = async () => {
    if (!contractNumber) { setError('Contract number is empty'); return; }
    try {
      // Request PDF when available
      const url = `http://localhost:8000/api/bl-agreement/download-docx/?contract_number=${encodeURIComponent(contractNumber)}&template=${encodeURIComponent('bl_sp3_template.docx')}`;
      const res = await requestWithAuth({ method: 'get', url, responseType: 'blob' });
      const contentType = (res.headers && res.headers['content-type']) || '';
      const blob = new Blob([res.data], { type: contentType || 'application/octet-stream' });
      if (contentType.includes('application/json')) {
        const text = await blob.text();
        try {
          const js = JSON.parse(text);
          const msg = js.error || js.detail || JSON.stringify(js);
          setError(`Download failed: ${msg}`);
          return;
        } catch (e) {
          setError('Download failed: unable to parse server response');
          return;
        }
      }
      const isPdf = contentType.includes('pdf');
      const link = document.createElement('a'); link.href = window.URL.createObjectURL(blob); link.download = `BL_SP3_${contractNumber}${isPdf ? '.pdf' : '.docx'}`; document.body.appendChild(link); link.click(); link.remove();
    } catch (err) { console.error('Download failed', err); setError('Failed to download the document'); }
  };

  const formatDateShort = (iso) => {
    if (!iso) return '';
    try { const d = new Date(iso); if (isNaN(d.getTime())) return iso; const dd = String(d.getDate()).padStart(2, '0'); const mm = String(d.getMonth() + 1).padStart(2, '0'); const yyyy = d.getFullYear(); return `${dd}-${mm}-${yyyy}`; } catch (e) { return iso; }
  };

  return (
    <div>
      <div>
        <h2>BL SP3</h2>
        <p>Before creating the document, make sure to fill in the contract and collateral data first.</p>
      </div>

      <div className="user-management-actions" style={{ justifyContent: 'flex-end', marginTop: 16 }}>
        <button
          className="btn-primary"
          onClick={() => { setModalMode('create'); setContractNumber(''); setFormDebtorName(''); setFormNik(''); setFormCollateralType(''); setError(''); setContractOnlyMode(true); setShowCreateModal(true); }}
          title="Add a new contract"
        >
          Add Contract
        </button>

        <button
          className="btn-primary"
          onClick={() => { setModalMode('create'); setContractNumber(''); setFormDebtorName(''); setFormNik(''); setFormCollateralType(''); setError(''); setCollateralMode(true); setShowCreateModal(true); }}
          title="Add a new BL collateral"
        >
          Add Collateral
        </button>

        <button className="btn-save" onClick={() => { setModalMode('create'); setContractNumber(''); setFormDebtorName(''); setFormNik(''); setFormCollateralType(''); setError(''); setContractOnlyMode(false); setCollateralMode(false); setShowCreateModal(true); }}>Create Document</button>
      </div>

      <div className="user-table-section" style={{ marginTop: 12 }}>
        <div style={{ padding: 12 }}>
          

          {loading ? (
            <div>Loading...</div>
          ) : error ? (
            <div className="error-message">{error}</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="user-table">
                <thead>
                  <tr>
                    <th>Agreement Date</th>
                    <th>Contract Number</th>
                    <th>Name of Debtor</th>
                    <th>NIK Debtor</th>
                    <th>Collateral Type</th>
                    <th>Created By</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {agreements.length === 0 ? (
                    <tr><td className="no-data" colSpan={7}>No agreements found.</td></tr>
                  ) : (
                    agreements.map((row) => (
                      <tr key={row.contract_number}>
                        <td>{formatDateShort(row.agreement_date)}</td>
                        <td>{row.contract_number}</td>
                        <td>{row.name_of_debtor}</td>
                        <td>{row.nik_number_of_debtor}</td>
                        <td>{row.collateral_type}</td>
                        <td>{row.created_by}</td>
                        <td>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button
                              onClick={() => handleEdit(row)}
                              title="Edit"
                              aria-label={`Edit ${row.contract_number || ''}`}
                              style={{
                                border: '1px solid #0a1e3d',
                                background: 'transparent',
                                borderRadius: 6,
                                padding: 8,
                                width: 36,
                                height: 36,
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer'
                              }}
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z" fill="#0a1e3d"/>
                                <path d="M20.71 7.04a1.003 1.003 0 0 0 0-1.42l-2.34-2.34a1.003 1.003 0 0 0-1.42 0l-1.83 1.83 3.75 3.75 1.84-1.82z" fill="#0a1e3d"/>
                              </svg>
                            </button>

                            <button
                              onClick={() => handleDownloadRow(row)}
                              title="Download DOCX"
                              aria-label={`Download ${row.contract_number || ''}`}
                              style={{
                                border: '1px solid #0a1e3d',
                                background: 'transparent',
                                borderRadius: 6,
                                padding: 6,
                                width: 36,
                                height: 36,
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer'
                              }}
                            >
                              <img src={docxIcon} alt="DOCX" style={{ width: 20, height: 20 }} />
                            </button>
                            <button
                              onClick={() => handleDownloadPdf(row)}
                              title="Download PDF"
                              aria-label={`Download PDF ${row.contract_number || ''}`}
                              style={{
                                border: '1px solid #0a1e3d',
                                background: 'transparent',
                                borderRadius: 6,
                                padding: 6,
                                width: 36,
                                height: 36,
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer'
                              }}
                            >
                              <img src={pdfIcon} alt="PDF" style={{ width: 20, height: 20 }} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showCreateModal && (
        <div className="modal-overlay" style={{ zIndex: 99999, position: 'fixed' }} onClick={() => { setShowCreateModal(false); setContractOnlyMode(false); setCollateralMode(false); }}>
          <div className="modal-content" style={{ zIndex: 100000, position: 'relative' }} onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
              <h3 className="modal-title">
                {modalMode === 'edit' && contractNumber ? `Edit ${contractNumber}` : (
                  contractOnlyMode ? 'Add Contract' : (collateralMode ? 'Add Collateral' : 'Create Document')
                )}
              </h3>
              <button className="modal-close-btn" onClick={() => { setShowCreateModal(false); setContractOnlyMode(false); setCollateralMode(false); }}>&times;</button>
            </div>

            <div className="modal-form">
              {modalMode === 'edit' ? (
                <BLAgreementEdit
                  initialContractNumber={contractNumber}
                  onSaved={(cn) => { setShowCreateModal(false); setContractOnlyMode(false); loadAgreements(); if (cn) setContractNumber(cn); }}
                />
              ) : collateralMode ? (
                <div style={{ padding: 20, minWidth: 560 }}>
                  {collateralError && <div style={{ marginBottom: 12, color: '#a33' }}>{collateralError}</div>}

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div style={fieldGroupStyle}>
                      <label style={fieldLabelStyle}>Contract Number</label>
                      <input
                        type="text"
                        value={collateralForm.contract_number}
                        onChange={async (e) => {
                          const v = e.target.value;
                          setCollateralForm(prev => ({ ...prev, contract_number: v }));
                          if (v && v.trim()) {
                            try {
                              const data = await fetchContractData(v.trim());
                              const debtor = data.debtor || data || {};
                              const name = debtor.name_of_debtor || debtor.name || '';
                              setCollateralForm(prev => ({ ...prev, name_of_debtor: name }));
                            } catch (err) {
                              setCollateralForm(prev => ({ ...prev, name_of_debtor: '' }));
                            }
                          } else {
                            setCollateralForm(prev => ({ ...prev, name_of_debtor: '' }));
                          }
                        }}
                        style={fieldInputStyle}
                      />
                    </div>

                    <div style={fieldGroupStyle}>
                      <label style={fieldLabelStyle}>Name of Debtor</label>
                      <input type="text" value={collateralForm.name_of_debtor} disabled style={{ ...fieldInputStyle, backgroundColor: '#f5f5f5' }} />
                    </div>

                    <div style={fieldGroupStyle}>
                      <label style={fieldLabelStyle}>Collateral Type</label>
                      <input type="text" value={collateralForm.collateral_type} onChange={(e) => setCollateralForm(prev => ({ ...prev, collateral_type: e.target.value }))} style={fieldInputStyle} />
                    </div>

                    <div style={fieldGroupStyle}>
                      <label style={fieldLabelStyle}>Number of Certificate</label>
                      <input type="text" value={collateralForm.number_of_certificate} onChange={(e) => setCollateralForm(prev => ({ ...prev, number_of_certificate: e.target.value }))} style={fieldInputStyle} />
                    </div>

                    <div style={fieldGroupStyle}>
                      <label style={fieldLabelStyle}>Number of AJB</label>
                      <input type="text" value={collateralForm.number_of_ajb} onChange={(e) => setCollateralForm(prev => ({ ...prev, number_of_ajb: e.target.value }))} style={fieldInputStyle} />
                    </div>

                    <div style={fieldGroupStyle}>
                      <label style={fieldLabelStyle}>Surface Area</label>
                      <input type="text" value={collateralForm.surface_area} onChange={(e) => setCollateralForm(prev => ({ ...prev, surface_area: e.target.value }))} style={fieldInputStyle} />
                    </div>

                    <div style={fieldGroupStyle}>
                      <label style={fieldLabelStyle}>Name of Collateral Owner</label>
                      <input type="text" value={collateralForm.name_of_collateral_owner} onChange={(e) => setCollateralForm(prev => ({ ...prev, name_of_collateral_owner: e.target.value }))} style={fieldInputStyle} />
                    </div>

                    <div style={fieldGroupStyle}>
                      <label style={fieldLabelStyle}>Capacity of Building</label>
                      <input type="text" value={collateralForm.capacity_of_building} onChange={(e) => setCollateralForm(prev => ({ ...prev, capacity_of_building: e.target.value }))} style={fieldInputStyle} />
                    </div>

                    <div style={fieldGroupStyle}>
                      <label style={fieldLabelStyle}>Location of Land</label>
                      <input type="text" value={collateralForm.location_of_land} onChange={(e) => setCollateralForm(prev => ({ ...prev, location_of_land: e.target.value }))} style={fieldInputStyle} />
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
                    <button className="btn-save" onClick={async () => {
                      setCollateralSaving(true); setCollateralError('');
                      try {
                        const payload = {
                          contract_number: collateralForm.contract_number,
                          collateral_type: collateralForm.collateral_type,
                          number_of_certificate: collateralForm.number_of_certificate,
                          number_of_ajb: collateralForm.number_of_ajb,
                          surface_area: collateralForm.surface_area,
                          name_of_collateral_owner: collateralForm.name_of_collateral_owner,
                          capacity_of_building: collateralForm.capacity_of_building,
                          location_of_land: collateralForm.location_of_land
                        };
                        await requestWithAuth({ method: 'post', url: 'http://localhost:8000/api/bl-collateral/', data: payload });
                        setShowCreateModal(false);
                        setCollateralMode(false);
                        loadAgreements();
                        setSuccessMessage('Collateral data saved successfully');
                        setTimeout(() => setSuccessMessage(''), 4000);
                      } catch (err) {
                        console.error('Save collateral failed', err);
                        const msg = err?.response?.data?.error || 'Failed to save collateral';
                        setCollateralError(msg);
                      } finally {
                        setCollateralSaving(false);
                      }
                    }} disabled={collateralSaving}>{collateralSaving ? 'Saving...' : 'Save Collateral'}</button>
                  </div>
                </div>
              ) : (
                <BLAgreementCreate
                  initialContractData={lastSavedContract}
                  contractOnly={contractOnlyMode}
                  inModal={true}
                  onContractSaved={(saved) => {
                    // Jika pengguna membatalkan entri kontrak, tutup modal
                    if (!saved) {
                      setShowCreateModal(false);
                      setContractOnlyMode(false);
                      return;
                    }
                    // Setelah menyimpan kontrak: tutup modal, refresh daftar, tampilkan notifikasi sukses
                    setLastSavedContract(saved || null);
                    setShowCreateModal(false);
                    setContractOnlyMode(false);
                    loadAgreements();
                    setSuccessMessage('Contract data saved successfully');
                    // hapus otomatis pesan sukses setelah 4 detik
                    setTimeout(() => setSuccessMessage(''), 4000);
                  }}
                  onSaved={(cn) => { setShowCreateModal(false); setContractOnlyMode(false); loadAgreements(); if (cn) setContractNumber(cn); }}
                />
              )}
            </div>
            {/* modal footer intentionally left without a bottom Cancel/Close button per UI preference */}
          </div>
        </div>
      )}

      
    </div>
  );
}
