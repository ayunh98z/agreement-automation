import React, { useState, useEffect } from 'react';
import { requestWithAuth } from '../../utils/api';
import { toast } from 'react-toastify';
import '../UserManagement/UserManagement.css';

const tabs = ['Regional','Areas','Branches','Director','Branch Manager','Contract'];

export default function MasterData() {
  const [active, setActive] = useState(tabs[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState([]);
  const [, setColumnsMeta] = useState(null);
  const [search, setSearch] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);

  // Branches CRUD state
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // create | edit
  const [branchForm, setBranchForm] = useState({ branch_name: '', area_id: '', bm_id: '', name: '', code: '', street_name: '', subdistrict: '', district: '', city: '', province: '' });
  const [editingId, setEditingId] = useState(null);
  // (no confirmation modal) 
  // Regions CRUD state
  const [showRegionModal, setShowRegionModal] = useState(false);
  const [regionModalMode, setRegionModalMode] = useState('create');
  const [regionForm, setRegionForm] = useState({ name: '', code: '' });
  const [regionEditingId, setRegionEditingId] = useState(null);
  // Branch Manager CRUD state
  const [showBMModal, setShowBMModal] = useState(false);
  const [bmModalMode, setBmModalMode] = useState('create');
  const [bmForm, setBmForm] = useState({ bm_id: '', branches_id: '', name_of_bm: '', nik_number_of_bm: '', phone_number_of_bm: '' });
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
  const [contractForm, setContractForm] = useState({ contract_number: '', name_of_debtor: '', nik_number_of_debtor: '', loan_amount: '' });
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
          case 'Director': url = 'http://localhost:8000/api/directors/'; break;
          case 'Branch Manager': url = 'http://localhost:8000/api/branch-manager/'; break;
          case 'Contract': url = 'http://localhost:8000/api/contracts/table/'; break;
          default: url = ''; break;
        }
        if (!url) { setData([]); return; }
        const res = await requestWithAuth({ method: 'get', url });
        const items = res.data?.regions || res.data?.areas || res.data?.branches || res.data?.directors || res.data?.bm || res.data?.contracts || res.data?.collateral || res.data?.results || res.data?.agreements || res.data || [];
        // capture backend-provided columns metadata when available
        const cols = res.data?.columns || null;
        if (!cancelled) {
          setColumnsMeta(Array.isArray(cols) ? cols : null);
          setData(Array.isArray(items) ? items : (items ? [items] : []));
        }
      } catch (err) {
        console.error('MasterData load error', err);
        if (!cancelled) setError('Gagal memuat data');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [active]);

  const tabBtnStyle = (t) => ({
    padding: '8px 12px',
    marginRight: 8,
    borderRadius: 6,
    border: active === t ? '2px solid #0a1e3d' : '1px solid #ddd',
    background: 'transparent',
    cursor: 'pointer'
  });

  const renderTable = () => {
    if (loading) return <div>Loading...</div>;
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
      case 'Branches': cols = ['id', 'area_id','bm_id','name','code']; break;
      case 'Director': cols = ['director_id','name_of_director','phone_number_of_lolc']; break;
      case 'Branch Manager': cols = ['bm_id','branches_id','name_of_bm','nik_number_of_bm','phone_number_of_bm']; break;
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
      return String(r.branch_name || r.name || r.region_name || r.contract_number || r.city || r.branch_code || r.code || r.name_of_bm || r.nik_number_of_bm || r.phone_number_of_bm || '').toLowerCase().includes(q);
    });
    const total = filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const current = Math.min(page, totalPages);
    const start = (current - 1) * pageSize;
    const paged = filtered.slice(start, start + pageSize);

    const getCellValue = (row, c) => {
      if (c === 'code') return row.code ?? row.area_code ?? row.region_code ?? row.branch_code ?? '';
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
              <input placeholder="Search..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} style={{ padding: '6px 8px', border: '1px solid #ddd', borderRadius: 6, background: 'inherit' }} />
            </div>
            <div>
              {active === 'Branches' && (
                <button className="btn-primary" onClick={() => { setModalMode('create'); setEditingId(null); setBranchForm({ branch_name: '', area_id: '', bm_id: '', name: '', code: '', street_name: '', subdistrict: '', district: '', city: '', province: '' }); setShowModal(true); }}>Add Branch</button>
              )}
              {active === 'Regional' && (
                <button className="btn-primary" onClick={() => { setRegionModalMode('create'); setRegionEditingId(null); setRegionForm({ name: '', code: '' }); setShowRegionModal(true); }}>Add Region</button>
              )}
              {active === 'Areas' && (
                <button className="btn-primary" onClick={() => { setAreaModalMode('create'); setAreaEditingId(null); setAreaForm({ region_id: '', name: '', code: '' }); setShowAreaModal(true); }}>Add Area</button>
              )}
              {active === 'Director' && (
                <button className="btn-primary" onClick={() => { setDirectorModalMode('create'); setDirectorEditingId(null); setDirectorForm({ name_of_director: '', phone_number_of_lolc: '' }); setShowDirectorModal(true); }}>Add Director</button>
              )}
              {active === 'Contract' && (
                <button className="btn-primary" onClick={() => { setContractModalMode('create'); setContractEditingId(null); setContractForm({ contract_number: '', name_of_debtor: '', nik_number_of_debtor: '', loan_amount: '' }); setShowContractModal(true); }}>Add Contract</button>
              )}
              {active === 'Branch Manager' && (
                <button className="btn-primary" onClick={() => { setBmModalMode('create'); setBmEditingId(null); setBmForm({ bm_id: '', branches_id: '', name_of_bm: '', nik_number_of_bm: '', phone_number_of_bm: '' }); setShowBMModal(true); }}>Add Branch Manager</button>
              )}
            </div>
          </div>
        )}

        <table className={`user-table ${(active === 'Branches' || active === 'Regional' || active === 'Areas' || active === 'Director' || active === 'Branch Manager' || active === 'Contract') ? 'branches-table' : ''}`} style={{ background: 'transparent' }}>
          <thead>
            <tr>
              {cols.map(c => {
                const labelMap = { id: 'ID', region_name: 'Regional Name', region_code: 'Regional Code', code: 'Code', name: 'Name', branch_name: 'Branch Name', contract_number: 'Contract Number' };
                const pretty = (s) => String(s).replace(/_/g, ' ').replace(/\b\w/g, ch => ch.toUpperCase());
                // when active is Regional, show 'Regional Name' instead of generic 'Name'
                const label = (c === 'name' && active === 'Regional') ? 'Regional Name' : (labelMap[c] || pretty(c));
                return <th key={c}>{label}</th>;
              })}
              {(active === 'Branches' || active === 'Regional' || active === 'Areas' || active === 'Director' || active === 'Contract' || active === 'Branch Manager') && <th>Actions</th>}
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
                              // branch_code field removed (not present in DB)
                              street_name: row.street_name || '',
                              subdistrict: row.subdistrict || '',
                              district: row.district || '',
                              city: row.city || '',
                              province: row.province || ''
                            });
                            setShowModal(true);
                          }}
                          title="Edit"
                          aria-label={`Edit ${row.branch_name || ''}`}
                          className="action-btn branch-action-btn"
                          style={{ marginRight: 8 }}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z" fill="#0a1e3d" />
                            <path d="M20.71 7.04a1.003 1.003 0 0 0 0-1.42l-2.34-2.34a1.003 1.003 0 0 0-1.42 0l-1.83 1.83 3.75 3.75 1.84-1.82z" fill="#0a1e3d" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDeleteBranch(row)}
                          title="Delete"
                          aria-label={`Delete ${row.branch_name || ''}`}
                          className="action-btn branch-action-btn"
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
                          title="Edit"
                          aria-label={`Edit ${row.name || ''}`}
                          className="action-btn branch-action-btn"
                          style={{ marginRight: 8 }}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z" fill="#0a1e3d" />
                            <path d="M20.71 7.04a1.003 1.003 0 0 0 0-1.42l-2.34-2.34a1.003 1.003 0 0 0-1.42 0l-1.83 1.83 3.75 3.75 1.84-1.82z" fill="#0a1e3d" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDeleteRegion(row)}
                          title="Delete"
                          aria-label={`Delete ${row.name || ''}`}
                          className="action-btn branch-action-btn"
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
                          title="Edit"
                          aria-label={`Edit ${row.name || ''}`}
                          className="action-btn branch-action-btn"
                          style={{ marginRight: 8 }}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z" fill="#0a1e3d" />
                            <path d="M20.71 7.04a1.003 1.003 0 0 0 0-1.42l-2.34-2.34a1.003 1.003 0 0 0-1.42 0l-1.83 1.83 3.75 3.75 1.84-1.82z" fill="#0a1e3d" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDeleteArea(row)}
                          title="Delete"
                          aria-label={`Delete ${row.name || ''}`}
                          className="action-btn branch-action-btn"
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
                          title="Edit"
                          aria-label={`Edit ${row.name_of_director || ''}`}
                          className="action-btn branch-action-btn"
                          style={{ marginRight: 8 }}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z" fill="#0a1e3d" />
                            <path d="M20.71 7.04a1.003 1.003 0 0 0 0-1.42l-2.34-2.34a1.003 1.003 0 0 0-1.42 0l-1.83 1.83 3.75 3.75 1.84-1.82z" fill="#0a1e3d" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDeleteDirector(row)}
                          title="Delete"
                          aria-label={`Delete ${row.name_of_director || ''}`}
                          className="action-btn branch-action-btn"
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
                            setContractForm({ contract_number: row.contract_number || '', name_of_debtor: row.name_of_debtor || '', nik_number_of_debtor: row.nik_number_of_debtor || '', loan_amount: row.loan_amount || '' });
                            setShowContractModal(true);
                          }}
                          title="Edit"
                          aria-label={`Edit ${row.contract_number || ''}`}
                          className="action-btn branch-action-btn"
                          style={{ marginRight: 8 }}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z" fill="#0a1e3d" />
                            <path d="M20.71 7.04a1.003 1.003 0 0 0 0-1.42l-2.34-2.34a1.003 1.003 0 0 0-1.42 0l-1.83 1.83 3.75 3.75 1.84-1.82z" fill="#0a1e3d" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDeleteContract(row)}
                          title="Delete"
                          aria-label={`Delete ${row.contract_number || ''}`}
                          className="action-btn branch-action-btn"
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
                            setBmForm({ bm_id: row.bm_id || '', branches_id: row.branches_id || row.branchesId || '', name_of_bm: row.name_of_bm || row.name || '', nik_number_of_bm: row.nik_number_of_bm || '', phone_number_of_bm: row.phone_number_of_bm || '' });
                            setShowBMModal(true);
                          }}
                          title="Edit"
                          aria-label={`Edit ${row.name_of_bm || ''}`}
                          className="action-btn branch-action-btn"
                          style={{ marginRight: 8 }}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z" fill="#0a1e3d" />
                            <path d="M20.71 7.04a1.003 1.003 0 0 0 0-1.42l-2.34-2.34a1.003 1.003 0 0 0-1.42 0l-1.83 1.83 3.75 3.75 1.84-1.82z" fill="#0a1e3d" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDeleteBM(row)}
                          title="Delete"
                          aria-label={`Delete ${row.name_of_bm || ''}`}
                          className="action-btn branch-action-btn"
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
            <div>Showing {start + 1}-{Math.min(start + pageSize, total)} of {total}</div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }} style={{ padding: '6px 8px', border: '1px solid #ddd', borderRadius: 6 }}>
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
              </select>
              <button className="pagination-btn" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={current <= 1} aria-label="Previous page">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                  <path d="M15 18L9 12L15 6" stroke="#0a1e3d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Prev
              </button>
              <div className="pagination-indicator">{current} / {totalPages}</div>
              <button className="pagination-btn" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={current >= totalPages} aria-label="Next page">
                Next
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

  

  // Branches CRUD handlers (used by modal)
  const submitBranchForm = async () => {
    try {
        if (modalMode === 'create') {
        await requestWithAuth({ method: 'post', url: '/api/master-data/branches/', data: branchForm });
      } else if (modalMode === 'edit' && editingId) {
        await requestWithAuth({ method: 'patch', url: `/api/master-data/branches/${editingId}/`, data: branchForm });
      }
      setShowModal(false);
      // reload branches
      const res = await requestWithAuth({ method: 'get', url: '/api/master-data/branches/' });
      setData(res.data?.branches || res.data || []);
    } catch (err) { console.error('Save branch failed', err); alert('Save failed'); }
  };

  const handleDeleteBranch = async (row) => {
    if (!row) return;
    const id = row.id || row.branch_id || row.branchId || null;
    if (!id) return;
    if (!window.confirm(`Delete this branch ${row.branch_name || row.name || ''}?`)) return;
    try {
      setError('');
      await requestWithAuth({ method: 'delete', url: `/api/master-data/branches/${id}/` });
      const res = await requestWithAuth({ method: 'get', url: '/api/master-data/branches/' });
      setData(res.data?.branches || res.data || []);
      toast.success('Branch deleted');
    
    } catch (err) {
      console.error('Delete failed', err);
      const msg = err?.response?.data?.error || 'Delete failed';
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
    } catch (err) { console.error('Save region failed', err); alert('Save failed'); }
  };

  const handleDeleteRegion = async (row) => {
    if (!row) return;
    const id = row.id || row.region_id || null;
    if (!id) return;
    if (!window.confirm(`Delete this region ${row.name || ''}?`)) return;
    try {
      setError('');
      await requestWithAuth({ method: 'delete', url: `http://localhost:8000/api/regions/${id}/` });
      const res = await requestWithAuth({ method: 'get', url: 'http://localhost:8000/api/regions/' });
      setData(res.data?.regions || res.data || []);
      toast.success('Region deleted');
    } catch (err) {
      console.error('Delete failed', err);
      const msg = err?.response?.data?.error || 'Delete failed';
      setError(msg);
      toast.error(msg);
    }
  };

  // Areas CRUD handlers
  const submitAreaForm = async () => {
    try {
        if (areaModalMode === 'create') {
        await requestWithAuth({ method: 'post', url: '/api/master-data/areas/', data: areaForm });
      } else if (areaModalMode === 'edit' && areaEditingId) {
        await requestWithAuth({ method: 'patch', url: `/api/master-data/areas/${areaEditingId}/`, data: areaForm });
      }
      setShowAreaModal(false);
      const res = await requestWithAuth({ method: 'get', url: '/api/master-data/areas/' });
      setData(res.data?.areas || res.data || []);
    } catch (err) { console.error('Save area failed', err); alert('Save failed'); }
  };

  const handleDeleteArea = async (row) => {
    if (!row) return;
    const id = row.id || row.area_id || null;
    if (!id) return;
    if (!window.confirm(`Delete this area ${row.name || ''}?`)) return;
    try {
      setError('');
      await requestWithAuth({ method: 'delete', url: `http://localhost:8000/api/areas/${id}/` });
      const res = await requestWithAuth({ method: 'get', url: 'http://localhost:8000/api/areas/' });
      setData(res.data?.areas || res.data || []);
      toast.success('Area deleted');
    } catch (err) {
      console.error('Delete failed', err);
      const msg = err?.response?.data?.error || 'Delete failed';
      setError(msg);
      toast.error(msg);
    }
  };

  // Director CRUD handlers
  const submitDirectorForm = async () => {
    try {
      if (directorModalMode === 'create') {
        await requestWithAuth({ method: 'post', url: 'http://localhost:8000/api/directors/', data: directorForm });
      } else if (directorModalMode === 'edit' && directorEditingId) {
        await requestWithAuth({ method: 'patch', url: `http://localhost:8000/api/directors/${directorEditingId}/`, data: directorForm });
      }
      setShowDirectorModal(false);
      const res = await requestWithAuth({ method: 'get', url: 'http://localhost:8000/api/directors/' });
      setData(res.data?.directors || res.data || []);
    } catch (err) { console.error('Save director failed', err); alert('Save failed'); }
  };

  const handleDeleteDirector = async (row) => {
    if (!row) return;
    const id = row.director_id || row.id || null;
    if (!id) return;
    if (!window.confirm(`Delete this director ${row.name_of_director || ''}?`)) return;
    try {
      setError('');
      await requestWithAuth({ method: 'delete', url: `http://localhost:8000/api/directors/${id}/` });
      const res = await requestWithAuth({ method: 'get', url: 'http://localhost:8000/api/directors/' });
      setData(res.data?.directors || res.data || []);
      toast.success('Director deleted');
    } catch (err) {
      console.error('Delete failed', err);
      const msg = err?.response?.data?.error || 'Delete failed';
      setError(msg);
      toast.error(msg);
    }
  };

  // Contract CRUD handlers
  const submitContractForm = async () => {
    try {
      if (contractModalMode === 'create') {
        await requestWithAuth({ method: 'post', url: 'http://localhost:8000/api/contracts/', data: contractForm });
      } else if (contractModalMode === 'edit' && contractEditingId) {
        await requestWithAuth({ method: 'patch', url: `http://localhost:8000/api/contracts/${contractEditingId}/`, data: contractForm });
      }
      setShowContractModal(false);
      const res = await requestWithAuth({ method: 'get', url: 'http://localhost:8000/api/contracts/table/' });
      setData(res.data?.contracts || res.data || []);
    } catch (err) { console.error('Save contract failed', err); alert('Save failed'); }
  };

  const handleDeleteContract = async (row) => {
    if (!row) return;
    const id = row.contract_id || row.id || row.contractId || null;
    if (!id) return;
    if (!window.confirm(`Delete this contract ${row.contract_number || ''}?`)) return;
    try {
      setError('');
      await requestWithAuth({ method: 'delete', url: `http://localhost:8000/api/contracts/${id}/` });
      const res = await requestWithAuth({ method: 'get', url: 'http://localhost:8000/api/contracts/table/' });
      setData(res.data?.contracts || res.data || []);
      toast.success('Contract deleted');
    } catch (err) {
      console.error('Delete failed', err);
      const msg = err?.response?.data?.error || 'Delete failed';
      setError(msg);
      toast.error(msg);
    }
  };

  // Branch Manager CRUD handlers
  const submitBMForm = async () => {
    try {
      if (bmModalMode === 'create') {
        await requestWithAuth({ method: 'post', url: 'http://localhost:8000/api/branch-manager-crud/', data: bmForm });
      } else if (bmModalMode === 'edit' && bmEditingId) {
        await requestWithAuth({ method: 'patch', url: `http://localhost:8000/api/branch-manager-crud/${bmEditingId}/`, data: bmForm });
      }
      setShowBMModal(false);
      const res = await requestWithAuth({ method: 'get', url: 'http://localhost:8000/api/branch-manager/' });
      setData(res.data?.bm || res.data || []);
    } catch (err) { console.error('Save branch manager failed', err); alert('Save failed'); }
  };

  const handleDeleteBM = async (row) => {
    if (!row) return;
    const id = row.bm_id || row.id || null;
    if (!id) return;
    if (!window.confirm(`Delete this branch manager ${row.name_of_bm || ''}?`)) return;
    try {
      setError('');
      await requestWithAuth({ method: 'delete', url: `http://localhost:8000/api/branch-manager-crud/${id}/` });
      const res = await requestWithAuth({ method: 'get', url: 'http://localhost:8000/api/branch-manager/' });
      setData(res.data?.bm || res.data || []);
      toast.success('Branch Manager deleted');
    } catch (err) {
      console.error('Delete failed', err);
      const msg = err?.response?.data?.error || 'Delete failed';
      setError(msg);
      toast.error(msg);
    }
  };

  return (
    <div className="content-section">
      <h2>Master Data</h2>

      <div style={{ marginTop: 12, marginBottom: 16, display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
        {tabs.map(t => (
          <button key={t} onClick={() => setActive(t)} style={tabBtnStyle(t)} aria-pressed={active === t}>{t}</button>
        ))}
      </div>

      <div style={{ padding: 12, border: '1px solid #e6e6e6', borderRadius: 6, minHeight: 220, background: 'transparent' }}>
        {renderTable()}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{modalMode === 'create' ? 'Add Branch' : 'Edit Branch'}</h3>
              <button className="modal-close-btn" onClick={() => setShowModal(false)}>&times;</button>
            </div>
            <div style={{ padding: 20, minWidth: 560 }}>
              <form onSubmit={e => { e.preventDefault(); submitBranchForm(); }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <label style={{ fontSize: 13, fontWeight: 600, color: '#333', marginBottom: 6 }}>Area ID</label>
                    <input style={{ padding: '10px 12px', fontSize: 14, border: '1px solid #ddd', borderRadius: 6 }} value={branchForm.area_id} onChange={(e) => setBranchForm(prev => ({ ...prev, area_id: e.target.value }))} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <label style={{ fontSize: 13, fontWeight: 600, color: '#333', marginBottom: 6 }}>BM ID</label>
                    <input style={{ padding: '10px 12px', fontSize: 14, border: '1px solid #ddd', borderRadius: 6 }} value={branchForm.bm_id} onChange={(e) => setBranchForm(prev => ({ ...prev, bm_id: e.target.value }))} />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <label style={{ fontSize: 13, fontWeight: 600, color: '#333', marginBottom: 6 }}>Name</label>
                    <input style={{ padding: '10px 12px', fontSize: 14, border: '1px solid #ddd', borderRadius: 6 }} value={branchForm.name} onChange={(e) => setBranchForm(prev => ({ ...prev, name: e.target.value }))} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <label style={{ fontSize: 13, fontWeight: 600, color: '#333', marginBottom: 6 }}>Code</label>
                    <input style={{ padding: '10px 12px', fontSize: 14, border: '1px solid #ddd', borderRadius: 6 }} value={branchForm.code} onChange={(e) => setBranchForm(prev => ({ ...prev, code: e.target.value }))} />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <label style={{ fontSize: 13, fontWeight: 600, color: '#333', marginBottom: 6 }}>Street Name</label>
                    <input style={{ padding: '10px 12px', fontSize: 14, border: '1px solid #ddd', borderRadius: 6 }} value={branchForm.street_name} onChange={(e) => setBranchForm(prev => ({ ...prev, street_name: e.target.value }))} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <label style={{ fontSize: 13, fontWeight: 600, color: '#333', marginBottom: 6 }}>Subdistrict</label>
                    <input style={{ padding: '10px 12px', fontSize: 14, border: '1px solid #ddd', borderRadius: 6 }} value={branchForm.subdistrict} onChange={(e) => setBranchForm(prev => ({ ...prev, subdistrict: e.target.value }))} />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <label style={{ fontSize: 13, fontWeight: 600, color: '#333', marginBottom: 6 }}>District</label>
                    <input style={{ padding: '10px 12px', fontSize: 14, border: '1px solid #ddd', borderRadius: 6 }} value={branchForm.district} onChange={(e) => setBranchForm(prev => ({ ...prev, district: e.target.value }))} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <label style={{ fontSize: 13, fontWeight: 600, color: '#333', marginBottom: 6 }}>City</label>
                    <input style={{ padding: '10px 12px', fontSize: 14, border: '1px solid #ddd', borderRadius: 6 }} value={branchForm.city} onChange={(e) => setBranchForm(prev => ({ ...prev, city: e.target.value }))} />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <label style={{ fontSize: 13, fontWeight: 600, color: '#333', marginBottom: 6 }}>Province</label>
                    <input style={{ padding: '10px 12px', fontSize: 14, border: '1px solid #ddd', borderRadius: 6 }} value={branchForm.province} onChange={(e) => setBranchForm(prev => ({ ...prev, province: e.target.value }))} />
                  </div>
                  {/* Branch Code removed: not present in database */}
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
                  <button type="submit" className="btn-primary">{modalMode === 'create' ? 'Create' : 'Update'}</button>
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
              <h3 className="modal-title">{regionModalMode === 'create' ? 'Add Region' : 'Edit Region'}</h3>
              <button className="modal-close-btn" onClick={() => setShowRegionModal(false)}>&times;</button>
            </div>
            <div style={{ padding: 20, minWidth: 560 }}>
              <form onSubmit={e => { e.preventDefault(); submitRegionForm(); }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <label style={{ fontSize: 13, fontWeight: 600, color: '#333', marginBottom: 6 }}>Name</label>
                    <input style={{ padding: '10px 12px', fontSize: 14, border: '1px solid #ddd', borderRadius: 6 }} value={regionForm.name} onChange={(e) => setRegionForm(prev => ({ ...prev, name: e.target.value }))} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <label style={{ fontSize: 13, fontWeight: 600, color: '#333', marginBottom: 6 }}>Code</label>
                    <input style={{ padding: '10px 12px', fontSize: 14, border: '1px solid #ddd', borderRadius: 6 }} value={regionForm.code} onChange={(e) => setRegionForm(prev => ({ ...prev, code: e.target.value }))} />
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
                  <button type="submit" className="btn-primary">{regionModalMode === 'create' ? 'Create' : 'Update'}</button>
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
              <h3 className="modal-title">{areaModalMode === 'create' ? 'Add Area' : 'Edit Area'}</h3>
              <button className="modal-close-btn" onClick={() => setShowAreaModal(false)}>&times;</button>
            </div>
            <div style={{ padding: 20, minWidth: 560 }}>
              <form onSubmit={e => { e.preventDefault(); submitAreaForm(); }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <label style={{ fontSize: 13, fontWeight: 600, color: '#333', marginBottom: 6 }}>Region ID</label>
                    <input style={{ padding: '10px 12px', fontSize: 14, border: '1px solid #ddd', borderRadius: 6 }} value={areaForm.region_id} onChange={(e) => setAreaForm(prev => ({ ...prev, region_id: e.target.value }))} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <label style={{ fontSize: 13, fontWeight: 600, color: '#333', marginBottom: 6 }}>Code</label>
                    <input style={{ padding: '10px 12px', fontSize: 14, border: '1px solid #ddd', borderRadius: 6 }} value={areaForm.code} onChange={(e) => setAreaForm(prev => ({ ...prev, code: e.target.value }))} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <label style={{ fontSize: 13, fontWeight: 600, color: '#333', marginBottom: 6 }}>Name</label>
                    <input style={{ padding: '10px 12px', fontSize: 14, border: '1px solid #ddd', borderRadius: 6 }} value={areaForm.name} onChange={(e) => setAreaForm(prev => ({ ...prev, name: e.target.value }))} />
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
                  <button type="submit" className="btn-primary">{areaModalMode === 'create' ? 'Create' : 'Update'}</button>
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
              <h3 className="modal-title">{directorModalMode === 'create' ? 'Add Director' : 'Edit Director'}</h3>
              <button className="modal-close-btn" onClick={() => setShowDirectorModal(false)}>&times;</button>
            </div>
            <div style={{ padding: 20, minWidth: 560 }}>
              <form onSubmit={e => { e.preventDefault(); submitDirectorForm(); }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <label style={{ fontSize: 13, fontWeight: 600, color: '#333', marginBottom: 6 }}>Name</label>
                    <input style={{ padding: '10px 12px', fontSize: 14, border: '1px solid #ddd', borderRadius: 6 }} value={directorForm.name_of_director} onChange={(e) => setDirectorForm(prev => ({ ...prev, name_of_director: e.target.value }))} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <label style={{ fontSize: 13, fontWeight: 600, color: '#333', marginBottom: 6 }}>Phone</label>
                    <input style={{ padding: '10px 12px', fontSize: 14, border: '1px solid #ddd', borderRadius: 6 }} value={directorForm.phone_number_of_lolc} onChange={(e) => setDirectorForm(prev => ({ ...prev, phone_number_of_lolc: e.target.value }))} />
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
                  <button type="submit" className="btn-primary">{directorModalMode === 'create' ? 'Create' : 'Update'}</button>
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
              <h3 className="modal-title">{contractModalMode === 'create' ? 'Add Contract' : 'Edit Contract'}</h3>
              <button className="modal-close-btn" onClick={() => setShowContractModal(false)}>&times;</button>
            </div>
            <div style={{ padding: 20, minWidth: 560 }}>
              <form onSubmit={e => { e.preventDefault(); submitContractForm(); }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <label style={{ fontSize: 13, fontWeight: 600, color: '#333', marginBottom: 6 }}>Contract Number</label>
                    <input style={{ padding: '10px 12px', fontSize: 14, border: '1px solid #ddd', borderRadius: 6 }} value={contractForm.contract_number} onChange={(e) => setContractForm(prev => ({ ...prev, contract_number: e.target.value }))} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <label style={{ fontSize: 13, fontWeight: 600, color: '#333', marginBottom: 6 }}>Name of Debtor</label>
                    <input style={{ padding: '10px 12px', fontSize: 14, border: '1px solid #ddd', borderRadius: 6 }} value={contractForm.name_of_debtor} onChange={(e) => setContractForm(prev => ({ ...prev, name_of_debtor: e.target.value }))} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <label style={{ fontSize: 13, fontWeight: 600, color: '#333', marginBottom: 6 }}>NIK</label>
                    <input style={{ padding: '10px 12px', fontSize: 14, border: '1px solid #ddd', borderRadius: 6 }} value={contractForm.nik_number_of_debtor} onChange={(e) => setContractForm(prev => ({ ...prev, nik_number_of_debtor: e.target.value }))} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <label style={{ fontSize: 13, fontWeight: 600, color: '#333', marginBottom: 6 }}>Loan Amount</label>
                    <input style={{ padding: '10px 12px', fontSize: 14, border: '1px solid #ddd', borderRadius: 6 }} value={contractForm.loan_amount} onChange={(e) => setContractForm(prev => ({ ...prev, loan_amount: e.target.value }))} />
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
                  <button type="submit" className="btn-primary">{contractModalMode === 'create' ? 'Create' : 'Update'}</button>
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
              <h3 className="modal-title">{bmModalMode === 'create' ? 'Add Branch Manager' : 'Edit Branch Manager'}</h3>
              <button className="modal-close-btn" onClick={() => setShowBMModal(false)}>&times;</button>
            </div>
            <div style={{ padding: 20, minWidth: 560 }}>
              <form onSubmit={e => { e.preventDefault(); submitBMForm(); }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <label style={{ fontSize: 13, fontWeight: 600, color: '#333', marginBottom: 6 }}>BM ID</label>
                    <input style={{ padding: '10px 12px', fontSize: 14, border: '1px solid #ddd', borderRadius: 6 }} value={bmForm.bm_id} onChange={(e) => setBmForm(prev => ({ ...prev, bm_id: e.target.value }))} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <label style={{ fontSize: 13, fontWeight: 600, color: '#333', marginBottom: 6 }}>Branches ID</label>
                    <input style={{ padding: '10px 12px', fontSize: 14, border: '1px solid #ddd', borderRadius: 6 }} value={bmForm.branches_id} onChange={(e) => setBmForm(prev => ({ ...prev, branches_id: e.target.value }))} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <label style={{ fontSize: 13, fontWeight: 600, color: '#333', marginBottom: 6 }}>Name</label>
                    <input style={{ padding: '10px 12px', fontSize: 14, border: '1px solid #ddd', borderRadius: 6 }} value={bmForm.name_of_bm} onChange={(e) => setBmForm(prev => ({ ...prev, name_of_bm: e.target.value }))} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <label style={{ fontSize: 13, fontWeight: 600, color: '#333', marginBottom: 6 }}>NIK</label>
                    <input style={{ padding: '10px 12px', fontSize: 14, border: '1px solid #ddd', borderRadius: 6 }} value={bmForm.nik_number_of_bm} onChange={(e) => setBmForm(prev => ({ ...prev, nik_number_of_bm: e.target.value }))} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <label style={{ fontSize: 13, fontWeight: 600, color: '#333', marginBottom: 6 }}>Phone</label>
                    <input style={{ padding: '10px 12px', fontSize: 14, border: '1px solid #ddd', borderRadius: 6 }} value={bmForm.phone_number_of_bm} onChange={(e) => setBmForm(prev => ({ ...prev, phone_number_of_bm: e.target.value }))} />
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
                  <button type="submit" className="btn-primary">{bmModalMode === 'create' ? 'Create' : 'Update'}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

