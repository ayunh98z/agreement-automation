import React, { useState, useEffect } from 'react';
import axios from 'axios';

function DashboardHome({ userData, onNavigate }) {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const token = localStorage.getItem('access_token');
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const response = await axios.get('http://localhost:8000/api/dashboard/summary/', { headers });
        setStats(response.data);
      } catch (err) {
        console.error('Failed to fetch stats:', err);
      }
    };
    fetchStats();
  }, []);

  return (
    <div className="content-section">
      <h2>Welcome back, {userData.full_name}</h2>
      <p>Your workspace for Agreement Automation</p>
      <div className="dashboard-stats">
        <div className="stat-card" onClick={() => onNavigate && onNavigate('bl-agreement')} style={{ cursor: onNavigate ? 'pointer' : 'default' }}>
          <div className="stat-icon">📄</div>
          <div className="stat-content">
            <h3>{stats ? stats.bl_agreement : (stats === null ? '—' : 0)}</h3>
            <p>files BL Agreement</p>
          </div>
        </div>

        <div className="stat-card" onClick={() => onNavigate && onNavigate('bl-sp3')} style={{ cursor: onNavigate ? 'pointer' : 'default' }}>
          <div className="stat-icon">📄</div>
          <div className="stat-content">
            <h3>{stats ? stats.bl_sp3 : (stats === null ? '—' : 0)}</h3>
            <p>files BL SP3</p>
          </div>
        </div>

        <div className="stat-card" onClick={() => onNavigate && onNavigate('uv-agreement')} style={{ cursor: onNavigate ? 'pointer' : 'default' }}>
          <div className="stat-icon">📄</div>
          <div className="stat-content">
            <h3>{stats ? stats.uv_agreement : (stats === null ? '—' : 0)}</h3>
            <p>files UV Agreement</p>
          </div>
        </div>

        <div className="stat-card" onClick={() => onNavigate && onNavigate('uv-sp3')} style={{ cursor: onNavigate ? 'pointer' : 'default' }}>
          <div className="stat-icon">📄</div>
          <div className="stat-content">
            <h3>{stats ? stats.uv_sp3 : (stats === null ? '—' : 0)}</h3>
            <p>files UV SP3</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DashboardHome;
