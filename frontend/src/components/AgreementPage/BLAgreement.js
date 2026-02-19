/* eslint-disable unicode-bom, no-unused-vars, react-hooks/exhaustive-deps */
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import '../UserManagement/UserManagement.css';
import docxIcon from '../../assets/icons/docx-icon.svg';
import pdfIcon from '../../assets/icons/pdf-icon.svg';
import { getIndonesianNumberWord, getIndonesianDateInWords, parseDateFromDisplay, getIndonesianDayName, getIndonesianDateDisplay, formatNumberWithDots, formatDateDisplay, isDateFieldName, formatFieldName } from '../../utils/formatting';

// Helper: Extract branch_id from JWT token
export const getUserBranchIdFromToken = (token) => {
  try {
    if (!token) return null;
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const payload = JSON.parse(window.atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    return payload.branch_id || payload.branch || null;
  } catch (e) {
    return null;
  }
};

export const getMonthInRomanNumeral = (monthNumber) => {
  const romanNumerals = ['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII'];
  return romanNumerals[monthNumber - 1] || '';
};

// Recursively remove any primary-key keys from payloads to avoid duplicate-PK insertions
export const stripIdKeys = (obj) => {
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
export const styles = {
  container: { padding: '20px', backgroundColor: '#f5f5f5', minHeight: '100vh' },
  label: { fontSize: '13px', fontWeight: '600', color: '#333', letterSpacing: '0.5px' },
  input: { padding: '10px 12px', fontSize: '14px', border: '1px solid #ddd', borderRadius: '6px', outline: 'none', backgroundColor: '#f9f9f9', fontFamily: 'inherit' },
  btnPrimary: { padding: '10px 20px', fontSize: '14px', fontWeight: '600', background: 'linear-gradient(135deg, #0a1e3d 0%, #051626 100%)', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' },
  btnSecondary: { padding: '10px 20px', fontSize: '14px', fontWeight: '600', backgroundColor: 'white', color: '#0a1e3d', border: '2px solid #0a1e3d', borderRadius: '6px', cursor: 'pointer' }
};

function BLAgreementForm({ initialContractNumber = '', initialContractData = null, onSaved, onContractSaved, contractOnly = false, editOnly = false, createOnly = false, hideFilter = false, hideHeader = false, isUV = false, inModal = false, submitTrigger, downloadOnSubmit = false, initialSelectedBranchId = '' } = {}) {
  // State UI lokal
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
  // Pembantu: unduh Agreement dan SP3 (DOCX atau PDF bila diminta)
  const triggerDocxDownload = async (contractNum, accessToken, asPdf = false) => {
    if (!contractNum || String(contractNum).trim() === '') return;
    try {
      const token = accessToken || localStorage.getItem('access_token');
      const base = isUV ? 'uv-agreement' : 'bl-agreement';
      const downloadType = asPdf ? '&download=pdf' : '';

      // Agreement
      const url1 = `http://localhost:8000/api/${base}/download-docx/?contract_number=${encodeURIComponent(contractNum)}${downloadType}&type=agreement`;
      const resp1 = await axios.get(url1, { responseType: 'blob', headers: token ? { Authorization: `Bearer ${token}` } : {} });
      const contentType1 = (resp1.headers && resp1.headers['content-type']) || '';
      const isPdf1 = contentType1.includes('pdf');
      const blob1 = new Blob([resp1.data], { type: contentType1 || (isPdf1 ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') });
      if (contentType1.includes('application/json')) {
        const text = await blob1.text();
        try { const js = JSON.parse(text); console.error('Download failed', js); return; } catch (e) { console.error('Download failed (unparseable json)', e); return; }
      }
      const link1 = document.createElement('a');
      link1.href = window.URL.createObjectURL(blob1);
      link1.download = `${isUV ? 'uv_agreement' : 'BL_Agreement'}_${contractNum}${isPdf1 ? '.pdf' : '.docx'}`;
      document.body.appendChild(link1);
      link1.click(); link1.remove();
      window.URL.revokeObjectURL(link1.href);

      // small delay to avoid browser blocking multiple quick downloads
      await new Promise(resolve => setTimeout(resolve, 500));

      // SP3
      const url2 = `http://localhost:8000/api/${base}/download-docx/?contract_number=${encodeURIComponent(contractNum)}${downloadType}&type=sp3`;
      const resp2 = await axios.get(url2, { responseType: 'blob', headers: token ? { Authorization: `Bearer ${token}` } : {} });
      const contentType2 = (resp2.headers && resp2.headers['content-type']) || '';
      const isPdf2 = contentType2.includes('pdf');
      const blob2 = new Blob([resp2.data], { type: contentType2 || (isPdf2 ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') });
      if (contentType2.includes('application/json')) {
        const text = await blob2.text();
        try { const js = JSON.parse(text); console.error('SP3 download failed', js); return; } catch (e) { console.error('SP3 download failed (unparseable json)', e); return; }
      }
      const link2 = document.createElement('a');
      link2.href = window.URL.createObjectURL(blob2);
      link2.download = `${isUV ? 'uv_sp3' : 'BL_SP3'}_${contractNum}${isPdf2 ? '.pdf' : '.docx'}`;
      document.body.appendChild(link2);
      link2.click(); link2.remove();
      window.URL.revokeObjectURL(link2.href);
    } catch (e) {
      console.error('DOCX/SP3 download failed', e);
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
        // (no _display fields added â€” visual formatting handled in inputs)
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
        // Ensure debtor name and phone number appear in header fields for templates
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

        if (editOnly || initialContractNumber) {
          Object.keys(extraFields || {}).forEach((k) => {
            if (!payload.hasOwnProperty(k)) payload[k] = extraFields[k];
          });
        }
        try { console.log('Agreement save payload (contract_number):', effectiveContractNumber, payload); } catch (e) {}
        const saveBase = isUV ? 'uv-agreement' : 'bl-agreement';
        try {
          const nowIso = new Date().toISOString();
          payload.created_by = payload.created_by || usernameDisplay || '';
          payload.created_at = payload.created_at || nowIso;
          payload.updated_at = nowIso;
        } catch (e) { /* ignore */ }
        // If editing an existing agreement, PATCH instead of POST to avoid insert errors
        const headers = {
          'Authorization': accessToken ? `Bearer ${accessToken}` : `Bearer ${localStorage.getItem('access_token')}`,
          'Content-Type': 'application/json'
        };
        // Always POST â€” backend does not accept PATCH on this endpoint in some deployments.
        // Recursively strip any `id`/`pk` keys from the payload to avoid primary-key insertion errors.
        try { stripIdKeys(payload); } catch (e) { /* ignore */ }

        // Normalize numeric fields to avoid sending empty strings for numeric DB columns
        const normalizeSection = (obj) => {
          if (!obj || typeof obj !== 'object') return obj;
          const out = {};
          Object.keys(obj).forEach((k) => {
            let v = obj[k];
            if (/_in_word$|_by_word$/.test(k)) { out[k] = v; return; }
            if (numericFields && numericFields.includes(k)) {
              if (v === null || v === undefined || (typeof v === 'string' && v.trim() === '')) {
                out[k] = 0;
              } else {
                const s = String(v).replace(/\./g, '').replace(/,/g, '').trim();
                const n = Number(s);
                out[k] = Number.isNaN(n) ? 0 : n;
              }
            } else {
              out[k] = v;
            }
          });
          return out;
        };

        const normalizedPayload = { ...payload };
        ['contract_data','debtor','collateral_data','bm_data','branch_data','header_fields','extra_fields'].forEach(sec => {
          if (payload[sec]) normalizedPayload[sec] = normalizeSection(payload[sec]);
        });
        // ensure top-level branch_id is present
        if (!normalizedPayload.branch_id) {
          const resolved = selectedBranchId || (branchData && (branchData.branch_id || branchData.id));
          if (resolved) normalizedPayload.branch_id = resolved;
        }
        // Remove client-side created/updated fields; server will set authoritative values
        try { delete normalizedPayload.created_by; delete normalizedPayload.created_at; delete normalizedPayload.updated_at; } catch (e) {}

        return axios.post(`http://localhost:8000/api/${saveBase}/`, normalizedPayload, { headers });
    };
    try {
      await doSave(localStorage.getItem('access_token'));
      const savedContractNumber = contractNumber || initialContractNumber || '';
      const isUpdate = !!(editOnly || initialContractNumber || initialContractData);
      toast.success(isUpdate ? 'Data updated successfully!' : 'Data added successfully!');
      if (typeof onSaved === 'function') {
        try { onSaved(savedContractNumber); } catch (e) { console.warn('onSaved callback failed', e); }
      }
      // no automatic download on save; button now only saves data
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
            const isUpdate = !!(editOnly || initialContractNumber || initialContractData);
            toast.success(isUpdate ? 'Data updated successfully!' : 'Data added successfully!', { className: 'toast-success' });
            if (typeof onSaved === 'function') {
              try { onSaved(savedContractNumberRetry); } catch (e) { console.warn('onSaved callback failed', e); }
            }
            // no automatic download on save after token refresh
          } else {
            throw new Error('Refresh failed');
          }
        } catch (refreshErr) {
          console.error('Token refresh failed', refreshErr);
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          const errMsg = 'Session expired. Please login again.';
          setError(errMsg);
          toast.error(errMsg);
        }
      } else {
        const resp = err?.response;
        if (resp) {
          const status = resp.status;
          const url = resp.request?.responseURL || resp.config?.url || 'unknown';
          let body = '';
          try { body = typeof resp.data === 'string' ? resp.data : JSON.stringify(resp.data); } catch (e) { body = String(resp.data); }
          const errMsg = `Failed to save (${status}): ${body && body.substring(0,200)}`;
          setError(errMsg);
          toast.error(errMsg);
          console.error('Save error response:', resp);
        } else {
          const errMsg = 'Failed to save data: ' + (err.message || 'unknown error');
          setError(errMsg);
          toast.error(errMsg);
          console.error('Save error:', err);
        }
      }
    } finally {
      setSaving(false);
    }
  };

    // respond to parent-triggered submit (create modal Save / Download PDF button)
    useEffect(() => {
      if (typeof submitTrigger === 'undefined') return;
      (async () => {
          try {
            await handleSave();
          } catch (e) { console.error('submitTrigger save failed', e); }
        })();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [submitTrigger]);

  const [contractNumber, setContractNumber] = useState('');
  useEffect(() => {
    if (!initialContractNumber) return;
    setContractNumber(initialContractNumber);
    // When opened for edit, immediately load the contract data so the modal
    // shows the existing values instead of the create form.
    try {
      handleView(String(initialContractNumber), false).catch(() => {});
    } catch (e) {
      // swallow errors during initial load
      console.warn('Initial contract load failed', e);
    }
  }, [initialContractNumber]);

  useEffect(() => {
    if (!initialContractData) return;
    if (initialContractNumber) return;
    try {
      if (initialContractData.contract_number) setContractNumber(initialContractData.contract_number);
      setContractData(prev => ({ ...prev, ...initialContractData }));
    } catch (e) { console.warn('Failed to apply initialContractData to form', e); }
  }, [initialContractData, initialContractNumber]);

  const handleContractOnlySave = async () => {
    setContractOnlySaving(true);
    setContractOnlyError('');
    try {
      // If this is the modal "Add Contract" flow, enforce NIK must be 16 digits
      if (inModal && contractOnly) {
        const nikRaw = (contractData && (contractData.nik_number_of_debtor || contractData.nik)) || '';
        const digits = String(nikRaw).replace(/\D/g, '');
        if (digits.length !== 16) {
          setContractOnlyError('NIK must consist of 16 digits');
          setContractOnlySaving(false);
          return;
        }
      }
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
  const rateFields = ['flat_rate', 'admin_rate'];

  const contractFields = [
    // Identitiy debtor
    'contract_number','nik_number_of_debtor','name_of_debtor','place_birth_of_debtor','date_birth_of_debtor','date_birth_of_debtor_in_word',
    'street_of_debtor','subdistrict_of_debtor','district_of_debtor','city_of_debtor','province_of_debtor',
    'phone_number_of_debtor','business_partners_relationship','business_type',
    // Bank fields
    'bank_account_number','name_of_bank','name_of_account_holder','virtual_account_number',
    // Previous contract
    'topup_contract','previous_topup_amount',
    // New numeric fields to show in create-contract modal
    'loan_amount','loan_amount_in_word','term','term_by_word','flat_rate','flat_rate_by_word','notaris_fee','notaris_fee_in_word','admin_fee','admin_fee_in_word',
    'mortgage_amount','mortgage_amount_in_word','net_amount','net_amount_in_word','admin_rate','admin_rate_in_word','tlo','tlo_in_word',
    'life_insurance','life_insurance_in_word','stamp_amount','financing_agreement_amount','security_agreement_amount','upgrading_land_rights_amount','total_amount'
  ];
  
  const hiddenForUV = new Set(['mortgage_amount', 'mortgage_amount_in_word']);
  const hiddenForBLCreate = new Set(['tlo', 'tlo_in_word','life_insurance_in_word']);

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

  // If user is BM or CSA, auto-select user's branch_id after branches load
  useEffect(() => {
    try {
      if (!branches || branches.length === 0) return;
      if (selectedBranchId) return;
      const raw = localStorage.getItem('user_data');
      if (!raw) return;
      const ud = JSON.parse(raw);
      const role = (ud.role || ud.role_name || '').toString().toLowerCase();
      const bid = ud.branch_id || ud.branch || ud.branchId || null;
      if (!bid) return;
      if (role.includes('bm') || role.includes('csa')) {
        setSelectedBranchId(String(bid));
        handleBranchSelectLoad(bid);
      }
    } catch (e) { /* ignore */ }
  }, [branches]);

  // Auto-select user's branch in CREATE modal (khusus untuk modal create)
  useEffect(() => {
    try {
      if (!createOnly) return; // Hanya untuk modal create
      if (!branches || branches.length === 0) return;
      if (selectedBranchId) return; // Jika sudah ada pilihan, skip
      const raw = localStorage.getItem('user_data');
      if (!raw) return;
      const ud = JSON.parse(raw);
      const bid = ud.branch_id || ud.branch || ud.branchId || null;
      if (!bid) return;
      // Auto-select branch berdasarkan user's branch_id
      setSelectedBranchId(String(bid));
      handleBranchSelectLoad(bid);
    } catch (e) { /* ignore */ }
  }, [createOnly, branches, selectedBranchId]);

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
    // Setel `place_of_agreement` ke name cabang (dari tabel branches)
    setHeaderFields(prev => ({ ...prev, place_of_agreement: sel.name ?? '' }));
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

  // If parent passed an initial selected branch id (from the top filter), apply it
  useEffect(() => {
    try {
      if (!initialSelectedBranchId) return;
      setSelectedBranchId(initialSelectedBranchId);
      // If branches already loaded, populate branch/bm data for the selected id
      if (Array.isArray(branches) && branches.length > 0) {
        const found = (branches || []).find(b => String(b.id) === String(initialSelectedBranchId));
        if (found) handleBranchSelectLoad(initialSelectedBranchId);
      }
    } catch (e) {
      // ignore
    }
  }, [initialSelectedBranchId]);

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
      // mode=create â†’ fetch from source tables (contract + collateral); default â†’ fetch from agreement table
      const params = { contract_number: cn };
      if (forCreate || createOnly) { params.mode = 'create'; }
      const response = await axios.get(`http://localhost:8000/api/${base}/`, { params, headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` } });

      setDebtor(response.data.debtor || null);
      setCollateral(response.data.collateral || null);

      if (editOnly || initialContractNumber || forCreate) {
        const blRow = response.data.debtor || response.data || {};
        const directContractData = {};
        contractFields.forEach((f) => { directContractData[f] = findValueInObj(blRow, f) ?? ''; });
        
        // BM & branch data: only populate from API response in EDIT mode
        // In CREATE mode, these stay empty â€” user selects branch via dropdown
        const isCreateMode = forCreate || createOnly;
        const directBmData = {};
        if (!isCreateMode) {
          const bmResp = response.data.branch_manager || {};
          bmFields.forEach((f) => { directBmData[f] = bmResp[f] ?? ''; });
        } else {
          bmFields.forEach((f) => { directBmData[f] = ''; });
        }
        
        const directBranchData = {};
        if (!isCreateMode) {
          const branchResp = response.data.branch || {};
          directBranchData.street_name = branchResp.street_name ?? '';
          directBranchData.subdistrict = branchResp.subdistrict ?? '';
          directBranchData.district = branchResp.district ?? '';
          directBranchData.city = branchResp.city ?? '';
          directBranchData.province = branchResp.province ?? '';
        } else {
          directBranchData.street_name = '';
          directBranchData.subdistrict = '';
          directBranchData.district = '';
          directBranchData.city = '';
          directBranchData.province = '';
        }

        const coll = response.data.collateral || {};
        let directCollateralData = {};
        if (isUV) {
          directCollateralData = { ...(coll || {}) };
          try { const uvKeys = Object.keys(directCollateralData).filter(k => !/^id$|contract_number$/i.test(k)); setUvCollateralFields(uvKeys); } catch (e) {}
        } else {
          // Only take collateral data from bl_collateral table (coll), no fallback to blRow
          collateralFields.forEach((f) => { directCollateralData[f] = findValueInObj(coll, f) ?? ''; });
        }

        const directHeader = {
          ...headerFields,
          agreement_date: isCreateMode ? headerFields.agreement_date : (blRow.agreement_date ?? headerFields.agreement_date),
          place_of_agreement: isCreateMode ? headerFields.place_of_agreement : (blRow.place_of_agreement ?? headerFields.place_of_agreement),
          name_of_director: isCreateMode ? headerFields.name_of_director : (blRow.name_of_director ?? blRow.Name_of_director ?? headerFields.name_of_director),
          phone_number_of_lolc: isCreateMode ? headerFields.phone_number_of_lolc : (blRow.phone_number_of_lolc ?? headerFields.phone_number_of_lolc),
          sp3_number: isCreateMode ? headerFields.sp3_number : (blRow.sp3_number ?? blRow.sp3No ?? headerFields.sp3_number),
          sp3_date: isCreateMode ? headerFields.sp3_date : (blRow.sp3_date ?? blRow.sp3Date ?? headerFields.sp3_date)
        };
        // In create mode, remove stale SP3/date values so auto-generate useEffect values are preserved
        if (isCreateMode) { delete directHeader.sp3_number; delete directHeader.sp3_date; delete directHeader.agreement_date; }

        setContractData(directContractData);
        // In create mode, don't overwrite BM/branch â€” they come from branch dropdown selection
        if (!isCreateMode) {
          setBmData(directBmData);
        }
        // Ensure branch selector is populated when editing (not creating) so top-level `branch_id` is sent
        if (!isCreateMode) {
          try {
            const branchResp = response.data.branch || {};
            const resolvedBranchId = branchResp?.id || branchResp?.branch_id || blRow?.branch_id || blRow?.branch || blRow?.branchId || '';
            if (resolvedBranchId) setSelectedBranchId(String(resolvedBranchId));
          } catch (e) { /* ignore */ }
          setBranchData(directBranchData);
        }
        setCollateralData(directCollateralData);
        const known = new Set([...contractFields, ...bmFields, ...branchFields, ...collateralFields, ...Object.keys(directHeader || {})]);
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

      // BM data: only use from API response in non-create mode
      const newBmData = {};
      bmFields.forEach((f) => { newBmData[f] = '' });
      if (!forCreate && !createOnly) {
        const bmFromResp = response.data.branch_manager || {};
        if (bmFromResp && Object.keys(bmFromResp).length > 0) {
          bmFields.forEach((f) => {
            if (bmFromResp[f] !== undefined) {
              newBmData[f] = bmFromResp[f] ?? '';
            }
          });
        }
      }

      let newCollateralData = {};
      if (isUV) {
        newCollateralData = { ...(c || {}) };
        const keys = Object.keys(newCollateralData).filter(k => !/^id$|contract_number$/i.test(k));
        setUvCollateralFields(keys);
      } else {
        newCollateralData = {};
        const collResp = c || {};
        const collKeys = Object.keys(collResp);
        const normalize = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '').replace(/of/g, '');
        const collNormMap = {};
        collKeys.forEach(k => { collNormMap[normalize(k)] = k; });
        
        collateralFields.forEach((f) => {
          // Try direct match first
          if (collResp[f] !== undefined) {
            newCollateralData[f] = collResp[f] ?? '';
            return;
          }
          // Try normalized match
          const nf = normalize(f);
          if (collNormMap[nf]) {
            newCollateralData[f] = collResp[collNormMap[nf]] ?? '';
            return;
          }
          // Try partial match
          const parts = f.split('_').filter(p => p && p !== 'of');
          let foundKey = null;
          for (const k of collKeys) {
            const lk = k.toLowerCase();
            const matches = parts.reduce((acc, p) => acc + (p.length > 2 && lk.includes(p) ? 1 : 0), 0);
            if (matches >= Math.max(1, Math.floor(parts.length / 2))) {
              foundKey = k;
              break;
            }
          }
          newCollateralData[f] = foundKey ? (collResp[foundKey] ?? '') : '';
        });
      }

      const newHeaderFields = { ...headerFields, phone_number_of_lolc: d.phone_number_of_lolc ?? headerFields.phone_number_of_lolc, name_of_director: selectedDirector || headerFields.name_of_director };
      if (!forCreate) { setHeaderFields(prev => ({ ...prev, phone_number_of_lolc: (d && d.phone_number_of_lolc) ? d.phone_number_of_lolc : (prev.phone_number_of_lolc || ''), name_of_director: selectedDirector || prev.name_of_director })); }

      setContractData(newContractData);
      setCollateralData(newCollateralData);
      if (!forCreate) setBmData(newBmData);

      // Branch data: only use from API response in non-create mode
      let newBranchData = { street_name: '', subdistrict: '', district: '', city: '', province: '' };
      if (!forCreate && !createOnly) {
        const branchResp = response.data.branch || {};
        newBranchData = {
          street_name: branchResp.street_name ?? '',
          subdistrict: branchResp.subdistrict ?? '',
          district: branchResp.district ?? '',
          city: branchResp.city ?? '',
          province: branchResp.province ?? ''
        };
      }
      if (!forCreate) {
        setBranchData(newBranchData);
      }
      if (!forCreate) {
        if (selectedBranchId) {
          const branch = (branches || []).find(b => String(b.id) === String(selectedBranchId));
          if (branch) setHeaderFields(prev => ({ ...prev, place_of_agreement: branch.name ?? '' }));
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
    if (!fieldName) return '';
    // Small helper to Title Case each word
    const toTitleCase = (s) => String(s).split(/\s+/).filter(Boolean).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');

    const f = String(fieldName);
    // Frontend-only override: rename BPKB field label
    if (f.toLowerCase().replace(/[^a-z0-9]/g, '') === 'namebpkbowner') return 'Collateral Owner';
    // preserve existing special-case: previous_topup_amount -> Outstanding Previous Contract
    if (f.startsWith('previous_topup_amount')) {
      const raw = f.replace(/^previous_topup_amount/, 'Outstanding Previous Contract').replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').trim();
      return toTitleCase(raw);
    }
    // (no special-case mapping for collateral owner here)

    // Normalize raw label into words
    const raw = f.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').trim();
    const parts = raw.split(/\s+/).filter(Boolean);

    // Build label with token-specific casing and simple pattern rules
    const outParts = [];
    for (let i = 0; i < parts.length; i++) {
      const p = parts[i];
      const pl = p.toLowerCase();

      // Handle NIK followed by 'number of' -> produce 'NIK Of ...' (drop 'Number')
      if (pl === 'nik') {
        outParts.push('NIK');
        // skip next token if it's 'number'
        if (parts[i+1] && parts[i+1].toLowerCase() === 'number') {
          i += 1; // skip 'number'
        }
        continue;
      }

      // Uppercase BM tokens
      if (pl === 'bm') { outParts.push('BM'); continue; }

      // TLO tokens
      if (pl === 'tlo') { outParts.push('TLO'); continue; }

      // SP3 -> SP3K mapping
      if (pl === 'sp3') { outParts.push('SP3K'); continue; }

      // default: Title Case this token
      outParts.push(p.charAt(0).toUpperCase() + p.slice(1).toLowerCase());
    }

    return outParts.join(' ');
  };

  const formatFieldValue = (value) => {
    if (value === null || value === undefined) return '-';
    if (typeof value === 'boolean') return value ? 'Ya' : 'Tidak';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
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
        const iso = parseDateFromDisplay(value);
        setBmData(prev => ({ ...prev, [field]: iso }));
      } else {
        setBmData(prev => ({ ...prev, [field]: value }));
      }
    }
    if (section === 'branch') setBranchData(prev => ({ ...prev, [field]: value }));
    if (section === 'contract') {
      if (String(field).toLowerCase().includes('nik')) {
        const raw = String(value || '').replace(/\D/g, '').slice(0,16);
        setContractData(prev => ({ ...prev, [field]: raw }));
        return;
      }
      if (rateFields.includes(field)) {
        const rateVal = String(value || '').replace(',', '.');
        setContractData(prev => ({ ...prev, [field]: rateVal }));
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
      } else {
        if (isDateFieldName(field)) { const iso = parseDateFromDisplay(value); setContractData(prev => ({ ...prev, [field]: iso })); } else { setContractData(prev => ({ ...prev, [field]: value })); }
      }
    }
    if (section === 'collateral') {
      if (numericFields.includes(field)) { const raw = (value || '').toString().replace(/\./g, '').replace(/,/g, '').trim(); setCollateralData(prev => ({ ...prev, [field]: raw })); } else { if (isDateFieldName(field)) { const iso = parseDateFromDisplay(value); setCollateralData(prev => ({ ...prev, [field]: iso })); } else { setCollateralData(prev => ({ ...prev, [field]: value })); } }
    }
    if (section === 'header') { if (isDateFieldName(field)) { const iso = parseDateFromDisplay(value); setHeaderFields(prev => ({ ...prev, [field]: iso })); } else { setHeaderFields(prev => ({ ...prev, [field]: value })); } }
  };

  

  // compact styles when rendered inside modal to better fit header
  const compact = !!inModal;
  const baseLabelStyle = compact ? { ...styles.label, fontSize: 12, marginBottom: 4 } : styles.label;
  const baseInputStyle = compact ? { ...styles.input, padding: '8px 10px', fontSize: 13, borderRadius: 4 } : styles.input;
  // Label/input styles (use base styles; modal chrome handled by CSS)
  let labelStyle = baseLabelStyle;
  let inputStyle = baseInputStyle;
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
    const isNumericField = /amount|loan|mortgage|previous_topup_amount|notaris_fee|admin_fee|tlo|stamp_amount|financing_agreement_amount|security_agreement_amount|upgrading_land_rights_amount|net_amount|total_amount|life_insurance/i.test(f) || numericFields.includes(f);
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
    const isNikField = /nik/i.test(f);
    return (
      <div key={f} style={{ display: 'flex', flexDirection: 'column' }}>
        <label style={labelStyle}>{formatFieldName(f)}</label>
        <input
          type={inputType}
          value={rateFields.includes(f) ? String(contractData[f] || '').replace('.', ',') : (contractData[f] ?? '')}
          onChange={(e) => handleInputChange('contract', f, e.target.value)}
          inputMode={isNikField ? 'numeric' : undefined}
          pattern={isNikField ? "\\d*" : undefined}
          maxLength={isNikField ? 16 : undefined}
          style={inputStyle}
        />
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

    // Use same styles as the Add Collateral modal
    const fieldLabelStyleLocal = { fontSize: 13, fontWeight: 600, color: '#333', marginBottom: 6 };
    const fieldInputStyleLocal = { padding: '10px 12px', fontSize: 14, border: '1px solid #ddd', borderRadius: 6, outline: 'none', width: '100%', boxSizing: 'border-box' };
    const fieldGroupStyleLocal = { display: 'flex', flexDirection: 'column' };

    return (
      <div style={{ padding: 20, minWidth: 560 }}>
        {contractOnlyError && <div style={{ marginBottom: 12, color: '#a33' }}>{contractOnlyError}</div>}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {visibleOrdered.map((f) => {
            const isWordField = /(_in_word|_by_word)$/.test(f);
            const baseField = f.replace(/(_in_word|_by_word)$/, '');
            if (isWordField) {
              let value = '';
              if (/date|birth/i.test(baseField)) {
                value = getIndonesianDateInWords(contractData[baseField]) || contractData[f] || '';
              } else {
                const n = Number(contractData[baseField] || 0) || 0;
                value = getIndonesianNumberWord(n) || contractData[f] || '';
              }
              return (
                <div key={f} style={fieldGroupStyleLocal}>
                  <label style={fieldLabelStyleLocal}>{formatFieldName(f)}</label>
                  <input type="text" placeholder="" style={fieldInputStyleLocal} value={value} disabled />
                </div>
              );
            }

            if (f === 'business_partners_relationship') {
              return (
                <div key={f} style={fieldGroupStyleLocal}>
                  <label style={fieldLabelStyleLocal}>{formatFieldName(f)}</label>
                  <select
                    value={contractData[f] ?? ''}
                    onChange={(e) => handleInputChange('contract', f, e.target.value)}
                    style={fieldInputStyleLocal}
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

            const isNumericField = /amount|loan|mortgage|previous_topup_amount|notaris_fee|admin_fee|tlo|stamp_amount|financing_agreement_amount|security_agreement_amount|upgrading_land_rights_amount|net_amount|total_amount|life_insurance/i.test(f) || numericFields.includes(f);
            if (isNumericField) {
              return (
                <div key={f} style={fieldGroupStyleLocal}>
                  <label style={fieldLabelStyleLocal}>{formatFieldName(f)}</label>
                  <input
                    type="text"
                    value={formatNumberWithDots(contractData[f])}
                    onChange={(e) => {
                      const raw = (e.target.value || '').toString().replace(/\./g, '').replace(/,/g, '').trim();
                      handleInputChange('contract', f, raw);
                    }}
                    style={fieldInputStyleLocal}
                  />
                </div>
              );
            }

            const inputType = isDateFieldName(f) ? 'date' : 'text';
            const isNikField = /nik/i.test(f);
            return (
              <div key={f} style={fieldGroupStyleLocal}>
                <label style={fieldLabelStyleLocal}>{formatFieldName(f)}</label>
                <input
                  type={inputType}
                  value={rateFields.includes(f) ? String(contractData[f] || '').replace('.', ',') : (contractData[f] ?? '')}
                  onChange={(e) => handleInputChange('contract', f, e.target.value)}
                  inputMode={isNikField ? 'numeric' : undefined}
                  pattern={isNikField ? "\\d*" : undefined}
                  maxLength={isNikField ? 16 : undefined}
                  style={fieldInputStyleLocal}
                />
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
                  const modalOrder = ['place_of_agreement','date_of_delegated','agreement_date','sp3_date','sp3_number','name_of_director','phone_number_of_lolc'];
                  const normalOrder = ['place_of_agreement','agreement_date','agreement_day_in_word','agreement_date_in_word','sp3_date','sp3_number','date_of_delegated','name_of_director','phone_number_of_lolc'];
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
          <button style={{ ...styles.btnPrimary, minWidth: 120 }} onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : (createOnly ? 'Save Document' : ((editOnly || initialContractNumber) ? 'Update' : 'Save'))}</button>
        </div>
      </div>
    </div>
  );
}

//  Thin wrappers 

function BLCreateForm(props = {}) {
  return (
    <BLAgreementForm
      {...props}
      createOnly={true}
      editOnly={false}
      hideFilter={false}
      hideHeader={false}
      isUV={false}
    />
  );
}

function BLEditForm({ initialContractNumber = '', onSaved, ...rest } = {}) {
  return (
    <BLAgreementForm
      initialContractNumber={initialContractNumber}
      onSaved={onSaved}
      createOnly={false}
      editOnly={true}
      hideFilter={true}
      hideHeader={true}
      isUV={false}
      inModal={true}
      {...rest}
    />
  );
}

// Named exports for backward compatibility
export { BLCreateForm as BLAgreementCreate };
export { BLEditForm as BLAgreementEdit };

//  Page Component 

export default function BLAgreement() {
  const [agreements, setAgreements] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create' or 'edit'
  const [contractNumber, setContractNumber] = useState('');
  const [selectedBranchId, setSelectedBranchId] = useState('');
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

  const [searchQuery, setSearchQuery] = useState('');

  const visibleAgreements = (() => {
    const q = (searchQuery || '').toString().trim().toLowerCase();
    if (!q) return agreements || [];
    return (agreements || []).filter((r) => {
      const hay = `${r.contract_number || ''} ${r.name_of_debtor || ''} ${r.nik_number_of_debtor || ''}`.toLowerCase();
      return hay.includes(q);
    });
  })();

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
      const res = await requestWithAuth({ method: 'get', url: 'http://localhost:8000/api/bl-agreement/' });
      let items = res.data?.agreements || res.data?.results || res.data || [];
      if (!Array.isArray(items)) items = items ? [items] : [];
      const rows = items.map(item => ({
        agreement_date: item.agreement_date || item.header?.agreement_date || item.created_at || item.created || item.date_created || '',
        contract_number: item.contract_number || (item.contract && item.contract.contract_number) || '',
        name_of_debtor: (item.debtor || item.contract || {}).name_of_debtor || item.name_of_debtor || '',
        nik_number_of_debtor: (item.debtor || item.contract || {}).nik_number_of_debtor || item.nik_number_of_debtor || '',
        collateral_type: (item.collateral && item.collateral.collateral_type) || item.collateral_type || '',
        created_by: item.created_by || item.created_by_name || item.created_by_user || ''
      }));
      setAgreements(rows);
    } catch (err) {
      console.error('Error loading agreements', err);
      setError('Failed to load agreements');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async (row) => {
    const cn = row.contract_number;
    setError('');
    if (!cn) {
      setModalMode('create'); setContractNumber(''); setFormDebtorName(''); setFormNik(''); setFormCollateralType(''); setSelectedBranchId(''); setShowCreateModal(true); return;
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
      // Download Agreement DOCX
      const url1 = `http://localhost:8000/api/bl-agreement/download-docx/?contract_number=${encodeURIComponent(row.contract_number)}&type=agreement`;
      const res1 = await requestWithAuth({ method: 'get', url: url1, responseType: 'blob' });
      const contentType1 = (res1.headers && res1.headers['content-type']) || '';
      const blob1 = new Blob([res1.data], { type: contentType1 || 'application/octet-stream' });
      if (contentType1.includes('application/json')) {
        const text = await blob1.text();
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
      const link1 = document.createElement('a');
      link1.href = window.URL.createObjectURL(blob1);
      link1.download = `BL_Agreement_${row.contract_number}.docx`;
      document.body.appendChild(link1);
      link1.click(); link1.remove();

      // Wait 500ms then download SP3 DOCX
      await new Promise(resolve => setTimeout(resolve, 500));
      const url2 = `http://localhost:8000/api/bl-agreement/download-docx/?contract_number=${encodeURIComponent(row.contract_number)}&type=sp3`;
      const res2 = await requestWithAuth({ method: 'get', url: url2, responseType: 'blob' });
      const contentType2 = (res2.headers && res2.headers['content-type']) || '';
      const blob2 = new Blob([res2.data], { type: contentType2 || 'application/octet-stream' });
      if (contentType2.includes('application/json')) {
        const text = await blob2.text();
        try {
          const js = JSON.parse(text);
          const msg = js.error || js.detail || JSON.stringify(js);
          setError(`Download SP3 failed: ${msg}`);
          return;
        } catch (e) {
          setError('Download SP3 failed: unable to parse server response');
          return;
        }
      }
      const link2 = document.createElement('a');
      link2.href = window.URL.createObjectURL(blob2);
      link2.download = `BL_SP3_${row.contract_number}.docx`;
      document.body.appendChild(link2);
      link2.click(); link2.remove();
    } catch (err) {
      console.error('Download failed', err); setError('Failed to download the documents');
    }
  };

  const handleDownloadPdf = async (row) => {
    if (!row.contract_number) { setError('Contract number not available'); return; }
    try {
      // Download Agreement PDF
      const url1 = `http://localhost:8000/api/bl-agreement/download-docx/?contract_number=${encodeURIComponent(row.contract_number)}&type=agreement&download=pdf`;
      const res1 = await requestWithAuth({ method: 'get', url: url1, responseType: 'blob' });
      const contentType1 = (res1.headers && res1.headers['content-type']) || '';
      const blob1 = new Blob([res1.data], { type: contentType1 || 'application/pdf' });
      if (contentType1.includes('application/json')) {
        const text = await blob1.text();
        try { const js = JSON.parse(text); setError(js.error || js.detail || 'PDF conversion failed'); return; } catch (e) { setError('PDF conversion failed'); return; }
      }
      const link1 = document.createElement('a');
      link1.href = window.URL.createObjectURL(blob1);
      link1.download = `BL_Agreement_${row.contract_number}.pdf`;
      document.body.appendChild(link1);
      link1.click(); link1.remove();

      // Wait 500ms then download SP3 PDF
      await new Promise(resolve => setTimeout(resolve, 500));
      const url2 = `http://localhost:8000/api/bl-agreement/download-docx/?contract_number=${encodeURIComponent(row.contract_number)}&type=sp3&download=pdf`;
      const res2 = await requestWithAuth({ method: 'get', url: url2, responseType: 'blob' });
      const contentType2 = (res2.headers && res2.headers['content-type']) || '';
      const blob2 = new Blob([res2.data], { type: contentType2 || 'application/pdf' });
      if (contentType2.includes('application/json')) {
        const text = await blob2.text();
        try { const js = JSON.parse(text); setError(js.error || js.detail || 'PDF conversion failed for SP3'); return; } catch (e) { setError('PDF conversion failed for SP3'); return; }
      }
      const link2 = document.createElement('a');
      link2.href = window.URL.createObjectURL(blob2);
      link2.download = `BL_SP3_${row.contract_number}.pdf`;
      document.body.appendChild(link2);
      link2.click(); link2.remove();
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
      } catch (e) {
        console.error('Error while formatting PDF download error', e);
      }
      setError('Failed to download PDFs');
    }
  };

  const handleSaveModal = async () => {
    setSavingModal(true);
    try {
      const payload = { contract_number: contractNumber, debtor: { name_of_debtor: formDebtorName, nik_number_of_debtor: formNik }, collateral: { collateral_type: formCollateralType } };
      try { stripIdKeys(payload); } catch (e) {}
      await requestWithAuth({ method: 'post', url: 'http://localhost:8000/api/bl-agreement/', data: payload });
      toast.success('Data saved successfully!');
      setShowCreateModal(false);
      await loadAgreements();
    } catch (err) {
      console.error('Save failed', err);
      const errMsg = 'Failed to save data';
      setError(errMsg);
      toast.error(errMsg);
    } finally {
      setSavingModal(false);
    }
  };

  const handleSaveAndDownload = async () => {
    setSavingModal(true);
    try {
      const payload = { contract_number: contractNumber, debtor: { name_of_debtor: formDebtorName, nik_number_of_debtor: formNik }, collateral: { collateral_type: formCollateralType } };
      try { stripIdKeys(payload); } catch (e) {}
      await requestWithAuth({ method: 'post', url: 'http://localhost:8000/api/bl-agreement/', data: payload });
      toast.success('Data saved successfully!');
      // refresh daftar lalu unduh
      await loadAgreements();
      // Request PDF when available
      const url = `http://localhost:8000/api/bl-agreement/download-docx/?contract_number=${encodeURIComponent(contractNumber)}`;
      const res = await requestWithAuth({ method: 'get', url, responseType: 'blob' });
      const contentType = (res.headers && res.headers['content-type']) || '';
      const blob = new Blob([res.data], { type: contentType || 'application/octet-stream' });
      if (contentType.includes('application/json')) {
        const text = await blob.text();
        try {
          const js = JSON.parse(text);
          const msg = js.error || js.detail || JSON.stringify(js);
          setError(`Download failed: ${msg}`);
          toast.error(`Failed to download: ${msg}`, { className: 'toast-error' });
          setShowCreateModal(false);
          setSavingModal(false);
          return;
        } catch (e) {
          setError('Download failed: unable to parse server response');
          toast.error('Failed to download: unable to parse server response', { className: 'toast-error' });
          setShowCreateModal(false);
          setSavingModal(false);
          return;
        }
      }
      const isPdf = contentType.includes('pdf');
      const link = document.createElement('a'); link.href = window.URL.createObjectURL(blob); link.download = `BL_Agreement_${contractNumber}${isPdf ? '.pdf' : '.docx'}`; document.body.appendChild(link); link.click(); link.remove();
      setShowCreateModal(false);
    } catch (err) {
      console.error('Save & Download failed', err);
      const errMsg = 'Failed to save and download';
      setError(errMsg);
      toast.error(errMsg);
    } finally {
      setSavingModal(false);
    }
  };

  const handleModalDownload = async () => {
    if (!contractNumber) { setError('Contract number is empty'); return; }
    try {
      // Request PDF when available
      const url = `http://localhost:8000/api/bl-agreement/download-docx/?contract_number=${encodeURIComponent(contractNumber)}`;
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
      const link = document.createElement('a'); link.href = window.URL.createObjectURL(blob); link.download = `BL_Agreement_${contractNumber}${isPdf ? '.pdf' : '.docx'}`; document.body.appendChild(link); link.click(); link.remove();
    } catch (err) { console.error('Download failed', err); setError('Failed to download the document'); }
  };

  const formatDateShort = (iso) => {
    if (!iso) return '';
    try { const d = new Date(iso); if (isNaN(d.getTime())) return iso; const dd = String(d.getDate()).padStart(2, '0'); const mm = String(d.getMonth() + 1).padStart(2, '0'); const yyyy = d.getFullYear(); return `${dd}-${mm}-${yyyy}`; } catch (e) { return iso; }
  };

  return (
    <div>
      <div>
        <h2>BL Agreement</h2>
        <p>Before creating the document, make sure to fill in the contract and collateral data first.</p>
      </div>

      <div className="user-management-actions" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input
            type="text"
            placeholder="Search contract, debtor, NIK..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search agreements"
            style={{ padding: '8px 10px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px', width: '260px' }}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button
            className="btn-primary"
            onClick={() => { setModalMode('create'); setContractNumber(''); setFormDebtorName(''); setFormNik(''); setFormCollateralType(''); setError(''); setSelectedBranchId(''); setContractOnlyMode(true); setShowCreateModal(true); }}
            title="Add a new contract"
          >
            Add Contract
          </button>

          <button
            className="btn-primary"
            onClick={() => { setModalMode('create'); setContractNumber(''); setFormDebtorName(''); setFormNik(''); setFormCollateralType(''); setError(''); setSelectedBranchId(''); setCollateralMode(true); setShowCreateModal(true); }}
            title="Add a new BL collateral"
          >
            Add Collateral
          </button>

          <button className="btn-save" onClick={() => { setModalMode('create'); setContractNumber(''); setFormDebtorName(''); setFormNik(''); setFormCollateralType(''); setError(''); setSelectedBranchId(''); setContractOnlyMode(false); setCollateralMode(false); setShowCreateModal(true); }}>Create Document</button>
        </div>
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
                  {visibleAgreements.length === 0 ? (
                    <tr><td className="no-data" colSpan={7}>No agreements found.</td></tr>
                  ) : (
                    visibleAgreements.map((row) => (
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
                              title="Download BL Agreement + BL SP3 (DOCX)"
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
                              title="Download BL Agreement + BL SP3 (PDF)"
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
        <div className="modal-overlay" onClick={() => { setShowCreateModal(false); setContractOnlyMode(false); setCollateralMode(false); }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
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
                <BLEditForm
                  initialContractNumber={contractNumber}
                  initialSelectedBranchId={selectedBranchId}
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
                        toast.success('Collateral data saved successfully');
                      } catch (err) {
                        console.error('Save collateral failed', err);
                        const msg = err?.response?.data?.error || 'Failed to save collateral';
                        setCollateralError(msg);
                        toast.error(msg);
                      } finally {
                        setCollateralSaving(false);
                      }
                    }} disabled={collateralSaving}>{collateralSaving ? 'Saving...' : 'Save Collateral'}</button>
                  </div>
                </div>
                ) : (
                <div>
                <BLCreateForm
                  initialContractData={lastSavedContract}
                  contractOnly={contractOnlyMode}
                  inModal={true}
                  initialSelectedBranchId={selectedBranchId}
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
                    toast.success('Contract data saved successfully');
                  }}
                  onSaved={(cn) => { setShowCreateModal(false); setContractOnlyMode(false); loadAgreements(); if (cn) setContractNumber(cn); }}
                />
                
                </div>
              )}
            </div>

            {/* modal footer intentionally left without a bottom Cancel/Close button per UI preference */}
          </div>
        </div>
      )}

      
    </div>
  );
}