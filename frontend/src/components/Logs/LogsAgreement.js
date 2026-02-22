// React component to display download logs (agreement/BL)
import React, { useEffect, useState, useCallback } from 'react';
import { requestWithAuth } from '../../utils/api';
import '../UserManagement/UserManagement.css';

function formatTimestamp(ts) {
  if (!ts) return '';
  try {
    // try parse ISO-like timestamps then format as 'YYYY-MM-DD HH:mm:ss'
    const d = new Date(ts);
    if (isNaN(d.getTime())) return ts;
    const pad = (n) => String(n).padStart(2, '0');
    const yyyy = d.getFullYear();
    const mm = pad(d.getMonth() + 1);
    const dd = pad(d.getDate());
    const hh = pad(d.getHours());
    const min = pad(d.getMinutes());
    const ss = pad(d.getSeconds());
    return `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`;
  } catch (e) {
    return String(ts);
  }
}

function LogsAgreement() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [usernameFilter, setUsernameFilter] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [fileType, setFileType] = useState('all');

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = [];
      if (fileType && fileType !== 'all') params.push(`file_type=${encodeURIComponent(fileType)}`);
      if (usernameFilter) params.push(`username=${encodeURIComponent(usernameFilter)}`);
      if (page) params.push(`page=${encodeURIComponent(page)}`);
      if (pageSize) params.push(`limit=${encodeURIComponent(pageSize)}`);
      const q = params.length ? `?${params.join('&')}` : '';
      const res = await requestWithAuth({ method: 'get', url: `http://localhost:8000/api/downloads/logs/${q}` });
      setLogs(res.data.results || []);
      setTotalCount(res.data.count || 0);
    } catch (err) {
      console.error(err);
      setError('Gagal memuat logs. Pastikan Anda login dan backend berjalan.');
    } finally {
      setLoading(false);
    }
  }, [fileType, usernameFilter, page, pageSize]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  return (
    <div className="content-section">
      <h2>Logs - Agreement</h2>
      <div className="user-management-actions" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <select value={fileType} onChange={(e) => { setFileType(e.target.value); }} style={{ padding: '8px 10px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px' }}>
            <option value="all">All types</option>
            <option value="bl">BL</option>
            <option value="uv">UV</option>
          </select>
          <input
            type="text"
            placeholder="Search username, filename, identifier..."
            value={usernameFilter}
            onChange={(e) => { setUsernameFilter(e.target.value); }}
            aria-label="Search logs"
            style={{ padding: '8px 10px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px', width: '320px' }}
          />
        </div>

        <div />
      </div>

      {loading && <div>Loading...</div>}
      {error && <div className="error-message">{error}</div>}

      <div className="user-table-section">
        <div style={{ padding: 12 }}>
          <div style={{ overflowX: 'auto' }}>
            <table className="user-table">
          <thead>
            <tr>
              <th>Filename</th>
              <th>Identifier</th>
              <th>IP</th>
              <th>Size</th>
              <th>User</th>
              <th>Timestamp</th>
            </tr>
          </thead>
          <tbody>
            {logs.map(l => (
              <tr key={l.id}>
                <td>{l.filename}</td>
                <td>{l.file_identifier}</td>
                <td>{l.ip_address}</td>
                <td>{l.file_size || ''}</td>
                <td>{l.username || l.user_id || 'anonymous'}</td>
                <td>{formatTimestamp(l.timestamp)}</td>
              </tr>
            ))}
            {logs.length === 0 && !loading && (<tr><td colSpan="6">No logs</td></tr>)}
          </tbody>
            </table>
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
        <div>Showing {totalCount === 0 ? 0 : (page - 1) * pageSize + 1}-{Math.min((page - 1) * pageSize + logs.length, totalCount)} of {totalCount}</div>
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
          <div className="pagination-indicator">{page} / {Math.max(1, Math.ceil(totalCount / pageSize))}</div>
          <button className="pagination-btn" onClick={() => setPage(p => Math.min(Math.max(1, Math.ceil(totalCount / pageSize)), p + 1))} disabled={page >= Math.max(1, Math.ceil(totalCount / pageSize))} aria-label="Next page">
            Next
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
              <path d="M9 6L15 12L9 18" stroke="#0a1e3d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

export default LogsAgreement;
