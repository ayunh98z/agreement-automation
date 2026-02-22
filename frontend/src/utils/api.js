import axios from 'axios';

export async function requestWithAuth(config) {
  const doRequest = async (token) => {
    const headers = { ...(config.headers || {}) };
    if (token && !headers.Authorization) headers.Authorization = `Bearer ${token}`;
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
}

export default requestWithAuth;
