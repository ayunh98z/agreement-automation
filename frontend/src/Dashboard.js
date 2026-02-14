import React, { useState, useRef } from 'react';
import axios from 'axios';
import './Dashboard.css';
import DashboardHome from './components/DashboardHome';
import AgreementPage from './components/AgreementPage';
import BLAgreement from './components/AgreementPage/BLAgreement';
import BLSP3 from './components/AgreementPage/BLSP3';
import UVAgreement from './components/AgreementPage/UVAgreement';
import UVSP3 from './components/AgreementPage/UVSP3';
import UserManagement from './components/UserManagement';
import dashboardIcon from './components/AgreementPage/../../assets/icons/sidebar-dashboard.svg';
import userIcon from './components/AgreementPage/../../assets/icons/sidebar-user.svg';
import agreementIcon from './components/AgreementPage/../../assets/icons/sidebar-agreement.svg';

function Dashboard({ userData, onLogout }) {
  const [activeMenu, setActiveMenu] = useState('dashboard');
  const [expandedMenu, setExpandedMenu] = useState(null);
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const avatarRef = useRef(null);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('new');
  const [formData, setFormData] = useState({ username: '', email: '', role: 'User', password: '' });

  const Icon = {
    Dashboard: (<img src={dashboardIcon} alt="Dashboard" style={{ width: 18, height: 18 }} />),
    UserManagement: (<img src={userIcon} alt="User Management" style={{ width: 18, height: 18 }} />),
    Documents: (<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-8-6zm-1 16H7v-2h6v2zm3-4H7v-2h10v2z"></path></svg>),
    Settings: (<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.64l-1.92-3.32c-.12-.23-.39-.3-.61-.23l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.23-.09-.49 0-.61.23L2.74 8.87c-.12.23-.07.49.12.64l2.03 1.58c-.05.3-.07.62-.07.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.64l1.92 3.32c.12.23.39.3.61.23l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.23.09.49 0 .61-.23l1.92-3.32c.12-.23.07-.49-.12-.64l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"></path></svg>),
    Agreement: (<img src={agreementIcon} alt="Agreement" style={{ width: 18, height: 18 }} />),
  };

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Icon.Dashboard },
    { id: 'usermanagement', label: 'User Management', icon: Icon.UserManagement },
    { id: 'agreement', label: 'Agreement', icon: Icon.Agreement, submenu: [
      { id: 'bl-agreement', label: 'BL Agreement' },
      { id: 'bl-sp3', label: 'BL SP3' },
      { id: 'uv-agreement', label: 'UV Agreement' },
      { id: 'uv-sp3', label: 'UV SP3' },
    ]},
  ];

  const handleMenuClick = (menuId) => {
    const item = menuItems.find(m => m.id === menuId);
    if (item && item.submenu) {
      setExpandedMenu(expandedMenu === menuId ? null : menuId);
    } else {
      setActiveMenu(menuId);
      setExpandedMenu(null);
    }
  };

  const renderContent = () => {
    switch (activeMenu) {
      case 'dashboard': return <DashboardHome userData={userData} onNavigate={(menuId) => { setActiveMenu(menuId); setExpandedMenu(null); }} />;
      case 'usermanagement': return <UserManagement onSetModalMode={setModalMode} onSetFormData={setFormData} onSetShowModal={setShowModal} />;
      case 'agreement': return <AgreementPage />;
      case 'bl-agreement': return <BLAgreement />;
      case 'bl-sp3': return <BLSP3 />;
      case 'uv-agreement': return <UVAgreement />;
      case 'uv-sp3': return <UVSP3 />;
      default: return null;
    }
  };

  return (
    <div className="dashboard-container">
      <aside className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-header-content">
            <h3>{userData.full_name || userData.username || 'User'}</h3>
            <p className="sidebar-subtitle">@{userData.username || 'username'}</p>
          </div>
          <span className="sidebar-header-toggle" onClick={() => setSidebarCollapsed(!sidebarCollapsed)} title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
            <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <rect x="3" y="6" width="18" height="2" rx="1" fill="#ffffff" />
              <rect x="3" y="11" width="18" height="2" rx="1" fill="#ffffff" />
              <rect x="3" y="16" width="18" height="2" rx="1" fill="#ffffff" />
            </svg>
          </span>
        </div>
        <nav className="sidebar-menu">
          {menuItems.map(item => (
            <div key={item.id}>
              <button className={`menu-item ${activeMenu === item.id ? 'active' : ''} ${expandedMenu === item.id ? 'expanded' : ''}`} onClick={() => handleMenuClick(item.id)} title={item.label}>
                <span className="menu-icon">{item.icon}</span>
                <span className="menu-label">{item.label}</span>
                {item.submenu && <span className="submenu-arrow"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg></span>}
              </button>
              {item.submenu && expandedMenu === item.id && (
                <div className="submenu">
                  {item.submenu.map(subitem => (
                    <button key={subitem.id} className={`submenu-item ${activeMenu === subitem.id ? 'active' : ''}`} onClick={() => { setActiveMenu(subitem.id); setExpandedMenu(null); }} title={subitem.label}>
                      {subitem.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>
        <div className="sidebar-footer"><p>© 2026 LOLC Ventura Indonesia</p></div>
      </aside>

      <main className="dashboard-main">
        <header className="dashboard-header">
          <div className="header-title">
            <h1>Agreement Automation System</h1>
          </div>
          <div className="header-user" ref={avatarRef}>
            <button className="avatar-btn" onClick={() => setAvatarOpen(s => !s)} aria-haspopup="true" aria-expanded={avatarOpen} title="User menu"><span className="avatar-initial">{(userData.username || 'U').charAt(0).toUpperCase()}</span></button>
            {avatarOpen && (<div className="avatar-dropdown"><div className="avatar-dropdown-name">{userData.userme}</div><button className="avatar-signout" onClick={onLogout}>Sign Out</button></div>)}
          </div>
        </header>

        <div className="dashboard-content">{renderContent()}</div>

        {showModal && (
          <div className="modal-overlay" onClick={() => setShowModal(false)}>
            <div className="modal" onClick={e => e.stopPropagation()}>
              <div className="modal-header"><h3>{modalMode === 'new' ? 'Create New User' : 'Edit User'}</h3><button className="modal-close" onClick={() => setShowModal(false)}>✕</button></div>
              <form className="user-form" onSubmit={async e => {
                e.preventDefault();
                try {
                  const token = localStorage.getItem('access_token');
                  const headers = token ? { Authorization: `Bearer ${token}` } : {};
                  if (modalMode === 'new') await axios.post('http://localhost:8000/api/users/', { username: formData.username, email: formData.email, password: formData.password, role: formData.role }, { headers });
                  else await axios.put(`http://localhost:8000/api/users/${formData.username}/`, { email: formData.email, password: formData.password, role: formData.role }, { headers });
                } catch (err) { console.error(err); alert('Error saving user'); }
                setShowModal(false);
              }}>
                <div className="form-group"><label>Username</label><input type="text" value={formData.username} onChange={e => setFormData({ ...formData, username: e.target.value })} disabled={modalMode === 'edit'} required /></div>
                <div className="form-group"><label>Email</label><input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} required /></div>
                <div className="form-group"><label>{modalMode === 'new' ? 'Password' : 'Password (leave blank to keep)'}</label><input type="password" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} {...(modalMode === 'new' ? { required: true } : {})} /></div>
                <div className="form-group"><label>Role</label><select value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value })}><option>User</option><option>Administrator</option></select></div>
                <div className="form-actions"><button type="submit" className="btn-primary">Save</button><button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button></div>
              </form>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}

export default Dashboard;
