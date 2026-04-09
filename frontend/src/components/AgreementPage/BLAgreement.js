/* eslint-disable unicode-bom, no-unused-vars, react-hooks/exhaustive-deps */
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import '../UserManagement/UserManagement.css';
import pdfIcon from '../../assets/icons/pdf-icon.svg';
import { getIndonesianNumberWord, getIndonesianDateInWords, parseDateFromDisplay, getIndonesianDayName, getIndonesianDateDisplay, formatNumberWithDots, formatDateDisplay, isDateFieldName, formatFieldName, titleCasePayload } from '../../utils/formatting';
import useT from '../../hooks/useT';
import { t as messages_t } from '../../utils/messages';
import { requestWithAuth } from '../../utils/api';
import { stripIdKeys, normalizeSection } from '../../utils/payloadUtils';

// Module-level fallback `t` for non-React scope usages (keeps existing code working)
const t = messages_t;


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

// Helper: recursively uppercase fields that end with _in_word or _by_word
const _uppercaseWordFieldsRecursive = (obj) => {
  if (obj === null || typeof obj === 'undefined') return obj;
  if (typeof obj === 'string') return obj;
  if (Array.isArray(obj)) return obj.map(_uppercaseWordFieldsRecursive);
  if (typeof obj === 'object') {
    const out = {};
    Object.keys(obj).forEach(k => {
      try {
        const v = obj[k];
        if (/_in_word$|_by_word$/.test(k)) {
          out[k] = (v === null || typeof v === 'undefined') ? v : String(v).toUpperCase();
        } else if (typeof v === 'object') {
          out[k] = _uppercaseWordFieldsRecursive(v);
        } else {
          out[k] = v;
        }
      } catch (e) {
        out[k] = obj[k];
      }
    });
    return out;
  }
  return obj;
};

// Helper: recursively uppercase all string values in an object/array
const _uppercaseAllStringsRecursive = (val) => {
  try {
    if (val === null || typeof val === 'undefined') return val;
    if (typeof val === 'string') return val.toString().toUpperCase();
    if (Array.isArray(val)) return val.map(_uppercaseAllStringsRecursive);
    if (typeof val === 'object') {
      const out = {};
      Object.keys(val).forEach(k => {
        try { out[k] = _uppercaseAllStringsRecursive(val[k]); } catch (e) { out[k] = val[k]; }
      });
      return out;
    }
    return val;
  } catch (e) { return val; }
};

// Use shared `stripIdKeys` from utils/payloadUtils

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
  const t = useT();

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
          const res = await requestWithAuth({ method: 'get', url: '/api/whoami/' });
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


  // Determine if current user is Admin (used to control Delete button visibility)
  let isAdmin = false;
  try {
    const raw = localStorage.getItem('user_data');
    if (raw) {
      const ud = JSON.parse(raw);
      const role = (ud.role || ud.role_name || '').toString().toLowerCase();
      if (role.includes('admin')) isAdmin = true;
    }
  } catch (e) { /* ignore */ }
  let isAudit = false;
  try {
    const raw2 = localStorage.getItem('user_data');
    if (raw2) {
      const ud2 = JSON.parse(raw2);
      const role2 = (ud2.role || ud2.role_name || '').toString().toLowerCase();
      if (role2.includes('audit')) isAudit = true;
    }
  } catch (e) { /* ignore */ }

  // Pembantu: unduh DOCX untuk nomor kontrak
  // Pembantu: unduh Agreement dan SP3 (DOCX atau PDF bila diminta)
  const triggerDocxDownload = async (contractNum, accessToken, asPdf = false) => {
    if (!contractNum || String(contractNum).trim() === '') return;
    try {
      const token = accessToken || localStorage.getItem('access_token');
      const base = isUV ? 'uv-agreement' : 'bl-agreement';
      const downloadType = asPdf ? '&download=pdf' : '';

      // Agreement
      const url1 = `/api/${base}/download-docx/?contract_number=${encodeURIComponent(contractNum)}${downloadType}&type=agreement`;
      const resp1 = await requestWithAuth({ method: 'get', url: url1, responseType: 'blob', headers: token ? { Authorization: `Bearer ${token}` } : {} });
      const contentType1 = (resp1.headers && resp1.headers['content-type']) || '';
      const isPdf1 = contentType1.includes('pdf');
      const blob1 = new Blob([resp1.data], { type: contentType1 || (isPdf1 ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') });
      if (contentType1.includes('application/json')) {
        const text = await blob1.text();
        try { const js = JSON.parse(text); const msg = js.error || js.detail || js.message || JSON.stringify(js); console.error('Download failed', js); toast.error(t('download_failed_prefix') + msg); return; } catch (e) { console.error('Download failed (unparseable json)', e); toast.error(t('download_unparseable')); return; }
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
      const url2 = `/api/${base}/download-docx/?contract_number=${encodeURIComponent(contractNum)}${downloadType}&type=sp3`;
      const resp2 = await requestWithAuth({ method: 'get', url: url2, responseType: 'blob', headers: token ? { Authorization: `Bearer ${token}` } : {} });
      const contentType2 = (resp2.headers && resp2.headers['content-type']) || '';
      const isPdf2 = contentType2.includes('pdf');
      const blob2 = new Blob([resp2.data], { type: contentType2 || (isPdf2 ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') });
      if (contentType2.includes('application/json')) {
        const text = await blob2.text();
        try { const js = JSON.parse(text); const msg = js.error || js.detail || js.message || JSON.stringify(js); console.error('SP3 download failed', js); toast.error(t('sp3_download_failed_prefix') + msg); return; } catch (e) { console.error('SP3 download failed (unparseable json)', e); toast.error(t('download_unparseable')); return; }
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
    // Prevent saving from create-document modal when collateral section is empty
    if (inModal && createOnly) {
      try {
        const coll = collateralData || {};
        const anyFilled = Object.keys(coll).some(k => coll[k] !== undefined && coll[k] !== null && String(coll[k]).trim() !== '');
        if (!anyFilled) {
          const msg = t('collateral_required');
          setError(msg);
          try { toast.error(msg); } catch (e) {}
          return;
        }
      } catch (e) { /* ignore validation errors */ }
    }
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
              contractDataToSave[f] = (n === 0) ? '' : (getIndonesianNumberWord(n) || contractData[f] || '');
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
              bmDataToSave[f] = (n === 0) ? '' : (getIndonesianNumberWord(n) || bmData[f] || '');
            }
          }
        });

        // When saving from the create modal, ignore any BM phone entered in the
        // Branch Manager section. Prefer branch phone (`branch_data.phone_number_branch`) —
        // backend will copy that into `phone_number_of_bm` when present.
        if (inModal && createOnly) {
          try { delete bmDataToSave.phone_number_of_bm; } catch (e) { /* ignore */ }
        }
        // When saving from the edit modal, BM phone (BM section) is deprecated/unused.
        // Ensure we don't send it so it won't overwrite the agreement value.
        if (inModal && editOnly) {
          try { delete bmDataToSave.phone_number_of_bm; } catch (e) { /* ignore */ }
        }

        const headerFieldsToSave = { ...headerFields };
        // Ensure admin_rate is numeric and default to 0 when empty.
        // Use getNumFromValue (locale-aware) and clamp to a safe range to avoid DB out-of-range errors.
        try {
          let v = getNumFromValue(contractDataToSave.admin_rate);
          if (v === null || typeof v === 'undefined') v = 0;
          // clamp to 0..1000 (adjust upper bound if DB allows larger values)
          v = Math.max(0, Math.min(v, 1000));
          contractDataToSave.admin_rate = v;
        } catch (e) {
          contractDataToSave.admin_rate = 0;
        }
        // Ensure previous_topup_amount (Outstanding Previous Contract) defaults to 0 when empty
        if (typeof contractDataToSave.previous_topup_amount === 'undefined' || contractDataToSave.previous_topup_amount === '' || contractDataToSave.previous_topup_amount === null) {
          contractDataToSave.previous_topup_amount = 0;
        } else {
          contractDataToSave.previous_topup_amount = Number(contractDataToSave.previous_topup_amount) || 0;
        }
        // (no _display fields added â€” visual formatting handled in inputs)
        if (headerFieldsToSave.agreement_date) {
          headerFieldsToSave.agreement_day_in_word = (getIndonesianDayName(headerFieldsToSave.agreement_date) || headerFieldsToSave.agreement_day_in_word || '').toString().toUpperCase();
          headerFieldsToSave.agreement_date_in_word = (getIndonesianDateInWords(headerFieldsToSave.agreement_date) || headerFieldsToSave.agreement_date_in_word || '').toString().toUpperCase();
          headerFieldsToSave.agreement_date_display = (`(${getIndonesianDateDisplay(headerFieldsToSave.agreement_date)})` || headerFieldsToSave.agreement_date_display || '').toString().toUpperCase();
        }
        if (headerFieldsToSave.sp3_date) {
          headerFieldsToSave.sp3_date_in_word = (getIndonesianDateInWords(headerFieldsToSave.sp3_date) || headerFieldsToSave.sp3_date_in_word || '').toString().toUpperCase();
          headerFieldsToSave.sp3_date_display = (`(${getIndonesianDateDisplay(headerFieldsToSave.sp3_date)})` || headerFieldsToSave.sp3_date_display || '').toString().toUpperCase();
        }
        if (headerFieldsToSave.date_of_delegated) {
          headerFieldsToSave.date_of_delegated_in_word = (getIndonesianDateInWords(headerFieldsToSave.date_of_delegated) || headerFieldsToSave.date_of_delegated_in_word || '').toString().toUpperCase();
          headerFieldsToSave.date_of_delegated_display = (`(${getIndonesianDateDisplay(headerFieldsToSave.date_of_delegated)})` || headerFieldsToSave.date_of_delegated_display || '').toString().toUpperCase();
        }
        // Ensure debtor name and phone number appear in header fields for templates
        headerFieldsToSave.name_of_debtor = headerFieldsToSave.name_of_debtor || (contractDataToSave && contractDataToSave.name_of_debtor) || '';
        headerFieldsToSave.phone_number_of_lolc = headerFieldsToSave.phone_number_of_lolc || headerFieldsToSave.phone_number_of_lolc || '';

        const debtorToSave = { ...contractDataToSave };
        const effectiveContractNumber = (contractNumber && String(contractNumber).trim()) ? contractNumber : (initialContractNumber || '');
        // Treat as update only when explicitly editing (`editOnly`) or when an initialContractNumber is present.
        // Do NOT treat `initialContractData` as an update signal — allow pre-filling the create modal without sending `edit_only`.
        const isUpdateLocal = !!(editOnly || initialContractNumber);
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
          edit_only: isUpdateLocal,
          create_only: !!(typeof createOnly !== 'undefined' ? createOnly : false)
        };
        // When saving from a modal (create/edit) request backend to skip server-side normalization
        // For Add-Contract modal (createOnly/contractOnly) we WANT server-side normalization
        // (e.g., ensure contract identifiers are uppercased). Only request skip for other modals.
        try {
          if (inModal && !(createOnly || contractOnly)) payload.skip_normalization = true;
        } catch (e) { /* ignore */ }

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
        let normalizedPayload = { ...payload };
        // Apply title-casing on the client side except for Add-Contract modal
        // (createOnly in a modal) — preserve raw text exactly as entered there.
        try {
          // Skip title-casing for modal create/edit and Add-Contract (preserve modal input)
            if (!(inModal && (createOnly || editOnly || contractOnly))) {
            normalizedPayload = titleCasePayload(normalizedPayload, numericFields);
          }
        } catch (e) { /* non-fatal */ }
        // Skip section-level normalization when saving from modal (send exactly as entered in modal)
        if (!inModal) {
          ['contract_data','debtor','collateral_data','bm_data','branch_data','header_fields','extra_fields'].forEach(sec => {
            if (payload[sec]) normalizedPayload[sec] = normalizeSection(payload[sec], numericFields);
          });
        }
        // ensure top-level branch_id is present
        if (!normalizedPayload.branch_id) {
          const resolved = selectedBranchId || (branchData && (branchData.branch_id || branchData.id));
          if (resolved) normalizedPayload.branch_id = resolved;
        }
        // Remove client-side created/updated fields; server will set authoritative values
        try { delete normalizedPayload.created_by; delete normalizedPayload.created_at; delete normalizedPayload.updated_at; } catch (e) {}

        // If saving from Add-Contract modal (createOnly/contractOnly in a modal),
        // force ALL text fields to UPPERCASE before sending.
        try {
          const _uppercaseStringsRecursive = (val) => {
            if (val === null || typeof val === 'undefined') return val;
            if (typeof val === 'string') return val.toString().trim().toUpperCase();
            if (Array.isArray(val)) return val.map(_uppercaseStringsRecursive);
            if (typeof val === 'object') {
              const out = {};
              Object.keys(val).forEach(k => {
                try { out[k] = _uppercaseStringsRecursive(val[k]); } catch (e) { out[k] = val[k]; }
              });
              return out;
            }
            return val;
          };

          if (inModal && (createOnly || editOnly || contractOnly)) {
            normalizedPayload = _uppercaseStringsRecursive(normalizedPayload);
          } else {
            if (normalizedPayload && normalizedPayload.contract_number) normalizedPayload.contract_number = String(normalizedPayload.contract_number).toUpperCase();
            if (normalizedPayload && normalizedPayload.contract_data && normalizedPayload.contract_data.topup_contract) normalizedPayload.contract_data.topup_contract = String(normalizedPayload.contract_data.topup_contract).toUpperCase();
          }
        } catch (e) { /* ignore */ }

        // When saving from modal (create/edit), ensure collateral text fields are stored UPPERCASE.
        try {
          if ((inModal && (createOnly || editOnly)) && normalizedPayload && normalizedPayload.collateral_data && typeof normalizedPayload.collateral_data === 'object') {
            const cd = { ...normalizedPayload.collateral_data };
            Object.keys(cd).forEach((k) => {
              try {
                const v = cd[k];
                if (v !== undefined && v !== null && typeof v === 'string') cd[k] = v.toString().trim().toUpperCase();
              } catch (e) { /* ignore per-field errors */ }
            });
            normalizedPayload.collateral_data = cd;
          }
        } catch (e) { /* non-fatal */ }

        try {
          // Uppercase any *_in_word or *_by_word fields before sending
          try { normalizedPayload = _uppercaseWordFieldsRecursive(normalizedPayload); } catch (e) {}
        } catch (e) {}
        try { console.log('Final normalizedPayload to be sent (BL):', normalizedPayload); } catch (e) {}
        return requestWithAuth({ method: 'post', url: `/api/${saveBase}/`, data: normalizedPayload, headers });
    };
    try {
      const res = await doSave(localStorage.getItem('access_token'));
      const savedContractNumber = contractNumber || initialContractNumber || '';
      const isUpdate = !!(editOnly || initialContractNumber || initialContractData);
      toast.success(t(isUpdate ? 'save_updated' : 'save_added'));
      // If backend returned updated AgreementAccess, pass it to onSaved so parent can update accessMap
      let returnedAA = null;
      try {
        returnedAA = res && res.data && res.data.agreement_access ? res.data.agreement_access : (res && res.agreement_access ? res.agreement_access : null);
      } catch (e) { returnedAA = null; }
      if (typeof onSaved === 'function') {
        try { onSaved(savedContractNumber, returnedAA); } catch (e) { console.warn('onSaved callback failed', e); }
      }
      // no automatic download on save; button now only saves data
    } catch (err) {
      const respData = err?.response?.data || {};
      const isTokenExpired = respData.code === 'token_not_valid' || (respData.messages && Array.isArray(respData.messages) && respData.messages.some(m => m.message && m.message.toLowerCase().includes('expired')));

      if (isTokenExpired) {
        try {
          const refresh = localStorage.getItem('refresh_token');
          if (!refresh) throw new Error('No refresh token available');
          const r = await axios.post(`${process.env.REACT_APP_API_BASE || ''}/api/token/refresh/`, { refresh });
          const newAccess = r.data.access;
          if (newAccess) {
            localStorage.setItem('access_token', newAccess);
            await doSave(newAccess);
            const savedContractNumberRetry = contractNumber || initialContractNumber || '';
            const isUpdate = !!(editOnly || initialContractNumber || initialContractData);
            toast.success(t(isUpdate ? 'save_updated' : 'save_added'), { className: 'toast-success' });
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
          const errMsg = t('session_expired');
          setError(errMsg);
          toast.error(errMsg);
        }
        } else {
          const resp = err?.response;
          const respData = resp?.data;
          let respText = '';
          try { respText = typeof respData === 'string' ? respData : JSON.stringify(respData || ''); } catch (e) { respText = String(respData || ''); }
          const bodyErr = resp?.data?.error || resp?.data?.message || '';
          const respLower = (String(bodyErr) + ' ' + respText).toLowerCase();
          if (resp) {
            const status = resp.status;
            // If backend returned duplicate contract error, show friendly toast
            if (status === 409 || respLower.includes('duplicate') || respLower.includes('already registered') || respLower.includes('already exists') || respLower.includes('unique')) {
              const dupMsg = t('duplicate_contract_exists');
              setError(dupMsg);
              try { toast.error(dupMsg); } catch (e) {}
            } else {
              const url = resp.request?.responseURL || resp.config?.url || 'unknown';
              let body = '';
              try { body = typeof resp.data === 'string' ? resp.data : JSON.stringify(resp.data); } catch (e) { body = String(resp.data); }
              const reason = (bodyErr && String(bodyErr)) || (body && String(body)) || String(status);
              const errMsg = t('failed_saving_contract_prefix') + reason.substring(0,200);
              setError(errMsg);
              toast.error(errMsg);
              console.error('Save error response:', resp);
            }
          } else {
            const errMsg = t('failed_save_data_prefix') + (err.message || 'unknown error');
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
      setContractData(prev => _uppercaseWordFieldsRecursive({ ...prev, ...initialContractData }));
    } catch (e) { console.warn('Failed to apply initialContractData to form', e); }
  }, [initialContractData, initialContractNumber]);

  const [contracts, setContracts] = useState([]);
  const [filteredContracts, setFilteredContracts] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleDeleteRow = async (row) => {
    if (!row || !row.contract_number) return;
    const ok = window.confirm(`Delete agreement ${row.contract_number}? This cannot be undone.`);
    if (!ok) return;
    try {
      setError('');
      await requestWithAuth({ method: 'delete', url: `/api/bl-agreement/?contract_number=${encodeURIComponent(row.contract_number)}` });
      toast.success('Record deleted');
      if (typeof onSaved === 'function') {
        try { await onSaved(); } catch (e) {}
      }
    } catch (err) {
      console.error('Delete failed', err);
      const msg = err?.response?.data?.error || t('delete_failed');
      setError(msg);
      toast.error(msg);
    }
  };
  const [showContractDropdown, setShowContractDropdown] = useState(false);
  const [branches, setBranches] = useState([]);
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [selectedDirector, setSelectedDirector] = useState('');
  React.useEffect(() => { if (inModal && (createOnly || editOnly) && !selectedDirector) setSelectedDirector('Supriyono'); }, [inModal, createOnly, editOnly]);
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
  // Required modal fields: three filter fields + date_of_delegated + agreement_date
  const isModalSaveAllowed = () => {
    if (!inModal) return true;
    const okFilter = (contractNumber && String(contractNumber).trim() !== '') && (selectedBranchId && String(selectedBranchId).trim() !== '') && (selectedDirector && String(selectedDirector).trim() !== '');
    const ad = headerFields && (headerFields.agreement_date || headerFields.agreement_date === 0) ? String(headerFields.agreement_date).trim() : '';
    const dod = headerFields && (headerFields.date_of_delegated || headerFields.date_of_delegated === 0) ? String(headerFields.date_of_delegated).trim() : '';
    return okFilter && ad !== '' && dod !== '';
  };
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
      const dayName = (getIndonesianDayName(iso) || '').toUpperCase();
      const dateWords = (getIndonesianDateInWords(iso) || '').toUpperCase();
      // Also keep SP3 date synchronized to the agreement date so SP3 follows agreement
      setHeaderFields(prev => ({ ...prev,
        agreement_day_in_word: dayName || prev.agreement_day_in_word || '',
        agreement_date_in_word: dateWords || prev.agreement_date_in_word || '',
        agreement_day_inword: dayName || prev.agreement_day_inword || '',
        agreement_date_inword: dateWords || prev.agreement_date_inword || '',
        sp3_date: iso || prev.sp3_date
      }));
    } catch (e) { /* ignore */ }
  }, [headerFields?.agreement_date]);

  // Ensure fields like *_in_word / *_by_word show uppercase in UI
  useEffect(() => {
    try {
      if (headerFields && typeof headerFields === 'object') {
        const u = _uppercaseWordFieldsRecursive(headerFields);
        if (JSON.stringify(u) !== JSON.stringify(headerFields)) setHeaderFields(u);
      }
    } catch (e) {}
  }, [headerFields]);
  // If in create/edit modal, ensure all text fields show uppercase immediately
  useEffect(() => {
    if (!(inModal && (createOnly || editOnly))) return;
    try {
      if (headerFields && typeof headerFields === 'object') {
        const u = _uppercaseAllStringsRecursive(headerFields);
        if (JSON.stringify(u) !== JSON.stringify(headerFields)) setHeaderFields(u);
      }
    } catch (e) {}
  }, [headerFields, inModal, createOnly, editOnly]);
  useEffect(() => {
    try {
      if (contractData && typeof contractData === 'object') {
        const u = _uppercaseWordFieldsRecursive(contractData);
        if (JSON.stringify(u) !== JSON.stringify(contractData)) setContractData(u);
      }
    } catch (e) {}
  }, [contractData]);
  useEffect(() => {
    if (!(inModal && (createOnly || editOnly))) return;
    try {
      if (contractData && typeof contractData === 'object') {
        const u = _uppercaseAllStringsRecursive(contractData);
        if (JSON.stringify(u) !== JSON.stringify(contractData)) setContractData(u);
      }
    } catch (e) {}
  }, [contractData, inModal, createOnly, editOnly]);
  useEffect(() => {
    try {
      if (bmData && typeof bmData === 'object') {
        const u = _uppercaseWordFieldsRecursive(bmData);
        if (JSON.stringify(u) !== JSON.stringify(bmData)) setBmData(u);
      }
    } catch (e) {}
  }, [bmData]);
  useEffect(() => {
    if (!(inModal && (createOnly || editOnly))) return;
    try {
      if (bmData && typeof bmData === 'object') {
        const u = _uppercaseAllStringsRecursive(bmData);
        if (JSON.stringify(u) !== JSON.stringify(bmData)) setBmData(u);
      }
    } catch (e) {}
  }, [bmData, inModal, createOnly, editOnly]);
  useEffect(() => {
    try {
      if (collateralData && typeof collateralData === 'object') {
        const u = _uppercaseWordFieldsRecursive(collateralData);
        if (JSON.stringify(u) !== JSON.stringify(collateralData)) setCollateralData(u);
      }
    } catch (e) {}
  }, [collateralData]);
  useEffect(() => {
    if (!(inModal && (createOnly || editOnly))) return;
    try {
      if (collateralData && typeof collateralData === 'object') {
        const u = _uppercaseAllStringsRecursive(collateralData);
        if (JSON.stringify(u) !== JSON.stringify(collateralData)) setCollateralData(u);
      }
    } catch (e) {}
  }, [collateralData, inModal, createOnly, editOnly]);

  useEffect(() => {
    if (!(inModal && createOnly)) return;
    try {
      if (branchData && typeof branchData === 'object') {
        const u = _uppercaseAllStringsRecursive(branchData);
        if (JSON.stringify(u) !== JSON.stringify(branchData)) setBranchData(u);
      }
    } catch (e) {}
  }, [branchData, inModal, createOnly]);

  useEffect(() => {
    if (!(inModal && createOnly)) return;
    try {
      if (extraFields && typeof extraFields === 'object') {
        const u = _uppercaseAllStringsRecursive(extraFields);
        if (JSON.stringify(u) !== JSON.stringify(extraFields)) setExtraFields(u);
      }
    } catch (e) {}
  }, [extraFields, inModal, createOnly]);

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
      const words = (getIndonesianDateInWords(iso || raw) || '').toUpperCase();
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
  const [error, setError] = useState('');
  const [contractOnlySaving, setContractOnlySaving] = useState(false);
  const [contractOnlyError, setContractOnlyError] = useState('');

  const handleContractOnlySave = async () => {
    setContractOnlySaving(true); setContractOnlyError('');
    try {
      const token = localStorage.getItem('access_token'); const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const payload = {};
      Object.keys(contractData || {}).forEach((k) => {
        if (/_in_word$|_by_word$/.test(k)) return;
        let v = contractData[k];
        // Ensure Outstanding Previous Contract (`previous_topup_amount`) defaults to 0 when empty
        if (k === 'previous_topup_amount' && (v === undefined || v === null || v === '')) {
          v = 0;
        } else if (numericFields.includes(k) && v !== undefined && v !== null && v !== '') {
          const n = parseToNumber(v);
          v = n === null ? v : n;
        }
        payload[k] = v;
      });
      try { payload.created_by = usernameDisplay || '' } catch (e) { payload.created_by = ''; }
      const nowIso = new Date().toISOString(); payload.created_at = nowIso; payload.updated_at = nowIso;
      // Ensure previous_topup_amount is numeric (avoid sending empty string)
      try { payload.previous_topup_amount = Number(payload.previous_topup_amount) || 0; } catch (e) { payload.previous_topup_amount = 0; }
      // Ensure admin_rate defaults to 0 when empty and is numeric
      try { payload.admin_rate = getNumFromValue(payload.admin_rate); } catch (e) { payload.admin_rate = 0; }
      // Apply client-side normalization. For Add-Contract modal (contractOnly)
      // we will force ALL text fields to UPPERCASE and instruct backend to
      // skip server-side normalization so the casing is preserved.
      let normalizedContractPayload = payload;
      try {
        if (!contractOnly) {
          normalizedContractPayload = titleCasePayload(payload, numericFields);
        } else {
          // Uppercase recursively all string values in the payload
          const _uppercaseStringsRecursive = (val) => {
            if (val === null || typeof val === 'undefined') return val;
            if (typeof val === 'string') return val.toString().trim().toUpperCase();
            if (Array.isArray(val)) return val.map(_uppercaseStringsRecursive);
            if (typeof val === 'object') {
              const out = {};
              Object.keys(val).forEach(k => {
                try { out[k] = _uppercaseStringsRecursive(val[k]); } catch (e) { out[k] = val[k]; }
              });
              return out;
            }
            return val;
          };
          normalizedContractPayload = _uppercaseStringsRecursive(payload);
        }
      } catch (e) { /* non-fatal */ }
      // When saving via Add-Contract modal (contractOnly) instruct backend to skip normalization
      try { if (contractOnly) normalizedContractPayload.skip_normalization = true; } catch (e) { /* ignore */ }
      const res = await requestWithAuth({ method: 'post', url: '/api/contracts/', data: normalizedContractPayload });
      if (typeof onContractSaved === 'function') { try { onContractSaved(res.data || payload); } catch (e) { console.warn('onContractSaved failed', e); } }
    } catch (err) {
      console.error('Failed saving contract-only', err);
      const resp = err?.response;
      if (resp) {
        const status = resp.status;
        const bodyErr = resp.data?.error || resp.data?.message || '';
        if (status === 409 || (bodyErr && String(bodyErr).toLowerCase().includes('duplicate'))) {
          const msg = t('duplicate_contract_exists');
          try { toast.error(msg); } catch (e) {}
          setContractOnlyError(msg);
        } else {
          const url = resp.request?.responseURL || resp.config?.url || 'unknown';
          let body = '';
          try { body = typeof resp.data === 'string' ? resp.data : JSON.stringify(resp.data); } catch (e) { body = String(resp.data); }
          const reason = (bodyErr && String(bodyErr)) || (body && String(body)) || String(status);
          const errMsg = t('failed_saving_contract_prefix') + reason.substring(0,200);
          setContractOnlyError(errMsg);
          try { toast.error(errMsg); } catch (e) {}
          console.error('Contract-only save response:', resp);
        }
      } else {
        const msg = t('failed_saving_contract_prefix') + (err.message || 'unknown error');
        setContractOnlyError(msg);
        try { toast.error(msg); } catch (e) { /* ignore toast errors */ }
      }
    } finally { setContractOnlySaving(false); }
  };

  const bmFields = [
    'name_of_bm','place_birth_of_bm','date_birth_of_bm','date_birth_of_bm_in_word',
    'street_of_bm','subdistrict_of_bm','district_of_bm','city_of_bm','province_of_bm',
    'nik_number_of_bm'
  ];

  const branchFields = ['street_name','subdistrict','district','city','province','phone_number_branch'];

  const collateralFields = [
    'collateral_type','number_of_certificate','number_of_ajb','surface_area','name_of_collateral_owner','capacity_of_building','location_of_land'
  ];

  const numericFields = ['loan_amount','notaris_fee','admin_fee','admin_rate','net_amount','previous_topup_amount','mortgage_amount','tlo','life_insurance',
    'stamp_amount','financing_agreement_amount','security_agreement_amount','upgrading_land_rights_amount','total_amount'];
  const rateFields = ['flat_rate'];

  // Helper: normalize numeric input strings to preserve decimal separator when pasted
  // More robust: strip stray characters, detect decimal separator by last occurrence,
  // collapse multiple grouping separators and ensure only one decimal point remains.
  const normalizeNumericInput = (input) => {
    if (input === null || input === undefined) return '';
    let s = String(input).trim();
    if (s === '') return '';

    // Keep only digits, dot, comma, minus and whitespace
    s = s.replace(/[^0-9.,\s-]/g, '').trim();

    // Remove spaces inside number (some locales use non-breaking spaces as thousands separators)
    s = s.replace(/\s+/g, '');

    const hasDot = s.indexOf('.') >= 0;
    const hasComma = s.indexOf(',') >= 0;

    if (hasDot && hasComma) {
      // Decide which is the decimal separator by which appears last
      const lastDot = s.lastIndexOf('.');
      const lastComma = s.lastIndexOf(',');
      if (lastDot > lastComma) {
        // dot is decimal separator: remove all commas
        s = s.replace(/,/g, '');
        // if multiple dots exist, keep only the last as decimal separator
        const parts = s.split('.');
        if (parts.length > 2) {
          const dec = parts.pop();
          s = parts.join('') + '.' + dec;
        }
      } else {
        // comma is decimal separator: remove all dots then convert comma to dot
        s = s.replace(/\./g, '');
        const parts = s.split(',');
        if (parts.length > 2) {
          const dec = parts.pop();
          s = parts.join('') + ',' + dec;
        }
        s = s.replace(/,/g, '.');
      }
    } else if (hasComma && !hasDot) {
      const parts = s.split(',');
      const last = parts[parts.length - 1];
      if (last.length === 2) {
        // treat comma as decimal separator
        const dec = parts.pop();
        s = parts.join('') + '.' + dec;
      } else {
        // remove all commas (thousands separators)
        s = s.replace(/,/g, '');
      }
    } else if (hasDot && !hasComma) {
      const parts = s.split('.');
      const last = parts[parts.length - 1];
      if (last.length === 2) {
        // dot as decimal separator: keep last as decimal and collapse others
        const dec = parts.pop();
        s = parts.join('') + '.' + dec;
      } else if (parts.length > 1) {
        // dots used as thousands separators
        s = s.replace(/\./g, '');
      }
    }

    // Remove leading zeros but preserve single zero or decimals like 0.50
    s = s.replace(/^(-?)0+(?=\d)/, '$1');

    return s;
  };

  const parseToNumber = (input) => {
    const norm = normalizeNumericInput(input);
    if (norm === '' || norm === null || typeof norm === 'undefined') return null;
    const n = Number(norm);
    return Number.isNaN(n) ? null : n;
  };

  const getNumFromValue = (v) => {
    if (v === undefined || v === null || v === '') return 0;
    const n = parseToNumber(v);
    return n === null ? 0 : n;
  };

  // Urutan field contract data untuk ditampilkan di modal create/edit BL Agreement. Urutan ini tidak memengaruhi urutan di template PDF, yang diatur terpisah di backend.
  const contractFields = [
    // Identitiy debtor
    'contract_number','nik_number_of_debtor','name_of_debtor','place_birth_of_debtor','date_birth_of_debtor','date_birth_of_debtor_in_word',
    'business_partners_relationship','business_type','street_of_debtor','subdistrict_of_debtor','district_of_debtor','city_of_debtor','province_of_debtor',
    'phone_number_of_debtor',
    // Bank fields
    'bank_account_number','name_of_bank','name_of_account_holder','virtual_account_number',
    // Previous contract
    'topup_contract','previous_topup_amount',
    // New numeric fields to show in create-contract modal
    'loan_amount','loan_amount_in_word',
    'flat_rate','flat_rate_by_word',
    'term','term_by_word',
    'admin_fee','admin_fee_in_word',
    'notaris_fee','notaris_fee_in_word',
    'admin_rate','admin_rate_in_word',
    'tlo','tlo_in_word',
    'stamp_amount','financing_agreement_amount','security_agreement_amount','upgrading_land_rights_amount',
    'life_insurance','life_insurance_in_word',
    'mortgage_amount','mortgage_amount_in_word',
    'total_amount','net_amount','net_amount_in_word'
  ];
  
  const hiddenForUV = new Set(['mortgage_amount', 'mortgage_amount_in_word']);
  const hiddenForBLCreate = new Set(['tlo', 'tlo_in_word','life_insurance_in_word', 'admin_rate', 'admin_rate_in_word']);

  const getVisibleContractFields = (forContractOnly = false) => {
    const shouldHide = forContractOnly || !!createOnly;
    if (!shouldHide) return contractFields;
    if (isUV) return contractFields.filter(f => !hiddenForUV.has(f));
    // If we're in create-only mode (BL create modal) but NOT in contract-only (Add Contract),
    // show only the `life_insurance` field. Do not alter the Add Contract modal behavior.
    if (createOnly && !forContractOnly) return contractFields.filter(f => f === 'life_insurance');
    return contractFields.filter(f => !hiddenForBLCreate.has(f));
  };

  const loadContracts = async () => {
    setLoadingContracts(true);
    const token = localStorage.getItem('access_token');
    if (!token) { setContracts([]); setLoadingContracts(false); return; }
    try {
      const response = await requestWithAuth({ method: 'get', url: '/api/bl-agreement/contracts/' });
      setContracts(response.data.contracts || []);
    } catch (err) {
      console.error('Error loading contracts:', err);
      if (!err.response || err.response.status !== 401) setError(t('failed_load_contracts'));
    } finally { setLoadingContracts(false); }
  };

  const loadBranches = async () => {
    setLoadingBranches(true);
    const token = localStorage.getItem('access_token');
    try {
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
      const branchRes = await requestWithAuth({ method: 'get', url: '/api/master-data/branches/', headers });
      const items = branchRes.data.branches || [];
      setBranches(items);
    } catch (err) {
      console.error('Error loading branches:', err);
      if (!err.response || err.response.status !== 401) setError(t('failed_load_branches'));
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

  // Perhitungan otomatis total_amount 
  useEffect(() => {
    try {
      const sum = getNumFromValue(contractData.stamp_amount)
        + getNumFromValue(contractData.financing_agreement_amount)
        + getNumFromValue(contractData.security_agreement_amount)
        + getNumFromValue(contractData.upgrading_land_rights_amount)
        + getNumFromValue(contractData.admin_fee)
        + getNumFromValue(contractData.life_insurance);
      if (String(contractData.total_amount || '') !== String(sum)) {
        setContractData(prev => ({ ...prev, total_amount: sum }));
      }
    } catch (e) { /* ignore */ }
  }, [contractData.stamp_amount, contractData.financing_agreement_amount, contractData.security_agreement_amount, contractData.upgrading_land_rights_amount, contractData.admin_fee, contractData.life_insurance]);

  // Perhitungan otomatis loan_amount
  useEffect(() => {
    try {
      const loan = getNumFromValue(contractData.loan_amount);
      const admin = getNumFromValue(contractData.admin_fee);
      const notaris = getNumFromValue(contractData.notaris_fee);
      const prevTop = getNumFromValue(contractData.previous_topup_amount);
      const net = loan - admin - notaris - prevTop;
      if (String(contractData.net_amount || '') !== String(net)) {
        setContractData(prev => ({ ...prev, net_amount: net }));
      }
    } catch (e) { /* ignore */ }
  }, [contractData.loan_amount, contractData.admin_fee, contractData.notaris_fee, contractData.previous_topup_amount]);

  // Auto-calculate mortgage_amount = loan_amount * 125%
  useEffect(() => {
    try {
      const loan = getNumFromValue(contractData.loan_amount);
      const mort = Math.round((loan * 1.25) * 100) / 100; // keep 2 decimals
      if (String(contractData.mortgage_amount || '') !== String(mort)) {
        setContractData(prev => ({ ...prev, mortgage_amount: mort }));
      }
    } catch (e) { /* ignore */ }
  }, [contractData.loan_amount]);

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
        const res = await requestWithAuth({ method: 'get', url: '/api/directors/', params: { id: selectedDirector, name: selectedDirector } });
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
      const res = await requestWithAuth({ method: 'get', url: '/api/directors/' });
      setDirectors(res.data.directors || []);
    } catch (err) {
      console.error('Error loading directors:', err);
      if (!err.response || err.response.status !== 401) setError(t('failed_load_directors'));
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
      province: sel.province ?? sel.province_of_bm ?? '',
      phone_number_branch: sel.phone_number_branch ?? ''
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
      const res = await requestWithAuth({ method: 'get', url: '/api/branch-manager/', params });
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
      console.log('handleView called with', { contract: cn, forCreate });
      const base = isUV ? 'uv-agreement' : 'bl-agreement';
      // mode=create â†’ fetch from source tables (contract + collateral); default â†’ fetch from agreement table
      const params = { contract_number: cn };
      if (forCreate || createOnly) { params.mode = 'create'; }
      const response = await requestWithAuth({ method: 'get', url: `/api/${base}/`, params });
      console.log('handleView response for', cn, response && response.data ? Object.keys(response.data) : response);

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
        const bmResp = !isCreateMode ? (response.data.branch_manager || {}) : {};
        if (!isCreateMode) {
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
          // For edit mode, prefer phone from branch_manager (bmResp) when available,
          // then fall back to agreement row (`blRow.phone_number_of_bm`), then branchResp.
          directBranchData.phone_number_branch = (bmResp && (bmResp.phone_number_of_bm !== undefined && bmResp.phone_number_of_bm !== null)) ? bmResp.phone_number_of_bm : ((blRow && (blRow.phone_number_of_bm !== undefined && blRow.phone_number_of_bm !== null)) ? blRow.phone_number_of_bm : (branchResp.phone_number_branch ?? ''));
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

        setContractData(_uppercaseWordFieldsRecursive(directContractData));
        try {
          // ensure mortgage_amount is populated immediately for modal/edit flows
          const loanVal = getNumFromValue(directContractData.loan_amount);
          const mortVal = Math.round((loanVal * 1.25) * 100) / 100;
          if (String(directContractData.mortgage_amount || '') !== String(mortVal)) {
            setContractData(prev => ({ ...prev, mortgage_amount: mortVal }));
          }
        } catch (e) { /* ignore */ }
        // In create mode, don't overwrite BM/branch â€” they come from branch dropdown selection
        if (!isCreateMode) {
          setBmData(_uppercaseWordFieldsRecursive(directBmData));
        }
        // Ensure branch selector is populated when editing (not creating) so top-level `branch_id` is sent
        if (!isCreateMode) {
          try {
            const branchResp = response.data.branch || {};
            const resolvedBranchId = branchResp?.id || branchResp?.branch_id || blRow?.branch_id || blRow?.branch || blRow?.branchId || '';
            if (resolvedBranchId) setSelectedBranchId(String(resolvedBranchId));
            try { console.log('handleView(edit): blRow.phone_number_of_bm=', blRow && blRow.phone_number_of_bm, 'branchResp.phone_number_branch=', branchResp.phone_number_branch); } catch (e) {}
          } catch (e) { /* ignore */ }
          setBranchData(directBranchData);
        }
        setCollateralData(_uppercaseWordFieldsRecursive(directCollateralData));
        const known = new Set([...contractFields, ...bmFields, ...branchFields, ...collateralFields, ...Object.keys(directHeader || {})]);
        const extras = {};
        Object.keys(blRow || {}).forEach(k => { if (!known.has(k) && k !== 'id') extras[k] = blRow[k]; });
        setExtraFields(extras);
        setHeaderFields(prev => _uppercaseWordFieldsRecursive({ ...prev, ...directHeader }));
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

      setContractData(_uppercaseWordFieldsRecursive(newContractData));
      try {
        // ensure mortgage_amount is populated immediately when viewing existing contract
        const loanVal2 = getNumFromValue(newContractData.loan_amount);
        const mortVal2 = Math.round((loanVal2 * 1.25) * 100) / 100;
        if (String(newContractData.mortgage_amount || '') !== String(mortVal2)) {
          setContractData(prev => ({ ...prev, mortgage_amount: mortVal2 }));
        }
      } catch (e) { /* ignore */ }
      setCollateralData(newCollateralData);
      if (!forCreate) setBmData(newBmData);

      // Branch data: only use from API response in non-create mode
      let newBranchData = { street_name: '', subdistrict: '', district: '', city: '', province: '' };
      if (!forCreate && !createOnly) {
        const branchResp = response.data.branch || {};
        const bmFromResp = response.data.branch_manager || {};
        newBranchData = {
          street_name: branchResp.street_name ?? '',
          subdistrict: branchResp.subdistrict ?? '',
          district: branchResp.district ?? '',
          city: branchResp.city ?? '',
          province: branchResp.province ?? '',
          // Prefer branch phone from branch_manager (bmFromResp), then debtor.d.phone_number_of_bm, then branchResp
          phone_number_branch: (bmFromResp && (bmFromResp.phone_number_of_bm !== undefined && bmFromResp.phone_number_of_bm !== null)) ? bmFromResp.phone_number_of_bm : ((d && (d.phone_number_of_bm !== undefined && d.phone_number_of_bm !== null)) ? d.phone_number_of_bm : (branchResp.phone_number_branch ?? ''))
        };
      }
      if (!forCreate) {
        try { console.log('handleView(non-edit): d.phone_number_of_bm=', d && d.phone_number_of_bm, 'branchResp.phone_number_branch=', response.data.branch && response.data.branch.phone_number_branch); } catch (e) {}
        setBranchData(newBranchData);
      }
      if (!forCreate) {
        if (selectedBranchId) {
          const branch = (branches || []).find(b => String(b.id) === String(selectedBranchId));
          if (branch) setHeaderFields(prev => ({ ...prev, place_of_agreement: branch.name ?? '' }));
        }
        if (selectedDirector) setHeaderFields(prev => ({ ...prev, name_of_director: selectedDirector }));
      }

      if (!response.data.debtor && !response.data.collateral) setError(t('data_not_found_contract'));
    } catch (err) {
      console.error('handleView Error for', cn, err);
      if (err.response?.status === 404) setError(t('data_not_found_contract')); else setError(err.response?.data?.error || t('failed_fetch_data'));
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
    // Prefer translation entries when available (reactive via `t` in component scope)
    try {
      const translated = (typeof t === 'function') ? t(f) : undefined;
      if (translated && translated !== f) return translated;
    } catch (e) { /* ignore translation errors and fall back */ }

    // Frontend-only override: rename BPKB field label — use translation key when possible
    if (f.toLowerCase().replace(/[^a-z0-9]/g, '') === 'namebpkbowner') return (typeof t === 'function') ? t('name_of_collateral_owner') : 'Collateral Owner';
    // preserve existing special-case: previous_topup_amount -> Outstanding Previous Contract (use translation key)
    if (f.startsWith('previous_topup_amount')) {
      return (typeof t === 'function') ? t('previous_topup_amount') : toTitleCase('Outstanding Previous Contract');
    }
    // preserve existing special-case: topup_contract -> Previous Contract (use translation key)
    if (f.startsWith('topup_contract')) {
      return (typeof t === 'function') ? t('topup_contract') : toTitleCase('Previous Contract');
    }

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
    if (typeof value === 'boolean') return t(value ? 'yes' : 'no');
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

  // lookup contract row directly from `contract` table (used by Add-Contract modal)
  const fetchContractLookup = async (cn) => {
    if (!cn || !String(cn).trim()) return {};
    try {
      const url = `/api/contracts/lookup/?contract_number=${encodeURIComponent(String(cn).trim())}`;
      const res = await requestWithAuth({ method: 'get', url });
      return res.data || {};
    } catch (err) {
      console.error('fetchContractLookup failed for', cn, err);
      return {};
    }
  };

  // handler for contract number changes inside the Add-Contract modal
  const handleContractNumberModalChange = async (value) => {
    try {
      // enforce max length for modal contract_number
      const v12 = String(value || '').slice(0, 12);
      setContractNumber(v12);
      setContractData(prev => ({ ...prev, contract_number: v12 }));
      // don't attempt lookup on every keystroke for short values (prevents overwriting typed input)
      const trimmed = String(value || '').trim();
      if (!trimmed) return;
      if (!inModal || !contractOnly) return;
      if (trimmed.length < 3) return; // require >=3 chars before lookup
      const data = await fetchContractLookup(trimmed);
      const c = data.contract || data || {};
      const mapped = {};
      contractFields.forEach((f) => {
        const v = findValueInObj(c, f);
        if (v !== undefined && v !== null && String(v).trim() !== '') mapped[f] = v;
      });
      // merge only found (non-empty) values to avoid wiping user's typed contract_number
      if (Object.keys(mapped).length) setContractData(prev => ({ ...prev, ...mapped }));
    } catch (e) {
      console.error('handleContractNumberModalChange failed', e);
    }
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
    try { console.debug('handleInputChange', section, field, value, 'len', (value || '').toString().length); } catch (e) { /* ignore logging errors */ }
    const uppercaseMode = !!(inModal && (createOnly || editOnly));
    if (section === 'bm') {
      if (String(field).toLowerCase().includes('nik')) {
        const raw = String(value || '').replace(/\D/g, '').slice(0,16);
        setBmData(prev => ({ ...prev, [field]: raw }));
      } else if (isDateFieldName(field)) {
        const iso = parseDateFromDisplay(value);
        setBmData(prev => ({ ...prev, [field]: iso }));
      } else {
        const outVal = (uppercaseMode && typeof value === 'string') ? String(value).toUpperCase() : value;
        setBmData(prev => ({ ...prev, [field]: outVal }));
      }
    }
    if (section === 'branch') {
      const outVal = (uppercaseMode && typeof value === 'string') ? String(value).toUpperCase() : value;
      setBranchData(prev => ({ ...prev, [field]: outVal }));
    }
    if (section === 'contract') {
      // Enforce max length for identifiers
      if (field === 'contract_number' || field === 'topup_contract') {
        value = String(value || '').slice(0, 12);
      }
      if (String(field).toLowerCase().includes('nik')) {
        const raw = String(value || '').replace(/\D/g, '').slice(0,16);
        setContractData(prev => ({ ...prev, [field]: raw }));
        // If in Add-Contract modal, attempt to auto-fill debtor/contract fields only when NIK is exactly 16 digits
        if (inModal && contractOnly && raw && raw.length === 16) {
          (async () => {
            try {
              // Try to find contract in cached `contracts` list first
              let found = (contracts || []).find(c => {
                const cand = ((c.debtor && (c.debtor.nik_number_of_debtor || c.debtor.nik)) || c.nik_number_of_debtor || c.debtor_nik || '').toString().replace(/\D/g, '');
                return cand && cand === raw;
              });
              if (found && (found.contract_number || found.contract)) {
                const cn = found.contract_number || (found.contract && (found.contract.contract_number || found.contract_number)) || '';
                if (cn) {
                  const data = await fetchContractLookup(cn);
                  const c = data.contract || data || {};
                  const mapped = {};
                  const nikFields = ['name_of_debtor','place_birth_of_debtor','date_birth_of_debtor','date_birth_of_debtor_in_word','business_partners_relationship','business_type','street_of_debtor','subdistrict_of_debtor','district_of_debtor','city_of_debtor','province_of_debtor','phone_number_of_debtor','bank_account_number','name_of_bank','name_of_account_holder'];
                  nikFields.forEach((f) => {
                    const v = findValueInObj(c, f);
                    if (v !== undefined && v !== null && String(v).trim() !== '') mapped[f] = v;
                  });
                  if (Object.keys(mapped).length) setContractData(prev => ({ ...prev, ...mapped }));
                }
                return;
              }
              // If not found in cache, try backend contract lookup by scanning contracts table
              // Backend lookup endpoint only supports contract_number, so fallback to pull contracts list and match
              try {
                const token = localStorage.getItem('access_token');
                const headers = token ? { Authorization: `Bearer ${token}` } : {};
                const resp = await requestWithAuth({ method: 'get', url: '/api/contracts/table/' });
                const items = resp.data?.contracts || resp.data || [];
                const matched = (items || []).find(it => {
                  const cand = ((it.debtor && (it.debtor.nik_number_of_debtor || it.debtor.nik)) || it.nik_number_of_debtor || it.debtor_nik || '').toString().replace(/\D/g, '');
                  return cand && cand === raw;
                });
                if (matched && (matched.contract_number || matched.contract)) {
                  const cn2 = matched.contract_number || (matched.contract && (matched.contract.contract_number || matched.contract_number)) || '';
                  if (cn2) {
                    const data2 = await fetchContractLookup(cn2);
                    const c2 = data2.contract || data2 || {};
                    const mapped2 = {};
                    const nikFields2 = ['name_of_debtor','place_birth_of_debtor','date_birth_of_debtor','date_birth_of_debtor_in_word','business_partners_relationship','business_type','street_of_debtor','subdistrict_of_debtor','district_of_debtor','city_of_debtor','province_of_debtor','phone_number_of_debtor','bank_account_number','name_of_bank','name_of_account_holder'];
                    nikFields2.forEach((f) => {
                      const v = findValueInObj(c2, f);
                      if (v !== undefined && v !== null && String(v).trim() !== '') mapped2[f] = v;
                    });
                    if (Object.keys(mapped2).length) setContractData(prev => ({ ...prev, ...mapped2 }));
                  }
                }
              } catch (e) { /* ignore table fetch errors */ }
            } catch (e) {
              console.error('NIK-based contract lookup failed', e);
            }
          })();
        }
        return;
      }
      if (rateFields.includes(field)) {
        const rateVal = String(value || '').replace(',', '.');
        setContractData(prev => ({ ...prev, [field]: rateVal }));
        return;
      }
      if (numericFields.includes(field)) {
        const raw = normalizeNumericInput(value || '');
        // update numeric field and recompute total_amount
        setContractData(prev => {
          const updated = { ...prev, [field]: raw };
          try {
            const sum = getNumFromValue(updated.stamp_amount)
              + getNumFromValue(updated.financing_agreement_amount)
              + getNumFromValue(updated.security_agreement_amount)
              + getNumFromValue(updated.upgrading_land_rights_amount)
              + getNumFromValue(updated.admin_fee)
              + getNumFromValue(updated.life_insurance);
            updated.total_amount = sum;
          } catch (e) { /* ignore */ }
          return updated;
        });
      } else {
        if (isDateFieldName(field)) {
          const iso = parseDateFromDisplay(value);
          setContractData(prev => ({ ...prev, [field]: iso }));
        } else {
          const outVal = (uppercaseMode && typeof value === 'string') ? String(value).toUpperCase() : value;
          setContractData(prev => ({ ...prev, [field]: outVal }));
        }
      }
    }
    if (section === 'collateral') {
      if (numericFields.includes(field)) {
        const raw = normalizeNumericInput(value || ''); setCollateralData(prev => ({ ...prev, [field]: raw }));
      } else {
        if (isDateFieldName(field)) {
          const iso = parseDateFromDisplay(value); setCollateralData(prev => ({ ...prev, [field]: iso }));
        } else {
          const outVal = (uppercaseMode && typeof value === 'string') ? String(value).toUpperCase() : value;
          setCollateralData(prev => ({ ...prev, [field]: outVal }));
        }
      }
    }
    if (section === 'header') {
      if (isDateFieldName(field)) {
        const iso = parseDateFromDisplay(value);
        setHeaderFields(prev => ({ ...prev, [field]: iso }));
      } else {
        const outVal = (uppercaseMode && typeof value === 'string') ? String(value).toUpperCase() : value;
        setHeaderFields(prev => ({ ...prev, [field]: outVal }));
      }
    }
  };

  

  // compact styles when rendered inside modal to better fit header
  const compact = !!inModal;
  const baseLabelStyle = compact ? { ...styles.label, fontSize: 12, marginBottom: 4 } : styles.label;
  const baseInputStyle = compact ? { ...styles.input, padding: '8px 10px', fontSize: 13, borderRadius: 4 } : styles.input;
  // Label/input styles (use base styles; modal chrome handled by CSS)
  let labelStyle = baseLabelStyle;
  let inputStyle = baseInputStyle;
  const readOnlyInputStyle = { backgroundColor: '#f5f5f5', border: '1px solid #e6e6e6', color: '#555', cursor: 'pointer' };
  const sectionPadding = compact ? 8 : 12;
  const h4Style = { marginTop: 0, fontSize: compact ? 14 : 16 };

  // Local label overrides for BL so changes are scoped to BL only
  const formatLabel = (f) => {
    if (!f) return '';
    if (f === 'notaris_fee') return t('notaris_fee');
    if (f === 'notaris_fee_in_word') return t('notaris_fee_in_word');
    if (f === 'flat_rate') return t('flat_rate');
    if (f === 'flat_rate_by_word') return t('flat_rate_by_word');
    return formatFieldName(f);
  };

  // Urutan field kontrak yang akan ditampilkan di form, pastikan `life_insurance` muncul di modal create BL (jika createOnly atau editOnly+inModal) dan tambahkan ke list jika belum ada
  const contractFieldList = [
    'name_of_debtor','place_birth_of_debtor','date_birth_of_debtor',
    'business_partners_relationship','business_type',
    'street_of_debtor','subdistrict_of_debtor','district_of_debtor','city_of_debtor','province_of_debtor',
    'nik_number_of_debtor','phone_number_of_debtor',
    'topup_contract','previous_topup_amount',
    'bank_account_number','name_of_bank','name_of_account_holder','virtual_account_number',
    'loan_amount','loan_amount_in_word',
    'flat_rate','flat_rate_by_word',
    'term','term_by_word',
    'admin_fee','admin_fee_in_word',
    'notaris_fee','notaris_fee_in_word',
    'admin_rate','admin_rate_in_word',
    'mortgage_amount',
    'stamp_amount','financing_agreement_amount','security_agreement_amount','upgrading_land_rights_amount',
    'total_amount',
    'net_amount','net_amount_in_word'];
  // Ensure `life_insurance` appears in create modal; add it to contractFieldList when createOnly && not contractOnly
  const effectiveContractFields = (() => {
    if ((createOnly || (inModal && editOnly)) && !contractOnly) {
      const arr = Array.from(contractFieldList);
      const idxLife = arr.indexOf('life_insurance');
      const idxStamp = arr.indexOf('stamp_amount');
      if (idxLife === -1) {
        if (idxStamp === -1) arr.push('life_insurance'); else arr.splice(idxStamp, 0, 'life_insurance');
      } else {
        // if life_insurance exists but positioned after stamp_amount, move it before stamp_amount
        if (idxStamp !== -1 && idxLife > idxStamp) {
          arr.splice(idxLife, 1);
          const newStampIdx = arr.indexOf('stamp_amount');
          arr.splice(newStampIdx, 0, 'life_insurance');
        }
      }
      return arr;
    }
    return contractFieldList;
  })();
  const renderContractField = (f) => {
    const isWordField = /(_in_word|_by_word)$/.test(f);
    const baseField = f.replace(/(_in_word|_by_word)$/, '');
    let value = '';
    if (isWordField) {
      if (/date|birth/i.test(baseField)) {
        value = getIndonesianDateInWords(contractData[baseField]) || contractData[f] || '';
      } else {
        const n = Number(contractData[baseField] || 0) || 0;
        value = (n === 0) ? '' : (getIndonesianNumberWord(n) || contractData[f] || '');
      }
      // ensure display is UPPERCASE for "in_word"/"by_word" fields
      value = (value === null || typeof value === 'undefined') ? '' : String(value).toUpperCase();
      return (
        <div key={f} style={{ display: 'flex', flexDirection: 'column' }}>
          <label style={labelStyle}>{formatLabel(f)}</label>
          <input type="text" placeholder="" style={inputStyle} value={value} disabled />
        </div>
      );
    }
    const isNumericField = /amount|loan|mortgage|previous_topup_amount|notaris_fee|admin_fee|tlo|stamp_amount|financing_agreement_amount|security_agreement_amount|upgrading_land_rights_amount|net_amount|total_amount|life_insurance/i.test(f) || numericFields.includes(f);
    if (isNumericField) {
      const isReadOnly = (f === 'total_amount' || f === 'net_amount' || f === 'mortgage_amount');
      return (
        <div key={f} style={{ display: 'flex', flexDirection: 'column' }}>
          <label style={labelStyle}>{formatLabel(f)}</label>
          <input
            type="text"
            value={formatNumberWithDots(contractData[f])}
            readOnly={isReadOnly}
            onChange={isReadOnly ? undefined : (e) => {
              const raw = normalizeNumericInput(e.target.value || '');
              handleInputChange('contract', f, raw);
            }}
            onPaste={isReadOnly ? undefined : (e) => {
              try {
                e.preventDefault();
                const text = (e.clipboardData && e.clipboardData.getData) ? e.clipboardData.getData('text') : (window.clipboardData ? window.clipboardData.getData('Text') : '');
                const raw = normalizeNumericInput(text || '');
                handleInputChange('contract', f, raw);
              } catch (err) { /* ignore paste errors */ }
            }}
            style={isReadOnly ? { ...inputStyle, ...readOnlyInputStyle } : inputStyle}
          />
        </div>
      );
    }
    const inputType = isDateFieldName(f) ? 'date' : 'text';
    const isNikField = /nik/i.test(f);
        const maxLen = isNikField ? 16 : (f === 'contract_number' || f === 'topup_contract' ? 12 : undefined);
        return (
      <div key={f} style={{ display: 'flex', flexDirection: 'column' }}>
        <label style={labelStyle}>{formatLabel(f)}</label>
        <input
          type={inputType}
          value={rateFields.includes(f) ? String(contractData[f] || '').replace('.', ',') : (contractData[f] ?? '')}
          onChange={(e) => {
            let v = e.target.value;
            if (rateFields.includes(f)) {
              v = String(v || '').replace('.', ',');
            }
            if (f === 'contract_number' && inModal && contractOnly) {
              handleContractNumberModalChange(v);
            } else {
              handleInputChange('contract', f, v);
            }
          }}
          inputMode={isNikField ? 'numeric' : undefined}
          pattern={isNikField ? "\\d*" : undefined}
          maxLength={maxLen}
          style={inputStyle}
        />
      </div>
    );
  };

  if (contractOnly) {
    const visibleContractFields = getVisibleContractFields(true);
    // Use default order as defined in `contractFieldList` (preserve original order)
    const visibleOrdered = visibleContractFields;

    // Use same styles as the Add Collateral modal
    const fieldLabelStyleLocal = { fontSize: 13, fontWeight: 600, color: '#333', marginBottom: 6 };
    const fieldInputStyleLocal = { padding: '10px 12px', fontSize: 14, border: '1px solid #ddd', borderRadius: 6, outline: 'none', width: '100%', boxSizing: 'border-box' };
    const fieldGroupStyleLocal = { display: 'flex', flexDirection: 'column' };

    // Determine which fields are required in this modal (exclude virtual_account_number, topup_contract,
    // previous_topup_amount and intentionally do not mark `admin_rate` as required)
    const requiredFields = visibleOrdered.filter(f => !['virtual_account_number', 'topup_contract', 'admin_rate', 'previous_topup_amount'].includes(f) && !/_in_word$|_by_word$/.test(f));

    // compute handling fee (stamp + financing + security + upgrading)
    const handlingFee = getNumFromValue(contractData.stamp_amount)
      + getNumFromValue(contractData.financing_agreement_amount)
      + getNumFromValue(contractData.security_agreement_amount)
      + getNumFromValue(contractData.upgrading_land_rights_amount);
    const notarisFeeValue = getNumFromValue(contractData.notaris_fee);
    const showHandlingMismatch = (contractData.notaris_fee !== undefined && contractData.notaris_fee !== null && String(contractData.notaris_fee).toString().trim() !== '') && (notarisFeeValue !== handlingFee);

    return (
      <div style={{ padding: 20, minWidth: 560 }}>
        {/* contractOnlyError rendered as toast only; modal inline message removed */}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {visibleOrdered.map((f) => {
            const isWordField = /(_in_word|_by_word)$/.test(f);
            const baseField = f.replace(/(_in_word|_by_word)$/, '');
            if (isWordField) {
              let value = '';
              if (/date|birth/i.test(baseField)) {
                value = getIndonesianDateInWords(contractData[baseField]) || contractData[f] || '';
              } else {
                const raw = contractData[baseField];
                if (raw === '' || raw === null || raw === undefined) {
                  value = contractData[f] || '';
                } else {
                  const n = Number(String(raw).replace(/\./g, '').replace(/,/g, '.')) || 0;
                  value = (n === 0) ? '' : (getIndonesianNumberWord(String(raw)) || contractData[f] || '');
                }
              }
              return (
                <div key={f} style={fieldGroupStyleLocal}>
                  <label style={fieldLabelStyleLocal}>
                    {formatLabel(f)}{requiredFields.includes(f) ? <span style={{ color: '#a33', marginLeft: 6 }}>*</span> : null}
                  </label>
                  <input type="text" placeholder="" style={fieldInputStyleLocal} value={(value === null || typeof value === 'undefined') ? '' : String(value).toUpperCase()} disabled />
                </div>
              );
            }

            if (f === 'business_partners_relationship') {
              return (
                <div key={f} style={fieldGroupStyleLocal}>
                  <label style={fieldLabelStyleLocal}>
                    {formatLabel(f)}{requiredFields.includes(f) ? <span style={{ color: '#a33', marginLeft: 6 }}>*</span> : null}
                  </label>
                  <select
                    value={contractData[f] ?? ''}
                    onChange={(e) => handleInputChange('contract', f, e.target.value)}
                    style={fieldInputStyleLocal}
                  >
                    <option value="">-- Select Relationship --</option>
                    <option value="SUAMI">SUAMI</option>
                    <option value="ISTRI">ISTRI</option>
                    <option value="ANAK KANDUNG">ANAK KANDUNG</option>
                    <option value="SAUDARA KANDUNG">SAUDARA KANDUNG</option>
                    <option value="ORANGTUA">ORANGTUA</option>
                  </select>
                </div>
              );
            }

            const isNumericField = /amount|loan|mortgage|previous_topup_amount|notaris_fee|admin_fee|tlo|stamp_amount|financing_agreement_amount|security_agreement_amount|upgrading_land_rights_amount|net_amount|total_amount|life_insurance/i.test(f) || numericFields.includes(f);
            if (isNumericField) {
                const isReadOnly = (f === 'total_amount' || f === 'net_amount' || f === 'mortgage_amount');
              return (
                <div key={f} style={fieldGroupStyleLocal}>
                  <label style={fieldLabelStyleLocal}>
                    {formatLabel(f)}{requiredFields.includes(f) ? <span style={{ color: '#a33', marginLeft: 6 }}>*</span> : null}
                  </label>
                  <input
                    type="text"
                    value={formatNumberWithDots(contractData[f])}
                    readOnly={isReadOnly}
                    onChange={isReadOnly ? undefined : (e) => {
                      const raw = normalizeNumericInput(e.target.value || '');
                      handleInputChange('contract', f, raw);
                    }}
                    onPaste={isReadOnly ? undefined : (e) => {
                      try {
                        e.preventDefault();
                        const text = (e.clipboardData && e.clipboardData.getData) ? e.clipboardData.getData('text') : (window.clipboardData ? window.clipboardData.getData('Text') : '');
                        const raw = normalizeNumericInput(text || '');
                        handleInputChange('contract', f, raw);
                      } catch (err) { /* ignore paste errors */ }
                    }}
                    style={isReadOnly ? { ...fieldInputStyleLocal, ...readOnlyInputStyle } : fieldInputStyleLocal}
                  />
                </div>
              );
            }

            const inputType = isDateFieldName(f) ? 'date' : 'text';
            const isNikField = /nik/i.test(f);
            const maxLenLocal = isNikField ? 16 : (f === 'contract_number' || f === 'topup_contract' ? 12 : undefined);
            return (
              <div key={f} style={fieldGroupStyleLocal}>
                <label style={fieldLabelStyleLocal}>
                  {formatLabel(f)}{requiredFields.includes(f) ? <span style={{ color: '#a33', marginLeft: 6 }}>*</span> : null}
                </label>
                <input
                  type={inputType}
                  value={rateFields.includes(f) ? String(contractData[f] || '').replace('.', ',') : (contractData[f] ?? '')}
                  onChange={(e) => {
                    let v = e.target.value;
                    if (rateFields.includes(f)) {
                      v = String(v || '').replace('.', ',');
                    }
                    if (f === 'contract_number' && inModal && contractOnly) {
                      handleContractNumberModalChange(v);
                    } else {
                      handleInputChange('contract', f, v);
                    }
                  }}
                  inputMode={isNikField ? 'numeric' : undefined}
                  pattern={isNikField ? "\\d*" : undefined}
                  maxLength={maxLenLocal}
                  style={fieldInputStyleLocal}
                />
              </div>
            );
          })}
        </div>

        <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-start', alignItems: 'flex-start', flexDirection: 'column', width: '100%' }}>
          <div style={{ fontSize: 10, color: '#333', fontWeight: 600 }}>
            {(typeof t === 'function') ? t('handling_processing_fee') : 'Handling/Processing Fee'} : <span style={{ fontWeight: 700 }}>{formatNumberWithDots(handlingFee)}</span>
          </div>
          {showHandlingMismatch ? (
            <div style={{ marginTop: 8, backgroundColor: '#f8d7da', color: '#721c24', padding: '8px 10px', borderRadius: 4, alignSelf: 'center', width: '100%', textAlign: 'center' }}>
              {(typeof t === 'function') ? t('handling_fee_mismatch') : 'Nilai Handling/Processing Fee tidak sesuai'}
            </div>
          ) : null}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
          <button className="btn-save" onClick={handleContractOnlySave} disabled={contractOnlySaving || !(() => {
            try {
              const visibleContractFields = getVisibleContractFields(true);
              const bankFieldsOrder = ['bank_account_number', 'name_of_bank', 'name_of_account_holder'];
              let visibleOrderedLocal = visibleContractFields.filter(f => !bankFieldsOrder.includes(f));
              const insertIdxLocal = visibleOrderedLocal.indexOf('business_type');
              const banksToInsertLocal = bankFieldsOrder.filter(f => visibleContractFields.includes(f));
              if (insertIdxLocal >= 0) visibleOrderedLocal.splice(insertIdxLocal + 1, 0, ...banksToInsertLocal); else if (banksToInsertLocal.length) visibleOrderedLocal = visibleOrderedLocal.concat(banksToInsertLocal);
              const requiredFieldsLocal = visibleOrderedLocal.filter(f => !['virtual_account_number', 'topup_contract', 'admin_rate', 'previous_topup_amount'].includes(f) && !/_in_word$|_by_word$/.test(f));
              return requiredFieldsLocal.every((ff) => { const v = contractData[ff]; if (v === undefined || v === null) return false; if (typeof v === 'string') return v.trim() !== ''; return true; });
            } catch (e) { return true; }
          })()}>{contractOnlySaving ? 'Saving...' : 'Save Contract'}</button>
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
            <h4 style={h4Style}>{t('filter')}</h4>
              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: '#333', marginBottom: 6 }}>{t('contract_number')}{inModal && <span style={{ color: '#a33', marginLeft: 6 }}>*</span>}</label>
                  <input placeholder={t('contract_number')} value={contractNumber} onChange={(e) => handleContractNumberChange(e.target.value)} style={inputStyle} />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: '#333', marginBottom: 6 }}>{t('branch')}{inModal && <span style={{ color: '#a33', marginLeft: 6 }}>*</span>}</label>
                  <select value={selectedBranchId || ''} onChange={(e) => { setSelectedBranchId(e.target.value); handleBranchSelectLoad(e.target.value); }} style={inputStyle}>
                    <option value="">{t('-- Select Branch --') || '-- Select Branch --'}</option>
                    {(branches || []).map(b => <option key={b.id} value={b.id}>{b.name || b.branch_name || b.city || b.id}</option>)}
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: '#333', marginBottom: 6 }}>{t('director')}{inModal && <span style={{ color: '#a33', marginLeft: 6 }}>*</span>}</label>
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
          </div>

          {/* Agreement Detail container (compact when in modal) */}
          <div style={inModal ? { marginTop: 12 } : { marginTop: 12, border: '1px solid #e6e6e6', padding: sectionPadding, borderRadius: 6 }}>
            <h4 style={h4Style}>{t('agreement_detail')}</h4>
              <div style={{ display: 'grid', gridTemplateColumns: inModal ? '1fr 1fr' : '1fr 1fr 1fr', gap: 8 }}>
                {(() => {
                  const modalOrder = ['place_of_agreement','date_of_delegated','agreement_date','sp3_number','name_of_director','phone_number_of_lolc'];
                  const normalOrder = ['place_of_agreement','agreement_date','agreement_day_in_word','agreement_date_in_word','sp3_date','sp3_number','date_of_delegated','name_of_director','phone_number_of_lolc'];
                  const order = inModal ? modalOrder : normalOrder;
                  return order.map(f => (
                    <div key={f} style={{ display: 'flex', flexDirection: 'column' }}>
                      <label style={labelStyle}>{formatLabel(f)}{inModal && (f === 'agreement_date' || f === 'date_of_delegated') && <span style={{ color: '#a33', marginLeft: 6 }}>*</span>}</label>
                      {/_in_word$|_by_word$/.test(f) ? (
                        (() => {
                          const base = f.replace(/(_in_word|_by_word)$/, '');
                          let val = '';
                          if (/date|birth/i.test(base)) {
                            val = getIndonesianDateInWords(headerFields[base]) || headerFields[f] || '';
                          } else {
                            const n = Number(headerFields[base] || 0) || 0;
                            val = (n === 0) ? '' : (getIndonesianNumberWord(n) || headerFields[f] || '');
                          }
                          return <input type="text" value={(val === null || typeof val === 'undefined') ? '' : String(val).toUpperCase()} disabled style={{ ...inputStyle, backgroundColor: '#f5f5f5' }} />;
                        })()
                      ) : (
                        <input type={/(^(agreement_date|date_of_delegated)$|_date$|^sp3_date$)/i.test(f) ? 'date' : 'text'} value={headerFields[f] ?? ''} onChange={(e) => handleInputChange('header', f, e.target.value)} style={inputStyle} />
                      )}
                    </div>
                  ));
                })()}
              </div>
          </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
            {/* Contract container */}
            <div style={inModal ? {} : { border: '1px solid #e6e6e6', padding: sectionPadding, borderRadius: 6 }}>
              <h4 style={h4Style}>{t('tab_contract') || t('contract')}</h4>
              <div style={{ display: 'grid', gridTemplateColumns: inModal ? '1fr 1fr' : '1fr 1fr 1fr', gap: 8 }}>
                {(inModal ? getVisibleContractFields(true) : effectiveContractFields).map(renderContractField)}
              </div>
            </div>

            {/* Collateral container */}
            <div style={inModal ? {} : { border: '1px solid #e6e6e6', padding: sectionPadding, borderRadius: 6 }}>
              <h4 style={h4Style}>{t('collateral')}</h4>
              <div style={{ display: 'grid', gridTemplateColumns: inModal ? '1fr 1fr' : '1fr 1fr 1fr', gap: 8 }}>
                {['collateral_type','number_of_certificate','number_of_ajb','surface_area','name_of_collateral_owner','capacity_of_building','location_of_land'].map(f => (
                  <div key={f} style={{ display: 'flex', flexDirection: 'column' }}>
                    <label style={labelStyle}>{formatLabel(f)}</label>
                    <input
                      type={numericFields.includes(f) ? 'number' : 'text'}
                      value={collateralData[f] ?? ''}
                      onChange={(e) => handleInputChange('collateral', f, e.target.value)}
                      onPaste={(e) => {
                        try {
                          e.preventDefault();
                          const text = (e.clipboardData && e.clipboardData.getData) ? e.clipboardData.getData('text') : (window.clipboardData ? window.clipboardData.getData('Text') : '');
                          const raw = normalizeNumericInput(text || '');
                          handleInputChange('collateral', f, raw);
                        } catch (err) { /* ignore */ }
                      }}
                      style={inputStyle}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16, marginTop: 12 }}>
          {/* Branch Manager */}
          <div style={inModal ? {} : { border: '1px solid #e6e6e6', padding: sectionPadding, borderRadius: 6 }}>
            <h4 style={h4Style}>{t('tab_branch_manager') || t('name_of_bm')}</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {['name_of_bm','place_birth_of_bm','date_birth_of_bm','date_birth_of_bm_in_word','nik_number_of_bm','street_of_bm','subdistrict_of_bm','district_of_bm','city_of_bm','province_of_bm'].map(f => (
                  <div key={f} style={{ display: 'flex', flexDirection: 'column' }}>
                    <label style={labelStyle}>{formatLabel(f)}</label>
                      {f === 'date_birth_of_bm_in_word' ? (
                      (() => { const base = 'date_birth_of_bm'; const val = getIndonesianDateInWords(bmData[base]) || bmData[f] || ''; return <input type="text" value={(val === null || typeof val === 'undefined') ? '' : String(val).toUpperCase()} disabled style={{ ...inputStyle, backgroundColor: '#f5f5f5' }} /> })()
                    ) : (
                      <input type={/date/i.test(f) ? 'date' : 'text'} value={bmData[f] ?? ''} onChange={(e) => handleInputChange('bm', f, e.target.value)} style={inputStyle} />
                    )}
                  </div>
                ))}
            </div>
          </div>

          {/* Branches */}
          <div style={inModal ? {} : { border: '1px solid #e6e6e6', padding: sectionPadding, borderRadius: 6 }}>
            <h4 style={h4Style}>{t('tab_branches') || t('branch')}</h4>
            <div style={{ display: 'grid', gridTemplateColumns: inModal ? '1fr 1fr' : '1fr', gap: 8 }}>
              {branchFields.map(f => (
                <div key={f} style={{ display: 'flex', flexDirection: 'column' }}>
                  <label style={labelStyle}>{(t(f) && t(f) !== f) ? t(f) : formatLabel(f)}</label>
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
          <button style={{ ...styles.btnPrimary, minWidth: 120 }} onClick={handleSave} disabled={saving || (inModal && !isModalSaveAllowed())}>{saving ? 'Saving...' : (createOnly ? 'Save Document' : ((editOnly || initialContractNumber) ? 'Update' : 'Save'))}</button>
        </div>
      </div>
    </div>
  );
}

//  Thin wrappers 

function BLCreateForm(props = {}) {
  return React.createElement(BLAgreementForm, Object.assign({}, props, { createOnly: true, editOnly: false, hideFilter: false, hideHeader: false, isUV: false }));
}

function BLEditForm({ initialContractNumber = '', onSaved, ...rest } = {}) {
  return React.createElement(BLAgreementForm, Object.assign({ initialContractNumber: initialContractNumber, onSaved: onSaved, createOnly: false, editOnly: true, hideFilter: true, hideHeader: true, isUV: false, inModal: true }, rest || {}));
}

// Named exports for backward compatibility
export { BLCreateForm as BLAgreementCreate };
export { BLEditForm as BLAgreementEdit };

//  Page Component 

export default function BLAgreement() {
  const [agreements, setAgreements] = useState([]);
  const [accessMap, setAccessMap] = useState({});
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

  // Determine if current user is Admin (used to control Delete button visibility)
  let isAdmin = false;
  try {
    const rawUser = localStorage.getItem('user_data');
    if (rawUser) {
      const ud = JSON.parse(rawUser);
      const role = (ud.role || ud.role_name || '').toString().toLowerCase();
      if (role.includes('admin')) isAdmin = true;
      // additional role flags used to control visibility of create/add buttons
      var isCsa = role.includes('csa');
      var isBod = role.includes('bod');
      var isAudit = role.includes('audit');
    }
  } catch (e) { /* ignore */ }
  // Require all visible collateral fields in the BL add-collateral modal
  const requiredCollateralFields = ['contract_number','name_of_debtor','collateral_type','number_of_certificate','number_of_ajb','surface_area','name_of_collateral_owner','capacity_of_building','location_of_land'];
  const isCollateralFormValid = () => {
    for (const f of requiredCollateralFields) {
      const v = collateralForm[f];
      if (v === undefined || v === null) return false;
      if (String(v).trim() === '') return false;
    }
    return true;
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);

  const visibleAgreements = (() => {
    const q = (searchQuery || '').toString().trim().toLowerCase();
    if (!q) return agreements || [];
    return (agreements || []).filter((r) => {
      const hay = `${r.contract_number || ''} ${r.name_of_debtor || ''} ${r.nik_number_of_debtor || ''}`.toLowerCase();
      return hay.includes(q);
    });
  })();

  const totalCount = (visibleAgreements || []).length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const pagedAgreements = visibleAgreements.slice((page - 1) * pageSize, (page - 1) * pageSize + pageSize);

  // Additional fields for Create Document modal
  const [agreementData, setAgreementData] = useState({ agreement_date: '', agreement_type: '' });
  const [branchManager, setBranchManager] = useState('');
  const [branchData, setBranchData] = useState({ branch_name: '', branch_code: '' });
  const [contractData, setContractData] = useState({ contract_date: '', contract_amount: '' });

  

  // requestWithAuth moved to `utils/api.js`

  // Gaya field form lokal agar sesuai dengan form lain
  const fieldLabelStyle = { fontSize: 13, fontWeight: 600, color: '#333', marginBottom: 6 };
  const fieldInputStyle = { padding: '10px 12px', fontSize: 14, border: '1px solid #ddd', borderRadius: 6, outline: 'none', width: '100%', boxSizing: 'border-box' };
  const fieldGroupStyle = { display: 'flex', flexDirection: 'column' };

  useEffect(() => { loadAgreements(); }, []);

  const loadAgreements = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await requestWithAuth({ method: 'get', url: '/api/bl-agreement/' });
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
      // After loading agreements, fetch access records for CSA-created items for current user
      try {
        const rawUser = localStorage.getItem('user_data');
        let currentUsername = null; let currentRole = null;
        if (rawUser) {
          const ud = JSON.parse(rawUser);
          currentUsername = ud.username || ud.user || ud.full_name || null;
          currentRole = (ud.role || ud.role_name || '').toString().toLowerCase();
        }
        if (currentRole && currentRole.includes('csa')) {
          rows.forEach(r => {
            try {
              if (r.created_by && String(r.created_by) === String(currentUsername) && r.contract_number) {
                // fetch access only if not already fetched
                if (!accessMap[r.contract_number]) {
                  fetchAccessForContract(r.contract_number).catch(e => {});
                }
              }
            } catch (e) {}
          });
        }
      } catch (e) {}
    } catch (err) {
      console.error('Error loading agreements', err);
      setError(t('failed_load_contracts'));
    } finally {
      setLoading(false);
    }
  };

  const fetchAccessForContract = async (contractNumber) => {
    if (!contractNumber) return null;
    try {
      const url = `/api/bl-agreement/${encodeURIComponent(contractNumber)}/access/`;
      const res = await requestWithAuth({ method: 'get', url });
      if (res && res.data) {
        setAccessMap(prev => ({ ...prev, [contractNumber]: res.data }));
        return res.data;
      }
    } catch (err) {
      // If 404 or forbidden, just leave no access record
      return null;
    }
    return null;
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

  const fetchContractData = async (cn, forCreate = false) => {
    try {
      const url = `/api/bl-agreement/?contract_number=${encodeURIComponent(cn)}${forCreate ? '&mode=create' : ''}`;
      const res = await requestWithAuth({ method: 'get', url });
      // backend mengembalikan { debtor: ..., collateral: ... }
      return res.data || {};
    } catch (err) {
      console.error('Failed fetch contract', err);
      return {};
    }
  };

  const handleDownloadRow = async (row) => {
    if (!row.contract_number) { setError(t('contract_number_empty')); return; }
    try {
      // Download Agreement DOCX
      const url1 = `/api/bl-agreement/download-docx/?contract_number=${encodeURIComponent(row.contract_number)}&type=agreement`;
      const res1 = await requestWithAuth({ method: 'get', url: url1, responseType: 'blob' });
      const contentType1 = (res1.headers && res1.headers['content-type']) || '';
      const blob1 = new Blob([res1.data], { type: contentType1 || 'application/octet-stream' });
      if (contentType1.includes('application/json')) {
        const text = await blob1.text();
        try {
          const js = JSON.parse(text);
          const msg = js.error || js.detail || JSON.stringify(js);
          setError(t('download_failed_prefix') + msg);
          return;
        } catch (e) {
          setError(t('download_unparseable'));
          return;
        }
      }
      const link1 = document.createElement('a');
      link1.href = window.URL.createObjectURL(blob1);
      link1.download = `BL_Agreement_${row.contract_number}.docx`;
      document.body.appendChild(link1);
      link1.click(); link1.remove();

      // refresh access status after successful download
      try { await fetchAccessForContract(row.contract_number); } catch (e) {}

      // Wait 500ms then download SP3 DOCX
      await new Promise(resolve => setTimeout(resolve, 500));
      const url2 = `/api/bl-agreement/download-docx/?contract_number=${encodeURIComponent(row.contract_number)}&type=sp3`;
      const res2 = await requestWithAuth({ method: 'get', url: url2, responseType: 'blob' });
      const contentType2 = (res2.headers && res2.headers['content-type']) || '';
      const blob2 = new Blob([res2.data], { type: contentType2 || 'application/octet-stream' });
      if (contentType2.includes('application/json')) {
        const text = await blob2.text();
        try {
          const js = JSON.parse(text);
          const msg = js.error || js.detail || JSON.stringify(js);
          setError(t('sp3_download_failed_prefix') + msg);
          return;
        } catch (e) {
          setError(t('download_unparseable'));
          return;
        }
      }
      const link2 = document.createElement('a');
      link2.href = window.URL.createObjectURL(blob2);
      link2.download = `BL_SP3_${row.contract_number}.docx`;
      document.body.appendChild(link2);
      link2.click(); link2.remove();

      // refresh access status after SP3 download as well
      try { await fetchAccessForContract(row.contract_number); } catch (e) {}
    } catch (err) {
      console.error('Download failed', err); setError(t('failed_download_documents'));
    }
  };

  const handleDownloadPdf = async (row) => {
    if (!row.contract_number) { setError(t('contract_number_empty')); return; }
    try {
      // Download Agreement PDF
      const url1 = `/api/bl-agreement/download-docx/?contract_number=${encodeURIComponent(row.contract_number)}&type=agreement&download=pdf`;
      const res1 = await requestWithAuth({ method: 'get', url: url1, responseType: 'blob' });
      const contentType1 = (res1.headers && res1.headers['content-type']) || '';
      const blob1 = new Blob([res1.data], { type: contentType1 || 'application/pdf' });
      if (contentType1.includes('application/json')) {
        const text = await blob1.text();
        try { const js = JSON.parse(text); setError(js.error || js.detail || t('pdf_conversion_failed')); return; } catch (e) { setError(t('pdf_conversion_failed')); return; }
      }
      const link1 = document.createElement('a');
      link1.href = window.URL.createObjectURL(blob1);
      link1.download = `BL_Agreement_${row.contract_number}.pdf`;
      document.body.appendChild(link1);
      link1.click(); link1.remove();

      // refresh access status after PDF download
      try { await fetchAccessForContract(row.contract_number); } catch (e) {}

      // Wait 500ms then download SP3 PDF
      await new Promise(resolve => setTimeout(resolve, 500));
      const url2 = `/api/bl-agreement/download-docx/?contract_number=${encodeURIComponent(row.contract_number)}&type=sp3&download=pdf`;
      const res2 = await requestWithAuth({ method: 'get', url: url2, responseType: 'blob' });
      const contentType2 = (res2.headers && res2.headers['content-type']) || '';
      const blob2 = new Blob([res2.data], { type: contentType2 || 'application/pdf' });
      if (contentType2.includes('application/json')) {
        const text = await blob2.text();
        try { const js = JSON.parse(text); setError(js.error || js.detail || t('pdf_conversion_failed')); return; } catch (e) { setError(t('pdf_conversion_failed')); return; }
      }
      const link2 = document.createElement('a');
      link2.href = window.URL.createObjectURL(blob2);
      link2.download = `BL_SP3_${row.contract_number}.pdf`;
      document.body.appendChild(link2);
      link2.click(); link2.remove();

      // refresh access status after SP3 PDF download
      try { await fetchAccessForContract(row.contract_number); } catch (e) {}
    } catch (err) {
      console.error('PDF download failed', err);
      try {
        const resp = err?.response;
        if (resp) {
          const status = resp.status;
          // show english toast when server forbids due to exhausted grants
          if (status === 403) {
            try { toast.error('Download limit reached'); } catch (e) {}
            // refresh access state so UI reflects change
            try { await fetchAccessForContract(row.contract_number); } catch (e) {}
            return;
          }
          const contentType = (resp.headers && resp.headers['content-type']) || '';
          if (contentType.includes('application/json')) {
            const data = resp.data;
            try {
              const msg = (data && (data.error || data.detail)) || JSON.stringify(data);
              setError(`PDF conversion failed (${status}): ${msg}`);
              return;
            } catch (e) {
              setError(`PDF conversion failed (${status})`);
              return;
            }
          }
          setError(`PDF download failed (${status})`);
          return;
        }
      } catch (e) {
        console.error('Error while formatting PDF download error', e);
      }
      setError(t('failed_download_pdfs'));
    }
  };

  const handleDeleteRow = async (row) => {
    if (!row || !row.contract_number) return;
    const ok = window.confirm(`Delete agreement ${row.contract_number}? This cannot be undone.`);
    if (!ok) return;
    try {
      setError('');
      await requestWithAuth({ method: 'delete', url: `/api/bl-agreement/?contract_number=${encodeURIComponent(row.contract_number)}` });

      toast.success('Record deleted');

      await loadAgreements();
    } catch (err) {
      console.error('Delete failed', err);
      const msg = err?.response?.data?.error || t('delete_failed');
      setError(msg);
      toast.error(msg);
    }
  };

  const handleSaveModal = async () => {
    setSavingModal(true);
    try {
      const payload = { contract_number: contractNumber, debtor: { name_of_debtor: formDebtorName, nik_number_of_debtor: formNik }, collateral: { collateral_type: formCollateralType }, skip_normalization: true };
      try { stripIdKeys(payload); } catch (e) {}
      await requestWithAuth({ method: 'post', url: '/api/bl-agreement/', data: payload });
      toast.success(t('save_success'));
      setShowCreateModal(false);
      await loadAgreements();
      try {
        if (contractNumber) await fetchAccessForContract(contractNumber);
      } catch (e) { /* ignore */ }
    } catch (err) {
      console.error('Save failed', err);
      const errMsg = t('save_failed');
      setError(errMsg);
      toast.error(errMsg);
    } finally {
      setSavingModal(false);
    }
  };

  const handleSaveAndDownload = async () => {
    setSavingModal(true);
    try {
      const payload = { contract_number: contractNumber, debtor: { name_of_debtor: formDebtorName, nik_number_of_debtor: formNik }, collateral: { collateral_type: formCollateralType }, skip_normalization: true };
      try { stripIdKeys(payload); } catch (e) {}
      await requestWithAuth({ method: 'post', url: '/api/bl-agreement/', data: payload });
      toast.success(t('save_success'));
      // refresh daftar lalu unduh
      await loadAgreements();
      // Request PDF when available
      const url = `/api/bl-agreement/download-docx/?contract_number=${encodeURIComponent(contractNumber)}`;
      const res = await requestWithAuth({ method: 'get', url, responseType: 'blob' });
      const contentType = (res.headers && res.headers['content-type']) || '';
      const blob = new Blob([res.data], { type: contentType || 'application/octet-stream' });
      if (contentType.includes('application/json')) {
        const text = await blob.text();
        try {
          const js = JSON.parse(text);
          const msg = js.error || js.detail || JSON.stringify(js);
          setError(t('download_failed_prefix') + msg);
          toast.error(t('download_failed_prefix') + msg, { className: 'toast-error' });
          setShowCreateModal(false);
          setSavingModal(false);
          return;
        } catch (e) {
          setError(t('download_unparseable'));
          toast.error(t('download_unparseable'), { className: 'toast-error' });
          setShowCreateModal(false);
          setSavingModal(false);
          return;
        }
      }
      const isPdf = contentType.includes('pdf');
      const link = document.createElement('a'); link.href = window.URL.createObjectURL(blob); link.download = `BL_Agreement_${contractNumber}${isPdf ? '.pdf' : '.docx'}`; document.body.appendChild(link); link.click(); link.remove();
      setShowCreateModal(false);
      try {
        if (contractNumber) await fetchAccessForContract(contractNumber);
      } catch (e) { /* ignore */ }
    } catch (err) {
      console.error('Save & Download failed', err);
      const errMsg = t('failed_save_and_download');
      setError(errMsg);
      toast.error(errMsg);
    } finally {
      setSavingModal(false);
    }
  };

  const handleModalDownload = async () => {
    if (!contractNumber) { setError(t('contract_number_empty')); return; }
    try {
      // Request PDF when available
      const url = `/api/bl-agreement/download-docx/?contract_number=${encodeURIComponent(contractNumber)}`;
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
      try { if (contractNumber) await fetchAccessForContract(contractNumber); } catch (e) { /* ignore */ }
    } catch (err) { console.error('Download failed', err); setError(t('failed_download_documents')); }
  };

  const formatDateShort = (iso) => {
    if (!iso) return '';
    try { const d = new Date(iso); if (isNaN(d.getTime())) return iso; const dd = String(d.getDate()).padStart(2, '0'); const mm = String(d.getMonth() + 1).padStart(2, '0'); const yyyy = d.getFullYear(); return `${dd}-${mm}-${yyyy}`; } catch (e) { return iso; }
  };

  return (
    <div>
      <div className="content-section">
        <h2>{t('bl_agreement')}</h2>
        <p>{t('before_create_doc_note')}</p>
      </div>

      <div className="user-management-actions" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input
            type="text"
            placeholder={t('search_agreements_placeholder')}
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
            aria-label="Search agreements"
            style={{ padding: '8px 10px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px', width: '260px' }}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          {(isAdmin || isCsa) && (
            <>
              <button
                className="btn-primary"
                onClick={() => { setModalMode('create'); setContractNumber(''); setFormDebtorName(''); setFormNik(''); setFormCollateralType(''); setError(''); setSelectedBranchId(''); setContractOnlyMode(true); setShowCreateModal(true); }}
                title="Add a new contract"
              >
                {t('add_contract')}
              </button>

              <button
                className="btn-primary"
                onClick={() => { setModalMode('create'); setContractNumber(''); setFormDebtorName(''); setFormNik(''); setFormCollateralType(''); setError(''); setSelectedBranchId(''); setCollateralMode(true); setShowCreateModal(true); }}
                title="Add a new BL collateral"
              >
                {t('add_collateral')}
              </button>

              <button className="btn-save" onClick={() => { setModalMode('create'); setContractNumber(''); setFormDebtorName(''); setFormNik(''); setFormCollateralType(''); setError(''); setSelectedBranchId(''); setContractOnlyMode(false); setCollateralMode(false); setShowCreateModal(true); }}>{t('create_document')}</button>
            </>
          )}
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
              <table className="user-table agreements-table">
                <thead>
                  <tr>
                    <th>{t('Agreement Date')}</th>
                    <th>{t('contract_number')}</th>
                    <th>{t('name_of_debtor')}</th>
                    <th>{t('nik_number_of_debtor')}</th>
                    <th>{t('collateral_type')}</th>
                    <th>{t('user')}</th>
                    <th>{t('actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedAgreements.length === 0 ? (
                    <tr><td className="no-data" colSpan={7}>{t('no_agreements')}</td></tr>
                  ) : (
                    pagedAgreements.map((row) => (
                      <tr key={row.contract_number}>
                        <td>{formatDateShort(row.agreement_date)}</td>
                        <td>{row.contract_number}</td>
                        <td>{row.name_of_debtor}</td>
                        <td>{row.nik_number_of_debtor}</td>
                        <td>{row.collateral_type}</td>
                        <td>{row.created_by}</td>
                        <td>
                          <div style={{ display: 'flex', gap: 8 }}>
                            {(() => {
                              try {
                                const rawUser = localStorage.getItem('user_data');
                                if (!rawUser) return null;
                                const ud = JSON.parse(rawUser);
                                const role = (ud.role || ud.role_name || '').toString().toLowerCase();
                                const username = ud.username || ud.user || ud.full_name || '';
                                if (!role.includes('csa') && !role.includes('admin')) {
                                  if (role.includes('audit')) {
                                    return (
                                      <button
                                        className="action-btn compact-action-btn"
                                        disabled
                                        title={t('no_access')}
                                        style={{ opacity: 0.5, cursor: 'not-allowed' }}
                                        aria-label={t('no_access')}
                                      >
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                          <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z" fill="#0a1e3d"/>
                                          <path d="M20.71 7.04a1.003 1.003 0 0 0 0-1.42l-2.34-2.34a1.003 1.003 0 0 0-1.42 0l-1.83 1.83 3.75 3.75 1.84-1.82z" fill="#0a1e3d"/>
                                        </svg>
                                      </button>
                                    );
                                  }
                                  return null;
                                }
                                // Compute whether edit should be disabled and the title text
                                const editDisabled = (() => {
                                  try {
                                    const rawUser2 = localStorage.getItem('user_data');
                                    if (!rawUser2) return false;
                                    const ud2 = JSON.parse(rawUser2);
                                    const role2 = (ud2.role || ud2.role_name || '').toString().toLowerCase();
                                    const username2 = ud2.username || ud2.user || ud2.full_name || '';
                                    if (!role2.includes('csa')) return false;
                                    // For CSA: disallow edit when the row wasn't created by this user
                                    if (!row.created_by || String(row.created_by) !== String(username2)) return true;
                                    const aa = accessMap[row.contract_number];
                                    if (!aa) return false; // if no access record, allow (server-side will enforce)
                                    if (aa.locked) return true;
                                    const remaining = (aa.edit_grants || 0) - (aa.edit_consumed || 0);
                                    return !(remaining > 0);
                                  } catch (e) { return false; }
                                })();

                                const editTitle = (() => {
                                  try {
                                    const rawUser2 = localStorage.getItem('user_data');
                                    if (!rawUser2) return t('edit');
                                    const ud2 = JSON.parse(rawUser2);
                                    const role2 = (ud2.role || ud2.role_name || '').toString().toLowerCase();
                                    const username2 = ud2.username || ud2.user || ud2.full_name || '';
                                    if (!role2.includes('csa')) return t('edit');
                                    // For CSA: show no_access when row not created by this user
                                    if (!row.created_by || String(row.created_by) !== String(username2)) return t('no_access');
                                    const aa = accessMap[row.contract_number];
                                    if (!aa) return t('edit');
                                    if (aa.locked) return t('no_access');
                                    const remaining = (aa.edit_grants || 0) - (aa.edit_consumed || 0);
                                    return (remaining > 0) ? t('edit') : t('no_access');
                                  } catch (e) { return t('edit'); }
                                })();

                                if (editDisabled) {
                                  return (
                                    <button
                                      title={editTitle}
                                      aria-label={`${t('edit')} ${row.contract_number || ''}`}
                                      className="action-btn compact-action-btn"
                                      disabled
                                      style={{ opacity: 0.5, cursor: 'not-allowed' }}
                                    >
                                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z" fill="#0a1e3d"/>
                                        <path d="M20.71 7.04a1.003 1.003 0 0 0 0-1.42l-2.34-2.34a1.003 1.003 0 0 0-1.42 0l-1.83 1.83 3.75 3.75 1.84-1.82z" fill="#0a1e3d"/>
                                      </svg>
                                    </button>
                                  );
                                }

                                return (
                                  <button
                                    onClick={() => handleEdit(row)}
                                    title={editTitle}
                                    aria-label={`${editTitle} ${row.contract_number || ''}`}
                                    className="action-btn compact-action-btn"
                                  >
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                      <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z" fill="#0a1e3d"/>
                                      <path d="M20.71 7.04a1.003 1.003 0 0 0 0-1.42l-2.34-2.34a1.003 1.003 0 0 0-1.42 0l-1.83 1.83 3.75 3.75 1.84-1.82z" fill="#0a1e3d"/>
                                    </svg>
                                  </button>
                                );
                              } catch (e) { return null; }
                            })()}
                            {/* Access badge hidden by configuration */}
                            {null}

                            {/* DOCX download removed per request (hidden for all roles) */}
                            {(() => {
                              let title = t('Download');
                              let disabled = false;
                              try {
                                const rawUser = localStorage.getItem('user_data');
                                if (!rawUser) {
                                  title = t('Download');
                                  disabled = false;
                                } else {
                                  const ud = JSON.parse(rawUser);
                                  const role = (ud.role || ud.role_name || '').toString().toLowerCase();
                                  const username = ud.username || ud.user || ud.full_name || '';
                                  try {
                                    if (!role.includes('csa')) title = t('Download');
                                    if (!row.created_by || String(row.created_by) !== String(username)) title = t('Download');
                                    const aa = accessMap[row.contract_number];
                                    if (!aa) title = t('Download');
                                    const remaining = (aa?.download_grants || 0) - (aa?.download_consumed || 0);
                                    if (aa?.locked || !(remaining > 0)) title = t('Download');
                                  } catch (e) { /* ignore title fallbacks */ }

                                  if (!role.includes('csa')) {
                                    if (role.includes('audit')) disabled = true; else disabled = false;
                                  } else {
                                    // For CSA: disallow download when the row wasn't created by this user
                                    if (!row.created_by || String(row.created_by) !== String(username)) {
                                      disabled = true;
                                    } else {
                                      const aa = accessMap[row.contract_number];
                                      if (!aa) disabled = false;
                                      if (aa && aa.locked) disabled = true;
                                      const remaining = (aa?.download_grants || 0) - (aa?.download_consumed || 0);
                                      if (aa && !(remaining > 0)) disabled = true;
                                    }
                                  }
                                }
                              } catch (e) { disabled = false; title = t('Download'); }

                              if (disabled) {
                                return (
                                  <button
                                    title={title}
                                    aria-label={`${t('Download')} ${row.contract_number || ''}`}
                                    className="action-btn compact-action-btn"
                                    disabled
                                    style={{ opacity: 0.5, cursor: 'not-allowed' }}
                                  >
                                    <img src={pdfIcon} alt="PDF" style={{ width: 18, height: 18, opacity: 0.6 }} />
                                  </button>
                                );
                              }

                              return (
                                <button
                                  onClick={() => handleDownloadPdf(row)}
                                  title={title}
                                  aria-label={`${t('Download')} ${row.contract_number || ''}`}
                                  className="action-btn compact-action-btn"
                                >
                                  <img src={pdfIcon} alt="PDF" style={{ width: 18, height: 18 }} />
                                </button>
                              );
                            })()}
                            {isAdmin && (
                              <button
                                onClick={() => handleDeleteRow(row)}
                                title={t('delete')}
                                aria-label={`${t('delete')} ${row.contract_number || ''}`}
                                className="action-btn compact-action-btn"
                              >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                  <path d="M3 6h18" stroke="#000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                  <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" stroke="#000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                  <path d="M10 11v6M14 11v6" stroke="#000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                  <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" stroke="#000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                              </button>
                            )}
                            {(() => {
                              try {
                                const raw = localStorage.getItem('user_data');
                                if (!raw) return null;
                                const ud = JSON.parse(raw);
                                const role = (ud.role || ud.role_name || '').toString().toLowerCase();
                                if (role.includes('audit') && !isAdmin) {
                                  return (
                                    <button className="action-btn compact-action-btn" disabled title={t('no_access')} style={{ opacity: 0.5, cursor: 'not-allowed' }} aria-label={t('no_access')}>
                                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M3 6h18" stroke="#000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" stroke="#000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                        <path d="M10 11v6M14 11v6" stroke="#000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                        <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" stroke="#000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                      </svg>
                                    </button>
                                  );
                                }
                                return null;
                              } catch (e) { return null; }
                            })()}
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
        <div>Showing {totalCount === 0 ? 0 : (page - 1) * pageSize + 1}-{Math.min((page - 1) * pageSize + pagedAgreements.length, totalCount)} of {totalCount}</div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }} style={{ padding: '6px 8px', border: '1px solid #ddd', borderRadius: 6 }}>
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
          <button className="pagination-btn" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} aria-label="Previous page">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
              <path d="M15 18L9 12L15 6" stroke="#0a1e3d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Prev
          </button>
          <div className="pagination-indicator">{page} / {totalPages}</div>
          <button className="pagination-btn" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} aria-label="Next page">
            Next
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
              <path d="M9 6L15 12L9 18" stroke="#0a1e3d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>

      {showCreateModal && (
        <div className="modal-overlay" onClick={() => { setShowCreateModal(false); setContractOnlyMode(false); setCollateralMode(false); }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
              <h3 className="modal-title">
                {modalMode === 'edit' && contractNumber ? `Edit ${contractNumber}` : (
                  contractOnlyMode ? t('add_contract') : (collateralMode ? t('add_collateral') : t('create_document'))
                )}
              </h3>
              <button className="modal-close-btn" onClick={() => { setShowCreateModal(false); setContractOnlyMode(false); setCollateralMode(false); }}>&times;</button>
            </div>

            <div className="modal-form">
              {modalMode === 'edit' ? (
                <BLEditForm
                  initialContractNumber={contractNumber}
                  initialSelectedBranchId={selectedBranchId}
                  onSaved={async (cn, aa) => { setShowCreateModal(false); setContractOnlyMode(false); await loadAgreements(); if (cn) { setContractNumber(cn); try { if (aa) { setAccessMap(prev => ({ ...prev, [cn]: aa })); } else { await fetchAccessForContract(cn); } } catch (e) {} } }}
                />
              ) : collateralMode ? (
                <div style={{ padding: 20, minWidth: 560 }}>
                  {collateralError && <div style={{ marginBottom: 12, color: '#a33' }}>{collateralError}</div>}

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div style={fieldGroupStyle}>
                        <label style={fieldLabelStyle}>{t('contract_number')}{requiredCollateralFields.includes('contract_number') && <span style={{ color: '#a33', marginLeft: 6 }}>*</span>}</label>
                      <input
                        type="text"
                        value={collateralForm.contract_number}
                        onChange={async (e) => {
                          const v = e.target.value;
                          setCollateralForm(prev => ({ ...prev, contract_number: v }));
                          if (v && v.trim()) {
                            try {
                              const data = await fetchContractData(v.trim(), true);
                              const debtor = data.debtor || data || {};
                              const name = debtor.name_of_debtor || debtor.name || '';
                              const coll = data.collateral || null;
                              if (coll) {
                                setCollateralForm(prev => ({
                                  ...prev,
                                  name_of_debtor: name,
                                  collateral_type: coll.collateral_type || prev.collateral_type || '',
                                  number_of_certificate: coll.number_of_certificate || prev.number_of_certificate || '',
                                  number_of_ajb: coll.number_of_ajb || prev.number_of_ajb || '',
                                  surface_area: coll.surface_area || prev.surface_area || '',
                                  name_of_collateral_owner: coll.name_of_collateral_owner || prev.name_of_collateral_owner || '',
                                  capacity_of_building: coll.capacity_of_building || prev.capacity_of_building || '',
                                  location_of_land: coll.location_of_land || prev.location_of_land || ''
                                }));
                              } else {
                                // no collateral found; at minimum populate debtor name
                                setCollateralForm(prev => ({ ...prev, name_of_debtor: name }));
                              }
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
                      <label style={fieldLabelStyle}>{t('name_of_debtor')}{requiredCollateralFields.includes('name_of_debtor') && <span style={{ color: '#a33', marginLeft: 6 }}>*</span>}</label>
                      <input type="text" value={collateralForm.name_of_debtor} disabled style={{ ...fieldInputStyle, backgroundColor: '#f5f5f5' }} />
                    </div>

                    <div style={fieldGroupStyle}>
                      <label style={fieldLabelStyle}>{t('collateral_type')}{requiredCollateralFields.includes('collateral_type') && <span style={{ color: '#a33', marginLeft: 6 }}>*</span>}</label>
                      <input type="text" value={collateralForm.collateral_type} onChange={(e) => setCollateralForm(prev => ({ ...prev, collateral_type: e.target.value }))} style={fieldInputStyle} />
                    </div>

                    <div style={fieldGroupStyle}>
                      <label style={fieldLabelStyle}>{t('number_of_certificate')}{requiredCollateralFields.includes('number_of_certificate') && <span style={{ color: '#a33', marginLeft: 6 }}>*</span>}</label>
                      <input type="text" value={collateralForm.number_of_certificate} onChange={(e) => setCollateralForm(prev => ({ ...prev, number_of_certificate: e.target.value }))} style={fieldInputStyle} />
                    </div>

                    <div style={fieldGroupStyle}>
                      <label style={fieldLabelStyle}>{t('number_of_ajb')}{requiredCollateralFields.includes('number_of_ajb') && <span style={{ color: '#a33', marginLeft: 6 }}>*</span>}</label>
                      <input type="text" value={collateralForm.number_of_ajb} onChange={(e) => setCollateralForm(prev => ({ ...prev, number_of_ajb: e.target.value }))} style={fieldInputStyle} />
                    </div>

                    <div style={fieldGroupStyle}>
                      <label style={fieldLabelStyle}>{t('surface_area')}{requiredCollateralFields.includes('surface_area') && <span style={{ color: '#a33', marginLeft: 6 }}>*</span>}</label>
                      <input type="text" value={collateralForm.surface_area} onChange={(e) => setCollateralForm(prev => ({ ...prev, surface_area: e.target.value }))} style={fieldInputStyle} />
                    </div>

                    <div style={fieldGroupStyle}>
                      <label style={fieldLabelStyle}>{t('name_of_collateral_owner')}{requiredCollateralFields.includes('name_of_collateral_owner') && <span style={{ color: '#a33', marginLeft: 6 }}>*</span>}</label>
                      <input type="text" value={collateralForm.name_of_collateral_owner} onChange={(e) => setCollateralForm(prev => ({ ...prev, name_of_collateral_owner: e.target.value }))} style={fieldInputStyle} />
                    </div>

                    <div style={fieldGroupStyle}>
                      <label style={fieldLabelStyle}>{t('capacity_of_building')}{requiredCollateralFields.includes('capacity_of_building') && <span style={{ color: '#a33', marginLeft: 6 }}>*</span>}</label>
                      <input type="text" value={collateralForm.capacity_of_building} onChange={(e) => setCollateralForm(prev => ({ ...prev, capacity_of_building: e.target.value }))} style={fieldInputStyle} />
                    </div>

                    <div style={fieldGroupStyle}>
                      <label style={fieldLabelStyle}>{t('location_of_land')}{requiredCollateralFields.includes('location_of_land') && <span style={{ color: '#a33', marginLeft: 6 }}>*</span>}</label>
                      <input type="text" value={collateralForm.location_of_land} onChange={(e) => setCollateralForm(prev => ({ ...prev, location_of_land: e.target.value }))} style={fieldInputStyle} />
                    </div>
                  </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
                    <button className="btn-save" onClick={async () => {
                      setCollateralSaving(true); setCollateralError('');
                      try {
                        // ATURAN KETIKA SAVE DI COLLATERAL
                        // Normalize: store ALL collateral fields as UPPERCASE on save
                        const normalizedContractNumber = (collateralForm.contract_number || '').toString().trim().toUpperCase();
                        const normalizedCollateralType = (collateralForm.collateral_type || '').toString().trim().toUpperCase();
                        const normalizedNumberOfCertificate = (collateralForm.number_of_certificate || '').toString().trim().toUpperCase();
                        const normalizedNumberOfAjb = (collateralForm.number_of_ajb || '').toString().trim().toUpperCase();
                        const normalizedSurfaceArea = (collateralForm.surface_area || '').toString().trim().toUpperCase();
                        const normalizedNameOfCollateralOwner = (collateralForm.name_of_collateral_owner || '').toString().trim().toUpperCase();
                        const normalizedCapacityOfBuilding = (collateralForm.capacity_of_building || '').toString().trim().toUpperCase();
                        const normalizedLocationOfLand = (collateralForm.location_of_land || '').toString().trim().toUpperCase();

                        const payload = {
                          contract_number: normalizedContractNumber,
                          collateral_type: normalizedCollateralType,
                          number_of_certificate: normalizedNumberOfCertificate,
                          number_of_ajb: normalizedNumberOfAjb,
                          surface_area: normalizedSurfaceArea,
                          name_of_collateral_owner: normalizedNameOfCollateralOwner,
                          capacity_of_building: normalizedCapacityOfBuilding,
                          location_of_land: normalizedLocationOfLand
                        };
                        try { console.log('Collateral payload to send:', payload); } catch (e) {}
                        await requestWithAuth({ method: 'post', url: '/api/bl-collateral/', data: payload });
                        setShowCreateModal(false);
                        setCollateralMode(false);
                        loadAgreements();
                        setSuccessMessage(t('collateral_saved'));
                        setTimeout(() => setSuccessMessage(''), 4000);
                        toast.success(t('collateral_saved'));
                        } catch (err) {
                        console.error('Save collateral failed', err);
                        const resp = err?.response;
                        const bodyErr = resp?.data?.error || resp?.data?.message || '';
                        if (resp && (resp.status === 409 || (bodyErr && String(bodyErr).toLowerCase().includes('duplicate')))) {
                          const msg = t('duplicate_contract_exists');
                          try { toast.error(msg); } catch (e) {}
                        } else {
                          const respErr = resp;
                          const bodyText = (respErr && (respErr.data && (respErr.data.error || respErr.data.message))) ? String(respErr.data.error || respErr.data.message) : JSON.stringify(respErr?.data || respErr || '');
                          const l = String(bodyText || '').toLowerCase();
                          const isFk = l.includes('1452') || l.includes('foreign key') || l.includes('cannot add or update a child row') || (l.includes('bl_collateral') && l.includes('foreign'));
                          if (isFk) {
                            const fkMsg = t('fk_contract_missing');
                            try { toast.error(fkMsg); } catch (e) {}
                          } else {
                            const msg = err?.response?.data?.error || t('failed_save_collateral');
                            setCollateralError(msg);
                            try { toast.error(msg); } catch (e) {}
                          }
                        }
                      } finally {
                        setCollateralSaving(false);
                      }
                    }} disabled={collateralSaving || !isCollateralFormValid()}>{collateralSaving ? t('saving') : t('save_collateral')}</button>
                  </div>
                </div>
                ) : (
                <div>
                <BLCreateForm
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
                    toast.success(t('contract_saved'));
                  }}
                  onSaved={async (cn, aa) => { setShowCreateModal(false); setContractOnlyMode(false); await loadAgreements(); if (cn) { setContractNumber(cn); try { if (aa) { setAccessMap(prev => ({ ...prev, [cn]: aa })); } else { await fetchAccessForContract(cn); } } catch (e) {} } }}
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