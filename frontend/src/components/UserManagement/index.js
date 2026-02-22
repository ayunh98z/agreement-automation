import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { requestWithAuth } from '../../utils/api';
import './UserManagement.css';

function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('new'); // 'new' atau 'edit'
  const [editingUserId, setEditingUserId] = useState(null);
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    username: '',
    password: '',
    employee_id: '',
    phone: '',
    role: 'User',
    region_id: '',
    area_id: '',
    branch_id: '',
    is_active: true
  });
  const [regions, setRegions] = useState([]);
  const [areas, setAreas] = useState([]);
  const [branches, setBranches] = useState([]);
  const [branchMap, setBranchMap] = useState({});
  const [submitLoading, setSubmitLoading] = useState(false);
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const API_BASE_URL = 'http://localhost:8000/api';

  // Muat daftar user dan data dropdown saat komponen dimount
  const loadAllBranches = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/branches/`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      });
      const all = response.data.branches || [];
      const map = {};
      all.forEach(b => { map[b.id] = b.name; });
      setBranchMap(map);
    } catch (err) {
      console.error('Error loading all branches:', err);
      setBranchMap({});
    }
  };

  useEffect(() => {
    loadUsers();
    loadRegions();
    loadAllBranches();
    // Jangan muat semua area/branch di awal; akan dimuat berdasarkan pilihan atau saat mengedit

    // Determine current user's role from localStorage so we can hide/disable actions
    try {
      const raw = localStorage.getItem('user_data');
      if (raw) {
        const parsed = JSON.parse(raw);
        const r = (parsed.role || parsed.role_name || parsed.role_name_display || '').toString().trim();
        setIsAdminUser(r.toLowerCase().includes('admin'));
      }
    } catch (e) { /* ignore */ }
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('access_token');
      console.log('Loading users with token:', token ? 'Present' : 'Missing');
      console.log('API URL:', `${API_BASE_URL}/users/`);
      
      const response = await axios.get(`${API_BASE_URL}/users/`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log('Users loaded successfully:', response.data);
      const rawUsers = response.data.users || response.data || [];
      // Sort users by full_name (case-insensitive) for display
      rawUsers.sort((a, b) => {
        const na = (a.full_name || '').toString().toLowerCase();
        const nb = (b.full_name || '').toString().toLowerCase();
        return na.localeCompare(nb);
      });
      setUsers(rawUsers);
      setError('');
    } catch (err) {
      console.error('Error loading users:', err);
      
      let errorMessage = 'Failed to load user list';
      if (err.response?.status === 401) {
        errorMessage = 'Token tidak valid atau sudah expired. Silakan login kembali.';
      } else if (err.response?.status === 403) {
        errorMessage = 'Anda tidak memiliki akses ke fitur ini.';
      } else if (err.response?.status === 404) {
        errorMessage = 'API endpoint tidak ditemukan. Pastikan backend berjalan dengan baik.';
      } else if (err.message === 'Network Error') {
        errorMessage = 'Tidak dapat terhubung ke server. Pastikan backend berjalan di localhost:8000';
      } else if (err.response?.data?.error) {
        errorMessage = err.response.data.error;
      } else if (err.response?.data?.detail) {
        errorMessage = err.response.data.detail;
      }
      
      console.error('Full error details:', {
        status: err.response?.status,
        statusText: err.response?.statusText,
        data: err.response?.data,
        message: err.message
      });
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const loadRegions = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/regions/`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      });
      console.log('Regions loaded:', response.data);
      setRegions(response.data.regions || []);
    } catch (err) {
      console.error('Error loading regions:', err);
    }
  };

  const loadAreas = async (regionId) => {
    try {
      const params = regionId ? { params: { region_id: regionId } } : {};
      const response = await axios.get(`${API_BASE_URL}/areas/`, {
        ...(params),
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      });
      console.log('Areas loaded:', response.data, 'for region:', regionId);
      setAreas(response.data.areas || []);
    } catch (err) {
      console.error('Error loading areas:', err);
      setAreas([]);
    }
  };

  const loadBranches = async (areaId) => {
    try {
      const params = areaId ? { params: { area_id: areaId } } : {};
      const response = await axios.get(`${API_BASE_URL}/branches/`, {
        ...(params),
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      });
      console.log('Branches loaded:', response.data, 'for area:', areaId);
      setBranches(response.data.branches || []);
    } catch (err) {
      console.error('Error loading branches:', err);
      setBranches([]);
    }
  };

  

  const uniqueRoles = () => {
    const setRoles = new Set();
    users.forEach(u => { if (u.role) setRoles.add(u.role); });
    return Array.from(setRoles).sort();
  };

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
    setPage(1);
  };

  const handleRoleFilterChange = (e) => {
    setRoleFilter(e.target.value);
    setPage(1);
  };

  const handleStatusFilterChange = (e) => {
    setStatusFilter(e.target.value);
    setPage(1);
  };

  // Filter area berdasarkan region yang dipilih (fungsi dihapus karena tidak digunakan)

  // Filter cabang berdasarkan area yang dipilih
  // Catatan: `getFilteredBranches` dihapus karena tidak direferensikan di tempat lain.

  const openNewUserModal = () => {
    setModalMode('new');
    setEditingUserId(null);
    setFormData({
      full_name: '',
      email: '',
      username: '',
      password: '',
      employee_id: '',
      phone: '',
      role: 'User',
      region_id: '',
      area_id: '',
      branch_id: '',
      is_active: true
    });
    setAreas([]);
    setBranches([]);
    setShowModal(true);
  };

  const openEditUserModal = async (user) => {
    setModalMode('edit');
    setEditingUserId(user.id);
    // Normalize is_active so numeric/string/bool values are handled correctly
    const normalizedIsActive = (() => {
      try {
        if (typeof user.is_active === 'undefined' || user.is_active === null) return true;
        const s = String(user.is_active).toLowerCase();
        if (s === '0' || s === 'false') return false;
        return true;
      } catch (e) { return true; }
    })();

    setFormData({
      full_name: user.full_name || '',
      email: user.email || '',
      username: user.username || '',
      password: '', // Jangan isi password saat edit
      employee_id: user.employee_id || '',
      phone: user.phone || '',
      role: user.role || 'User',
      region_id: user.region_id || '',
      area_id: user.area_id || '',
      branch_id: user.branch_id || '',
      is_active: normalizedIsActive
    });
    // Data sudah loaded pada component mount
    // Muat daftar tergantung untuk edit
    if (user.region_id) {
      // pastikan areas terisi sebelum mencoba load branches
      await loadAreas(user.region_id);
    }
    if (user.area_id) {
      await loadBranches(user.area_id);
    }
    setShowModal(true);
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));

    // Muat dropdown tergantung
    if (name === 'region_id') {
      loadAreas(value);
      // Reset area dan branch saat region berubah
      setFormData(prev => ({
        ...prev,
        area_id: '',
        branch_id: ''
      }));
      setBranches([]);
    }
    if (name === 'area_id') {
      loadBranches(value);
      // Reset branch saat area berubah
      setFormData(prev => ({
        ...prev,
        branch_id: ''
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitLoading(true);
    try {
      const payload = { ...formData };
      // Convert boolean is_active to 1/0 for backend auth_user.is_active
      if (typeof payload.is_active !== 'undefined') payload.is_active = payload.is_active ? 1 : 0;
      
      // Sertakan password hanya jika disediakan (untuk user baru atau saat mengganti password)
      if (!payload.password) {
        delete payload.password;
      }

      if (modalMode === 'new') {
        // Untuk user baru, password wajib
        if (!formData.password) {
          setError('Password diperlukan untuk user baru');
          setSubmitLoading(false);
          return;
        }
        payload.password = formData.password;

        const response = await axios.post(`${API_BASE_URL}/users/`, payload, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`
          }
        });
        const saved = response.data.user || response.data;
        const newList = [...users, saved];
        newList.sort((a, b) => ((a.full_name || '') + '').toLowerCase().localeCompare(((b.full_name || '') + '').toLowerCase()));
        setUsers(newList);
        setError('');
      } else {
        // Edit user - kirim semua field agar di-update di backend
        const editPayload = {
          full_name: formData.full_name || '',
          email: formData.email || '',
          employee_id: formData.employee_id || '',
          phone: formData.phone || '',
          role: formData.role || 'User',
          region_id: formData.region_id || '',
          area_id: formData.area_id || '',
          branch_id: formData.branch_id || '',
          is_active: (typeof formData.is_active !== 'undefined') ? (formData.is_active ? 1 : 0) : 1
        };
        // Sertakan password hanya jika user mengisikan password baru
        if (formData.password) editPayload.password = formData.password;

        const response = await axios.put(`${API_BASE_URL}/users/${formData.username}/`, editPayload, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`
          }
        });
        const saved = response.data.user || response.data;
        const replaced = users.map(u => u.id === editingUserId ? saved : u);
        replaced.sort((a, b) => ((a.full_name || '') + '').toLowerCase().localeCompare(((b.full_name || '') + '').toLowerCase()));
        setUsers(replaced);
        setError('');
      }

      setShowModal(false);
      setFormData({
        full_name: '',
        email: '',
        username: '',
        password: '',
        employee_id: '',
        phone: '',
        role: 'User',
        region_id: '',
        area_id: '',
        branch_id: '',
        is_active: true
      });
    } catch (err) {
      console.error('Error submitting form:', err);
      setError(err.response?.data?.error || 'Failed to save user data');
    } finally {
      setSubmitLoading(false);
    }
  };

  const getStatusBadge = (isActive) => {
    // Treat undefined/null as active by default (backend should provide is_active)
    if (typeof isActive === 'undefined' || isActive === null) {
      return <span style={styles.statusActive}>Active</span>;
    }
    // Normalize common representations: numeric 1/0, boolean, or string '1'/'0'/'true'/'false'
    const s = String(isActive).toLowerCase();
    const active = !(s === '0' || s === 'false');
    return active ? <span style={styles.statusActive}>Active</span> : <span style={styles.statusInactive}>Inactive</span>;
  };

  if (loading) {
    return <div style={styles.container}>
      <div style={styles.loadingMessage}>
        <p>Loading data user...</p>
        <p style={{fontSize: '12px', color: '#999', marginTop: '10px'}}>
          Jika loading terlalu lama, periksa console (F12) untuk error details
        </p>
      </div>
    </div>;
  }

  // Compute filtered users and pagination values
  const q = searchQuery.trim().toLowerCase();
  const filteredUsers = users.filter(user => {
    if (q) {
      const hay = `${user.full_name || ''} ${user.email || ''} ${user.username || ''} ${user.employee_id || ''}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (roleFilter && roleFilter !== 'All') {
      if ((user.role || 'User') !== roleFilter) return false;
    }
    if (statusFilter && statusFilter !== 'All') {
      const s = String(user.is_active).toLowerCase();
      const active = !(s === '0' || s === 'false');
      if (statusFilter === 'Active' && !active) return false;
      if (statusFilter === 'Inactive' && active) return false;
    }
    return true;
  });
  const total = filteredUsers.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.min(Math.max(1, page), totalPages);
  const start = (current - 1) * pageSize;
  const end = Math.min(start + pageSize, total);
  const pageItems = filteredUsers.slice(start, end);

  return (
    <div>
      <div className="content-section">
        <h2>User Management</h2>
      </div>

      <div style={styles.actionSection}>
        <div style={styles.filterRow}>
          <input
            type="text"
            placeholder="Search name, email, username..."
            value={searchQuery}
            onChange={handleSearchChange}
            style={styles.searchInput}
            aria-label="Search users"
          />
          <select value={roleFilter} onChange={handleRoleFilterChange} style={styles.filterSelect} aria-label="Filter by role">
            <option value="All">All Roles</option>
            {uniqueRoles().map(r => <option key={r} value={r}>{r}</option>)}
          </select>
          <select value={statusFilter} onChange={handleStatusFilterChange} style={styles.filterSelect} aria-label="Filter by status">
            <option value="All">All Status</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>
        <button onClick={openNewUserModal} style={{ ...styles.btnPrimary, opacity: isAdminUser ? 1 : 0.5, cursor: isAdminUser ? 'pointer' : 'not-allowed' }} disabled={!isAdminUser}>
          + New User
        </button>
      </div>

      {error && <div style={styles.errorMessage}>{error}</div>}

      <div style={styles.tableSection}>
        <table className="user-table agreements-table">
          <thead>
            <tr style={styles.headerRow}>
              <th style={styles.th}>Full Name</th>
              <th style={styles.th}>Email</th>
              <th style={styles.th}>Employee ID</th>
              <th style={styles.th}>Role</th>
              <th style={styles.th}>Branch</th>
              <th style={styles.th}>Status</th>
        
              <th style={styles.th}>Actions</th>
            </tr>
          </thead>
          <tbody>
              {users.length > 0 ? (
                pageItems.map((user) => (
                  <tr key={user.id} style={styles.bodyRow}>
                    <td style={styles.td}>{user.full_name || '-'}</td>
                    <td style={styles.td}>{user.email || '-'}</td>
                    <td style={styles.td}>{user.employee_id || '-'}</td>
                    <td style={styles.td}>
                      <span style={styles.roleBadge}>{user.role || 'User'}</span>
                    </td>
                    <td style={styles.td}>{(user.branch_id && branchMap[user.branch_id]) || user.branch_id || '-'}</td>
                    <td style={styles.td}>{getStatusBadge(user.is_active)}</td>
                    <td style={styles.td}>
                        {confirmDeleteId === user.id ? (
                          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            <span>Yakin akan menghapus?</span>
                            <button className="action-btn compact-action-btn" onClick={() => setConfirmDeleteId(null)}>Cancel</button>
                            <button className="btn-primary" onClick={async () => {
                              try {
                                await requestWithAuth({ method: 'delete', url: `http://localhost:8000/api/users/${encodeURIComponent(user.username)}/` });
                                await loadUsers();
                                setConfirmDeleteId(null);
                              } catch (err) {
                                console.error('Delete user failed', err);
                                alert('Delete failed');
                              }
                            }}>Delete</button>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            <button 
                              onClick={() => openEditUserModal(user)}
                              className="action-btn compact-action-btn"
                              style={{ opacity: isAdminUser ? 1 : 0.5, cursor: isAdminUser ? 'pointer' : 'not-allowed' }}
                              disabled={!isAdminUser}
                              title="Edit user"
                              aria-label={`Edit ${user.username || user.full_name || ''}`}
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z" fill="#0a1e3d"/>
                                <path d="M20.71 7.04a1.003 1.003 0 0 0 0-1.42l-2.34-2.34a1.003 1.003 0 0 0-1.42 0l-1.83 1.83 3.75 3.75 1.84-1.82z" fill="#0a1e3d"/>
                              </svg>
                            </button>
                            <button
                              onClick={() => setConfirmDeleteId(user.id)}
                              title="Delete"
                              aria-label={`Delete ${user.username || user.full_name || ''}`}
                              className="action-btn compact-action-btn"
                              style={{ border: '1px solid #000', background: 'transparent', color: '#000' }}
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M3 6h18" stroke="#000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" stroke="#000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                <path d="M10 11v6M14 11v6" stroke="#000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" stroke="#000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            </button>
                          </div>
                        )}
                    </td>
                  </tr>
                ))
            ) : (
              <tr>
                <td colSpan="7" className="no-data">Tidak ada data user</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

        {/* Pagination controls (match Branches layout) */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
          <div>Showing {start + 1}-{end} of {total}</div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }} style={{ padding: '6px 8px', border: '1px solid #ddd', borderRadius: 6 }}>
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
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

      {/* Modal */}
      {showModal && (
        <div style={styles.modalOverlay} onClick={() => setShowModal(false)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>
                {modalMode === 'new' ? 'Add New User' : 'Edit User'}
              </h3>
              <button 
                onClick={() => setShowModal(false)}
                style={styles.closeBtn}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} style={styles.form}>
              <div style={styles.formGrid}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Full Name *</label>
                  <input
                    type="text"
                    name="full_name"
                    value={formData.full_name}
                    onChange={handleInputChange}
                    style={styles.input}
                    required
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Email *</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    style={styles.input}
                    required
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Username {modalMode === 'new' && '*'}</label>
                  <input
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleInputChange}
                    style={styles.input}
                    required={modalMode === 'new'}
                    disabled={modalMode === 'edit'}
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Password {modalMode === 'new' && '*'}</label>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    style={styles.input}
                    required={modalMode === 'new'}
                    placeholder={modalMode === 'edit' ? 'Kosongkan jika tidak ingin mengubah' : ''}
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Employee ID</label>
                  <input
                    type="text"
                    name="employee_id"
                    value={formData.employee_id}
                    onChange={handleInputChange}
                    style={styles.input}
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Phone</label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    style={styles.input}
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Role *</label>
                  <select
                    name="role"
                    value={formData.role}
                    onChange={handleInputChange}
                    style={styles.select}
                    required
                  >
                    <option value="Admin">Admin</option>
                    <option value="CSA">CSA</option>
                    <option value="SLIK">SLIK</option>
                    <option value="BM">BM</option>
                    <option value="AM">AM</option>
                    <option value="RM">RM</option>
                    <option value="BOD">BOD</option>
                    <option value="User">User</option>
                  </select>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Region</label>
                  <select
                    name="region_id"
                    value={formData.region_id}
                    onChange={handleInputChange}
                    style={styles.select}
                  >
                    <option value="">-- Select Region --</option>
                    {regions.map((region) => (
                      <option key={region.id} value={region.id}>
                        {region.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Area</label>
                  <select
                    name="area_id"
                    value={formData.area_id}
                    onChange={handleInputChange}
                    style={styles.select}
                    disabled={!formData.region_id}
                  >
                    <option value="">-- Pilih Area --</option>
                    {areas.map((area) => (
                      <option key={area.id} value={area.id}>
                        {area.name}
                      </option>
                    ))}
                  </select>
                  {!formData.region_id && <small style={{color: '#999', marginTop: '5px', display: 'block'}}>Pilih Region terlebih dahulu</small>}
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Branch</label>
                  <select
                    name="branch_id"
                    value={formData.branch_id}
                    onChange={handleInputChange}
                    style={styles.select}
                    disabled={!formData.area_id}
                  >
                    <option value="">-- Pilih Branch --</option>
                    {branches.map((branch) => (
                      <option key={branch.id} value={branch.id}>
                        {branch.name}
                      </option>
                    ))}
                  </select>
                  {!formData.area_id && <small style={{color: '#999', marginTop: '5px', display: 'block'}}>Pilih Area terlebih dahulu</small>}
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      name="is_active"
                      checked={formData.is_active}
                      onChange={handleInputChange}
                      style={styles.checkbox}
                    />
                    Active
                  </label>
                </div>
              </div>

              <div style={styles.modalFooter}>
                <button 
                  type="submit"
                  style={styles.btnSave}
                  disabled={submitLoading}
                >
                  {submitLoading ? (modalMode === 'new' ? 'Saving...' : 'Updating...') : (modalMode === 'new' ? 'Save' : 'Update')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    padding: '20px',
    backgroundColor: '#f5f5f5',
    minHeight: '100vh'
  },
  loadingMessage: {
    padding: '40px',
    backgroundColor: 'white',
    borderRadius: '8px',
    textAlign: 'center',
    marginTop: '40px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
  },
  header: {
    marginBottom: '30px',
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '8px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
  },
  title: {
    margin: '0 0 8px 0',
    fontSize: '28px',
    color: '#0a1e3d',
    fontWeight: '700'
  },
  subtitle: {
    margin: '0',
    fontSize: '14px',
    color: '#666'
  },
  actionSection: {
    marginBottom: '20px',
    display: 'flex',
    gap: '10px',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  filterRow: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center'
  },
  searchInput: {
    padding: '8px 10px',
    border: '1px solid #ddd',
    borderRadius: '6px',
    fontSize: '14px',
    width: '260px'
  },
  filterSelect: {
    padding: '8px 10px',
    border: '1px solid #ddd',
    borderRadius: '6px',
    fontSize: '14px'
  },
  btnPrimary: {
    padding: '10px 20px',
    fontSize: '14px',
    fontWeight: '600',
    background: 'linear-gradient(135deg, #0a1e3d 0%, #051626 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    letterSpacing: '0.5px'
  },
  tableSection: {
    backgroundColor: 'white',
    borderRadius: '8px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
    overflow: 'hidden'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse'
  },
  headerRow: {
    backgroundColor: '#f5f5f5',
    borderBottom: '2px solid #ddd'
  },
  th: {
    padding: '16px 12px',
    textAlign: 'left',
    fontSize: '13px',
    fontWeight: '600',
    color: '#333',
    letterSpacing: '0.5px',
    textTransform: 'uppercase'
  },
  bodyRow: {
    borderBottom: '1px solid #f0f0f0',
    transition: 'background-color 0.2s'
  },
  td: {
    padding: '12px',
    fontSize: '14px',
    color: '#333'
  },
  noDataCell: {
    padding: '40px 12px',
    textAlign: 'center',
    color: '#999'
  },
  roleBadge: {
    display: 'inline-block',
    padding: '4px 12px',
    backgroundColor: '#e3f2fd',
    color: '#1976d2',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '600'
  },
  statusActive: {
    display: 'inline-block',
    padding: '4px 12px',
    backgroundColor: '#c8e6c9',
    color: '#2e7d32',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '600'
  },
  statusInactive: {
    display: 'inline-block',
    padding: '4px 12px',
    backgroundColor: '#ffcdd2',
    color: '#c62828',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '600'
  },
  btnEdit: {
    border: '1px solid #0a1e3d',
    background: 'transparent',
    borderRadius: 6,
    padding: 8,
    width: 36,
    height: 36,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  errorMessage: {
    padding: '12px 16px',
    backgroundColor: '#f8d7da',
    color: '#721c24',
    border: '1px solid #f5c6cb',
    borderRadius: '6px',
    marginBottom: '20px',
    fontSize: '13px'
  },
  // Gaya modal
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: '8px',
    padding: '0',
    maxWidth: '600px',
    width: '90%',
    maxHeight: '90vh',
    overflow: 'auto',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)'
  },
  modalHeader: {
    padding: '20px',
    borderBottom: '1px solid #eee',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    position: 'sticky',
    top: 0,
    zIndex: 30,
    boxShadow: '0 2px 6px rgba(0,0,0,0.04)'
  },
  modalTitle: {
    margin: '0',
    fontSize: '18px',
    fontWeight: '700',
    color: '#0a1e3d'
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    fontSize: '28px',
    color: '#999',
    cursor: 'pointer',
    padding: '0',
    width: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  form: {
    padding: '20px'
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '16px',
    marginBottom: '20px'
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column'
  },
  label: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#333',
    marginBottom: '6px'
  },
  input: {
    padding: '10px 12px',
    fontSize: '14px',
    border: '1px solid #ddd',
    borderRadius: '6px',
    outline: 'none',
    fontFamily: 'inherit',
    transition: 'border 0.2s'
  },
  select: {
    padding: '10px 12px',
    fontSize: '14px',
    border: '1px solid #ddd',
    borderRadius: '6px',
    outline: 'none',
    fontFamily: 'inherit',
    cursor: 'pointer'
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    fontSize: '14px',
    color: '#333',
    cursor: 'pointer'
  },
  checkbox: {
    marginRight: '8px',
    cursor: 'pointer',
    width: '18px',
    height: '18px'
  },
  modalFooter: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end',
    padding: '20px',
    borderTop: '1px solid #eee',
    backgroundColor: '#f9f9f9'
  },
  btnCancel: {
    padding: '10px 20px',
    fontSize: '14px',
    fontWeight: '600',
    backgroundColor: 'white',
    color: '#666',
    border: '1px solid #ddd',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  btnSave: {
    padding: '10px 20px',
    fontSize: '14px',
    fontWeight: '600',
    background: 'linear-gradient(135deg, #0a1e3d 0%, #051626 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'all 0.3s ease'
  }
  ,
  paginationBtn: {
    padding: '6px 10px',
    border: '1px solid #ddd',
    background: 'white',
    borderRadius: '6px',
    cursor: 'pointer'
  },
  paginationIndicator: {
    fontSize: '13px',
    color: '#333'
  }
};

export default UserManagement;
