import React, { useState, useEffect, useCallback, useRef } from 'react';
import useT from '../../hooks/useT';
import { requestWithAuth } from '../../utils/api';
import { formatFieldName, getIndonesianNumberWord, getIndonesianDateInWords, parseDateFromDisplay, formatNumberWithDots } from '../../utils/formatting';

// Lightweight table-only UVAgreement view with dynamic column mapping
export default function UVAgreement({ columns = null, pageSizeDefault = 10 } = {}) {
  const t = useT();
  const [agreements, setAgreements] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [pageSize, setPageSize] = useState(pageSizeDefault);
  const [page, setPage] = useState(1);

  // Modal state for standalone modal implementation
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [contractOnlyMode, setContractOnlyMode] = useState(false);
  const [, setCollateralMode] = useState(false);

  // Contract form state (fields ordered to match UVAgreement_exp.js)
  const [contractFormData, setContractFormData] = useState({});
  const [contractFormErrors, setContractFormErrors] = useState({});
  const [savingModal, setSavingModal] = useState(false);
  const [modalError, setModalError] = useState('');
  const contractFetchTimer = useRef(null);

  const defaultColumns = ['agreement_date', 'contract_number', 'name_of_debtor', 'nik_number_of_debtor', 'vehicle_type', 'created_by'];
  const cols = Array.isArray(columns) && columns.length ? columns : defaultColumns;

  const loadAgreements = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await requestWithAuth({ method: 'get', url: '/api/uv-agreement/' });
      let items = res.data?.agreements || res.data?.results || res.data || [];
      if (!Array.isArray(items)) items = items ? [items] : [];
      const rows = items.map(item => {
        const vehicleVal = item.vehicle_type || item.collateral_type || (item.collateral && (item.collateral.vehicle_type || item.collateral.vehicle_types || item.collateral.collateral_type)) || '';
        const normalized = {
          agreement_date: item.agreement_date || item.header?.agreement_date || item.created_at || item.created || item.date_created || '',
          contract_number: item.contract_number || (item.contract && item.contract.contract_number) || '',
          name_of_debtor: (item.debtor || item.contract || {}).name_of_debtor || item.name_of_debtor || item.debtor_name || '',
          nik_number_of_debtor: (item.debtor || item.contract || {}).nik_number_of_debtor || item.nik_number_of_debtor || item.debtor_nik || '',
          vehicle_type: vehicleVal,
          created_by: item.created_by || item.created_by_name || item.created_by_user || item.created_by_user_name || ''
        };
        return { raw: item, ...normalized };
      });
      setAgreements(rows);
    } catch (err) {
      console.warn('UVAgreement load failed', err);
      setError(t('load_failed') || 'Failed to load agreements');
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => { loadAgreements(); }, [loadAgreements]);

  const formatDateShort = (iso) => {
    if (!iso) return '';
    try { const d = new Date(iso); if (isNaN(d.getTime())) return iso; const dd = String(d.getDate()).padStart(2, '0'); const mm = String(d.getMonth() + 1).padStart(2, '0'); const yyyy = d.getFullYear(); return `${dd}-${mm}-${yyyy}`; } catch (e) { return iso; }
  };

  // Reuse modal field styling from UVAgreement_exp.js for visual parity
  const fieldLabelStyle = { fontSize: 13, fontWeight: 600, color: '#333', marginBottom: 6 };
  const fieldInputStyle = { padding: '10px 12px', fontSize: 14, border: '1px solid #ddd', borderRadius: 6, outline: 'none', width: '100%', boxSizing: 'border-box' };
  const fieldGroupStyle = { display: 'flex', flexDirection: 'column' };

  // Helpers copied/adapted from UVAgreement_exp.js
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
  // Debounced autofill by contract number (populate modal fields)
  useEffect(() => {
    const cnRaw = String(contractFormData.contract_number || '').trim();
    if (contractFetchTimer.current) { clearTimeout(contractFetchTimer.current); contractFetchTimer.current = null; }
    if (!cnRaw) return undefined;
    contractFetchTimer.current = setTimeout(async () => {
      try {
        const data = await fetchContractLookup(cnRaw);
        const c = data.contract || data || {};
        // Flatten contract + debtor + bm_data + branch_data into form fields so modal receives all available data
        const mapped = { ...(c || {}) };
        if (c && typeof c.debtor === 'object') Object.assign(mapped, c.debtor);
        if (c && typeof c.bm_data === 'object') Object.assign(mapped, c.bm_data);
        if (c && typeof c.branch_data === 'object') Object.assign(mapped, c.branch_data);
        if (c && typeof c.contract === 'object') Object.assign(mapped, c.contract);
        // Remove internal ids if present
        try { delete mapped.id; delete mapped.pk; } catch (e) {}
        if (Object.keys(mapped).length) setContractFormData(prev => computeContractWordFields({ ...prev, ...mapped }));
      } catch (e) { console.error('contract-number lookup failed', e); }
    }, 500);
    return () => { if (contractFetchTimer.current) { clearTimeout(contractFetchTimer.current); contractFetchTimer.current = null; } };
  }, [contractFormData.contract_number]);

  const normalizeNumericInput = (input) => {
    if (input === null || input === undefined) return '';
    let s = String(input).trim();
    if (s === '') return '';
    s = s.replace(/[^0-9.,\-\s]/g, '').trim();
    s = s.replace(/\s+/g, '');
    const hasDot = s.indexOf('.') >= 0;
    const hasComma = s.indexOf(',') >= 0;
    if (hasDot && hasComma) {
      const lastDot = s.lastIndexOf('.');
      const lastComma = s.lastIndexOf(',');
      if (lastDot > lastComma) {
        s = s.replace(/,/g, '');
        const parts = s.split('.');
        if (parts.length > 2) { const dec = parts.pop(); s = parts.join('') + '.' + dec; }
      } else {
        s = s.replace(/\./g, '');
        const parts = s.split(','); if (parts.length > 2) { const dec = parts.pop(); s = parts.join('') + ',' + dec; }
        s = s.replace(/,/g, '.');
      }
    } else if (hasComma && !hasDot) {
      const parts = s.split(','); const last = parts[parts.length - 1];
      if (last.length === 2) { const dec = parts.pop(); s = parts.join('') + '.' + dec; } else { s = s.replace(/,/g, ''); }
    } else if (hasDot && !hasComma) {
      const parts = s.split('.'); const last = parts[parts.length - 1];
      if (last.length === 2) { const dec = parts.pop(); s = parts.join('') + '.' + dec; } else if (parts.length > 1) { s = s.replace(/\./g, ''); }
    }
    s = s.replace(/^(-?)0+(?=\d)/, '$1');
    return s;
  };

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
              out[f] = out[f] || '';
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
              } catch (e) { out[f] = out[f] || ''; }
            }
          }
        }
      });
      return out;
    } catch (e) { return data; }
  }

  // Determine required contract fields (match UVAgreement_exp.js behavior)
  const getRequiredContractFields = () => {
    const contractTableFields = ['contract_number','nik_number_of_debtor','name_of_debtor','place_birth_of_debtor','date_birth_of_debtor','date_birth_of_debtor_in_word','business_partners_relationship','business_type','street_of_debtor','subdistrict_of_debtor','district_of_debtor','city_of_debtor','province_of_debtor','phone_number_of_debtor','bank_account_number','name_of_bank','name_of_account_holder','virtual_account_number','topup_contract','previous_topup_amount','loan_amount','loan_amount_in_word','flat_rate','flat_rate_by_word','term','term_by_word','admin_fee','admin_fee_in_word','notaris_fee','notaris_fee_in_word','admin_rate','admin_rate_in_word','tlo','tlo_in_word','life_insurance','life_insurance_in_word','stamp_amount','financing_agreement_amount','security_agreement_amount','upgrading_land_rights_amount','total_amount','net_amount','net_amount_in_word'];
    const hiddenForUVLocal = new Set(['mortgage_amount', 'mortgage_amount_in_word', 'stamp_amount', 'financing_agreement_amount', 'security_agreement_amount', 'upgrading_land_rights_amount']);
    let fields = contractTableFields.filter(f => !hiddenForUVLocal.has(f));
    // exclude the two optional fields
    fields = fields.filter(f => f !== 'virtual_account_number' && f !== 'topup_contract');
    // exclude read-only word fields
    fields = fields.filter(f => !(/(_in_word|_by_word)$/.test(f)));
    // Do not treat previous_topup_amount and admin_rate as required
    fields = fields.filter(f => f !== 'previous_topup_amount' && f !== 'admin_rate');
    return fields;
  };

  // Auto-fill *_in_word and *_by_word fields when base numeric/date fields change
  useEffect(() => {
    try {
      const updates = {};
      const numericToWord = { loan_amount: 'loan_amount_in_word', term: 'term_by_word', flat_rate: 'flat_rate_by_word', notaris_fee: 'notaris_fee_in_word', admin_fee: 'admin_fee_in_word', net_amount: 'net_amount_in_word', admin_rate: 'admin_rate_in_word', tlo: 'tlo_in_word', life_insurance: 'life_insurance_in_word' };
      Object.keys(contractFormData || {}).forEach((k) => {
        if (!k) return;
        if (/_in_word$|_by_word$/.test(k)) return; // skip derived keys
        const baseVal = contractFormData[k];
        if (baseVal === undefined || baseVal === null || String(baseVal).trim() === '') return;
        const inWordKey = `${k}_in_word`;
        // If there is a specific mapping for this numeric field, use it
        const mappedKey = numericToWord[k];
        if (/date|birth/i.test(k)) {
          const words = getIndonesianDateInWords(baseVal) || '';
          const wordsU = (typeof words === 'string') ? words.toUpperCase() : words;
          if (contractFormData[inWordKey] !== wordsU) updates[inWordKey] = wordsU;
        } else {
          // numeric -> word
          const n = Number(String(baseVal).replace(/\./g, '').replace(/,/g, '.')) || 0;
          const words = (n === 0) ? '' : (getIndonesianNumberWord(String(baseVal)) || '');
          const wordsU = (typeof words === 'string') ? words.toUpperCase() : words;
          if (contractFormData[inWordKey] !== wordsU) updates[inWordKey] = wordsU;
          if (mappedKey) {
            if (contractFormData[mappedKey] !== wordsU) updates[mappedKey] = wordsU;
          } else {
            const byWordKey = `${k}_by_word`;
            if (contractFormData[byWordKey] !== wordsU) updates[byWordKey] = wordsU;
          }
        }
      });
      if (Object.keys(updates).length) setContractFormData(prev => ({ ...prev, ...updates }));
    } catch (e) { /* non-fatal */ }
  }, [contractFormData]);

  const visible = (() => {
    const q = (searchQuery || '').toString().trim().toLowerCase();
    if (!q) return agreements || [];
    return (agreements || []).filter((r) => {
      const hay = `${r.contract_number || ''} ${r.name_of_debtor || ''} ${r.nik_number_of_debtor || ''}`.toLowerCase();
      return hay.includes(q);
    });
  })();

  const totalCount = (visible || []).length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const paged = visible.slice((page - 1) * pageSize, (page - 1) * pageSize + pageSize);

  // Header button handlers (modal wiring deferred)
  const openAddContract = () => { setContractOnlyMode(true); setCollateralMode(false); setShowCreateModal(true); setContractFormData({}); setContractFormErrors({}); setModalError(''); };
  const openAddCollateral = () => { setContractOnlyMode(false); setCollateralMode(true); setShowCreateModal(true); };
  const openCreateDocument = () => { setContractOnlyMode(false); setCollateralMode(false); setShowCreateModal(true); };

  return (
    <div>
      <div className="content-section">
        <h2>{t('uv_agreement') || 'UV Agreement'}</h2>
        <p>{t('before_create_doc_note') || 'Before creating the document, make sure to fill in the contract and collateral data first.'}</p>

        {/* Header controls: search left, buttons right (match UVAgreement_exp.js) */}
        <div className="user-management-actions" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="text"
              placeholder={t('search_agreements_placeholder') || 'Search agreements...'}
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
              aria-label="Search agreements"
              style={{ padding: '8px 10px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px', width: '260px' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button className="btn-primary" onClick={openAddContract} title="Add a new contract">{t('add_contract') || 'Add Contract'}</button>
            <button className="btn-primary" onClick={openAddCollateral} title="Add a new collateral">{t('add_collateral') || 'Add Collateral'}</button>
            <button className="btn-save" onClick={openCreateDocument}>{t('create_document') || 'Create Document'}</button>
          </div>
        </div>

        <div className="user-table-section">
          {loading ? (
            <div>Loading...</div>
          ) : error ? (
            <div className="error-message">{error}</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="user-table agreements-table">
                <thead>
                  <tr>
                    {cols.map(c => (<th key={c}>{formatFieldName(c) || c}</th>))}
                    <th>{t('actions') || 'Actions'}</th>
                  </tr>
                </thead>
                <tbody>
                  {paged.length === 0 ? (
                    <tr><td className="no-data" colSpan={cols.length + 1}>{t('no_agreements') || 'No agreements'}</td></tr>
                  ) : (
                    paged.map((row, idx) => (
                      <tr key={row.contract_number || idx}>
                        {cols.map((c) => {
                          let v = row[c];
                          if (v === undefined) v = row.raw?.[c] ?? '';
                          if (c === 'agreement_date') v = formatDateShort(v);
                          return (<td key={c}>{v ?? ''}</td>);
                        })}
                        <td>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button className="action-btn compact-action-btn" title={t('view') || 'View'} onClick={() => { console.log('view', row.contract_number); }}>{t('view') || 'View'}</button>
                            <button className="action-btn compact-action-btn" title={t('edit') || 'Edit'} onClick={() => { console.log('edit', row.contract_number); }}>{t('edit') || 'Edit'}</button>
                            <button className="action-btn compact-action-btn" title={t('delete') || 'Delete'} onClick={() => { console.log('delete', row.contract_number); }}>{t('delete') || 'Delete'}</button>
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

      {/* Modal implementation deferred. showCreateModal flags available for later wiring. */}
      {/* Inline Add-Contract modal (standalone, field order matches UVAgreement_exp.js) */}
      {showCreateModal && contractOnlyMode && (
        <div className="modal-overlay" onClick={() => { setShowCreateModal(false); setContractOnlyMode(false); }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{t('add_contract') || 'Add Contract'}</h3>
              <button className="modal-close-btn" onClick={() => { setShowCreateModal(false); setContractOnlyMode(false); }}>&times;</button>
            </div>
            <div style={{ padding: 20, minWidth: 560 }}>
              {modalError && <div style={{ marginBottom: 12, color: '#a33' }}>{modalError}</div>}

              {/* Contract fields in same order as UVAgreement_exp.js */}
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
                    {contractTableFields.map((f) => {
                      const isReadOnlyWord = /(_in_word|_by_word)$/.test(f);
                      return (
                        <div key={f} style={fieldGroupStyle}>
                          <label style={fieldLabelStyle}>{formatFieldName(f) || f}{getRequiredContractFields().includes(f) && <span style={{ color: '#a33', marginLeft: 6 }}>*</span>}</label>
                          <input
                            type={f === 'date_birth_of_debtor' ? 'date' : 'text'}
                            value={(function(){ try { const isNumericLocal = numericInputs.has(f); if (isNumericLocal) return formatNumberWithDots(contractFormData[f] || ''); return contractFormData[f] || ''; } catch(e){ return contractFormData[f] || ''; } })()}
                            onChange={(e) => {
                              const inputVal = e.target.value;
                              const isNumeric = numericInputs.has(f);
                              const cleanedBase = (function(v) { if (v === undefined || v === null) return ''; const s = String(v); if (isNumeric) return normalizeNumericInput(s); return s; })(inputVal);
                              const valToSet = (f === 'contract_number' || f === 'topup_contract') ? String(cleanedBase).slice(0,12) : cleanedBase;
                              setContractFormData(prev => computeContractWordFields({ ...prev, [f]: valToSet }));
                              setContractFormErrors(prev => { if (!prev[f]) return prev; const np = { ...prev }; delete np[f]; return np; });

                              // Autofill when NIK is entered (16 digits)
                              if (f === 'nik_number_of_debtor' && contractOnlyMode) {
                                try {
                                  const rawNik = String(cleanedBase || '').replace(/\D/g, '').slice(0,16);
                                  if (rawNik && rawNik.length === 16) {
                                    (async () => {
                                      try {
                                        // Search cached agreements first
                                        let found = (agreements || []).find(c => {
                                          const cand = ((c.raw && (c.raw.debtor && (c.raw.debtor.nik_number_of_debtor || c.raw.debtor.nik)) ) || c.nik_number_of_debtor || c.raw?.debtor_nik || '').toString().replace(/\D/g, '');
                                          return cand && cand === rawNik;
                                        });
                                        if (found && (found.contract_number || found.raw)) {
                                          const cn = found.contract_number || (found.raw && (found.raw.contract && (found.raw.contract.contract_number || found.raw.contract_number))) || '';
                                          if (cn) {
                                            const data = await fetchContractLookup(cn);
                                            const c = data.contract || data || {};
                                            // merge full contract and nested debtor/infos into modal form
                                            const mapped = { ...(c || {}) };
                                            if (c && typeof c.debtor === 'object') Object.assign(mapped, c.debtor);
                                            if (c && typeof c.bm_data === 'object') Object.assign(mapped, c.bm_data);
                                            if (c && typeof c.branch_data === 'object') Object.assign(mapped, c.branch_data);
                                            try { delete mapped.id; delete mapped.pk; } catch (e) {}
                                            if (Object.keys(mapped).length) setContractFormData(prev => computeContractWordFields({ ...prev, ...mapped }));
                                          }
                                          return;
                                        }
                                        // fallback: try contracts table lookup
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
                                              const mapped2 = { ...(c2 || {}) };
                                              if (c2 && typeof c2.debtor === 'object') Object.assign(mapped2, c2.debtor);
                                              if (c2 && typeof c2.bm_data === 'object') Object.assign(mapped2, c2.bm_data);
                                              if (c2 && typeof c2.branch_data === 'object') Object.assign(mapped2, c2.branch_data);
                                              try { delete mapped2.id; delete mapped2.pk; } catch (e) {}
                                              if (Object.keys(mapped2).length) setContractFormData(prev => computeContractWordFields({ ...prev, ...mapped2 }));
                                            }
                                          }
                                        } catch (er) { /* ignore fallback errors */ }
                                      } catch (er) { console.error('NIK-based modal lookup failed', er); }
                                    })();
                                  }
                                } catch (er) { /* ignore */ }
                              }
                            }}
                            disabled={isReadOnlyWord || f === 'total_amount' || f === 'net_amount'}
                            style={fieldInputStyle}
                          />
                          {contractFormErrors[f] && <div style={{ color: '#a33', fontSize: 12, marginTop: 6 }}>{contractFormErrors[f]}</div>}
                        </div>
                      );
                    })}
                  </div>
                );
              })()}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
                <button className="btn-save" onClick={async () => {
                  // minimal validation
                  setModalError('');
                  const cn = String(contractFormData.contract_number || '').trim();
                  const name = String(contractFormData.name_of_debtor || '').trim();
                  if (!cn || !name) { setModalError('Contract number and debtor name are required'); return; }
                  setSavingModal(true);
                  try {
                    const postData = { contract_number: cn, contract: { ...contractFormData } };
                    try { postData.skip_normalization = true; } catch (e) {}
                    // uppercase strings recursively
                    const uppercaseStringsRecursive = (o) => {
                      if (o === null || o === undefined) return o;
                      if (Array.isArray(o)) return o.map(uppercaseStringsRecursive);
                      if (typeof o === 'object') {
                        const r = {};
                        Object.keys(o).forEach(k => { r[k] = uppercaseStringsRecursive(o[k]); });
                        return r;
                      }
                      if (typeof o === 'string') return o.toUpperCase();
                      return o;
                    };
                    try { uppercaseStringsRecursive(postData); } catch (e) {}
                    await requestWithAuth({ method: 'post', url: '/api/uv-agreement/', data: postData });
                    setShowCreateModal(false); setContractOnlyMode(false);
                    await loadAgreements();
                  } catch (err) {
                    console.error('Save contract failed', err);
                    setModalError(err?.response?.data?.error || 'Failed to save contract');
                  } finally { setSavingModal(false); }
                }} disabled={savingModal}>{savingModal ? t('saving') || 'Saving' : t('save') || 'Save'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
