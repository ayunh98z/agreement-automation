/* eslint-disable unicode-bom, no-unused-vars, react-hooks/exhaustive-deps, no-useless-escape */
import React, { useState, useEffect } from 'react';
import axios from 'axios';
function BLAgreement({ initialContractNumber = '', initialContractData = null, onSaved, onContractSaved, contractOnly = false, editOnly = false, createOnly = false, hideFilter = false, hideHeader = false, isUV = false } = {}) {
  // State UI lokal
  const [saving, setSaving] = useState(false);
  const [usernameDisplay, setUsernameDisplay] = useState('');

  // Pembantu: unduh DOCX untuk nomor kontrak
  const triggerDocxDownload = async (contractNum, accessToken) => {
    if (!contractNum || String(contractNum).trim() === '') return;
    try {
      const token = accessToken || localStorage.getItem('access_token');
      // Minta konversi PDF di server ketika tersedia. Gunakan `as_pdf=1` untuk
      // secara eksplisit meminta output PDF. Pilih endpoint BL atau UV sesuai prop `isUV`.
      const base = isUV ? 'uv-agreement' : 'bl-agreement';
      const url = `http://localhost:8000/api/${base}/download-docx/?contract_number=${encodeURIComponent(contractNum)}`;
      const resp = await axios.get(url, {
        responseType: 'blob',
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      const contentType = (resp.headers && resp.headers['content-type']) || '';
      const isPdf = contentType.includes('pdf');
      const blob = new Blob([resp.data], { type: contentType || (isPdf ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') });
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = `${isUV ? 'uv_agreement' : 'bl_agreement'}_${contractNum}${isPdf ? '.pdf' : '.docx'}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(link.href);
    } catch (e) {
      console.error('DOCX download failed', e);
    }
  };

    // Fungsi untuk menangani penyimpanan (dengan refresh token saat kadaluwarsa)
    const handleSave = async () => {
      setSaving(true);
      setError('');

      const doSave = async (accessToken) => {
          // Siapkan payload dan pastikan field turunan "_in_word" / "_by_word" disertakan
          const contractDataToSave = { ...contractData };
          contractFields.forEach((f) => {
            if (/_in_word$|_by_word$/.test(f)) {
              const base = f.replace(/(_in_word|_by_word)$/, '');
              if (/date|birth/i.test(base)) {
                contractDataToSave[f] = getIndonesianDateInWords(contractData[base]) || contractData[f] || '';
              } else {
                const n = Number(contractData[base] || 0) || 0;
                contractDataToSave[f] = getIndonesianNumberWord(n) || contractData[f] || '';
              }
            }
          });

          const bmDataToSave = { ...bmData };
          bmFields.forEach((f) => {
            if (/_in_word$|_by_word$/.test(f)) {
              const base = f.replace(/(_in_word|_by_word)$/, '');
              if (/date|birth/i.test(base)) {
                bmDataToSave[f] = getIndonesianDateInWords(bmData[base]) || bmData[f] || '';
              } else {
                const n = Number(bmData[base] || 0) || 0;
                bmDataToSave[f] = getIndonesianNumberWord(n) || bmData[f] || '';
              }
            }
          });

          const headerFieldsToSave = { ...headerFields };
          if (headerFieldsToSave.agreement_date) {
            headerFieldsToSave.agreement_day_in_word = getIndonesianDayName(headerFieldsToSave.agreement_date) || headerFieldsToSave.agreement_day_in_word || '';
            headerFieldsToSave.agreement_date_in_word = getIndonesianDateInWords(headerFieldsToSave.agreement_date) || headerFieldsToSave.agreement_date_in_word || '';
          }

          // Sertakan juga objek `debtor` level atas untuk mencocokkan ekspektasi API lama
          const debtorToSave = { ...contractDataToSave };
          const effectiveContractNumber = (contractNumber && String(contractNumber).trim()) ? contractNumber : (initialContractNumber || '');
          // pastikan `contract_number` dikirim supaya backend akan melakukan UPDATE bila perlu
          const payload = {
            contract_number: effectiveContractNumber,
            branch_id: selectedBranchId,
            director: selectedDirector,
            bm_data: bmDataToSave,
            branch_data: branchData,
            contract_data: contractDataToSave,
            debtor: debtorToSave,
            collateral_data: collateralData,
            header_fields: headerFieldsToSave,
            created_by: usernameDisplay,
            // sertakan flag hanya-edit jika parent meminta perilaku hanya-edit
            edit_only: !!(typeof editOnly !== 'undefined' ? editOnly : false),
            create_only: !!(typeof createOnly !== 'undefined' ? createOnly : false)
          };

          // Saat mengedit `bl_agreement` yang ada, sertakan kolom DB tambahan
          // yang dimuat ke `extraFields` sehingga akan dipertahankan/diperbarui.
          if (editOnly || initialContractNumber) {
            Object.keys(extraFields || {}).forEach((k) => {
              // hanya sertakan jika tidak bertabrakan dengan objek bersarang
              if (!payload.hasOwnProperty(k)) payload[k] = extraFields[k];
            });
          }
          // Debug: periksa payload di console browser
          try { console.log('Agreement save payload (contract_number):', effectiveContractNumber, payload); } catch (e) {}
          const saveBase = isUV ? 'uv-agreement' : 'bl-agreement';
          // For UV create (not edit), include audit timestamps and username explicitly
          try {
            const nowIso = new Date().toISOString();
            if (isUV && !(editOnly || initialContractNumber)) {
              payload.created_by = payload.created_by || usernameDisplay || '';
              payload.created_at = payload.created_at || nowIso;
              payload.updated_at = payload.updated_at || nowIso;
            }
          } catch (e) { /* ignore */ }
          return axios.post(`http://localhost:8000/api/${saveBase}/`, payload, {
          headers: {
            'Authorization': accessToken ? `Bearer ${accessToken}` : `Bearer ${localStorage.getItem('access_token')}`,
            'Content-Type': 'application/json'
          }
        });
      };

      try {
        // Basic validation: don't submit when debtor exists but DOB is empty/invalid
        try {
          const rawDob = contractData && contractData.date_birth_of_debtor;
          if ((contractData && (contractData.name_of_debtor || contractData.nik_number_of_debtor)) && (!rawDob || String(rawDob).trim() === '')) {
            setError('Please fill Date of Birth of debtor (format YYYY-MM-DD).');
            setSaving(false);
            return;
          }
          if (rawDob && !isIsoDate(rawDob)) {
            const parsed = parseDateFromDisplay(rawDob);
            if (!parsed) {
              setError('Invalid Date of Birth format. Use YYYY-MM-DD or DD/MM/YYYY.');
              setSaving(false);
              return;
            } else {
              setContractData(prev => ({ ...prev, date_birth_of_debtor: parsed }));
            }
          }
        } catch (vErr) {
          console.warn('Validation check failed', vErr);
        }

        await doSave(localStorage.getItem('access_token'));
        // beri tahu komponen parent bahwa penyimpanan berhasil
        const savedContractNumber = contractNumber || initialContractNumber || '';
        if (typeof onSaved === 'function') {
          try { onSaved(savedContractNumber); } catch (e) { console.warn('onSaved callback failed', e); }
        }
        // Mulai unduhan DOCX otomatis jika ada nomor kontrak
        // JANGAN otomatis-unduh saat mengedit BL Agreement yang sudah ada
        if (!(editOnly || initialContractNumber)) {
          try { await triggerDocxDownload(savedContractNumber, localStorage.getItem('access_token')); } catch (e) { /* ignore download errors */ }
        }
      } catch (err) {
        // Jika token kadaluwarsa, coba refresh dan ulangi sekali
        const respData = err?.response?.data || {};
        const isTokenExpired = respData.code === 'token_not_valid' || (respData.messages && Array.isArray(respData.messages) && respData.messages.some(m => m.message && m.message.toLowerCase().includes('expired')));

        if (isTokenExpired) {
          try {
            const refresh = localStorage.getItem('refresh_token');
            if (!refresh) throw new Error('No refresh token available');
            const r = await axios.post('http://localhost:8000/api/token/refresh/', { refresh });
            const newAccess = r.data.access;
            if (newAccess) {
              localStorage.setItem('access_token', newAccess);
              await doSave(newAccess);
              // setelah retry berhasil, beri tahu parent dan mulai unduhan
              const savedContractNumberRetry = contractNumber || initialContractNumber || '';
              if (typeof onSaved === 'function') {
                try { onSaved(savedContractNumberRetry); } catch (e) { console.warn('onSaved callback failed', e); }
              }
              // JANGAN otomatis-unduh saat mengedit BL Agreement yang sudah ada
              if (!(editOnly || initialContractNumber)) {
                try { await triggerDocxDownload(savedContractNumberRetry, newAccess); } catch (e) { /* ignore */ }
              }
            } else {
              throw new Error('Refresh failed');
            }
          } catch (refreshErr) {
            console.error('Token refresh failed', refreshErr);
            // Bersihkan token dan minta pengguna login kembali
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
            setError('Session expired. Please login again.');
          }
        } else {
          const resp = err?.response;
          if (resp) {
            const status = resp.status;
            const url = resp.request?.responseURL || resp.config?.url || 'unknown';
            let body = '';
            try { body = typeof resp.data === 'string' ? resp.data : JSON.stringify(resp.data); } catch (e) { body = String(resp.data); }
            setError(`Failed to save (${status}) ${url}: ${body && body.substring(0,200)}`);
            console.error('Save error response:', resp);
          } else {
            setError('Failed to save data: ' + (err.message || 'unknown error'));
            console.error('Save error:', err);
          }
        }
      } finally {
        setSaving(false);
      }
    };
  const [contractNumber, setContractNumber] = useState('');
  // isi nomor kontrak awal saat disediakan oleh parent
  useEffect(() => {
    if (initialContractNumber) setContractNumber(initialContractNumber);
  }, [initialContractNumber]);

  // Jika parent memberikan objek kontrak awal (mis. kontrak baru saja dibuat), gabungkan ke form saat TIDAK mengedit
  useEffect(() => {
    if (!initialContractData) return;
    // jangan timpa saat mengedit BL agreement yang ada (initialContractNumber ada)
    if (initialContractNumber) return;
    try {
      if (initialContractData.contract_number) setContractNumber(initialContractData.contract_number);
      setContractData(prev => ({ ...prev, ...initialContractData }));
    } catch (e) {
      console.warn('Failed to apply initialContractData to form', e);
    }
  }, [initialContractData, initialContractNumber]);
  // Handler untuk menyimpan hanya-kontrak melalui endpoint `contracts` (digunakan saat AgreementForm dibuka dalam mode hanya-kontrak)
  const handleContractOnlySave = async () => {
    setContractOnlySaving(true);
    setContractOnlyError('');
    try {
      const token = localStorage.getItem('access_token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      // Bangun payload: kecualikan field pembantu yang berakhiran `_in_word` atau `_by_word`
      const payload = {};
      Object.keys(contractData || {}).forEach((k) => {
        if (/_in_word$|_by_word$/.test(k)) return; // lewati field turunan
        let v = contractData[k];
        // Konversi field numerik menjadi angka (disimpan mentah tanpa titik)
        if (numericFields.includes(k) && v !== undefined && v !== null && v !== '') {
          const n = Number(String(v).replace(/\./g, '').replace(/,/g, ''));
          v = Number.isNaN(n) ? v : n;
        }
        payload[k] = v;
      });
      // Tambahkan kolom audit
      try { payload.created_by = usernameDisplay || '' } catch (e) { payload.created_by = ''; }
      const nowIso = new Date().toISOString();
      payload.created_at = nowIso;
      payload.updated_at = nowIso;

      const res = await axios.post('http://localhost:8000/api/contracts/', payload, { headers });
      if (typeof onContractSaved === 'function') {
        try { onContractSaved(res.data || payload); } catch (e) { console.warn('onContractSaved failed', e); }
      }
    } catch (err) {
      console.error('Failed saving contract-only', err);
      const resp = err?.response;
      if (resp) {
        const status = resp.status;
        const url = resp.request?.responseURL || resp.config?.url || 'unknown';
        let body = '';
        try { body = typeof resp.data === 'string' ? resp.data : JSON.stringify(resp.data); } catch (e) { body = String(resp.data); }
        setContractOnlyError(`Failed saving contract (${status}) ${url}: ${body && body.substring(0,200)}`);
        console.error('Contract-only save response:', resp);
      } else {
        setContractOnlyError('Failed saving contract: ' + (err.message || 'unknown error'));
      }
    } finally {
      setContractOnlySaving(false);
    }
  };
  const [contracts, setContracts] = useState([]);
  const [filteredContracts, setFilteredContracts] = useState([]);
  const [showContractDropdown, setShowContractDropdown] = useState(false);
  const [branches, setBranches] = useState([]);
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [selectedDirector, setSelectedor] = useState('');
  useEffect(() => { if (inModal && createOnly && !selectedDirector) setSelectedor('Supriyono Soekarno'); }, [inModal, createOnly]);
  const [directors, setDirectors] = useState([]);
  const [loadingBranches, setLoadingBranches] = useState(true);
  const [loadingDirectors, setLoadingDirectors] = useState(true);
  const [loadingContracts, setLoadingContracts] = useState(true);
  const [bmData, setBmData] = useState({});
  const [branchData, setBranchData] = useState({});
  const [contractData, setContractData] = useState({});
  const [collateralData, setCollateralData] = useState({});
  const [uvCollateralFields, setUvCollateralFields] = useState([]);
  const [extraFields, setExtraFields] = useState({});

  // Pembantu untuk menemukan nilai dalam objek dengan pencocokan kunci toleran (varian kasus/format)
  const findValueInObj = (obj, targetKey) => {
    if (!obj || !targetKey) return undefined;
    const normalize = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const nt = normalize(targetKey);
    // kecocokan langsung tepat
    if (obj.hasOwnProperty(targetKey)) return obj[targetKey];
    // coba kunci huruf kecil
    if (obj.hasOwnProperty(targetKey.toLowerCase())) return obj[targetKey.toLowerCase()];
    // kecocokan ternormalisasi
    for (const k of Object.keys(obj)) {
      if (normalize(k) === nt) return obj[k];
    }
    // kecocokan berisi atau tumpang tindih token
    const parts = targetKey.split('_').map(p => p.toLowerCase()).filter(Boolean);
    for (const k of Object.keys(obj)) {
      const lk = k.toLowerCase();
      let score = 0;
      for (const p of parts) if (p.length > 2 && lk.includes(p)) score++;
      if (score >= Math.max(1, Math.floor(parts.length / 2))) return obj[k];
    }
    return undefined;
  };
  const [headerFields, setHeaderFields] = useState({
    agreement_date: new Date().toISOString().split('T')[0],
    place_of_agreement: '',
    agreement_day_in_word: '',
    agreement_date_in_word: '',
    Name_of_director: '',
    date_of_delegated: new Date().toISOString().split('T')[0],
    sp3_number: '',
    sp3_date: new Date().toISOString().split('T')[0],
    phone_number_of_lolc: ''
  });
  const [debtor, setDebtor] = useState(null);
  const [collateral, setCollateral] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [contractOnlySaving, setContractOnlySaving] = useState(false);
  const [contractOnlyError, setContractOnlyError] = useState('');

  // Daftar field
  const bmFields = [
    'name_of_bm','place_birth_of_bm','date_birth_of_bm','date_birth_of_bm_in_word',
    'street_of_bm','subdistrict_of_bm','district_of_bm','city_of_bm','province_of_bm',
    'nik_number_of_bm','phone_number_of_bm'
  ];

  // Field cabang untuk ditampilkan di bawah Data Cabang
  const branchFields = ['street_name','subdistrict','district','city','province'];

  // Field yang harus diformat dengan pemisah ribuan titik (hanya frontend)
  const numericFields = ['loan_amount','notaris_fee','admin_fee','net_amount','previous_topup_amount','mortgage_amount','admin_rate','tlo','life_insurance'];

  const contractFields = [
    'contract_number','nik_number_of_debtor','name_of_debtor','place_birth_of_debtor','date_birth_of_debtor','date_birth_of_debtor_in_word',
    'street_of_debtor','subdistrict_of_debtor','district_of_debtor','city_of_debtor','province_of_debtor',
    'phone_number_of_debtor','business_partners_relationship','business_type','loan_amount',
    'loan_amount_in_word','term','term_by_word','flat_rate','flat_rate_by_word','bank_account_number',
    'name_of_bank','name_of_account_holder','virtual_account_number','notaris_fee','notaris_fee_in_word','admin_fee','admin_fee_in_word',
    'topup_contract','previous_topup_amount','mortgage_amount','mortgage_amount_in_word','net_amount','net_amount_in_word','admin_rate','admin_rate_in_word','tlo','tlo_in_word','life_insurance','life_insurance_in_word'
  ];

  // Visibility rules for contract fields depending on BL vs UV and create-mode
  const hiddenForUV = new Set(['mortgage_amount', 'mortgage_amount_in_word']);
  const hiddenForBLCreate = new Set(['tlo', 'tlo_in_word', 'admin_rate', 'admin_rate_in_word', 'life_insurance', 'life_insurance_in_word']);

  const getVisibleContractFields = (forContractOnly = false) => {
    // forContractOnly: used by the contract-only modal (always apply rules)
    // for main form, we apply rules only when creating a document (`createOnly` prop)
    const shouldHide = forContractOnly || !!createOnly;
    if (!shouldHide) return contractFields;
    if (isUV) return contractFields.filter(f => !hiddenForUV.has(f));
    return contractFields.filter(f => !hiddenForBLCreate.has(f));
  };

  // Saat direktur dipilih, ambil detail direktur (phone_number_of_lolc) dan isi `contractData`
  useEffect(() => {
    if (!selectedDirector) return;
    (async () => {
      try {
        const token = localStorage.getItem('access_token');
        const res = await axios.get('http://localhost:8000/api/directors/', {
          params: { name: selectedDirector },
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        const director = res.data.director || null;
        if (director) {
          setHeaderFields(prev => ({ ...prev, phone_number_of_lolc: director.phone_number_of_lolc || '', Name_of_director: selectedDirector }));
        }
      } catch (err) {
        console.warn('Failed to load director details', err);
      }
    })();
  }, [selectedDirector]);

  const collateralFields = [
    'collateral_type','number_of_certificate','number_of_ajb','surface_area','name_of_collateral_owner',
    'capacity_of_building','location_of_land'
  ];

  // Muat nomor kontrak dan daftar cabang saat komponen dimount
  useEffect(() => {
    loadContracts();
    loadBranches();
    loadDirectors();
  }, []);

  // Pembantu untuk mengisi data branch dan BM dari daftar `branches`
  const handleBranchSelectLoad = (branchId) => {
    if (!branchId) return;
    const sel = (branches || []).find(b => String(b.id) === String(branchId));
    console.log('handleBranchSelectLoad called for branchId=', branchId, 'branchesLoaded=', (branches||[]).length);
    if (!sel) { console.warn('handleBranchSelectLoad: branch not found for id', branchId); return; }
    setBranchData({
      street_name: sel.street_name ?? sel.street_of_bm ?? '',
      subdistrict: sel.subdistrict ?? sel.subdistrict_of_bm ?? '',
      district: sel.district ?? sel.district_of_bm ?? '',
      city: sel.city ?? sel.city_of_bm ?? sel.name ?? '',
      province: sel.province ?? sel.province_of_bm ?? ''
    });
    // Setel `place_of_agreement` ke nama cabang untuk alur pembuatan (dan berguna secara umum)
    setHeaderFields(prev => ({ ...prev, place_of_agreement: sel.name ?? prev.place_of_agreement ?? '' }));
    setBmData(prev => ({
      ...prev,
      name_of_bm: sel.name_of_bm ?? sel.name ?? prev.name_of_bm ?? '',
      place_birth_of_bm: sel.place_birth_of_bm ?? sel.place_of_birth_of_bm ?? prev.place_birth_of_bm ?? '',
      date_birth_of_bm: sel.date_birth_of_bm ?? sel.date_of_birth_of_bm ?? prev.date_birth_of_bm ?? '',
      street_of_bm: sel.street_name_of_bm ?? sel.street_of_bm ?? sel.street_name ?? prev.street_of_bm ?? '',
      subdistrict_of_bm: sel.subdistrict_of_bm ?? sel.subdistrict ?? prev.subdistrict_of_bm ?? '',
      district_of_bm: sel.district_of_bm ?? sel.district ?? prev.district_of_bm ?? '',
      city_of_bm: sel.city_of_bm ?? sel.city ?? sel.name ?? prev.city_of_bm ?? '',
      province_of_bm: sel.province_of_bm ?? sel.province ?? prev.province_of_bm ?? '',
      nik_number_of_bm: sel.nik_number_of_bm ?? prev.nik_number_of_bm ?? '',
      phone_number_of_bm: sel.phone_number_of_bm ?? prev.phone_number_of_bm ?? ''
    }));
    if ((!sel.name_of_bm || !sel.date_birth_of_bm) && sel.bm_id) loadBMByCity(sel.bm_id);
  };

  // Saat membuat dokumen baru (createOnly), turunkan data BM dari cabang yang dipilih
  useEffect(() => {
    if (!createOnly) return;
    if (!selectedBranchId) return;
    // pilih entri cabang dari daftar `branches`
    const sel = (branches || []).find(b => String(b.id) === String(selectedBranchId));
    if (sel) {
      const mapped = {};
      mapped.street_of_bm = sel.street_name_of_bm ?? sel.street_of_bm ?? sel.street_name ?? '';
      mapped.subdistrict_of_bm = sel.subdistrict_of_bm ?? sel.subdistrict ?? '';
      mapped.district_of_bm = sel.district_of_bm ?? sel.district ?? '';
      mapped.city_of_bm = sel.city_of_bm ?? sel.city ?? sel.name ?? '';
      mapped.province_of_bm = sel.province_of_bm ?? sel.province ?? '';
      mapped.name_of_bm = sel.name_of_bm ?? '';
      mapped.place_birth_of_bm = sel.place_birth_of_bm ?? '';
      mapped.date_birth_of_bm = sel.date_birth_of_bm ?? sel.date_of_birth_of_bm ?? '';
      mapped.nik_number_of_bm = sel.nik_number_of_bm ?? '';
      mapped.phone_number_of_bm = sel.phone_number_of_bm ?? '';
      setBmData(prev => ({ ...prev, ...mapped }));
      // Jika data pribadi BM masih hilang tetapi cabang memiliki `bm_id`, ambil dari `branch_manager`
      if ((!mapped.name_of_bm || !mapped.place_birth_of_bm || !mapped.date_birth_of_bm) && sel.bm_id) {
        loadBMByCity(sel.bm_id);
      }
    } else {
      // fallback: coba muat BM berdasarkan id cabang (beberapa API menerima id cabang)
      loadBMByCity(selectedBranchId);
    }
  }, [createOnly, selectedBranchId, branches]);

  // If parent provides initialContractNumber (edit), rely on the debounced
  // `handleView` to load the data. The top-level effect at component mount
  // already sets `contractNumber` from `initialContractNumber`, so the
  // debounced auto-fetch will perform the single load.
  useEffect(() => {
    if (!initialContractNumber) return;
    // Set contractNumber and perform an immediate load from bl_agreement
    // so edit form shows DB values without requiring filter inputs.
    setContractNumber(initialContractNumber);
    (async () => {
      try {
        await handleView(initialContractNumber);
      } catch (err) {
        console.warn('Initial contract load failed', err);
      }
    })();
  }, [initialContractNumber]);

  // Load current username for display next to Save button
  // Set username immediately from localStorage if available, then refresh via whoami
  useEffect(() => {
    const raw = localStorage.getItem('user_data');
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        setUsernameDisplay(parsed.username || parsed.full_name || '');
      } catch (e) {
        // ignore
      }
    }

    (async () => {
      try {
        const token = localStorage.getItem('access_token');
        if (!token) return;
        const res = await axios.get('http://localhost:8000/api/whoami/', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        setUsernameDisplay(res.data.username || res.data.full_name || '');
      } catch (err) {
        console.warn('whoami fetch failed', err);
      }
    })();
  }, []);

  // Update header fields when date changes
  useEffect(() => {
    if (headerFields.agreement_date) {
      setHeaderFields(prev => ({
        ...prev,
        agreement_day_in_word: getIndonesianDayName(headerFields.agreement_date),
        agreement_date_in_word: getIndonesianDateInWords(headerFields.agreement_date),
        date_of_delegated: headerFields.agreement_date
      }));
    }
  }, [headerFields.agreement_date]);

  // Update place_of_agreement when branch city changes
  useEffect(() => {
    // Only set place_of_agreement from BM city when no branch has been selected.
    if (!selectedBranchId && bmData.city_of_bm) {
      setHeaderFields(prev => ({
        ...prev,
        place_of_agreement: bmData.city_of_bm
      }));
    }
  }, [bmData.city_of_bm]);

  // Auto-convert BM date_birth to words
  useEffect(() => {
    const raw = bmData.date_birth_of_bm;
    if (raw !== undefined && raw !== null && String(raw).trim() !== '') {
      const iso = parseDateFromDisplay(raw);
      const words = getIndonesianDateInWords(iso || raw);
      setBmData(prev => {
        // avoid unnecessary state update
        if (prev.date_birth_of_bm === iso && prev.date_birth_of_bm_in_word === words) return prev;
        const out = { ...prev, date_birth_of_bm_in_word: words };
        if (iso && prev.date_birth_of_bm !== iso) out.date_birth_of_bm = iso;
        return out;
      });
      console.log('Converted BM date_birth to words:', raw, '=>', words, '(iso:', iso, ')');
    }
  }, [bmData.date_birth_of_bm]);

  // Auto-convert debtor date_birth to words
  useEffect(() => {
    const raw = contractData.date_birth_of_debtor;
    if (raw !== undefined && raw !== null && String(raw).trim() !== '') {
      const iso = parseDateFromDisplay(raw);
      const words = getIndonesianDateInWords(iso || raw);
      setContractData(prev => {
        if (prev.date_birth_of_debtor === iso && prev.date_birth_of_debtor_in_word === words) return prev;
        const out = { ...prev, date_birth_of_debtor_in_word: words };
        if (iso && prev.date_birth_of_debtor !== iso) out.date_birth_of_debtor = iso;
        return out;
      });
      console.log('Converted debtor date_birth to words:', raw, '=>', words, '(iso:', iso, ')');
    }
  }, [contractData.date_birth_of_debtor]);

  // Auto-convert loan_amount to words
  useEffect(() => {
    if (contractData.loan_amount !== undefined && contractData.loan_amount !== null && contractData.loan_amount !== '') {
      const words = getIndonesianNumberWord(Number(contractData.loan_amount) || 0);
      setContractData(prev => ({ ...prev, loan_amount_in_word: words }));
      console.log('Converted loan_amount to words:', contractData.loan_amount, '=>', words);
    }
  }, [contractData.loan_amount]);

  // Auto-convert term to words
  useEffect(() => {
    if (contractData.term !== undefined && contractData.term !== null && contractData.term !== '') {
      const words = getIndonesianNumberWord(Number(contractData.term) || 0);
      setContractData(prev => ({ ...prev, term_by_word: words }));
      console.log('Converted term to words:', contractData.term, '=>', words);
    }
  }, [contractData.term]);

  // Auto-convert flat_rate to words
  useEffect(() => {
    if (contractData.flat_rate !== undefined && contractData.flat_rate !== null && contractData.flat_rate !== '') {
      const words = getIndonesianNumberWord(Number(contractData.flat_rate) || 0);
      setContractData(prev => ({ ...prev, flat_rate_by_word: words }));
      console.log('Converted flat_rate to words:', contractData.flat_rate, '=>', words);
    }
  }, [contractData.flat_rate]);

  // Auto-convert notaris_fee to words
  useEffect(() => {
    if (contractData.notaris_fee !== undefined && contractData.notaris_fee !== null && contractData.notaris_fee !== '') {
      const words = getIndonesianNumberWord(Number(contractData.notaris_fee) || 0);
      setContractData(prev => ({ ...prev, notaris_fee_in_word: words }));
      console.log('Converted notaris_fee to words:', contractData.notaris_fee, '=>', words);
    }
  }, [contractData.notaris_fee]);

  // Auto-convert admin_fee to words
  useEffect(() => {
    if (contractData.admin_fee !== undefined && contractData.admin_fee !== null && contractData.admin_fee !== '') {
      const words = getIndonesianNumberWord(Number(contractData.admin_fee) || 0);
      setContractData(prev => ({ ...prev, admin_fee_in_word: words }));
      console.log('Converted admin_fee to words:', contractData.admin_fee, '=>', words);
    }
  }, [contractData.admin_fee]);

  // Auto-convert net_amount to words
  useEffect(() => {
    if (contractData.net_amount !== undefined && contractData.net_amount !== null && contractData.net_amount !== '') {
      const words = getIndonesianNumberWord(Number(contractData.net_amount) || 0);
      setContractData(prev => ({ ...prev, net_amount_in_word: words }));
      console.log('Converted net_amount to words:', contractData.net_amount, '=>', words);
    }
  }, [contractData.net_amount]);

  // Auto-convert mortgage_amount to words
  useEffect(() => {
    if (contractData.mortgage_amount !== undefined && contractData.mortgage_amount !== null && contractData.mortgage_amount !== '') {
      const words = getIndonesianNumberWord(Number(contractData.mortgage_amount) || 0);
      setContractData(prev => ({ ...prev, mortgage_amount_in_word: words }));
      console.log('Converted mortgage_amount to words:', contractData.mortgage_amount, '=>', words);
    }
  }, [contractData.mortgage_amount]);

  // Auto-convert admin_rate, tlo, life_insurance to words
  useEffect(() => {
    if (contractData.admin_rate !== undefined && contractData.admin_rate !== null && contractData.admin_rate !== '') {
      const words = getIndonesianNumberWord(Number(contractData.admin_rate) || 0);
      setContractData(prev => ({ ...prev, admin_rate_in_word: words }));
      console.log('Converted admin_rate to words:', contractData.admin_rate, '=>', words);
    }
  }, [contractData.admin_rate]);

  useEffect(() => {
    if (contractData.tlo !== undefined && contractData.tlo !== null && contractData.tlo !== '') {
      const words = getIndonesianNumberWord(Number(contractData.tlo) || 0);
      setContractData(prev => ({ ...prev, tlo_in_word: words }));
      console.log('Converted tlo to words:', contractData.tlo, '=>', words);
    }
  }, [contractData.tlo]);

  useEffect(() => {
    if (contractData.life_insurance !== undefined && contractData.life_insurance !== null && contractData.life_insurance !== '') {
      const words = getIndonesianNumberWord(Number(contractData.life_insurance) || 0);
      setContractData(prev => ({ ...prev, life_insurance_in_word: words }));
      console.log('Converted life_insurance to words:', contractData.life_insurance, '=>', words);
    }
  }, [contractData.life_insurance]);

  // Auto-sync SP3 Date dengan Agreement Date
  useEffect(() => {
    setHeaderFields(prev => ({
      ...prev,
      sp3_date: prev.agreement_date
    }));
  }, [headerFields.agreement_date]);

  // Auto-generate SP3 Number dengan format: [CONTRACT_NUMBER]/OL/LOLCVI/[BULAN_ROMAWI]/[YEAR]
  useEffect(() => {
    // When contract number (from filter or form) or agreement date changes,
    // ensure SP3 number is generated using the agreement date's month/year.
    const cn = (contractData && contractData.contract_number) || (contractNumber || '');
    const dateSource = headerFields.agreement_date || headerFields.sp3_date || '';
    if (dateSource && cn) {
      try {
        const sp3Date = new Date(String(dateSource) + 'T00:00:00');
        if (!isNaN(sp3Date.getTime())) {
          const month = sp3Date.getMonth() + 1;
          const year = sp3Date.getFullYear();
          const romanMonth = getMonthInRomanNumeral(month);
          const generatedSP3Number = `${cn}/OL/LOLCVI/${romanMonth}/${year}`;
          setHeaderFields(prev => ({ ...prev, sp3_number: generatedSP3Number }));
        }
      } catch (e) {
        // ignore malformed dates
      }
    }
  }, [headerFields.agreement_date, headerFields.sp3_date, contractData.contract_number, contractNumber]);

  // Utility functions for Indonesian date formatting
  const getIndonesianDayName = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString + 'T00:00:00');
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    return days[date.getDay()];
  };

  const getIndonesianDateInWords = (dateString) => {
    if (!dateString) return '';
    // Normalize input to ISO (yyyy-mm-dd). If not parseable, return empty string.
    const iso = parseDateFromDisplay(dateString);
    if (!iso) return '';
    const date = new Date(iso + 'T00:00:00');
    if (isNaN(date.getTime())) return '';
    const monthsInWords = ['januari', 'februari', 'maret', 'april', 'mei', 'juni',
                           'juli', 'agustus', 'september', 'oktober', 'november', 'desember'];
    const day = date.getDate();
    const month = monthsInWords[date.getMonth()];
    const year = date.getFullYear();
    return `${getIndonesianNumberWord(day)} ${month} ${getIndonesianNumberWord(year)}`;
  };

  const isIsoDate = (s) => {
    if (!s) return false;
    return /^\d{4}-\d{2}-\d{2}$/.test(String(s));
  };

  const getIndonesianNumberWord = (num) => {
    // Handle decimals by spelling integer part and then each decimal digit
    const units = ['', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'delapan', 'sembilan'];

    const spellInt = (n) => {
      n = Math.floor(n);
      if (n === 0) return 'nol';
      const parts = [];
      const billions = Math.floor(n / 1000000000);
      if (billions) { parts.push(spellInt(billions) + ' miliar'); n %= 1000000000; }
      const millions = Math.floor(n / 1000000);
      if (millions) { parts.push(spellInt(millions) + ' juta'); n %= 1000000; }
      const thousands = Math.floor(n / 1000);
      if (thousands) {
        if (thousands === 1) parts.push('seribu'); else parts.push(spellInt(thousands) + ' ribu');
        n %= 1000;
      }
      const hundreds = Math.floor(n / 100);
      if (hundreds) {
        if (hundreds === 1) parts.push('seratus'); else parts.push(units[hundreds] + ' ratus');
        n %= 100;
      }
      if (n >= 20) {
        const tens = Math.floor(n / 10);
        parts.push((tens === 1 ? 'sepuluh' : (tens === 1 ? 'sepuluh' : (tens === 1 ? 'sepuluh' : ''))))
      }
      if (n >= 10 && n < 20) {
        if (n === 10) parts.push('sepuluh');
        else if (n === 11) parts.push('sebelas');
        else parts.push(units[n - 10] + ' belas');
      } else if (n > 0 && n < 10) {
        parts.push(units[n]);
      } else if (n >= 20) {
        const tens = Math.floor(n / 10);
        const rest = n % 10;
        const tensWord = ['','','dua puluh','tiga puluh','empat puluh','lima puluh','enam puluh','tujuh puluh','delapan puluh','sembilan puluh'][tens];
        parts.push(tensWord + (rest ? ' ' + units[rest] : ''));
      }
      return parts.join(' ').trim();
    };

    try {
      if (num === '' || num === null || num === undefined) return '';
      const s = String(num).trim().replace(',', '.');
      if (s.indexOf('.') >= 0) {
        const [intPart, decPart] = s.split('.', 2);
        const intNum = intPart === '' ? 0 : parseInt(intPart, 10);
        const intWords = intNum === 0 ? 'nol' : spellInt(intNum);
        const decWords = decPart.split('').map(d => units[parseInt(d,10)] || d).join(' ');
        return (intWords + ' koma ' + decWords).trim();
      } else {
        const n = parseInt(s, 10);
        return spellInt(n);
      }
    } catch (e) {
      return String(num);
    }
  };

  const getMonthInRomanNumeral = (monthNumber) => {
    // monthNumber should be 1-12
    const romanNumerals = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
    return romanNumerals[monthNumber - 1] || '';
  };

  const loadContracts = async () => {
    setLoadingContracts(true);
    const token = localStorage.getItem('access_token');
    if (!token) {
      // not logged in: skip loading contracts silently
      setContracts([]);
      setLoadingContracts(false);
      return;
    }
    try {
      const response = await axios.get('http://localhost:8000/api/bl-agreement/contracts/', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      setContracts(response.data.contracts || []);
    } catch (err) {
      console.error('Error loading contracts:', err);
      if (!err.response || err.response.status !== 401) {
        setError('Gagal memuat daftar kontrak');
      }
    } finally {
      setLoadingContracts(false);
    }
  };

  const loadBranches = async () => {
    setLoadingBranches(true);
    const token = localStorage.getItem('access_token');
    try {
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
      const res = await axios.get('http://localhost:8000/api/branches/', { headers });
      // Expect branches as objects: {id, name, area_id, ...}
      const items = res.data.branches || [];
      setBranches(items);
      console.log('Loaded branches count:', items.length, items.slice(0,3));
    } catch (err) {
      console.error('Error loading branches:', err);
      if (!err.response || err.response.status !== 401) {
        setError('Gagal memuat daftar cabang');
      }
    } finally {
      setLoadingBranches(false);
    }
  };

  const loadDirectors = async () => {
    setLoadingDirectors(true);
    const token = localStorage.getItem('access_token');
    if (!token) {
      setDirectors([]);
      setLoadingDirectors(false);
      return;
    }
    try {
      const res = await axios.get('http://localhost:8000/api/directors/', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setDirectors(res.data.directors || []);
    } catch (err) {
      console.error('Error loading directors:', err);
      if (!err.response || err.response.status !== 401) {
        setError('Gagal memuat daftar direktur');
      }
    } finally {
      setLoadingDirectors(false);
    }
  };

  const loadBMByCity = async (city) => {
    if (!city) return;
    try {
      // If a numeric bm id is passed, request by bm_id; otherwise use city
      const params = {};
      if (String(city).match(/^\d+$/)) params.bm_id = city; else params.city = city;
      const res = await axios.get('http://localhost:8000/api/branch-manager/', {
        params,
        headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` }
      });
      const bm = res.data.bm || {};
      console.log('=== Loaded BM from branch_manager API ===');
      console.log('All BM keys:', Object.keys(bm));
      console.log('Full BM object:', JSON.stringify(bm, null, 2));
      
      // petakan field BM ke `bmData` - gabungkan dengan data yang sudah ada
      setBmData(prevBmData => {
        const newBm = { ...prevBmData };
        bmFields.forEach((f) => { 
          const value = bm[f];
          console.log(`BM Field "${f}": "${value}"`);
          // Perbarui hanya jika field memiliki nilai di respon API
          if (bm[f] !== undefined && bm[f] !== null && bm[f] !== '') {
            newBm[f] = bm[f];
          }
        });
        console.log('=== Final Merged BM Data ===', newBm);
        return newBm;
      });
    } catch (err) {
      console.error('Error loading BM for city/bm_id:', err);
    }
  };

  const handleView = async (overrideContractNumber, forCreate = false) => {
    const cn = (overrideContractNumber !== undefined && overrideContractNumber !== null) ? String(overrideContractNumber) : String(contractNumber);
    console.log('handleView called', { contractNumber: cn, forCreate });
    if (!cn || !cn.trim()) {
      // Tidak ada kontrak terpilih: kosongkan data yang ditampilkan dan keluar dengan diam-diam
      setDebtor(null);
      setCollateral(null);
      setError('');
      return;
    }

    setLoading(true);
    setError('');
    try {
      // Ambil data dari API backend (pilih BL atau UV berdasarkan prop `isUV`)
      const base = isUV ? 'uv-agreement' : 'bl-agreement';
      const response = await axios.get(`http://localhost:8000/api/${base}/`, {
        params: { contract_number: cn },
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      });

      setDebtor(response.data.debtor || null);
      setCollateral(response.data.collateral || null);

      // Jika kita dalam mode edit, pilih untuk langsung memetakan semua kolom dari
      // baris `bl_agreement` yang dikembalikan backend ke state form. Ini
      // menghindari pemetaan heuristik dan menjamin bahwa field yang ada di
      // DB ditampilkan di form persis seperti disimpan.
      if (editOnly || initialContractNumber) {
        const blRow = response.data.debtor || response.data || {};
        // Isi `contractData` langsung dari kunci-kunci yang muncul di `contractFields`
        const directContractData = {};
        contractFields.forEach((f) => { directContractData[f] = findValueInObj(blRow, f) ?? ''; });

        // Isi `bmData` LANGSUNG hanya dari kolom `bl_agreement` (tanpa heuristik,
        // tidak berkonsultasi dengan objek BM terpisah). Ini memastikan form edit
        // menampilkan nilai persis yang tersimpan di `bl_agreement`.
        const directBmData = {};
        bmFields.forEach((f) => {
          directBmData[f] = findValueInObj(blRow, f) ?? '';
        });

        // Data cabang: ambil dari `response.branch` atau `blRow`
        const branchResp = response.data.branch || {};
        // Use values from the bl_agreement row only for edit mode (do not fallback to separate branch object)
        const directBranchData = {
          street_name: blRow.street_name ?? blRow.street_of_bm ?? '',
          subdistrict: blRow.subdistrict ?? blRow.subdistrict_of_bm ?? '',
          district: blRow.district ?? blRow.district_of_bm ?? '',
          city: blRow.city ?? blRow.city_of_bm ?? '',
          province: blRow.province ?? blRow.province_of_bm ?? ''
        };

        // Jaminan (collateral): for UV we should display uv_collateral fields directly; for BL fall back to existing mapping
        const coll = response.data.collateral || {};
        let directCollateralData = {};
        if (isUV) {
          // Use the collateral object keys returned by backend for UV edit mode
          directCollateralData = { ...(coll || {}) };
          // track uv collateral field order (exclude id and contract_number)
          try {
            const uvKeys = Object.keys(directCollateralData).filter(k => !/^id$|contract_number$/i.test(k));
            setUvCollateralFields(uvKeys);
          } catch (e) { /* ignore */ }
        } else {
          collateralFields.forEach((f) => { directCollateralData[f] = findValueInObj(coll, f) ?? findValueInObj(blRow, f) ?? ''; });
        }

        // Field header: utamakan field header eksplisit dari response, fallback ke `blRow`
        // Header values must come from bl_agreement row only when editing
        const directHeader = {
          ...headerFields,
          agreement_date: blRow.agreement_date ?? headerFields.agreement_date,
          place_of_agreement: blRow.city ?? headerFields.place_of_agreement,
          Name_of_director: blRow.Name_of_director ?? blRow.name_of_director ?? headerFields.Name_of_director,
          phone_number_of_lolc: blRow.phone_number_of_lolc ?? blRow.phone_of_lolc ?? headerFields.phone_number_of_lolc,
          sp3_number: blRow.sp3_number ?? blRow.sp3No ?? headerFields.sp3_number,
          sp3_date: blRow.sp3_date ?? blRow.sp3Date ?? headerFields.sp3_date
        };

        setContractData(directContractData);
        // Untuk mode edit kita harus menampilkan data BM persis seperti tersimpan di `bl_agreement`
        setBmData(directBmData);
        setBranchData(directBranchData);
        setCollateralData(directCollateralData);
        // Isi `extraFields` dengan kolom yang tersisa dari baris `bl_agreement`
        const known = new Set([...contractFields, ...bmFields, ...branchFields, ...collateralFields, Object.keys(directHeader || {})]);
        const extras = {};
        Object.keys(blRow || {}).forEach(k => {
          if (!known.has(k) && k !== 'id') extras[k] = blRow[k];
        });
        setExtraFields(extras);
        setHeaderFields(prev => ({ ...prev, ...directHeader }));

        // Jika baris DB ada namun tidak ada objek collateral yang dikembalikan, biarkan state collateral terisi dari `blRow`
        // Lewati sisa logika pemetaan
        if (!response.data.collateral) setCollateral(response.data.collateral || null);
        // Selesai: kembali lebih awal untuk menghindari pemetaan heuristik di bawah
        return;
      }

      // Debug: log struktur data response
      console.log('=== API Response Data ===');
      console.log('Full debtor object:', response.data.debtor);
      console.log('BM object:', response.data.bm || response.data.branch_manager || response.data.bm_data);
      console.log('Branch object:', response.data.branch);
      console.log('=======================');

      // Isi state form yang dapat diedit (peta hanya field yang dikenal)
      const d = response.data.debtor || {};
      const c = response.data.collateral || {};

      const newContractData = {};
      contractFields.forEach((f) => { newContractData[f] = d[f] ?? '' });

      // Isi data BM: utamakan objek BM eksplisit dari response jika disediakan,
      // jika tidak coba petakan field BM dari respon debtor, dan sebagai upaya
      // terakhir aktifkan pemuatan berdasarkan kota/bm_id sehingga `loadBMByCity` dapat mengambilnya.
      const newBmData = {};
      
      // Inisialisasi semua field BM menjadi kosong terlebih dahulu
      bmFields.forEach((f) => { newBmData[f] = '' });
      
      const bmFromResp = response.data.bm || response.data.branch_manager || response.data.bm_data || {};
      console.log('=== BM Response Object Keys ===');
      console.log('All keys in bmFromResp:', Object.keys(bmFromResp));
      console.log('Full bmFromResp object:', JSON.stringify(bmFromResp, null, 2));
      if (bmFromResp && Object.keys(bmFromResp).length > 0) {
        // Jika kita memiliki data BM dari response API, gunakan itu
        // Gunakan strategi pencocokan kunci ternormalisasi untuk mentoleransi variasi backend
        const respKeys = Object.keys(bmFromResp || {});
        const normalize = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '').replace(/of/g, '');
        const normMap = {};
        respKeys.forEach(k => { normMap[normalize(k)] = k; });
        bmFields.forEach((f) => {
          const candidates = [f, f.replace(/_of_/g, '_'), f.replace(/_of_/g, '_of_'), f.replace(/_birth_/g, '_of_birth_')];
          let found = null;
          // coba kunci langsung dan varian umum
          for (const c of candidates) {
            if (bmFromResp[c] !== undefined) { found = c; break; }
          }
          // fallback: cocokkan berdasarkan kunci ternormalisasi
          if (!found) {
            const nf = normalize(f);
            if (normMap[nf]) found = normMap[nf];
            else {
              // coba temukan kunci respon yang mengandung sebagian besar token
              const parts = f.split('_').filter(p => p && p !== 'of');
              for (const k of respKeys) {
                const lk = k.toLowerCase();
                const matches = parts.reduce((acc, p) => acc + (p && p.length > 2 && lk.includes(p) ? 1 : 0), 0);
                if (matches >= Math.max(1, Math.floor(parts.length / 2))) { found = k; break; }
              }
            }
          }
          const value = found ? bmFromResp[found] : undefined;
          console.log(`BM mapping for field "${f}" -> found key "${found}" value:`, value);
          newBmData[f] = value !== undefined && value !== null ? value : '';
        });
        // Untuk field BM yang masih kosong, coba ambil dari payload debtor
        const debtorObj = d || {};
        const debtorKeys = Object.keys(debtorObj || {});
        const normalizeKey = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '').replace(/of/g, '');
        const debtorNormMap = {};
        debtorKeys.forEach(k => { debtorNormMap[normalizeKey(k)] = k; });
        bmFields.forEach((f) => {
          if (newBmData[f] && String(newBmData[f]).trim() !== '') return; // sudah terisi
          // coba kunci debtor yang tepat dan varian yang dikenal
          const variants = [f, f.replace(/_of_/g, '_'), f.replace(/_of_/g, '_of_'), f.replace(/_birth_/g, '_of_birth_'), f.replace(/_of_bm/g, ''), f.replace(/_bm/g, '')];
          let foundKey = null;
          for (const v of variants) {
            if (debtorObj[v] !== undefined) { foundKey = v; break; }
          }
          if (!foundKey) {
            const nf = normalizeKey(f);
            if (debtorNormMap[nf]) foundKey = debtorNormMap[nf];
            else {
              // pilih kecocokan longgar berdasarkan tumpang tindih token
              const parts = f.split('_').filter(p => p && p !== 'of');
              for (const k of debtorKeys) {
                const lk = k.toLowerCase();
                const matches = parts.reduce((acc, p) => acc + (p && p.length > 2 && lk.includes(p) ? 1 : 0), 0);
                if (matches >= Math.max(1, Math.floor(parts.length / 2))) { foundKey = k; break; }
              }
            }
          }
          if (foundKey) {
            newBmData[f] = debtorObj[foundKey] ?? '';
            console.log(`Filled BM field "${f}" from debtor key "${foundKey}" ->`, newBmData[f]);
          }
        });
        } else {
        // Coba memetakan field BM yang termasuk dalam payload debtor (beberapa API menggabungkan BM ke dalam debtor)
        let mapped = false;
        const debtorKeys = Object.keys(d || {}).map(k => k.toLowerCase());
        bmFields.forEach((f) => {
          const lf = f.toLowerCase();
          // Kecocokan tepat terlebih dahulu
          if (d[f] !== undefined) {
            newBmData[f] = d[f] ?? '';
            mapped = true;
            return;
          }
          // Penggantian varian yang dikenal
          if (f === 'place_birth_of_bm' && d['place_of_birth_of_bm'] !== undefined) {
            newBmData[f] = d['place_of_birth_of_bm'] ?? '';
            mapped = true; return;
          }
          if (f === 'date_birth_of_bm' && d['date_of_birth_of_bm'] !== undefined) {
            newBmData[f] = d['date_of_birth_of_bm'] ?? '';
            mapped = true; return;
          }

          // Fallback: coba temukan kunci debtor yang mengandung token penting dan 'bm'
          const parts = lf.split('_').filter(p => p && p !== 'of' && p !== 'number' && p !== 'of' && p !== 'the');
          let foundKey = null;
          for (const k of Object.keys(d || {})) {
            const lk = k.toLowerCase();
            // wajib menyebutkan 'bm' atau 'branch_manager' atau 'branchmanager'
            const mentionsBM = lk.includes('bm') || lk.includes('branch_manager') || lk.includes('branchmanager');
            const tokenMatch = parts.some(p => p.length > 2 && lk.includes(p));
            if (tokenMatch && mentionsBM) { foundKey = k; break; }
            if (!foundKey && tokenMatch) foundKey = k; // simpan sebagai kecocokan longgar
          }
          if (foundKey) {
            newBmData[f] = d[foundKey] ?? '';
            mapped = true;
          }
        });

        // Jika masih tidak ada info BM, coba dari cabang yang dipilih
        if (!mapped && selectedBranchId) {
          console.log('=== Attempting to map from selected branch ===');
          const selectedBranch = (branches || []).find(b => String(b.id) === String(selectedBranchId));
          console.log('Selected branch:', selectedBranch);
          if (selectedBranch) {
            // Peta field alamat dari tabel branches - dukung beberapa nama kolom yang mungkin
            newBmData.street_of_bm = selectedBranch.street_name_of_bm ?? selectedBranch.street_of_bm ?? selectedBranch.street_name ?? newBmData.street_of_bm;
            newBmData.subdistrict_of_bm = selectedBranch.subdistrict_of_bm ?? selectedBranch.subdistrict ?? newBmData.subdistrict_of_bm;
            newBmData.district_of_bm = selectedBranch.district_of_bm ?? selectedBranch.district ?? newBmData.district_of_bm;
            newBmData.city_of_bm = selectedBranch.city_of_bm ?? selectedBranch.city ?? selectedBranch.name ?? newBmData.city_of_bm;
            newBmData.province_of_bm = selectedBranch.province_of_bm ?? selectedBranch.province ?? newBmData.province_of_bm;

            // Peta field personal yang mungkin ada di branches (dukung kunci alternatif)
            newBmData.name_of_bm = selectedBranch.name_of_bm ?? selectedBranch.name_of_bm ?? newBmData.name_of_bm;
            newBmData.place_birth_of_bm = selectedBranch.place_birth_of_bm ?? selectedBranch.place_birth_of_bm ?? newBmData.place_birth_of_bm;
            newBmData.date_birth_of_bm = selectedBranch.date_birth_of_bm ?? selectedBranch.date_of_birth_of_bm ?? newBmData.date_birth_of_bm;
            newBmData.nik_number_of_bm = selectedBranch.nik_number_of_bm ?? newBmData.nik_number_of_bm;
            newBmData.phone_number_of_bm = selectedBranch.phone_number_of_bm ?? newBmData.phone_number_of_bm;
            
            console.log('After branch mapping, newBmData:', newBmData);
            
            // Jika field data personal masih kosong namun `bm_id` ada, ambil dari API branch_manager
            if ((!newBmData.place_birth_of_bm || !newBmData.date_birth_of_bm || !newBmData.name_of_bm) && selectedBranch.bm_id) {
              console.log('=== Fetching personal BM details from branch_manager API using bm_id:', selectedBranch.bm_id);
              loadBMByCity(selectedBranch.bm_id);
            }
            
            mapped = true;
          }
        }

        // Jika masih tidak ada info BM, coba pencarian menggunakan petunjuk yang tersedia
        if (!mapped) {
          let bmLookup = response.data.branch?.bm_id || d.bm_id || response.data.branch?.city_of_bm || d.city_of_debtor || d.city || response.data.branch?.name;
          if (bmLookup) {
            // pengambilan asinkron akan memperbarui state `bmData` ketika selesai
            loadBMByCity(bmLookup);
          }
        }
      }

      let newCollateralData = {};
      // For UV mode, accept whatever columns the backend returned for uv_collateral
      if (isUV) {
        newCollateralData = { ...(c || {}) };
        // Track field order for rendering (exclude id and contract_number)
        const keys = Object.keys(newCollateralData).filter(k => !/^id$|contract_number$/i.test(k));
        setUvCollateralFields(keys);
      } else {
        newCollateralData = {};
        collateralFields.forEach((f) => { newCollateralData[f] = c[f] ?? '' });
      }

      console.log('=== Final BM Data Before State Update ===', newBmData);

      const newHeaderFields = {
        ...headerFields,
        phone_number_of_lolc: d.phone_number_of_lolc ?? headerFields.phone_number_of_lolc,
        Name_of_director: selectedDirector || headerFields.Name_of_director
      };
      console.log('BL Agreement API response:', response.data);

      // Pastikan field header diperbarui berdasarkan state terbaru (gunakan pembaruan fungsional untuk menghindari closure usang)
      if (!forCreate) {
        setHeaderFields(prev => ({
          ...prev,
          phone_number_of_lolc: (d && d.phone_number_of_lolc) ? d.phone_number_of_lolc : (prev.phone_number_of_lolc || ''),
          Name_of_director: selectedDirector || prev.Name_of_director
        }));
      }

      // Note: `mortgage_amount` restored for BL mode; UV mode uses a separate
      // field set (no mortgage_amount). New numeric fields (`admin_rate`, `tlo`, `life_insurance`)
      // will be taken from debtor or collateral if provided by backend in their respective keys.

      setContractData(newContractData);
      setCollateralData(newCollateralData);
      // Saat membuat dokumen baru, jangan timpa data Branch/Branch Manager
      // dengan nilai dari baris backend. Nilai tersebut harus diambil dari
      // pilihan filter branch.
      if (!forCreate) {
        setBmData(newBmData);
      }

      console.log('Updated contractData keys:', Object.keys(newContractData));

      // Isi `branchData`: utamakan cabang yang dipilih dari daftar `branches` (filter),
      // fallback ke `response.data.branch` jika tidak tersedia.
      let newBranchData = {};
      if (selectedBranchId) {
        const sel = (branches || []).find(b => String(b.id) === String(selectedBranchId));
        if (sel) {
          // Utamakan nilai dari kolom tabel branches (street_name, subdistrict, district, city, province)
          newBranchData = {
            street_name: sel.street_name ?? sel.street_of_bm ?? '',
            subdistrict: sel.subdistrict ?? sel.subdistrict_of_bm ?? '',
            district: sel.district ?? sel.district_of_bm ?? '',
            city: sel.city ?? sel.city_of_bm ?? sel.name ?? '',
            province: sel.province ?? sel.province_of_bm ?? ''
          };
        }
      }
      if (!Object.keys(newBranchData).length) {
        const branchResp = response.data.branch || {};
        newBranchData = {
          street_name: branchResp.street_of_bm ?? branchResp.street_name ?? '',
          subdistrict: branchResp.subdistrict_of_bm ?? branchResp.subdistrict ?? '',
          district: branchResp.district_of_bm ?? branchResp.district ?? '',
          city: branchResp.city_of_bm ?? branchResp.city ?? branchResp.name ?? '',
          province: branchResp.province_of_bm ?? branchResp.province ?? ''
        };
      }
      if (!forCreate) {
        setBranchData(newBranchData);

        // Terapkan `place_of_agreement` dari cabang yang dipilih atau kota debtor
        if (selectedBranchId) {
          const branch = (branches || []).find(b => String(b.id) === String(selectedBranchId));
          if (branch) {
            // Gunakan `name` cabang secara eksplisit untuk `place_of_agreement` sesuai permintaan
            setHeaderFields(prev => ({ ...prev, place_of_agreement: branch.name }));
          }
        } else if (newBmData.city_of_bm) {
          setHeaderFields(prev => ({ ...prev, place_of_agreement: newBmData.city_of_bm }));
        }

        // Terapkan info direktur yang dipilih
        if (selectedDirector) {
          setHeaderFields(prev => ({ ...prev, Name_of_director: selectedDirector }));
        }
      } else {
        // Dalam mode create kita tetap ingin direktur yang dipilih tercermin (effect direktur menangani phone/name),
        // dan pemilihan cabang ditangani terpisah, jadi lewati penimpaan field header di sini.
      }

      if (!response.data.debtor && !response.data.collateral) {
        setError('Data tidak ditemukan untuk nomor kontrak ini');
      }
    } catch (err) {
      console.error('Error:', err);
      if (err.response?.status === 404) {
        setError('Data tidak ditemukan untuk nomor kontrak ini');
      } else {
        setError(err.response?.data?.error || 'Gagal mengambil data');
      }
      setDebtor(null);
      setCollateral(null);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setContractNumber('');
    setSelectedBranchId('');
    setSelectedor('');
    setDebtor(null);
    setCollateral(null);
    setError('');
    setBmData({});
    setBranchData({});
    setContractData({});
    setCollateralData({});
    setHeaderFields({
      agreement_date: new Date().toISOString().split('T')[0],
      place_of_agreement: '',
      agreement_day_in_word: '',
      agreement_date_in_word: '',
      Name_of_director: '',
      date_of_delegated: new Date().toISOString().split('T')[0],
      sp3_number: '',
      sp3_date: ''
    });
  };

  const formatFieldName = (fieldName) => {
    // Konversi snake_case atau camelCase menjadi format yang mudah dibaca
    return fieldName
      .replace(/([A-Z])/g, ' $1')
      .replace(/_/g, ' ')
      .replace(/^\w/, (c) => c.toUpperCase())
      .trim();
  };

  const formatFieldValue = (value) => {
    if (value === null || value === undefined) return '-';
    if (typeof value === 'boolean') return value ? 'Ya' : 'Tidak';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  };

  const handleContractNumberChange = (value) => {
    setContractNumber(value);
    if (value && value.trim()) {
      const q = value.toString().toLowerCase();
      const filtered = (contracts || []).filter(c => String(c).toLowerCase().includes(q));
      setFilteredContracts(filtered);
      setShowContractDropdown(filtered.length > 0);
    } else {
      setFilteredContracts(contracts || []);
      setShowContractDropdown(false);
    }
  };

  // Ambil otomatis atau isi awal saat pengguna mengubah input filter (debounced)
  // - Jika `contractNumber` ada -> lakukan pemuatan penuh melalui `handleView`
  // - Jika hanya `selectedBranchId` berubah -> isi Branch & BM dari `branches`
  // - Pemilihan direktur ditangani oleh effectnya sendiri (phone/name)
  useEffect(() => {
    if (hideFilter) return undefined;
    if (initialContractNumber) return undefined; // pemuatan awal untuk edit ditangani di tempat lain

    const shouldTrigger = (contractNumber && contractNumber.toString().trim() !== '') || (selectedBranchId && selectedBranchId !== '') || (selectedDirector && selectedDirector !== '');
    if (!shouldTrigger) return undefined;

    const timer = setTimeout(() => {
      console.log('Debounced filter effect triggered with', { contractNumber, selectedBranchId, selectedDirector, createOnly });
      // Jika nomor kontrak ada, muat via `handleView` (kontrak + collateral + data gabungan)
      if (contractNumber && contractNumber.toString().trim() !== '') {
        // sertakan flag `createOnly` sehingga `handleView` dapat menghindari pembaruan branch/BM dalam mode create
        handleView(undefined, createOnly).catch(() => {});
        return;
      }

      // Jika tidak ada nomor kontrak tetapi cabang dipilih, isi branch + BM dari daftar branches
      if (selectedBranchId && selectedBranchId !== '') {
        try { handleBranchSelectLoad(selectedBranchId); } catch (e) { console.warn('Branch preload failed', e); }
        return;
      }

      // Jika hanya direktur berubah, effect direktur akan mengambil phone/name
    }, 600);
    return () => clearTimeout(timer);
  }, [contractNumber, selectedBranchId, selectedDirector, hideFilter, createOnly, initialContractNumber]);

  const handleSelectContract = (contract) => {
    setContractNumber(contract);
    setShowContractDropdown(false);
    setFilteredContracts([]);
    // Picu pemuatan segera untuk kontrak yang dipilih
    handleView(contract, createOnly).catch(() => {});
  };

  const handleInputChange = (section, field, value) => {
    if (section === 'bm') {
      if (String(field).toLowerCase().includes('nik')) {
        const raw = String(value || '').replace(/\D/g, '').slice(0,16);
        setBmData(prev => ({ ...prev, [field]: raw }));
      } else if (String(field).toLowerCase().includes('date')) {
        const iso = parseDateFromDisplay(value);
        setBmData(prev => ({ ...prev, [field]: iso }));
      } else {
        setBmData(prev => ({ ...prev, [field]: value }));
      }
    }
    if (section === 'branch') setBranchData(prev => ({ ...prev, [field]: value }));
    if (section === 'contract') {
      if (String(field).toLowerCase().includes('nik')) {
        const raw = String(value || '').replace(/\D/g, '').slice(0,16);
        setContractData(prev => ({ ...prev, [field]: raw }));
      } else {
        // simpan nilai numerik mentah di state; izinkan frontend memformat untuk tampilan
        if (numericFields.includes(field)) {
          const raw = (value || '').toString().replace(/\./g, '').replace(/,/g, '').trim();
          setContractData(prev => ({ ...prev, [field]: raw }));
        } else {
          if (String(field).toLowerCase().includes('date')) {
            const iso = parseDateFromDisplay(value);
            setContractData(prev => ({ ...prev, [field]: iso }));
          } else {
            setContractData(prev => ({ ...prev, [field]: value }));
          }
        }
      }
    }
    if (section === 'collateral') {
      if (numericFields.includes(field)) {
        const raw = (value || '').toString().replace(/\./g, '').replace(/,/g, '').trim();
        setCollateralData(prev => ({ ...prev, [field]: raw }));
      } else {
        if (String(field).toLowerCase().includes('date')) {
          const iso = parseDateFromDisplay(value);
          setCollateralData(prev => ({ ...prev, [field]: iso }));
        } else {
          setCollateralData(prev => ({ ...prev, [field]: value }));
        }
      }
    }
    if (section === 'header') {
      if (String(field).toLowerCase().includes('date')) {
        const iso = parseDateFromDisplay(value);
        setHeaderFields(prev => ({ ...prev, [field]: iso }));
      } else {
        setHeaderFields(prev => ({ ...prev, [field]: value }));
      }
    }
  };

  const formatNumberWithDots = (val) => {
    if (val === null || val === undefined || val === '') return '';
    try {
      const s = String(val).replace(/\./g, '').replace(/,/g, '');
      if (s === '') return '';
      const n = Number(s);
      if (Number.isNaN(n)) return val;
      return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    } catch (e) {
      return val;
    }
  };

  const formatDateDisplay = (isoDate) => {
    if (!isoDate) return '';
    try {
      const s = String(isoDate).trim();
      // Jika sudah dalam dd-mm-yyyy, kembalikan apa adanya
      if (/^\d{2}[\-\/]\d{2}[\-\/]\d{4}$/.test(s)) return s.replace(/-/g, '/');
      // Terima yyyy-mm-dd atau datetime ISO
      const d = s.split('T')[0];
      const parts = d.split('-');
      if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
      return s;
    } catch (e) {
      return isoDate;
    }
  };

  const parseDateFromDisplay = (display) => {
    if (!display) return '';
    const s = String(display).trim();
    // dd-mm-yyyy atau dd/mm/yyyy atau dd mm yyyy -> yyyy-mm-dd
    const m1 = s.match(/^(\d{2})[\/\-\s](\d{2})[\/\-\s]?(\d{4})$/);
    if (m1) {
      const [, dd, mm, yyyy] = m1;
      return `${yyyy}-${mm}-${dd}`;
    }
    // sudah yyyy-mm-dd
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    // coba parsing sebagai string Date (ISO atau format lain yang dapat di-parse browser)
    const isoDate = new Date(s);
    if (!isNaN(isoDate.getTime())) {
      const y = isoDate.getFullYear();
      const m = String(isoDate.getMonth() + 1).padStart(2, '0');
      const d = String(isoDate.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
    // tidak dapat di-parse -> kembalikan kosong sehingga kita tidak pernah menempatkan string non-ISO ke input tanggal
    return '';
  };

  // Fungsionalitas cetak PDF dihapus sesuai permintaan pengguna.

  if (contractOnly) {
    const visibleContractFields = getVisibleContractFields(true);

    return (
      <div style={{ padding: 20, minWidth: 560 }}>
        {contractOnlyError && <div style={{ marginBottom: 12, color: '#a33' }}>{contractOnlyError}</div>}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {visibleContractFields.map(f => {
            const isWordField = /(_in_word|_by_word)$/.test(f);
            const baseField = f.replace(/(_in_word|_by_word)$/, '');
            let value = '';
            let disabled = false;
            if (isWordField) {
              disabled = true;
              if (/date|birth/i.test(baseField)) {
                value = getIndonesianDateInWords(contractData[baseField]) || contractData[f] || '';
              } else {
                const num = Number(contractData[baseField] || 0) || 0;
                value = getIndonesianNumberWord(num) || contractData[f] || '';
              }
            } else {
              if (String(f).toLowerCase().includes('date')) {
                value = formatDateDisplay(contractData[f]);
              } else if (numericFields.includes(f)) {
                value = formatNumberWithDots(contractData[f]);
              } else {
                value = contractData[f] ?? '';
              }
            }

            if (f === 'business_partners_relationship') {
              return (
                <div key={f} style={{ display: 'flex', flexDirection: 'column' }}>
                  <label style={styles.label}>{formatFieldName(f)}</label>
                  <select
                    value={contractData[f] ?? ''}
                    onChange={(e) => handleInputChange('contract', f, e.target.value)}
                    style={styles.input}
                  >
                    <option value="">-- Select relationship --</option>
                    <option value="Suami">Suami</option>
                    <option value="Istri">Istri</option>
                    <option value="Anak Kandung">Anak Kandung</option>
                    <option value="Saudara Kandung">Saudara Kandung</option>
                    <option value="Orangtua">Orangtua</option>
                  </select>
                </div>
              );
            }

            return (
              <div key={f} style={{ display: 'flex', flexDirection: 'column' }}>
                <label style={styles.label}>{formatFieldName(f)}</label>
                {(!isWordField && String(f).toLowerCase().includes('date')) ? (
                  <input
                    type="date"
                    style={styles.input}
                    value={disabled ? value : (contractData[f] || '')}
                    disabled={disabled}
                    onChange={(e) => { if (!disabled) handleInputChange('contract', f, e.target.value); }}
                  />
                ) : (
                  (numericFields.includes(f) && !isWordField) ? (
                    <input
                      type="text"
                      style={styles.input}
                      value={disabled ? value : formatNumberWithDots(contractData[f])}
                      disabled={disabled}
                      onChange={(e) => { if (!disabled) handleInputChange('contract', f, e.target.value); }}
                    />
                  ) : (
                    <input
                      type="text"
                      placeholder={String(f).toLowerCase().includes('date') ? 'DD/MM/YYYY' : ''}
                      style={styles.input}
                      value={disabled ? value : value}
                      disabled={disabled}
                      onChange={(e) => { if (!disabled) handleInputChange('contract', f, e.target.value); }}
                    />
                  )
                )}
              </div>
            );
          })}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
          <button className="btn-save" onClick={handleContractOnlySave} disabled={contractOnlySaving}>{contractOnlySaving ? 'Saving...' : 'Save Contract'}</button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>    
      {/* When editing an existing BL Agreement, show any extra DB columns first */}
      {(editOnly || initialContractNumber) && Object.keys(extraFields || {}).length > 0 && (
        <div style={styles.headerFieldsSection}>
          <h3 style={styles.headerFieldsTitle}>Agreement Details</h3>
          <div style={styles.headerFieldsGrid}>
            {Object.keys(extraFields)
              .filter(k => {
                // always exclude technical/id timestamps
                if (/^id$|bl[_-]?agreement[_-]?id$|created[_-]?by$|created[_-]?at$|updated[_-]?at$/i.test(k)) return false;
                // If editing UV agreement, exclude any uv collateral fields so collateral is shown only
                // in the dedicated Collateral section. Use explicit uvCollateralFields when available,
                // otherwise filter common collateral-like column name patterns.
                if (isUV) {
                  try {
                    if (uvCollateralFields && uvCollateralFields.includes(k)) return false;
                  } catch (e) {}
                  if (/collateral|vehicle|vechile|plat|bpkb|chassis|chasiss|engine|number_of_certificate|number_of_ajb/i.test(k)) return false;
                }
                return true;
              })
              .map((k) => (
                <div key={k} style={styles.headerFieldGroup}>
                  <label style={styles.label}>{formatFieldName(k)}</label>
                  <input
                    type="text"
                    style={styles.input}
                    value={formatFieldValue(extraFields[k])}
                    onChange={(e) => setExtraFields(prev => ({ ...prev, [k]: e.target.value }))}
                  />
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Filter Section (hidden in edit mode) */}
      {!initialContractNumber && (
        <div style={styles.filterSection}>
        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', flexDirection: 'row', gap: 20, flexWrap: 'wrap' }}>
            <div style={styles.filterItem}>
              <label style={styles.label}>Contract Number</label>
              <div style={styles.contractSearchContainer}>
                <input
                  type="text"
                  placeholder="Type or select contract number..."
                  value={contractNumber}
                  onChange={(e) => handleContractNumberChange(e.target.value)}
                  onFocus={() => {
                    if (contractNumber) {
                      const q = contractNumber.toString().toLowerCase();
                      setFilteredContracts((contracts || []).filter(c => String(c).toLowerCase().includes(q)));
                      setShowContractDropdown(true);
                    } else {
                      setFilteredContracts(contracts || []);
                      setShowContractDropdown(true);
                    }
                  }}
                  style={styles.input}
                />
                {showContractDropdown && filteredContracts.length > 0 && (
                  <div style={styles.contractDropdown}>
                    {filteredContracts.slice(0, 10).map((contract) => (
                      <div
                        key={contract}
                        onClick={() => handleSelectContract(contract)}
                        style={styles.contractDropdownItem}
                      >
                        {contract}
                      </div>
                    ))}
                    {filteredContracts.length > 10 && (
                      <div style={styles.contractDropdownItem}>... dan {filteredContracts.length - 10} lagi</div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div style={styles.filterItem}>
              <label style={styles.label}>Branch</label>
              {loadingBranches ? (
                <div style={styles.loadingText}>Loading branches list...</div>
              ) : (
                <select
                  value={selectedBranchId ?? ''}
                  onChange={(e) => {
                    const branchId = e.target.value;
                    setSelectedBranchId(branchId);
                    // Immediately populate branch/BM in create mode
                    if (createOnly) handleBranchSelectLoad(branchId);
                  }}
                  style={styles.select}
                >
                  <option value="">-- Select Branches --</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              )}
            </div>

            <div style={styles.filterItem}>
              <label style={styles.label}>Director Name</label>
              {loadingDirectors ? (
                <div style={styles.loadingText}>Loading directors list...</div>
              ) : (
                <select
                  value={selectedDirector}
                  onChange={(e) => setSelectedor(e.target.value)}
                  style={styles.select}
                >
                  <option value="">-- Select Director --</option>
                  {directors.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              )}
            </div>
          </div>
          {/* Buttons removed: view/reset now happen automatically when filter inputs change */}
        </div>
        {error && <div style={styles.errorMessage}>{error}</div>}
        </div>
      )}

      {/* Header Fields Section */}
      {!(editOnly || initialContractNumber) && (
      <div style={styles.headerFieldsSection}>
        <h3 style={styles.headerFieldsTitle}>Agreement Data</h3>
        <div style={styles.headerFieldsGrid}>
          <div style={styles.headerFieldGroup}>
            <label style={styles.label}>Agreement Date</label>
            <div>
              <input
                type="text"
                placeholder="DD/MM/YYYY"
                style={styles.input}
                value={formatDateDisplay(headerFields.agreement_date)}
                onChange={(e) => handleInputChange('header', 'agreement_date', e.target.value)}
                onFocus={() => {
                  const id = `hidden_header_agreement_date`;
                  const hid = document.getElementById(id);
                  if (hid) { try { hid.showPicker && hid.showPicker(); hid.click(); } catch (err) { hid.click(); } }
                }}
              />
              <input
                type="date"
                id={`hidden_header_agreement_date`}
                style={{ display: 'none' }}
                value={isIsoDate(headerFields.agreement_date) ? headerFields.agreement_date : ''}
                onChange={(e) => handleInputChange('header', 'agreement_date', e.target.value)}
              />
            </div>
          </div>
          
          <div style={styles.headerFieldGroup}>
            <label style={styles.label}>Place of Agreement</label>
            <input
              type="text"
              value={headerFields.place_of_agreement}
              onChange={(e) => handleInputChange('header', 'place_of_agreement', e.target.value)}
              style={styles.input}
              disabled
              title="Auto-filled from selected branch city"
            />
          </div>

          <div style={styles.headerFieldGroup}>
            <label style={styles.label}>Day of Agreement</label>
            <input
              type="text"
              value={headerFields.agreement_day_in_word}
              style={styles.input}
              disabled
              title="Auto-calculated from agreement date"
            />
          </div>

          <div style={styles.headerFieldGroup}>
            <label style={styles.label}>Agreement Date (In Words)</label>
            <input
              type="text"
              value={headerFields.agreement_date_in_word}
              style={styles.input}
              disabled
              title="Auto-converted from agreement date"
            />
          </div>

          <div style={styles.headerFieldGroup}>
            <label style={styles.label}>Director Name</label>
            <input
              type="text"
              value={headerFields.Name_of_director}
              style={styles.input}
              disabled
              title="Auto-filled from selected director"
            />
          </div>

          <div style={styles.headerFieldGroup}>
            <label style={styles.label}>Delegation Date</label>
            <input
              type="text"
              value={formatDateDisplay(headerFields.date_of_delegated)}
              style={styles.input}
              disabled
              title="Auto-filled equal to agreement date"
            />
          </div>

          <div style={styles.headerFieldGroup}>
            <label style={styles.label}>SP3 Number</label>
            <input
              type="text"
              value={headerFields.sp3_number}
              style={styles.input}
              disabled
              title="Auto-generated from contract number and SP3 date"
            />
          </div>

          <div style={styles.headerFieldGroup}>
            <label style={styles.label}>SP3 Date</label>
            <input
              type="text"
              value={formatDateDisplay(headerFields.sp3_date)}
              style={styles.input}
              disabled
              title="Auto-filled from agreement date"
            />
          </div>
          <div style={styles.headerFieldGroup}>
            <label style={styles.label}>{formatFieldName('phone_number_of_lolc')}</label>
            <input
              type="text"
              value={headerFields.phone_number_of_lolc}
              onChange={(e) => handleInputChange('header', 'phone_number_of_lolc', e.target.value)}
              style={styles.input}
              title="Phone number of LOLC (moved from Contract Data)"
            />
          </div>
          </div>
        </div>
        )}

        {/* Form Columns (BM / Contract / Collateral) */}
      <div style={styles.headerFieldsSection}>
        <h3 style={styles.headerFieldsTitle}>Branch Manager Data</h3>
        <div style={styles.headerFieldsGrid}>
            {bmFields.map((f) => (
              <div key={f} style={styles.headerFieldGroup}>
                <label style={styles.label}>{formatFieldName(f)}</label>
                {String(f).toLowerCase().includes('date') ? (
                  <div>
                    <input
                      type="text"
                      placeholder="DD/MM/YYYY"
                      style={styles.input}
                      value={formatDateDisplay(bmData[f])}
                      onChange={(e) => handleInputChange('bm', f, e.target.value)}
                      onFocus={() => {
                        const id = `hidden_bm_${f}`;
                        const hid = document.getElementById(id);
                        if (hid) { try { hid.showPicker && hid.showPicker(); hid.click(); } catch (err) { hid.click(); } }
                      }}
                    />
                    <input
                      type="date"
                      id={`hidden_bm_${f}`}
                      style={{ display: 'none' }}
                      value={isIsoDate(bmData[f]) ? bmData[f] : ''}
                      onChange={(e) => handleInputChange('bm', f, e.target.value)}
                    />
                  </div>
                ) : (
                  <input
                    type="text"
                    placeholder={String(f).toLowerCase().includes('date') ? 'DD/MM/YYYY' : ''}
                    style={styles.input}
                    value={bmData[f] ?? ''}
                    onChange={(e) => handleInputChange('bm', f, e.target.value)}
                  />
                )}
              </div>
            ))}
        </div>
      </div>



      <div style={styles.headerFieldsSection}>
        <h3 style={styles.headerFieldsTitle}>Branches Data</h3>
        <div style={styles.headerFieldsGrid}>
          {branchFields.map((f) => (
            <div key={f} style={styles.headerFieldGroup}>
              <label style={styles.label}>{formatFieldName(f)}</label>
              <input
                style={styles.input}
                value={branchData[f] ?? ''}
                onChange={(e) => handleInputChange('branch', f, e.target.value)}
              />
            </div>
          ))}
        </div>
      </div>
      {/* Form Columns (BM / Contract / Collateral) */}

      <div style={styles.headerFieldsSection}>
        <h3 style={styles.headerFieldsTitle}>Contract Data</h3>
        <div style={styles.headerFieldsGrid}>
          {getVisibleContractFields().map((f) => {
            const isWordField = /(_in_word|_by_word)$/.test(f);
            const baseField = f.replace(/(_in_word|_by_word)$/, '');
            let value = '';
            let disabled = false;

            if (isWordField) {
              disabled = true;
              // Date -> words
              if (/date|date_of|birth/i.test(baseField)) {
                value = getIndonesianDateInWords(contractData[baseField]) || contractData[f] || '';
              } else {
                // numeric -> words
                const num = Number(contractData[baseField] || 0) || 0;
                value = getIndonesianNumberWord(num) || contractData[f] || '';
              }
            } else {
              if (String(f).toLowerCase().includes('date')) {
                value = formatDateDisplay(contractData[f]);
              } else if (numericFields.includes(f)) {
                value = formatNumberWithDots(contractData[f]);
              } else {
                value = contractData[f] ?? '';
              }
            }

            // Render a dropdown for business_partners_relationship
            if (f === 'business_partners_relationship') {
              return (
                <div key={f} style={styles.headerFieldGroup}>
                  <label style={styles.label}>{formatFieldName(f)}</label>
                  <select
                    value={contractData[f] ?? ''}
                    onChange={(e) => handleInputChange('contract', f, e.target.value)}
                    style={styles.input}
                  >
                    <option value="">-- Select relationship --</option>
                    <option value="Suami">Suami</option>
                    <option value="Istri">Istri</option>
                    <option value="Anak Kandung">Anak Kandung</option>
                    <option value="Saudara Kandung">Saudara Kandung</option>
                    <option value="Orangtua">Orangtua</option>
                  </select>
                </div>
              );
            }

            return (
              <div key={f} style={styles.headerFieldGroup}>
                <label style={styles.label}>{formatFieldName(f)}</label>
                        {String(f).toLowerCase().includes('date') ? (
                          <div>
                            <input
                              type="text"
                              placeholder="DD/MM/YYYY"
                              style={styles.input}
                              value={disabled ? formatDateDisplay(contractData[f]) : formatDateDisplay(contractData[f])}
                              disabled={disabled}
                              onChange={(e) => { if (!disabled) handleInputChange('contract', f, e.target.value); }}
                              onFocus={() => {
                                const id = `hidden_contract_${f}`;
                                const hid = document.getElementById(id);
                                if (hid) { try { hid.showPicker && hid.showPicker(); hid.click(); } catch (err) { hid.click(); } }
                              }}
                            />
                            <input
                              type="date"
                              id={`hidden_contract_${f}`}
                              style={{ display: 'none' }}
                              value={isIsoDate(contractData[f]) ? contractData[f] : ''}
                              onChange={(e) => { if (!disabled) handleInputChange('contract', f, e.target.value); }}
                            />
                          </div>
                        ) : (
                          <input
                            type="text"
                            style={styles.input}
                            value={disabled ? value : value}
                            disabled={disabled}
                            onChange={(e) => { if (!disabled) handleInputChange('contract', f, e.target.value); }}
                          />
                        )}
              </div>
            );
          })}
        </div>
      </div>

      <div style={styles.headerFieldsSection}>
        <h3 style={styles.headerFieldsTitle}>Collateral Data</h3>
        <div style={styles.headerFieldsGrid}>
          {(isUV ? (uvCollateralFields || []) : collateralFields).map((f) => (
            <div key={f} style={styles.headerFieldGroup}>
              <label style={styles.label}>{formatFieldName(f)}</label>
                {String(f).toLowerCase().includes('date') ? (
                  <div>
                    <input
                      type="text"
                      placeholder="DD/MM/YYYY"
                      style={styles.input}
                      value={formatDateDisplay(collateralData[f])}
                      onChange={(e) => handleInputChange('collateral', f, e.target.value)}
                      onFocus={() => {
                        const id = `hidden_collateral_${f}`;
                        const hid = document.getElementById(id);
                        if (hid) { try { hid.showPicker && hid.showPicker(); hid.click(); } catch (err) { hid.click(); } }
                      }}
                    />
                    <input
                      type="date"
                      id={`hidden_collateral_${f}`}
                      style={{ display: 'none' }}
                      value={isIsoDate(collateralData[f]) ? collateralData[f] : ''}
                      onChange={(e) => handleInputChange('collateral', f, e.target.value)}
                    />
                  </div>
                ) : (
                  <input
                    type="text"
                    placeholder={String(f).toLowerCase().includes('date') ? 'DD/MM/YYYY' : ''}
                    style={styles.input}
                    value={collateralData[f] ?? ''}
                    onChange={(e) => handleInputChange('collateral', f, e.target.value)}
                  />
                )}
            </div>
          ))}
        </div>
      </div>

      {/* Tombol Save dan Download di kanan bawah */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 32, gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ fontSize: 14, color: '#333', fontWeight: 600 }}>User:</div>
          <div style={{ padding: '8px 12px', backgroundColor: '#fff', border: '1px solid #ddd', borderRadius: 6 }}>{usernameDisplay || '-'}</div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
          <button
            style={{ ...styles.btnPrimary, minWidth: 120 }}
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Saving...' : (createOnly ? 'Download' : ((editOnly || initialContractNumber) ? 'Update' : 'Save'))}
          </button>
          {!createOnly && !(editOnly || initialContractNumber) && (
          <button
            style={{ ...styles.btnSecondary, minWidth: 140 }}
            onClick={async () => {
              const token = localStorage.getItem('access_token');
              // Request PDF via as_pdf=1; backend will return PDF when available. Choose BL/UV endpoint.
              const base = isUV ? 'uv-agreement' : 'bl-agreement';
              const url = `http://localhost:8000/api/${base}/download-docx/?contract_number=${encodeURIComponent(contractNumber)}`;
              try {
                const res = await axios.get(url, { headers: { Authorization: `Bearer ${token}` }, responseType: 'blob' });
                const contentType = (res.headers && res.headers['content-type']) || '';
                const isPdf = contentType.includes('pdf');
                const blob = new Blob([res.data], { type: contentType || (isPdf ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') });
                const link = document.createElement('a');
                link.href = window.URL.createObjectURL(blob);
                link.download = `${isUV ? 'uv_agreement' : 'bl_agreement'}_${contractNumber}${isPdf ? '.pdf' : '.docx'}`;
                document.body.appendChild(link);
                link.click();
                link.remove();
              } catch (err) {
                console.error('Download failed', err);
                alert('Failed to download the document. Please ensure the template is installed on the server.');
              }
            }}
          >
            Download PDF
          </button>
          )}
          {/* PDF print button removed per user request */}
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    padding: '20px',
    backgroundColor: '#f5f5f5',
    minHeight: '100vh'
  },
  header: {
    marginBottom: '30px',
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '8px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
  },
  title: {
    position: 'fixed',
    right: 20,
    top: 20,
    backgroundColor: '#0a84ff',
    color: 'white',
    padding: '10px 14px',
    borderRadius: '8px',
    boxShadow: '0 6px 18px rgba(10,24,61,0.18)',
    fontWeight: 600,
    zIndex: 2000,
    minWidth: 180
  },
  filterSection: {
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '8px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
    marginBottom: '20px'
  },
  filterGroup: {
    display: 'flex',
    flexDirection: 'row',
    gap: '20px',
    marginBottom: '15px',
    alignItems: 'flex-end',
    flexWrap: 'wrap'
  },
  filterItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    minWidth: '250px'
  },
  label: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#333',
    letterSpacing: '0.5px'
  },
  input: {
    padding: '10px 12px',
    fontSize: '14px',
    border: '1px solid #ddd',
    borderRadius: '6px',
    outline: 'none',
    backgroundColor: '#f9f9f9',
    fontFamily: 'inherit',
    transition: 'all 0.3s ease'
  },
  select: {
    padding: '10px 12px',
    fontSize: '14px',
    border: '1px solid #ddd',
    borderRadius: '6px',
    outline: 'none',
    backgroundColor: '#f9f9f9',
    fontFamily: 'inherit',
    transition: 'all 0.3s ease',
    cursor: 'pointer'
  },
  loadingText: {
    padding: '10px 12px',
    fontSize: '14px',
    color: '#999',
    fontStyle: 'italic'
  },
  contractSearchContainer: {
    position: 'relative'
  },
  contractDropdown: {
    position: 'absolute',
    top: '100%',
    left: '0',
    right: '0',
    backgroundColor: 'white',
    border: '1px solid #ddd',
    borderTop: 'none',
    borderRadius: '0 0 6px 6px',
    maxHeight: '200px',
    overflowY: 'auto',
    zIndex: 1000,
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
  },
  contractDropdownItem: {
    padding: '10px 12px',
    cursor: 'pointer',
    borderBottom: '1px solid #f0f0f0',
    fontSize: '14px',
    color: '#333',
    transition: 'background-color 0.2s'
  },
  headerFieldsSection: {
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '8px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
    marginBottom: '20px'
  },
  headerFieldsTitle: {
    margin: '0 0 15px 0',
    fontSize: '16px',
    color: '#0a1e3d',
    fontWeight: '700'
  },
  headerFieldsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '15px'
  },
  headerFieldGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
  },
  formSection: {
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '8px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
    marginBottom: '20px'
  },
  formSectionTitle: {
    margin: '0 0 15px 0',
    fontSize: '16px',
    color: '#0a1e3d',
    fontWeight: '700'
  },
  formColumns: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 1fr',
    gap: '16px'
  },
  formColumn: {
    backgroundColor: '#fff',
    padding: '12px',
    borderRadius: '6px',
    border: '1px solid #f0f0f0'
  },
  formTitle: {
    margin: '0 0 10px 0',
    fontSize: '15px',
    color: '#0a1e3d',
    fontWeight: '700'
  },
  fieldGroupInline: {
    marginBottom: '10px'
  },
  fieldLabelInline: {
    display: 'block',
    fontSize: '12px',
    color: '#666',
    marginBottom: '6px'
  },
  buttonGroup: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap'
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
  btnSecondary: {
    padding: '10px 20px',
    fontSize: '14px',
    fontWeight: '600',
    backgroundColor: 'white',
    color: '#0a1e3d',
    border: '2px solid #0a1e3d',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'all 0.3s ease'
  },
  errorMessage: {
    marginTop: '15px',
    padding: '12px 16px',
    backgroundColor: '#f8d7da',
    color: '#721c24',
    border: '1px solid #f5c6cb',
    borderRadius: '6px',
    fontSize: '13px'
  },
  dataSection: {
    marginTop: '20px'
  },
  dataColumns: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '20px'
  },
  column: {
    backgroundColor: 'white',
    borderRadius: '8px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
    overflow: 'hidden'
  },
  columnHeader: {
    padding: '16px 20px',
    background: 'linear-gradient(135deg, #f5f5f5 0%, #efefef 100%)',
    borderBottom: '2px solid #ddd'
  },
  columnTitle: {
    margin: '0',
    fontSize: '16px',
    fontWeight: '700',
    color: '#0a1e3d'
  },
  fieldContainer: {
    padding: '20px'
  },
  fieldGroup: {
    marginBottom: '16px',
    paddingBottom: '16px',
    borderBottom: '1px solid #f0f0f0'
  },
  fieldLabel: {
    display: 'block',
    fontSize: '12px',
    fontWeight: '600',
    color: '#666',
    marginBottom: '6px',
    letterSpacing: '0.3px',
    textTransform: 'uppercase'
  },
  fieldValue: {
    fontSize: '14px',
    color: '#333',
    fontWeight: '500',
    wordBreak: 'break-word'
  },
  noData: {
    padding: '40px 20px',
    textAlign: 'center',
    color: '#999',
    fontSize: '14px'
  }
};
export default BLAgreement;
