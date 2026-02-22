import React, { useState, useEffect } from 'react';
import { requestWithAuth } from '../utils/api';
import { toast } from 'react-toastify';
import './UserManagement/UserManagement.css';

const tabs = ['Regional','Areas','Branches','Director','Branch Manager','Contract','BL Collateral','UV Collateral'];

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
  const [branchForm, setBranchForm] = useState({ branch_name: '', area_id: '', bm_id: '', name: '', code: '', branch_code: '', street_name: '', subdistrict: '', district: '', city: '', province: '' });
  const [editingId, setEditingId] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  // (no confirmation modal) 

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true); setError(''); setData([]);
      try {
        let url = '';
        switch (active) {
          case 'Regional': url = 'http://localhost:8000/api/regions/'; break;
          case 'Areas': url = 'http://localhost:8000/api/areas/'; break;
          case 'Branches': url = 'http://localhost:8000/api/branches/'; break;
          case 'Director': url = 'http://localhost:8000/api/directors/'; break;
          case 'Branch Manager': url = 'http://localhost:8000/api/branch-manager/'; break;
          case 'Contract': url = 'http://localhost:8000/api/contracts/table/'; break;
          case 'BL Collateral': url = 'http://localhost:8000/api/bl-collateral/'; break;
          case 'UV Collateral': url = 'http://localhost:8000/api/uv-collateral/'; break;
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
      return String(r.branch_name || r.name || r.region_name || r.contract_number || r.city || r.branch_code || r.code || '').toLowerCase().includes(q);
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
        {active === 'Branches' && (
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, background: 'inherit', padding: 8, borderRadius: 6 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input placeholder="Search..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} style={{ padding: '6px 8px', border: '1px solid #ddd', borderRadius: 6, background: 'inherit' }} />
            </div>
            <div>
              <button className="btn-primary" onClick={() => { setModalMode('create'); setEditingId(null); setBranchForm({ branch_name: '', area_id: '', bm_id: '', name: '', code: '', branch_code: '', street_name: '', subdistrict: '', district: '', city: '', province: '' }); setShowModal(true); }}>Add Branch</button>
            </div>
          </div>
        )}

        <table className={`user-table ${active === 'Branches' ? 'branches-table' : ''}`} style={{ background: 'transparent' }}>
          <thead>
            <tr>
              {cols.map(c => {
                const labelMap = { id: 'ID', region_name: 'Regional Name', region_code: 'Regional Code', code: 'Code', name: 'Name', branch_name: 'Branch Name', contract_number: 'Contract Number' };
                const pretty = (s) => String(s).replace(/_/g, ' ').replace(/\b\w/g, ch => ch.toUpperCase());
                // when active is Regional, show 'Regional Name' instead of generic 'Name'
                const label = (c === 'name' && active === 'Regional') ? 'Regional Name' : (labelMap[c] || pretty(c));
                return <th key={c}>{label}</th>;
              })}
              {active === 'Branches' && <th>Actions</th>}
              {active === 'Contract' && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {paged.map((row, i) => (
              <tr key={i}>
                {cols.map(c => <td key={c}>{String(getCellValue(row, c) ?? '')}</td>)}
                {active === 'Branches' && (
                  <td>
                    <button
                      onClick={() => {
                        setModalMode('edit');
                        setEditingId(row.id);
                        setBranchForm({
                          branch_name: row.branch_name || row.name || '',
                          area_id: row.area_id || '',
                          bm_id: row.bm_id || row.bmId || '',
                          name: row.name || row.branch_name || '',
                          code: row.code || row.branch_code || '',
                          branch_code: row.branch_code || row.code || '',
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
                  </td>
                )}
                {active === 'Contract' && (
                  <td>
                    {(() => {
                      const rowId = row.contract_id || row.id || row.contractId || null;
                      if (!rowId) return null;
                      if (confirmDeleteId === rowId) {
                        return (
                          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            <span>Yakin akan menghapus?</span>
                            <button className="action-btn" onClick={() => setConfirmDeleteId(null)}>Cancel</button>
                            <button className="btn-primary" onClick={async () => {
                              try {
                                await requestWithAuth({ method: 'delete', url: `http://localhost:8000/api/contracts/${rowId}/` });
                                const res = await requestWithAuth({ method: 'get', url: 'http://localhost:8000/api/contracts/table/' });
                                setData(res.data?.contracts || res.data || []);
                                setConfirmDeleteId(null);
                              } catch (err) { console.error('Delete failed', err); alert('Delete failed'); }
                            }}>Delete</button>
                          </div>
                        );
                      }
                      return (
                        <button className="action-btn" onClick={() => setConfirmDeleteId(rowId)}>Delete</button>
                      );
                    })()}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>

        {active === 'Branches' && (
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
        await requestWithAuth({ method: 'post', url: 'http://localhost:8000/api/branches/', data: branchForm });
      } else if (modalMode === 'edit' && editingId) {
        await requestWithAuth({ method: 'patch', url: `http://localhost:8000/api/branches/${editingId}/`, data: branchForm });
      }
      setShowModal(false);
      // reload branches
      const res = await requestWithAuth({ method: 'get', url: 'http://localhost:8000/api/branches/' });
      setData(res.data?.branches || res.data || []);
    } catch (err) { console.error('Save branch failed', err); alert('Save failed'); }
  };

  const handleDeleteBranch = async (row) => {
    if (!row || !row.id) return;
    if (!window.confirm(`Delete this branch ${row.branch_name || row.name || ''}?`)) return;
    try {
      setError('');
      await requestWithAuth({ method: 'delete', url: `http://localhost:8000/api/branches/${row.id}/` });
      const res = await requestWithAuth({ method: 'get', url: 'http://localhost:8000/api/branches/' });
      setData(res.data?.branches || res.data || []);
      toast.success('Branch deleted');
    
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
            <div className="modal-form">
              <form className="user-form" onSubmit={e => { e.preventDefault(); submitBranchForm(); }}>
                <div className="form-group">
                  <label>Area ID</label>
                  <input value={branchForm.area_id} onChange={(e) => setBranchForm(prev => ({ ...prev, area_id: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label>BM ID</label>
                  <input value={branchForm.bm_id} onChange={(e) => setBranchForm(prev => ({ ...prev, bm_id: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label>Name</label>
                  <input value={branchForm.name} onChange={(e) => setBranchForm(prev => ({ ...prev, name: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label>Code</label>
                  <input value={branchForm.code} onChange={(e) => setBranchForm(prev => ({ ...prev, code: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label>Street Name</label>
                  <input value={branchForm.street_name} onChange={(e) => setBranchForm(prev => ({ ...prev, street_name: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label>Subdistrict</label>
                  <input value={branchForm.subdistrict} onChange={(e) => setBranchForm(prev => ({ ...prev, subdistrict: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label>District</label>
                  <input value={branchForm.district} onChange={(e) => setBranchForm(prev => ({ ...prev, district: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label>City</label>
                  <input value={branchForm.city} onChange={(e) => setBranchForm(prev => ({ ...prev, city: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label>Province</label>
                  <input value={branchForm.province} onChange={(e) => setBranchForm(prev => ({ ...prev, province: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label>Branch Code</label>
                  <input value={branchForm.branch_code} onChange={(e) => setBranchForm(prev => ({ ...prev, branch_code: e.target.value }))} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
                  <button type="submit" className="btn-primary">{modalMode === 'create' ? 'Create' : 'Update'}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

