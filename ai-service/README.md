# AI Complaint Analysis Service

FastAPI-based microservice untuk analisis keluhan rumah sakit dengan integrasi AI (Google Gemini) dan Telegram Bot.

## Features

✅ **LLM-based Extraction** - Google Gemini untuk mengekstrak kategori, target, dan urgency score
✅ **Semantic Clustering** - Sentence Transformers + In-Memory Vector Store dengan cosine similarity
✅ **Telegram Bot Integration** - Receive complaints via Telegram dan auto-post ke Next.js API
✅ **Async/Background Processing** - Bot runs in background tanpa blocking FastAPI endpoints
✅ **Error Handling & Fallbacks** - Robust error recovery dengan sensible defaults

## Architecture

```
┌──────────────────┐
│  Telegram User   │
└────────┬─────────┘
         │ sends text message
         ▼
┌──────────────────┐        ┌─────────────────────┐
│  Telegram Bot    │───────▶│ analyze_complaint() │
└──────────────────┘        └──────────┬──────────┘
                                       │
                  ┌────────────────────┼────────────────────┐
                  │                    │                    │
                  ▼                    ▼                    ▼
          ┌─────────────┐    ┌──────────────┐    ┌──────────────┐
          │  Extraction │    │  Clustering  │    │   Cosine     │
          │  (Gemini)   │    │ (Embeddings) │    │  Similarity  │
          └─────────────┘    └──────────────┘    └──────────────┘
                  │                    │                    │
                  └────────────────────┼────────────────────┘
                                       │
                                       ▼
                        ┌─────────────────────────┐
                        │  send_complaint_to_     │
                        │       nextjs()          │
                        └────────────┬────────────┘
                                     │
         ┌───────────────────────────┼───────────────────────────┐
         │                           │                           │
         ▼                           ▼                           ▼
   ┌──────────────┐   ┌──────────────────────┐   ┌────────────────┐
   │  Next.js API │── │  /api/complaints     │── │  Database      │
   │              │   │  (POST)              │   │  (db.json)     │
   └──────────────┘   └──────────────────────┘   └────────────────┘
         ▲                                              │
         │                                              ▼
         │                                    ┌──────────────────┐
         └────────────────────────────────────│  Admin Dashboard │
                                              └──────────────────┘
```

## Directory Structure

```
ai-service/
├── main.py                    # FastAPI app + Bot implementation
├── requirements.txt           # Python dependencies
├── .env.example               # Environment variables template
├── TELEGRAM_BOT_SETUP.md      # Setup guide untuk Telegram Bot
└── README.md                  # Dokumentasi ini
```

## Quick Start

### 1. Install Dependencies

```bash
cd ai-service
pip install -r requirements.txt
```

### 2. Configure Environment Variables

```bash
# Copy template
cp .env.example .env

# Edit .env dengan nilai sebenarnya:
# GEMINI_API_KEY=your_key
# TELEGRAM_BOT_TOKEN=your_token
# NEXTJS_API_URL=http://localhost:3000
```

### 3. Run Service

```bash
python main.py
```

Output:
```
[Server] Starting AI Service on port 8000
[Bot] Telegram Bot starting in background...
[Bot] Telegram Bot initialized, polling started...
INFO:     Uvicorn running on http://0.0.0.0:8000
```

### 4. Test Endpoints

```bash
# Health check
curl http://localhost:8000/health

# Analyze complaint
curl -X POST http://localhost:8000/api/v1/analyze-complaint \
  -H "Content-Type: application/json" \
  -d '{
    "complaint_id": "test-1",
    "text": "Ruang tunggu sangat panas dan pengap"
  }'
```

## API Endpoints

### POST `/api/v1/analyze-complaint`

Analyze complaint text dan return extraction + clustering results.

**Request:**
```json
{
  "complaint_id": "string",
  "text": "string (min 10 chars)"
}
```

**Response (200):**
```json
{
  "complaint_id": "string",
  "extracted_data": {
    "target": "RS|Asuransi|Keduanya",
    "category": "string",
    "base_urgency_score": 1|3|10
  },
  "clustering": {
    "cluster_id": "string",
    "similarity_score": 0.0-1.0,
    "is_new_cluster": true|false
  }
}
```

### GET `/health`

Health check endpoint.

**Response (200):**
```json
{
  "status": "healthy",
  "telegram_bot_running": true|false
}
```

## Component Details

### 1. Extract Complaint Data (Gemini)

Menggunakan Google Gemini 1.5 Flash untuk:
- Mengidentifikasi **target** (RS, Asuransi, atau Keduanya)
- Mengekstrak **kategori** keluhan
- Menentukan **base_urgency_score** (1=low, 3=medium, 10=high)

**Prompt Template:**
```
Analyze the complaint and extract:
- target: "RS" | "Asuransi" | "Keduanya"
- category: "Pelayanan" | "Fasilitas" | etc
- base_urgency_score: 1 | 3 | 10

Return ONLY valid JSON.
```

**Error Handling:** Fallback ke default values jika extraction gagal.

### 2. Semantic Clustering

Menggunakan sentence-transformers untuk:
- Generate vector embeddings dari complaint text
- Menyimpan centroid dari setiap cluster di in-memory store
- Menghitung cosine similarity dengan existing clusters
- Threshold: **0.85** untuk fuzzy matching

**Decision Tree:**
```
similarity > 0.85 dengan existing cluster
  ├─ YES → assign ke cluster (is_new_cluster=false)
  │        update centroid (average)
  └─ NO  → create cluster baru (is_new_cluster=true)
           generate UUID untuk cluster_id
```

### 3. Telegram Bot Handler

Asynchronously process incoming Telegram messages:
1. Receive message dari user
2. Show "Processing..." indicator
3. Call `/api/v1/analyze-complaint`
4. POST ke Next.js API dengan extracted data
5. Reply dengan ticket number

**Bot Commands Supported:**
- Text messages (dianalisa sebagai complaints)
- Tidak support slash commands (diignore)

### 4. Next.js API Integration

POST ke `http://localhost:3000/api/complaints` dengan payload:
```json
{
  "patientName": "User first name dari Telegram",
  "department": "Extracted category",
  "complaintText": "Original message text",
  "insuranceProvider": "umum" (default)
}
```

Expects response:
```json
{
  "success": true,
  "ticket": {
    "id": "uuid",
    "ticketNumber": "TKT-ABC-123456"
  }
}
```

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `GEMINI_API_KEY` | ✅ | - | Google Gemini API Key |
| `TELEGRAM_BOT_TOKEN` | ❌ | - | Telegram Bot Token (untuk Bot feature) |
| `NEXTJS_API_URL` | ❌ | `http://localhost:3000` | Next.js backend URL |

## Dependencies

```
fastapi==0.104.1              # Web framework
uvicorn==0.24.0               # ASGI server
google-generativeai==0.3.2    # Gemini API
sentence-transformers==2.2.2  # Embeddings
torch==2.1.0                  # ML framework
numpy==1.24.3                 # Numerical computing
scikit-learn==1.3.2           # ML utilities (cosine_similarity)
pydantic==2.5.0               # Data validation
python-telegram-bot==20.3     # Telegram Bot API
aiohttp==3.9.1                # Async HTTP client
```

## Configuration

### Models

```python
genai.GenerativeModel('gemini-1.5-flash')  # LLM untuk extraction
SentenceTransformer('paraphrase-multilingual-MiniLM-L12-v2')  # Embeddings
```

### Thresholds

```python
similarity_threshold = 0.85  # Clustering similarity cutoff
```

### Timeouts

```python
aiohttp.ClientTimeout(total=30)  # 30 detik timeout ke Next.js API
```

## Error Handling

| Error | Fallback |
|-------|----------|
| Gemini API error | `ExtractedData(target="RS", category="Umum", base_urgency_score=3)` |
| Clustering error | Generate new cluster dengan random UUID |
| Next.js API timeout | Show error message ke user, don't save to DB |
| Telegram message error | Send error message back to user |

## Performance Notes

- **First request slower** → Model loading (Gemini + Sentence Transformer)
- **Subsequent requests faster** → Models cached in memory
- **Bot latency** → ~2-3 detik per message (tergantung Gemini response time)
- **Clustering latency** → ~0.5 detik per embedding

## Production Checklist

- [ ] Use `.env` file, not hardcoded variables
- [ ] Setup persistent clustering store (database instead of in-memory)
- [ ] Add rate limiting per Telegram user
- [ ] Setup comprehensive logging
- [ ] Monitor model loading memory
- [ ] Setup error alerting
- [ ] Use HTTPS untuk Next.js communication
- [ ] Add authentication ke FastAPI (optional)
- [ ] Setup database backup strategy

## Troubleshooting

### Bot tidak merespons

```bash
# Check logs
tail -f service.log

# Check bot token valid
curl -X GET https://api.telegram.org/bot<TOKEN>/getMe

# Check NEXTJS_API_URL
curl http://localhost:3000/api/complaints
```

### Clustering tidak akurat

- Turunkan similarity threshold di `perform_clustering()`
- Check cluster_store size: `len(cluster_store)`
- Review model: `paraphrase-multilingual-MiniLM-L12-v2`

### Memory issues

- Monitor: `cluster_store` size bertambah seiring time
- Implement periodic cleanup (implementasi future)
- Consider switching ke persistent database

## Future Enhancements

- [ ] Persistent cluster storage (SQLite/PostgreSQL)
- [ ] Support untuk voice messages (transcription → analysis)
- [ ] Web hook instead of polling (performance)
- [ ] Caching untuk repeated complaints
- [ ] Analytics dashboard
- [ ] Multi-language support
- [ ] Custom categorization rules
- [ ] Integration dengan hospital systems (HL7, FHIR)

## Support

Untuk issues atau questions:
1. Check logs di terminal
2. Review `TELEGRAM_BOT_SETUP.md` untuk setup issues
3. Test endpoints manually dengan curl
4. Check `.env` configuration

---

**Version**: 1.0.0
**Last Updated**: April 2026
**Author**: AI Development Team
