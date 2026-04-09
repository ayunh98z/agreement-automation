const MESSAGES = {
  save_added: { id: 'Data berhasil ditambahkan!', en: 'Data added successfully!' },
  save_updated: { id: 'Data berhasil diperbarui!', en: 'Data updated successfully!' },
  save_success: { id: 'Data tersimpan!', en: 'Data saved successfully!' },
  session_expired: { id: 'Sesi habis. Silakan masuk kembali.', en: 'Session expired. Please login again.' },
  download_failed_prefix: { id: 'Gagal mengunduh: ', en: 'Failed to download: ' },
  download_unparseable: { id: 'Gagal mengunduh: respons server tidak dapat diproses', en: 'Download failed: unable to parse server response' },
  sp3_download_failed_prefix: { id: 'Gagal mengunduh SP3K: ', en: 'SP3K download failed: ' },
  unexpected_server_response: { id: 'Respons server tidak terduga', en: 'Unexpected server response' },
  pdf_conversion_failed: { id: 'Konversi PDF gagal', en: 'PDF conversion failed' },
  failed_download_documents: { id: 'Gagal mengunduh dokumen', en: 'Failed to download the documents' },
  failed_download_pdfs: { id: 'Gagal mengunduh PDF', en: 'Failed to download PDFs' },
  contract_number_empty: { id: 'Nomor kontrak kosong', en: 'Contract number not available' },
  collateral_saved: { id: 'Data jaminan tersimpan', en: 'Collateral data saved successfully' },
  collateral_required: { id: 'Gagal menyimpan. Silakan isi data jaminan sebelum menyimpan', en: 'Failed to save. Please fill in collateral data before saving' },
  contract_saved: { id: 'Data kontrak tersimpan', en: 'Contract data saved successfully' },
  duplicate_contract_exists: { id: 'Nomor kontrak sudah terdaftar', en: 'The contract number you entered is already registered in the system.' },
  failed_saving_contract_prefix: { id: 'Gagal menyimpan kontrak: ', en: 'Failed saving contract: ' },
  failed_save_data_prefix: { id: 'Gagal menyimpan data: ', en: 'Failed to save data: ' },
  failed_save_and_download: { id: 'Gagal menyimpan dan mengunduh', en: 'Failed to save and download' }
};

// Friendly message when DB duplicate-key errors occur during save
MESSAGES.failed_save_manual_add = { id: 'Gagal menyimpan. Silakan tambahkan semua data secara manual.', en: 'Failed to save. Please add all data manually.' };

// Additional common messages
MESSAGES.login_success = { id: 'Login berhasil!', en: 'Login successful!' };
MESSAGES.login_failed = { id: 'Login gagal. Silakan coba lagi.', en: 'Login failed. Please try again.' };
MESSAGES.user_not_registered = { id: 'User tidak terdaftar', en: 'User not registered' };
MESSAGES.connection_timeout = { id: 'Koneksi timeout. Pastikan backend sedang berjalan.', en: 'Connection timeout. Ensure backend is running.' };
MESSAGES.cannot_connect = { id: 'Tidak bisa terhubung ke backend. Pastikan backend sudah dijalankan.', en: 'Unable to connect to backend. Ensure the backend is running.' };
MESSAGES.invalid_credentials = { id: 'Username atau password salah', en: 'Invalid username or password' };
MESSAGES.account_inactive = { id: 'Akun tidak aktif. Hubungi administrator.', en: 'Account inactive. Contact administrator.' };
MESSAGES.credentials_required = { id: 'Username dan password harus diisi', en: 'Username and password are required' };
MESSAGES.network_error = { id: 'Network error. Pastikan backend berjalan.', en: 'Network error. Ensure the backend is running.' };
MESSAGES.failed_load = { id: 'Gagal memuat data', en: 'Failed to load data' };
MESSAGES.failed_load_contracts = { id: 'Gagal memuat daftar kontrak', en: 'Failed to load contracts list' };
MESSAGES.failed_load_branches = { id: 'Gagal memuat daftar cabang', en: 'Failed to load branches list' };
MESSAGES.failed_load_directors = { id: 'Gagal memuat daftar direktur', en: 'Failed to load directors list' };
MESSAGES.data_not_found_contract = { id: 'Data tidak ditemukan untuk nomor kontrak ini', en: 'No data found for this contract number' };
MESSAGES.failed_fetch_data = { id: 'Gagal mengambil data', en: 'Failed to fetch data' };
MESSAGES.failed_load_uv_agreement = { id: 'Gagal memuat data UV Agreement', en: 'Failed to load UV Agreement data' };
MESSAGES.failed_load_logs = { id: 'Gagal memuat logs. Pastikan Anda login dan backend berjalan.', en: 'Failed to load logs. Ensure you are logged in and backend is running.' };
MESSAGES.search_logs_placeholder = { id: 'Cari nama berkas, identifier, IP, pengguna...', en: 'Search filename, identifier, IP, user...' };
MESSAGES.save_failed = { id: 'Gagal menyimpan', en: 'Save failed' };
MESSAGES.yes = { id: 'Ya', en: 'Yes' };
MESSAGES.no = { id: 'Tidak', en: 'No' };
MESSAGES.failed_load_user_list = { id: 'Gagal memuat daftar pengguna', en: 'Failed to load user list' };
MESSAGES.user_mgmt_title = { id: 'Manajemen Pengguna', en: 'User Management' };
MESSAGES.loading_user_list = { id: 'Memuat data user...', en: 'Loading user data...' };
MESSAGES.loading_check_console = { id: 'Jika loading terlalu lama, periksa console (F12) untuk error details', en: 'If loading takes too long, check the console (F12) for error details' };
MESSAGES.no_access = { id: 'Anda tidak memiliki akses ke fitur ini.', en: 'You do not have access to this feature.' };
MESSAGES.endpoint_not_found = { id: 'API endpoint tidak ditemukan. Pastikan backend berjalan dengan baik.', en: 'API endpoint not found. Ensure backend is running.' };
MESSAGES.no_users = { id: 'Tidak ada data user', en: 'No users available' };
MESSAGES.confirm_delete_user = { id: 'Yakin akan menghapus?', en: 'Are you sure you want to delete?' };
MESSAGES.user_deleted = { id: 'Pengguna dihapus', en: 'User deleted' };
MESSAGES.user_created = { id: 'Pengguna berhasil dibuat', en: 'User created successfully' };
MESSAGES.user_updated = { id: 'Pengguna berhasil diperbarui', en: 'User updated successfully' };
MESSAGES.cancel = { id: 'Batal', en: 'Cancel' };
MESSAGES.new_user = { id: 'Tambah Pengguna', en: '+ New User' };
MESSAGES.add_user = { id: 'Tambah Pengguna', en: 'Add New User' };
MESSAGES.edit_user = { id: 'Edit Pengguna', en: 'Edit User' };
MESSAGES.full_name = { id: 'Nama Lengkap', en: 'Full Name' };
MESSAGES.email = { id: 'Email', en: 'Email' };
MESSAGES.username = { id: 'Nama Pengguna', en: 'Username' };
MESSAGES.password = { id: 'Kata Sandi', en: 'Password' };
MESSAGES.password_leave_blank = { id: 'Kosongkan jika tidak ingin mengubah', en: 'Leave empty if you do not want to change' };
MESSAGES.employee_id_label = { id: 'Nomor Karyawan', en: 'Employee ID' };
MESSAGES.role_label = { id: 'Peran', en: 'Role' };
MESSAGES.region_label = { id: 'Regional', en: 'Regions' };
MESSAGES.area_label = { id: 'Area', en: 'Areas' };
MESSAGES.branch_label = { id: 'Cabang', en: 'Branches' };
MESSAGES.active_label = { id: 'Aktif', en: 'Active' };
MESSAGES.inactive_label = { id: 'Tidak Aktif', en: 'Inactive' };
MESSAGES.select_region_placeholder = { id: '-- Pilih Regional --', en: '-- Select Region --' };
MESSAGES.select_area_placeholder = { id: '-- Pilih Area --', en: '-- Select Area --' };
MESSAGES.select_branch_placeholder = { id: '-- Pilih Cabang --', en: '-- Select Branch --' };
MESSAGES.choose_region_first = { id: 'Pilih Regional terlebih dahulu', en: 'Select Region first' };
MESSAGES.choose_area_first = { id: 'Pilih Area terlebih dahulu', en: 'Select Area first' };
MESSAGES.region_area_branch_required = { id: 'Regional, area dan cabang wajib diisi', en: 'Region, area and branch are required' };
MESSAGES.password_required_new_user = { id: 'Kata sandi diperlukan untuk pengguna baru', en: 'Password is required for new user' };
MESSAGES.failed_save_user = { id: 'Gagal menyimpan data user', en: 'Failed to save user data' };
MESSAGES.search_users_placeholder = { id: 'Cari nama, email, username...', en: 'Search name, email, username...' };
MESSAGES.all_roles = { id: 'Semua Role', en: 'All Roles' };
MESSAGES.all_status = { id: 'Semua Status', en: 'All Status' };
MESSAGES.loading = { id: 'Memuat...', en: 'Loading...' };
MESSAGES.create = { id: 'Buat', en: 'Create' };
MESSAGES.update = { id: 'Perbarui', en: 'Update' };
MESSAGES.add_branch = { id: 'Tambah Cabang', en: 'Add Branch' };
MESSAGES.edit_branch = { id: 'Edit Cabang', en: 'Edit Branch' };
MESSAGES.area_id = { id: 'Nama Area', en: 'Area Name' };
MESSAGES.bm_id = { id: 'ID BM', en: 'BM ID' };
// Region ID variants
MESSAGES.region_id = { id: 'Nama Regional', en: 'Region Name' };
MESSAGES['Region Id'] = { id: 'Nama Regional', en: 'Region Name' };
MESSAGES.RegionID = { id: 'Nama Regional', en: 'Region Name' };
MESSAGES.regionId = { id: 'Nama Regional', en: 'region Name' };
MESSAGES['Region ID'] = { id: 'Nama Regional', en: 'Region Name' };
MESSAGES.name = { id: 'Nama', en: 'Name' };
MESSAGES.code = { id: 'Kode', en: 'Code' };
MESSAGES.street_name = { id: 'Nama Jalan', en: 'Street Name' };
MESSAGES.subdistrict = { id: 'Kelurahan', en: 'Subdistrict' };
MESSAGES.district = { id: 'Kecamatan', en: 'District' };
MESSAGES.city = { id: 'Kota', en: 'City' };
MESSAGES.province = { id: 'Provinsi', en: 'Province' };
MESSAGES.showing = { id: 'Menampilkan', en: 'Showing' };
MESSAGES.prev = { id: 'Sebelumnya', en: 'Prev' };
MESSAGES.next = { id: 'Berikutnya', en: 'Next' };
MESSAGES.delete_prefix = { id: 'Hapus', en: 'Delete this' };
MESSAGES.delete = { id: 'Hapus', en: 'Delete' };
MESSAGES.edit = { id: 'Edit', en: 'Edit' };
MESSAGES.actions = { id: 'Aksi', en: 'Actions' };
MESSAGES.id_label = { id: 'ID', en: 'ID' };
MESSAGES.regional_name = { id: 'Nama Regional', en: 'Regional Name' };
MESSAGES.regional_code = { id: 'Kode Regional', en: 'Regional Code' };
MESSAGES.contract_number = { id: 'Nomor Kontrak', en: 'Contract Number' };
// Exact-variant used in some BL modals
MESSAGES['Contract Number'] = { id: 'Nomor Kontrak', en: 'Contract Number' };
// Mortgage amount in words
MESSAGES.mortgage_amount_in_word = { id: 'Jumlah Hipotek (dalam kata)', en: 'Mortgage Amount In Word' };
MESSAGES['Mortgage Amount In Word'] = { id: 'Jumlah Hipotek (dalam kata)', en: 'Mortgage Amount In Word' };

// Branch / Director labels and placeholders (BL create document)
MESSAGES.branch = { id: 'Cabang', en: 'Branch' };
MESSAGES['Branch'] = { id: 'Cabang', en: 'Branch' };
MESSAGES.director = { id: 'Direktur', en: 'Director' };
MESSAGES['Director'] = { id: 'Direktur', en: 'Director' };
MESSAGES['-- Select Branch --'] = { id: '-- Pilih Cabang --', en: '-- Select Branch --' };
MESSAGES['-- Select Director --'] = { id: '-- Pilih Direktur --', en: '-- Select Director --' };
MESSAGES.search_masterdata_placeholder = { id: 'Cari...', en: 'Search...' };
MESSAGES.name_of_debtor = { id: 'Nama Lengkap', en: 'Full Name' };
MESSAGES.nik_number_of_debtor = { id: 'NIK', en: 'NIK' };
MESSAGES.loan_amount = { id: 'Jumlah Pinjaman', en: 'Loan Amount' };
// Additional contract / debtor related fields
MESSAGES.street_of_debtor = { id: 'Nama Jalan', en: 'Street Name' };
MESSAGES.subdistrict_of_debtor = { id: 'Kelurahan', en: 'Subdistrict' };
MESSAGES.district_of_debtor = { id: 'Kecamatan', en: 'District' };
MESSAGES.city_of_debtor = { id: 'Kota', en: 'City' };
MESSAGES.province_of_debtor = { id: 'Provinsi', en: 'Province' };
MESSAGES.phone_number_of_debtor = { id: 'Telepon', en: 'Phone Number' };
MESSAGES.business_partners_relationship = { id: 'Hubungan dengan Mitra Bisnis', en: 'Business Partners Relationship' };
MESSAGES.business_type = { id: 'Jenis Usaha', en: 'Business Type' };
MESSAGES.bank_account_number = { id: 'Nomor Rekening', en: 'Bank Account Number' };
MESSAGES.name_of_bank = { id: 'Nama Bank', en: 'Name Of Bank' };
MESSAGES.name_of_account_holder = { id: 'Nama Pemilik Rekening', en: 'Name Of Account Holder' };
MESSAGES.virtual_account_number = { id: 'Nomor Akun Virtual', en: 'Virtual Account Number' };
MESSAGES.topup_contract = { id: 'Kontrak Sebelumnya', en: 'Previous Contract' };
MESSAGES.previous_topup_amount = { id: 'Baki Debet Kontrak Sebelumnya', en: 'Outstanding Previous Contract' };
MESSAGES.term = { id: 'Jangka Waktu', en: 'Term' };
MESSAGES.flat_rate = { id: 'TR Bunga Efektif', en: 'TR (Effective Rate)' };
MESSAGES.notaris_fee = { id: 'Biaya Penanganan/Proses', en: 'Handling/Processing Fee' };
MESSAGES.handling_processing_fee = { id: 'Biaya Penanganan/Proses', en: 'Handling/Processing Fee' };
MESSAGES.handling_fee_mismatch = { id: 'Nilai Biaya Penanganan/Proses tidak sesuai', en: 'Handling/Processing Fee value mismatch' };
MESSAGES.net_amount = { id: 'Jumlah Pinjaman Neto', en: 'Net Amount' };
MESSAGES.admin_fee = { id: 'Biaya Admin', en: 'Admin Fee' };
MESSAGES.mortgage_amount = { id: 'Jumlah Hipotek', en: 'Mortgage Amount' };
MESSAGES.stamp_amount = { id: 'Biaya Materai', en: 'Stamp Amount' };
MESSAGES.financing_agreement_amount = { id: 'Akta Perjanjian Pembiayaan', en: 'Financing Agreement Amount' };
MESSAGES.security_agreement_amount = { id: 'Akta Pengikatan Jaminan', en: 'Security Agreement Amount' };
MESSAGES.upgrading_land_rights_amount = { id: 'Biaya Peningkatan Hak', en: 'Upgrading Land Rights Amount' };
MESSAGES.admin_rate = { id: 'Perpanjangan STNK/KIR', en: 'STNK/KIR Renewal' };
// Additional small contract fields requested
MESSAGES.tlo = { id: 'Asuransi TLO', en: 'Insurance TLO' };
MESSAGES.life_insurance = { id: 'Asuransi Kecelakaan', en: 'Insurance Accident Free' };
MESSAGES.place_birth_of_debtor = { id: 'Tempat Lahir', en: 'Place Of Birth' };
MESSAGES.date_birth_of_debtor = { id: 'Tanggal Lahir', en: 'Date Of Birth' };
// "in word" / "In Word" variants used for numeric/date fields converted to words
MESSAGES.date_birth_of_debtor_in_word = { id: 'Tanggal Lahir (dalam kata)', en: 'Date Of Birth In Word' };
MESSAGES.loan_amount_in_word = { id: 'Jumlah Pinjaman (dalam kata)', en: 'Loan Amount In Word' };
MESSAGES.net_amount_in_word = { id: 'Jumlah Pinjaman Neto (dalam kata)', en: 'Net Amount In Word' };
MESSAGES.term_by_word = { id: 'Jangka Waktu (dalam kata)', en: 'Term In Word' };
MESSAGES.flat_rate_by_word = { id: 'TR Bunga Efektif (dalam kata)', en: 'TR (Effective Rate) In Word' };
MESSAGES.admin_rate_in_word = { id: 'Perpanjangan STNK/KIR (dalam kata)', en: 'STNK/KIR Renewal In Word' };
MESSAGES.admin_fee_in_word = { id: 'Biaya Admin (dalam kata)', en: 'Admin Fee In Word' };
MESSAGES.notaris_fee_in_word = { id: 'Biaya Penanganan/Proses (dalam kata)', en: 'Handling/Processing Fee In Word' };
MESSAGES.tlo_in_word = { id: 'Asuransi TLO (dalam kata)', en: 'Insurance TLO In Word' };
MESSAGES.life_insurance_in_word = { id: 'Asuransi Kecelakaan (dalam kata)', en: 'Insurance Accident Free In Word' };
// Collateral / vehicle specific labels used in modal forms
MESSAGES.collateral_type = { id: 'Jenis Jaminan', en: 'Collateral Type/Certificate Type' };
MESSAGES.number_of_certificate = { id: 'Nomor Sertifikat', en: 'Number of Certificate' };
MESSAGES.number_of_ajb = { id: 'Nomor AJB', en: 'Number of AJB' };
MESSAGES.surface_area = { id: 'Luas Tanah', en: 'Surface Area' };
MESSAGES.name_of_collateral_owner = { id: 'Nama Pemilik Jaminan', en: 'Collateral Owner Name' };
MESSAGES.capacity_of_building = { id: 'Luas Bangunan', en: 'Capacity of Building' };
MESSAGES.location_of_land = { id: 'Lokasi Tanah', en: 'Location of Land' };
MESSAGES.wheeled_vehicle = { id: 'Tipe Kendaraan', en: 'Vehicle Type (2W/3W/4W)' };
// Vehicle / collateral field translations
MESSAGES.vehicle_type = { id: 'Kategori Kendaraan', en: 'Vehicle Category' };
MESSAGES.vehicle_types = { id: 'Kategori Kendaraan', en: 'Vehicle Category' };
MESSAGES.vehicle_brand = { id: 'Merek', en: 'Make/Brand' };
MESSAGES.vehicle_model = { id: 'Tipe', en: 'Vehicle Model' };
MESSAGES.plate_number = { id: 'Nomor Registrasi/Nomor Polisi', en: 'Registration No/Plate No' };
MESSAGES.plat_number = { id: 'Nomor Registrasi/Nomor Polisi', en: 'Registration No/Plate No' };
MESSAGES.chassis_number = { id: 'Nomor Rangka', en: 'Chassis Number' };
MESSAGES.engine_number = { id: 'Nomor Mesin', en: 'Engine Number' };
MESSAGES.manufactured_year = { id: 'Tahun Pembuatan', en: 'Manufactured Year' };
MESSAGES.colour = { id: 'Warna', en: 'Colour' };
MESSAGES.vehicle_colour = { id: 'Warna', en: 'Vehicle Colour' };
MESSAGES.bpkb_number = { id: 'Nomor Sertifikat BPKB', en: 'BPKB Certificate Number' };
MESSAGES.name_bpkb_owner = { id: 'Nama Pemilik Jaminan', en: 'Collateral Owner Name' };
MESSAGES.collateral_owner = { id: 'Nama Pemilik Jaminan', en: 'Collateral Owner Name' };

// Create Document / Agreement related fields
MESSAGES['Place Of Agreement'] = { id: 'Tempat Perjanjian', en: 'Place Of Agreement' };
MESSAGES.place_of_agreement = { id: 'Tempat Perjanjian', en: 'Place Of Agreement' };
MESSAGES['Date Of Delegated'] = { id: 'Tanggal Delegasi', en: 'Date Of Delegated' };
MESSAGES.date_of_delegated = { id: 'Tanggal Delegasi', en: 'Date Of Delegated' };
MESSAGES['Sp3 Number'] = { id: 'Nomor SP3K', en: 'SP3K Number' };
MESSAGES.sp3_number = { id: 'Nomor SP3K', en: 'SP3K Number' };

// BM (Branch Manager) personal fields
MESSAGES['Place Birth Of Bm'] = { id: 'Tempat Lahir', en: 'Place Birth' };
MESSAGES['Date Birth Of Bm'] = { id: 'Tanggal Lahir', en: 'Date Birth' };
MESSAGES['Date Birth Of Bm In Word'] = { id: 'Tanggal Lahir (dalam kata)', en: 'Date Of Birth In Word' };
MESSAGES['NIK BM'] = { id: 'NIK', en: 'NIK' };
MESSAGES['Street Of Bm'] = { id: 'Jalan', en: 'Street Name' };
MESSAGES['Subdistrict Of Bm'] = { id: 'Kelurahan', en: 'Subdistrict' };
MESSAGES['District Of Bm'] = { id: 'Kecamatan', en: 'District' };
MESSAGES['City Of Bm'] = { id: 'Kota', en: 'City' };
MESSAGES['Province Of Bm'] = { id: 'Provinsi', en: 'Province' };
// previous/topup contract word variants
MESSAGES.previous_topup_amount_in_word = { id: 'Baki Debet Kontrak Sebelumnya (dalam kata)', en: 'Outstanding Previous Contract In Word' };
MESSAGES.topup_contract_in_word = { id: 'Baki Debet Kontrak Sebelumnya (dalam kata)', en: 'Outstanding Previous Contract In Word' };
// Variants that may come from backend column labels (exact text as seen in UI)
MESSAGES['Place Birth Of Debtor'] = { id: 'Tempat Lahir', en: 'Place Of Birth' };
MESSAGES['Date Birth Of Debtor'] = { id: 'Tanggal Lahir', en: 'Date Of Birth' };
MESSAGES['Place Of Birth Of Debtor'] = { id: 'Tempat Lahir', en: 'Place Of Birth' };
MESSAGES['Date Of Birth Of Debtor'] = { id: 'Tanggal Lahir', en: 'Date Of Birth' };
MESSAGES.total_amount = { id: 'Jumlah Biaya', en: 'Total Charges' };
MESSAGES.date_format = { id: 'dd/mm/yyyy', en: 'dd/mm/yyyy' };
MESSAGES.name_of_director = { id: 'Nama Direktur', en: 'Name of Director' };
MESSAGES.phone_number_of_lolc = { id: 'Telepon', en: 'Phone' };
MESSAGES.name_of_bm = { id: 'Nama Lengkap', en: 'Full Name' };
MESSAGES.nik_number_of_bm = { id: 'NIK', en: 'NIK' };
MESSAGES.phone_number_of_bm = { id: 'Telepon Cabang', en: 'Branch Phone' };
MESSAGES.phone_number_branch = { id: 'Telepon', en: 'Phone Number' };
MESSAGES.tab_regional = { id: 'Regional', en: 'Regional' };
MESSAGES.tab_areas = { id: 'Area', en: 'Areas' };
MESSAGES.tab_branches = { id: 'Cabang', en: 'Branches' };
MESSAGES.branch_deleted = { id: 'Cabang dihapus', en: 'Branch deleted' };
MESSAGES.region_deleted = { id: 'Region dihapus', en: 'Region deleted' };
MESSAGES.area_deleted = { id: 'Area dihapus', en: 'Area deleted' };
MESSAGES.tab_director = { id: 'Direktur', en: 'Director' };
MESSAGES.tab_branch_manager = { id: 'Manajer Cabang', en: 'Branch Manager' };
MESSAGES.tab_contract = { id: 'Kontrak', en: 'Contract' };

MESSAGES.director_deleted = { id: 'Direktur dihapus', en: 'Director deleted' };
MESSAGES.contract_deleted = { id: 'Kontrak dihapus', en: 'Contract deleted' };
MESSAGES.delete_failed = { id: 'Hapus gagal', en: 'Delete failed' };
MESSAGES.add_region = { id: 'Tambah Regional', en: 'Add Region' };
MESSAGES.edit_region = { id: 'Edit Regional', en: 'Edit Region' };
MESSAGES.add_area = { id: 'Tambah Area', en: 'Add Area' };
MESSAGES.edit_area = { id: 'Edit Area', en: 'Edit Area' };
MESSAGES.add_director = { id: 'Tambah Direktur', en: 'Add Director' };
MESSAGES.edit_director = { id: 'Edit Direktur', en: 'Edit Director' };
MESSAGES.add_branch_manager = { id: 'Tambah Manajer Cabang', en: 'Add Branch Manager' };
MESSAGES.edit_branch_manager = { id: 'Edit Manajer Cabang', en: 'Edit Branch Manager' };
MESSAGES.add_contract = { id: 'Tambah Kontrak', en: 'Add Contract' };
MESSAGES.edit_contract = { id: 'Edit Kontrak', en: 'Edit Contract' };
MESSAGES.add_collateral = { id: 'Tambah Jaminan', en: 'Add Collateral' };
MESSAGES.create_document = { id: 'Buat Dokumen', en: 'Create Document' };
MESSAGES.phone = { id: 'Telepon', en: 'Phone' };
MESSAGES.phone_number = { id: 'Telepon', en: 'Phone Number' };
MESSAGES.branches_id = { id: 'Nama Cabang', en: 'Branch Name' };
// Exact-match header variants coming from backend (capitalization / spacing)
MESSAGES['Contract Id'] = { id: 'ID Kontrak', en: 'Contract Id' };
MESSAGES['Branch Name'] = { id: 'Nama Cabang', en: 'Branch Name' };
MESSAGES['BM ID'] = { id: 'ID BM', en: 'BM ID' };
MESSAGES['Director Id'] = { id: 'ID Direktur', en: 'Director Id' };
MESSAGES['Area ID'] = { id: 'Nama Area', en: 'Area Name' };
// Additional common variants (snake_case/camelCase/spacing) from backend
MESSAGES.contract_id = { id: 'ID Kontrak', en: 'Contract ID' };
MESSAGES.ContractID = { id: 'ID Kontrak', en: 'ContractID' };
MESSAGES.Contract_ID = { id: 'ID Kontrak', en: 'Contract_ID' };
MESSAGES.contractId = { id: 'ID Kontrak', en: 'contractId' };
MESSAGES.ContractID = { id: 'ID Kontrak', en: 'Contract ID' };
MESSAGES['contract id'] = { id: 'ID Kontrak', en: 'contract id' };

MESSAGES.branches_id = { id: 'Nama Cabang', en: 'Branch Name' };
MESSAGES.branch_id = { id: 'Nama Cabang', en: 'Branch ID' };
MESSAGES.BranchID = { id: 'Nama Cabang', en: 'BranchID' };

MESSAGES.bm_id = { id: 'ID BM', en: 'BM ID' };
MESSAGES.BMId = { id: 'ID BM', en: 'BMId' };
MESSAGES['BM Id'] = { id: 'ID BM', en: 'BM Id' };

MESSAGES.director_id = { id: 'ID Direktur', en: 'Director ID' };
MESSAGES.directorId = { id: 'ID Direktur', en: 'directorId' };

MESSAGES.area_id = { id: 'Nama Area', en: 'Area Name' };
MESSAGES.AreaID = { id: 'Nama Area', en: 'Area Name' };
MESSAGES.nik = { id: 'NIK', en: 'NIK' };
MESSAGES.place_of_birth = { id: 'Tempat Lahir', en: 'Place of Birth' };
MESSAGES.date_of_birth = { id: 'Tanggal Lahir', en: 'Date of Birth' };
MESSAGES.log_downloads_title = { id: 'Catatan - Perjanjian diunduh', en: 'Log - Download Agreements' };
MESSAGES.all_types = { id: 'Semua tipe', en: 'All types' };
MESSAGES.bl = { id: 'BL', en: 'BL' };
MESSAGES.uv = { id: 'UV', en: 'UV' };
MESSAGES.no_logs = { id: 'Tidak ada logs', en: 'No logs' };
MESSAGES.filename = { id: 'Nama Berkas', en: 'Filename' };
MESSAGES.identifier = { id: 'Nomor Kontrak', en: 'Contract Number' };
MESSAGES.ip = { id: 'IP', en: 'IP' };
MESSAGES.size = { id: 'Ukuran', en: 'Size' };
MESSAGES.user = { id: 'Pengguna', en: 'User' };
MESSAGES.timestamp = { id: 'Catatan Waktu', en: 'Timestamp' };
MESSAGES.anonymous = { id: 'anonymous', en: 'anonymous' };

// Generic empty state for agreement lists
MESSAGES.no_agreements = { id: 'Tidak ada perjanjian ditemukan', en: 'No agreements found.' };

// Notes and placeholders for Agreement pages
MESSAGES.before_create_doc_note = { id: 'Sebelum membuat dokumen, pastikan mengisi data kontrak dan jaminan terlebih dahulu.', en: 'Before creating the document, make sure to fill in the contract and collateral data first.' };
MESSAGES.search_agreements_placeholder = { id: 'Cari kontrak, debitur, NIK...', en: 'Search contract, debtor, NIK...' };

// BL / UV Agreement modal and file labels
MESSAGES['Agreement Number'] = { id: 'Nomor Perjanjian', en: 'Agreement Number' };
MESSAGES['Agreement Type'] = { id: 'Tipe Perjanjian', en: 'Agreement Type' };
MESSAGES['Agreement File'] = { id: 'Berkas Perjanjian', en: 'Agreement File' };
MESSAGES['Agreement Files'] = { id: 'Berkas Perjanjian', en: 'Agreement Files' };
MESSAGES['Upload Agreement'] = { id: 'Unggah Perjanjian', en: 'Upload Agreement' };
MESSAGES['Download Agreement'] = { id: 'Unduh Perjanjian', en: 'Download Agreement' };
MESSAGES['View Agreement'] = { id: 'Lihat Perjanjian', en: 'View Agreement' };
MESSAGES['Signed Date'] = { id: 'Tanggal Ditandatangani', en: 'Signed Date' };
MESSAGES['Signing Date'] = { id: 'Tanggal Penandatanganan', en: 'Signing Date' };
MESSAGES['Agreement Date'] = { id: 'Tanggal Perjanjian', en: 'Agreement Date' };
MESSAGES['Signed By'] = { id: 'Ditandatangani Oleh', en: 'Signed By' };
MESSAGES['Notary'] = { id: 'Notaris', en: 'Notary' };
MESSAGES['Notary Fee'] = { id: 'Biaya Notaris', en: 'Notary Fee' };
MESSAGES['Access'] = { id: 'Akses', en: 'Access' };
MESSAGES['Download'] = { id: 'Unduh', en: 'Download' };
MESSAGES['Upload'] = { id: 'Unggah', en: 'Upload' };
MESSAGES['File'] = { id: 'Berkas', en: 'File' };
MESSAGES['Filename'] = { id: 'Nama Berkas', en: 'Filename' };
MESSAGES['Agreement Status'] = { id: 'Status Perjanjian', en: 'Agreement Status' };
MESSAGES['Agreement Owner'] = { id: 'Pemilik Perjanjian', en: 'Agreement Owner' };
MESSAGES['UV Agreement'] = { id: 'UV Agreement', en: 'UV Agreement' };
MESSAGES['BL Agreement'] = { id: 'BL Agreement', en: 'BL Agreement' };

// Additional UI headings and placeholders
MESSAGES.filter = { id: 'Filter', en: 'Filter' };
MESSAGES.agreement_detail = { id: 'Detail Perjanjian', en: 'Agreement Detail' };
MESSAGES.collateral = { id: 'Jaminan', en: 'Collateral' };
MESSAGES.select_director_placeholder = { id: '-- Pilih Direktur --', en: '-- Select Director --' };
MESSAGES.select_relationship_placeholder = { id: '-- Pilih Hubungan --', en: '-- Select relationship --' };

// Application titles
MESSAGES.app_title = { id: 'Perjanjian', en: 'Agreement' };
// Dashboard header shown in the main header (different from sidebar menu)
MESSAGES.dashboard_header = { id: 'Agreement Automation', en: 'Agreement Automation' };

// Login / auth UI
MESSAGES.login_subtitle = { id: 'Masuk ke akun Anda', en: 'Sign in to your account' };
MESSAGES.username_placeholder = { id: 'Masukkan nama pengguna Anda', en: 'Enter your username' };
MESSAGES.password_placeholder = { id: 'Masukkan kata sandi Anda', en: 'Enter your password' };
MESSAGES.signing_in = { id: 'Sedang masuk...', en: 'Signing In...' };
MESSAGES.sign_in = { id: 'Masuk', en: 'Sign In' };

// Dashboard / Navigation
MESSAGES.welcome_back = { id: 'Selamat datang kembali,', en: 'Welcome back,' };
MESSAGES.workspace_subtitle = { id: 'Ruang kerja Anda untuk Agreement', en: 'Your workspace for Agreement' };
MESSAGES.bl_agreement_files = { id: 'Berkas Perjanjian BL', en: 'BL Agreement files' };
MESSAGES.uv_agreement_files = { id: 'Berkas Perjanjian UV', en: 'UV Agreement files' };
MESSAGES.dashboard = { id: 'Dashboard', en: 'Dashboard' };
MESSAGES.master_data = { id: 'Master Data', en: 'Master Data' };
MESSAGES.bl_agreement = { id: 'Perjanjian BL', en: 'BL Agreement' };
MESSAGES.uv_agreement = { id: 'Perjanjian UV', en: 'UV Agreement' };
MESSAGES.logs = { id: 'Catatan', en: 'Logs' };
MESSAGES.log_download_agreement = { id: 'Catatan - Unduh Perjanjian', en: 'Log - Download Agreement' };
MESSAGES.user_management = { id: 'Manajemen Pengguna', en: 'User Management' };
// Additional small keys
MESSAGES.status = { id: 'Status', en: 'Status' };
MESSAGES.expand_sidebar = { id: 'Perluas sidebar', en: 'Expand sidebar' };
MESSAGES.collapse_sidebar = { id: 'Sembunyikan sidebar', en: 'Collapse sidebar' };
MESSAGES.user_menu_title = { id: 'Menu pengguna', en: 'User menu' };
MESSAGES.sign_out = { id: 'Keluar', en: 'Sign Out' };

// Language labels
MESSAGES.lang_english = { id: 'Inggris', en: 'English' };
MESSAGES.lang_indonesian = { id: 'Indonesia', en: 'Indonesian' };

// Modal / form
MESSAGES.create_new_user = { id: 'Buat Pengguna Baru', en: 'Create New User' };
MESSAGES.edit_user = { id: 'Edit Pengguna', en: 'Edit User' };
MESSAGES.username = { id: 'Nama Pengguna', en: 'Username' };
MESSAGES.email = { id: 'Email', en: 'Email' };
MESSAGES.password = { id: 'Kata Sandi', en: 'Password' };
MESSAGES.password_leave_blank = { id: 'Kosongkan jika tidak ingin mengubah', en: 'Password (leave blank to keep)' };
MESSAGES.role = { id: 'Peran', en: 'Role' };
MESSAGES.role_user = { id: 'Pengguna', en: 'User' };
MESSAGES.role_admin = { id: 'Administrator', en: 'Administrator' };
MESSAGES.save = { id: 'Simpan', en: 'Save' };
MESSAGES.cancel = { id: 'Batal', en: 'Cancel' };
MESSAGES.save_collateral = { id: 'Simpan Jaminan', en: 'Save Collateral' };
MESSAGES.saving = { id: 'Menyimpan...', en: 'Saving...' };
MESSAGES.failed_save_collateral = { id: 'Gagal menyimpan jaminan', en: 'Failed to save collateral' };
// Foreign-key missing helper message when collateral references a non-existent contract
MESSAGES.fk_contract_missing = { id: 'Periksa nomor kontrak atau buat kontrak terlebih dahulu', en: 'Check the contract number or create the contract first' };

// Validation messages
MESSAGES.name_of_debtor_required = { id: 'Nama Debitur harus diisi', en: 'Name of debtor is required' };

// Exact-match variants for User Management table headers and modal labels
MESSAGES['Full Name'] = { id: 'Nama Lengkap', en: 'Full Name' };
MESSAGES['Email Address'] = { id: 'Email', en: 'Email Address' };
MESSAGES['Employee ID'] = { id: 'ID Karyawan', en: 'Employee ID' };
MESSAGES['Employee Id'] = { id: 'ID Karyawan', en: 'Employee Id' };
MESSAGES['Role'] = { id: 'Peran', en: 'Role' };
MESSAGES['Active'] = { id: 'Aktif', en: 'Active' };
MESSAGES['Inactive'] = { id: 'Tidak Aktif', en: 'Inactive' };
MESSAGES['Password'] = { id: 'Kata Sandi', en: 'Password' };
MESSAGES['Add User'] = { id: 'Tambah Pengguna', en: 'Add User' };
MESSAGES['Edit User'] = { id: 'Edit Pengguna', en: 'Edit User' };
MESSAGES['Create New User'] = { id: 'Buat Pengguna Baru', en: 'Create New User' };
MESSAGES['User'] = { id: 'Pengguna', en: 'User' };
MESSAGES['Username'] = { id: 'Nama Pengguna', en: 'Username' };

// Exact and snake_case variants requested for BL/UV modals
MESSAGES['contract_number'] = { id: 'Nomor Kontrak', en: 'Contract Number' };
MESSAGES.agreement_date = { id: 'Tanggal Perjanjian', en: 'Agreement Date' };

// Branch / Director filter variants (exact/snake_case)
MESSAGES['branch'] = { id: 'Cabang', en: 'Branch' };
MESSAGES['director'] = { id: 'Direktur', en: 'Director' };

// BM (Branch Manager) snake_case variants used in create-document forms
MESSAGES.place_birth_of_bm = { id: 'Tempat Lahir', en: 'Place Birth' };
MESSAGES.date_birth_of_bm = { id: 'Tanggal Lahir', en: 'Date Birth' };
MESSAGES.date_birth_of_bm_in_word = { id: 'Tanggal Lahir (dalam kata)', en: 'Date Of Birth In Word' };
MESSAGES.street_of_bm = { id: 'Jalan', en: 'Street Name' };
MESSAGES.street_name_of_bm = { id: 'Jalan', en: 'Street Name' };
MESSAGES.subdistrict_of_bm = { id: 'Kelurahan', en: 'Subdistrict' };
MESSAGES.district_of_bm = { id: 'Kecamatan', en: 'District' };
MESSAGES.city_of_bm = { id: 'Kota', en: 'City' };
MESSAGES.province_of_bm = { id: 'Provinsi', en: 'Province' };

// Vehicle / collateral exact-label variants seen in modals (UV)
MESSAGES['Vehicle Types'] = { id: 'Kategori Kendaraan', en: 'Vehicle Category' };
MESSAGES['Vehicle Brand'] = { id: 'Merek', en: 'Make/Brand' };
MESSAGES['Vehicle Model'] = { id: 'Tipe', en: 'Vehicle Model' };
MESSAGES['Plate Number'] = { id: 'Nomor Registrasi/Nomor Polisi', en: 'Registration No/Plate No' };
MESSAGES['Chassis Number'] = { id: 'Nomor Rangka', en: 'Chassis Number' };
MESSAGES['Engine Number'] = { id: 'Nomor Mesin', en: 'Engine Number' };
MESSAGES['Manufactured Year'] = { id: 'Tahun Pembuatan', en: 'Manufactured Year' };
MESSAGES['Colour'] = { id: 'Warna', en: 'Colour' };
MESSAGES['BPKB Number'] = { id: 'Nomor Sertifikat BPKB', en: 'BPKB Certificate Number' };
MESSAGES['Collateral Owner'] = { id: 'Nama Pemilik Jaminan', en: 'Collateral Owner Name' };

// Lowercase / snake_case vehicle variants
MESSAGES.vehicle_types = { id: 'Kategori Kendaraan', en: 'Vehicle Category' };
MESSAGES.vehicle_brand = { id: 'Merek', en: 'Make/Brand' };
MESSAGES.vehicle_model = { id: 'Tipe', en: 'Vehicle Model' };
MESSAGES.plate_number = { id: 'Nomor Registrasi/Nomor Polisi', en: 'Registration No/Plate No' };
MESSAGES.chassis_number = { id: 'Nomor Rangka', en: 'Chassis Number' };
MESSAGES.engine_number = { id: 'Nomor Mesin', en: 'Engine Number' };
MESSAGES.manufactured_year = { id: 'Tahun Pembuatan', en: 'Manufactured Year' };
MESSAGES.colour = { id: 'Warna', en: 'Colour' };
MESSAGES.bpkb_number = { id: 'Nomor Sertifikat BPKB', en: 'BPKB Certificate Number' };
MESSAGES.collateral_owner = { id: 'Nama Pemilik Jaminan', en: 'Collateral Owner Name' };

// Placeholder variants
MESSAGES['-- Select relationship --'] = { id: '-- Pilih Hubungan --', en: '-- Select Relationship --' };
MESSAGES['-- Select --'] = { id: '-- Pilih --', en: '-- Select --' };

// module-level current language so runtime switches are visible to callers
let CURRENT_LANG = (function() {
  try {
    const stored = localStorage.getItem('lang');
    if (stored) return stored.startsWith('en') ? 'en' : 'id';
    const nav = (typeof navigator !== 'undefined' && navigator.language) ? navigator.language : 'id';
    return nav.startsWith('en') ? 'en' : 'id';
  } catch (e) { return 'id'; }
})();

export function getLang() {
  return CURRENT_LANG || 'id';
}

export function setLang(l) {
  const normalized = (l || '').toString().startsWith('en') ? 'en' : 'id';
  CURRENT_LANG = normalized;
  try { localStorage.setItem('lang', normalized); } catch (e) { /* ignore */ }
  return normalized;
}

export function t(key, lang) {
  const l = lang || getLang();
  const entry = MESSAGES[key];
  if (!entry) return key;
  return entry[l] || entry.en || '';
}

const Messages = { t, getLang, setLang };

export default Messages;
