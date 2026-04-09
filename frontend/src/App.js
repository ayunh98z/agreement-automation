import React, { useState, useEffect } from 'react';
import useT from './hooks/useT';
import axios from 'axios';
import Dashboard from './components/DashboardHome';
// translation via hook `useT` is used in this component
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './App.css';

function App() {
  const t = useT();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userData, setUserData] = useState(null);
  const [showPassword, setShowPassword] = useState(false);

  // Konfigurasi backend (allow overriding via env var)
  const BACKEND_URL = process.env.REACT_APP_API_BASE || '';
  const LOGIN_ENDPOINT = `${BACKEND_URL}/login/`;

  // Fungsi untuk menangani login dari auth_user table
  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    // helper: map server free-text errors to client translation keys
    const mapServerErrorKey = (msg) => {
      if (!msg) return null;
      const s = msg.toString().toLowerCase();
      if (/\b(tidak terdaftar|user tidak terdaftar|user tidak ditemukan|username tidak ditemukan|not registered|not found|not exist)\b/.test(s)) return 'user_not_registered';
      if (/\b(password salah|wrong password|invalid password|invalid credentials|username or password|incorrect|salah)\b/.test(s)) return 'invalid_credentials';
      if (/\b(akun tidak aktif|account inactive|inactive)\b/.test(s)) return 'account_inactive';
      if (/\b(username and password|required|harus diisi|credentials required)\b/.test(s)) return 'credentials_required';
      return null;
    };

    try {
      // Mengirim permintaan POST ke backend untuk mendapatkan token
      const response = await axios.post(LOGIN_ENDPOINT, {
        username,
        password,
      }, {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 5000, // timeout 5 detik
      });

      // Menyimpan token akses di localStorage
      localStorage.setItem('access_token', response.data.access);
      localStorage.setItem('refresh_token', response.data.refresh);
      // initial user object from login response
      let userObj = response.data.user || {};
      // try to fetch extended user info (role, branch/area/region) from whoami
      try {
        const who = await axios.get(`${BACKEND_URL}/api/whoami/`, { headers: { Authorization: `Bearer ${response.data.access}` } });
        userObj = { ...userObj, ...who.data };
      } catch (e) {
        // ignore whoami failure; we'll fallback to login user data
        console.warn('whoami fetch after login failed', e);
      }
      localStorage.setItem('user_data', JSON.stringify(userObj));

      toast.success(t('login_success'));
      setUsername('');
      setPassword('');
      setIsLoggedIn(true);
      setUserData(userObj);
    } catch (error) {
      console.error('Login error:', error);
      
      let errorMsg = t('login_failed');
      
      if (error.code === 'ECONNABORTED') {
        errorMsg = t('connection_timeout') + ' ' + BACKEND_URL;
      } else if (error.code === 'ECONNREFUSED') {
        errorMsg = t('cannot_connect');
      } else if (error.response?.status === 401) {
        const serverErr = error.response.data?.error || '';
        const key = mapServerErrorKey(serverErr);
        if (key) {
          errorMsg = t(key);
        } else {
          errorMsg = serverErr || t('invalid_credentials');
        }
      } else if (error.response?.status === 403) {
        const serverErr = error.response.data?.error || '';
        const key = mapServerErrorKey(serverErr);
        errorMsg = key ? t(key) : serverErr || t('account_inactive');
      } else if (error.response?.status === 400) {
        const serverErr = error.response.data?.error || '';
        const key = mapServerErrorKey(serverErr);
        errorMsg = key ? t(key) : serverErr || t('credentials_required');
      } else if (error.message === 'Network Error') {
        errorMsg = t('network_error') + ' ' + BACKEND_URL;
      }
      
      toast.error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  // Fungsi untuk logout
  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user_data');
    setIsLoggedIn(false);
    setUserData(null);
    setUsername('');
    setPassword('');
  };

  // Cek apakah sudah login saat komponen mount
  useEffect(() => {
    const token = localStorage.getItem('access_token');
    const savedUserData = localStorage.getItem('user_data');
    
    if (token && savedUserData) {
      // try refresh user info from whoami to get latest role/context
      (async () => {
        try {
          const res = await axios.get(`${BACKEND_URL}/api/whoami/`, { headers: { Authorization: `Bearer ${token}` } });
          const merged = { ...(JSON.parse(savedUserData) || {}), ...res.data };
          localStorage.setItem('user_data', JSON.stringify(merged));
          setUserData(merged);
          setIsLoggedIn(true);
        } catch (e) {
          // fallback to saved data if whoami fails
          setIsLoggedIn(true);
          setUserData(JSON.parse(savedUserData));
        }
      })();
    }
  }, [BACKEND_URL]);

  // Jika sudah login dan userData ada, tampilkan Dashboard
  

  if (isLoggedIn && userData) {
    return <Dashboard userData={userData} onLogout={handleLogout} />;
  }

  // Tampilkan Login Page
  return (
    <div className="App">
      <ToastContainer 
        position="top-right" 
        autoClose={3000} 
        hideProgressBar={false} 
        newestOnTop={false} 
        closeOnClick 
        rtl={false} 
        pauseOnFocusLoss 
        draggable 
        pauseOnHover 
      />
      <div className="login-container">
        <div className="login-card">
          <div className="card-header">
            <div style={{display: 'flex', justifyContent: 'center', alignItems: 'center'}}>
              <div style={{textAlign: 'center'}}>
                <h1 className="card-title">{t('dashboard_header')}</h1>
                <p className="card-subtitle">{t('login_subtitle')}</p>
              </div>
            </div>
          </div>

          <form onSubmit={handleLogin} className="login-form">
            <div className="form-group">
              <label className="form-label-with-icon">
                <svg className="label-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
                {t('username')}
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={t('username_placeholder')}
                className="form-input"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label-with-icon">
                <svg className="label-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                </svg>
                {t('password')}
              </label>
              <div className="password-input-wrapper">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t('password_placeholder')}
                  className="form-input"
                  required
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex="-1"
                >
                  {showPassword ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                      <circle cx="12" cy="12" r="3"></circle>
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                      <line x1="1" y1="1" x2="23" y2="23"></line>
                    </svg>
                  )}
                </button>
              </div>
            </div>

            

            <button 
              type="submit" 
              className="sign-in-btn"
              disabled={isLoading}
            >
              {isLoading ? t('signing_in') : t('sign_in')}
            </button>

            <div className="card-footer">
              <p>©2026 PT LOLC Ventura Indonesia. All rights reserved.</p>
            </div>

          </form>
        </div>
      </div>

      <footer className="site-footer">
        <div className="footer-inner">
          <span className="made-with">Powered by LOVI IT Team v1.1.0 • © 2026</span>
        </div>
      </footer>

    </div>
  );
}

export default App;
