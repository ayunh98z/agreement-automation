// React component to display download logs (agreement/BL)
import React, { useEffect, useState, useCallback } from 'react';
import { requestWithAuth } from '../../utils/api';
import '../UserManagement/UserManagement.css';
import useT from '../../hooks/useT';

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
  const t = useT();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchFilter, setSearchFilter] = useState('');
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
      // When searching, fetch a large page so we can filter client-side across all columns
      if (searchFilter) {
        params.push(`page=1`);
        params.push(`limit=10000`);
      } else {
        if (page) params.push(`page=${encodeURIComponent(page)}`);
        if (pageSize) params.push(`limit=${encodeURIComponent(pageSize)}`);
      }
      const q = params.length ? `?${params.join('&')}` : '';
      const res = await requestWithAuth({ method: 'get', url: `/api/downloads/logs/${q}` });
      let results = res.data.results || [];
      let total = res.data.count || results.length;

      if (searchFilter) {
        const qlc = searchFilter.trim().toLowerCase();
        const filtered = results.filter(l => {
          const parts = [];
          if (l.filename) parts.push(l.filename);
          if (l.file_identifier) parts.push(l.file_identifier);
          if (l.ip_address) parts.push(l.ip_address);
          if (l.file_size) parts.push(String(l.file_size));
          if (l.username) parts.push(l.username);
          if (l.user_id) parts.push(String(l.user_id));
          if (l.timestamp) parts.push(formatTimestamp(l.timestamp));
          const hay = parts.join(' ').toLowerCase();
          return hay.indexOf(qlc) !== -1;
        });
        total = filtered.length;
        const start = (page - 1) * pageSize;
        results = filtered.slice(start, start + pageSize);
      }

      setLogs(results);
      setTotalCount(total);
    } catch (err) {
      console.error(err);
      setError(t('failed_load_logs'));
    } finally {
      setLoading(false);
    }
  }, [fileType, searchFilter, page, pageSize, t]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  return (
    <div className="content-section">
      <h2>{t('log_downloads_title')}</h2>
      <div className="user-management-actions" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <select value={fileType} onChange={(e) => { setFileType(e.target.value); }} style={{ padding: '8px 10px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px' }}>
            <option value="all">{t('all_types')}</option>
            <option value="bl">{t('bl')}</option>
            <option value="uv">{t('uv')}</option>
          </select>
           <input
             type="text"
             placeholder={t('search_logs_placeholder')}
             value={searchFilter}
             onChange={(e) => { setSearchFilter(e.target.value); setPage(1); }}
               aria-label={t('search_logs_placeholder')}
             style={{ padding: '8px 10px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px', width: '320px' }}
           />
        </div>

        <div />
      </div>

      {loading && <div>{t('loading')}</div>}
      {error && <div className="error-message">{error}</div>}

      <div className="user-table-section">
        <div style={{ padding: 12 }}>
          <div style={{ overflowX: 'auto' }}>
            <table className="user-table branches-table">
              <thead>
            <tr>
              <th>{t('filename')}</th>
              <th>{t('identifier')}</th>
              <th>{t('ip')}</th>
              <th>{t('size')}</th>
              <th>{t('user')}</th>
              <th>{t('timestamp')}</th>
            </tr>
          </thead>
          <tbody>
            {logs.map(l => (
              <tr key={l.id}>
                <td>{l.filename}</td>
                <td>{l.file_identifier}</td>
                <td>{l.ip_address}</td>
                <td>{l.file_size || ''}</td>
                <td>{l.username || l.user_id || t('anonymous')}</td>
                <td>{formatTimestamp(l.timestamp)}</td>
              </tr>
            ))}
            {logs.length === 0 && !loading && (<tr><td colSpan="6">{t('no_logs')}</td></tr>)}
          </tbody>
            </table>
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
        <div>{t('showing')} {totalCount === 0 ? 0 : (page - 1) * pageSize + 1}-{Math.min((page - 1) * pageSize + logs.length, totalCount)} of {totalCount}</div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }} style={{ padding: '6px 8px', border: '1px solid #ddd', borderRadius: 6 }}>
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
          <button className="pagination-btn" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} aria-label={t('prev')}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
              <path d="M15 18L9 12L15 6" stroke="#0a1e3d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {t('prev')}
          </button>
          <div className="pagination-indicator">{page} / {Math.max(1, Math.ceil(totalCount / pageSize))}</div>
          <button className="pagination-btn" onClick={() => setPage(p => Math.min(Math.max(1, Math.ceil(totalCount / pageSize)), p + 1))} disabled={page >= Math.max(1, Math.ceil(totalCount / pageSize))} aria-label={t('next')}>
            {t('next')}
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
