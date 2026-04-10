# Telegram Bot Integration - Setup Guide

## Overview

Telegram Bot terintegrasi langsung dengan AI Microservice yang berjalan di background. Bot ini:
1. Menerima pesan teks dari user Telegram
2. Menjalankan analisis AI (Gemini extraction + Clustering)
3. Mengirim hasil ke Next.js API (`http://localhost:3000/api/complaints`)
4. Mengirim nomor tiket kembali ke user

## Prerequisites

1. **Telegram Bot Token** - Dapatkan dari [@BotFather](https://t.me/BotFather) di Telegram
2. **Python 3.9+** - Untuk menjalankan FastAPI service
3. **Gemini API Key** - Dari Google AI Studio

## Setup Steps

### 1. Dapatkan Telegram Bot Token

1. Chat dengan [@BotFather](https://t.me/BotFather)
2. Ketik `/newbot`
3. Ikuti instruksi untuk membuat bot baru
4. Copy token yang diberikan (format: `123456789:ABCdefGHIjklMNOpqrSTuvWXYZabcdef`)

### 2. Install Dependencies

```bash
cd ai-service
pip install -r requirements.txt
```

### 3. Set Environment Variables

Sebelum menjalankan service, set environment variables berikut:

**Windows (PowerShell):**
```powershell
$env:GEMINI_API_KEY = "AIzaSyCppjp7n-4WA7SNItutFzpJpf5giV_7JcQ"
$env:TELEGRAM_BOT_TOKEN = "8656813319:AAHaOTDSB8WbsqxEQKqGJIZ20zsyrmWYYw8"
$env:NEXTJS_API_URL = "http://localhost:3000"
```

**Windows (Command Prompt):**
```cmd
set GEMINI_API_KEY=your_gemini_api_key
set TELEGRAM_BOT_TOKEN=your_telegram_bot_token
set NEXTJS_API_URL=http://localhost:3000
```

**Linux/Mac:**
```bash
export GEMINI_API_KEY="your_gemini_api_key"
export TELEGRAM_BOT_TOKEN="your_telegram_bot_token"
export NEXTJS_API_URL="http://localhost:3000"
```

### 4. Jalankan AI Service

```bash
cd ai-service
python main.py
```

Expected output:
```
[Server] Starting AI Service on port 8000
[Server] Next.js API URL: http://localhost:3000
[Bot] Telegram Bot Token configured: Yes
[Bot] Telegram Bot starting in background...
[Bot] Telegram Bot initialized, polling started...
```

### 5. Start Next.js Server (di terminal lain)

```bash
pnpm dev
```

## How to Use

### Untuk User (di Telegram)

1. Cari bot Anda di Telegram menggunakan username yang dibuat saat setup
2. Kirim pesan dengan keluhan/laporan
3. Bot akan memproses dan mengirim nomor tiket ke chat

**Contoh:**
```
User: "AC di ruang rawat inap tidak dingin, padahal sudah dilaporkan kemarin"
Bot: "⏳ Menganalisis laporan Anda, harap tunggu..."
Bot: "✅ Terima kasih, laporan Anda telah diterima dengan Nomor Tiket: TKT-ABC-123456"
```

### Verifikasi di Dashboard

1. Buka http://localhost:3000/admin
2. Lihat keluhan terbaru yang dikirim via Telegram Bot
3. Klick "Lihat Detail" untuk melihat analisis AI

## API Communication Flow

```
Telegram User
     ↓ (send text message)
Telegram Bot (main.py)
     ↓ (call analyze_complaint)
AI Service (Gemini + Clustering)
     ↓ (POST /api/complaints)
Next.js Backend
     ↓ (save to db.json)
Admin Dashboard
     ↓ (display complaint)
```

## Error Handling

### Bot tidak merespons

**Check:**
1. Pastikan `TELEGRAM_BOT_TOKEN` benar
2. Pastikan internet connection stabil
3. Lihat logs di terminal untuk error message

### Complaint tidak muncul di dashboard

**Check:**
1. Pastikan Next.js server berjalan (`pnpm dev`)
2. Pastikan `NEXTJS_API_URL` default (`http://localhost:3000`)
3. Check response di logs bot terminal

### Connection Timeout

**Solusi:**
```python
# Di main.py, ubah timeout jika diperlukan:
timeout=aiohttp.ClientTimeout(total=60)  # 60 detik
```

## Testing

### Manual Test dari Terminal

```bash
# Terminal 1: Jalankan AI Service
cd ai-service
python main.py

# Terminal 2: Test endpoint analyze-complaint
curl -X POST "http://localhost:8000/api/v1/analyze-complaint" \
  -H "Content-Type: application/json" \
  -d '{
    "complaint_id": "test-123",
    "text": "Ruang tunggu terlalu panas, AC tidak berfungsi"
  }'
```

Expected response:
```json
{
  "complaint_id": "test-123",
  "extracted_data": {
    "target": "RS",
    "category": "Fasilitas",
    "base_urgency_score": 3
  },
  "clustering": {
    "cluster_id": "xxxxx-xxxxx",
    "similarity_score": 0.0,
    "is_new_cluster": true
  }
}
```

## Monitoring

### Check Health Status

```bash
curl http://localhost:8000/health
```

Response:
```json
{
  "status": "healthy",
  "telegram_bot_running": true
}
```

## Architecture Notes

1. **Async Processing**: Bot berjalan di background task, tidak mengganggu FastAPI
2. **In-Memory Clustering**: Cluster vectors disimpan di memory, hilang saat restart
3. **Error Recovery**: Fallback values untuk extraction jika LLM error
4. **Timeout Protection**: 30 detik timeout untuk komunikasi ke Next.js

## Troubleshooting Checklist

- [ ] TELEGRAM_BOT_TOKEN valid dan tidak expired
- [ ] GEMINI_API_KEY valid
- [ ] NEXTJS_API_URL accessible (cek dengan curl)
- [ ] Next.js server running di port 3000
- [ ] Internet connection stable
- [ ] Python 3.9+ installed
- [ ] All dependencies installed (`pip install -r requirements.txt`)

## Production Deployment

Untuk production, pertimbangkan:
1. Use persistent database untuk cluster store (bukan in-memory)
2. Add rate limiting per user
3. Implement request validation yang ketat
4. Use environment file (`.env`) instead of command-line variables
5. Monitor bot downtime
6. Setup alerting untuk error messages
7. Use HTTPS untuk komunikasi ke Next.js

---

**Last Updated**: April 2026
**Version**: 1.0.0
