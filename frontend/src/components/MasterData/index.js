import React, { useState, useEffect } from 'react';
import { requestWithAuth } from '../../utils/api';
import { toast } from 'react-toastify';
import '../UserManagement/UserManagement.css';
import useT from '../../hooks/useT';
import { formatNumberWithDots } from '../../utils/formatting';

const tabs = ['Regional','Areas','Branches','Director','Branch Manager'];

export default function MasterData() {
  const t = useT();
  // Determine if current user has audit role (used to disable CRUD UI)
  const isAudit = (() => {
    try {
      const raw = localStorage.getItem('user_data');
      if (!raw) return false;
      const ud = JSON.parse(raw);
      const roleLower = (ud.role || ud.role_name || '').toString().toLowerCase();
      return roleLower.includes('audit');
    } catch (e) { return false; }
  })();
  const [active, setActive] = useState(tabs[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState([]);
  const [columnsMeta, setColumnsMeta] = useState(null);
  const [search, setSearch] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);

  // Branches CRUD state
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // create | edit
  const [branchForm, setBranchForm] = useState({ branch_name: '', area_id: '', bm_id: '', name: '', code: '', phone_number_branch: '', street_name: '', subdistrict: '', district: '', city: '', province: '' });
  const [editingId, setEditingId] = useState(null);
  // (no confirmation modal) 
  // Regions CRUD state
  const [showRegionModal, setShowRegionModal] = useState(false);
  const [regionModalMode, setRegionModalMode] = useState('create');
  const [regionForm, setRegionForm] = useState({ name: '', code: '' });
  const [regionEditingId, setRegionEditingId] = useState(null);
  const [regionsList, setRegionsList] = useState([]);
  const [areasList, setAreasList] = useState([]);
  const [bmsList, setBmsList] = useState([]);
  const [branchesList, setBranchesList] = useState([]);
  // Branch Manager CRUD state
  const [showBMModal, setShowBMModal] = useState(false);
  const [bmModalMode, setBmModalMode] = useState('create');
  const [bmForm, setBmForm] = useState({ bm_id: '', branches_id: '', name_of_bm: '', place_birth_of_bm: '', date_birth_of_bm: '', nik_number_of_bm: '', street_name_of_bm: '', subdistrict_of_bm: '', district_of_bm: '', city_of_bm: '', province_of_bm: '' });
  const [bmEditingId, setBmEditingId] = useState(null);
  // Areas CRUD state
  const [showAreaModal, setShowAreaModal] = useState(false);
  const [areaModalMode, setAreaModalMode] = useState('create');
  const [areaForm, setAreaForm] = useState({ region_id: '', name: '', code: '' });
  const [areaEditingId, setAreaEditingId] = useState(null);
  // Director CRUD state
  const [showDirectorModal, setShowDirectorModal] = useState(false);
  const [directorModalMode, setDirectorModalMode] = useState('create');
  const [directorForm, setDirectorForm] = useState({ name_of_director: '', phone_number_of_lolc: '' });
  const [directorEditingId, setDirectorEditingId] = useState(null);
  // Contract CRUD state
  const [showContractModal, setShowContractModal] = useState(false);
  const [contractModalMode, setContractModalMode] = useState('create');
  // contractForm is now dynamic: keys come from backend columns or from the row data
  const [contractForm, setContractForm] = useState({});
  const [contractEditingId, setContractEditingId] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true); setError(''); setData([]);
      try {
        let url = '';
        switch (active) {
          case 'Regional': url = '/api/master-data/regions/'; break;
          case 'Areas': url = '/api/master-data/areas/'; break;
          case 'Branches': url = '/api/master-data/branches/'; break;
          case 'Director': url = '/api/directors/'; break;
          case 'Branch Manager': url = '/api/branch-manager/'; break;
          case 'Contract': url = '/api/contracts/table/'; break;
          default: url = ''; break;
        }
        if (!url) { setData([]); return; }
        const res = await requestWithAuth({ method: 'get', url });
        let items = res.data?.regions || res.data?.areas || res.data?.branches || res.data?.directors || res.data?.bm || res.data?.contracts || res.data?.collateral || res.data?.results || res.data?.agreements || res.data || [];
        // If viewing Areas, also fetch regions to show region name instead of numeric id
        if (active === 'Areas' && Array.isArray(items)) {
          try {
            const regRes = await requestWithAuth({ method: 'get', url: '/api/master-data/regions/' });
            const regs = regRes.data?.regions || regRes.data || [];
            setRegionsList(Array.isArray(regs) ? regs : []);
            const regMap = {};
            Array.isArray(regs) && regs.forEach(r => { regMap[String(r.id)] = r.name || r.region_name || r.name_of_region || r.code || r.id; });
            items = items.map(a => ({ ...(a || {}), region_name: regMap[String(a.region_id ?? a.region ?? '')] ?? a.region_name ?? String(a.region_id ?? a.region ?? '') }));
          } catch (e) {
            // ignore region fetch error; fall back to numeric id
            console.error('Failed to load regions for areas view', e);
          }
        }

        // If viewing Branches, fetch areas and branch managers to show names instead of numeric ids
        if (active === 'Branches' && Array.isArray(items)) {
          try {
            const [areasRes, bmsRes] = await Promise.all([
              requestWithAuth({ method: 'get', url: '/api/master-data/areas/' }),
              requestWithAuth({ method: 'get', url: '/api/branch-manager/' })
            ]);
            const areas = areasRes.data?.areas || areasRes.data || [];
            const bms = bmsRes.data?.bm || bmsRes.data || [];
            // store for modal dropdowns
            setAreasList(Array.isArray(areas) ? areas : []);
            setBmsList(Array.isArray(bms) ? bms : []);
            const areaMap = {};
            Array.isArray(areas) && areas.forEach(a => { areaMap[String(a.id)] = a.name || a.name_of_area || a.area_name || a.code || a.id; });
            const bmMap = {};
            Array.isArray(bms) && bms.forEach(b => { bmMap[String(b.bm_id ?? b.id ?? '')] = b.name_of_bm || b.name || b.bm_name || b.id; });
            items = items.map(row => ({ ...(row || {}), area_name: areaMap[String(row.area_id ?? '')] ?? row.area_name ?? String(row.area_id ?? ''), bm_name: bmMap[String(row.bm_id ?? row.bmId ?? '')] ?? row.name_of_bm ?? row.bm_name ?? String(row.bm_id ?? '') }));
          } catch (e) {
            console.error('Failed to load areas/bms for branches view', e);
          }
        }

        // If viewing Branch Manager, fetch branches to show branch name instead of numeric id
        if (active === 'Branch Manager' && Array.isArray(items)) {
          try {
            const branchesRes = await requestWithAuth({ method: 'get', url: '/api/master-data/branches/' });
            const branches = branchesRes.data?.branches || branchesRes.data || [];
            setBranchesList(Array.isArray(branches) ? branches : []);
            const branchMap = {};
            Array.isArray(branches) && branches.forEach(b => { branchMap[String(b.id ?? b.branch_id ?? '')] = b.branch_name || b.name || b.branch_name || b.name || b.id; });
            items = items.map(row => ({ ...(row || {}), branch_name: branchMap[String(row.branches_id ?? row.branch_id ?? '')] ?? row.branch_name ?? String(row.branches_id ?? row.branch_id ?? '') }));
          } catch (e) {
            console.error('Failed to load branches for branch-manager view', e);
          }
        }
        // capture backend-provided columns metadata when available
        const cols = res.data?.columns || null;
        // if backend did not provide columns, infer from first row of items
        let inferredCols = Array.isArray(cols) ? cols : null;
        if (!inferredCols && Array.isArray(items) && items.length) {
          const first = items[0];
          if (first && typeof first === 'object') {
            inferredCols = Object.keys(first);
          }
        }
        if (!cancelled) {
          setColumnsMeta(Array.isArray(inferredCols) ? inferredCols : null);
          setData(Array.isArray(items) ? items : (items ? [items] : []));
        }
      } catch (err) {
        console.error('MasterData load error', err);
        if (!cancelled) setError(t('failed_load'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [active, t]);

  const tabBtnStyle = (t) => ({
    padding: '8px 12px',
    marginRight: 8,
    borderRadius: 6,
    border: active === t ? '2px solid #0a1e3d' : '1px solid #ddd',
    background: 'transparent',
    cursor: 'pointer'
  });

  const tabLabel = (x) => {
    if (x === 'Regional') return t('tab_regional');
    if (x === 'Areas') return t('tab_areas');
    if (x === 'Branches') return t('tab_branches');
    if (x === 'Director') return t('tab_director');
    if (x === 'Branch Manager') return t('tab_branch_manager');
    if (x === 'Contract') return t('tab_contract');
    return x;
  };

  const renderTable = () => {
    if (loading) return <div>{t('loading')}</div>;
    if (error) return <div style={{ color: '#a33' }}>{error}</div>;

    // Special case: Contract tab may return an array of contract-number strings.
    const isContractStringList = active === 'Contract' && Array.isArray(data) && data.length > 0 && typeof data[0] === 'string';
    if (isContractStringList) {
      // Normalize string list into rows with requested columns.
      const rows = data.map((c, i) => ({
        contract_id: '',
        contract_number: String(c),
        name_of_debtor: '',
        nik_number_of_debtor: '',
        loan_amount: ''
      }));

      return (
        <div className="user-table-section">
          <table className="user-table" style={{ background: '#fff' }}>
            <thead>
              <tr>
                <th>{'contract_id'.replace(/_/g, ' ').replace(/\b\w/g, ch => ch.toUpperCase())}</th>
                <th>{'contract_number'.replace(/_/g, ' ').replace(/\b\w/g, ch => ch.toUpperCase())}</th>
                <th>{'name_of_debtor'.replace(/_/g, ' ').replace(/\b\w/g, ch => ch.toUpperCase())}</th>
                <th>{'nik_number_of_debtor'.replace(/_/g, ' ').replace(/\b\w/g, ch => ch.toUpperCase())}</th>
                <th>{'loan_amount'.replace(/_/g, ' ').replace(/\b\w/g, ch => ch.toUpperCase())}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i}>
                  <td>{r.contract_id}</td>
                  <td>{r.contract_number}</td>
                  <td>{r.name_of_debtor}</td>
                  <td>{r.nik_number_of_debtor}</td>
                  <td>{r.loan_amount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    // If there's no data rows, continue to render the table headers (useful for collateral tabs)
    // and let pagination/filtered logic render an empty body. Do not early-return here.

    // Choose columns based on active tab
    let cols = [];
    switch (active) {
      case 'Regional': cols = ['id','name','code']; break;
      case 'Areas': cols = ['id','region_id','name','code']; break;
      case 'Branches': cols = ['id', 'area_id','name','code','phone_number_branch']; break;
      case 'Director': cols = ['director_id','name_of_director','phone_number_of_lolc']; break;
      case 'Branch Manager': cols = ['bm_id','name_of_bm','nik_number_of_bm','branches_id']; break;
      case 'Contract': cols = ['contract_id','contract_number','name_of_debtor','nik_number_of_debtor','loan_amount']; break;
      
      default: cols = Object.keys(data[0] || {}).slice(0,5); break;
    }

    // Dynamic adjustments: if contracts endpoint returns array of strings, show single column
    if (active === 'Contract' && data && data.length && typeof data[0] === 'string') {
      cols = ['contract_number'];
    }
    
    // sort data by id (or fallback to first column) before applying search + pagination
    const sortKey = (Array.isArray(data) && data.length)
      ? (data.some(r => Object.prototype.hasOwnProperty.call(r, 'id')) ? 'id' : (cols[0] || Object.keys(data[0] || {})[0] || null))
      : null;

    const sortedData = (sortKey)
      ? [...data].slice().sort((a, b) => {
          const va = a?.[sortKey];
          const vb = b?.[sortKey];
          if (va == null && vb == null) return 0;
          if (va == null) return 1;
          if (vb == null) return -1;
          const na = Number(va);
          const nb = Number(vb);
          if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;
          return String(va).localeCompare(String(vb));
        })
      : Array.isArray(data) ? [...data] : [];

    // apply search + pagination
    const q = (search || '').toString().trim().toLowerCase();
    const filtered = (!q) ? sortedData : sortedData.filter(r => {
      return String(r.branch_name || r.name || r.region_name || r.contract_number || r.city || r.branch_code || r.code || r.name_of_bm || r.nik_number_of_bm || r.phone_number_of_bm || r.phone_number_branch || '').toLowerCase().includes(q);
    });
    const total = filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const current = Math.min(page, totalPages);
    const start = (current - 1) * pageSize;
    const paged = filtered.slice(start, start + pageSize);

    const getCellValue = (row, c) => {
      if (c === 'region_id') return row.region_name ?? row.region ?? row.region_id ?? '';
      if (c === 'area_id') return row.area_name ?? row.area ?? row.area_id ?? '';
      if (c === 'bm_id') return (row && typeof row === 'object') ? (row.bm_id ?? row.bmId ?? '') : '';
      if (c === 'branches_id') return row.branch_name ?? row.branches_name ?? row.branches_id ?? row.branch_id ?? '';
      if (c === 'code') return row.code ?? row.area_code ?? row.region_code ?? row.branch_code ?? '';
      // format monetary/amount fields with dot as thousands separator
      if (c === 'total_amount' || c === 'loan_amount') {
        const raw = (row && typeof row === 'object') ? (row[c] ?? '') : (typeof row === 'string' ? row : '');
        if (raw === null || raw === '') return '';
        const cleaned = String(raw).replace(/\./g, '').replace(/,/g, '');
        const n = Number(cleaned);
        if (Number.isNaN(n)) return String(raw);
        return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
      }
      if (active === 'Director') {
        if (c === 'director_id') return (row && typeof row === 'object') ? (row.director_id ?? row.id ?? '') : '';
        if (c === 'name_of_director') return (row && typeof row === 'object') ? (row.name_of_director ?? row.name ?? '') : (typeof row === 'string' ? row : '');
        if (c === 'phone_number_of_lolc') return (row && typeof row === 'object') ? (row.phone_number_of_lolc ?? row.phone_number_lolc ?? row.phone ?? '') : '';
      }
      return (row && typeof row === 'object') ? (row[c] ?? '') : (typeof row === 'string' ? row : '');
    };

    return (
      <div className="user-table-section">
        {(active === 'Branches' || active === 'Regional' || active === 'Areas' || active === 'Director' || active === 'Contract' || active === 'Branch Manager') && (
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, background: 'inherit', padding: 8, borderRadius: 6 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input placeholder={t('search_masterdata_placeholder')} value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} style={{ padding: '6px 8px', border: '1px solid #ddd', borderRadius: 6, background: 'inherit' }} />
            </div>
            <div>
                {active === 'Branches' && (
                  <button className="btn-primary" onClick={() => { setModalMode('create'); setEditingId(null); setBranchForm({ branch_name: '', area_id: '', bm_id: '', name: '', code: '', phone_number_branch: '', street_name: '', subdistrict: '', district: '', city: '', province: '' }); setShowModal(true); }} disabled={isAudit} style={{ opacity: isAudit ? 0.5 : 1, cursor: isAudit ? 'not-allowed' : 'pointer' }}>{t('add_branch')}</button>
              )}
              {active === 'Regional' && (
                  <button className="btn-primary" onClick={() => { setRegionModalMode('create'); setRegionEditingId(null); setRegionForm({ name: '', code: '' }); setShowRegionModal(true); }} disabled={isAudit} style={{ opacity: isAudit ? 0.5 : 1, cursor: isAudit ? 'not-allowed' : 'pointer' }}>{t('add_region')}</button>
              )}
              {active === 'Areas' && (
                  <button className="btn-primary" onClick={() => { setAreaModalMode('create'); setAreaEditingId(null); setAreaForm({ region_id: '', name: '', code: '' }); setShowAreaModal(true); }} disabled={isAudit} style={{ opacity: isAudit ? 0.5 : 1, cursor: isAudit ? 'not-allowed' : 'pointer' }}>{t('add_area')}</button>
              )}
              {active === 'Director' && (
                  <button className="btn-primary" onClick={() => { setDirectorModalMode('create'); setDirectorEditingId(null); setDirectorForm({ name_of_director: '', phone_number_of_lolc: '' }); setShowDirectorModal(true); }} disabled={isAudit} style={{ opacity: isAudit ? 0.5 : 1, cursor: isAudit ? 'not-allowed' : 'pointer' }}>{t('add_director')}</button>
              )}
              {active === 'Contract' && (
                  <button className="btn-primary" onClick={() => { setContractModalMode('create'); setContractEditingId(null); setContractForm(buildEmptyFromCols(Array.isArray(columnsMeta) ? columnsMeta : CONTRACT_FIELDS)); setShowContractModal(true); }} disabled={isAudit} style={{ opacity: isAudit ? 0.5 : 1, cursor: isAudit ? 'not-allowed' : 'pointer' }}>{t('add_contract')}</button>
              )}
                {active === 'Branch Manager' && (
                  <button className="btn-primary" onClick={() => { setBmModalMode('create'); setBmEditingId(null); setBmForm({ bm_id: '', branches_id: '', name_of_bm: '', place_birth_of_bm: '', date_birth_of_bm: '', nik_number_of_bm: '', street_name_of_bm: '', subdistrict_of_bm: '', district_of_bm: '', city_of_bm: '', province_of_bm: '' }); setShowBMModal(true); }} disabled={isAudit} style={{ opacity: isAudit ? 0.5 : 1, cursor: isAudit ? 'not-allowed' : 'pointer' }}>{t('add_branch_manager')}</button>
                )}
            </div>
          </div>
        )}

        <table className={`user-table ${(active === 'Branches' || active === 'Regional' || active === 'Areas' || active === 'Director' || active === 'Branch Manager' || active === 'Contract') ? 'branches-table' : ''}`} style={{ background: 'transparent' }}>
          <thead>
              <tr>
                {cols.map(c => {
                const pretty = (s) => String(s).replace(/_/g, ' ').replace(/\b\w/g, ch => ch.toUpperCase());
                const labelFor = (key) => {
                  // prefer explicit translations from Messages
                  try {
                    const translated = t(key);
                    if (translated && translated !== key) return translated;
                  } catch (e) { /* ignore */ }

                  if (key === 'id') return t('id_label');
                  if (key === 'region_name') return t('regional_name');
                  if (key === 'region_code') return t('regional_code');
                  if (key === 'branch_name') return t('branch_label') + ' ' + t('name');
                  if (key === 'phone_number_branch') return t('phone_number');
                  if (key === 'contract_number') return t('contract_number');
                  if (key === 'code') return t('code');
                  if (key === 'name') return (active === 'Regional') ? t('regional_name') : t('name');
                  return pretty(key);
                };
                return <th key={c}>{labelFor(c)}</th>;
              })}
              {(active === 'Branches' || active === 'Regional' || active === 'Areas' || active === 'Director' || active === 'Contract' || active === 'Branch Manager') && <th>{t('actions')}</th>}
            </tr>
          </thead>
          <tbody>
            {paged.map((row, i) => (
              <tr key={i}>
                {cols.map(c => <td key={c}>{String(getCellValue(row, c) ?? '')}</td>)}
                {(active === 'Branches' || active === 'Regional' || active === 'Areas' || active === 'Director' || active === 'Contract' || active === 'Branch Manager') && (
                  <td>
                    {active === 'Branches' && (
                      <>
                        <button
                          onClick={() => {
                            setModalMode('edit');
                            const id = row.id || row.branch_id || row.branchId || null;
                            setEditingId(id);
                            setBranchForm({
                              branch_name: row.branch_name || row.name || '',
                              area_id: row.area_id || '',
                              bm_id: row.bm_id || row.bmId || '',
                              name: row.name || row.branch_name || '',
                              code: row.code || row.branch_code || '',
                              phone_number_branch: row.phone_number_branch || row.phone || '',
                              // branch_code field removed (not present in DB)
                              street_name: row.street_name || '',
                              subdistrict: row.subdistrict || '',
                              district: row.district || '',
                              city: row.city || '',
                              province: row.province || ''
                            });
                            setShowModal(true);
                          }}
                          title={t('edit')}
                          aria-label={`${t('edit')} ${row.branch_name || ''}`}
                          className="action-btn branch-action-btn"
                          disabled={isAudit}
                          style={{ marginRight: 8, opacity: isAudit ? 0.5 : 1, cursor: isAudit ? 'not-allowed' : 'pointer' }}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z" fill="#0a1e3d" />
                            <path d="M20.71 7.04a1.003 1.003 0 0 0 0-1.42l-2.34-2.34a1.003 1.003 0 0 0-1.42 0l-1.83 1.83 3.75 3.75 1.84-1.82z" fill="#0a1e3d" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDeleteBranch(row)}
                          title={t('delete')}
                          aria-label={`${t('delete')} ${row.branch_name || ''}`}
                          className="action-btn branch-action-btn"
                          disabled={isAudit}
                          style={{ opacity: isAudit ? 0.5 : 1, cursor: isAudit ? 'not-allowed' : 'pointer' }}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M3 6h18" stroke="#000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" stroke="#000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M10 11v6M14 11v6" stroke="#000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" stroke="#000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </button>
                      </>
                    )}
                    {active === 'Regional' && (
                      <>
                        <button
                          onClick={() => {
                            setRegionModalMode('edit');
                            const id = row.id || row.region_id || null;
                            setRegionEditingId(id);
                            setRegionForm({ name: row.name || '', code: row.code || '' });
                            setShowRegionModal(true);
                          }}
                          title={t('edit')}
                          aria-label={`${t('edit')} ${row.name || ''}`}
                          className="action-btn branch-action-btn"
                          disabled={isAudit}
                          style={{ marginRight: 8, opacity: isAudit ? 0.5 : 1, cursor: isAudit ? 'not-allowed' : 'pointer' }}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z" fill="#0a1e3d" />
                            <path d="M20.71 7.04a1.003 1.003 0 0 0 0-1.42l-2.34-2.34a1.003 1.003 0 0 0-1.42 0l-1.83 1.83 3.75 3.75 1.84-1.82z" fill="#0a1e3d" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDeleteRegion(row)}
                          title={t('delete')}
                          aria-label={`${t('delete')} ${row.name || ''}`}
                          className="action-btn branch-action-btn"
                          disabled={isAudit}
                          style={{ opacity: isAudit ? 0.5 : 1, cursor: isAudit ? 'not-allowed' : 'pointer' }}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M3 6h18" stroke="#000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" stroke="#000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M10 11v6M14 11v6" stroke="#000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" stroke="#000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </button>
                      </>
                    )}
                    {active === 'Areas' && (
                      <>
                        <button
                          onClick={() => {
                            setAreaModalMode('edit');
                            const id = row.id || row.area_id || null;
                            setAreaEditingId(id);
                            setAreaForm({ region_id: row.region_id || '', name: row.name || '', code: row.code || '' });
                            setShowAreaModal(true);
                          }}
                          title={t('edit')}
                          aria-label={`${t('edit')} ${row.name || ''}`}
                          className="action-btn branch-action-btn"
                          disabled={isAudit}
                          style={{ marginRight: 8, opacity: isAudit ? 0.5 : 1, cursor: isAudit ? 'not-allowed' : 'pointer' }}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z" fill="#0a1e3d" />
                            <path d="M20.71 7.04a1.003 1.003 0 0 0 0-1.42l-2.34-2.34a1.003 1.003 0 0 0-1.42 0l-1.83 1.83 3.75 3.75 1.84-1.82z" fill="#0a1e3d" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDeleteArea(row)}
                          title={t('delete')}
                          aria-label={`${t('delete')} ${row.name || ''}`}
                          className="action-btn branch-action-btn"
                          disabled={isAudit}
                          style={{ opacity: isAudit ? 0.5 : 1, cursor: isAudit ? 'not-allowed' : 'pointer' }}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M3 6h18" stroke="#000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" stroke="#000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M10 11v6M14 11v6" stroke="#000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" stroke="#000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </button>
                      </>
                    )}
                    {active === 'Director' && (
                      <>
                        <button
                          onClick={() => {
                            setDirectorModalMode('edit');
                            const id = row.director_id || row.id || null;
                            setDirectorEditingId(id);
                            setDirectorForm({ name_of_director: row.name_of_director || row.name || '', phone_number_of_lolc: row.phone_number_of_lolc || row.phone || '' });
                            setShowDirectorModal(true);
                          }}
                          title={t('edit')}
                          aria-label={`${t('edit')} ${row.name_of_director || ''}`}
                          className="action-btn branch-action-btn"
                          disabled={isAudit}
                          style={{ marginRight: 8, opacity: isAudit ? 0.5 : 1, cursor: isAudit ? 'not-allowed' : 'pointer' }}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z" fill="#0a1e3d" />
                            <path d="M20.71 7.04a1.003 1.003 0 0 0 0-1.42l-2.34-2.34a1.003 1.003 0 0 0-1.42 0l-1.83 1.83 3.75 3.75 1.84-1.82z" fill="#0a1e3d" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDeleteDirector(row)}
                          title={t('delete')}
                          aria-label={`${t('delete')} ${row.name_of_director || ''}`}
                          className="action-btn branch-action-btn"
                          disabled={isAudit}
                          style={{ opacity: isAudit ? 0.5 : 1, cursor: isAudit ? 'not-allowed' : 'pointer' }}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M3 6h18" stroke="#000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" stroke="#000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M10 11v6M14 11v6" stroke="#000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" stroke="#000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </button>
                      </>
                    )}
                    {active === 'Contract' && (
                      <>
                        <button
                          onClick={() => {
                            const id = row.contract_id || row.id || row.contractId || null;
                            if (!id) return;
                            setContractModalMode('edit');
                            setContractEditingId(id);
                            // populate form using CONTRACT_FIELDS order, prefer row values, exclude internal DB columns
                            // build ordered list: CONTRACT_FIELDS first, then any extra keys from the row
                            const rowKeys = (row && typeof row === 'object') ? Object.keys(row) : [];
                            const ordered = Array.isArray(CONTRACT_FIELDS)
                              ? CONTRACT_FIELDS.filter(c => !INTERNAL_EXCLUDED.has(c)).concat(rowKeys.filter(k => !CONTRACT_FIELDS.includes(k) && !INTERNAL_EXCLUDED.has(k)))
                              : rowKeys.filter(k => !INTERNAL_EXCLUDED.has(k));
                            const formObj = {};
                            ordered.forEach(c => { formObj[c] = (row && Object.prototype.hasOwnProperty.call(row, c)) ? row[c] : ''; });
                            setContractForm(formObj);
                            setShowContractModal(true);
                          }}
                          title={t('edit')}
                          aria-label={`${t('edit')} ${row.contract_number || ''}`}
                          className="action-btn branch-action-btn"
                          disabled={isAudit}
                          style={{ marginRight: 8, opacity: isAudit ? 0.5 : 1, cursor: isAudit ? 'not-allowed' : 'pointer' }}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z" fill="#0a1e3d" />
                            <path d="M20.71 7.04a1.003 1.003 0 0 0 0-1.42l-2.34-2.34a1.003 1.003 0 0 0-1.42 0l-1.83 1.83 3.75 3.75 1.84-1.82z" fill="#0a1e3d" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDeleteContract(row)}
                          title={t('delete')}
                          aria-label={`${t('delete')} ${row.contract_number || ''}`}
                          className="action-btn branch-action-btn"
                          disabled={isAudit}
                          style={{ opacity: isAudit ? 0.5 : 1, cursor: isAudit ? 'not-allowed' : 'pointer' }}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M3 6h18" stroke="#000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" stroke="#000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M10 11v6M14 11v6" stroke="#000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" stroke="#000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </button>
                      </>
                    )}
                    {active === 'Branch Manager' && (
                      <>
                        <button
                          onClick={() => {
                            setBmModalMode('edit');
                            const id = row.bm_id || row.id || null;
                            setBmEditingId(id);
                            setBmForm({
                              bm_id: row.bm_id || '',
                              branches_id: row.branches_id || row.branchesId || '',
                              name_of_bm: row.name_of_bm || row.name || '',
                              place_birth_of_bm: row.place_birth_of_bm || '',
                              date_birth_of_bm: row.date_birth_of_bm || '',
                              nik_number_of_bm: row.nik_number_of_bm || '',
                              street_name_of_bm: row.street_name_of_bm || '',
                              subdistrict_of_bm: row.subdistrict_of_bm || '',
                              district_of_bm: row.district_of_bm || '',
                              city_of_bm: row.city_of_bm || '',
                              province_of_bm: row.province_of_bm || ''
                            });
                            setShowBMModal(true);
                          }}
                          title={t('edit')}
                          aria-label={`${t('edit')} ${row.name_of_bm || ''}`}
                          className="action-btn branch-action-btn"
                          disabled={isAudit}
                          style={{ marginRight: 8, opacity: isAudit ? 0.5 : 1, cursor: isAudit ? 'not-allowed' : 'pointer' }}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z" fill="#0a1e3d" />
                            <path d="M20.71 7.04a1.003 1.003 0 0 0 0-1.42l-2.34-2.34a1.003 1.003 0 0 0-1.42 0l-1.83 1.83 3.75 3.75 1.84-1.82z" fill="#0a1e3d" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDeleteBM(row)}
                          title={t('delete')}
                          aria-label={`${t('delete')} ${row.name_of_bm || ''}`}
                          className="action-btn branch-action-btn"
                          disabled={isAudit}
                          style={{ opacity: isAudit ? 0.5 : 1, cursor: isAudit ? 'not-allowed' : 'pointer' }}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M3 6h18" stroke="#000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" stroke="#000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M10 11v6M14 11v6" stroke="#000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" stroke="#000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </button>
                      </>
                    )}
                  </td>
                )}
                </tr>
            ))}
          </tbody>
        </table>

        {(active === 'Branches' || active === 'Regional' || active === 'Areas' || active === 'Director' || active === 'Branch Manager' || active === 'Contract') && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
            <div>{t('showing')} {start + 1}-{Math.min(start + pageSize, total)} of {total}</div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }} style={{ padding: '6px 8px', border: '1px solid #ddd', borderRadius: 6 }}>
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
              </select>
              <button className="pagination-btn" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={current <= 1} aria-label={t('prev')}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                  <path d="M15 18L9 12L15 6" stroke="#0a1e3d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {t('prev')}
              </button>
              <div className="pagination-indicator">{current} / {totalPages}</div>
              <button className="pagination-btn" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={current >= totalPages} aria-label={t('next')}>
                {t('next')}
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                  <path d="M9 6L15 12L9 18" stroke="#0a1e3d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  const buildEmptyFromCols = (cols) => {
    if (!Array.isArray(cols) || !cols.length) {
      return { contract_number: '', name_of_debtor: '', nik_number_of_debtor: '', loan_amount: '' };
    }
    const obj = {};
    cols.forEach(c => {
      if (INTERNAL_EXCLUDED.has(c)) return;
      obj[c] = '';
    });
    return obj;
  };

  // Lookup helper: fetch contract details from backend by contract_number
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

  // Global modal handler for contract number input: lookup and merge result into `contractForm`
  const handleModalContractNumberChange = async (v) => {
    try {
      setContractForm(prev => ({ ...prev, contract_number: v }));
      const trimmed = String(v || '').trim();
      if (!trimmed) return;
      if (trimmed.length < 3) return; // require >=3 chars to avoid excessive lookups
      const data = await fetchContractLookup(trimmed);
      const cdata = data.contract || data || {};
      const mapped = {};
      Object.keys(cdata || {}).forEach((k) => {
        try {
          const vv = cdata[k];
          if (vv !== undefined && vv !== null && String(vv).trim() !== '') mapped[k] = vv;
        } catch (e) { /* ignore per-key errors */ }
      });
      if (Object.keys(mapped).length) setContractForm(prev => ({ ...prev, ...mapped }));
    } catch (e) {
      console.error('handleModalContractNumberChange failed', e);
    }
  };

  // Explicit list of contract table fields from DB (exclude created_at/updated_at)
  const CONTRACT_FIELDS = [
    'contract_id',
    'contract_number',
    'nik_number_of_debtor',
    'name_of_debtor',
    'place_birth_of_debtor',
    'date_birth_of_debtor',
    'business_partners_relationship',
    'business_type',
    'street_of_debtor',
    'subdistrict_of_debtor',
    'district_of_debtor',
    'city_of_debtor',
    'province_of_debtor',
    'phone_number_of_debtor',
    'bank_account_number',
    'name_of_bank',
    'name_of_account_holder',
    'virtual_account_number',
    'topup_contract',
    'previous_topup_amount',
    'loan_amount',
    'flat_rate',
    'term',
    'admin_fee',
    'notaris_fee',
    'mortgage_amount',
    'stamp_amount',
    'financing_agreement_amount',
    'security_agreement_amount',
    'upgrading_land_rights_amount',
    'admin_rate',
    'tlo',
    'life_insurance',
    'created_by',
    'total_amount',
    'net_amount'
  ];
  
  // Columns that should be hidden in Add/Edit modals (internal DB fields)
  const INTERNAL_EXCLUDED = new Set(['created_at','updated_at','contract_id','created_by','id','deleted','deleted_at','created_by_id','phone_number_of_bm']);
  

  // Branches CRUD handlers (used by modal)
  const submitBranchForm = async () => {
    try {
        const payload = { ...branchForm };
        // ensure phone_number_branch is always present (backend may require non-null)
        if (payload.phone_number_branch === undefined || payload.phone_number_branch === null) payload.phone_number_branch = '';
        // coerce area_id and bm_id to numbers when possible
        if (payload.area_id !== undefined && payload.area_id !== null && payload.area_id !== '') {
          const n = Number(payload.area_id);
          payload.area_id = Number.isNaN(n) ? payload.area_id : n;
        } else {
          payload.area_id = payload.area_id === '' ? null : payload.area_id;
        }
        if (payload.bm_id !== undefined && payload.bm_id !== null && payload.bm_id !== '') {
          const n2 = Number(payload.bm_id);
          payload.bm_id = Number.isNaN(n2) ? payload.bm_id : n2;
        } else {
          payload.bm_id = payload.bm_id === '' ? null : payload.bm_id;
        }
        if (modalMode === 'create') {
          await requestWithAuth({ method: 'post', url: '/api/master-data/branches/', data: payload });
        } else if (modalMode === 'edit' && editingId) {
          await requestWithAuth({ method: 'patch', url: `/api/master-data/branches/${editingId}/`, data: payload });
        }
      setShowModal(false);
      // reload branches
      const res = await requestWithAuth({ method: 'get', url: '/api/master-data/branches/' });
      setData(res.data?.branches || res.data || []);
      try { toast.success(t(modalMode === 'create' ? 'save_added' : 'save_updated')); } catch (e) {}
    } catch (err) { console.error('Save branch failed', err); const msg = err?.response?.data?.error || t('save_failed'); setError(msg); toast.error(msg); }
  };

  const handleDeleteBranch = async (row) => {
    if (!row) return;
    const id = row.id || row.branch_id || row.branchId || null;
    if (!id) return;
    if (!window.confirm(`${t('delete_prefix')} ${row.branch_name || row.name || ''}?`)) return;
    try {
      setError('');
      await requestWithAuth({ method: 'delete', url: `/api/master-data/branches/${id}/` });
      const res = await requestWithAuth({ method: 'get', url: '/api/master-data/branches/' });
      setData(res.data?.branches || res.data || []);
      toast.success(t('branch_deleted'));
    
    } catch (err) {
      console.error('Delete failed', err);
      const msg = err?.response?.data?.error || t('delete_failed');
      setError(msg);
      toast.error(msg);
    }
  };

  // Regions CRUD handlers
  const submitRegionForm = async () => {
    try {
        if (regionModalMode === 'create') {
          await requestWithAuth({ method: 'post', url: '/api/master-data/regions/', data: regionForm });
      } else if (regionModalMode === 'edit' && regionEditingId) {
        await requestWithAuth({ method: 'patch', url: `/api/master-data/regions/${regionEditingId}/`, data: regionForm });
      }
      setShowRegionModal(false);
      const res = await requestWithAuth({ method: 'get', url: '/api/master-data/regions/' });
      setData(res.data?.regions || res.data || []);
      try { toast.success(t(regionModalMode === 'create' ? 'save_added' : 'save_updated')); } catch (e) {}
    } catch (err) { console.error('Save region failed', err); alert(t('save_failed')); }
  };

  const handleDeleteRegion = async (row) => {
    if (!row) return;
    const id = row.id || row.region_id || null;
    if (!id) return;
    if (!window.confirm(`${t('delete_prefix')} ${row.name || ''}?`)) return;
    try {
      setError('');
      await requestWithAuth({ method: 'delete', url: `/api/master-data/regions/${id}/` });
      const res = await requestWithAuth({ method: 'get', url: '/api/master-data/regions/' });
      setData(res.data?.regions || res.data || []);
      toast.success(t('region_deleted'));
    } catch (err) {
      console.error('Delete failed', err);
      const msg = err?.response?.data?.error || t('delete_failed');
      setError(msg);
      toast.error(msg);
    }
  };

  // Areas CRUD handlers
  const submitAreaForm = async () => {
    try {
        // Ensure region_id is numeric before sending (select returns string)
        const payload = { ...areaForm };
        if (payload.region_id !== undefined && payload.region_id !== null && payload.region_id !== '') {
          const n = Number(payload.region_id);
          payload.region_id = Number.isNaN(n) ? payload.region_id : n;
        } else {
          // send null/empty as-is
          payload.region_id = payload.region_id === '' ? null : payload.region_id;
        }

        if (areaModalMode === 'create') {
        await requestWithAuth({ method: 'post', url: '/api/master-data/areas/', data: payload });
      } else if (areaModalMode === 'edit' && areaEditingId) {
        await requestWithAuth({ method: 'patch', url: `/api/master-data/areas/${areaEditingId}/`, data: payload });
      }
      setShowAreaModal(false);
      const res = await requestWithAuth({ method: 'get', url: '/api/master-data/areas/' });
      setData(res.data?.areas || res.data || []);
      try { toast.success(t(areaModalMode === 'create' ? 'save_added' : 'save_updated')); } catch (e) {}
    } catch (err) { console.error('Save area failed', err); alert(t('save_failed')); }
  };

  const handleDeleteArea = async (row) => {
    if (!row) return;
    const id = row.id || row.area_id || null;
    if (!id) return;
    if (!window.confirm(`${t('delete_prefix')} ${row.name || ''}?`)) return;
    try {
      setError('');
      await requestWithAuth({ method: 'delete', url: `/api/master-data/areas/${id}/` });
      const res = await requestWithAuth({ method: 'get', url: '/api/master-data/areas/' });
      setData(res.data?.areas || res.data || []);
      toast.success(t('area_deleted'));
    } catch (err) {
      console.error('Delete failed', err);
      const msg = err?.response?.data?.error || t('delete_failed');
      setError(msg);
      toast.error(msg);
    }
  };

  // Director CRUD handlers
  const submitDirectorForm = async () => {
    try {
        if (directorModalMode === 'create') {
        await requestWithAuth({ method: 'post', url: '/api/directors/', data: directorForm });
      } else if (directorModalMode === 'edit' && directorEditingId) {
        await requestWithAuth({ method: 'patch', url: `/api/directors/${directorEditingId}/`, data: directorForm });
      }
      setShowDirectorModal(false);
      const res = await requestWithAuth({ method: 'get', url: '/api/directors/' });
      setData(res.data?.directors || res.data || []);
      try { toast.success(t(directorModalMode === 'create' ? 'save_added' : 'save_updated')); } catch (e) {}
    } catch (err) { console.error('Save director failed', err); const msg = err?.response?.data?.error || t('save_failed'); setError(msg); toast.error(msg); }
  };

  const handleDeleteDirector = async (row) => {
    if (!row) return;
    const id = row.director_id || row.id || null;
    if (!id) return;
    if (!window.confirm(`${t('delete_prefix')} ${row.name_of_director || ''}?`)) return;
    try {
      setError('');
      await requestWithAuth({ method: 'delete', url: `/api/directors/${id}/` });
      const res = await requestWithAuth({ method: 'get', url: '/api/directors/' });
      setData(res.data?.directors || res.data || []);
      toast.success(t('director_deleted'));
    } catch (err) {
      console.error('Delete failed', err);
      const msg = err?.response?.data?.error || t('delete_failed');
      setError(msg);
      toast.error(msg);
    }
  };

  // Contract CRUD handlers
  const submitContractForm = async () => {
    try {
      // Normalize numeric fields to avoid sending empty strings for integer columns
      const NUMERIC_CONTRACT_FIELDS = ['loan_amount','previous_topup_amount','notaris_fee','net_amount','admin_fee','admin_rate','mortgage_amount','stamp_amount','financing_agreement_amount','security_agreement_amount','upgrading_land_rights_amount','total_amount','term'];
      const payload = {};
      const parseToNumber = (input) => {
        if (input === '' || input === null || typeof input === 'undefined') return null;
        let s = String(input).trim();
        const hasDot = s.indexOf('.') >= 0;
        const hasComma = s.indexOf(',') >= 0;
        if (hasDot && hasComma) {
          const lastDot = s.lastIndexOf('.');
          const lastComma = s.lastIndexOf(',');
          if (lastDot > lastComma) {
            s = s.replace(/,/g, ''); // dot decimal
          } else {
            s = s.replace(/\./g, '');
            s = s.replace(/,/g, '.');
          }
        } else if (hasComma && !hasDot) {
          const parts = s.split(',');
          const last = parts[parts.length - 1];
          if (last.length === 2) {
            s = s.replace(/\./g, '');
            s = s.replace(/,/g, '.');
          } else {
            s = s.replace(/,/g, '');
          }
        } else if (hasDot && !hasComma) {
          const parts = s.split('.');
          const last = parts[parts.length - 1];
          if (last.length === 2) {
            // treat dot as decimal
          } else if (parts.length > 1) {
            s = s.replace(/\./g, '');
          }
        }
        const n = Number(s);
        return Number.isNaN(n) ? null : n;
      };

      Object.keys(contractForm || {}).forEach((k) => {
        const v = contractForm[k];
        if (NUMERIC_CONTRACT_FIELDS.includes(k)) {
          payload[k] = parseToNumber(v);
        } else {
          payload[k] = v;
        }
      });

      if (contractModalMode === 'create') {
        await requestWithAuth({ method: 'post', url: '/api/contracts/', data: payload });
      } else if (contractModalMode === 'edit' && contractEditingId) {
        await requestWithAuth({ method: 'patch', url: `/api/contracts/${contractEditingId}/`, data: payload });
      }
      setShowContractModal(false);
      const res = await requestWithAuth({ method: 'get', url: '/api/contracts/table/' });
      setData(res.data?.contracts || res.data || []);
      try { toast.success(t(contractModalMode === 'create' ? 'save_added' : 'save_updated')); } catch (e) {}
    } catch (err) { 
      console.error('Save contract failed', err);
      const raw = err?.response?.data?.error || err?.response?.data?.detail || err?.message || '';
      // Detect MySQL duplicate entry or 1062 messages and show friendly translatable message
      if (typeof raw === 'string' && /duplicate entry|1062/i.test(raw)) {
        toast.error(t('failed_save_manual_add'));
      } else {
        const msg = raw || t('save_failed');
        toast.error(msg);
      }
    }
  };

  const handleDeleteContract = async (row) => {
    if (!row) return;
    const id = row.contract_id || row.id || row.contractId || null;
    if (!id) return;
    if (!window.confirm(`${t('delete_prefix')} ${row.contract_number || ''}?`)) return;
    try {
      setError('');
      await requestWithAuth({ method: 'delete', url: `/api/contracts/${id}/` });
      const res = await requestWithAuth({ method: 'get', url: '/api/contracts/table/' });
      setData(res.data?.contracts || res.data || []);
      toast.success(t('contract_deleted'));
    } catch (err) {
      console.error('Delete failed', err);
      const msg = err?.response?.data?.error || t('delete_failed');
      setError(msg);
      toast.error(msg);
    }
  };

  // Branch Manager CRUD handlers
  const submitBMForm = async () => {
    try {
      const payload = { ...bmForm };
      // remove bm_id from payload (we don't want to send/allow editing the BM primary id)
      if (payload.bm_id !== undefined) delete payload.bm_id;
      // ensure phone is not sent from this modal (field hidden)
      if (payload.phone_number_of_bm !== undefined) delete payload.phone_number_of_bm;
      // coerce branches_id to number when possible
      if (payload.branches_id !== undefined && payload.branches_id !== null && payload.branches_id !== '') {
        const n = Number(payload.branches_id);
        payload.branches_id = Number.isNaN(n) ? payload.branches_id : n;
      } else {
        payload.branches_id = payload.branches_id === '' ? null : payload.branches_id;
      }
      if (bmModalMode === 'create') {
        await requestWithAuth({ method: 'post', url: '/api/branch-manager-crud/', data: payload });
      } else if (bmModalMode === 'edit' && bmEditingId) {
        await requestWithAuth({ method: 'patch', url: `/api/branch-manager-crud/${bmEditingId}/`, data: payload });
      }
      setShowBMModal(false);
      const res = await requestWithAuth({ method: 'get', url: '/api/branch-manager/' });
      setData(res.data?.bm || res.data || []);
      try { toast.success(t(bmModalMode === 'create' ? 'save_added' : 'save_updated')); } catch (e) {}
    } catch (err) { console.error('Save branch manager failed', err); const msg = err?.response?.data?.error || t('save_failed'); setError(msg); toast.error(msg); }
  };

  const handleDeleteBM = async (row) => {
    if (!row) return;
    const id = row.bm_id || row.id || null;
    if (!id) return;
    if (!window.confirm(`${t('delete_prefix')} ${row.name_of_bm || ''}?`)) return;
    try {
      setError('');
      await requestWithAuth({ method: 'delete', url: `/api/branch-manager-crud/${id}/` });
      const res = await requestWithAuth({ method: 'get', url: '/api/branch-manager/' });
      setData(res.data?.bm || res.data || []);
      toast.success(t('branch_deleted'));
    } catch (err) {
      console.error('Delete failed', err);
      const msg = err?.response?.data?.error || t('delete_failed');
      setError(msg);
      toast.error(msg);
    }
  };

  return (
    <div className="content-section">
      <h2>{t('master_data')}</h2>

      <div style={{ marginTop: 12, marginBottom: 16, display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
        {tabs.map(t => (
          <button key={t} onClick={() => setActive(t)} style={tabBtnStyle(t)} aria-pressed={active === t}>{tabLabel(t)}</button>
        ))}
      </div>

      <div style={{ padding: 12, border: '1px solid #e6e6e6', borderRadius: 6, minHeight: 220, background: 'transparent' }}>
        {renderTable()}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{modalMode === 'create' ? t('add_branch') : t('edit_branch')}</h3>
              <button className="modal-close-btn" onClick={() => setShowModal(false)}>&times;</button>
            </div>
            <div style={{ padding: 20, minWidth: 560 }}>
              <form onSubmit={e => { e.preventDefault(); submitBranchForm(); }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <label style={{ fontSize: 13, fontWeight: 600, color: '#333', marginBottom: 6 }}>{t('area_id')}</label>
                    <select style={{ padding: '10px 12px', fontSize: 14, border: '1px solid #ddd', borderRadius: 6 }} value={branchForm.area_id ?? ''} onChange={(e) => setBranchForm(prev => ({ ...prev, area_id: e.target.value }))}>
                      <option value="">-- {t('select_area') || 'Select area'} --</option>
                      {areasList && areasList.map(a => (
                        <option key={a.id} value={a.id}>{a.name || a.name_of_area || a.area_name || a.code || a.id}</option>
                      ))}
                    </select>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <label style={{ fontSize: 13, fontWeight: 600, color: '#333', marginBottom: 6 }}>{t('bm_id')}</label>
                    <select style={{ padding: '10px 12px', fontSize: 14, border: '1px solid #ddd', borderRadius: 6 }} value={branchForm.bm_id ?? ''} onChange={(e) => setBranchForm(prev => ({ ...prev, bm_id: e.target.value }))}>
                      <option value="">-- {t('select_bm') || 'Select BM'} --</option>
                      {bmsList && bmsList.map(b => (
                        <option key={String(b.bm_id ?? b.id)} value={b.bm_id ?? b.id}>{b.name_of_bm || b.name || b.bm_name || b.id}</option>
                      ))}
                    </select>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <label style={{ fontSize: 13, fontWeight: 600, color: '#333', marginBottom: 6 }}>{t('name')}</label>
                    <input style={{ padding: '10px 12px', fontSize: 14, border: '1px solid #ddd', borderRadius: 6 }} value={branchForm.name} onChange={(e) => setBranchForm(prev => ({ ...prev, name: e.target.value }))} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <label style={{ fontSize: 13, fontWeight: 600, color: '#333', marginBottom: 6 }}>{t('code')}</label>
                    <input style={{ padding: '10px 12px', fontSize: 14, border: '1px solid #ddd', borderRadius: 6 }} value={branchForm.code} onChange={(e) => setBranchForm(prev => ({ ...prev, code: e.target.value }))} />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <label style={{ fontSize: 13, fontWeight: 600, color: '#333', marginBottom: 6 }}>{t('phone_number')}</label>
                    <input style={{ padding: '10px 12px', fontSize: 14, border: '1px solid #ddd', borderRadius: 6 }} value={branchForm.phone_number_branch} onChange={(e) => setBranchForm(prev => ({ ...prev, phone_number_branch: e.target.value }))} />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <label style={{ fontSize: 13, fontWeight: 600, color: '#333', marginBottom: 6 }}>{t('street_name')}</label>
                    <input style={{ padding: '10px 12px', fontSize: 14, border: '1px solid #ddd', borderRadius: 6 }} value={branchForm.street_name} onChange={(e) => setBranchForm(prev => ({ ...prev, street_name: e.target.value }))} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <label style={{ fontSize: 13, fontWeight: 600, color: '#333', marginBottom: 6 }}>{t('subdistrict')}</label>
                    <input style={{ padding: '10px 12px', fontSize: 14, border: '1px solid #ddd', borderRadius: 6 }} value={branchForm.subdistrict} onChange={(e) => setBranchForm(prev => ({ ...prev, subdistrict: e.target.value }))} />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <label style={{ fontSize: 13, fontWeight: 600, color: '#333', marginBottom: 6 }}>{t('district')}</label>
                    <input style={{ padding: '10px 12px', fontSize: 14, border: '1px solid #ddd', borderRadius: 6 }} value={branchForm.district} onChange={(e) => setBranchForm(prev => ({ ...prev, district: e.target.value }))} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <label style={{ fontSize: 13, fontWeight: 600, color: '#333', marginBottom: 6 }}>{t('city')}</label>
                    <input style={{ padding: '10px 12px', fontSize: 14, border: '1px solid #ddd', borderRadius: 6 }} value={branchForm.city} onChange={(e) => setBranchForm(prev => ({ ...prev, city: e.target.value }))} />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <label style={{ fontSize: 13, fontWeight: 600, color: '#333', marginBottom: 6 }}>{t('province')}</label>
                    <input style={{ padding: '10px 12px', fontSize: 14, border: '1px solid #ddd', borderRadius: 6 }} value={branchForm.province} onChange={(e) => setBranchForm(prev => ({ ...prev, province: e.target.value }))} />
                  </div>
                  {/* Branch Code removed: not present in database */}
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
                  <button type="submit" className="btn-primary">{modalMode === 'create' ? t('create') : t('update')}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      {showRegionModal && (
        <div className="modal-overlay" onClick={() => setShowRegionModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{regionModalMode === 'create' ? t('add_region') : t('edit_region')}</h3>
              <button className="modal-close-btn" onClick={() => setShowRegionModal(false)}>&times;</button>
            </div>
            <div style={{ padding: 20, minWidth: 560 }}>
              <form onSubmit={e => { e.preventDefault(); submitRegionForm(); }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <label style={{ fontSize: 13, fontWeight: 600, color: '#333', marginBottom: 6 }}>{t('name')}</label>
                    <input style={{ padding: '10px 12px', fontSize: 14, border: '1px solid #ddd', borderRadius: 6 }} value={regionForm.name} onChange={(e) => setRegionForm(prev => ({ ...prev, name: e.target.value }))} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <label style={{ fontSize: 13, fontWeight: 600, color: '#333', marginBottom: 6 }}>{t('code')}</label>
                    <input style={{ padding: '10px 12px', fontSize: 14, border: '1px solid #ddd', borderRadius: 6 }} value={regionForm.code} onChange={(e) => setRegionForm(prev => ({ ...prev, code: e.target.value }))} />
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
                  <button type="submit" className="btn-primary">{regionModalMode === 'create' ? t('create') : t('update')}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      {showAreaModal && (
        <div className="modal-overlay" onClick={() => setShowAreaModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{areaModalMode === 'create' ? t('add_area') : t('edit_area')}</h3>
              <button className="modal-close-btn" onClick={() => setShowAreaModal(false)}>&times;</button>
            </div>
            <div style={{ padding: 20, minWidth: 560 }}>
              <form onSubmit={e => { e.preventDefault(); submitAreaForm(); }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <label style={{ fontSize: 13, fontWeight: 600, color: '#333', marginBottom: 6 }}>{t('region_id')}</label>
                    <select style={{ padding: '10px 12px', fontSize: 14, border: '1px solid #ddd', borderRadius: 6 }} value={areaForm.region_id} onChange={(e) => setAreaForm(prev => ({ ...prev, region_id: e.target.value }))}>
                      <option value="">-- {t('select_region') || 'Select region'} --</option>
                      {regionsList && regionsList.map(r => (
                        <option key={r.id} value={r.id}>{r.name || r.region_name || r.code || r.id}</option>
                      ))}
                    </select>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <label style={{ fontSize: 13, fontWeight: 600, color: '#333', marginBottom: 6 }}>{t('code')}</label>
                    <input style={{ padding: '10px 12px', fontSize: 14, border: '1px solid #ddd', borderRadius: 6 }} value={areaForm.code} onChange={(e) => setAreaForm(prev => ({ ...prev, code: e.target.value }))} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <label style={{ fontSize: 13, fontWeight: 600, color: '#333', marginBottom: 6 }}>{t('name')}</label>
                    <input style={{ padding: '10px 12px', fontSize: 14, border: '1px solid #ddd', borderRadius: 6 }} value={areaForm.name} onChange={(e) => setAreaForm(prev => ({ ...prev, name: e.target.value }))} />
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
                  <button type="submit" className="btn-primary">{areaModalMode === 'create' ? t('create') : t('update')}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {showDirectorModal && (
        <div className="modal-overlay" onClick={() => setShowDirectorModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{directorModalMode === 'create' ? t('add_director') : t('edit_director')}</h3>
              <button className="modal-close-btn" onClick={() => setShowDirectorModal(false)}>&times;</button>
            </div>
            <div style={{ padding: 20, minWidth: 560 }}>
              <form onSubmit={e => { e.preventDefault(); submitDirectorForm(); }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <label style={{ fontSize: 13, fontWeight: 600, color: '#333', marginBottom: 6 }}>{t('name')}</label>
                    <input style={{ padding: '10px 12px', fontSize: 14, border: '1px solid #ddd', borderRadius: 6 }} value={directorForm.name_of_director} onChange={(e) => setDirectorForm(prev => ({ ...prev, name_of_director: e.target.value }))} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <label style={{ fontSize: 13, fontWeight: 600, color: '#333', marginBottom: 6 }}>{t('phone')}</label>
                    <input style={{ padding: '10px 12px', fontSize: 14, border: '1px solid #ddd', borderRadius: 6 }} value={directorForm.phone_number_of_lolc} onChange={(e) => setDirectorForm(prev => ({ ...prev, phone_number_of_lolc: e.target.value }))} />
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
                  <button type="submit" className="btn-primary">{directorModalMode === 'create' ? t('create') : t('update')}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {showContractModal && (
        <div className="modal-overlay" onClick={() => setShowContractModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{contractModalMode === 'create' ? t('add_contract') : t('edit_contract')}</h3>
              <button className="modal-close-btn" onClick={() => setShowContractModal(false)}>&times;</button>
            </div>
            <div style={{ padding: 20, minWidth: 560 }}>
              <form onSubmit={e => { e.preventDefault(); submitContractForm(); }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  {(() => {
                    // Determine which fields to render in the modal.
                    // Prefer keys already present in `contractForm` (so edit shows actual DB columns),
                    // but keep CONTRACT_FIELDS ordering first when available.
                    let fields = [];
                    const formKeys = (contractForm && typeof contractForm === 'object') ? Object.keys(contractForm) : [];
                    if (formKeys.length) {
                      fields = Array.isArray(CONTRACT_FIELDS)
                        ? CONTRACT_FIELDS.filter(c => !INTERNAL_EXCLUDED.has(c)).concat(formKeys.filter(k => !CONTRACT_FIELDS.includes(k) && !INTERNAL_EXCLUDED.has(k)))
                        : formKeys.filter(k => !INTERNAL_EXCLUDED.has(k));
                    } else if (Array.isArray(columnsMeta) && columnsMeta.length) {
                      fields = columnsMeta.filter(c => !INTERNAL_EXCLUDED.has(c));
                    } else if (Array.isArray(CONTRACT_FIELDS)) {
                      fields = CONTRACT_FIELDS.filter(c => !INTERNAL_EXCLUDED.has(c));
                    } else {
                      fields = ['contract_number','name_of_debtor','nik_number_of_debtor','loan_amount'];
                    }
                    return fields.map(c => {
                      const pretty = (s) => String(s).replace(/_/g, ' ').replace(/\b\w/g, ch => ch.toUpperCase());
                      const translated = t(c);
                      const label = (translated && translated !== c) ? translated : pretty(c);
                      const val = contractForm[c] ?? '';
                      const lower = c.toLowerCase();
                      const isDate = lower.includes('date');
                      // treat common fee/amount/loan/tlo/insurance keys as numeric
                      const isNumeric = lower.includes('amount') || lower.includes('loan') || lower.includes('nominal') || lower.includes('fee') || lower.includes('tlo') || lower.includes('insurance');
                      const readOnly = (c === 'contract_id' && contractModalMode === 'edit');
                      // For numeric fields render as text with thousands separator formatting
                      if (isNumeric) {
                        const normalizeNumericInput = (s) => {
                          if (s === null || s === undefined) return '';
                          let v = String(s).trim();
                          const hasDot = v.indexOf('.') >= 0;
                          const hasComma = v.indexOf(',') >= 0;
                          if (hasDot && hasComma) {
                            const lastDot = v.lastIndexOf('.');
                            const lastComma = v.lastIndexOf(',');
                            if (lastDot > lastComma) {
                              // dot is decimal separator, remove commas
                              v = v.replace(/,/g, '');
                            } else {
                              // comma is decimal separator
                              v = v.replace(/\./g, '');
                              v = v.replace(/,/g, '.');
                            }
                          } else if (hasComma && !hasDot) {
                            const parts = v.split(',');
                            const last = parts[parts.length - 1];
                            if (last.length === 2) {
                              v = v.replace(/\./g, '');
                              v = v.replace(/,/g, '.');
                            } else {
                              v = v.replace(/,/g, '');
                            }
                          } else if (hasDot && !hasComma) {
                            const parts = v.split('.');
                            const last = parts[parts.length - 1];
                            if (last.length === 2) {
                              // dot is decimal separator - keep as-is
                            } else if (parts.length > 1) {
                              // dots used as thousands separators
                              v = v.replace(/\./g, '');
                            }
                          }
                          return v;
                        };

                        return (
                          <div key={c} style={{ display: 'flex', flexDirection: 'column' }}>
                            <label style={{ fontSize: 13, fontWeight: 600, color: '#333', marginBottom: 6 }}>{label}</label>
                            <input
                              type="text"
                              readOnly={readOnly}
                              style={{ padding: '10px 12px', fontSize: 14, border: '1px solid #ddd', borderRadius: 6 }}
                              value={formatNumberWithDots(val)}
                              onChange={(e) => {
                                const raw = normalizeNumericInput(e.target.value || '');
                                setContractForm(prev => ({ ...prev, [c]: raw }));
                              }}
                            />
                          </div>
                        );
                      }
                      const type = isDate ? 'date' : 'text';
                      // Render business_partners_relationship as a dropdown to match BLAgreement
                      if (c === 'business_partners_relationship') {
                        return (
                          <div key={c} style={{ display: 'flex', flexDirection: 'column' }}>
                            <label style={{ fontSize: 13, fontWeight: 600, color: '#333', marginBottom: 6 }}>{label}</label>
                            <select
                              value={val ?? ''}
                              onChange={(e) => setContractForm(prev => ({ ...prev, [c]: e.target.value }))}
                              style={{ padding: '10px 12px', fontSize: 14, border: '1px solid #ddd', borderRadius: 6 }}
                            >
                              <option value="">-- Select Relationship --</option>
                              <option value="Suami">Suami</option>
                              <option value="Istri">Istri</option>
                              <option value="Anak Kandung">Anak Kandung</option>
                              <option value="Saudara Kandung">Saudara Kandung</option>
                              <option value="Orangtua">Orangtua</option>
                            </select>
                          </div>
                        );
                      }

                      // limit contract_number and topup_contract to 12 chars
                      const isLimitedId = (c === 'contract_number' || c === 'topup_contract');
                      const maxLen = isLimitedId ? 12 : undefined;
                      return (
                        <div key={c} style={{ display: 'flex', flexDirection: 'column' }}>
                          <label style={{ fontSize: 13, fontWeight: 600, color: '#333', marginBottom: 6 }}>{label}</label>
                          <input
                            type={type}
                            readOnly={readOnly}
                            maxLength={maxLen}
                            style={{ padding: '10px 12px', fontSize: 14, border: '1px solid #ddd', borderRadius: 6 }}
                            value={val}
                            onChange={(e) => {
                              let v = e.target.value;
                              if (isLimitedId && typeof v === 'string') v = v.slice(0, 12);
                              if (c === 'contract_number') {
                                // perform lookup when user types contract number (require >=3 chars)
                                handleModalContractNumberChange(v);
                                return;
                              }
                              setContractForm(prev => ({ ...prev, [c]: v }));
                            }}
                          />
                        </div>
                      );
                    });
                  })()}
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
                  <button type="submit" className="btn-primary">{contractModalMode === 'create' ? t('create') : t('update')}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      {showBMModal && (
        <div className="modal-overlay" onClick={() => setShowBMModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{bmModalMode === 'create' ? t('add_branch_manager') : t('edit_branch_manager')}</h3>
              <button className="modal-close-btn" onClick={() => setShowBMModal(false)}>&times;</button>
            </div>
            <div style={{ padding: 20, minWidth: 560 }}>
              <form onSubmit={e => { e.preventDefault(); submitBMForm(); }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <label style={{ fontSize: 13, fontWeight: 600, color: '#333', marginBottom: 6 }}>{t('branches_id')}</label>
                      <select style={{ padding: '10px 12px', fontSize: 14, border: '1px solid #ddd', borderRadius: 6 }} value={bmForm.branches_id ?? ''} onChange={(e) => setBmForm(prev => ({ ...prev, branches_id: e.target.value }))}>
                        <option value="">-- {t('select_branch') || 'Select branch'} --</option>
                        {branchesList && branchesList.map(b => (
                          <option key={b.id ?? b.branch_id} value={b.id ?? b.branch_id}>{b.branch_name || b.name || b.name_of_bm || b.code || (b.id ?? b.branch_id)}</option>
                        ))}
                      </select>
                    </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <label style={{ fontSize: 13, fontWeight: 600, color: '#333', marginBottom: 6 }}>{t('name')}</label>
                    <input style={{ padding: '10px 12px', fontSize: 14, border: '1px solid #ddd', borderRadius: 6 }} value={bmForm.name_of_bm} onChange={(e) => setBmForm(prev => ({ ...prev, name_of_bm: e.target.value }))} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <label style={{ fontSize: 13, fontWeight: 600, color: '#333', marginBottom: 6 }}>{t('nik')}</label>
                    <input style={{ padding: '10px 12px', fontSize: 14, border: '1px solid #ddd', borderRadius: 6 }} value={bmForm.nik_number_of_bm} onChange={(e) => setBmForm(prev => ({ ...prev, nik_number_of_bm: e.target.value }))} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <label style={{ fontSize: 13, fontWeight: 600, color: '#333', marginBottom: 6 }}>{t('place_of_birth')}</label>
                    <input style={{ padding: '10px 12px', fontSize: 14, border: '1px solid #ddd', borderRadius: 6 }} value={bmForm.place_birth_of_bm} onChange={(e) => setBmForm(prev => ({ ...prev, place_birth_of_bm: e.target.value }))} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <label style={{ fontSize: 13, fontWeight: 600, color: '#333', marginBottom: 6 }}>{t('date_of_birth')}</label>
                    <input type="date" style={{ padding: '10px 12px', fontSize: 14, border: '1px solid #ddd', borderRadius: 6 }} value={bmForm.date_birth_of_bm} onChange={(e) => setBmForm(prev => ({ ...prev, date_birth_of_bm: e.target.value }))} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <label style={{ fontSize: 13, fontWeight: 600, color: '#333', marginBottom: 6 }}>{t('street_name')}</label>
                    <input style={{ padding: '10px 12px', fontSize: 14, border: '1px solid #ddd', borderRadius: 6 }} value={bmForm.street_name_of_bm} onChange={(e) => setBmForm(prev => ({ ...prev, street_name_of_bm: e.target.value }))} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <label style={{ fontSize: 13, fontWeight: 600, color: '#333', marginBottom: 6 }}>{t('subdistrict')}</label>
                    <input style={{ padding: '10px 12px', fontSize: 14, border: '1px solid #ddd', borderRadius: 6 }} value={bmForm.subdistrict_of_bm} onChange={(e) => setBmForm(prev => ({ ...prev, subdistrict_of_bm: e.target.value }))} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <label style={{ fontSize: 13, fontWeight: 600, color: '#333', marginBottom: 6 }}>{t('district')}</label>
                    <input style={{ padding: '10px 12px', fontSize: 14, border: '1px solid #ddd', borderRadius: 6 }} value={bmForm.district_of_bm} onChange={(e) => setBmForm(prev => ({ ...prev, district_of_bm: e.target.value }))} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <label style={{ fontSize: 13, fontWeight: 600, color: '#333', marginBottom: 6 }}>{t('city')}</label>
                    <input style={{ padding: '10px 12px', fontSize: 14, border: '1px solid #ddd', borderRadius: 6 }} value={bmForm.city_of_bm} onChange={(e) => setBmForm(prev => ({ ...prev, city_of_bm: e.target.value }))} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <label style={{ fontSize: 13, fontWeight: 600, color: '#333', marginBottom: 6 }}>{t('province')}</label>
                    <input style={{ padding: '10px 12px', fontSize: 14, border: '1px solid #ddd', borderRadius: 6 }} value={bmForm.province_of_bm} onChange={(e) => setBmForm(prev => ({ ...prev, province_of_bm: e.target.value }))} />
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
                  <button type="submit" className="btn-primary">{bmModalMode === 'create' ? t('create') : t('update')}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

