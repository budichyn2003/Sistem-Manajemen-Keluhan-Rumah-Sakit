# 🚀 Quick Start Guide - Sistem Manajemen Keluhan Rumah Sakit

Panduan singkat untuk memulai sistem dalam 5 menit!

## ⚡ Installation (1 menit)

```bash
# 1. Pastikan Node.js 18+ dan pnpm terinstall
node --version  # v18.0.0+
pnpm --version  # 8.0.0+

# 2. Install dependencies
pnpm install

# 3. Jalankan dev server
pnpm dev

# 4. Buka di browser
# Form: http://localhost:3000
# Admin: http://localhost:3000/admin
```

## 📝 Try It Out (4 menit)

### Step 1: Submit Keluhan (2 menit)

1. Buka http://localhost:3000
2. Isi formulir:
   - **Nama Pasien**: "Budi Santoso"
   - **Departemen**: "Gawat Darurat (IGD)"
   - **Keluhan**: "Waktu tunggu sangat lama, lebih dari 3 jam. Tidak ada informasi kapan bisa diperiksa dokter."
   - **Asuransi**: "BPJS Kesehatan"
3. Klik "Kirim Keluhan"
4. Catat nomor tiket yang muncul

### Step 2: Lihat di Dashboard (2 menit)

1. Buka http://localhost:3000/admin
2. Perhatikan:
   - **Metrics Cards**: Total keluhan naik 1, rata-rata prioritas terupdate
   - **Charts**: Keluhan hari ini terlihat di chart
   - **Table**: Keluhan baru muncul di bawah tabel
3. Klik icon "Lihat Detail" untuk melihat info lengkap

## 🔍 Explore Features

### Form Features
- ✅ Validasi real-time
- ✅ 9 pilihan departemen
- ✅ 6 pilihan asuransi
- ✅ Error messages detail
- ✅ Success notification

### Dashboard Features
- ✅ 4 metric cards
- ✅ Trend chart (7 hari terakhir)
- ✅ Insurance distribution pie chart
- ✅ Table dengan top 10 keluhan
- ✅ Detail modal per keluhan
- ✅ Auto-refresh setiap 30 detik

## 🤖 AI Clustering

Sistem otomatis mengelompokkan keluhan serupa:

1. Ekstrak keywords dari complaint text
2. Cari cluster yang match
3. Hitung priority score: `base + (volume × 0.5)`
4. Update database dengan cluster info

**Contoh:**
```
Complaint 1: "Waktu tunggu lama di IGD"
           → Keywords: [waktu, tunggu, lama]
           → Priority: 50.5 (Sedang)

Complaint 2: "Tunggu di IGD sudah 4 jam"
           → Keywords: [tunggu, lama]
           → Match dengan Cluster 1!
           → Cluster Volume: 2
           → Priority: 51.0 (Sedang + boost dari cluster)
```

## 📊 Priority Levels

| Skor | Kategori | Warna | Aksi |
|------|----------|-------|------|
| 0-25 | Rendah 🟢 | Hijau | Monitor |
| 25-50 | Sedang 🟡 | Kuning | Follow-up |
| 50-75 | Tinggi 🔴 | Merah | Prioritas |
| 75-100 | Kritis 🟣 | Ungu | Urgent |

## 🌍 Departments & Insurance

### Departments
- Gawat Darurat (IGD)
- Ruang Rawat Inap
- Poliklinik
- Kamar Operasi
- Keperawatan
- Laboratorium
- Farmasi
- Administrasi & Billing
- Lainnya

### Insurance Providers
- BPJS Kesehatan
- AXA Mandiri
- Allianz
- Cigna
- Prudential
- Pasien Umum (No Insurance)

## 💾 Data Storage

Data disimpan di `.data/db.json` (auto-created):

```json
{
  "complaints": [
    {
      "id": "uuid",
      "ticketNumber": "TKT-ABC-123456",
      "patientName": "Budi Santoso",
      "department": "igd",
      "complaintText": "...",
      "insuranceProvider": "bpjs",
      "status": "new",
      "priorityScore": 50.5,
      "clusterName": "Keluhan Waktu Tunggu",
      "clusterVolume": 1,
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z"
    }
  ],
  "clusters": [
    {
      "id": "uuid",
      "name": "Keluhan Waktu Tunggu",
      "keyword": "waktu",
      "volume": 1,
      "relatedComplaintIds": ["uuid"],
      "createdAt": "2024-01-15T10:30:00.000Z"
    }
  ],
  "lastUpdated": "2024-01-15T10:30:00.000Z"
}
```

## 🔧 Common Tasks

### Submit Test Data (Bulk)
```bash
# Create script test-complaints.js di project root
const complaints = [
  { patientName: "Ahmad", department: "igd", complaintText: "Waktu tunggu sangat lama di IGD lebih dari 5 jam" },
  { patientName: "Siti", department: "inpatient", complaintText: "Kamar mandi kotor dan tidak terawat dengan baik" },
  { patientName: "Rudi", department: "pharmacy", complaintText: "Obat yang diminta tidak tersedia dan staff tidak membantu" },
];

complaints.forEach(async (c) => {
  await fetch('/api/complaints', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(c)
  });
});
```

### Check Database
```bash
# View database file
cat .data/db.json

# Format prettily
cat .data/db.json | jq .
```

### Clear All Data
```bash
# Delete database file
rm .data/db.json

# Next API call akan create fresh database
```

## 🐛 Troubleshooting

### Issue: Form submit tidak bekerja
```bash
# 1. Check console (F12 → Console tab)
# 2. Verify API endpoint
curl -X GET http://localhost:3000/api/complaints
# 3. Check validation messages
# 4. Ensure all required fields filled
```

### Issue: Dashboard kosong
```bash
# 1. Refresh halaman (Ctrl+Shift+R hard refresh)
# 2. Check .data/db.json exists
# 3. Check Network tab di DevTools
# 4. Verify API call /api/metrics
```

### Issue: Data tidak tersimpan
```bash
# 1. Check folder .data/ dibuat
ls -la .data/

# 2. Check file permissions
chmod 755 .data/

# 3. Restart dev server
# Kill dengan Ctrl+C dan jalankan: pnpm dev
```

## 📚 Next Steps

1. **Baca dokumentasi lengkap**: `README.id.md`
2. **Pelajari arsitektur**: `ARCHITECTURE.id.md`
3. **Explore codebase**:
   - `lib/i18n.ts` - Translations
   - `lib/db.ts` - Database logic
   - `components/complaint-form.tsx` - Form component
   - `components/admin-dashboard.tsx` - Dashboard
   - `app/api/` - API routes

4. **Customize**:
   - Edit departments di `form.tsx` dan `i18n.ts`
   - Ubah colors di dashboard styling
   - Modify priority scoring formula di `/api/complaints`

## 🚀 Deployment

### Vercel (Recommended)
```bash
# 1. Push ke GitHub
git push origin main

# 2. Connect di vercel.com
# 3. Deploy otomatis

# Notes:
# - File-based DB berfungsi di Vercel
# - Data akan reset saat redeploy
# - Untuk persist, gunakan database service
```

### Docker
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY . .
RUN pnpm install
RUN pnpm build
EXPOSE 3000
CMD ["pnpm", "start"]
```

```bash
docker build -t hospital-complaint-system .
docker run -p 3000:3000 hospital-complaint-system
```

## 📞 Support

Butuh bantuan? Check:
- `README.id.md` - Dokumentasi lengkap
- `ARCHITECTURE.id.md` - Penjelasan teknis
- Browser console - Error messages
- `.data/db.json` - Check data

---

**Happy Complaining!** 🎉

**Total Setup Time**: < 5 menit
**Default Port**: 3000
**Database**: .data/db.json
