/* eslint-disable unicode-bom, no-unused-vars, react-hooks/exhaustive-deps */
import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import '../UserManagement/UserManagement.css';
import { buildCollateralPayload } from './collateralUtils';
import docxIcon from '../../assets/icons/docx-icon.svg';
import pdfIcon from '../../assets/icons/pdf-icon.svg';
import { getIndonesianNumberWord, getIndonesianDateInWords, getIndonesianDateDisplay, parseDateFromDisplay, getIndonesianDayName, formatNumberWithDots, formatDateDisplay, isDateFieldName, formatFieldName, titleCasePayload } from '../../utils/formatting';
import { t } from '../../utils/messages';
import { stripIdKeys, normalizeSection } from '../../utils/payloadUtils';
import { requestWithAuth } from '../../utils/api';

// Payload id/pk stripping and normalization moved to shared util `payloadUtils`.

// Rate fields that should display comma on UI but store with dot
const rateFields = ['flat_rate', 'admin_rate'];


// Inlined AgreementForm copied from AgreementForm.js and renamed to UVAgreementForm
function UVAgreementForm({ initialContractNumber = '', initialContractData = null, initialFilterNumber = '', initialFilterTrigger = 0, onSaved, onContractSaved, contractOnly = false, editOnly = false, createOnly = false, hideFilter = false, hideHeader = false, initialUvCollateralFields = null, inModal = false } = {}) {
  const [saving, setSaving] = React.useState(false);
  const [usernameDisplay, setUsernameDisplay] = React.useState('');

  // Download both Agreement and SP3 documents (DOCX or PDF when asPdf=true)
  const triggerDocxDownload = async (contractNum, accessToken, asPdf = false) => {
    if (!contractNum || String(contractNum).trim() === '') return;
    try {
      const token = accessToken || localStorage.getItem('access_token');
      const base = 'uv-agreement';
      const downloadType = asPdf ? '&download=pdf' : '';

      // Agreement
      const url1 = `http://localhost:8000/api/${base}/download-docx/?contract_number=${encodeURIComponent(contractNum)}${downloadType}&type=agreement`;
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
      const url2 = `http://localhost:8000/api/${base}/download-docx/?contract_number=${encodeURIComponent(contractNum)}${downloadType}&type=sp3`;
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
    console.log('UVAgreement.handleSave triggered', { contractNumber, editOnly, initialContractNumber });
    setSaving(true);
    setError('');

    const doSave = async (accessToken) => {
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

      if (editOnly || initialContractNumber) {
        Object.keys(extraFields || {}).forEach((k) => { if (!payload.hasOwnProperty(k)) payload[k] = extraFields[k]; });
      }

      try { console.log('Agreement save payload (contract_number):', effectiveContractNumber, payload); } catch (e) {}
      try {
        try { stripIdKeys(payload); } catch (e) {}
          // Normalize collateral_data so backend columns that are NOT NULL
          // (e.g. vehicle_colour) are present. Map common frontend keys
          // (colour, vehicle_types) to backend-expected keys and ensure
          // empty-string defaults instead of null.
          try {
            payload.collateral_data = payload.collateral_data || {};
            const cd = payload.collateral_data;
            if (cd.vehicle_colour === undefined) {
              if (cd.colour !== undefined) cd.vehicle_colour = cd.colour;
              else if (cd.color !== undefined) cd.vehicle_colour = cd.color;
              else cd.vehicle_colour = '';
            }
            if (cd.vehicle_type === undefined) {
              if (cd.vehicle_types !== undefined) cd.vehicle_type = cd.vehicle_types;
              else if (cd.vehicle_type_name !== undefined) cd.vehicle_type = cd.vehicle_type_name;
              else cd.vehicle_type = '';
            }
            // ensure plate/chassis/engine keys exist (avoid NULLs)
            if (cd.plate_number === undefined && cd.plat_number !== undefined) cd.plate_number = cd.plat_number;
            if (cd.plate_number === undefined) cd.plate_number = cd.plate_number ?? '';
            if (cd.chassis_number === undefined && cd.chasis_number !== undefined) cd.chassis_number = cd.chasis_number;
            if (cd.chassis_number === undefined) cd.chassis_number = cd.chassis_number ?? '';
            if (cd.engine_number === undefined) cd.engine_number = cd.engine_number ?? '';
          } catch (e) {
            // non-fatal normalization error
            console.warn('Collateral normalization failed', e);
          }
          const nowIso = new Date().toISOString();
          payload.created_by = payload.created_by || usernameDisplay || '';
          payload.created_at = payload.created_at || nowIso;
          payload.updated_at = nowIso;
        } catch (e) {}
        const headers = { 'Authorization': accessToken ? `Bearer ${accessToken}` : `Bearer ${localStorage.getItem('access_token')}`, 'Content-Type': 'application/json' };
        // Normalize sections and ensure numeric fields are numbers (avoid empty strings)
        let normalizedPayload = { ...payload };
        ['contract_data','debtor','collateral_data','bm_data','branch_data','header_fields','extra_fields'].forEach(sec => {
          if (payload[sec]) normalizedPayload[sec] = normalizeSection(payload[sec], numericFields);
        });
        // If saving from modal (create or edit), convert text fields to Title Case before sending
        if (inModal) {
          try { normalizedPayload = titleCasePayload(normalizedPayload, numericFields); } catch (e) { /* non-fatal */ }
        }
        if (!normalizedPayload.branch_id) {
          const resolved = selectedBranchId || (branchData && (branchData.branch_id || branchData.id));
          if (resolved) normalizedPayload.branch_id = resolved;
        }
        try { delete normalizedPayload.created_by; delete normalizedPayload.created_at; delete normalizedPayload.updated_at; } catch (e) {}
        try { console.log('Final normalizedPayload to be sent (UV):', normalizedPayload); } catch (e) {}
        return axios.post(`http://localhost:8000/api/uv-agreement/`, normalizedPayload, { headers });
    };

    try {
      await doSave(localStorage.getItem('access_token'));
      const savedContractNumber = contractNumber || initialContractNumber || '';
      const isUpdate = !!(editOnly || initialContractNumber || initialContractData);
      toast.success(t(isUpdate ? 'save_updated' : 'save_added'));
      if (typeof onSaved === 'function') { try { onSaved(savedContractNumber); } catch (e) { console.warn('onSaved callback failed', e); } }
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
                toast.success(t(isUpdate ? 'save_updated' : 'save_added'));
              if (typeof onSaved === 'function') { try { onSaved(savedContractNumberRetry); } catch (e) { console.warn('onSaved callback failed', e); } }
            } else { throw new Error('Refresh failed'); }
        } catch (refreshErr) {
          console.error('Token refresh failed', refreshErr);
          localStorage.removeItem('access_token'); localStorage.removeItem('refresh_token');
          const msg = 'Session expired. Please login again.';
          setError(msg);
          try { toast.error(msg); } catch (e) {}
        }
      } else {
        const resp = err?.response;
        if (resp) {
          const status = resp.status; const url = resp.request?.responseURL || resp.config?.url || 'unknown'; let body = '';
          try { body = typeof resp.data === 'string' ? resp.data : JSON.stringify(resp.data); } catch (e) { body = String(resp.data); }
          const errMsg = `Failed to save (${status}) ${url}: ${body && body.substring(0,200)}`;
          setError(errMsg);
          try { toast.error(errMsg); } catch (e) {}
          console.error('Save error response:', resp, err);
        } else { setError('Failed to save data: ' + (err.message || 'unknown error')); console.error('Save error:', err); }
      }
    } finally { setSaving(false); }
  };

  

  const [contractNumber, setContractNumber] = React.useState('');
  React.useEffect(() => { if (initialContractNumber) setContractNumber(initialContractNumber); }, [initialContractNumber]);
  React.useEffect(() => { if (!initialContractData) return; if (initialContractNumber) return; try { if (initialContractData.contract_number) setContractNumber(initialContractData.contract_number); setContractData(prev => ({ ...prev, ...initialContractData })); } catch (e) { console.warn('Failed to apply initialContractData to form', e); } }, [initialContractData, initialContractNumber]);

  const handleContractOnlySave = async () => {
    setContractOnlySaving(true); setContractOnlyError('');
    try {
      const token = localStorage.getItem('access_token'); const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const payload = {};
      Object.keys(contractData || {}).forEach((k) => { if (/_in_word$|_by_word$/.test(k)) return; let v = contractData[k]; if (numericFields.includes(k) && v !== undefined && v !== null && v !== '') { const n = Number(String(v).replace(/\./g, '').replace(/,/g, '')); v = Number.isNaN(n) ? v : n; } payload[k] = v; });
      try { payload.created_by = usernameDisplay || '' } catch (e) { payload.created_by = ''; }
      const nowIso = new Date().toISOString(); payload.created_at = nowIso; payload.updated_at = nowIso;
      const res = await axios.post('http://localhost:8000/api/contracts/', payload, { headers });
      if (typeof onContractSaved === 'function') { try { onContractSaved(res.data || payload); } catch (e) { console.warn('onContractSaved failed', e); } }
    } catch (err) {
      console.error('Failed saving contract-only', err);
      const resp = err?.response; if (resp) { const status = resp.status; const url = resp.request?.responseURL || resp.config?.url || 'unknown'; let body = ''; try { body = typeof resp.data === 'string' ? resp.data : JSON.stringify(resp.data); } catch (e) { body = String(resp.data); } setContractOnlyError(`Failed saving contract (${status}) ${url}: ${body && body.substring(0,200)}`); console.error('Contract-only save response:', resp); } else { setContractOnlyError('Failed saving contract: ' + (err.message || 'unknown error')); }
    } finally { setContractOnlySaving(false); }
  };

  const [contracts, setContracts] = React.useState([]);
  const [filteredContracts, setFilteredContracts] = React.useState([]);
  const [showContractDropdown, setShowContractDropdown] = React.useState(false);
  const [branches, setBranches] = React.useState([]);
  const [selectedBranchId, setSelectedBranchId] = React.useState('');
  const [selectedDirector, setSelectedor] = React.useState('');
  React.useEffect(() => { if (inModal && (createOnly || editOnly) && !selectedDirector) setSelectedor('Supriyono'); }, [inModal, createOnly, editOnly]);
  const [directors, setDirectors] = React.useState([]);
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
        const token = localStorage.getItem('access_token');
        const resp = await axios.get('http://localhost:8000/api/uv-collateral/', { headers: token ? { Authorization: `Bearer ${token}` } : {} });
        if (cancelled) return;
        const data = resp && resp.data ? resp.data : {};
        if (Array.isArray(data.columns) && data.columns.length) {
          setUvCollateralFields(data.columns);
          return;
        }
        const coll = data.collateral;
        const collObj = Array.isArray(coll) ? (coll[0] || null) : (coll || null);
        if (collObj) {
          const derived = deriveUvCollateralFieldsFromObj(collObj);
          if (derived && derived.length) setUvCollateralFields(derived);
        }
      } catch (e) {
        // ignore
      }
    })();
    return () => { cancelled = true; };
  }, [inModal, initialUvCollateralFields]);
  const [extraFields, setExtraFields] = React.useState({});

  const findValueInObj = (obj, targetKey) => { if (!obj || !targetKey) return undefined; const normalize = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, ''); const nt = normalize(targetKey); if (obj.hasOwnProperty(targetKey)) return obj[targetKey]; if (obj.hasOwnProperty(targetKey.toLowerCase())) return obj[targetKey.toLowerCase()]; for (const k of Object.keys(obj)) { if (normalize(k) === nt) return obj[k]; } const parts = targetKey.split('_').map(p => p.toLowerCase()).filter(Boolean); for (const k of Object.keys(obj)) { const lk = k.toLowerCase(); let score = 0; for (const p of parts) if (p.length > 2 && lk.includes(p)) score++; if (score >= Math.max(1, Math.floor(parts.length / 2))) return obj[k]; } return undefined; };

  const findKeyInObj = (obj, targetKey) => {
    if (!obj || !targetKey) return null;
    const normalize = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const nt = normalize(targetKey);
    if (obj.hasOwnProperty(targetKey)) return targetKey;
    if (obj.hasOwnProperty(targetKey.toLowerCase())) return targetKey.toLowerCase();
    // exact normalized match
    for (const k of Object.keys(obj)) { if (normalize(k) === nt) return k; }
    // try common alternates (plat <-> plate, chassis <-> chassis, vehicle <-> vehicle)
    const alternates = [targetKey.replace(/plat_/i, 'plate_'), targetKey.replace(/plate_/i, 'plat_'), targetKey.replace(/chassis_/i, 'chassis_'), targetKey.replace(/chassis_/i, 'chassis_'), targetKey.replace(/vehicle_/i, 'vehicle_'), targetKey.replace(/vehicle_/i, 'vehicle_')];
    for (const alt of alternates) {
      if (obj.hasOwnProperty(alt)) return alt;
      if (obj.hasOwnProperty(alt.toLowerCase())) return alt.toLowerCase();
    }
    // fuzzy match by token overlap
    const parts = targetKey.split('_').map(p => p.toLowerCase()).filter(Boolean);
    for (const k of Object.keys(obj)) {
      const lk = k.toLowerCase(); let score = 0; for (const p of parts) if (p.length > 2 && lk.includes(p)) score++; if (score >= Math.max(1, Math.floor(parts.length / 2))) return k;
    }
    return null;
  };

  // Defensive: ensure we always operate on a plain object for collateral
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
    // prefer a sane ordering based on known fallback list
    const order = ['wheeled_vehicle','vehicle_types','vehicle_type','vehicle_types','vehicle_brand','vehicle_brand','vehicle_model','vehicle_model','plat_number','plate_number','chassis_number','chassis_number','engine_number','manufactured_year','colour','bpkb_number','name_bpkb_owner'];
    const ordered = [];
    for (const k of order) {
      const actual = findKeyInObj(collObj, k);
      if (actual && keys.includes(actual) && !ordered.includes(actual)) ordered.push(actual);
    }
    // append any remaining keys (excluding metadata)
    for (const k of keys) if (!ordered.includes(k)) ordered.push(k);
    return ordered;
  };

  const [headerFields, setHeaderFields] = React.useState({ agreement_date: new Date().toISOString().split('T')[0], place_of_agreement: '', agreement_day_in_word: '', agreement_date_in_word: '', Name_of_director: '', date_of_delegated: new Date().toISOString().split('T')[0], sp3_number: '', sp3_date: new Date().toISOString().split('T')[0], phone_number_of_lolc: '' });
  // Modal-level validator: require filter (contract, branch, director) and dates when inside modal
  const isModalSaveAllowed = () => {
    if (!inModal) return true;
    const cn = (contractNumber || initialContractNumber || '').toString().trim();
    if (!cn) return false;
    if (!selectedBranchId || String(selectedBranchId).trim() === '') return false;
    if (!selectedDirector || String(selectedDirector).trim() === '') return false;
    if (!headerFields || !headerFields.agreement_date || String(headerFields.agreement_date).trim() === '') return false;
    if (!headerFields || !headerFields.date_of_delegated || String(headerFields.date_of_delegated).trim() === '') return false;
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

  const bmFields = [ 'name_of_bm','place_birth_of_bm','date_birth_of_bm','date_birth_of_bm_in_word','street_of_bm','subdistrict_of_bm','district_of_bm','city_of_bm','province_of_bm','nik_number_of_bm','phone_number_of_bm' ];
  const branchFields = ['street_name','subdistrict','district','city','province'];
  const numericFields = ['loan_amount','notaris_fee','admin_fee','net_amount','previous_topup_amount','mortgage_amount','tlo','life_insurance','stamp_amount','financing_agreement_amount','security_agreement_amount','upgrading_land_rights_amount','total_amount'];
  // rateFields is declared at file top-level to be accessible throughout
  const contractFields = [ 'contract_number','nik_number_of_debtor','name_of_debtor','place_birth_of_debtor','date_birth_of_debtor','date_birth_of_debtor_in_word','street_of_debtor','subdistrict_of_debtor','district_of_debtor','city_of_debtor','province_of_debtor','phone_number_of_debtor','business_partners_relationship','business_type','bank_account_number','name_of_bank','name_of_account_holder','virtual_account_number','topup_contract','previous_topup_amount','loan_amount','loan_amount_in_word','term','term_by_word','flat_rate','flat_rate_by_word','notaris_fee','notaris_fee_in_word','admin_rate','admin_rate_in_word','admin_fee','admin_fee_in_word','mortgage_amount','mortgage_amount_in_word','tlo','tlo_in_word','life_insurance','life_insurance_in_word','stamp_amount','financing_agreement_amount','security_agreement_amount','upgrading_land_rights_amount','total_amount','net_amount','net_amount_in_word' ];
  const hiddenForUV = new Set(['mortgage_amount', 'mortgage_amount_in_word', 'stamp_amount', 'financing_agreement_amount', 'security_agreement_amount', 'upgrading_land_rights_amount']);
  const hiddenForBLCreate = new Set(['tlo', 'tlo_in_word', 'admin_rate', 'admin_rate_in_word', 'life_insurance', 'life_insurance_in_word']);
  const getVisibleContractFields = (forContractOnly = false) => { const shouldHide = forContractOnly || !!createOnly; if (!shouldHide) return contractFields; return contractFields.filter(f => !hiddenForUV.has(f)); };

  React.useEffect(() => { if (selectedDirector) (async () => { try { const token = localStorage.getItem('access_token'); const res = await axios.get('http://localhost:8000/api/directors/', { params: { name: selectedDirector }, headers: token ? { Authorization: `Bearer ${token}` } : {} }); const director = res.data.director || null; if (director) setHeaderFields(prev => ({ ...prev, phone_number_of_lolc: director.phone_number_of_lolc || '', Name_of_director: selectedDirector })); } catch (err) { console.warn('Failed to load director details', err); } })(); }, [selectedDirector]);

  const collateralFields = [ 'wheeled_vehicle','vehicle_type','vehicle_brand','vehicle_model','plate_number','chassis_number','engine_number','manufactured_year','colour','bpkb_number','name_bpkb_owner'];

// Formatting helpers are imported from shared utilities to avoid duplication



const isIsoDate = (s) => {
  if (!s) return false;
  return /^\d{4}-\d{2}-\d{2}$/.test(String(s));
};



const getMonthInRomanNumeral = (monthNumber) => {
  const romanNumerals = ['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII'];
  return romanNumerals[monthNumber - 1] || '';
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

  const loadContracts = async () => {
    setLoadingContracts(true);
    const token = localStorage.getItem('access_token');
    if (!token) { setContracts([]); setLoadingContracts(false); return; }
    try { const response = await axios.get('http://localhost:8000/api/bl-agreement/contracts/', { headers: { 'Authorization': `Bearer ${token}` } }); setContracts(response.data.contracts || []); } catch (err) { console.error('Error loading contracts:', err); if (!err.response || err.response.status !== 401) setError('Gagal memuat daftar kontrak'); } finally { setLoadingContracts(false); }
  };

  const loadBranches = async () => {
    setLoadingBranches(true);
    const token = localStorage.getItem('access_token');
    try { const headers = token ? { 'Authorization': `Bearer ${token}` } : {}; const res = await axios.get('http://localhost:8000/api/branches/', { headers }); const items = res.data.branches || []; setBranches(items); console.log('Loaded branches count:', items.length, items.slice(0,3)); } catch (err) { console.error('Error loading branches:', err); if (!err.response || err.response.status !== 401) setError('Gagal memuat daftar cabang'); } finally { setLoadingBranches(false); }
  };

  const loadDirectors = async () => {
    setLoadingDirectors(true);
    const token = localStorage.getItem('access_token');
    if (!token) { setDirectors([]); setLoadingDirectors(false); return; }
    try { const res = await axios.get('http://localhost:8000/api/directors/', { headers: { 'Authorization': `Bearer ${token}` } }); setDirectors(res.data.directors || []); } catch (err) { console.error('Error loading directors:', err); if (!err.response || err.response.status !== 401) setError('Gagal memuat daftar direktur'); } finally { setLoadingDirectors(false); }
  };

  const loadBMByCity = async (city) => {
    if (!city) return;
    try { const params = {}; if (String(city).match(/^\d+$/)) params.bm_id = city; else params.city = city; const res = await axios.get('http://localhost:8000/api/branch-manager/', { params, headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` } }); const bm = res.data.bm || {}; setBmData(prevBmData => { const newBm = { ...prevBmData }; bmFields.forEach((f) => { if (bm[f] !== undefined && bm[f] !== null && bm[f] !== '') { newBm[f] = bm[f]; } }); return newBm; }); } catch (err) { console.error('Error loading BM for city/bm_id:', err); } };

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
        const respContract = await axios.get('http://localhost:8000/api/contracts/lookup/', { params: { contract_number: cn }, headers });
        const contractRow = respContract.data?.contract || (Array.isArray(respContract.data) ? respContract.data[0] : respContract.data) || {};
        setDebtor(contractRow.debtor || null);
        // map contract fields into contractData
        const directContractData = {};
        contractFields.forEach((f) => { directContractData[f] = findValueInObj(contractRow, f) ?? ''; });
        setContractData(directContractData);

        // Fetch UV collateral rows (prefer first) to determine uvCollateralFields and prefill collateralData
        try {
          const respColl = await axios.get('http://localhost:8000/api/uv-collateral/', { params: { contract_number: cn }, headers });
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
          setCollateralData(newCollateralData);
        } catch (e) {
          console.warn('uv-collateral fetch failed for create filter load', e);
          setCollateralData({});
        }

        setHeaderFields(prev => ({ ...prev, agreement_date: contractRow.agreement_date ?? prev.agreement_date }));
        return;
      }

      const response = await axios.get(`http://localhost:8000/api/uv-agreement/`, { params: { contract_number: cn }, headers });
      setDebtor(response.data.debtor || null);
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
        setCollateral(respColl);
      } catch (e) { setCollateral(response.data.collateral || null); }
      if (editOnly || initialContractNumber) {
        const blRow = response.data.debtor || response.data || {};
        const directContractData = {};
        contractFields.forEach((f) => { directContractData[f] = findValueInObj(blRow, f) ?? ''; });
        const directBmData = {};
        bmFields.forEach((f) => { directBmData[f] = findValueInObj(blRow, f) ?? ''; });
        const directBranchData = { street_name: blRow.street_name ?? blRow.street_of_bm ?? '', subdistrict: blRow.subdistrict ?? blRow.subdistrict_of_bm ?? '', district: blRow.district ?? blRow.district_of_bm ?? '', city: blRow.city ?? blRow.city_of_bm ?? '', province: blRow.province ?? blRow.province_of_bm ?? '' };
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
        const directHeader = { ...headerFields, agreement_date: blRow.agreement_date ?? headerFields.agreement_date, place_of_agreement: blRow.city ?? headerFields.place_of_agreement, Name_of_director: blRow.Name_of_director ?? blRow.name_of_director ?? headerFields.Name_of_director, phone_number_of_lolc: blRow.phone_number_of_lolc ?? blRow.phone_of_lolc ?? headerFields.phone_number_of_lolc, sp3_number: blRow.sp3_number ?? blRow.sp3No ?? headerFields.sp3_number, sp3_date: blRow.sp3_date ?? blRow.sp3Date ?? headerFields.sp3_date };
        setContractData(directContractData); setBmData(directBmData); setBranchData(directBranchData); setCollateralData(directCollateralData);
        const known = new Set([...contractFields, ...bmFields, ...branchFields, ...collateralFields, Object.keys(directHeader || {})]);
        const extras = {};
        Object.keys(blRow || {}).forEach(k => { if (!known.has(k) && k !== 'id') extras[k] = blRow[k]; });
        setExtraFields(extras);
        setHeaderFields(prev => ({ ...prev, ...directHeader }));
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
      const bmFromResp = response.data.bm || response.data.branch_manager || response.data.bm_data || {};
      if (bmFromResp && Object.keys(bmFromResp).length > 0) {
        const respKeys = Object.keys(bmFromResp || {});
        const normalize = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '').replace(/of/g, '');
        const normMap = {};
        respKeys.forEach(k => { normMap[normalize(k)] = k; });
        bmFields.forEach((f) => { const nf = normalize(f); const sourceKey = normMap[nf]; if (sourceKey && bmFromResp[sourceKey] !== undefined && bmFromResp[sourceKey] !== null) newBmData[f] = bmFromResp[sourceKey]; });
      } else {
        bmFields.forEach((f) => { newBmData[f] = d[f] ?? ''; });
        if ((!newBmData.name_of_bm || !newBmData.place_birth_of_bm || !newBmData.date_birth_of_bm) && (d.city || d.city_of_bm)) { loadBMByCity(d.city || d.city_of_bm); }
      }
      const branchFromResp = response.data.branch || {};
      const newBranchData = { street_name: branchFromResp.street_name ?? branchFromResp.street_of_bm ?? d.street_name ?? '', subdistrict: branchFromResp.subdistrict ?? d.subdistrict ?? '', district: branchFromResp.district ?? d.district ?? '', city: branchFromResp.city ?? d.city ?? '', province: branchFromResp.province ?? d.province ?? '' };
      const newCollateralData = { ...(c || {}) };
      try { const uvKeys = Object.keys(newCollateralData).filter(k => !/^(id|uv_collateral_id|contract_number|created_by|created_at|updated_at)$/i.test(k)); setUvCollateralFields(uvKeys); } catch (e) {}
      setContractData(newContractData); setBmData(newBmData); setBranchData(newBranchData); setCollateralData(newCollateralData);
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
    setBranchData({ street_name: sel.street_name ?? sel.street_of_bm ?? '', subdistrict: sel.subdistrict ?? sel.subdistrict_of_bm ?? '', district: sel.district ?? sel.district_of_bm ?? '', city: sel.city ?? sel.city_of_bm ?? sel.name ?? '', province: sel.province ?? sel.province_of_bm ?? '' });
    setHeaderFields(prev => ({ ...prev, place_of_agreement: sel.name ?? prev.place_of_agreement ?? '' }));
    setBmData(prev => ({ ...prev, name_of_bm: sel.name_of_bm ?? sel.name ?? prev.name_of_bm ?? '', place_birth_of_bm: sel.place_birth_of_bm ?? sel.place_of_birth_of_bm ?? prev.place_birth_of_bm ?? '', date_birth_of_bm: sel.date_birth_of_bm ?? sel.date_of_birth_of_bm ?? prev.date_birth_of_bm ?? '', street_of_bm: sel.street_name_of_bm ?? sel.street_of_bm ?? sel.street_name ?? prev.street_of_bm ?? '', subdistrict_of_bm: sel.subdistrict_of_bm ?? sel.subdistrict ?? prev.subdistrict_of_bm ?? '', district_of_bm: sel.district_of_bm ?? sel.district ?? prev.district_of_bm ?? '', city_of_bm: sel.city_of_bm ?? sel.city ?? sel.name ?? prev.city_of_bm ?? '', province_of_bm: sel.province_of_bm ?? sel.province ?? prev.province_of_bm ?? '', nik_number_of_bm: sel.nik_number_of_bm ?? prev.nik_number_of_bm ?? '', phone_number_of_bm: sel.phone_number_of_bm ?? prev.phone_number_of_bm ?? '' }));
    if ((!sel.name_of_bm || !sel.date_birth_of_bm) && sel.bm_id) loadBMByCity(sel.bm_id);
  };

  React.useEffect(() => { if (!createOnly) return; if (!selectedBranchId) return; const sel = (branches || []).find(b => String(b.id) === String(selectedBranchId)); if (sel) { const mapped = {}; mapped.street_of_bm = sel.street_name_of_bm ?? sel.street_of_bm ?? sel.street_name ?? ''; mapped.subdistrict_of_bm = sel.subdistrict_of_bm ?? sel.subdistrict ?? ''; mapped.district_of_bm = sel.district_of_bm ?? sel.district ?? ''; mapped.city_of_bm = sel.city_of_bm ?? sel.city ?? sel.name ?? ''; mapped.province_of_bm = sel.province_of_bm ?? sel.province ?? ''; mapped.name_of_bm = sel.name_of_bm ?? ''; mapped.place_birth_of_bm = sel.place_birth_of_bm ?? ''; mapped.date_birth_of_bm = sel.date_birth_of_bm ?? sel.date_of_birth_of_bm ?? ''; mapped.nik_number_of_bm = sel.nik_number_of_bm ?? ''; mapped.phone_number_of_bm = sel.phone_number_of_bm ?? ''; setBmData(prev => ({ ...prev, ...mapped })); if ((!mapped.name_of_bm || !mapped.place_birth_of_bm || !mapped.date_birth_of_bm) && sel.bm_id) { loadBMByCity(sel.bm_id); } } else { loadBMByCity(selectedBranchId); } }, [createOnly, selectedBranchId, branches]);

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

  React.useEffect(() => { const raw = localStorage.getItem('user_data'); if (raw) { try { const parsed = JSON.parse(raw); setUsernameDisplay(parsed.username || parsed.full_name || ''); } catch (e) {} } (async () => { try { const token = localStorage.getItem('access_token'); if (!token) return; const res = await axios.get('http://localhost:8000/api/whoami/', { headers: { 'Authorization': `Bearer ${token}` } }); setUsernameDisplay(res.data.username || res.data.full_name || ''); } catch (err) { console.warn('whoami fetch failed', err); } })(); }, []);

  React.useEffect(() => {
    try {
      const ad = headerFields?.agreement_date;
      if (!ad) return;
      const iso = parseDateFromDisplay(ad) || ad;
      const dayName = getIndonesianDayName(iso) || '';
      const dateWords = getIndonesianDateInWords(iso) || '';
      setHeaderFields(prev => ({ ...prev,
        agreement_day_in_word: dayName || prev.agreement_day_in_word || '',
        agreement_date_in_word: dateWords || prev.agreement_date_in_word || '',
        // backward-compatible keys
        agreement_day_inword: dayName || prev.agreement_day_inword || '',
        agreement_date_inword: dateWords || prev.agreement_date_inword || '',
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
          setHeaderFields(prev => ({ ...prev, sp3_number: generatedSP3Number }));
        }
      } catch (e) { /* ignore */ }
    }
  }, [headerFields.agreement_date, headerFields.sp3_date, contractData.contract_number, contractNumber]);

  React.useEffect(() => { if (!selectedBranchId && bmData.city_of_bm) { setHeaderFields(prev => ({ ...prev, place_of_agreement: bmData.city_of_bm })); } }, [bmData.city_of_bm]);

  React.useEffect(() => { const raw = bmData.date_birth_of_bm; if (raw !== undefined && raw !== null && String(raw).trim() !== '') { const iso = parseDateFromDisplay(raw); const words = getIndonesianDateInWords(iso || raw); setBmData(prev => { if (prev.date_birth_of_bm === iso && prev.date_birth_of_bm_in_word === words) return prev; const out = { ...prev, date_birth_of_bm_in_word: words }; if (iso && prev.date_birth_of_bm !== iso) out.date_birth_of_bm = iso; return out; }); console.log('Converted BM date_birth to words:', raw, '=>', words, '(iso:', iso, ')'); } }, [bmData.date_birth_of_bm]);

  React.useEffect(() => { const raw = contractData.date_birth_of_debtor; if (raw !== undefined && raw !== null && String(raw).trim() !== '') { const iso = parseDateFromDisplay(raw); const words = getIndonesianDateInWords(iso || raw); setContractData(prev => { if (prev.date_birth_of_debtor === iso && prev.date_birth_of_debtor_in_word === words) return prev; const out = { ...prev, date_birth_of_debtor_in_word: words }; if (iso && prev.date_birth_of_debtor !== iso) out.date_birth_of_debtor = iso; return out; }); console.log('Converted debtor date_birth to words:', raw, '=>', words, '(iso:', iso, ')'); } }, [contractData.date_birth_of_debtor]);

  React.useEffect(() => { if (contractData.loan_amount !== undefined && contractData.loan_amount !== null && contractData.loan_amount !== '') { const n = Number(String(contractData.loan_amount).replace(/\./g, '').replace(/,/g, '.')) || 0; const words = (n === 0) ? '' : getIndonesianNumberWord(n); setContractData(prev => ({ ...prev, loan_amount_in_word: words })); console.log('Converted loan_amount to words:', contractData.loan_amount, '=>', words); } }, [contractData.loan_amount]);
  React.useEffect(() => {
    const getNum = (v) => { if (v === undefined || v === null || v === '') return 0; const s = String(v).replace(/\./g, '').replace(/,/g, '').trim(); const n = Number(s); return Number.isNaN(n) ? 0 : n; };
    try {
      const sum = getNum(contractData.admin_fee) + getNum(contractData.notaris_fee) + getNum(contractData.tlo) + getNum(contractData.life_insurance);
      if (String(contractData.total_amount || '') !== String(sum)) {
        setContractData(prev => ({ ...prev, total_amount: sum }));
      }
    } catch (e) { /* ignore */ }
  }, [contractData.admin_fee, contractData.notaris_fee, contractData.tlo, contractData.life_insurance]);

  React.useEffect(() => { if (contractData.term !== undefined && contractData.term !== null && contractData.term !== '') { const n = Number(String(contractData.term).replace(/\./g, '').replace(/,/g, '.')) || 0; const words = (n === 0) ? '' : getIndonesianNumberWord(n); setContractData(prev => ({ ...prev, term_by_word: words })); console.log('Converted term to words:', contractData.term, '=>', words); } }, [contractData.term]);

  // Helper utilities (copied from BLAgreementForm) so render code can use them
  // Use shared `formatFieldName` from utils/formatting for Title Case labels

  const formatFieldValue = (value) => {
    if (value === null || value === undefined) return '-';
    if (typeof value === 'boolean') return value ? 'Ya' : 'Tidak';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  };

  const formatLabel = (f) => {
    if (!f) return '';
    if (f === 'notaris_fee') return 'Handling Fee';
    if (f === 'notaris_fee_in_word') return 'Handling Fee In Word';
    return formatFieldName(f);
  };

  const handleContractNumberChange = (value) => {
    setContractNumber(value);
    // update dropdown suggestions
    if (value && value.trim()) {
      const q = value.toString().toLowerCase();
      const filtered = (contracts || []).filter(c => String(c).toLowerCase().includes(q));
      setFilteredContracts(filtered); setShowContractDropdown(filtered.length > 0);
      // small debounce before triggering view to avoid flood of requests
      if (handleContractNumberChange._timer) clearTimeout(handleContractNumberChange._timer);
      handleContractNumberChange._timer = setTimeout(() => {
        try { handleView(value, true); } catch (e) { /* ignore if handler not ready */ }
      }, 250);
    } else {
      setFilteredContracts(contracts || []); setShowContractDropdown(false);
      if (handleContractNumberChange._timer) { clearTimeout(handleContractNumberChange._timer); handleContractNumberChange._timer = null; }
    }
  };

  const handleInputChange = (section, field, value) => {
    if (section === 'bm') {
      if (String(field).toLowerCase().includes('nik')) {
        const raw = String(value || '').replace(/\D/g, '').slice(0,16);
        setBmData(prev => ({ ...prev, [field]: raw }));
      } else if (String(field).toLowerCase().includes('date')) { const iso = parseDateFromDisplay(value); setBmData(prev => ({ ...prev, [field]: iso })); } else { setBmData(prev => ({ ...prev, [field]: value })); }
    }
    if (section === 'branch') setBranchData(prev => ({ ...prev, [field]: value }));
    if (section === 'contract') {
      if (String(field).toLowerCase().includes('nik')) {
        const raw = String(value || '').replace(/\D/g, '').slice(0,16);
        setContractData(prev => ({ ...prev, [field]: raw }));
        return;
      }
      // handle rate fields (show comma on UI, store with dot)
      if (rateFields && rateFields.includes(field)) {
        const rateVal = String(value || '').replace(',', '.');
        setContractData(prev => ({ ...prev, [field]: rateVal }));
        return;
      }
      if (numericFields.includes(field)) {
        const raw = (value || '').toString().replace(/\./g, '').replace(/,/g, '').trim();
        setContractData(prev => ({ ...prev, [field]: raw }));
      } else {
        if (String(field).toLowerCase().includes('date')) {
          const iso = parseDateFromDisplay(value);
          setContractData(prev => ({ ...prev, [field]: iso }));
        } else {
          setContractData(prev => ({ ...prev, [field]: value }));
        }
      }
    }
    if (section === 'collateral') { if (numericFields.includes(field)) { const raw = (value || '').toString().replace(/\./g, '').replace(/,/g, '').trim(); setCollateralData(prev => ({ ...prev, [field]: raw })); } else { if (String(field).toLowerCase().includes('date')) { const iso = parseDateFromDisplay(value); setCollateralData(prev => ({ ...prev, [field]: iso })); } else { setCollateralData(prev => ({ ...prev, [field]: value })); } } }
    if (section === 'header') { if (String(field).toLowerCase().includes('date')) { const iso = parseDateFromDisplay(value); setHeaderFields(prev => ({ ...prev, [field]: iso })); } else { setHeaderFields(prev => ({ ...prev, [field]: value })); } }
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
    'name_of_debtor','place_birth_of_debtor','date_birth_of_debtor','date_birth_of_debtor_in_word','street_of_debtor','subdistrict_of_debtor','district_of_debtor','city_of_debtor','province_of_debtor','nik_number_of_debtor','phone_number_of_debtor','business_partners_relationship','business_type','bank_account_number','name_of_bank','name_of_account_holder','virtual_account_number','topup_contract','previous_topup_amount','loan_amount','loan_amount_in_word','term','term_by_word','flat_rate','flat_rate_by_word','notaris_fee','notaris_fee_in_word','admin_fee','admin_fee_in_word','admin_rate','admin_rate_in_word','tlo','tlo_in_word','life_insurance','life_insurance_in_word','stamp_amount','financing_agreement_amount','security_agreement_amount','upgrading_land_rights_amount','total_amount','net_amount','net_amount_in_word'
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
        const n = Number(contractData[baseField] || 0) || 0;
        value = (n === 0) ? '' : (getIndonesianNumberWord(n) || contractData[f] || '');
      }
      // ensure display is Capital Each Word
      const titleCase = (s) => { if (!s || typeof s !== 'string') return s || ''; return s.split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '); };
      value = titleCase(value);
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
        <label style={labelStyle}>{formatLabel(f)}</label>
        <input
          type={inputType}
          value={isDate ? (contractData[f] || '') : (isNumericInput ? (rateFields && rateFields.includes(f) ? String(contractData[f] || '').replace('.', ',') : formatNumberWithDots(contractData[f])) : (contractData[f] ?? ''))}
          onChange={(e) => handleInputChange('contract', f, e.target.value)}
          style={inputStyle}
        />
      </div>
    );
  };

  if (contractOnly) {
    const visibleContractFields = getVisibleContractFields(true);
    return (
      <div style={{ padding: 20, minWidth: 560 }}>
        {contractOnlyError && <div style={{ marginBottom: 12, color: '#a33' }}>{contractOnlyError}</div>}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {visibleContractFields.map(f => {
            const isWordField = /(_in_word|_by_word)$/.test(f);
            const baseField = f.replace(/(_in_word|_by_word)$/, '');
            let value = '';
            let disabled = false;
            if (isWordField) {
              disabled = true;
              if (/date|birth/i.test(baseField)) { value = getIndonesianDateInWords(contractData[baseField]) || contractData[f] || ''; } else { const num = Number(contractData[baseField] || 0) || 0; value = getIndonesianNumberWord(num) || contractData[f] || ''; }
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
                <label style={labelStyle}>{formatLabel(f)}</label>
                {(!isWordField && String(f).toLowerCase().includes('date')) ? (
                  <input type="date" style={inputStyle} value={disabled ? value : (contractData[f] || '')} disabled={disabled} onChange={(e) => { if (!disabled) handleInputChange('contract', f, e.target.value); }} />
                ) : (
                  (numericFields.includes(f) && !isWordField) ? (
                    <input
                      type="text"
                      style={inputStyle}
                      value={disabled ? value : (rateFields && rateFields.includes(f) ? String(contractData[f] || '').replace('.', ',') : formatNumberWithDots(contractData[f]))}
                      disabled={disabled}
                      onChange={(e) => { if (!disabled) handleInputChange('contract', f, e.target.value); }}
                    />
                  ) : (
                    <input type="text" placeholder={String(f).toLowerCase().includes('date') ? 'DD/MM/YYYY' : ''} style={inputStyle} value={disabled ? value : value} disabled={disabled} onChange={(e) => { if (!disabled) handleInputChange('contract', f, e.target.value); }} />
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
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <label style={labelStyle}>Contract Number{inModal && <span style={{ color: '#a33', marginLeft: 6 }}>*</span>}</label>
                <input
                  placeholder="Contract Number"
                  value={contractNumber}
                  onChange={(e) => handleContractNumberChange(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { handleView(contractNumber, true); } }}
                  style={inputStyle}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <label style={labelStyle}>Branch{inModal && <span style={{ color: '#a33', marginLeft: 6 }}>*</span>}</label>
                <select value={selectedBranchId || ''} onChange={(e) => { setSelectedBranchId(e.target.value); handleBranchSelectLoad(e.target.value); }} style={inputStyle}>
                  <option value="">-- Select Branch --</option>
                  {(branches || []).map(b => <option key={b.id} value={b.id}>{b.name || b.branch_name || b.city || b.id}</option>)}
                </select>
              </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                <label style={labelStyle}>Director{inModal && <span style={{ color: '#a33', marginLeft: 6 }}>*</span>}</label>
                <select value={selectedDirector || ''} onChange={(e) => {
                    const v = e.target.value;
                    setSelectedor(v);
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
            <h4 style={h4Style}>Agreement Detail</h4>
            <div style={{ display: 'grid', gridTemplateColumns: inModal ? '1fr 1fr' : '1fr 1fr 1fr', gap: 8 }}>
              {(() => {
                const modalOrder = ['date_of_delegated','agreement_date','sp3_number','name_of_director','phone_number_of_lolc'];
                const normalOrder = ['agreement_date','agreement_day_in_word','agreement_date_in_word','sp3_date','sp3_number','date_of_delegated','name_of_director','phone_number_of_lolc'];
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
                          val = getIndonesianNumberWord(n) || headerFields[f] || '';
                        }
                        const titleCase = (s) => { if (!s || typeof s !== 'string') return s || ''; return s.split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '); };
                        return <input type="text" value={titleCase(val)} disabled style={{ ...inputStyle, backgroundColor: '#f5f5f5' }} />;
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
              <h4 style={h4Style}>Contract</h4>
              <div style={{ display: 'grid', gridTemplateColumns: inModal ? '1fr 1fr' : '1fr 1fr 1fr', gap: 8 }}>
                {(inModal ? getVisibleContractFields(true) : contractFieldList).map(renderContractField)}
              </div>
            </div>

            {/* Collateral container */}
              <div style={inModal ? {} : { border: '1px solid #e6e6e6', padding: sectionPadding, borderRadius: 6 }}>
              <h4 style={h4Style}>Collateral</h4>
              <div style={{ display: 'grid', gridTemplateColumns: inModal ? '1fr 1fr' : '1fr 1fr 1fr', gap: 8 }}>
                {(Array.isArray(uvCollateralFields) && uvCollateralFields.length > 0 ? uvCollateralFields : ['vehicle_types','vehicle_brand','vehicle_model','plate_number','chassis_number','engine_number','manufactured_year','colour','bpkb_number','name_bpkb_owner']).map(f => {
                  // resolve actual key present in collateralData (handles plat/plate, chassis/chassis, vehicle/vehicle variants)
                  const actualKey = findKeyInObj(collateralData || {}, f) || f;
                  const keyForState = actualKey;
                  const labelName = (keyForState === 'vehicle_types') ? 'Vehicle Types' : formatLabel(keyForState);
                  // Treat only explicit numeric collateral fields as numbers; avoid treating plate_number or bpkb owner/name as numeric.
                  const inputType = /(?:surface_area|capacity_of_building|^number_of_|_amount$|^manufactured_year$)/i.test(keyForState) ? 'number' : (isDateFieldName(keyForState) ? 'date' : 'text');
                  // Render dropdown for wheeled_vehicle
                  if (keyForState === 'wheeled_vehicle') {
                    return (
                      <div key={f} style={{ display: 'flex', flexDirection: 'column' }}>
                        <label style={labelStyle}>{labelName}</label>
                        <select value={collateralData[keyForState] ?? ''} onChange={(e) => handleInputChange('collateral', keyForState, e.target.value)} style={inputStyle}>
                          <option value="">-- Select --</option>
                          <option value="roda dua">Roda Dua</option>
                          <option value="roda tiga">Roda Tiga</option>
                          <option value="roda empat">Roda Empat</option>
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
                })}
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
                  <label style={labelStyle}>{formatLabel(f)}</label>
                  {f === 'date_birth_of_bm_in_word' ? (
                    (() => { const base = 'date_birth_of_bm'; const val = getIndonesianDateInWords(bmData[base]) || bmData[f] || ''; const titleCase = (s) => { if (!s || typeof s !== 'string') return s || ''; return s.split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '); }; return <input type="text" value={titleCase(val)} disabled style={{ ...inputStyle, backgroundColor: '#f5f5f5' }} /> })()
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
                  <label style={labelStyle}>{formatLabel(f)}</label>
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
          <button type="button" style={{ ...styles.btnPrimary, minWidth: 120 }} onClick={handleSave} disabled={saving || (inModal && !isModalSaveAllowed())}>{saving ? 'Saving...' : ((editOnly || initialContractNumber) ? 'Update' : 'Save')}</button>
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
  return <UVAgreementForm initialContractNumber={initialContractNumber} onSaved={onSaved} createOnly={false} editOnly={true} hideFilter={true} hideHeader={true} inModal={true} {...rest} />;
}

export default function UVAgreement() {
  const [agreements, setAgreements] = useState([]);
  const [columns, setColumns] = useState([]);
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
    contract_number: '', nik_number_of_debtor: '', name_of_debtor: '', place_birth_of_debtor: '', date_birth_of_debtor: '', street_of_debtor: '', subdistrict_of_debtor: '', district_of_debtor: '', city_of_debtor: '', province_of_debtor: '', phone_number_of_debtor: '', business_partners_relationship: '', business_type: '', loan_amount: '', loan_amount_in_word: '', term: '', term_by_word: '', flat_rate: '', flat_rate_by_word: '', bank_account_number: '', name_of_bank: '', name_of_account_holder: '', virtual_account_number: '', notaris_fee: '', notaris_fee_in_word: '', admin_fee: '', admin_fee_in_word: '', topup_contract: '', previous_topup_amount: '', net_amount: '', net_amount_in_word: '', admin_rate: '', admin_rate_in_word: '', tlo: '', tlo_in_word: '', life_insurance: '', life_insurance_in_word: ''
  });
  const contractFieldRefs = useRef({});
  const [contractFormErrors, setContractFormErrors] = useState({});
  // Return true when all visible, non-readonly contract fields (except
  // virtual_account_number and topup_contract) are non-empty.
  const getRequiredContractFields = () => {
    const contractTableFields = ['contract_number','nik_number_of_debtor','name_of_debtor','place_birth_of_debtor','date_birth_of_debtor','date_birth_of_debtor_in_word','street_of_debtor','subdistrict_of_debtor','district_of_debtor','city_of_debtor','province_of_debtor','phone_number_of_debtor','business_partners_relationship','business_type','bank_account_number','name_of_bank','name_of_account_holder','virtual_account_number','topup_contract','previous_topup_amount','loan_amount','loan_amount_in_word','term','term_by_word','flat_rate','flat_rate_by_word','notaris_fee','notaris_fee_in_word','admin_rate','admin_rate_in_word','admin_fee','admin_fee_in_word','handling_fee','handling_fee_in_word','tlo','tlo_in_word','life_insurance','life_insurance_in_word','stamp_amount','financing_agreement_amount','security_agreement_amount','upgrading_land_rights_amount','total_amount','net_amount','net_amount_in_word'];
    const hiddenForUVLocal = new Set(['mortgage_amount', 'mortgage_amount_in_word', 'stamp_amount', 'financing_agreement_amount', 'security_agreement_amount', 'upgrading_land_rights_amount']);
    let fields = contractTableFields.filter(f => !hiddenForUVLocal.has(f));
    // exclude the two optional fields
    fields = fields.filter(f => f !== 'virtual_account_number' && f !== 'topup_contract');
    // exclude Handling Fee from being considered required in Add Contract modal
    fields = fields.filter(f => f !== 'handling_fee' && f !== 'handling_fee_in_word');
    // exclude read-only word fields
    fields = fields.filter(f => !(/(_in_word|_by_word)$/.test(f)));
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
    vehicle_types: '',
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
  const requiredUvCollateralFields = ['contract_number','name_of_debtor','wheeled_vehicle','vehicle_types','vehicle_brand','vehicle_model','plate_number','chassis_number','engine_number','manufactured_year','colour','bpkb_number','name_bpkb_owner'];
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
  const uvDefaultCollateralFields = [ 'vehicle_types','vehicle_brand','vehicle_model','plate_number','chassis_number','engine_number','manufactured_year','colour','bpkb_number','name_bpkb_owner' ];
  const collateralFields = uvDefaultCollateralFields;
  const [uvCollateralFields, setUvCollateralFields] = useState(collateralFields);

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
        const res = await requestWithAuth({ method: 'get', url: `http://localhost:8000/api/${base}/`, params: { contract_number: cn } });
        const debtor = res.data?.debtor || res.data || {};
        const name = debtor.name_of_debtor || debtor.name || debtor.debtor_name || '';
        if (name) setCollateralForm(prev => ({ ...prev, name_of_debtor: name }));
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
      const res = await requestWithAuth({ method: 'get', url: 'http://localhost:8000/api/uv-agreement/' });
      let items = res.data?.agreements || res.data?.results || res.data || [];
      if (!Array.isArray(items)) items = items ? [items] : [];
      // keep raw item plus some normalized convenience fields
      const rows = items.map(item => {
        // Prefer vehicle type fields from the TOP-LEVEL uv_agreement row (item)
        // so the table reflects columns from `uv_agreement` rather than nested collateral.
        const vehicleVal = item.vehicle_type || item.vehicle_type || item.collateral_type || item.uv_collateral_type || ((item.collateral && (item.collateral.vehicle_types || item.collateral.vehicle_types || item.collateral.collateral_type)) || '') ;
        const normalized = {
          agreement_date: item.agreement_date || item.header?.agreement_date || item.created_at || item.created || item.date_created || '',
          contract_number: item.contract_number || (item.contract && item.contract.contract_number) || '',
          name_of_debtor: (item.debtor || item.contract || {}).name_of_debtor || item.name_of_debtor || item.debtor_name || '',
          nik_number_of_debtor: (item.debtor || item.contract || {}).nik_number_of_debtor || item.nik_number_of_debtor || item.debtor_nik || '',
          vehicle_types: vehicleVal,
          vehicle_type: vehicleVal,
          created_by: item.created_by || item.created_by_name || item.created_by_user || item.created_by_user_name || ''
        };
        return { raw: item, ...normalized };
      });
      setAgreements(rows);

      // determine dynamic columns from raw items (union of keys)
      const colsSet = new Set();
      items.forEach(it => {
        if (it && typeof it === 'object') Object.keys(it).forEach(k => colsSet.add(k));
      });
      // prefer a few known columns first
      const preferred = ['agreement_date', 'contract_number', 'name_of_debtor', 'nik_number_of_debtor', 'vehicle_types', 'vehicle_types', 'created_by'];
      const dynamic = Array.from(colsSet).filter(c => !preferred.includes(c));
      let ordered = [...preferred.filter(p => colsSet.has(p)), ...dynamic];
      // Ensure `vehicle_types` column appears after `nik_number_of_debtor` even if
      // the physical column isn't present in uv_agreement (we derive it from nested collateral).
      if (!ordered.includes('vehicle_types')) {
        const insertAfter = ordered.indexOf('nik_number_of_debtor');
        if (insertAfter >= 0) {
          ordered = [...ordered.slice(0, insertAfter + 1), 'vehicle_types', ...ordered.slice(insertAfter + 1)];
        } else {
          // fallback: append near start
          ordered.splice(1, 0, 'vehicle_types');
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
      setError('Gagal memuat data UV Agreement');
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
      const res = await requestWithAuth({ method: 'get', url: `http://localhost:8000/api/uv-agreement/?contract_number=${encodeURIComponent(cn)}` });
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
      // Download Agreement (DOCX or PDF if backend returns PDF)
      const url1 = `http://localhost:8000/api/uv-agreement/download-docx/?contract_number=${encodeURIComponent(row.contract_number)}&type=agreement`;
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
      const url2 = `http://localhost:8000/api/uv-agreement/download-docx/?contract_number=${encodeURIComponent(row.contract_number)}&type=sp3`;
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
      console.error('Download failed', err); setError('Failed to download the document');
    }
  };

  const handleDownloadPdf = async (row) => {
    if (!row.contract_number) { setError(t('contract_number_empty')); return; }
    try {
      // Agreement PDF
      const url1 = `http://localhost:8000/api/uv-agreement/download-docx/?contract_number=${encodeURIComponent(row.contract_number)}&type=agreement&download=pdf`;
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
      const url2 = `http://localhost:8000/api/uv-agreement/download-docx/?contract_number=${encodeURIComponent(row.contract_number)}&type=sp3&download=pdf`;
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

  

  const saveContractOnly = async () => {
    setSavingModal(true);
    // simple validation
    const errors = {};
    if (!String(contractFormData.contract_number || '').trim()) errors.contract_number = 'Contract number is required';
    if (!String(contractFormData.name_of_debtor || '').trim()) errors.name_of_debtor = 'Name of debtor is required';
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
      ['loan_amount','previous_topup_amount','notaris_fee','admin_fee','net_amount','admin_rate','term'].forEach((k) => {
        if (payload[k] !== undefined && payload[k] !== null && payload[k] !== '') {
          const n = Number(String(payload[k]).replace(/\./g,'').replace(/,/g,'')); if (!Number.isNaN(n)) payload[k] = n;
        }
      });
      // Do not include mortgage_amount, created_by, created_at, updated_at
      delete payload.mortgage_amount; delete payload.created_by; delete payload.created_at; delete payload.updated_at;
      const res = await requestWithAuth({ method: 'post', url: 'http://localhost:8000/api/contracts/', data: payload });
      const saved = res.data || payload;
      setLastSavedContract(saved);
      setShowCreateModal(false);
      setContractOnlyMode(false);
      await loadAgreements();
      setSuccessMessage('Contract data saved successfully');
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (err) {
      console.error('Save contract-only failed', err);
      setError('Failed to save contract');
    } finally { setSavingModal(false); }
  };

  const handleSaveAndDownload = async () => {
    setSavingModal(true);
    try {
      const payload = { contract_number: contractNumber, debtor: { name_of_debtor: formDebtorName, nik_number_of_debtor: formNik }, collateral: { collateral_type: formCollateralType } };
      try { stripIdKeys(payload); } catch (e) {}
      await requestWithAuth({ method: 'post', url: 'http://localhost:8000/api/uv-agreement/', data: payload });
      // refresh daftar lalu unduh
      await loadAgreements();
      // Request PDF explicitly
      const url = `http://localhost:8000/api/uv-agreement/download-docx/?contract_number=${encodeURIComponent(contractNumber)}&download=pdf`;
      const res = await requestWithAuth({ method: 'get', url, responseType: 'blob' });
      const contentType = (res.headers && res.headers['content-type']) || '';
      const isPdf = contentType.includes('pdf');
      const blob = new Blob([res.data], { type: contentType || (isPdf ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') });
      const link = document.createElement('a'); link.href = window.URL.createObjectURL(blob); link.download = `UV_Agreement_${contractNumber}${isPdf ? '.pdf' : '.docx'}`; document.body.appendChild(link); link.click(); link.remove();
      setShowCreateModal(false);
    } catch (err) {
      console.error('Save & Download failed', err);
      setError('Failed to save and download');
    } finally {
      setSavingModal(false);
    }
  };

  const handleModalDownload = async () => {
    if (!contractNumber) { setError(t('contract_number_empty')); return; }
    try {
      // Request PDF when available
      const url = `http://localhost:8000/api/uv-agreement/download-docx/?contract_number=${encodeURIComponent(contractNumber)}`;
      const res = await requestWithAuth({ method: 'get', url, responseType: 'blob' });
      const contentType = (res.headers && res.headers['content-type']) || '';
      const isPdf = contentType.includes('pdf');
      const blob = new Blob([res.data], { type: contentType || (isPdf ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') });
      const link = document.createElement('a'); link.href = window.URL.createObjectURL(blob); link.download = `UV_Agreement_${contractNumber}${isPdf ? '.pdf' : '.docx'}`; document.body.appendChild(link); link.click(); link.remove();
    } catch (err) { console.error('Download failed', err); setError('Failed to download the document'); }
  };

  const handleSaveModal = async () => {
    setSavingModal(true);
    setError('');
    try {
      const payload = { contract_number: contractNumber, debtor: { name_of_debtor: formDebtorName, nik_number_of_debtor: formNik }, collateral: { collateral_type: formCollateralType } };
      try { stripIdKeys(payload); } catch (e) {}
      await requestWithAuth({ method: 'post', url: 'http://localhost:8000/api/uv-agreement/', data: payload });
      setShowCreateModal(false);
      await loadAgreements();
    } catch (err) {
      console.error('Save failed', err);
      setError('Failed to save');
    } finally {
      setSavingModal(false);
    }
  };

  const formatDateShort = (iso) => {
    if (!iso) return '';
    try { const d = new Date(iso); if (isNaN(d.getTime())) return iso; const dd = String(d.getDate()).padStart(2, '0'); const mm = String(d.getMonth() + 1).padStart(2, '0'); const yyyy = d.getFullYear(); return `${dd}-${mm}-${yyyy}`; } catch (e) { return iso; }
  };

  return (
    <div>
      <div>
        <h2>UV Agreement</h2>
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
          onClick={() => { setModalMode('create'); setContractNumber(''); setFormDebtorName(''); setFormNik(''); setFormCollateralType(''); setError(''); setCollateralMode(true); setUvCollateralFields(collateralFields); setShowCreateModal(true); }}
          title="Add a new UV collateral"
        >
          Add UV Collateral
        </button>

        <button className="btn-save" onClick={() => { setModalMode('create'); setContractNumber(''); setFormDebtorName(''); setFormNik(''); setFormCollateralType(''); setError(''); setContractOnlyMode(false); setCollateralMode(false); setUvCollateralFields(collateralFields); setShowCreateModal(true); }}>Create Document</button>
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
                    <th>Name Of Debtor</th>
                    <th>Nik Number Of Debtor</th>
                    <th>Vehicle Type</th>
                    <th>Created By</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {agreements.length === 0 ? (
                    <tr><td className="no-data" colSpan={7}>No agreements found.</td></tr>
                  ) : (
                    agreements.map((row, idx) => (
                      <tr key={row.contract_number || idx}>
                        <td>{formatDateShort(row.agreement_date)}</td>
                        <td>{row.contract_number ?? ''}</td>
                        <td>{row.name_of_debtor ?? ''}</td>
                        <td>{row.nik_number_of_debtor ?? ''}</td>
                        <td>{row.vehicle_type ?? ''}</td>
                        <td>{row.created_by ?? ''}</td>
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
                              <img src={pdfIcon} alt="PDF" style={{ width: 24, height: 24 }} />
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
                  contractOnlyMode ? 'Add Contract' : (collateralMode ? 'Add UV Collateral' : 'Create Document')
                )}
              </h3>
              <button className="modal-close-btn" onClick={() => { setShowCreateModal(false); setContractOnlyMode(false); setCollateralMode(false); }}>&times;</button>
            </div>

                <div className="modal-form">
              {modalMode === 'edit' ? (
                <UVAgreementEdit
                  initialContractNumber={contractNumber}
                  onSaved={(cn) => { setShowCreateModal(false); setContractOnlyMode(false); loadAgreements(); if (cn) setContractNumber(cn); }}
                />
                ) : collateralMode ? (
                <div style={{ padding: 20, minWidth: 560 }}>
                  {collateralError && <div style={{ marginBottom: 12, color: '#a33' }}>{collateralError}</div>}

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div style={fieldGroupStyle}>
                      <label style={fieldLabelStyle}>Contract Number{requiredUvCollateralFields.includes('contract_number') && <span style={{ color: '#a33', marginLeft: 6 }}>*</span>}</label>
                      <input type="text" value={collateralForm.contract_number} onChange={(e) => setCollateralForm(prev => ({ ...prev, contract_number: e.target.value }))} style={fieldInputStyle} />  
                    </div>
                    
                    <div style={fieldGroupStyle}>
                      <label style={fieldLabelStyle}>Name of Debtor{requiredUvCollateralFields.includes('name_of_debtor') && <span style={{ color: '#a33', marginLeft: 6 }}>*</span>}</label>
                      <input type="text" value={collateralForm.name_of_debtor} disabled style={{ ...fieldInputStyle, backgroundColor: '#f5f5f5' }} />
                    </div>

                    <div style={fieldGroupStyle}>
                      <label style={fieldLabelStyle}>Wheeled Vehicle{requiredUvCollateralFields.includes('wheeled_vehicle') && <span style={{ color: '#a33', marginLeft: 6 }}>*</span>}</label>
                      <select value={collateralForm.wheeled_vehicle} onChange={(e) => setCollateralForm(prev => ({ ...prev, wheeled_vehicle: e.target.value }))} style={fieldInputStyle}>
                        <option value="">-- Select --</option>
                        <option value="roda dua">Roda Dua</option>
                        <option value="roda tiga">Roda Tiga</option>
                        <option value="roda empat">Roda Empat</option>
                      </select>
                    </div>

                    <div style={fieldGroupStyle}>
                      <label style={fieldLabelStyle}>Vehicle Types{requiredUvCollateralFields.includes('vehicle_types') && <span style={{ color: '#a33', marginLeft: 6 }}>*</span>}</label>
                      <input type="text" value={collateralForm.vehicle_types} onChange={(e) => setCollateralForm(prev => ({ ...prev, vehicle_types: e.target.value }))} style={fieldInputStyle} />
                    </div>

                    <div style={fieldGroupStyle}>
                      <label style={fieldLabelStyle}>Vehicle Brand{requiredUvCollateralFields.includes('vehicle_brand') && <span style={{ color: '#a33', marginLeft: 6 }}>*</span>}</label>
                      <input type="text" value={collateralForm.vehicle_brand} onChange={(e) => setCollateralForm(prev => ({ ...prev, vehicle_brand: e.target.value }))} style={fieldInputStyle} />
                    </div>

                    <div style={fieldGroupStyle}>
                      <label style={fieldLabelStyle}>Vehicle Model{requiredUvCollateralFields.includes('vehicle_model') && <span style={{ color: '#a33', marginLeft: 6 }}>*</span>}</label>
                      <input type="text" value={collateralForm.vehicle_model} onChange={(e) => setCollateralForm(prev => ({ ...prev, vehicle_model: e.target.value }))} style={fieldInputStyle} />
                    </div>

                    <div style={fieldGroupStyle}>
                      <label style={fieldLabelStyle}>Plate Number{requiredUvCollateralFields.includes('plate_number') && <span style={{ color: '#a33', marginLeft: 6 }}>*</span>}</label>
                      <input type="text" value={collateralForm.plate_number} onChange={(e) => setCollateralForm(prev => ({ ...prev, plate_number: e.target.value }))} style={fieldInputStyle} />
                    </div>

                    <div style={fieldGroupStyle}>
                      <label style={fieldLabelStyle}>Chassis Number{requiredUvCollateralFields.includes('chassis_number') && <span style={{ color: '#a33', marginLeft: 6 }}>*</span>}</label>
                      <input type="text" value={collateralForm.chassis_number} onChange={(e) => setCollateralForm(prev => ({ ...prev, chassis_number: e.target.value }))} style={fieldInputStyle} />
                    </div>

                    <div style={fieldGroupStyle}>
                      <label style={fieldLabelStyle}>Engine Number{requiredUvCollateralFields.includes('engine_number') && <span style={{ color: '#a33', marginLeft: 6 }}>*</span>}</label>
                      <input type="text" value={collateralForm.engine_number} onChange={(e) => setCollateralForm(prev => ({ ...prev, engine_number: e.target.value }))} style={fieldInputStyle} />
                    </div>

                    <div style={fieldGroupStyle}>
                      <label style={fieldLabelStyle}>Manufactured Year{requiredUvCollateralFields.includes('manufactured_year') && <span style={{ color: '#a33', marginLeft: 6 }}>*</span>}</label>
                      <input type="text" value={collateralForm.manufactured_year} onChange={(e) => setCollateralForm(prev => ({ ...prev, manufactured_year: e.target.value }))} style={fieldInputStyle} />
                    </div>

                    <div style={fieldGroupStyle}>
                      <label style={fieldLabelStyle}>Colour{requiredUvCollateralFields.includes('colour') && <span style={{ color: '#a33', marginLeft: 6 }}>*</span>}</label>
                      <input type="text" value={collateralForm.colour} onChange={(e) => setCollateralForm(prev => ({ ...prev, colour: e.target.value }))} style={fieldInputStyle} />
                    </div>

                    <div style={fieldGroupStyle}>
                      <label style={fieldLabelStyle}>BPKB Number{requiredUvCollateralFields.includes('bpkb_number') && <span style={{ color: '#a33', marginLeft: 6 }}>*</span>}</label>
                      <input type="text" value={collateralForm.bpkb_number} onChange={(e) => setCollateralForm(prev => ({ ...prev, bpkb_number: e.target.value }))} style={fieldInputStyle} />
                    </div>

                    <div style={fieldGroupStyle}>
                      <label style={fieldLabelStyle}>Collateral Owner{requiredUvCollateralFields.includes('name_bpkb_owner') && <span style={{ color: '#a33', marginLeft: 6 }}>*</span>}</label>
                      <input type="text" value={collateralForm.name_bpkb_owner} onChange={(e) => setCollateralForm(prev => ({ ...prev, name_bpkb_owner: e.target.value }))} style={fieldInputStyle} />
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
                          await requestWithAuth({ method: 'post', url: 'http://localhost:8000/api/uv-collateral/', data: postData });
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
                      }} disabled={collateralSaving || !isUvCollateralFormValid()}>{collateralSaving ? 'Saving...' : 'Save Collateral'}</button>
                    </div>
                </div>
              ) : (
                contractOnlyMode ? (
                  <div style={{ padding: 20, minWidth: 560 }}>

                    {/** Define contract table fields (exclude mortgage_amount, created_by, created_at, updated_at) */}
                    {(() => {
                      let contractTableFields = ['contract_number','nik_number_of_debtor','name_of_debtor','place_birth_of_debtor','date_birth_of_debtor','date_birth_of_debtor_in_word','street_of_debtor','subdistrict_of_debtor','district_of_debtor','city_of_debtor','province_of_debtor','phone_number_of_debtor','business_partners_relationship','business_type','bank_account_number','name_of_bank','name_of_account_holder','virtual_account_number','topup_contract','previous_topup_amount','loan_amount','loan_amount_in_word','term','term_by_word','flat_rate','flat_rate_by_word','notaris_fee','notaris_fee_in_word','admin_rate','admin_rate_in_word','admin_fee','admin_fee_in_word','handling_fee','handling_fee_in_word','tlo','tlo_in_word','life_insurance','life_insurance_in_word','stamp_amount','financing_agreement_amount','security_agreement_amount','upgrading_land_rights_amount','total_amount','net_amount','net_amount_in_word'];
                      const hiddenForUVLocal = new Set(['mortgage_amount', 'mortgage_amount_in_word', 'stamp_amount', 'financing_agreement_amount', 'security_agreement_amount', 'upgrading_land_rights_amount']);
                      if (contractOnlyMode) {
                        contractTableFields = contractTableFields.filter(f => !hiddenForUVLocal.has(f));
                      }
                      const numericToWord = { loan_amount: 'loan_amount_in_word', term: 'term_by_word', flat_rate: 'flat_rate_by_word', notaris_fee: 'notaris_fee_in_word', admin_fee: 'admin_fee_in_word', handling_fee: 'handling_fee_in_word', net_amount: 'net_amount_in_word', admin_rate: 'admin_rate_in_word', tlo: 'tlo_in_word', life_insurance: 'life_insurance_in_word' };
                      const numericInputs = new Set(Object.keys(numericToWord).concat(['previous_topup_amount','stamp_amount','financing_agreement_amount','security_agreement_amount','upgrading_land_rights_amount','total_amount']));
                      return (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                          {contractTableFields.map((f, idx) => {
                            const isReadOnlyWord = /(_in_word|_by_word)$/.test(f);
                            // Render business_partners_relationship as a dropdown matching main form
                            if (f === 'business_partners_relationship') {
                              return (
                                <div style={fieldGroupStyle} key={f}>
                                  <label style={fieldLabelStyle}>{f.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}{getRequiredContractFields().includes(f) && <span style={{ color: '#a33', marginLeft: 6 }}>*</span>}</label>
                                  <select
                                    ref={(el) => { contractFieldRefs.current[f] = el; }}
                                    id={`contract_field_${f}`}
                                    name={f}
                                    value={contractFormData[f] || ''}
                                    onChange={(e) => {
                                      const raw = e.target.value;
                                      setContractFormData(prev => ({ ...prev, [f]: raw }));
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
                                    style={{ ...fieldInputStyle, borderColor: contractFormErrors[f] ? '#d9534f' : undefined }}
                                  >
                                    <option value="">-- Select --</option>
                                    <option value="Suami">Suami</option>
                                    <option value="Istri">Istri</option>
                                    <option value="Anak Kandung">Anak Kandung</option>
                                    <option value="Saudara Kandung">Saudara Kandung</option>
                                    <option value="Orangtua">Orangtua</option>
                                  </select>
                                  {contractFormErrors[f] && <div style={{ color: '#a33', fontSize: 12, marginTop: 6 }}>{contractFormErrors[f]}</div>}
                                </div>
                              );
                            }

                            return (
                              <div style={fieldGroupStyle} key={f}>
                                <label style={fieldLabelStyle}>{f.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}{getRequiredContractFields().includes(f) && <span style={{ color: '#a33', marginLeft: 6 }}>*</span>}</label>
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
                                    const raw = e.target.value;
                                    setContractFormData(prev => {
                                      const next = { ...prev };
                                      if (f === 'date_birth_of_debtor') {
                                        const iso = (/^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : (parseDateFromDisplay(raw) || ''));
                                        next[f] = iso || '';
                                        try { next['date_birth_of_debtor_in_word'] = getIndonesianDateInWords(iso || raw); } catch (er) { next['date_birth_of_debtor_in_word'] = ''; }
                                      } else {
                                          // normalize rate inputs: display uses comma, but store with dot
                                          if (rateFields && rateFields.includes(f)) {
                                            next[f] = String(raw || '').replace(',', '.');
                                          } else {
                                            next[f] = raw;
                                          }
                                          if (numericToWord[f]) {
                                            try {
                                              const valForWords = (rateFields && rateFields.includes(f)) ? next[f] : next[f];
                                              const s = (valForWords === undefined || valForWords === null || valForWords === '') ? '' : String(valForWords);
                                              const parsed = Number(s.replace(/\./g, '').replace(/,/g, '.'));
                                              const n = Number.isNaN(parsed) ? 0 : parsed;
                                              next[numericToWord[f]] = (n === 0) ? '' : getIndonesianNumberWord(n);
                                            } catch (er) { next[numericToWord[f]] = ''; }
                                          }
                                          try {
                                            const parseNum = (v) => { if (v === undefined || v === null || v === '') return 0; const s = String(v).replace(/\./g, '').replace(/,/g, '').trim(); const n = Number(s); return Number.isNaN(n) ? 0 : n; };
                                            const a = parseNum(next.admin_fee);
                                            const b = parseNum(next.handling_fee);
                                            const c = parseNum(next.tlo);
                                            const d = parseNum(next.life_insurance);
                                            const total = a + b + c + d;
                                            next.total_amount = total === 0 ? '' : String(total);
                                          } catch (er) { /* ignore */ }
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
                                  disabled={isReadOnlyWord || f === 'total_amount'}
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
                      <button className="btn-save" onClick={saveContractOnly} disabled={savingModal || !isContractFormValid()}>{savingModal ? 'Saving...' : 'Save Contract'}</button>
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
                        setSuccessMessage('Contract data saved successfully');
                        setTimeout(() => setSuccessMessage(''), 4000);
                      }}
                      onSaved={(cn) => { setShowCreateModal(false); setContractOnlyMode(false); loadAgreements(); if (cn) setContractNumber(cn); }}
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
