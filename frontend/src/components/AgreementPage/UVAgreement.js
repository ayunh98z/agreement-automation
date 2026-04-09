/* eslint-disable unicode-bom, no-unused-vars, react-hooks/exhaustive-deps */
import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import '../UserManagement/UserManagement.css';
import { buildCollateralPayload } from './collateralUtils';
import pdfIcon from '../../assets/icons/pdf-icon.svg';
import { getIndonesianNumberWord, getIndonesianDateInWords, getIndonesianDateDisplay, parseDateFromDisplay, getIndonesianDayName, formatNumberWithDots, formatDateDisplay, isDateFieldName, formatFieldName } from '../../utils/formatting';
import useT from '../../hooks/useT';
import { t as messages_t } from '../../utils/messages';
import { stripIdKeys, normalizeSection } from '../../utils/payloadUtils';
import { requestWithAuth } from '../../utils/api';

// Module-level fallback `t` for non-React scope usages (keeps existing code working)
const t = messages_t;

// Helper: lookup contract row directly from `contract` table (used by Add-Contract modal)
async function fetchContractLookup(cn) {
  if (!cn || !String(cn).trim()) return {};
  try {
    const url = `/api/contracts/lookup/?contract_number=${encodeURIComponent(String(cn).trim())}`;
    const res = await requestWithAuth({ method: 'get', url });
    return res.data || {};
  } catch (err) {
    console.error('uv fetchContractLookup failed for', cn, err);
    return {};
  }
}

// Generic helper: find a likely matching key value inside objects with inconsistent keys
function findValueInObj(obj, targetKey) {
  if (!obj || !targetKey) return undefined;
  const normalize = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const nt = normalize(targetKey);
  if (Object.prototype.hasOwnProperty.call(obj, targetKey)) return obj[targetKey];
  if (Object.prototype.hasOwnProperty.call(obj, targetKey.toLowerCase())) return obj[targetKey.toLowerCase()];
  for (const k of Object.keys(obj)) { if (normalize(k) === nt) return obj[k]; }
  const parts = targetKey.split('_').map(p => p.toLowerCase()).filter(Boolean);
  for (const k of Object.keys(obj)) {
    const lk = k.toLowerCase(); let score = 0;
    for (const p of parts) if (p.length > 2 && lk.includes(p)) score++;
    if (score >= Math.max(1, Math.floor(parts.length / 2))) return obj[k];
  }
  return undefined;
}

// Note: number-to-words conversion uses shared `getIndonesianNumberWord` from formatting.js.
// UV intentionally reuses BL behavior via inline guarded calls (no duplicate helpers).

// Module-level helper: compute `_in_word` / `_by_word` fields for a contract-like object.
// Placed at module scope so both UVAgreementForm and the outer UVAgreement component can use it.
function computeContractWordFields(data = {}) {
  try {
    const out = { ...data };
    Object.keys(out).forEach((f) => {
      if (/_in_word$|_by_word$/.test(f)) {
        const base = f.replace(/(_in_word|_by_word)$/, '');
        if (/date|birth/i.test(base)) {
          const dv = getIndonesianDateInWords(out[base]) || out[f] || '';
          out[f] = (typeof dv === 'string') ? dv.toUpperCase() : dv;
        } else {
          const rawVal = out[base];
          if (rawVal === '' || rawVal === null || rawVal === undefined) {
              out[f] = (typeof out[f] === 'string') ? out[f].toUpperCase() : (out[f] || '');
            } else {
            try {
              const n = Number(String(rawVal).replace(/\./g, '').replace(/,/g, '.')) || 0;
              if (n === 0) {
                if (base === 'admin_rate') {
                  const nv = getIndonesianNumberWord(String(rawVal)) || out[f] || '';
                  out[f] = (typeof nv === 'string') ? nv.toUpperCase() : nv;
                } else {
                  out[f] = out[f] || '';
                }
                } else {
                const nv2 = getIndonesianNumberWord(String(rawVal)) || out[f] || '';
                out[f] = (typeof nv2 === 'string') ? nv2.toUpperCase() : nv2;
              }
            } catch (e) {
              out[f] = (typeof out[f] === 'string') ? out[f].toUpperCase() : (out[f] || '');
            }
          }
        }
      }
    });
    // For UV page we want all textual fields in UPPERCASE for display
    try { return uppercaseStringsRecursive(out); } catch (e) { return out; }
  } catch (e) {
    return data;
  }
}

// Payload id/pk stripping and normalization moved to shared util `payloadUtils`.

// Rate fields that should display comma on UI but store with dot
// Keep only percentage-style rates here; treat `admin_rate` as numeric
const rateFields = ['flat_rate'];



// Helper: normalize numeric input strings to preserve decimal separator when pasted
// More robust: strip stray characters, detect decimal separator by last occurrence,
// collapse multiple grouping separators and ensure only one decimal point remains.
const normalizeNumericInput = (input) => {
  if (input === null || input === undefined) return '';
  let s = String(input).trim();
  if (s === '') return '';

  // Keep only digits, dot, comma, minus and whitespace
  s = s.replace(/[^0-9.,\-\s]/g, '').trim();

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

// Utility: recursively uppercase string values in an object/array, skipping ISO dates
function uppercaseStringsRecursive(obj, keyName) {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) {
    return obj.map((v) => uppercaseStringsRecursive(v));
  }
  if (typeof obj === 'object') {
    Object.keys(obj).forEach((k) => {
      try {
        obj[k] = uppercaseStringsRecursive(obj[k], k);
      } catch (e) { /* ignore per-field */ }
    });
    return obj;
  }
  if (typeof obj === 'string') {
    // skip ISO date-like strings (e.g. 2026-03-16 or 2026-03-16T...)
    if (/^\d{4}-\d{2}-\d{2}(T|$)/.test(obj)) return obj;
    try { return obj.toUpperCase(); } catch (e) { return obj; }
  }
  return obj;
}

// Inlined AgreementForm copied from AgreementForm.js and renamed to UVAgreementForm
function UVAgreementForm({ initialContractNumber = '', initialContractData = null, initialFilterNumber = '', initialFilterTrigger = 0, onSaved, onContractSaved, contractOnly = false, editOnly = false, createOnly = false, hideFilter = false, hideHeader = false, initialUvCollateralFields = null, inModal = false } = {}) {
  const [saving, setSaving] = React.useState(false);
  const [usernameDisplay, setUsernameDisplay] = React.useState('');
    const t = useT();
  const isUV = true;
  // Determine if current user is Admin (used to control Delete button visibility)
  let isAdmin = false;
  let isAudit = false;
  try {
    const raw = localStorage.getItem('user_data');
    if (raw) {
      const ud = JSON.parse(raw);
      const role = (ud.role || ud.role_name || '').toString().toLowerCase();
      if (role.includes('admin')) isAdmin = true;
      if (role.includes('audit')) isAudit = true;
    }
  } catch (e) { /* ignore */ }

  // Download both Agreement and SP3 documents (DOCX or PDF when asPdf=true)
  const triggerDocxDownload = async (contractNum, accessToken, asPdf = false) => {
    if (!contractNum || String(contractNum).trim() === '') return;
    try {
      const token = accessToken || localStorage.getItem('access_token');
      const base = 'uv-agreement';
      const downloadType = asPdf ? '&download=pdf' : '';

      // Agreement
      const url1 = `/api/${base}/download-docx/?contract_number=${encodeURIComponent(contractNum)}${downloadType}&type=agreement`;
      const resp1 = await requestWithAuth({ method: 'get', url: url1, responseType: 'blob', headers: token ? { Authorization: `Bearer ${token}` } : {} });
      const contentType1 = (resp1.headers && resp1.headers['content-type']) || '';
      const isPdf1 = contentType1.includes('pdf');
      const blob1 = new Blob([resp1.data], { type: contentType1 || (isPdf1 ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') });
      if (contentType1.includes('application/json')) {
        const text = await blob1.text();
        try { const js = JSON.parse(text); const msg = js.error || js.detail || js.message || JSON.stringify(js); toast.error(t('download_failed_prefix') + msg); return; } catch (e) { toast.error(t('download_unparseable')); return; }
      }
      const link1 = document.createElement('a');
      link1.href = window.URL.createObjectURL(blob1);
      link1.download = `UV_Agreement_${contractNum}${isPdf1 ? '.pdf' : '.docx'}`;
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
        const text2 = await blob2.text();
        try { const js2 = JSON.parse(text2); const msg2 = js2.error || js2.detail || js2.message || JSON.stringify(js2); toast.error(t('sp3_download_failed_prefix') + msg2); return; } catch (e) { toast.error(t('download_unparseable')); return; }
      }
      const link2 = document.createElement('a');
      link2.href = window.URL.createObjectURL(blob2);
      link2.download = `UV_SP3_${contractNum}${isPdf2 ? '.pdf' : '.docx'}`;
      document.body.appendChild(link2);
      link2.click(); link2.remove();
      window.URL.revokeObjectURL(link2.href);
    } catch (e) {
      console.error('DOCX/SP3 download failed', e);
    }
  };
  

  

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
              const w = getIndonesianDateInWords(contractData[base]) || contractData[f] || '';
              contractDataToSave[f] = (typeof w === 'string') ? w.toUpperCase() : w;
            } else {
              const n = Number(contractData[base] || 0) || 0;
              const nw = (n === 0) ? '' : (getIndonesianNumberWord(n) || contractData[f] || '');
              contractDataToSave[f] = (typeof nw === 'string') ? nw.toUpperCase() : nw;
            }
          }
        });

        const bmDataToSave = { ...bmData };
        bmFields.forEach((f) => {
          if (/_in_word$|_by_word$/.test(f)) {
            const base = f.replace(/(_in_word|_by_word)$/, '');
            if (/date|birth/i.test(base)) {
              const w = getIndonesianDateInWords(bmData[base]) || bmData[f] || '';
              bmDataToSave[f] = (typeof w === 'string') ? w.toUpperCase() : w;
            } else {
              const n = Number(bmData[base] || 0) || 0;
              const nw = (n === 0) ? '' : (getIndonesianNumberWord(n) || bmData[f] || '');
              bmDataToSave[f] = (typeof nw === 'string') ? nw.toUpperCase() : nw;
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
        // Ensure admin_rate is numeric and default to 0 when empty
        if (typeof contractDataToSave.admin_rate === 'undefined' || contractDataToSave.admin_rate === '' || contractDataToSave.admin_rate === null) {
          contractDataToSave.admin_rate = 0;
        } else {
          contractDataToSave.admin_rate = Number(contractDataToSave.admin_rate) || 0;
        }
        // Ensure previous_topup_amount defaults to 0 when empty/undefined
        if (typeof contractDataToSave.previous_topup_amount === 'undefined' || contractDataToSave.previous_topup_amount === '' || contractDataToSave.previous_topup_amount === null) {
          contractDataToSave.previous_topup_amount = 0;
        } else {
          contractDataToSave.previous_topup_amount = Number(contractDataToSave.previous_topup_amount) || 0;
        }
        // (no _display fields added — visual formatting handled in inputs)
        if (headerFieldsToSave.agreement_date) {
          const adw = getIndonesianDayName(headerFieldsToSave.agreement_date) || headerFieldsToSave.agreement_day_in_word || '';
          headerFieldsToSave.agreement_day_in_word = (typeof adw === 'string') ? adw.toUpperCase() : adw;
          const ad = getIndonesianDateInWords(headerFieldsToSave.agreement_date) || headerFieldsToSave.agreement_date_in_word || '';
          headerFieldsToSave.agreement_date_in_word = (typeof ad === 'string') ? ad.toUpperCase() : ad;
          headerFieldsToSave.agreement_date_display = `(${getIndonesianDateDisplay(headerFieldsToSave.agreement_date)})` || headerFieldsToSave.agreement_date_display || '';
        }
        if (headerFieldsToSave.sp3_date) {
          const sd = getIndonesianDateInWords(headerFieldsToSave.sp3_date) || headerFieldsToSave.sp3_date_in_word || '';
          headerFieldsToSave.sp3_date_in_word = (typeof sd === 'string') ? sd.toUpperCase() : sd;
          headerFieldsToSave.sp3_date_display = `(${getIndonesianDateDisplay(headerFieldsToSave.sp3_date)})` || headerFieldsToSave.sp3_date_display || '';
        }
        if (headerFieldsToSave.date_of_delegated) {
          const dd = getIndonesianDateInWords(headerFieldsToSave.date_of_delegated) || headerFieldsToSave.date_of_delegated_in_word || '';
          headerFieldsToSave.date_of_delegated_in_word = (typeof dd === 'string') ? dd.toUpperCase() : dd;
          headerFieldsToSave.date_of_delegated_display = `(${getIndonesianDateDisplay(headerFieldsToSave.date_of_delegated)})` || headerFieldsToSave.date_of_delegated_display || '';
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
        try { if (inModal) payload.skip_normalization = true; } catch (e) { /* ignore */ }

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
        // Always POST — backend does not accept PATCH on this endpoint in some deployments.
        // Recursively strip any `id`/`pk` keys from the payload to avoid primary-key insertion errors.
        try { stripIdKeys(payload); } catch (e) { /* ignore */ }

        // Normalize numeric fields to avoid sending empty strings for numeric DB columns
        let normalizedPayload = { ...payload };
        // For modal flows we preserve database-provided text as-is; do not apply title-casing.
        if (!inModal) {
          // Intentionally do not apply titleCasePayload for UV page; keep original casing.
        } else {
          // Minimal, safe modal normalization: title-case only selected text fields and
          // preserve RT/RW acronyms for address-like fields so modal saves look consistent.
          try {
            const rtRwFields = ['street_name_of_debtor', 'location_of_land', 'street_of_debtor', 'street_name'];
            const preserveAcronym = (text, acronym) => {
              try {
                const ac = String(acronym).toLowerCase();
                const re = new RegExp('(^|[^A-Za-z])(' + ac + ')([^A-Za-z]|$)', 'gi');
                return String(text).replace(re, (m, p1, p2, p3) => (p1 || '') + acronym.toUpperCase() + (p3 || ''));
              } catch (ee) { return text; }
            };

            const allowedKeys = ['street_of_debtor', 'street_name_of_debtor', 'location_of_land', 'street_name'];
            const transformValue = (val, key) => {
              if (val === null || val === undefined) return val;
              if (typeof val !== 'string') return val;
              // Do not convert to Title Case here; preserve original user casing.
              let out = val;
              // preserve RT/RW for address-like fields
              out = preserveAcronym(out, 'rt');
              out = preserveAcronym(out, 'rw');
              return out;
            };

            ['contract_data','debtor','collateral_data','bm_data','branch_data','header_fields','extra_fields'].forEach((sec) => {
              try {
                if (!normalizedPayload[sec] || typeof normalizedPayload[sec] !== 'object') return;
                Object.keys(normalizedPayload[sec]).forEach((k) => {
                  try {
                    const lk = String(k).toLowerCase();
                    if (allowedKeys.includes(lk)) {
                      normalizedPayload[sec][k] = transformValue(normalizedPayload[sec][k], k);
                    }
                  } catch (ee) { /* ignore per-field errors */ }
                });
              } catch (eee) { /* ignore section errors */ }
            });
          } catch (e) { /* non-fatal */ }
        }
        // Skip section-level normalization when saving from modal (send exactly as entered in modal)
        if (!inModal) {
          ['contract_data','debtor','collateral_data','bm_data','branch_data','header_fields','extra_fields'].forEach(sec => {
            if (payload[sec]) normalizedPayload[sec] = normalizeSection(payload[sec], numericFields);
          });
        }
        // For modal create/edit, force ALL text fields to UPPERCASE before sending (mirror BL behavior)
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
        // ensure top-level branch_id is present
        if (!normalizedPayload.branch_id) {
          const resolved = selectedBranchId || (branchData && (branchData.branch_id || branchData.id));
          if (resolved) normalizedPayload.branch_id = resolved;
        }
        // Remove client-side created/updated fields; server will set authoritative values
        try { delete normalizedPayload.created_by; delete normalizedPayload.created_at; delete normalizedPayload.updated_at; } catch (e) {}

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

  

  const [contractNumber, setContractNumber] = React.useState('');
  React.useEffect(() => { if (initialContractNumber) setContractNumber(initialContractNumber); }, [initialContractNumber]);
  React.useEffect(() => { if (!initialContractData) return; if (initialContractNumber) return; try { if (initialContractData.contract_number) setContractNumber(initialContractData.contract_number); setContractData(prev => computeContractWordFields({ ...prev, ...initialContractData })); } catch (e) { console.warn('Failed to apply initialContractData to form', e); } }, [initialContractData, initialContractNumber]);

  const handleContractOnlySave = async () => {
    setContractOnlySaving(true);
    try {
      const token = localStorage.getItem('access_token'); const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const payload = {};
      Object.keys(contractData || {}).forEach((k) => {
        if (/_in_word$|_by_word$/.test(k)) return;
        let v = contractData[k];
        if (numericFields.includes(k) && v !== undefined && v !== null && v !== '') {
          const n = parseToNumber(v);
          v = (n === null) ? v : n;
        }
        payload[k] = v;
      });
      // Ensure previous_topup_amount defaults to 0 when not provided
      if (typeof payload.previous_topup_amount === 'undefined' || payload.previous_topup_amount === null || payload.previous_topup_amount === '') {
        payload.previous_topup_amount = 0;
      } else {
        // coerce to number when possible
        try { const nn = parseToNumber(payload.previous_topup_amount); payload.previous_topup_amount = (nn === null) ? payload.previous_topup_amount : nn; } catch (e) { /* ignore */ }
      }
      // Ensure we send a numeric 0 instead of empty string
      try { payload.previous_topup_amount = Number(payload.previous_topup_amount) || 0; } catch (e) { payload.previous_topup_amount = 0; }
      try { payload.created_by = usernameDisplay || '' } catch (e) { payload.created_by = ''; }
      const nowIso = new Date().toISOString(); payload.created_at = nowIso; payload.updated_at = nowIso;
      // Ensure contract identifiers uppercase for contract-only saves
      try {
        if (payload && payload.contract_number) payload.contract_number = String(payload.contract_number).toUpperCase();
        if (payload && payload.topup_contract) payload.topup_contract = String(payload.topup_contract).toUpperCase();
      } catch (e) { /* ignore */ }
        // Uppercase all other text fields for contract-only modal save
        try { uppercaseStringsRecursive(payload); } catch (e) { /* ignore */ }
      const res = await requestWithAuth({ method: 'post', url: '/api/contracts/', data: payload });
      if (typeof onContractSaved === 'function') { try { onContractSaved(res.data || payload); } catch (e) { console.warn('onContractSaved failed', e); } }
    } catch (err) {
      console.error('Failed saving contract-only', err);
      const resp = err?.response;
      if (resp) {
        const status = resp.status;
        // If server returned duplicate contract error, show user-friendly toast
        const bodyErr = resp.data?.error || resp.data?.message || '';
        if (status === 409 || (bodyErr && String(bodyErr).toLowerCase().includes('duplicate'))) {
          const msg = t('duplicate_contract_exists');
          try { toast.error(msg); } catch (e) {}
        } else {
          const url = resp.request?.responseURL || resp.config?.url || 'unknown';
          let body = '';
          try { body = typeof resp.data === 'string' ? resp.data : JSON.stringify(resp.data); } catch (e) { body = String(resp.data); }
          const reason = (bodyErr && String(bodyErr)) || (body && String(body)) || String(status);
          const errMsg = t('failed_saving_contract_prefix') + reason.substring(0,200);
          try { toast.error(errMsg); } catch (e) {}
          console.error('Contract-only save response:', resp);
        }
      } else {
        const msg = t('failed_saving_contract_prefix') + (err.message || 'unknown error');
        try { toast.error(msg); } catch (e) {}
      }
    } finally { setContractOnlySaving(false); }
  };

  const [contracts, setContracts] = React.useState([]);
  const [filteredContracts, setFilteredContracts] = React.useState([]);
  const [showContractDropdown, setShowContractDropdown] = React.useState(false);
  const [branches, setBranches] = React.useState([]);
  const [selectedBranchId, setSelectedBranchId] = React.useState('');
  const [selectedDirector, setSelectedDirector] = React.useState('');
  React.useEffect(() => { if (inModal && (createOnly || editOnly) && !selectedDirector) setSelectedDirector('Supriyono'); }, [inModal, createOnly, editOnly]);
  const [directors, setDirectors] = React.useState([]);
  React.useEffect(() => {
    if (!selectedDirector) return;
    const found = (directors || []).find(d => String(d.id) === String(selectedDirector) || d.name === selectedDirector || d.name_of_director === selectedDirector || (typeof d === 'string' && d === selectedDirector));
    if (found) {
      if (typeof found === 'string') {
        setHeaderFields(prev => (inModal && (createOnly || editOnly || contractOnly)) ? uppercaseStringsRecursive({ ...prev, name_of_director: found || prev.name_of_director || '' }) : ({ ...prev, name_of_director: found || prev.name_of_director || '' }));
      } else {
        setHeaderFields(prev => ({
          ...prev,
          name_of_director: found.name_of_director || found.name || prev.name_of_director || '',
          phone_number_of_lolc: found.phone_number_of_lolc || found.phone_number_of_director || prev.phone_number_of_lolc || ''
        }));
      }
    }
  }, [selectedDirector, directors]);
  const [loadingBranches, setLoadingBranches] = React.useState(true);
  const [loadingDirectors, setLoadingDirectors] = React.useState(true);
  const [loadingContracts, setLoadingContracts] = React.useState(true);
  const [bmData, setBmData] = React.useState({});
  const [branchData, setBranchData] = React.useState({});
  const [contractData, setContractData] = React.useState({});
  const [collateralData, setCollateralData] = React.useState({});
  const [uvCollateralFields, setUvCollateralFields] = React.useState(Array.isArray(initialUvCollateralFields) && initialUvCollateralFields.length ? initialUvCollateralFields : []);

  React.useEffect(() => {
    if (Array.isArray(initialUvCollateralFields) && initialUvCollateralFields.length) setUvCollateralFields(initialUvCollateralFields);
  }, [initialUvCollateralFields]);
  
  // If modal create is opened, try to fetch uv_collateral columns from API
  React.useEffect(() => {
    if (!inModal) return;
    if (Array.isArray(initialUvCollateralFields) && initialUvCollateralFields.length) return;
    let cancelled = false;
    (async () => {
      try {
        const resp = await requestWithAuth({ method: 'get', url: '/api/uv-collateral/' });
        if (cancelled) return;
        const data = resp && resp.data ? resp.data : {};
        if (Array.isArray(data.columns) && data.columns.length) {
          setUvCollateralFields(data.columns);
        }
      } catch (err) {
        console.warn('Failed to load uv-collateral columns', err);
      } finally {
        try { setLoadingContracts(false); } catch (e) {}
      }
    })();
    return () => { cancelled = true; };
  }, [inModal, initialUvCollateralFields]);

  const [headerFields, setHeaderFields] = React.useState({ agreement_date: new Date().toISOString().split('T')[0], place_of_agreement: '', agreement_day_in_word: '', agreement_date_in_word: '', Name_of_director: '', date_of_delegated: '', sp3_number: '', sp3_date: new Date().toISOString().split('T')[0], phone_number_of_lolc: '' });
  const [extraFields, setExtraFields] = React.useState({});
  // Modal-level validator: require filter (contract, branch, director) and dates when inside modal
  const isModalSaveAllowed = () => {
    if (!inModal) return true;
    const cn = (contractNumber || initialContractNumber || '').toString().trim();
    if (!cn) return false;
    if (!selectedBranchId || String(selectedBranchId).trim() === '') return false;
    if (!selectedDirector || String(selectedDirector).trim() === '') return false;
    if (!headerFields || !headerFields.agreement_date || String(headerFields.agreement_date).trim() === '') return false;
    if (!headerFields || !headerFields.date_of_delegated || String(headerFields.date_of_delegated).trim() === '') return false;
    // Require vehicle type present on modal saves
    try {
      const cd = collateralData || {};
      const vt = (cd.vehicle_type || cd.vehicle_types || cd.vehicle_type_name || '');
      if (String(vt).trim() === '') return false;
    } catch (e) { return false; }
    return true;
  };
  const [debtor, setDebtor] = React.useState(null);
  const [collateral, setCollateral] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const [contractOnlySaving, setContractOnlySaving] = React.useState(false);
  const [contractOnlyError, setContractOnlyError] = React.useState('');

  // keep uvCollateralFields in sync when collateral object (or collateralData) changes
  React.useEffect(() => {
    const collObj = firstCollateralObject(collateral || collateralData);
    if (collObj) {
      const f = deriveUvCollateralFieldsFromObj(collObj);
      if (f && f.length) setUvCollateralFields(f);
    }
  }, [collateral, collateralData]);

  const bmFields = [ 'name_of_bm','place_birth_of_bm','date_birth_of_bm','date_birth_of_bm_in_word','street_of_bm','subdistrict_of_bm','district_of_bm','city_of_bm','province_of_bm','nik_number_of_bm' ];
  const branchFields = ['street_name','subdistrict','district','city','province','phone_number_branch'];
  const numericFields = ['loan_amount','notaris_fee','admin_fee','net_amount','previous_topup_amount','mortgage_amount','tlo','life_insurance','stamp_amount','financing_agreement_amount','security_agreement_amount','upgrading_land_rights_amount','total_amount','admin_rate'];
  // rateFields is declared at file top-level to be accessible throughout
  const contractFields = [ 'contract_number','nik_number_of_debtor','name_of_debtor','place_birth_of_debtor','date_birth_of_debtor','date_birth_of_debtor_in_word','business_partners_relationship','business_type','street_of_debtor','subdistrict_of_debtor','district_of_debtor','city_of_debtor','province_of_debtor','phone_number_of_debtor','bank_account_number','name_of_bank','name_of_account_holder','virtual_account_number','topup_contract','previous_topup_amount','loan_amount','loan_amount_in_word','net_amount','net_amount_in_word','term','term_by_word','flat_rate','flat_rate_by_word','admin_rate','admin_rate_in_word','admin_fee','admin_fee_in_word','notaris_fee','notaris_fee_in_word','mortgage_amount','mortgage_amount_in_word','tlo','tlo_in_word','life_insurance','life_insurance_in_word','stamp_amount','financing_agreement_amount','security_agreement_amount','upgrading_land_rights_amount','total_amount' ];
  const hiddenForUV = new Set(['mortgage_amount', 'mortgage_amount_in_word', 'stamp_amount', 'financing_agreement_amount', 'security_agreement_amount', 'upgrading_land_rights_amount']);
  const hiddenForBLCreate = new Set(['tlo', 'tlo_in_word', 'admin_rate', 'admin_rate_in_word', 'life_insurance', 'life_insurance_in_word']);
  const getVisibleContractFields = (forContractOnly = false) => { const shouldHide = forContractOnly || !!createOnly; if (!shouldHide) return contractFields; return contractFields.filter(f => !hiddenForUV.has(f)); };

  // Compute `_in_word` / `_by_word` fields for contract data so UI shows them
  const computeContractWordFields = (data = {}) => {
    try {
      const out = { ...data };
      contractFields.forEach((f) => {
        if (/_in_word$|_by_word$/.test(f)) {
          const base = f.replace(/(_in_word|_by_word)$/, '');
          if (/date|birth/i.test(base)) {
            const w = getIndonesianDateInWords(out[base]) || out[f] || '';
            out[f] = (typeof w === 'string') ? w.toUpperCase() : w;
          } else {
            const rawVal = out[base];
            if (rawVal === '' || rawVal === null || rawVal === undefined) {
              out[f] = out[f] || '';
            } else {
                      try {
                        const n = Number(String(rawVal).replace(/\./g, '').replace(/,/g, '.')) || 0;
                        if (n === 0) {
                          if (base === 'admin_rate') {
                            const nw = getIndonesianNumberWord(String(rawVal)) || out[f] || '';
                            out[f] = (typeof nw === 'string') ? nw.toUpperCase() : nw;
                          } else {
                            out[f] = out[f] || '';
                          }
                        } else {
                          const nw = getIndonesianNumberWord(String(rawVal)) || out[f] || '';
                          out[f] = (typeof nw === 'string') ? nw.toUpperCase() : nw;
                        }
                      } catch (e) { out[f] = out[f] || ''; }
            }
          }
        }
      });
      try { return uppercaseStringsRecursive(out); } catch (e) { return out; }
    } catch (e) {
      return data;
    }
  };

  // Modal contract table/order used by Add Contract and contract-only modal views
  const getModalContractTableFields = () => {
    return ['contract_number','nik_number_of_debtor','name_of_debtor','place_birth_of_debtor','date_birth_of_debtor','date_birth_of_debtor_in_word','business_partners_relationship','business_type','street_of_debtor','subdistrict_of_debtor','district_of_debtor','city_of_debtor','province_of_debtor','phone_number_of_debtor','bank_account_number','name_of_bank','name_of_account_holder','virtual_account_number','topup_contract','previous_topup_amount','loan_amount','loan_amount_in_word','flat_rate','flat_rate_by_word','term','term_by_word','admin_fee','admin_fee_in_word','notaris_fee','notaris_fee_in_word','admin_rate','admin_rate_in_word','tlo','tlo_in_word','life_insurance','life_insurance_in_word','stamp_amount','financing_agreement_amount','security_agreement_amount','upgrading_land_rights_amount','total_amount','net_amount','net_amount_in_word'];
  };

  React.useEffect(() => {
    if (selectedDirector) (async () => {
      try {
        const res = await requestWithAuth({ method: 'get', url: '/api/directors/', params: { name: selectedDirector } });
        const director = res.data.director || null;
        if (director) setHeaderFields(prev => (inModal && (createOnly || editOnly || contractOnly)) ? uppercaseStringsRecursive({ ...prev, phone_number_of_lolc: director.phone_number_of_lolc || '', Name_of_director: selectedDirector }) : ({ ...prev, phone_number_of_lolc: director.phone_number_of_lolc || '', Name_of_director: selectedDirector }));
      } catch (err) {
        console.warn('Failed to load director details', err);
      }
    })();
  }, [selectedDirector]);

  const collateralFields = [ 'name_bpkb_owner','bpkb_number','wheeled_vehicle','vehicle_type','vehicle_brand','vehicle_model','engine_number','chassis_number','colour','plate_number','manufactured_year'];

// Formatting helpers are imported from shared utilities to avoid duplication



const isIsoDate = (s) => {
  if (!s) return false;
  return /^\d{4}-\d{2}-\d{2}$/.test(String(s));
};



const getMonthInRomanNumeral = (monthNumber) => {
  const romanNumerals = ['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII'];
  return romanNumerals[monthNumber - 1] || '';
};

// Helper: normalize numeric input strings to preserve decimal separator when pasted
// More robust: strip stray characters, detect decimal separator by last occurrence,
// collapse multiple grouping separators and ensure only one decimal point remains.
const normalizeNumericInput = (input) => {
  if (input === null || input === undefined) return '';
  let s = String(input).trim();
  if (s === '') return '';

  // Keep only digits, dot, comma, minus and whitespace
  s = s.replace(/[^0-9.,\-\s]/g, '').trim();

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

 

// Styles constant used by the inlined form
const styles = {
  container: { padding: '20px', backgroundColor: '#f5f5f5', minHeight: '100vh' },
  label: { fontSize: '13px', fontWeight: '600', color: '#333', letterSpacing: '0.5px' },
  input: { padding: '10px 12px', fontSize: '14px', border: '1px solid #ddd', borderRadius: '6px', outline: 'none', backgroundColor: '#f9f9f9', fontFamily: 'inherit' },
  btnPrimary: { padding: '10px 20px', fontSize: '14px', fontWeight: '600', background: 'linear-gradient(135deg, #0a1e3d 0%, #051626 100%)', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' },
  btnSecondary: { padding: '10px 20px', fontSize: '14px', fontWeight: '600', backgroundColor: 'white', color: '#0a1e3d', border: '2px solid #0a1e3d', borderRadius: '6px', cursor: 'pointer' }
};

// Helper utilities for uv-collateral field resolution
const findKeyInObj = (obj, targetKey) => {
  if (!obj || !targetKey) return null;
  const normalize = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const nt = normalize(targetKey);
  if (obj.hasOwnProperty(targetKey)) return targetKey;
  if (obj.hasOwnProperty(targetKey.toLowerCase())) return targetKey.toLowerCase();
  for (const k of Object.keys(obj)) { if (normalize(k) === nt) return k; }
  const alternates = [targetKey.replace(/plat_/i, 'plate_'), targetKey.replace(/plate_/i, 'plat_'), targetKey.replace(/chassis_/i, 'chassis_'), targetKey.replace(/vehicle_/i, 'vehicle_')];
  for (const alt of alternates) {
    if (obj.hasOwnProperty(alt)) return alt;
    if (obj.hasOwnProperty(alt.toLowerCase())) return alt.toLowerCase();
  }
  const parts = targetKey.split('_').map(p => p.toLowerCase()).filter(Boolean);
  for (const k of Object.keys(obj)) {
    const lk = k.toLowerCase(); let score = 0;
    for (const p of parts) if (p.length > 2 && lk.includes(p)) score++;
    if (score >= Math.max(1, Math.floor(parts.length / 2))) return k;
  }
  return null;
};

const firstCollateralObject = (coll) => {
  if (!coll) return null;
  if (Array.isArray(coll)) return coll.length ? coll[0] : null;
  if (typeof coll === 'object') return coll;
  return null;
};

const deriveUvCollateralFieldsFromObj = (collObj) => {
  if (!collObj || typeof collObj !== 'object') return [];
  const exclude = new Set(['id', 'uv_collateral_id', 'contract_number', 'created_by', 'created_at', 'updated_at', 'update_at']);
  const keys = Object.keys(collObj || {}).filter(k => !exclude.has(k));
  const order = ['name_bpkb_owner','bpkb_number','wheeled_vehicle','vehicle_type','vehicle_types','vehicle_brand','vehicle_model','engine_number','chassis_number','colour','plat_number','plate_number','manufactured_year'];
  const ordered = [];
  for (const k of order) {
    const actual = findKeyInObj(collObj, k);
    if (actual && keys.includes(actual) && !ordered.includes(actual)) ordered.push(actual);
  }
  for (const k of keys) if (!ordered.includes(k)) ordered.push(k);
  return ordered;
};

// --- End helpers ---

  const loadContracts = async () => {
    setLoadingContracts(true);
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
    try {
      const res = await requestWithAuth({ method: 'get', url: '/api/master-data/branches/' });
      const items = res.data.branches || [];
      setBranches(items);
      console.log('Loaded branches count:', items.length, items.slice(0,3));
    } catch (err) {
      console.error('Error loading branches:', err);
      if (!err.response || err.response.status !== 401) setError(t('failed_load_branches'));
    } finally { setLoadingBranches(false); }
  };

  const loadDirectors = async () => {
    setLoadingDirectors(true);
    try {
      const res = await requestWithAuth({ method: 'get', url: '/api/directors/' });
      setDirectors(res.data.directors || []);
    } catch (err) {
      console.error('Error loading directors:', err);
      if (!err.response || err.response.status !== 401) setError(t('failed_load_directors'));
    } finally { setLoadingDirectors(false); }
  };

  const loadBMByCity = async (city) => {
    if (!city) return;
    try {
      const params = {};
      if (String(city).match(/^\d+$/)) params.bm_id = city; else params.city = city;
      const res = await requestWithAuth({ method: 'get', url: '/api/branch-manager/', params });
      const bm = res.data.bm || {};
      setBmData(prevBmData => {
        const newBm = { ...prevBmData };
        bmFields.forEach((f) => { if (bm[f] !== undefined && bm[f] !== null && bm[f] !== '') { newBm[f] = bm[f]; } });
        try {
          const raw = newBm.date_birth_of_bm;
          const iso = parseDateFromDisplay(raw) || raw;
          newBm.date_birth_of_bm_in_word = getIndonesianDateInWords(iso || raw) || newBm.date_birth_of_bm_in_word || '';
          if (iso) newBm.date_birth_of_bm = iso;
        } catch (e) { /* ignore */ }
        return newBm;
      });
    } catch (err) { console.error('Error loading BM for city/bm_id:', err); }
  };

  const handleView = async (overrideContractNumber, forCreate = false) => {
    const cn = (overrideContractNumber !== undefined && overrideContractNumber !== null) ? String(overrideContractNumber) : String(contractNumber);
    if (!cn || !cn.trim()) { setDebtor(null); setCollateral(null); setError(''); return; }
    setLoading(true); setError('');
    try {
      // For create flows, prefer the contracts table as source-of-truth and
      // fetch uv_collateral separately so the modal's Contract and Collateral
      // containers reflect the contracts table + uv_collateral schema.
      const token = localStorage.getItem('access_token');
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
      if (forCreate) {
        // Fetch contract row from dedicated lookup endpoint
        const respContract = await requestWithAuth({ method: 'get', url: '/api/contracts/lookup/', params: { contract_number: cn } });
        const contractRow = respContract.data?.contract || (Array.isArray(respContract.data) ? respContract.data[0] : respContract.data) || {};
        setDebtor((inModal && (createOnly || editOnly || contractOnly)) ? (contractRow.debtor ? uppercaseStringsRecursive(contractRow.debtor) : null) : (contractRow.debtor || null));
        // map contract fields into contractData
        const directContractData = {};
        contractFields.forEach((f) => { directContractData[f] = findValueInObj(contractRow, f) ?? ''; });
        setContractData(computeContractWordFields(directContractData));

        // Fetch UV collateral rows (prefer first) to determine uvCollateralFields and prefill collateralData
        try {
          const respColl = await requestWithAuth({ method: 'get', url: '/api/uv-collateral/', params: { contract_number: cn } });
          console.log('UVAgreement: uv-collateral response', respColl && respColl.data);
          const respCollCollateral = respColl.data?.collateral;
          const collFromCollateral = Array.isArray(respCollCollateral) ? respCollCollateral[0] : respCollCollateral;
          const collItem = respColl.data?.results?.[0] || collFromCollateral || (Array.isArray(respColl.data) ? respColl.data[0] : respColl.data) || {};
          console.log('UVAgreement: selected collateral item', collItem);
          const newCollateralData = { ...(collItem || {}) };
          // Ensure plate and name fields are strings
          try {
            const plateKey = findKeyInObj(newCollateralData, 'plate_number') || findKeyInObj(newCollateralData, 'plate_number') || 'plate_number';
            const nameKey = findKeyInObj(newCollateralData, 'name_bpkb_owner') || 'name_bpkb_owner';
            if (plateKey && newCollateralData.hasOwnProperty(plateKey)) newCollateralData[plateKey] = newCollateralData[plateKey] == null ? '' : String(newCollateralData[plateKey]);
            if (nameKey && newCollateralData.hasOwnProperty(nameKey)) newCollateralData[nameKey] = newCollateralData[nameKey] == null ? '' : String(newCollateralData[nameKey]);
          } catch (e) { /* ignore */ }
          try {
            let uvKeys = [];
            if (Array.isArray(respColl.data?.columns) && respColl.data.columns.length) {
              uvKeys = respColl.data.columns.filter(k => !/^(id|uv_collateral_id|contract_number|created_by|created_at|updated_at)$/i.test(k));
            } else {
              uvKeys = Object.keys(newCollateralData).filter(k => !/^(id|uv_collateral_id|contract_number|created_by|created_at|updated_at)$/i.test(k));
            }
            console.log('UVAgreement: uvCollateralFields resolved', uvKeys);
            setUvCollateralFields(uvKeys);
          } catch (e) { console.warn('UVAgreement: uvCollateralFields extraction failed', e); }
          setCollateralData((inModal && (createOnly || editOnly || contractOnly)) ? uppercaseStringsRecursive(newCollateralData) : newCollateralData);
        } catch (e) {
          console.warn('uv-collateral fetch failed for create filter load', e);
          setCollateralData({});
        }

        setHeaderFields(prev => ({ ...prev, agreement_date: contractRow.agreement_date ?? prev.agreement_date }));
        return;
      }

      const response = await requestWithAuth({ method: 'get', url: `/api/uv-agreement/`, params: { contract_number: cn } });
      setDebtor((inModal && (createOnly || editOnly || contractOnly)) ? (response.data.debtor ? uppercaseStringsRecursive(response.data.debtor) : null) : (response.data.debtor || null));
      // normalize collateral response to object and coerce plate/name to strings
      try {
        let respColl = response.data.collateral || null;
        if (Array.isArray(respColl)) respColl = respColl.length ? respColl[0] : null;
        if (respColl && typeof respColl === 'object') {
          const plateKey = findKeyInObj(respColl, 'plate_number') || findKeyInObj(respColl, 'plate_number') || 'plate_number';
          const nameKey = findKeyInObj(respColl, 'name_bpkb_owner') || 'name_bpkb_owner';
          if (plateKey && respColl.hasOwnProperty(plateKey)) respColl[plateKey] = respColl[plateKey] == null ? '' : String(respColl[plateKey]);
          if (nameKey && respColl.hasOwnProperty(nameKey)) respColl[nameKey] = respColl[nameKey] == null ? '' : String(respColl[nameKey]);
        }
        setCollateral((inModal && (createOnly || editOnly || contractOnly)) ? (respColl ? uppercaseStringsRecursive(respColl) : respColl) : respColl);
      } catch (e) { setCollateral(response.data.collateral || null); }
      if (editOnly || initialContractNumber) {
        const blRow = response.data.debtor || response.data || {};
        const directContractData = {};
        contractFields.forEach((f) => { directContractData[f] = findValueInObj(blRow, f) ?? ''; });
        // Only populate BM and branch from explicit API response objects; do not fallback to debtor
        const bmResp = response.data.branch_manager || response.data.bm || response.data.bm_data || {};
        const directBmData = {};
        bmFields.forEach((f) => { directBmData[f] = bmResp[f] ?? ''; });
        try {
          const raw = directBmData.date_birth_of_bm;
          const iso = parseDateFromDisplay(raw) || raw;
          directBmData.date_birth_of_bm_in_word = getIndonesianDateInWords(iso || raw) || directBmData.date_birth_of_bm_in_word || '';
          if (iso) directBmData.date_birth_of_bm = iso;
        } catch (e) { /* ignore */ }
        const branchResp = response.data.branch || {};
        const directBranchData = {
          street_name: branchResp.street_name ?? branchResp.street_of_bm ?? '',
          subdistrict: branchResp.subdistrict ?? '',
          district: branchResp.district ?? '',
          city: branchResp.city ?? '',
          province: branchResp.province ?? '',
          // For edit mode, display branch phone from agreement-level `phone_number_of_bm`
          phone_number_branch: (bmResp && (bmResp.phone_number_of_bm !== undefined && bmResp.phone_number_of_bm !== null)) ? bmResp.phone_number_of_bm : ((blRow && (blRow.phone_number_of_bm !== undefined && blRow.phone_number_of_bm !== null)) ? blRow.phone_number_of_bm : (branchResp.phone_number_branch ?? ''))
        };
        let coll = response.data.collateral || {};
        if (Array.isArray(coll)) coll = coll[0] || {};
        let directCollateralData = { ...(coll || {}) };
        try {
          let uvKeys = [];
          if (Array.isArray(response.data.columns) && response.data.columns.length) {
            uvKeys = response.data.columns.filter(k => !/^(id|uv_collateral_id|contract_number|created_by|created_at|updated_at)$/i.test(k));
          } else {
            uvKeys = Object.keys(directCollateralData).filter(k => !/^(id|uv_collateral_id|contract_number|created_by|created_at|updated_at)$/i.test(k));
          }
          setUvCollateralFields(uvKeys);
        } catch (e) {}
        // For EDIT mode: take place_of_agreement from BL table only (blRow.place_of_agreement)
        const directHeader = {
          ...headerFields,
          agreement_date: blRow.agreement_date ?? headerFields.agreement_date,
          place_of_agreement: (blRow.place_of_agreement ?? headerFields.place_of_agreement),
          Name_of_director: blRow.Name_of_director ?? blRow.name_of_director ?? headerFields.Name_of_director,
          phone_number_of_lolc: blRow.phone_number_of_lolc ?? blRow.phone_of_lolc ?? headerFields.phone_number_of_lolc,
          sp3_number: blRow.sp3_number ?? blRow.sp3No ?? headerFields.sp3_number,
          sp3_date: blRow.sp3_date ?? blRow.sp3Date ?? headerFields.sp3_date,
          // Map date_of_delegated from backend if present (common alternate keys tolerated)
          date_of_delegated: blRow.date_of_delegated ?? blRow.dateOfDelegated ?? headerFields.date_of_delegated
        };
        setContractData(computeContractWordFields(directContractData));
        setBmData((inModal && (createOnly || editOnly || contractOnly)) ? uppercaseStringsRecursive(directBmData) : directBmData);
        setBranchData((inModal && (createOnly || editOnly || contractOnly)) ? uppercaseStringsRecursive(directBranchData) : directBranchData);
        setCollateralData((inModal && (createOnly || editOnly || contractOnly)) ? uppercaseStringsRecursive(directCollateralData) : directCollateralData);
        const known = new Set([...contractFields, ...bmFields, ...branchFields, ...collateralFields, Object.keys(directHeader || {})]);
        const extras = {};
        Object.keys(blRow || {}).forEach(k => { if (!known.has(k) && k !== 'id') extras[k] = blRow[k]; });
        setExtraFields(extras);
        setHeaderFields(prev => (inModal && (createOnly || editOnly || contractOnly)) ? uppercaseStringsRecursive({ ...prev, ...directHeader }) : ({ ...prev, ...directHeader }));
        if (!response.data.collateral) setCollateral(response.data.collateral || null);
        return;
      }
      const d = response.data.debtor || {};
      let c = response.data.collateral || {};
      if (Array.isArray(c)) c = c[0] || {};
      const newContractData = {};
      contractFields.forEach((f) => { newContractData[f] = d[f] ?? '' });
      const newBmData = {};
      bmFields.forEach((f) => { newBmData[f] = '' });
      // Only consider explicit branch-manager keys returned by the API
      const bmFromResp = response.data.bm || response.data.branch_manager || response.data.bm_data;
      if (bmFromResp && Object.keys(bmFromResp).length > 0) {
        const respKeys = Object.keys(bmFromResp || {});
        const normalize = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '').replace(/of/g, '');
        const normMap = {};
        respKeys.forEach(k => { normMap[normalize(k)] = k; });
        bmFields.forEach((f) => { const nf = normalize(f); const sourceKey = normMap[nf]; if (sourceKey && bmFromResp[sourceKey] !== undefined && bmFromResp[sourceKey] !== null) newBmData[f] = bmFromResp[sourceKey]; });
      }
      // Only use explicit `branch` object returned by the API; do not fallback to debtor fields
      const branchFromResp = response.data.branch || null;
      const newBranchData = {
        street_name: branchFromResp?.street_name ?? branchFromResp?.street_of_bm ?? '',
        subdistrict: branchFromResp?.subdistrict ?? '',
        district: branchFromResp?.district ?? '',
        city: branchFromResp?.city ?? '',
        province: branchFromResp?.province ?? ''
      };
      // Prefer agreement-level phone when available (bm/ debtor), fallback to branch's phone
      newBranchData.phone_number_branch = (bmFromResp && (bmFromResp.phone_number_of_bm !== undefined && bmFromResp.phone_number_of_bm !== null)) ? bmFromResp.phone_number_of_bm : ((d && (d.phone_number_of_bm !== undefined && d.phone_number_of_bm !== null)) ? d.phone_number_of_bm : (branchFromResp?.phone_number_branch ?? ''));
      const newCollateralData = { ...(c || {}) };
      try { const uvKeys = Object.keys(newCollateralData).filter(k => !/^(id|uv_collateral_id|contract_number|created_by|created_at|updated_at)$/i.test(k)); setUvCollateralFields(uvKeys); } catch (e) {}
      try {
        const raw = newBmData.date_birth_of_bm;
        const iso = parseDateFromDisplay(raw) || raw;
        newBmData.date_birth_of_bm_in_word = getIndonesianDateInWords(iso || raw) || newBmData.date_birth_of_bm_in_word || '';
        if (iso) newBmData.date_birth_of_bm = iso;
      } catch (e) { /* ignore */ }
      setContractData(newContractData);
      setBmData((inModal && (createOnly || editOnly || contractOnly)) ? uppercaseStringsRecursive(newBmData) : newBmData);
      setBranchData((inModal && (createOnly || editOnly || contractOnly)) ? uppercaseStringsRecursive(newBranchData) : newBranchData);
      setCollateralData((inModal && (createOnly || editOnly || contractOnly)) ? uppercaseStringsRecursive(newCollateralData) : newCollateralData);
      setHeaderFields(prev => ({
        ...prev,
        agreement_date: response.data.agreement_date ?? prev.agreement_date,
        sp3_number: response.data.sp3_number ?? prev.sp3_number,
        sp3_date: response.data.sp3_date ?? prev.sp3_date
      }));
    } catch (err) { console.error('handleView failed', err); } finally { setLoading(false); }
  };

  React.useEffect(() => { loadContracts(); loadBranches(); loadDirectors(); }, []);

  // If user is BM or CSA, auto-select user's branch_id after branches load (match BL behavior)
  React.useEffect(() => {
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

  // Auto-select user's branch in CREATE modal (same as BLAgreement)
  React.useEffect(() => {
    try {
      if (!createOnly) return; // only for modal create
      if (!branches || branches.length === 0) return;
      if (selectedBranchId) return; // skip if already selected
      const raw = localStorage.getItem('user_data');
      if (!raw) return;
      const ud = JSON.parse(raw);
      const bid = ud.branch_id || ud.branch || ud.branchId || null;
      if (!bid) return;
      setSelectedBranchId(String(bid));
      handleBranchSelectLoad(bid);
    } catch (e) { /* ignore */ }
  }, [createOnly, branches, selectedBranchId]);

  const handleBranchSelectLoad = (branchId) => {
    if (!branchId) return;
    const sel = (branches || []).find(b => String(b.id) === String(branchId));
    console.log('handleBranchSelectLoad called for branchId=', branchId, 'branchesLoaded=', (branches||[]).length);
    if (!sel) { console.warn('handleBranchSelectLoad: branch not found for id', branchId); return; }
    const mappedBranch = { street_name: sel.street_name ?? sel.street_of_bm ?? '', subdistrict: sel.subdistrict ?? sel.subdistrict_of_bm ?? '', district: sel.district ?? sel.district_of_bm ?? '', city: sel.city ?? sel.city_of_bm ?? sel.name ?? '', province: sel.province ?? sel.province_of_bm ?? '', phone_number_branch: sel.phone_number_branch ?? '' };
    setBranchData((inModal && (createOnly || editOnly || contractOnly)) ? uppercaseStringsRecursive(mappedBranch) : mappedBranch);
    // Only set place_of_agreement from branch selection when creating a new UV (modal create)
    if (createOnly) setHeaderFields(prev => (inModal && (createOnly || editOnly || contractOnly)) ? uppercaseStringsRecursive({ ...prev, place_of_agreement: sel.name || prev.place_of_agreement || '' }) : ({ ...prev, place_of_agreement: sel.name || prev.place_of_agreement || '' }));
    setBmData(prev => {
      const mapped = {
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
      };
      try {
        const raw = mapped.date_birth_of_bm;
        const iso = parseDateFromDisplay(raw) || raw;
        mapped.date_birth_of_bm_in_word = getIndonesianDateInWords(iso || raw) || prev.date_birth_of_bm_in_word || '';
        if (iso) mapped.date_birth_of_bm = iso;
      } catch (e) { /* ignore */ }
      const out = { ...prev, ...mapped };
      return (inModal && (createOnly || editOnly || contractOnly)) ? uppercaseStringsRecursive(out) : out;
    });
    if ((!sel.name_of_bm || !sel.date_birth_of_bm) && sel.bm_id) loadBMByCity(sel.bm_id);
  };

  React.useEffect(() => {
    if (!createOnly) return;
    if (!selectedBranchId) return;
    const sel = (branches || []).find(b => String(b.id) === String(selectedBranchId));
    if (sel) {
      const mapped = {};
      mapped.street_of_bm = sel.street_name_of_bm ?? sel.street_of_bm ?? sel.street_name ?? '';
      mapped.subdistrict_of_bm = sel.subdistrict_of_bm ?? sel.subdistrict ?? '';
      mapped.district_of_bm = sel.district_of_bm ?? sel.district ?? '';
      mapped.city_of_bm = sel.city_of_bm ?? sel.city ?? sel.name ?? '';
      mapped.province_of_bm = sel.province_of_bm ?? sel.province ?? '';
      mapped.name_of_bm = sel.name_of_bm ?? '';
      mapped.place_birth_of_bm = sel.place_birth_of_bm ?? '';
      mapped.date_birth_of_bm = sel.date_birth_of_bm ?? sel.date_of_birth_of_bm ?? '';
      mapped.nik_number_of_bm = sel.nik_number_of_bm ?? '';
      mapped.phone_number_of_bm = sel.phone_number_of_bm ?? '';
      setBmData(prev => {
        const out = { ...prev, ...mapped };
        try {
          const raw = out.date_birth_of_bm;
          const iso = parseDateFromDisplay(raw) || raw;
          out.date_birth_of_bm_in_word = getIndonesianDateInWords(iso || raw) || out.date_birth_of_bm_in_word || '';
          if (iso) out.date_birth_of_bm = iso;
        } catch (e) { /* ignore */ }
        return (inModal && (createOnly || editOnly || contractOnly)) ? uppercaseStringsRecursive(out) : out;
      });
      if ((!mapped.name_of_bm || !mapped.place_birth_of_bm || !mapped.date_birth_of_bm) && sel.bm_id) { loadBMByCity(sel.bm_id); }
    } else {
      loadBMByCity(selectedBranchId);
    }
  }, [createOnly, selectedBranchId, branches]);

  React.useEffect(() => {
    if (!initialContractNumber) return;
    setContractNumber(initialContractNumber);
    // When opened for edit, load the existing contract so the modal shows
    // prefilled data instead of the create UI.
    try {
      handleView(String(initialContractNumber), false).catch(() => {});
    } catch (e) {
      console.warn('Initial contract load failed', e);
    }
  }, [initialContractNumber]);

  // When parent requests an explicit filter-load, handle it here.
  React.useEffect(() => {
    if (!initialFilterNumber || !initialFilterTrigger) return;
    setContractNumber(initialFilterNumber);
    (async () => { try { await handleView(initialFilterNumber, createOnly); } catch (err) { console.warn('Initial filter load failed', err); } })();
  }, [initialFilterTrigger]);

  // Auto-trigger load when user types into the filter (debounced)
  React.useEffect(() => {
    if (hideFilter) return undefined;
    if (initialContractNumber) return undefined;
    const shouldTrigger = (contractNumber && contractNumber.toString().trim() !== '') || (selectedBranchId && selectedBranchId !== '') || (selectedDirector && selectedDirector !== '');
    if (!shouldTrigger) return undefined;
    const timer = setTimeout(() => {
      console.log('UVAgreement: auto-load timer fired', { contractNumber, selectedBranchId, selectedDirector, createOnly });
      if (contractNumber && contractNumber.toString().trim() !== '') { handleView(undefined, createOnly).catch((e) => { console.warn('handleView error (auto-load):', e); }); return; }
      if (selectedBranchId && selectedBranchId !== '') { try { handleBranchSelectLoad(selectedBranchId); } catch (e) { console.warn('Branch preload failed', e); } return; }
    }, 600);
    return () => clearTimeout(timer);
  }, [contractNumber, selectedBranchId, selectedDirector, hideFilter, createOnly, initialContractNumber]);

  React.useEffect(() => {
    const raw = localStorage.getItem('user_data');
    if (raw) {
      try { const parsed = JSON.parse(raw); setUsernameDisplay(parsed.username || parsed.full_name || ''); } catch (e) {}
    }
    (async () => {
      try {
        const res = await requestWithAuth({ method: 'get', url: '/api/whoami/' });
        setUsernameDisplay(res.data.username || res.data.full_name || '');
      } catch (err) {
        console.warn('whoami fetch failed', err);
      }
    })();
  }, []);

  React.useEffect(() => {
    try {
      const ad = headerFields?.agreement_date;
      if (!ad) return;
      const iso = parseDateFromDisplay(ad) || ad;
      const dayName = getIndonesianDayName(iso) || '';
      const dateWords = getIndonesianDateInWords(iso) || '';
      const dayNameU = (typeof dayName === 'string') ? dayName.toUpperCase() : dayName;
      const dateWordsU = (typeof dateWords === 'string') ? dateWords.toUpperCase() : dateWords;
      setHeaderFields(prev => ({ ...prev,
        agreement_day_in_word: dayNameU || prev.agreement_day_in_word || '',
        agreement_date_in_word: dateWordsU || prev.agreement_date_in_word || '',
        // backward-compatible keys
        agreement_day_inword: dayNameU || prev.agreement_day_inword || '',
        agreement_date_inword: dateWordsU || prev.agreement_date_inword || '',
        date_of_delegated: iso || prev.date_of_delegated,
        // keep SP3 date following the agreement date by default
        sp3_date: iso || prev.sp3_date
      }));
    } catch (e) { /* ignore */ }
  }, [headerFields?.agreement_date]);

  // Auto-generate SP3 Number using agreement date (original shared behavior)
  React.useEffect(() => {
    const cn = (contractData && contractData.contract_number) || (contractNumber || '');
    const dateSource = headerFields.agreement_date || headerFields.sp3_date || '';
    if (dateSource && cn) {
      try {
        const sp3Date = new Date(String(dateSource) + 'T00:00:00');
        if (!isNaN(sp3Date.getTime())) {
          const month = sp3Date.getMonth() + 1;
          const year = sp3Date.getFullYear();
          const romanMonth = getMonthInRomanNumeral(month);
          const generatedSP3Number = `${cn}/OL/LOLCVI/${romanMonth}/${year}`;
          setHeaderFields(prev => (inModal && (createOnly || editOnly || contractOnly)) ? uppercaseStringsRecursive({ ...prev, sp3_number: generatedSP3Number }) : ({ ...prev, sp3_number: generatedSP3Number }));
        }
      } catch (e) { /* ignore */ }
    }
  }, [headerFields.agreement_date, headerFields.sp3_date, contractData.contract_number, contractNumber]);

  // Only auto-fill place_of_agreement from BM when creating a new UV; editing should keep BL value
  React.useEffect(() => { if (createOnly && !selectedBranchId && bmData.city_of_bm) { setHeaderFields(prev => (inModal && (createOnly || editOnly || contractOnly)) ? uppercaseStringsRecursive({ ...prev, place_of_agreement: bmData.city_of_bm || prev.place_of_agreement }) : ({ ...prev, place_of_agreement: bmData.city_of_bm || prev.place_of_agreement })); } }, [bmData.city_of_bm, createOnly, selectedBranchId]);

  React.useEffect(() => { const raw = bmData.date_birth_of_bm; if (raw !== undefined && raw !== null && String(raw).trim() !== '') { const iso = parseDateFromDisplay(raw); const words = getIndonesianDateInWords(iso || raw); const wordsU = (typeof words === 'string') ? words.toUpperCase() : words; setBmData(prev => { if (prev.date_birth_of_bm === iso && prev.date_birth_of_bm_in_word === wordsU) return prev; const out = { ...prev, date_birth_of_bm_in_word: wordsU }; if (iso && prev.date_birth_of_bm !== iso) out.date_birth_of_bm = iso; return out; }); console.log('Converted BM date_birth to words:', raw, '=>', wordsU, '(iso:', iso, ')'); } }, [bmData.date_birth_of_bm]);

  React.useEffect(() => { const raw = contractData.date_birth_of_debtor; if (raw !== undefined && raw !== null && String(raw).trim() !== '') { const iso = parseDateFromDisplay(raw); const words = getIndonesianDateInWords(iso || raw); const wordsU = (typeof words === 'string') ? words.toUpperCase() : words; setContractData(prev => { if (prev.date_birth_of_debtor === iso && prev.date_birth_of_debtor_in_word === wordsU) return prev; const out = { ...prev, date_birth_of_debtor_in_word: wordsU }; if (iso && prev.date_birth_of_debtor !== iso) out.date_birth_of_debtor = iso; return out; }); console.log('Converted debtor date_birth to words:', raw, '=>', wordsU, '(iso:', iso, ')'); } }, [contractData.date_birth_of_debtor]);

  React.useEffect(() => { if (contractData.loan_amount !== undefined && contractData.loan_amount !== null && contractData.loan_amount !== '') { try { const raw = contractData.loan_amount; const n = Number(String(raw).replace(/\./g, '').replace(/,/g, '.')) || 0; const words = (n === 0) ? '' : (getIndonesianNumberWord(String(raw)) || ''); const wordsU = (typeof words === 'string') ? words.toUpperCase() : words; setContractData(prev => ({ ...prev, loan_amount_in_word: wordsU })); console.log('Converted loan_amount to words:', contractData.loan_amount, '=>', wordsU); } catch (e) { /* ignore */ } } }, [contractData.loan_amount]);
  React.useEffect(() => {
    try {
      const sum = getNumFromValue(contractData.admin_fee) + getNumFromValue(contractData.notaris_fee) + getNumFromValue(contractData.tlo) + getNumFromValue(contractData.life_insurance) + getNumFromValue(contractData.admin_rate);
      if (String(contractData.total_amount || '') !== String(sum)) {
        setContractData(prev => ({ ...prev, total_amount: sum }));
      }
    } catch (e) { /* ignore */ }
  }, [contractData.admin_fee, contractData.notaris_fee, contractData.tlo, contractData.life_insurance, contractData.admin_rate]);
  React.useEffect(() => {
    try {
      const net = getNumFromValue(contractData.loan_amount) - getNumFromValue(contractData.previous_topup_amount) - getNumFromValue(contractData.admin_fee) - getNumFromValue(contractData.notaris_fee) - getNumFromValue(contractData.admin_rate);
      if (String(contractData.net_amount || '') !== String(net)) {
        setContractData(prev => ({ ...prev, net_amount: net }));
      }
    } catch (e) { /* ignore */ }
  }, [contractData.loan_amount, contractData.previous_topup_amount, contractData.admin_fee, contractData.notaris_fee, contractData.admin_rate]);

  React.useEffect(() => {
    if (contractData.net_amount !== undefined && contractData.net_amount !== null && contractData.net_amount !== '') {
      try {
        const raw = contractData.net_amount;
        const n = Number(String(raw).replace(/\./g, '').replace(/,/g, '.')) || 0;
        const words = (n === 0) ? '' : (getIndonesianNumberWord(String(raw)) || '');
        if (String(contractData.net_amount_in_word || '') !== String(words)) {
          setContractData(prev => ({ ...prev, net_amount_in_word: words }));
        }
      } catch (e) { /* ignore */ }
    } else {
      if (contractData.net_amount_in_word && contractData.net_amount_in_word !== '') {
        setContractData(prev => ({ ...prev, net_amount_in_word: '' }));
      }
    }
  }, [contractData.net_amount]);

  React.useEffect(() => { if (contractData.term !== undefined && contractData.term !== null && contractData.term !== '') { try { const raw = contractData.term; const n = Number(String(raw).replace(/\./g, '').replace(/,/g, '.')) || 0; const words = (n === 0) ? '' : (getIndonesianNumberWord(String(raw)) || ''); const wordsU = (typeof words === 'string') ? words.toUpperCase() : words; setContractData(prev => ({ ...prev, term_by_word: wordsU })); console.log('Converted term to words:', contractData.term, '=>', wordsU); } catch (e) { /* ignore */ } } }, [contractData.term]);

  // Helper utilities (copied from BLAgreementForm) so render code can use them
  // Use shared `formatFieldName` from utils/formatting for Title Case labels

  const formatFieldValue = (value) => {
    if (value === null || value === undefined) return '-';
    if (typeof value === 'boolean') return t(value ? 'yes' : 'no');
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  };

  const formatLabel = (f) => {
    if (!f) return '';
    if (f === 'notaris_fee') return t('notaris_fee');
    if (f === 'notaris_fee_in_word') return t('notaris_fee_in_word');
    if (f === 'flat_rate') return t('flat_rate');
    if (f === 'flat_rate_by_word') return t('flat_rate_by_word');
    return formatFieldNameLocal(f);
  };

  // Local wrapper to prefer reactive `t` from `useT()` and fall back to shared `formatFieldName`
  const formatFieldNameLocal = (name) => {
    if (!name) return '';
    try {
      const tr = (typeof t === 'function') ? t(name) : undefined;
      if (tr && tr !== name) return tr;
    } catch (e) { /* ignore */ }
    return formatFieldName(name);
  };

  const handleContractNumberChange = (value) => {
    const v12 = String(value || '').slice(0, 12);
    setContractNumber(v12);
    // update dropdown suggestions
    if (v12 && v12.trim()) {
      const q = v12.toString().toLowerCase();
      const filtered = (contracts || []).filter(c => String(c).toLowerCase().includes(q));
      setFilteredContracts(filtered); setShowContractDropdown(filtered.length > 0);
      // small debounce before triggering view to avoid flood of requests
      if (handleContractNumberChange._timer) clearTimeout(handleContractNumberChange._timer);
      handleContractNumberChange._timer = setTimeout(() => {
        try { handleView(v12, true); } catch (e) { /* ignore if handler not ready */ }
      }, 250);
    } else {
      setFilteredContracts(contracts || []); setShowContractDropdown(false);
      if (handleContractNumberChange._timer) { clearTimeout(handleContractNumberChange._timer); handleContractNumberChange._timer = null; }
    }
  };

  

  const handleInputChange = (section, field, value) => {
    try { console.debug('handleInputChange', section, field, value, 'len', (value || '').toString().length); } catch (e) { /* ignore logging errors */ }
    if (section === 'bm') {
      if (String(field).toLowerCase().includes('nik')) {
        const raw = String(value || '').replace(/\D/g, '').slice(0,16);
        setBmData(prev => ({ ...prev, [field]: raw }));
      } else if (String(field).toLowerCase().includes('date')) { const iso = parseDateFromDisplay(value); setBmData(prev => ({ ...prev, [field]: iso })); } else { const outVal = (inModal && (createOnly || editOnly || contractOnly) && typeof value === 'string') ? value.toUpperCase() : value; setBmData(prev => ({ ...prev, [field]: outVal })); }
    }
    if (section === 'branch') { const outVal = (inModal && (createOnly || editOnly || contractOnly) && typeof value === 'string') ? value.toUpperCase() : value; setBranchData(prev => ({ ...prev, [field]: outVal })); }
    if (section === 'contract') {
      // enforce max length for contract identifiers
      if (field === 'contract_number' || field === 'topup_contract') {
        value = String(value || '').slice(0,12);
      }
      if (String(field).toLowerCase().includes('nik')) {
        const raw = String(value || '').replace(/\D/g, '').slice(0,16);
        setContractData(prev => ({ ...prev, [field]: raw }));
        // If in Add-Contract modal and user typed full 16-digit NIK, attempt autofill
        if (inModal && contractOnly && raw && raw.length === 16) {
          (async () => {
            try {
              // try cached contracts first
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
                  const nikFields = ['name_of_debtor','place_birth_of_debtor','date_birth_of_debtor','date_birth_of_debtor_in_word','business_partners_relationship','business_type','street_of_debtor','subdistrict_of_debtor','district_of_debtor','city_of_debtor','province_of_debtor','phone_number_of_debtor'];
                  nikFields.forEach((f) => {
                    const v = findValueInObj(c, f);
                    if (v !== undefined && v !== null && String(v).trim() !== '') mapped[f] = v;
                  });
                  if (Object.keys(mapped).length) setContractData(prev => computeContractWordFields({ ...prev, ...mapped }));
                }
                return;
              }
              // fallback: fetch contracts table and try to match by NIK
                try {
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
                    const nikFields2 = ['name_of_debtor','place_birth_of_debtor','date_birth_of_debtor','date_birth_of_debtor_in_word','business_partners_relationship','business_type','street_of_debtor','subdistrict_of_debtor','district_of_debtor','city_of_debtor','province_of_debtor','phone_number_of_debtor'];
                    nikFields2.forEach((f) => {
                      const v = findValueInObj(c2, f);
                      if (v !== undefined && v !== null && String(v).trim() !== '') mapped2[f] = v;
                    });
                    if (Object.keys(mapped2).length) setContractData(prev => computeContractWordFields({ ...prev, ...mapped2 }));
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
      // handle rate fields (show comma on UI, store with dot)
      if (rateFields && rateFields.includes(field)) {
        const rateVal = String(value || '').replace(',', '.');
        setContractData(prev => ({ ...prev, [field]: rateVal }));
        return;
      }
      if (numericFields.includes(field)) {
        const raw = normalizeNumericInput(value || '');
        setContractData(prev => ({ ...prev, [field]: raw }));
      } else {
        if (String(field).toLowerCase().includes('date')) {
          const iso = parseDateFromDisplay(value);
          setContractData(prev => ({ ...prev, [field]: iso }));
        } else {
          const outVal = (inModal && (createOnly || contractOnly) && typeof value === 'string') ? value.toUpperCase() : value;
          setContractData(prev => ({ ...prev, [field]: outVal }));
        }
      }
    }
    if (section === 'collateral') {
      if (numericFields.includes(field)) {
        const raw = normalizeNumericInput(value || '');
        setCollateralData(prev => ({ ...prev, [field]: raw }));
      } else {
        if (String(field).toLowerCase().includes('date')) {
          const iso = parseDateFromDisplay(value);
          setCollateralData(prev => ({ ...prev, [field]: iso }));
        } else {
          const outVal = (inModal && (createOnly || editOnly || contractOnly) && typeof value === 'string') ? value.toUpperCase() : value;
          setCollateralData(prev => ({ ...prev, [field]: outVal }));
        }
      }
    }
    if (section === 'header') { if (String(field).toLowerCase().includes('date')) { const iso = parseDateFromDisplay(value); setHeaderFields(prev => ({ ...prev, [field]: iso })); } else { const outVal = (inModal && (createOnly || editOnly || contractOnly) && typeof value === 'string') ? value.toUpperCase() : value; setHeaderFields(prev => ({ ...prev, [field]: outVal })); } }
  };

  

  // compact styles when rendered inside modal to better fit header (match BLAgreement behavior)
  const compact = !!inModal;
  const labelStyle = compact ? { ...styles.label, fontSize: 12, marginBottom: 4 } : styles.label;
  const inputStyle = compact ? { ...styles.input, padding: '8px 10px', fontSize: 13, borderRadius: 4 } : styles.input;
  const sectionPadding = compact ? 8 : 12;
  const h4Style = { marginTop: 0, fontSize: compact ? 14 : 16 };

  // Contract fields and renderer (keeps JSX concise)
  // Updated: include date_birth_of_debtor_in_word; remove mortgage_amount; add admin_rate, tlo, life_insurance and their _in_word counterparts
  const contractFieldList = [
    'name_of_debtor','place_birth_of_debtor','date_birth_of_debtor','date_birth_of_debtor_in_word','street_of_debtor','subdistrict_of_debtor','district_of_debtor','city_of_debtor','province_of_debtor','nik_number_of_debtor','phone_number_of_debtor','business_partners_relationship','business_type','bank_account_number','name_of_bank','name_of_account_holder','virtual_account_number','topup_contract','previous_topup_amount','loan_amount','loan_amount_in_word','net_amount','net_amount_in_word','term','term_by_word','flat_rate','flat_rate_by_word','admin_fee','admin_fee_in_word','notaris_fee','notaris_fee_in_word','admin_rate','admin_rate_in_word','tlo','tlo_in_word','life_insurance','life_insurance_in_word','stamp_amount','financing_agreement_amount','security_agreement_amount','upgrading_land_rights_amount','total_amount'
  ];
  // handling_fee removed from UV forms per request
  const renderContractField = (f) => {
    const isWordField = /(_in_word|_by_word)$/.test(f);
    const baseField = f.replace(/(_in_word|_by_word)$/, '');
    let value = '';
    if (isWordField) {
      if (isDateFieldName(baseField)) {
        value = getIndonesianDateInWords(contractData[baseField]) || contractData[f] || '';
          } else {
        const raw = contractData[baseField];
          if (raw === '' || raw === null || raw === undefined) {
            value = contractData[f] || '';
          } else {
            try {
              const n = Number(String(raw).replace(/\./g, '').replace(/,/g, '.')) || 0;
              value = (n === 0) ? (contractData[f] || '') : (getIndonesianNumberWord(String(raw)) || contractData[f] || '');
            } catch (e) { value = contractData[f] || ''; }
          }
      }
      // ensure display is UPPERCASE
      if (value && typeof value === 'string') value = value.toUpperCase();
      return (
        <div key={f} style={{ display: 'flex', flexDirection: 'column' }}>
          <label style={labelStyle}>{formatLabel(f)}</label>
          <input type="text" placeholder="" style={inputStyle} value={value} disabled />
        </div>
      );
    }
    const isNumericInput = /amount|loan|flat_rate|mortgage|previous_topup_amount|notaris_fee|admin_fee|admin_rate|tlo|life_insurance|net_amount|stamp_amount|financing_agreement_amount|security_agreement_amount|upgrading_land_rights_amount|total_amount/i.test(f);
    const isDate = isDateFieldName(f);
    const inputType = isDate ? 'date' : (isNumericInput ? 'text' : 'text');
    // Render specific dropdown for business_partners_relationship
    if (f === 'business_partners_relationship') {
      return (
        <div key={f} style={{ display: 'flex', flexDirection: 'column' }}>
          <label style={labelStyle}>{formatLabel(f)}</label>
          <select value={contractData[f] ?? ''} onChange={(e) => handleInputChange('contract', f, e.target.value)} style={inputStyle}>
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
    const isModalReadOnly = inModal && (f === 'total_amount' || f === 'net_amount');
    const isNikField = /nik/i.test(f);
    const maxLen = isNikField ? 16 : (f === 'contract_number' || f === 'topup_contract' ? 12 : undefined);
    return (
      <div key={f} style={{ display: 'flex', flexDirection: 'column' }}>
        <label style={labelStyle}>{formatLabel(f)}</label>
        <input
          type={inputType}
          value={isDate ? (contractData[f] || '') : (isNumericInput ? (rateFields && rateFields.includes(f) ? String(contractData[f] || '').replace('.', ',') : formatNumberWithDots(contractData[f])) : (contractData[f] ?? ''))}
          onChange={(e) => {
            if (isModalReadOnly) return;
            let v = e.target.value;
            if (rateFields && rateFields.includes(f)) v = String(v || '').replace('.', ',');
            handleInputChange('contract', f, v);
          }}
          maxLength={maxLen}
          style={{ ...inputStyle, backgroundColor: isModalReadOnly ? '#f5f5f5' : undefined }}
          disabled={isModalReadOnly}
        />
      </div>
    );
  };

  if (contractOnly) {
    const visibleContractFields = getVisibleContractFields(true);
    // Determine required fields for this modal (exclude virtual_account_number, topup_contract, admin_rate and previous_topup_amount)
    const requiredFields = visibleContractFields.filter(f => !['virtual_account_number', 'topup_contract', 'admin_rate', 'previous_topup_amount'].includes(f) && !/_in_word$|_by_word$/.test(f));
    return (
      <div style={{ padding: 20, minWidth: 560 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {visibleContractFields.map(f => {
            const isWordField = /(_in_word|_by_word)$/.test(f);
            const baseField = f.replace(/(_in_word|_by_word)$/, '');
            let value = '';
            let disabled = false;
            if (isWordField) {
              disabled = true;
              if (/date|birth/i.test(baseField)) { value = getIndonesianDateInWords(contractData[baseField]) || contractData[f] || ''; } else {
                try {
                  const raw = contractData[baseField];
                  const n = Number(String(raw).replace(/\./g, '').replace(/,/g, '.')) || 0;
                  value = (n === 0) ? (contractData[f] || '') : (getIndonesianNumberWord(String(raw)) || contractData[f] || '');
                } catch (e) { value = contractData[f] || ''; }
              }
              if (value && typeof value === 'string') value = value.toUpperCase();
            } else { if (String(f).toLowerCase().includes('date')) { value = formatDateDisplay(contractData[f]); } else if (numericFields.includes(f)) { value = (rateFields && rateFields.includes(f)) ? String(contractData[f] || '').replace('.', ',') : formatNumberWithDots(contractData[f]); } else { value = contractData[f] ?? ''; } }
            if (f === 'business_partners_relationship') {
              return (
                <div key={f} style={{ display: 'flex', flexDirection: 'column' }}>
                  <label style={labelStyle}>{formatLabel(f)}</label>
                  <select
                    value={contractData[f] ?? ''}
                    onChange={(e) => handleInputChange('contract', f, e.target.value)}
                    style={inputStyle}
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
            return (
                <div key={f} style={{ display: 'flex', flexDirection: 'column' }}>
                <label style={labelStyle}>{formatLabel(f)}{requiredFields.includes(f) ? <span style={{ color: '#a33', marginLeft: 6 }}>*</span> : null}</label>
                {(!isWordField && String(f).toLowerCase().includes('date')) ? (
                  <input type="date" style={inputStyle} value={disabled ? value : (contractData[f] || '')} disabled={disabled} onChange={(e) => { if (!disabled) { let v = e.target.value; if (rateFields && rateFields.includes(f)) v = String(v || '').replace('.', ','); handleInputChange('contract', f, v); } }} />
                ) : (
                  (numericFields.includes(f) && !isWordField) ? (
                    <input
                      type="text"
                      style={inputStyle}
                      value={disabled ? value : (rateFields && rateFields.includes(f) ? String(contractData[f] || '').replace('.', ',') : formatNumberWithDots(contractData[f]))}
                      disabled={disabled}
                      onChange={(e) => {
                        if (disabled) return;
                        try {
                          let raw = e.target.value || '';
                          if (rateFields && rateFields.includes(f)) {
                            raw = String(raw || '').replace('.', ',');
                            // store via existing handler to keep rate parsing
                            handleInputChange('contract', f, raw);
                          } else {
                            const norm = normalizeNumericInput(raw || '');
                            console.debug('UVAgreement:norm onChange', f, { raw, norm, parsed: parseToNumber(norm) });
                            const outNorm = (inModal && (createOnly || editOnly || contractOnly) && typeof norm === 'string') ? norm.toUpperCase() : norm;
                            setContractData(prev => ({ ...prev, [f]: outNorm }));
                          }
                        } catch (err) { /* ignore */ }
                      }}
                      onPaste={(e) => {
                        try {
                          if (disabled) return;
                          e.preventDefault();
                          const text = (e.clipboardData && e.clipboardData.getData) ? e.clipboardData.getData('text') : (window.clipboardData ? window.clipboardData.getData('Text') : '');
                          if (rateFields && rateFields.includes(f)) {
                            const rv = String(text || '').replace('.', ',');
                            handleInputChange('contract', f, rv);
                          } else {
                            const raw = normalizeNumericInput(text || '');
                            console.debug('UVAgreement:normalized paste', f, { clipboard: text, raw, parsed: parseToNumber(raw) });
                            const outRaw = (inModal && (createOnly || editOnly || contractOnly) && typeof raw === 'string') ? raw.toUpperCase() : raw;
                            setContractData(prev => ({ ...prev, [f]: outRaw }));
                          }
                        } catch (err) { /* ignore paste errors */ }
                      }}
                      maxLength={( /nik/i.test(f) ? 16 : (f === 'contract_number' || f === 'topup_contract' ? 12 : undefined) )}
                    />
                  ) : (
                    <input type="text" placeholder={String(f).toLowerCase().includes('date') ? 'DD/MM/YYYY' : ''} style={inputStyle} value={disabled ? value : (contractData[f] || '')} disabled={disabled} onChange={(e) => { if (!disabled) { let v = e.target.value; if (rateFields && rateFields.includes(f)) v = String(v || '').replace('.', ','); handleInputChange('contract', f, v); } }} maxLength={( /nik/i.test(f) ? 16 : (f === 'contract_number' || f === 'topup_contract' ? 12 : undefined) )} />
                  )
                )}
              </div>
            );
          })}
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
          <button className="btn-save" onClick={handleContractOnlySave} disabled={contractOnlySaving}>{contractOnlySaving ? t('saving') : t('save')}</button>
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
                <label style={labelStyle}>{t('contract_number')}{inModal && <span style={{ color: '#a33', marginLeft: 6 }}>*</span>}</label>
                <input
                  placeholder={t('contract_number')}
                  value={contractNumber}
                  onChange={(e) => handleContractNumberChange(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { handleView(contractNumber, true); } }}
                  style={inputStyle}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <label style={labelStyle}>{t('branch_label')}{inModal && <span style={{ color: '#a33', marginLeft: 6 }}>*</span>}</label>
                <select value={selectedBranchId || ''} onChange={(e) => { setSelectedBranchId(e.target.value); handleBranchSelectLoad(e.target.value); }} style={inputStyle}>
                  <option value="">{t('select_branch_placeholder')}</option>
                  {(branches || []).map(b => <option key={b.id} value={b.id}>{b.name || b.branch_name || b.city || b.id}</option>)}
                </select>
              </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                <label style={labelStyle}>{t('tab_director')}{inModal && <span style={{ color: '#a33', marginLeft: 6 }}>*</span>}</label>
                <select value={selectedDirector || ''} onChange={(e) => {
                    const v = e.target.value;
                            setSelectedDirector(v);
                    const found = (directors || []).find(d => String(d.id) === String(v) || d.name === v || d.name_of_director === v || (typeof d === 'string' && d === v));
                    if (found) {
                          if (typeof found === 'string') {
                            setHeaderFields(prev => (inModal && (createOnly || editOnly || contractOnly)) ? uppercaseStringsRecursive({ ...prev, name_of_director: found || prev.name_of_director || '' }) : ({ ...prev, name_of_director: found || prev.name_of_director || '' }));
                          } else {
                            const hdr = {
                              ...headerFields,
                              name_of_director: found.name_of_director || found.name || headerFields.name_of_director || '',
                              phone_number_of_lolc: found.phone_number_of_lolc || found.phone_number_of_director || headerFields.phone_number_of_lolc || ''
                            };
                            setHeaderFields(prev => (inModal && (createOnly || editOnly || contractOnly)) ? uppercaseStringsRecursive({ ...prev, ...hdr }) : ({ ...prev, ...hdr }));
                          }
                        }
                  }} style={inputStyle}>
                  <option value="">{t('select_director_placeholder')}</option>
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
                          try {
                            const raw = headerFields[base];
                            const n = Number(String(raw).replace(/\./g, '').replace(/,/g, '.')) || 0;
                            val = (n === 0) ? (headerFields[f] || '') : (getIndonesianNumberWord(String(raw)) || headerFields[f] || '');
                          } catch (e) { val = headerFields[f] || ''; }
                        }
                        const titleCase = (s) => (s && typeof s === 'string') ? s : '';
                        const displayVal = (inModal && typeof val === 'string') ? val.toUpperCase() : titleCase(val);
                        return <input type="text" value={displayVal} disabled style={{ ...inputStyle, backgroundColor: '#f5f5f5' }} />;
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
              <h4 style={h4Style}>{t('tab_contract')}</h4>
              <div style={{ display: 'grid', gridTemplateColumns: inModal ? '1fr 1fr' : '1fr 1fr 1fr', gap: 8 }}>
                {(() => {
                  const fieldsToRender = inModal
                    ? ((createOnly || editOnly || contractOnly) ? getModalContractTableFields().filter(f => !hiddenForUV.has(f)) : getVisibleContractFields(true))
                    : contractFieldList;
                  return fieldsToRender.map(renderContractField);
                })()}
              </div>
            </div>

            {/* Collateral container */}
              <div style={inModal ? {} : { border: '1px solid #e6e6e6', padding: sectionPadding, borderRadius: 6 }}>
              <h4 style={h4Style}>{t('collateral')}</h4>
              <div style={{ display: 'grid', gridTemplateColumns: inModal ? '1fr 1fr' : '1fr 1fr 1fr', gap: 8 }}>
                {(() => {
                  const defaultUvFields = ['vehicle_type','vehicle_brand','vehicle_model','plate_number','chassis_number','engine_number','manufactured_year','colour','bpkb_number','name_bpkb_owner'];
                  // Filter out generic/invalid column names that sometimes come from API (e.g. 'collateral', 'columns')
                  const filtered = (Array.isArray(uvCollateralFields) ? uvCollateralFields.filter(k => {
                    if (!k || typeof k !== 'string') return false;
                    const kk = k.trim();
                    if (!kk) return false;
                    if (/^(collateral|columns|column|fields?)$/i.test(kk)) return false;
                    return true;
                  }) : []);
                  const effectiveFields = (filtered && filtered.length) ? filtered : defaultUvFields;
                  return effectiveFields.map(f => {
                  // resolve actual key present in collateralData (handles vehicle_type/vehicle_types, plat/plate, chassis/chassis, vehicle/vehicle variants)
                  const actualKey = findKeyInObj(collateralData || {}, f) || f;
                  const keyForState = actualKey;
                  const labelName = (keyForState === 'vehicle_type' || keyForState === 'vehicle_types') ? t('vehicle_types') : formatLabel(keyForState);
                  // Treat only explicit numeric collateral fields as numbers; avoid treating plate_number or bpkb owner/name as numeric.
                  const inputType = /(?:surface_area|capacity_of_building|^number_of_|_amount$|^manufactured_year$)/i.test(keyForState) ? 'number' : (isDateFieldName(keyForState) ? 'date' : 'text');
                  // Render dropdown for wheeled_vehicle
                  if (keyForState === 'wheeled_vehicle') {
                    return (
                      <div key={f} style={{ display: 'flex', flexDirection: 'column' }}>
                        <label style={labelStyle}>{labelName}</label>
                        <select value={collateralData[keyForState] ?? ''} onChange={(e) => handleInputChange('collateral', keyForState, e.target.value)} style={inputStyle}>
                          <option value="">{t('-- Select --') || '-- Select --'}</option>
                          <option value="RODA DUA">RODA DUA</option>
                          <option value="RODA TIGA">RODA TIGA</option>
                          <option value="RODA EMPAT">RODA EMPAT</option>
                        </select>
                      </div>
                    );
                  }
                  return (
                    <div key={f} style={{ display: 'flex', flexDirection: 'column' }}>
                      <label style={labelStyle}>{labelName}</label>
                      <input type={inputType} value={collateralData[keyForState] ?? ''} onChange={(e) => handleInputChange('collateral', keyForState, e.target.value)} style={inputStyle} />
                    </div>
                  );
                  });
                })()}
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16, marginTop: 12 }}>
          {/* Branch Manager */}
          <div style={inModal ? {} : { border: '1px solid #e6e6e6', padding: sectionPadding, borderRadius: 6 }}>
            <h4 style={h4Style}>{t('tab_branch_manager')}</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {['name_of_bm','place_birth_of_bm','date_birth_of_bm','date_birth_of_bm_in_word','nik_number_of_bm','street_of_bm','subdistrict_of_bm','district_of_bm','city_of_bm','province_of_bm'].map(f => (
                <div key={f} style={{ display: 'flex', flexDirection: 'column' }}>
                  <label style={labelStyle}>{formatLabel(f)}</label>
                    {f === 'date_birth_of_bm_in_word' ? (
                    (() => { const base = 'date_birth_of_bm'; const val = getIndonesianDateInWords(bmData[base]) || bmData[f] || ''; const titleCase = (s) => (s && typeof s === 'string') ? s : ''; const displayVal = (inModal && typeof val === 'string') ? val.toUpperCase() : titleCase(val); return <input type="text" value={displayVal} disabled style={{ ...inputStyle, backgroundColor: '#f5f5f5' }} /> })()
                  ) : (
                    <input type={/date/i.test(f) ? 'date' : 'text'} value={bmData[f] ?? ''} onChange={(e) => handleInputChange('bm', f, e.target.value)} style={inputStyle} />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Branches */}
          <div style={inModal ? {} : { border: '1px solid #e6e6e6', padding: sectionPadding, borderRadius: 6 }}>
            <h4 style={h4Style}>{t('tab_branches')}</h4>
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
          <div style={{ fontSize: 14, color: '#333', fontWeight: 600 }}>{t('user')}:</div>
          <div style={{ padding: '8px 12px', backgroundColor: '#fff', border: '1px solid #ddd', borderRadius: 6 }}>{usernameDisplay || '-'}</div>
        </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
          <button type="button" style={{ ...styles.btnPrimary, minWidth: 120 }} onClick={handleSave} disabled={saving}>{saving ? t('saving') : ((editOnly || initialContractNumber) ? t('update') : t('save'))}</button>
        </div>
      </div>
    </div>
  );

}

// Sediakan pembungkus lokal untuk UV sehingga Create/Edit dapat diimpor dari file ini
export function UVAgreementCreate(props = {}) {
  return <UVAgreementForm {...props} createOnly={true} editOnly={false} hideFilter={false} hideHeader={false} />;
}

export function UVAgreementEdit({ initialContractNumber = '', onSaved, ...rest } = {}) {
  return <UVAgreementForm initialContractNumber={initialContractNumber} onSaved={onSaved} createOnly={false} editOnly={true} hideFilter={true} hideHeader={false} inModal={true} {...rest} />;
}

export default function UVAgreement() {
  const t = useT();

  // Local wrapper to prefer reactive `t` and fall back to shared `formatFieldName`
  const formatFieldNameLocal = (name) => {
    if (!name) return '';
    try {
      const tr = (typeof t === 'function') ? t(name) : undefined;
      if (tr && tr !== name) return tr;
    } catch (e) { /* ignore */ }
    return formatFieldName(name);
  };
  const [agreements, setAgreements] = useState([]);
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [contracts, setContracts] = useState([]);
  const [columns, setColumns] = useState([]);
  const [accessMap, setAccessMap] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create' or 'edit'
  const [contractNumber, setContractNumber] = useState('');
  const [modalFilterContractNumber, setModalFilterContractNumber] = useState('');
  const [modalFilterTrigger, setModalFilterTrigger] = useState(0);
  const [formDebtorName, setFormDebtorName] = useState('');
  const [formNik, setFormNik] = useState('');
  const [formCollateralType, setFormCollateralType] = useState('');
  const [savingModal, setSavingModal] = useState(false);
  const [contractOnlyMode, setContractOnlyMode] = useState(false);
  const [collateralMode, setCollateralMode] = useState(false);
  const [lastSavedContract, setLastSavedContract] = useState(null);
  const [contractFormData, setContractFormData] = useState({
    contract_number: '', nik_number_of_debtor: '', name_of_debtor: '', place_birth_of_debtor: '', date_birth_of_debtor: '', date_birth_of_debtor_in_word: '', street_of_debtor: '', subdistrict_of_debtor: '', district_of_debtor: '', city_of_debtor: '', province_of_debtor: '', phone_number_of_debtor: '', business_partners_relationship: '', business_type: '', loan_amount: '', loan_amount_in_word: '', net_amount: '', net_amount_in_word: '', term: '', term_by_word: '', flat_rate: '', flat_rate_by_word: '', bank_account_number: '', name_of_bank: '', name_of_account_holder: '', virtual_account_number: '', notaris_fee: '', notaris_fee_in_word: '', admin_fee: '', admin_fee_in_word: '', topup_contract: '', previous_topup_amount: '', admin_rate: '', admin_rate_in_word: '', tlo: '', tlo_in_word: '', life_insurance: '', life_insurance_in_word: ''
  });

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

  // load cached contracts for faster NIK/contract lookups used by modal autofill
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const resp = await requestWithAuth({ method: 'get', url: '/api/bl-agreement/contracts/' });
        if (cancelled) return;
        setContracts(resp.data?.contracts || []);
      } catch (err) {
        console.error('Error loading contracts cache:', err);
      }
    })();
    return () => { cancelled = true; };
  }, []);
  

  // handler for contract number changes inside the UV Add-Contract modal
  const handleUvContractNumberModalChange = async (value) => {
    try {
      const v12 = String(value || '').slice(0, 12);
      setContractFormData(prev => ({ ...prev, contract_number: v12 }));
      const trimmed = String(value || '').trim();
      if (!trimmed) return;
      if (!contractOnlyMode) return;
      if (trimmed.length < 3) return;
      const data = await fetchContractLookup(trimmed);
      const c = data.contract || data || {};
      const mapped = {};
      // map only non-empty fields into contractFormData to avoid overwriting typed fields
      Object.keys(contractFormData).forEach((f) => {
        const v = c[f] ?? c[Object.keys(c).find(k => k.toLowerCase().replace(/[^a-z0-9]/g,'') === f.toLowerCase().replace(/[^a-z0-9]/g,''))];
        if (v !== undefined && v !== null && String(v).trim() !== '') mapped[f] = v;
      });
      if (Object.keys(mapped).length) {
        if (mapped.contract_number) mapped.contract_number = String(mapped.contract_number).slice(0,12);
        if (mapped.topup_contract) mapped.topup_contract = String(mapped.topup_contract).slice(0,12);
        setContractFormData(prev => computeContractWordFields({ ...prev, ...mapped }));
      }
    } catch (e) {
      console.error('handleUvContractNumberModalChange failed', e);
    }
  };
  const contractFieldRefs = useRef({});
  const [contractFormErrors, setContractFormErrors] = useState({});
  // Return true when all visible, non-readonly contract fields (except
  // virtual_account_number and topup_contract) are non-empty.
  const getRequiredContractFields = () => {
    const contractTableFields = ['contract_number','nik_number_of_debtor','name_of_debtor','place_birth_of_debtor','date_birth_of_debtor','date_birth_of_debtor_in_word','business_partners_relationship','business_type','street_of_debtor','subdistrict_of_debtor','district_of_debtor','city_of_debtor','province_of_debtor','phone_number_of_debtor','bank_account_number','name_of_bank','name_of_account_holder','virtual_account_number','topup_contract','previous_topup_amount','loan_amount','loan_amount_in_word','flat_rate','flat_rate_by_word','term','term_by_word','admin_fee','admin_fee_in_word','notaris_fee','notaris_fee_in_word','admin_rate','admin_rate_in_word','tlo','tlo_in_word','life_insurance','life_insurance_in_word','stamp_amount','financing_agreement_amount','security_agreement_amount','upgrading_land_rights_amount','total_amount','net_amount','net_amount_in_word'];
    const hiddenForUVLocal = new Set(['mortgage_amount', 'mortgage_amount_in_word', 'stamp_amount', 'financing_agreement_amount', 'security_agreement_amount', 'upgrading_land_rights_amount']);
    let fields = contractTableFields.filter(f => !hiddenForUVLocal.has(f));
    // exclude the two optional fields
    fields = fields.filter(f => f !== 'virtual_account_number' && f !== 'topup_contract');
    // handling_fee removed from forms; nothing to exclude here
    // exclude read-only word fields
    fields = fields.filter(f => !(/(_in_word|_by_word)$/.test(f)));
    // Do not treat previous_topup_amount and admin_rate as required (no asterisk)
    fields = fields.filter(f => f !== 'previous_topup_amount' && f !== 'admin_rate');
    return fields;
  };

  const isContractFormValid = () => {
    const fields = getRequiredContractFields();
    for (const f of fields) {
      const v = contractFormData && contractFormData[f];
      if (v === undefined || v === null) return false;
      if (String(v).trim() === '') return false;
    }
    return true;
  };
  const [collateralForm, setCollateralForm] = useState({
    contract_number: '',
    name_of_debtor: '',
    vehicle_type: '',
    vehicle_brand: '',
    vehicle_model: '',
    plate_number: '',
    chassis_number: '',
    engine_number: '',
    manufactured_year: '',
    colour: '',
    bpkb_number: '',
    name_bpkb_owner: ''
  });
  const [collateralSaving, setCollateralSaving] = useState(false);
  const [collateralError, setCollateralError] = useState('');
  const collateralFetchTimer = useRef(null);
  // Required fields for UV collateral modal (all visible fields)
  const requiredUvCollateralFields = ['contract_number','name_of_debtor','name_bpkb_owner','bpkb_number','wheeled_vehicle','vehicle_type','vehicle_brand','vehicle_model','engine_number','chassis_number','colour','plate_number','manufactured_year'];
  const isUvCollateralFormValid = () => {
    for (const f of requiredUvCollateralFields) {
      const v = collateralForm[f];
      if (v === undefined || v === null) return false;
      if (String(v).trim() === '') return false;
    }
    return true;
  };

  

  
  // Default UV collateral fields (local to this wrapper component)
  const blCollateralFields = [ 'collateral_type','number_of_certificate','number_of_ajb','surface_area','name_of_collateral_owner','capacity_of_building','location_of_land' ];
  const uvDefaultCollateralFields = [ 'vehicle_type','vehicle_brand','vehicle_model','plate_number','chassis_number','engine_number','manufactured_year','colour','bpkb_number','name_bpkb_owner' ];
  const collateralFields = uvDefaultCollateralFields;
  const [uvCollateralFields, setUvCollateralFields] = useState(collateralFields);

  // Use shared `requestWithAuth` from ../../utils/api (imported at top)

  // Gaya field form lokal agar sesuai dengan form lain
  const fieldLabelStyle = { fontSize: 13, fontWeight: 600, color: '#333', marginBottom: 6 };
  const fieldInputStyle = { padding: '10px 12px', fontSize: 14, border: '1px solid #ddd', borderRadius: 6, outline: 'none', width: '100%', boxSizing: 'border-box' };
  const fieldGroupStyle = { display: 'flex', flexDirection: 'column' };

  useEffect(() => { loadAgreements(); }, []);

  // When user types a contract number in the add-collateral modal, try to fetch
  // the contract/debtor info and autofill `name_of_debtor`. Debounced to avoid
  // too many requests while typing.
  useEffect(() => {
    const cn = (collateralForm.contract_number || '').toString().trim();
    if (collateralFetchTimer.current) { clearTimeout(collateralFetchTimer.current); collateralFetchTimer.current = null; }
    if (!cn) {
      // clear name if contract number empty
      setCollateralForm(prev => ({ ...prev, name_of_debtor: '' }));
      return;
    }
    collateralFetchTimer.current = setTimeout(async () => {
      try {
        const base = 'uv-agreement';
        const res = await requestWithAuth({ method: 'get', url: `/api/${base}/`, params: { contract_number: cn } });
        const debtor = res.data?.debtor || res.data || {};
        const name = debtor.name_of_debtor || debtor.name || debtor.debtor_name || '';
        if (name) setCollateralForm(prev => ({ ...prev, name_of_debtor: name }));
        // attempt to load uv_collateral rows for this contract and populate collateral fields
        try {
          const respColl = await requestWithAuth({ method: 'get', url: '/api/uv-collateral/', params: { contract_number: cn } });
          const collData = respColl.data?.collateral || respColl.data || [];
          const collRow = Array.isArray(collData) ? (collData[0] || null) : (collData || null);
          if (collRow) {
            const mapped = {};
            const keys = ['vehicle_type','vehicle_brand','vehicle_model','plate_number','chassis_number','engine_number','manufactured_year','colour','bpkb_number','name_bpkb_owner','wheeled_vehicle'];
            keys.forEach(k => {
              const v = findValueInObj(collRow, k);
              if (v !== undefined && v !== null && String(v).trim() !== '') mapped[k] = v;
            });
            if (Object.keys(mapped).length) {
              if (mapped.contract_number) mapped.contract_number = String(mapped.contract_number).slice(0,12);
              if (mapped.topup_contract) mapped.topup_contract = String(mapped.topup_contract).slice(0,12);
              setCollateralForm(prev => ({ ...prev, ...mapped }));
            }
          }
        } catch (e) {
          // ignore collateral fetch errors
          console.warn('uv_collateral fetch failed for', cn, e?.response?.data || e.message || e);
        }
      } catch (err) {
        // silently ignore not-found / errors; keep existing value
        console.warn('Failed to fetch contract for collateral modal:', err?.response?.data || err.message || err);
      }
    }, 450);

    return () => { if (collateralFetchTimer.current) { clearTimeout(collateralFetchTimer.current); collateralFetchTimer.current = null; } };
  }, [collateralForm.contract_number]);

  const loadAgreements = async () => {
    setLoading(true);
    setError('');
    try {
      // Ambil data dari endpoint UV agreement
      const res = await requestWithAuth({ method: 'get', url: '/api/uv-agreement/' });
      let items = res.data?.agreements || res.data?.results || res.data || [];
      if (!Array.isArray(items)) items = items ? [items] : [];
      // keep raw item plus some normalized convenience fields
      const rows = items.map(item => {
        // Prefer vehicle type fields from the TOP-LEVEL uv_agreement row (item)
        // so the table reflects columns from `uv_agreement` rather than nested collateral.
        const vehicleVal = item.vehicle_type || item.vehicle_type || item.collateral_type || item.uv_collateral_type || ((item.collateral && (item.collateral.vehicle_type || item.collateral.vehicle_types || item.collateral.collateral_type)) || '') ;
        const normalized = {
          agreement_date: item.agreement_date || item.header?.agreement_date || item.created_at || item.created || item.date_created || '',
          contract_number: item.contract_number || (item.contract && item.contract.contract_number) || '',
          name_of_debtor: (item.debtor || item.contract || {}).name_of_debtor || item.name_of_debtor || item.debtor_name || '',
          nik_number_of_debtor: (item.debtor || item.contract || {}).nik_number_of_debtor || item.nik_number_of_debtor || item.debtor_nik || '',
          vehicle_type: vehicleVal,
          vehicle_types: vehicleVal,
          created_by: item.created_by || item.created_by_name || item.created_by_user || item.created_by_user_name || ''
        };
        return { raw: item, ...normalized };
      });
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
                if (!accessMap[r.contract_number]) {
                  fetchAccessForContract(r.contract_number).catch(e => {});
                }
              }
            } catch (e) {}
          });
        }
      } catch (e) {}

      // determine dynamic columns from raw items (union of keys)
      const colsSet = new Set();
      items.forEach(it => {
        if (it && typeof it === 'object') Object.keys(it).forEach(k => colsSet.add(k));
      });
      // prefer a few known columns first
      const preferred = ['agreement_date', 'contract_number', 'name_of_debtor', 'nik_number_of_debtor', 'vehicle_type', 'vehicle_types', 'created_by'];
      const dynamic = Array.from(colsSet).filter(c => !preferred.includes(c));
      let ordered = [...preferred.filter(p => colsSet.has(p)), ...dynamic];
      // Ensure `vehicle_type` (or `vehicle_types`) column appears after `nik_number_of_debtor` even if
      // the physical column isn't present in uv_agreement (we derive it from nested collateral).
      if (!ordered.includes('vehicle_type') && !ordered.includes('vehicle_types')) {
        const insertAfter = ordered.indexOf('nik_number_of_debtor');
        if (insertAfter >= 0) {
          ordered = [...ordered.slice(0, insertAfter + 1), 'vehicle_type', ...ordered.slice(insertAfter + 1)];
        } else {
          // fallback: append near start
          ordered.splice(1, 0, 'vehicle_type');
        }
      }
      setColumns(ordered);
      // Derive collateral field names from returned items (if nested `collateral` objects exist)
      try {
        const collKeys = new Set();
        items.forEach(it => {
          if (it && typeof it === 'object') {
            let c = it.collateral || it.collateral_data || it.uv_collateral || null;
            if (Array.isArray(c)) c = c[0] || null;
            if (c && typeof c === 'object') Object.keys(c).forEach(k => collKeys.add(k));
          }
        });
        const derived = Array.from(collKeys);
        const filtered = derived.filter(k => !/^(id|uv_collateral_id|contract_number|created_by|created_at|updated_at)$/i.test(k));
        if (filtered.length) setUvCollateralFields(filtered);
        else setUvCollateralFields(collateralFields);
      } catch (e) {
        // fallback to defaults on error
        setUvCollateralFields(collateralFields);
      }
    } catch (err) {
      console.error('Error loading UV agreements', err);
      setError(t('failed_load_uv_agreement'));
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
      const res = await requestWithAuth({ method: 'get', url: `/api/uv-agreement/?contract_number=${encodeURIComponent(cn)}` });
      // backend mengembalikan { debtor: ..., collateral: ... }
      return res.data || {};
    } catch (err) {
      console.error('Failed fetch contract', err);
      return {};
    }
  };

  const fetchAccessForContract = async (contractNumber) => {
    if (!contractNumber) return null;
    try {
      const url = `/api/uv-agreement/${encodeURIComponent(contractNumber)}/access/`;
      const res = await requestWithAuth({ method: 'get', url });
      if (res && res.data) {
        setAccessMap(prev => ({ ...prev, [contractNumber]: res.data }));
        return res.data;
      }
    } catch (err) {
      return null;
    }
    return null;
  };

  // Delete handler for UV agreement rows (component-scoped so it can access state)
  const handleDeleteRow = async (row) => {
    if (!row || !row.contract_number) return;
    const ok = window.confirm(`Delete agreement ${row.contract_number}? This cannot be undone.`);
    if (!ok) return;
    try {
      setError('');
      await requestWithAuth({ method: 'delete', url: `/api/uv-agreement/?contract_number=${encodeURIComponent(row.contract_number)}` });
      toast.success('Record deleted');
      await loadAgreements();
    } catch (err) {
      console.error('Delete failed', err);
      const msg = err?.response?.data?.error || t('delete_failed');
      setError(msg);
      toast.error(msg);
    }
  };

  const handleDownloadRow = async (row) => {
    if (!row.contract_number) { setError(t('contract_number_empty')); return; }
    try {
      // Download Agreement (DOCX or PDF if backend returns PDF)
      const url1 = `/api/uv-agreement/download-docx/?contract_number=${encodeURIComponent(row.contract_number)}&type=agreement`;
      const res1 = await requestWithAuth({ method: 'get', url: url1, responseType: 'blob' });
      const contentType1 = (res1.headers && res1.headers['content-type']) || '';
      const isPdf1 = contentType1.includes('pdf');
      const blob1 = new Blob([res1.data], { type: contentType1 || (isPdf1 ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') });
      if (contentType1.includes('application/json')) {
        const text = await blob1.text();
        try { const js = JSON.parse(text); const msg = js.error || js.detail || JSON.stringify(js); setError(t('download_failed_prefix') + msg); return; } catch (e) { setError(t('download_unparseable')); return; }
      }
      const link1 = document.createElement('a');
      link1.href = window.URL.createObjectURL(blob1);
      link1.download = `UV_Agreement_${row.contract_number}${isPdf1 ? '.pdf' : '.docx'}`;
      document.body.appendChild(link1);
      link1.click(); link1.remove();

      // small delay then download SP3
      await new Promise(resolve => setTimeout(resolve, 500));
      const url2 = `/api/uv-agreement/download-docx/?contract_number=${encodeURIComponent(row.contract_number)}&type=sp3`;
      const res2 = await requestWithAuth({ method: 'get', url: url2, responseType: 'blob' });
      const contentType2 = (res2.headers && res2.headers['content-type']) || '';
      const blob2 = new Blob([res2.data], { type: contentType2 || 'application/octet-stream' });
      if (contentType2.includes('application/json')) {
        const text = await blob2.text();
        try { const js = JSON.parse(text); const msg = js.error || js.detail || JSON.stringify(js); setError(t('sp3_download_failed_prefix') + msg); return; } catch (e) { setError(t('download_unparseable')); return; }
      }
      const link2 = document.createElement('a');
      link2.href = window.URL.createObjectURL(blob2);
      link2.download = `UV_SP3_${row.contract_number}.docx`;
      document.body.appendChild(link2);
      link2.click(); link2.remove();
    } catch (err) {
      console.error('Download failed', err); setError(t('failed_download_documents'));
    }
  };

  const handleDownloadPdf = async (row) => {
    if (!row.contract_number) { setError(t('contract_number_empty')); return; }
    try {
      // Agreement PDF
      const url1 = `/api/uv-agreement/download-docx/?contract_number=${encodeURIComponent(row.contract_number)}&type=agreement&download=pdf`;
      const res1 = await requestWithAuth({ method: 'get', url: url1, responseType: 'blob' });
      const contentType1 = (res1.headers && res1.headers['content-type']) || '';
      const blob1 = new Blob([res1.data], { type: contentType1 || 'application/pdf' });
      if (contentType1.includes('application/json')) {
        const text = await blob1.text();
        try { const js = JSON.parse(text); setError(js.error || js.detail || t('pdf_conversion_failed')); return; } catch (e) { setError(t('pdf_conversion_failed')); return; }
      }
      const link1 = document.createElement('a'); link1.href = window.URL.createObjectURL(blob1); link1.download = `UV_Agreement_${row.contract_number}.pdf`; document.body.appendChild(link1); link1.click(); link1.remove();

      // small delay then SP3 PDF
      await new Promise(resolve => setTimeout(resolve, 500));
      const url2 = `/api/uv-agreement/download-docx/?contract_number=${encodeURIComponent(row.contract_number)}&type=sp3&download=pdf`;
      const res2 = await requestWithAuth({ method: 'get', url: url2, responseType: 'blob' });
      const contentType2 = (res2.headers && res2.headers['content-type']) || '';
      const blob2 = new Blob([res2.data], { type: contentType2 || 'application/pdf' });
      if (contentType2.includes('application/json')) {
        const text = await blob2.text();
        try { const js = JSON.parse(text); setError(js.error || js.detail || t('pdf_conversion_failed')); return; } catch (e) { setError(t('pdf_conversion_failed')); return; }
      }
      const link2 = document.createElement('a'); link2.href = window.URL.createObjectURL(blob2); link2.download = `UV_SP3_${row.contract_number}.pdf`; document.body.appendChild(link2); link2.click(); link2.remove();
    } catch (err) {
      console.error('PDF download failed', err);
      try {
        const resp = err?.response;
        if (resp) {
          const status = resp.status;
          // If server returned 403 (no grants), show english toast
          if (status === 403) {
            try { toast.error('Download limit reached'); } catch (e) {}
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
      } catch (e) { console.error('Error while formatting PDF download error', e); }
      setError(t('failed_download_pdfs'));
    }
  };

  

  const saveContractOnly = async () => {
    setSavingModal(true);
    // simple validation
    const errors = {};
    if (!String(contractFormData.contract_number || '').trim()) errors.contract_number = 'Contract number is required';
    if (!String(contractFormData.name_of_debtor || '').trim()) errors.name_of_debtor = t('name_of_debtor_required');
    if (Object.keys(errors).length) {
      setContractFormErrors(errors);
      setError('Please fix the highlighted fields');
      setSavingModal(false);
      const first = Object.keys(errors)[0]; if (contractFieldRefs.current[first]) contractFieldRefs.current[first].focus();
      return;
    }
    try {
      const payload = {};
      // copy all contractFormData except fields we don't want to send
      Object.keys(contractFormData).forEach(k => { payload[k] = contractFormData[k]; });
      // ensure numeric conversion for a few numeric-like fields
      // Preserve localized decimal for rate fields (admin_rate) as string (e.g. "2,09").
      ['loan_amount','previous_topup_amount','notaris_fee','admin_fee','net_amount','admin_rate','term'].forEach((k) => {
        if (payload[k] !== undefined && payload[k] !== null && payload[k] !== '') {
          if (k === 'admin_rate') {
            // keep as entered (string) so comma is preserved for DB varchar storage
            payload[k] = String(payload[k]);
          } else {
            const n = parseToNumber(payload[k]); if (n !== null) payload[k] = n;
          }
        }
      });
      // Ensure previous_topup_amount is numeric 0 when empty to avoid DB errors
      if (typeof payload.previous_topup_amount === 'undefined' || payload.previous_topup_amount === null || payload.previous_topup_amount === '') {
        payload.previous_topup_amount = 0;
      } else {
        try { payload.previous_topup_amount = Number(payload.previous_topup_amount) || 0; } catch (e) { payload.previous_topup_amount = 0; }
      }
      // Ensure admin_rate is saved as '0' when empty in modal add-contract
      if (typeof payload.admin_rate === 'undefined' || payload.admin_rate === null || String(payload.admin_rate).trim() === '') {
        payload.admin_rate = '0';
      } else {
        // keep admin_rate as string (preserve comma decimal) per modal behavior
        payload.admin_rate = String(payload.admin_rate);
      }
      // Do not include mortgage_amount, created_by, created_at, updated_at
      delete payload.mortgage_amount; delete payload.created_by; delete payload.created_at; delete payload.updated_at;
      // Uppercase important identifiers
      try {
        if (payload && payload.contract_number) payload.contract_number = String(payload.contract_number).toUpperCase();
        if (payload && payload.topup_contract) payload.topup_contract = String(payload.topup_contract).toUpperCase();
      } catch (e) { /* ignore */ }
      // Normalize address-like fields (title-case and preserve RT/RW) for modal Add Contract
      try {
        // Do not title-case payload for UV page; preserve original casing.
        const normalized = { ...payload };
        if (normalized && typeof normalized === 'object') {
          Object.keys(normalized).forEach(k => { payload[k] = normalized[k]; });
          try { setContractFormData(prev => ({ ...prev, street_of_debtor: normalized.street_of_debtor || prev.street_of_debtor })); } catch (e) { /* ignore UI update errors */ }
        }
      } catch (e) { /* non-fatal */ }

      try {
        // Uppercase all text fields for modal Add Contract (UV) before sending
        try { uppercaseStringsRecursive(payload); } catch (e) { /* ignore per-field errors */ }
      } catch (e) { /* non-fatal */ }
      const res = await requestWithAuth({ method: 'post', url: '/api/contracts/', data: payload });
      const saved = res.data || payload;
      setLastSavedContract(saved);
      setShowCreateModal(false);
      setContractOnlyMode(false);
      await loadAgreements();
      try { toast.success('Contract data saved successfully'); } catch (e) {}
    } catch (err) {
      console.error('Save contract-only failed', err);
      const resp = err?.response;
      const bodyErr = resp?.data?.error || resp?.data?.message || '';
      if (resp && (resp.status === 409 || (bodyErr && String(bodyErr).toLowerCase().includes('duplicate')))) {
        const msg = t('duplicate_contract_exists');
        try { toast.error(msg); } catch (e) {}
        // only show toast for duplicate; do not set container error
      } else {
        setError(t('save_failed'));
      }
    } finally { setSavingModal(false); }
  };

  const handleSaveAndDownload = async () => {
    setSavingModal(true);
    try {
      const payload = { contract_number: contractNumber, debtor: { name_of_debtor: formDebtorName, nik_number_of_debtor: formNik }, collateral: { collateral_type: formCollateralType } };
      try { stripIdKeys(payload); } catch (e) {}
      // If this save originates from the Add-Contract modal (contractOnlyMode),
      // request server-side skip_normalization and uppercase payload client-side.
      try {
        if (contractOnlyMode) {
          payload.skip_normalization = true;
          uppercaseStringsRecursive(payload);
        }
      } catch (e) { /* ignore */ }
      await requestWithAuth({ method: 'post', url: '/api/uv-agreement/', data: payload });
      // refresh daftar lalu unduh
      await loadAgreements();
      // Request PDF explicitly
      const url = `/api/uv-agreement/download-docx/?contract_number=${encodeURIComponent(contractNumber)}&download=pdf`;
      const res = await requestWithAuth({ method: 'get', url, responseType: 'blob' });
      const contentType = (res.headers && res.headers['content-type']) || '';
      const isPdf = contentType.includes('pdf');
      const blob = new Blob([res.data], { type: contentType || (isPdf ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') });
      const link = document.createElement('a'); link.href = window.URL.createObjectURL(blob); link.download = `UV_Agreement_${contractNumber}${isPdf ? '.pdf' : '.docx'}`; document.body.appendChild(link); link.click(); link.remove();
      setShowCreateModal(false);
    } catch (err) {
      console.error('Save & Download failed', err);
      setError(t('failed_save_and_download'));
    } finally {
      setSavingModal(false);
    }
  };

  const handleModalDownload = async () => {
    if (!contractNumber) { setError(t('contract_number_empty')); return; }
    try {
      // Request PDF when available
      const url = `/api/uv-agreement/download-docx/?contract_number=${encodeURIComponent(contractNumber)}`;
      const res = await requestWithAuth({ method: 'get', url, responseType: 'blob' });
      const contentType = (res.headers && res.headers['content-type']) || '';
      const isPdf = contentType.includes('pdf');
      const blob = new Blob([res.data], { type: contentType || (isPdf ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') });
      const link = document.createElement('a'); link.href = window.URL.createObjectURL(blob); link.download = `UV_Agreement_${contractNumber}${isPdf ? '.pdf' : '.docx'}`; document.body.appendChild(link); link.click(); link.remove();
    } catch (err) { console.error('Download failed', err); setError(t('failed_download_documents')); }
  };

  const handleSaveModal = async () => {
    setSavingModal(true);
    setError('');
    // require vehicle type when saving simple modal create
    if (!formCollateralType || String(formCollateralType).trim() === '') {
      const msg = t('collateral_required');
      setError(msg);
      try { toast.error(msg); } catch (e) {}
      setSavingModal(false);
      return;
    }
    try {
      const payload = { contract_number: contractNumber, debtor: { name_of_debtor: formDebtorName, nik_number_of_debtor: formNik }, collateral: { collateral_type: formCollateralType } };
      try { stripIdKeys(payload); } catch (e) {}
      try {
        if (contractOnlyMode) {
          payload.skip_normalization = true;
          uppercaseStringsRecursive(payload);
        }
      } catch (e) { /* ignore */ }
      await requestWithAuth({ method: 'post', url: '/api/uv-agreement/', data: payload });
      setShowCreateModal(false);
      await loadAgreements();
      try { toast.success('Contract data saved successfully'); } catch (e) {}
    } catch (err) {
      console.error('Save failed', err);
      setError(t('save_failed'));
    } finally {
      setSavingModal(false);
    }
  };

  const formatDateShort = (iso) => {
    if (!iso) return '';
    try { const d = new Date(iso); if (isNaN(d.getTime())) return iso; const dd = String(d.getDate()).padStart(2, '0'); const mm = String(d.getMonth() + 1).padStart(2, '0'); const yyyy = d.getFullYear(); return `${dd}-${mm}-${yyyy}`; } catch (e) { return iso; }
  };

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
  const paged = visibleAgreements.slice((page - 1) * pageSize, (page - 1) * pageSize + pageSize);

  return (
    <div>
      <div className="content-section">
        <h2>{t('uv_agreement')}</h2>
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
              onClick={() => { setModalMode('create'); setContractNumber(''); setFormDebtorName(''); setFormNik(''); setFormCollateralType(''); setError(''); setContractOnlyMode(true); setShowCreateModal(true); }}
              title="Add a new contract"
            >
              {t('add_contract')}
            </button>

            <button
              className="btn-primary"
              onClick={() => { setModalMode('create'); setContractNumber(''); setFormDebtorName(''); setFormNik(''); setFormCollateralType(''); setError(''); setCollateralMode(true); setUvCollateralFields(collateralFields); setShowCreateModal(true); }}
              title="Add a new collateral"
            >
              {t('add_collateral')}
            </button>

            <button className="btn-save" onClick={() => { setModalMode('create'); setContractNumber(''); setFormDebtorName(''); setFormNik(''); setFormCollateralType(''); setError(''); setContractOnlyMode(false); setCollateralMode(false); setUvCollateralFields(collateralFields); setShowCreateModal(true); }}>{t('create_document')}</button>
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
                  {paged.length === 0 ? (
                    <tr><td className="no-data" colSpan={7}>{t('no_agreements')}</td></tr>
                  ) : (
                    paged.map((row, idx) => (
                      <tr key={row.contract_number || idx}>
                        <td>{formatDateShort(row.agreement_date)}</td>
                        <td>{row.contract_number ?? ''}</td>
                        <td>{row.name_of_debtor ?? ''}</td>
                        <td>{row.nik_number_of_debtor ?? ''}</td>
                        <td>{row.vehicle_type ?? ''}</td>
                        <td>{row.created_by ?? ''}</td>
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
                                  // show disabled icon for audit users, otherwise hide
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
                                // compute edit title and disabled state so disabled edit shows same "no_access" tooltip/styling
                                const editTitle = (() => {
                                  try {
                                    const rawUser2 = localStorage.getItem('user_data');
                                    if (!rawUser2) return t('edit');
                                    const ud2 = JSON.parse(rawUser2);
                                    const role2 = (ud2.role || ud2.role_name || '').toString().toLowerCase();
                                    const username2 = ud2.username || ud2.user || ud2.full_name || '';
                                    if (!role2.includes('csa')) return t('edit');
                                    // if CSA and not the creator, treat as no access
                                    if (!row.created_by || String(row.created_by) !== String(username2)) return t('no_access');
                                    const aa = accessMap[row.contract_number];
                                    if (!aa) return t('edit');
                                    if (aa.locked) return t('no_access');
                                    const remaining = (aa.edit_grants || 0) - (aa.edit_consumed || 0);
                                    return (remaining > 0) ? t('edit') : t('no_access');
                                  } catch (e) { return t('edit'); }
                                })();

                                const editDisabled = (() => {
                                  try {
                                    const rawUser2 = localStorage.getItem('user_data');
                                    if (!rawUser2) return false;
                                    const ud2 = JSON.parse(rawUser2);
                                    const role2 = (ud2.role || ud2.role_name || '').toString().toLowerCase();
                                    const username2 = ud2.username || ud2.user || ud2.full_name || '';
                                    if (!role2.includes('csa')) return false;
                                    if (!row.created_by || String(row.created_by) !== String(username2)) return true;
                                    const aa = accessMap[row.contract_number];
                                    if (!aa) return false;
                                    if (aa.locked) return true;
                                    const remaining = (aa.edit_grants || 0) - (aa.edit_consumed || 0);
                                    return !(remaining > 0);
                                  } catch (e) { return false; }
                                })();

                                return (
                                  <button
                                    onClick={() => handleEdit(row)}
                                    title={editTitle}
                                    aria-label={`${editTitle} ${row.contract_number || ''}`}
                                    className="action-btn compact-action-btn"
                                    disabled={editDisabled}
                                    style={editDisabled ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
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

                            {(() => {
                              // compute title and disabled state once
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
                                      // title logic
                                      try {
                                        if (!role.includes('csa')) title = t('Download');
                                        // If CSA and not the creator, show no_access (parity with BL)
                                        if (role.includes('csa') && (!row.created_by || String(row.created_by) !== String(username))) title = t('no_access');
                                        const aa = accessMap[row.contract_number];
                                        if (!aa) title = title === t('no_access') ? title : t('Download');
                                        const remaining = (aa?.download_grants || 0) - (aa?.download_consumed || 0);
                                        if (aa?.locked || !(remaining > 0)) title = t('Download');
                                      } catch (e) { /* ignore title fallbacks */ }

                                      // disabled logic
                                      if (!role.includes('csa')) {
                                        if (role.includes('audit')) disabled = true; else disabled = false;
                                      } else {
                                        // CSA: if not the creator, disable download (parity with edit)
                                        if (!row.created_by || String(row.created_by) !== String(username)) disabled = true;
                                        const aa = accessMap[row.contract_number];
                                        if (!aa) disabled = disabled || false;
                                        if (aa && aa.locked) disabled = true;
                                        const remaining = (aa?.download_grants || 0) - (aa?.download_consumed || 0);
                                        if (aa && !(remaining > 0)) disabled = true;
                                      }
                                    }
                                  } catch (e) { disabled = false; title = t('Download'); }

                              return (
                                <button
                                  onClick={() => handleDownloadPdf(row)}
                                  title={title}
                                  aria-label={`${t('Download')} ${row.contract_number || ''}`}
                                  className="action-btn compact-action-btn"
                                  disabled={disabled}
                                  style={disabled ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
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
                            {/* Show disabled delete icon for audit users (non-admin) */}
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                <div>Showing {agreements.length === 0 ? 0 : (page - 1) * pageSize + 1}-{Math.min((page - 1) * pageSize + ((agreements || []).slice((page - 1) * pageSize, (page - 1) * pageSize + pageSize)).length, (agreements || []).length)} of {(agreements || []).length}</div>
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
                  <div className="pagination-indicator">{page} / {Math.max(1, Math.ceil(((agreements || []).length || 0) / pageSize))}</div>
                  <button className="pagination-btn" onClick={() => setPage(p => Math.min(Math.max(1, Math.ceil(((agreements || []).length || 0) / pageSize)), p + 1))} disabled={page >= Math.max(1, Math.ceil(((agreements || []).length || 0) / pageSize))} aria-label="Next page">
                    Next
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                      <path d="M9 6L15 12L9 18" stroke="#0a1e3d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                </div>
              </div>
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
                  contractOnlyMode ? t('add_contract') : (collateralMode ? t('add_collateral') : t('create_document'))
                )}
              </h3>
              <button className="modal-close-btn" onClick={() => { setShowCreateModal(false); setContractOnlyMode(false); setCollateralMode(false); }}>&times;</button>
            </div>

                <div className="modal-form">
              {modalMode === 'edit' ? (
                <UVAgreementEdit
                  initialContractNumber={contractNumber}
                  onSaved={async (cn, aa) => { setShowCreateModal(false); setContractOnlyMode(false); await loadAgreements(); if (cn) { setContractNumber(cn); try { if (aa) { setAccessMap(prev => ({ ...prev, [cn]: aa })); } else { await fetchAccessForContract(cn); } } catch (e) {} } }}
                />
                ) : collateralMode ? (
                <div style={{ padding: 20, minWidth: 560 }}>
                  {collateralError && <div style={{ marginBottom: 12, color: '#a33' }}>{collateralError}</div>}

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div style={fieldGroupStyle}>
                      <label style={fieldLabelStyle}>{t('contract_number')}{requiredUvCollateralFields.includes('contract_number') && <span style={{ color: '#a33', marginLeft: 6 }}>*</span>}</label>
                      <input type="text" value={collateralForm.contract_number} onChange={(e) => setCollateralForm(prev => ({ ...prev, contract_number: String(e.target.value || '').slice(0,12) }))} style={fieldInputStyle} />  
                    </div>
                    
                    <div style={fieldGroupStyle}>
                      <label style={fieldLabelStyle}>{t('name_of_debtor')}{requiredUvCollateralFields.includes('name_of_debtor') && <span style={{ color: '#a33', marginLeft: 6 }}>*</span>}</label>
                      <input type="text" value={collateralForm.name_of_debtor} disabled style={{ ...fieldInputStyle, backgroundColor: '#f5f5f5' }} />
                    </div>

                    <div style={fieldGroupStyle}>
                      <label style={fieldLabelStyle}>{t('name_bpkb_owner')}{requiredUvCollateralFields.includes('name_bpkb_owner') && <span style={{ color: '#a33', marginLeft: 6 }}>*</span>}</label>
                      <input type="text" value={collateralForm.name_bpkb_owner} onChange={(e) => setCollateralForm(prev => ({ ...prev, name_bpkb_owner: e.target.value }))} style={fieldInputStyle} />
                    </div>

                    <div style={fieldGroupStyle}>
                      <label style={fieldLabelStyle}>{t('bpkb_number')}{requiredUvCollateralFields.includes('bpkb_number') && <span style={{ color: '#a33', marginLeft: 6 }}>*</span>}</label>
                      <input type="text" value={collateralForm.bpkb_number} onChange={(e) => setCollateralForm(prev => ({ ...prev, bpkb_number: e.target.value }))} style={fieldInputStyle} />
                    </div>

                    <div style={fieldGroupStyle}>
                      <label style={fieldLabelStyle}>{t('wheeled_vehicle')}{requiredUvCollateralFields.includes('wheeled_vehicle') && <span style={{ color: '#a33', marginLeft: 6 }}>*</span>}</label>
                      <select value={collateralForm.wheeled_vehicle} onChange={(e) => setCollateralForm(prev => ({ ...prev, wheeled_vehicle: e.target.value }))} style={fieldInputStyle}>
                        <option value="">{t('-- Select --') || '-- Select --'}</option>
                        <option value="RODA DUA">RODA DUA</option>
                        <option value="RODA TIGA">RODA TIGA</option>
                        <option value="RODA EMPAT">RODA EMPAT</option>
                      </select>
                    </div>

                    <div style={fieldGroupStyle}>
                      <label style={fieldLabelStyle}>{t('vehicle_types')}{requiredUvCollateralFields.includes('vehicle_type') && <span style={{ color: '#a33', marginLeft: 6 }}>*</span>}</label>
                      <input type="text" value={collateralForm.vehicle_type} onChange={(e) => setCollateralForm(prev => ({ ...prev, vehicle_type: e.target.value }))} style={fieldInputStyle} />
                    </div>

                    <div style={fieldGroupStyle}>
                      <label style={fieldLabelStyle}>{t('vehicle_brand')}{requiredUvCollateralFields.includes('vehicle_brand') && <span style={{ color: '#a33', marginLeft: 6 }}>*</span>}</label>
                      <input type="text" value={collateralForm.vehicle_brand} onChange={(e) => setCollateralForm(prev => ({ ...prev, vehicle_brand: e.target.value }))} style={fieldInputStyle} />
                    </div>

                    <div style={fieldGroupStyle}>
                      <label style={fieldLabelStyle}>{t('vehicle_model')}{requiredUvCollateralFields.includes('vehicle_model') && <span style={{ color: '#a33', marginLeft: 6 }}>*</span>}</label>
                      <input type="text" value={collateralForm.vehicle_model} onChange={(e) => setCollateralForm(prev => ({ ...prev, vehicle_model: e.target.value }))} style={fieldInputStyle} />
                    </div>

                    <div style={fieldGroupStyle}>
                      <label style={fieldLabelStyle}>{t('engine_number')}{requiredUvCollateralFields.includes('engine_number') && <span style={{ color: '#a33', marginLeft: 6 }}>*</span>}</label>
                      <input type="text" value={collateralForm.engine_number} onChange={(e) => setCollateralForm(prev => ({ ...prev, engine_number: e.target.value }))} style={fieldInputStyle} />
                    </div>                   

                    <div style={fieldGroupStyle}>
                      <label style={fieldLabelStyle}>{t('chassis_number')}{requiredUvCollateralFields.includes('chassis_number') && <span style={{ color: '#a33', marginLeft: 6 }}>*</span>}</label>
                      <input type="text" value={collateralForm.chassis_number} onChange={(e) => setCollateralForm(prev => ({ ...prev, chassis_number: e.target.value }))} style={fieldInputStyle} />
                    </div>

                    <div style={fieldGroupStyle}>
                      <label style={fieldLabelStyle}>{t('colour')}{requiredUvCollateralFields.includes('colour') && <span style={{ color: '#a33', marginLeft: 6 }}>*</span>}</label>
                      <input type="text" value={collateralForm.colour} onChange={(e) => setCollateralForm(prev => ({ ...prev, colour: e.target.value }))} style={fieldInputStyle} />
                    </div>

                    <div style={fieldGroupStyle}>
                      <label style={fieldLabelStyle}>{t('plate_number')}{requiredUvCollateralFields.includes('plate_number') && <span style={{ color: '#a33', marginLeft: 6 }}>*</span>}</label>
                      <input type="text" value={collateralForm.plate_number} onChange={(e) => setCollateralForm(prev => ({ ...prev, plate_number: e.target.value }))} style={fieldInputStyle} />
                    </div>

                    <div style={fieldGroupStyle}>
                      <label style={fieldLabelStyle}>{t('manufactured_year')}{requiredUvCollateralFields.includes('manufactured_year') && <span style={{ color: '#a33', marginLeft: 6 }}>*</span>}</label>
                      <input type="text" value={collateralForm.manufactured_year} onChange={(e) => setCollateralForm(prev => ({ ...prev, manufactured_year: e.target.value }))} style={fieldInputStyle} />
                    </div>

                  </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
                      <button className="btn-save" onClick={async () => {
                        setCollateralSaving(true); setCollateralError('');
                        try {
                          // Prefer contract number from form, then modal filter, then parent contractNumber, then lastSavedContract
                          const cnRaw = (collateralForm.contract_number || modalFilterContractNumber || contractNumber || (lastSavedContract && lastSavedContract.contract_number) || '');
                          const cn = (cnRaw || '').toString().trim();
                            if (!cn) {
                              setCollateralError('Contract Number is required');
                              setCollateralSaving(false);
                              return;
                            }
                          // Build collateral payload and send under `collateral` key as backend expects
                          const collPayload = buildCollateralPayload({ ...collateralForm, contract_number: cn }, 'uv');
                          // ensure we send top-level contract_number and nested collateral object
                          const postData = { contract_number: cn, collateral: collPayload };
                          try { stripIdKeys(postData); } catch (e) {}
                          try { postData.contract_number = String(postData.contract_number || '').toUpperCase(); } catch (e) {}
                          try { postData.skip_normalization = true; } catch (e) {}
                          try { uppercaseStringsRecursive(postData); } catch (e) { /* ignore */ }
                          await requestWithAuth({ method: 'post', url: '/api/uv-collateral/', data: postData });
                          setShowCreateModal(false);
                          setCollateralMode(false);
                          loadAgreements();
                          try { toast.success(t('collateral_saved')); } catch (e) {}
                        } catch (err) {
                          console.error('Save collateral failed', err);
                          const resp = err?.response;
                          const bodyErr = resp?.data?.error || resp?.data?.message || '';
                          if (resp && (resp.status === 409 || (bodyErr && String(bodyErr).toLowerCase().includes('duplicate')))) {
                            const msg = t('duplicate_contract_exists');
                            try { toast.error(msg); } catch (e) {}
                            // only show toast for duplicate; do not set container error
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
                      }} disabled={collateralSaving || !isUvCollateralFormValid()}>{collateralSaving ? t('saving') : t('save_collateral')}</button>
                    </div>
                </div>
              ) : (
                contractOnlyMode ? (
                  <div style={{ padding: 20, minWidth: 560 }}>

                    {/** Define contract table fields (exclude mortgage_amount, created_by, created_at, updated_at) */}
                    {(() => {
                      let contractTableFields = ['contract_number','nik_number_of_debtor','name_of_debtor','place_birth_of_debtor','date_birth_of_debtor','date_birth_of_debtor_in_word','business_partners_relationship','business_type','street_of_debtor','subdistrict_of_debtor','district_of_debtor','city_of_debtor','province_of_debtor','phone_number_of_debtor','bank_account_number','name_of_bank','name_of_account_holder','virtual_account_number','topup_contract','previous_topup_amount','loan_amount','loan_amount_in_word','flat_rate','flat_rate_by_word','term','term_by_word','admin_fee','admin_fee_in_word','notaris_fee','notaris_fee_in_word','admin_rate','admin_rate_in_word','tlo','tlo_in_word','life_insurance','life_insurance_in_word','stamp_amount','financing_agreement_amount','security_agreement_amount','upgrading_land_rights_amount','total_amount','net_amount','net_amount_in_word'];
                      const hiddenForUVLocal = new Set(['mortgage_amount', 'mortgage_amount_in_word', 'stamp_amount', 'financing_agreement_amount', 'security_agreement_amount', 'upgrading_land_rights_amount']);
                      if (contractOnlyMode) {
                        contractTableFields = contractTableFields.filter(f => !hiddenForUVLocal.has(f));
                      }
                      const numericToWord = { loan_amount: 'loan_amount_in_word', term: 'term_by_word', flat_rate: 'flat_rate_by_word', notaris_fee: 'notaris_fee_in_word', admin_fee: 'admin_fee_in_word', net_amount: 'net_amount_in_word', admin_rate: 'admin_rate_in_word', tlo: 'tlo_in_word', life_insurance: 'life_insurance_in_word' };
                      const numericInputs = new Set(Object.keys(numericToWord).concat(['previous_topup_amount','stamp_amount','financing_agreement_amount','security_agreement_amount','upgrading_land_rights_amount','total_amount']));
                      return (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                          {contractTableFields.map((f, idx) => {
                            const isReadOnlyWord = /(_in_word|_by_word)$/.test(f);
                            // Render business_partners_relationship as a dropdown matching main form
                            if (f === 'business_partners_relationship') {
                              return (
                                  <div style={fieldGroupStyle} key={f}>
                                    <label style={fieldLabelStyle}>{formatFieldNameLocal(f)}{getRequiredContractFields().includes(f) && <span style={{ color: '#a33', marginLeft: 6 }}>*</span>}</label>
                                  <select
                                    ref={(el) => { contractFieldRefs.current[f] = el; }}
                                    id={`contract_field_${f}`}
                                    name={f}
                                    value={contractFormData[f] || ''}
                                    onChange={(e) => {
                                      const raw = e.target.value;
                                      // enforce 12-char max for contract identifiers
                                      const rawVal = (f === 'contract_number' || f === 'topup_contract') ? String(raw || '').slice(0,12) : raw;
                                      setContractFormData(prev => ({ ...prev, [f]: rawVal }));
                                      setContractFormErrors(prev => { if (!prev[f]) return prev; const np = { ...prev }; delete np[f]; return np; });
                                    }}
                                    maxLength={( /nik/i.test(f) ? 16 : (f === 'contract_number' || f === 'topup_contract' ? 12 : undefined) )}
                                  onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        e.preventDefault();
                                        const nextKey = contractTableFields[idx + 1];
                                        if (e.shiftKey) { saveContractOnly(); return; }
                                        if (nextKey && contractFieldRefs.current[nextKey]) { contractFieldRefs.current[nextKey].focus(); } else { saveContractOnly(); }
                                      }
                                    }}
                                    style={{ ...fieldInputStyle, borderColor: contractFormErrors[f] ? '#d9534f' : undefined }}
                                  >
                                    <option value="">-- Select Relationship --</option>
                                    <option value="SUAMI">SUAMI</option>
                                    <option value="ISTRI">ISTRI</option>
                                    <option value="ANAK KANDUNG">ANAK KANDUNG</option>
                                    <option value="SAUDARA KANDUNG">SAUDARA KANDUNG</option>
                                    <option value="ORANGTUA">ORANGTUA</option>
                                  </select>
                                  {contractFormErrors[f] && <div style={{ color: '#a33', fontSize: 12, marginTop: 6 }}>{contractFormErrors[f]}</div>}
                                </div>
                              );
                            }

                            return (
                              <div style={fieldGroupStyle} key={f}>
                                <label style={fieldLabelStyle}>{formatFieldNameLocal(f)}{getRequiredContractFields().includes(f) && <span style={{ color: '#a33', marginLeft: 6 }}>*</span>}</label>
                                <input
                                  ref={(el) => { contractFieldRefs.current[f] = el; }}
                                  id={`contract_field_${f}`}
                                  name={f}
                                  inputMode={numericInputs.has(f) ? 'numeric' : 'text'}
                                  type={f === 'date_birth_of_debtor' ? 'date' : 'text'}
                                  value={(() => {
                                    if (!contractFormData) return '';
                                    if (numericInputs.has(f)) {
                                      // show rate fields with comma, other numerics with thousand separator
                                      if (rateFields && rateFields.includes(f)) return String(contractFormData[f] || '').replace('.', ',');
                                      try { return formatNumberWithDots(contractFormData[f]); } catch (e) { return contractFormData[f] || ''; }
                                    }
                                    return contractFormData[f] || '';
                                  })()}
                                  onChange={(e) => {
                                    const inputVal = e.target.value;
                                    // For numeric inputs, strip thousand separators so state stores raw digits
                                    const isNumeric = numericInputs.has(f);
                                    const cleaned = (function(v) {
                                      if (v === undefined || v === null) return '';
                                      const s = String(v);
                                      if (isNumeric) {
                                        if (rateFields && rateFields.includes(f)) return String(s || '').replace(',', '.');
                                        return normalizeNumericInput(s);
                                      }
                                      return s;
                                    })(inputVal);

                                    setContractFormData(prev => {
                                      const next = { ...prev };
                                      if (f === 'date_birth_of_debtor') {
                                        const iso = (/^\d{4}-\d{2}-\d{2}$/.test(inputVal) ? inputVal : (parseDateFromDisplay(inputVal) || ''));
                                        next[f] = iso || '';
                                        try { next['date_birth_of_debtor_in_word'] = getIndonesianDateInWords(iso || inputVal); } catch (er) { next['date_birth_of_debtor_in_word'] = ''; }
                                        } else {
                                        // enforce 12-char max for contract identifiers
                                        next[f] = (f === 'contract_number' || f === 'topup_contract') ? String(cleaned || '').slice(0,12) : cleaned;
                                        if (numericToWord[f]) {
                                          try {
                                                const s = (next[f] === undefined || next[f] === null || next[f] === '') ? '' : String(next[f]);
                                                if (s === '') {
                                                  next[numericToWord[f]] = '';
                                                } else {
                                                  try {
                                                    const raw = s;
                                                    const n = Number(String(raw).replace(/\./g, '').replace(/,/g, '.')) || 0;
                                                    if (n === 0) {
                                                      if (f === 'admin_rate') next[numericToWord[f]] = getIndonesianNumberWord(String(raw)) || '';
                                                      else next[numericToWord[f]] = '';
                                                    } else {
                                                      next[numericToWord[f]] = getIndonesianNumberWord(String(raw)) || '';
                                                    }
                                                  } catch (er) { next[numericToWord[f]] = ''; }
                                                }
                                          } catch (er) { next[numericToWord[f]] = ''; }
                                        }
                                          try {
                                            const a = getNumFromValue(next.admin_fee);
                                            const b = getNumFromValue(next.notaris_fee);
                                            const c = getNumFromValue(next.tlo);
                                            const d = getNumFromValue(next.life_insurance);
                                            const e = getNumFromValue(next.admin_rate);
                                            const total = a + b + c + d + e;
                                            next.total_amount = total === 0 ? '' : String(total);
                                            try {
                                              const loan = getNumFromValue(next.loan_amount);
                                              const prevTop = getNumFromValue(next.previous_topup_amount);
                                              const net = loan - prevTop - a - b - e;
                                              next.net_amount = (net === 0) ? '' : String(net);
                                              try {
                                                const n = Number(String(net)) || 0;
                                                next.net_amount_in_word = (n === 0) ? '' : (getIndonesianNumberWord(String(net)) || '');
                                              } catch (er) { /* ignore */ }
                                            } catch (er) { /* ignore */ }
                                          } catch (er) { /* ignore */ }
                                      }
                                      return next;
                                    });

                                    if (f === 'contract_number' && contractOnlyMode) {
                                      handleUvContractNumberModalChange(cleaned);
                                      setContractFormErrors(prev => { if (!prev[f]) return prev; const np = { ...prev }; delete np[f]; return np; });
                                      return;
                                    }
                                    // If user typed NIK in modal contract-only mode, attempt autofill when 16 digits
                                    if (f === 'nik_number_of_debtor' && contractOnlyMode) {
                                      try {
                                        const rawNik = String(cleaned || '').replace(/\D/g, '').slice(0,16);
                                        if (rawNik && rawNik.length === 16) {
                                          (async () => {
                                            try {
                                              // check cached contracts first
                                              let found = (contracts || []).find(c => {
                                                const cand = ((c.debtor && (c.debtor.nik_number_of_debtor || c.debtor.nik)) || c.nik_number_of_debtor || c.debtor_nik || '').toString().replace(/\D/g, '');
                                                return cand && cand === rawNik;
                                              });
                                              if (found && (found.contract_number || found.contract)) {
                                                const cn = found.contract_number || (found.contract && (found.contract.contract_number || found.contract_number)) || '';
                                                if (cn) {
                                                  const data = await fetchContractLookup(cn);
                                                  const c = data.contract || data || {};
                                                  const mapped = {};
                                                  const nikFields = ['name_of_debtor','place_birth_of_debtor','date_birth_of_debtor','date_birth_of_debtor_in_word','business_partners_relationship','business_type','street_of_debtor','subdistrict_of_debtor','district_of_debtor','city_of_debtor','province_of_debtor','phone_number_of_debtor','bank_account_number','name_of_bank','name_of_account_holder'];
                                                  nikFields.forEach((nf) => {
                                                    const v = findValueInObj(c, nf);
                                                    if (v !== undefined && v !== null && String(v).trim() !== '') mapped[nf] = v;
                                                  });
                                                  if (Object.keys(mapped).length) {
                                                    if (mapped.contract_number) mapped.contract_number = String(mapped.contract_number).slice(0,12);
                                                    if (mapped.topup_contract) mapped.topup_contract = String(mapped.topup_contract).slice(0,12);
                                                    setContractFormData(prev => computeContractWordFields({ ...prev, ...mapped }));
                                                  }
                                                }
                                                return;
                                              }
                                              // fallback to table scan
                                              try {
                                                const resp = await requestWithAuth({ method: 'get', url: '/api/contracts/table/' });
                                                const items = resp.data?.contracts || resp.data || [];
                                                const matched = (items || []).find(it => {
                                                  const cand = ((it.debtor && (it.debtor.nik_number_of_debtor || it.debtor.nik)) || it.nik_number_of_debtor || it.debtor_nik || '').toString().replace(/\D/g, '');
                                                  return cand && cand === rawNik;
                                                });
                                                if (matched && (matched.contract_number || matched.contract)) {
                                                  const cn2 = matched.contract_number || (matched.contract && (matched.contract.contract_number || matched.contract_number)) || '';
                                                  if (cn2) {
                                                    const data2 = await fetchContractLookup(cn2);
                                                    const c2 = data2.contract || data2 || {};
                                                    const mapped2 = {};
                                                    const nikFields2 = ['name_of_debtor','place_birth_of_debtor','date_birth_of_debtor','date_birth_of_debtor_in_word','business_partners_relationship','business_type','street_of_debtor','subdistrict_of_debtor','district_of_debtor','city_of_debtor','province_of_debtor','phone_number_of_debtor','bank_account_number','name_of_bank','name_of_account_holder'];
                                                    nikFields2.forEach((nf) => {
                                                      const v = findValueInObj(c2, nf);
                                                      if (v !== undefined && v !== null && String(v).trim() !== '') mapped2[nf] = v;
                                                    });
                                                    if (Object.keys(mapped2).length) {
                                                      if (mapped2.contract_number) mapped2.contract_number = String(mapped2.contract_number).slice(0,12);
                                                      if (mapped2.topup_contract) mapped2.topup_contract = String(mapped2.topup_contract).slice(0,12);
                                                      setContractFormData(prev => computeContractWordFields({ ...prev, ...mapped2 }));
                                                    }
                                                  }
                                                }
                                              } catch (er) { /* ignore */ }
                                            } catch (er) { console.error('NIK-based modal lookup failed', er); }
                                          })();
                                        }
                                      } catch (er) { /* ignore */ }
                                    }

                                    setContractFormData(prev => {
                                      const next = { ...prev };
                                      if (f === 'date_birth_of_debtor') {
                                        const iso = (/^\d{4}-\d{2}-\d{2}$/.test(inputVal) ? inputVal : (parseDateFromDisplay(inputVal) || ''));
                                        next[f] = iso;
                                      } else {
                                        // enforce 12-char max for contract identifiers consistently
                                        next[f] = (f === 'contract_number' || f === 'topup_contract') ? String(cleaned || '').slice(0,12) : cleaned;
                                      }
                                      return next;
                                    });
                                    setContractFormErrors(prev => { if (!prev[f]) return prev; const np = { ...prev }; delete np[f]; return np; });
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      e.preventDefault();
                                      const nextKey = contractTableFields[idx + 1];
                                      if (e.shiftKey) { saveContractOnly(); return; }
                                      if (nextKey && contractFieldRefs.current[nextKey]) { contractFieldRefs.current[nextKey].focus(); } else { saveContractOnly(); }
                                    }
                                  }}
                                  disabled={isReadOnlyWord || f === 'total_amount' || f === 'net_amount'}
                                  style={{ ...fieldInputStyle, backgroundColor: isReadOnlyWord ? '#f5f5f5' : undefined, borderColor: contractFormErrors[f] ? '#d9534f' : undefined }}
                                />
                                {contractFormErrors[f] && <div style={{ color: '#a33', fontSize: 12, marginTop: 6 }}>{contractFormErrors[f]}</div>}
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
                      {/* Save enabled only when required fields are filled (except VA & Topup) */}
                      <button className="btn-save" onClick={saveContractOnly} disabled={savingModal || !isContractFormValid()}>{savingModal ? t('saving') : t('save')}</button>
                    </div>
                  </div>
                ) : (
                  <div style={{ padding: 8, minWidth: 500 }}>
                    <UVAgreementCreate
                      initialContractData={lastSavedContract}
                      initialUvCollateralFields={uvCollateralFields}
                      contractOnly={contractOnlyMode}
                      inModal={true}
                                      onContractSaved={(saved) => {
                                        if (!saved) {
                                          setShowCreateModal(false);
                                          setContractOnlyMode(false);
                                          return;
                                        }
                                        setLastSavedContract(saved || null);
                                        setShowCreateModal(false);
                                        setContractOnlyMode(false);
                                        loadAgreements();
                                        try { toast.success('Contract data saved successfully'); } catch (e) {}
                                      }}
                      onSaved={async (cn, aa) => { setShowCreateModal(false); setContractOnlyMode(false); await loadAgreements(); if (cn) { setContractNumber(cn); try { if (aa) { setAccessMap(prev => ({ ...prev, [cn]: aa })); } else { await fetchAccessForContract(cn); } } catch (e) {} } }}
                    />
                    
                  </div>
                )
              )}
            </div>

            {/* modal footer intentionally left without a bottom Cancel/Close button per UI preference */}
          </div>
        </div>
      )}

      
    </div>
  );
}
