import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Dashboard from './Dashboard';
import './App.css';

function App() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userData, setUserData] = useState(null);
  const [showPassword, setShowPassword] = useState(false);

  // Konfigurasi backend
  const BACKEND_URL = 'http://localhost:8000';
  const LOGIN_ENDPOINT = `${BACKEND_URL}/login/`;

  // Fungsi untuk menangani login dari auth_user table
  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage('');

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
      localStorage.setItem('user_data', JSON.stringify(response.data.user));

      setMessage('Login berhasil!');
      setMessageType('success');
      setUsername('');
      setPassword('');
      setIsLoggedIn(true);
      setUserData(response.data.user);
    } catch (error) {
      console.error('Login error:', error);
      
      let errorMsg = 'Login gagal. Silakan coba lagi.';
      
      if (error.code === 'ECONNABORTED') {
        errorMsg = 'Koneksi timeout. Pastikan backend sedang berjalan di localhost:8000';
      } else if (error.code === 'ECONNREFUSED') {
        errorMsg = 'Tidak bisa terhubung ke backend. Pastikan backend sudah dijalankan.';
      } else if (error.response?.status === 401) {
        errorMsg = error.response.data.error || 'Username atau password salah';
      } else if (error.response?.status === 400) {
        errorMsg = error.response.data.error || 'Username dan password harus diisi';
      } else if (error.message === 'Network Error') {
        errorMsg = 'Network error. Pastikan backend berjalan di http://localhost:8000';
      }
      
      setMessage(errorMsg);
      setMessageType('error');
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
    setMessage('');
    setUsername('');
    setPassword('');
  };

  // Cek apakah sudah login saat komponen mount
  useEffect(() => {
    const token = localStorage.getItem('access_token');
    const savedUserData = localStorage.getItem('user_data');
    
    if (token && savedUserData) {
      setIsLoggedIn(true);
      setUserData(JSON.parse(savedUserData));
    }
  }, []);

  // Jika sudah login dan userData ada, tampilkan Dashboard
  if (isLoggedIn && userData) {
    return <Dashboard userData={userData} onLogout={handleLogout} />;
  }

  // Tampilkan Login Page
  return (
    <div className="App">
      <div className="login-container">
        <div className="login-card">
          <div className="card-header">
            <h1 className="card-title">Agreement Automation</h1>
            <p className="card-subtitle">Sign in to your account</p>
          </div>

          <form onSubmit={handleLogin} className="login-form">
            <div className="form-group">
              <label className="form-label-with-icon">
                <svg className="label-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
                Username
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
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
                Password
              </label>
              <div className="password-input-wrapper">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
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

            {message && (
              <div className={`message message-${messageType}`}>
                {message}
              </div>
            )}

            <button 
              type="submit" 
              className="sign-in-btn"
              disabled={isLoading}
            >
              {isLoading ? 'Signing In...' : 'Sign In'}
            </button>

            <div className="card-footer">
              <p>© 2026 LOLC Ventura Indonesia. All rights reserved.</p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default App;
