# Sistem Manajemen Keluhan Rumah Sakit

Sistem yang komprehensif untuk mengelola, menganalisis, dan memprioritaskan keluhan pasien rumah sakit dengan menggunakan teknologi AI clustering dan dynamic priority scoring.

## 📋 Daftar Isi

- [Fitur Utama](#fitur-utama)
- [Arsitektur Sistem](#arsitektur-sistem)
- [Cara Instalasi](#cara-instalasi)
- [Cara Penggunaan](#cara-penggunaan)
- [API Documentation](#api-documentation)
- [Database Schema](#database-schema)
- [Priority Scoring Formula](#priority-scoring-formula)
- [Troubleshooting](#troubleshooting)

## ✨ Fitur Utama

### 1. **Formulir Pengajuan Keluhan**
   - Interface yang user-friendly untuk pasien
   - Validasi input secara real-time
   - Support untuk berbagai departemen rumah sakit
   - Integrasi informasi asuransi kesehatan
   - Konfirmasi sukses dengan nomor tiket

### 2. **Dasbor Admin**
   - Dashboard real-time dengan metrik kunci
   - Visualisasi data dengan charts dan graphs
   - Tabel keluhan dengan sorting dan filtering
   - Modal detail untuk setiap keluhan
   - Tracking status keluhan (Baru → Ditinjau → Diselesaikan)

### 3. **AI Clustering**
   - Pengelompokan otomatis keluhan serupa
   - Keyword extraction dari complaint text
   - Clustering berdasarkan pattern recognition
   - Dynamic cluster volume tracking

### 4. **Priority Scoring**
   - Formula: `priorityScore = baseUrgencyScore + (clusterVolume × 0.5)`
   - Skor dinamis berdasarkan volume keluhan
   - Categorisasi prioritas: Rendah, Sedang, Tinggi, Kritis
   - Automatic routing berdasarkan prioritas

### 5. **Localization Penuh**
   - Antarmuka 100% dalam bahasa Indonesia
   - Dokumentasi lengkap dalam bahasa Indonesia
   - Support untuk format tanggal Indonesia
   - Semua pesan error dan success dalam bahasa Indonesia

## 🏗️ Arsitektur Sistem

### Stack Teknologi
- **Framework**: Next.js 16 (App Router)
- **UI Components**: shadcn/ui dengan Tailwind CSS
- **Form Handling**: react-hook-form dengan Zod validation
- **Database**: JSON-based file storage (.data/db.json)
- **Charts**: Recharts
- **Language**: TypeScript dengan strict mode

### Struktur Folder
```
project/
├── app/
│   ├── page.tsx                 # Home page (Form)
│   ├── admin/
│   │   └── page.tsx            # Admin Dashboard
│   ├── api/
│   │   ├── complaints/
│   │   │   └── route.ts        # POST/GET complaints
│   │   └── metrics/
│   │       └── route.ts        # GET metrics
│   ├── layout.tsx              # Root layout
│   └── globals.css             # Global styles
├── components/
│   ├── complaint-form.tsx      # Complaint form component
│   └── admin-dashboard.tsx     # Dashboard component
├── lib/
│   ├── i18n.ts                 # Translations
│   ├── db.ts                   # Database manager
│   └── utils.ts                # Utility functions
├── public/                      # Static assets
├── package.json
├── tsconfig.json
└── tailwind.config.ts
```

## 🚀 Cara Instalasi

### Prerequisites
- Node.js 18+ dan pnpm

### Langkah-Langkah

1. **Clone Repository**
   ```bash
   git clone <repository-url>
   cd hospital-complaint-system
   ```

2. **Install Dependencies**
   ```bash
   pnpm install
   ```

3. **Jalankan Development Server**
   ```bash
   pnpm dev
   ```

4. **Akses Aplikasi**
   - Formulir Keluhan: http://localhost:3000
   - Admin Dashboard: http://localhost:3000/admin

### Production Build
```bash
pnpm build
pnpm start
```

## 📖 Cara Penggunaan

### Untuk Pasien

1. **Buka Halaman Form**: Navigasi ke http://localhost:3000
2. **Isi Formulir**:
   - Masukkan nama lengkap
   - Pilih departemen tempat keluhan terjadi
   - Jelaskan keluhan secara detail (minimal 10 karakter)
   - Pilih asuransi kesehatan (opsional)
3. **Submit**: Klik tombol "Kirim Keluhan"
4. **Konfirmasi**: Catat nomor tiket untuk referensi

### Untuk Admin

1. **Buka Dashboard**: Navigasi ke http://localhost:3000/admin
2. **Monitor Metrik**:
   - Total keluhan diterima
   - Rata-rata prioritas
   - Keluhan menunggu ditinjau
   - Distribusi per asuransi
3. **Lihat Tren**: Chart tren keluhan 7 hari terakhir
4. **Kelola Keluhan**: Klik "Lihat Detail" untuk melihat informasi lengkap

## 🔌 API Documentation

### POST /api/complaints
**Submit keluhan baru**

**Request Body:**
```json
{
  "patientName": "Nama Pasien",
  "department": "igd|inpatient|outpatient|surgery|nursing|laboratory|pharmacy|billing|other",
  "complaintText": "Deskripsi keluhan minimal 10 karakter",
  "insuranceProvider": "bpjs|mandiri|allianz|cigna|prudential|umum (optional)"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Terima kasih telah memberikan masukan...",
  "ticket": {
    "id": "uuid",
    "ticketNumber": "TKT-ABC-123456"
  }
}
```

### GET /api/complaints
**Ambil semua keluhan**

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "ticketNumber": "TKT-ABC-123456",
      "patientName": "Nama Pasien",
      "department": "igd",
      "complaintText": "...",
      "insuranceProvider": "bpjs",
      "status": "new|reviewing|resolved",
      "priorityScore": 65.5,
      "clusterName": "Keluhan Pelayanan",
      "clusterVolume": 3,
      "createdAt": "2024-01-15T10:30:00Z",
      "updatedAt": "2024-01-15T10:35:00Z"
    }
  ]
}
```

### GET /api/metrics
**Ambil statistik dashboard**

**Response (200):**
```json
{
  "success": true,
  "data": {
    "totalComplaints": 42,
    "avgPriority": "55.3",
    "pendingReview": 5,
    "insuranceDistribution": {
      "bpjs": 20,
      "umum": 15,
      "mandiri": 7
    },
    "trendData": [
      { "date": "Jan 15", "count": 5 },
      { "date": "Jan 16", "count": 8 }
    ]
  }
}
```

## 💾 Database Schema

### Complaints Collection
```typescript
interface Complaint {
  id: string (UUID)
  ticketNumber: string (Format: TKT-ABC-123456)
  patientName: string
  department: string
  complaintText: string
  insuranceProvider: string (default: "umum")
  status: "new" | "reviewing" | "resolved"
  clusterId?: string
  clusterName?: string
  clusterVolume: number
  priorityScore: number (0-100)
  urgencyScore: number (0-100, default: 50)
  createdAt: Date
  updatedAt: Date
}
```

### Clusters Collection
```typescript
interface Cluster {
  id: string (UUID)
  name: string (e.g., "Keluhan Pelayanan")
  keyword: string (extracted keyword)
  volume: number (jumlah keluhan serupa)
  relatedComplaintIds: string[]
  createdAt: Date
}
```

### Database File
```
.data/
└── db.json (JSON database dengan structure di atas)
```

## 🎯 Priority Scoring Formula

### Perhitungan
```
priorityScore = baseUrgencyScore + (clusterVolume × 0.5)
```

### Contoh
- Base Urgency Score: 50
- Cluster Volume: 10 (ada 10 keluhan serupa)
- Priority Score = 50 + (10 × 0.5) = 55

### Kategori Prioritas
- **Rendah** (0-25): Keluhan minor yang bisa ditunda
- **Sedang** (25-50): Keluhan standar yang perlu follow-up
- **Tinggi** (50-75): Keluhan penting yang butuh penanganan cepat
- **Kritis** (75-100): Keluhan urgent yang memerlukan tindakan segera

## 🛠️ Troubleshooting

### Masalah: Keluhan tidak tersubmit
**Solusi:**
1. Pastikan semua field required sudah diisi
2. Deskripsi keluhan minimal 10 karakter
3. Check browser console untuk error message
4. Verifikasi API endpoint /api/complaints accessible

### Masalah: Dashboard tidak loading
**Solusi:**
1. Refresh halaman (F5 atau Cmd+R)
2. Clear browser cache
3. Check network tab di DevTools
4. Pastikan API route /api/metrics berfungsi

### Masalah: Data tidak persist
**Solusi:**
1. Verifikasi folder `.data/` sudah dibuat
2. Check file permissions di `.data/db.json`
3. Ensure write access ke project directory
4. Restart development server

### Masalah: Validasi form error
**Solusi:**
1. Pastikan input sesuai requirements
2. Nama minimal 1 karakter
3. Deskripsi minimal 10 karakter
4. Department field tidak boleh kosong

## 🔒 Keamanan

### Implemented Security Features
- ✅ Input validation dengan Zod
- ✅ TypeScript strict mode
- ✅ XSS protection via React escaping
- ✅ CSRF protection (Next.js built-in)
- ✅ Secure file operations dengan proper error handling
- ✅ No sensitive data in logs

### Best Practices
- Gunakan environment variables untuk sensitive config
- Implement rate limiting di production
- Add authentication untuk admin dashboard
- Enable HTTPS di production
- Regular backup dari database file

## 📝 Lisensi

MIT License - Bebas digunakan untuk keperluan komersial dan non-komersial

## 👥 Kontribusi

Kontribusi welcome! Silakan buat pull request dengan perbaikan atau fitur baru.

---

**Last Updated**: April 2026
**Version**: 1.0.0
