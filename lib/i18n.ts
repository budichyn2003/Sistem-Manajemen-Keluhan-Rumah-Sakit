/**
 * Internationalization (i18n) untuk Sistem Manajemen Keluhan Rumah Sakit
 * Indonesian localization module untuk seluruh aplikasi
 */

export const translations = {
  // Header & Navigation
  nav: {
    userForm: 'Formulir Keluhan',
    adminDashboard: 'Dasbor Admin',
  },

  // User Form Page
  form: {
    title: 'Sistem Manajemen Keluhan Rumah Sakit',
    subtitle: 'Sampaikan keluhan Anda untuk meningkatkan kualitas layanan kesehatan',
    patientName: 'Nama Pasien',
    patientNamePlaceholder: 'Masukkan nama lengkap',
    patientNameRequired: 'Nama pasien diperlukan',
    department: 'Departemen/Bagian',
    selectDepartment: 'Pilih departemen',
    departmentRequired: 'Departemen diperlukan',
    departments: {
      emergency: 'Gawat Darurat (IGD)',
      inpatient: 'Ruang Rawat Inap',
      outpatient: 'Poliklinik',
      surgery: 'Kamar Operasi',
      nursing: 'Keperawatan',
      laboratory: 'Laboratorium',
      pharmacy: 'Farmasi',
      billing: 'Administrasi & Billing',
      other: 'Lainnya',
    },
    complaintText: 'Deskripsi Keluhan',
    complaintTextPlaceholder: 'Jelaskan keluhan Anda secara detail...',
    complaintTextRequired: 'Deskripsi keluhan diperlukan',
    complaintTextMinLength: 'Deskripsi minimal 10 karakter',
    insuranceProvider: 'Penyedia Asuransi Kesehatan',
    selectInsurance: 'Pilih asuransi (opsional)',
    insuranceProviders: {
      bpjs: 'BPJS Kesehatan',
      asuransi_mandiri: 'AXA Mandiri',
      allianz: 'Allianz',
      cigna: 'Cigna',
      prudential: 'Prudential',
      umum: 'Pasien Umum',
    },
    submit: 'Kirim Keluhan',
    submitting: 'Mengirim...',
    successTitle: 'Keluhan Berhasil Dikirim',
    successMessage: 'Terima kasih telah memberikan masukan. Tim kami akan segera meninjau keluhan Anda.',
    ticketId: 'Nomor Tiket',
    errorTitle: 'Terjadi Kesalahan',
    errorMessage: 'Gagal mengirim keluhan. Silakan coba kembali.',
    close: 'Tutup',
  },

  // Admin Dashboard
  dashboard: {
    title: 'Dasbor Admin - Sistem Keluhan Rumah Sakit',
    welcomeTitle: 'Selamat Datang di Dasbor Keluhan',
    welcomeSubtitle: 'Pantau dan kelola keluhan pasien secara real-time',
    
    // Cards
    totalComplaints: 'Total Keluhan',
    avgPriority: 'Prioritas Rata-rata',
    pendingReview: 'Menunggu Ditinjau',
    rsVsInsurance: 'Keluhan per Asuransi',

    // Table
    complaintsTable: 'Tabel Keluhan Terbaru',
    ticketNumber: 'No. Tiket',
    patientName: 'Nama Pasien',
    department: 'Departemen',
    priority: 'Prioritas',
    status: 'Status',
    date: 'Tanggal',
    viewDetails: 'Lihat Detail',
    noData: 'Tidak ada data keluhan',
    
    // Status
    statusNew: 'Baru',
    statusReviewing: 'Ditinjau',
    statusResolved: 'Diselesaikan',

    // Priority Levels
    priorityLow: 'Rendah',
    priorityMedium: 'Sedang',
    priorityHigh: 'Tinggi',
    priorityCritical: 'Kritis',

    // Charts
    complaintTrendTitle: 'Tren Keluhan (7 Hari Terakhir)',
    rsVsInsuranceTitle: 'Distribusi Keluhan per Asuransi',
    dateLabel: 'Tanggal',
    countLabel: 'Jumlah Keluhan',
    insuranceLabel: 'Asuransi',

    // Details Modal
    detailsTitle: 'Detail Keluhan',
    complaintDetails: 'Deskripsi Keluhan',
    clusterInfo: 'Informasi Pengelompokan',
    clusterName: 'Nama Kluster',
    clusterVolume: 'Volume Kluster',
    priorityScore: 'Skor Prioritas',
    createdAt: 'Dibuat pada',
    closeModal: 'Tutup',
  },

  // API & Error Messages
  errors: {
    invalidInput: 'Input tidak valid',
    serverError: 'Terjadi kesalahan server',
    notFound: 'Data tidak ditemukan',
    invalidRequest: 'Permintaan tidak valid',
  },

  // Date formatting
  dateFormat: {
    locale: 'id-ID',
  },
} as const;

export type TranslationKey = typeof translations;
