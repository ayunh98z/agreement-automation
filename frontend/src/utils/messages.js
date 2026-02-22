const MESSAGES = {
  save_added: { id: 'Data berhasil ditambahkan!', en: 'Data added successfully!' },
  save_updated: { id: 'Data berhasil diperbarui!', en: 'Data updated successfully!' },
  save_success: { id: 'Data tersimpan!', en: 'Data saved successfully!' },
  session_expired: { id: 'Sesi habis. Silakan masuk kembali.', en: 'Session expired. Please login again.' },
  download_failed_prefix: { id: 'Gagal mengunduh: ', en: 'Failed to download: ' },
  download_unparseable: { id: 'Gagal mengunduh: respons server tidak dapat diproses', en: 'Download failed: unable to parse server response' },
  sp3_download_failed_prefix: { id: 'Gagal mengunduh SP3: ', en: 'SP3 download failed: ' },
  unexpected_server_response: { id: 'Respons server tidak terduga', en: 'Unexpected server response' },
  pdf_conversion_failed: { id: 'Konversi PDF gagal', en: 'PDF conversion failed' },
  failed_download_documents: { id: 'Gagal mengunduh dokumen', en: 'Failed to download the documents' },
  failed_download_pdfs: { id: 'Gagal mengunduh PDF', en: 'Failed to download PDFs' },
  contract_number_empty: { id: 'Nomor kontrak kosong', en: 'Contract number not available' },
  collateral_saved: { id: 'Data jaminan tersimpan', en: 'Collateral data saved successfully' },
  contract_saved: { id: 'Data kontrak tersimpan', en: 'Contract data saved successfully' }
};

export function getLang() {
  try {
    const stored = localStorage.getItem('lang');
    if (stored) return stored.startsWith('en') ? 'en' : 'id';
    const nav = navigator && navigator.language ? navigator.language : 'id';
    return nav.startsWith('en') ? 'en' : 'id';
  } catch (e) { return 'id'; }
}

export function t(key, lang) {
  const l = lang || getLang();
  const entry = MESSAGES[key];
  if (!entry) return key;
  return entry[l] || entry.en || '';
}

const Messages = { t, getLang };

export default Messages;
