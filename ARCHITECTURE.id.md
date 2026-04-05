# Dokumentasi Arsitektur Teknis - Sistem Manajemen Keluhan Rumah Sakit

## 🏗️ Overview Arsitektur

Sistem ini menggunakan arsitektur **Client-Server** dengan separasi yang jelas antara:
1. **Client Layer** - React Components (Next.js)
2. **API Layer** - Next.js Route Handlers
3. **Data Layer** - JSON-based File Storage

```
┌─────────────────────────────────────────┐
│         User Interface Layer             │
│  (complaint-form + admin-dashboard)      │
└──────────────────┬──────────────────────┘
                   │ API Calls (fetch)
┌──────────────────▼──────────────────────┐
│         API Layer (Next.js Routes)       │
│  POST /api/complaints                   │
│  GET /api/complaints                    │
│  GET /api/metrics                       │
└──────────────────┬──────────────────────┘
                   │ Read/Write Operations
┌──────────────────▼──────────────────────┐
│      Data Layer (.data/db.json)         │
│  - Complaints Collection                │
│  - Clusters Collection                  │
│  - Metadata                             │
└─────────────────────────────────────────┘
```

## 📦 Module Breakdown

### 1. **Localization Module** (`lib/i18n.ts`)
Centralized translation system untuk semua string UI.

**Keuntungan:**
- Single source of truth untuk semua teks
- Mudah untuk scale ke multiple languages
- Type-safe translations dengan TypeScript

**Usage:**
```typescript
import { translations } from '@/lib/i18n';
console.log(translations.form.title); // "Sistem Manajemen Keluhan Rumah Sakit"
```

### 2. **Database Manager** (`lib/db.ts`)
Handles semua operasi database dengan abstraction layer.

**Class: DatabaseManager**
- `addComplaint()` - Create new complaint
- `getComplaints()` - Fetch all complaints (sorted by date DESC)
- `getComplaintById()` - Fetch specific complaint
- `updateComplaint()` - Update complaint data
- `addCluster()` - Create new cluster
- `getClusters()` - Fetch all clusters
- `updateCluster()` - Update cluster info
- `generateTicketNumber()` - Generate unique ticket

**Features:**
- Automatic file creation jika tidak ada
- Proper error handling dan logging
- UUID generation untuk IDs
- Date serialization/deserialization

**Validation:**
- Zod schemas untuk type safety
- Automatic schema validation on read
- Type inference dari schemas

### 3. **API Routes**

#### `/api/complaints` (POST & GET)
**POST Workflow:**
1. Validate input dengan Zod
2. Generate ticket number
3. Create complaint dengan default values
4. Trigger async AI clustering process
5. Return success response dengan ticket info

**GET Workflow:**
1. Read all complaints dari database
2. Sort by createdAt (descending)
3. Return formatted response

**AI Clustering Process:**
1. Extract keywords dari complaint text
2. Search existing clusters untuk match
3. Calculate priority score: `base + (volume × 0.5)`
4. Update cluster volume dan complaint
5. Create new cluster jika needed

```typescript
// POST /api/complaints
{
  "patientName": "Budi Santoso",
  "department": "igd",
  "complaintText": "Waktu tunggu sangat lama, lebih dari 3 jam...",
  "insuranceProvider": "bpjs"
}
// Response
{
  "success": true,
  "ticket": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "ticketNumber": "TKT-ABC-123456"
  }
}
```

#### `/api/metrics` (GET)
**Calculation Logic:**
1. Get all complaints
2. Calculate aggregate metrics:
   - Total complaints count
   - Average priority score
   - Pending review count
3. Count distribution per insurance
4. Generate trend data untuk 7 hari terakhir

**Trend Data Generation:**
- Iterate last 7 days
- Count complaints per day
- Format untuk chart display

```typescript
// Response
{
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
```

### 4. **React Components**

#### `components/complaint-form.tsx`
**Features:**
- Form state management dengan react-hook-form
- Real-time validation dengan Zod
- Department selection (9 options)
- Insurance provider selection (6 options)
- Error handling dengan toast notifications
- Success modal dengan ticket number

**State Management:**
- `form` - Form state dan validation
- `isSubmitting` - Loading state
- `showSuccess` - Success dialog visibility
- `ticketNumber` - Displayed ticket number

**Error Handling:**
- Validation errors di setiap field
- API error handling dengan fallback
- Toast notifications untuk user feedback

#### `components/admin-dashboard.tsx`
**Features:**
- Real-time metrics display (4 cards)
- Line chart untuk trend 7 hari
- Pie chart untuk insurance distribution
- Table dengan latest complaints (top 10)
- Detail modal untuk setiap complaint
- Auto-refresh setiap 30 detik

**Data Fetching:**
```typescript
// Parallel fetching
const [metricsRes, complaintsRes] = await Promise.all([
  fetch('/api/metrics'),
  fetch('/api/complaints'),
]);
```

**Visualization:**
- Recharts untuk charts
- Responsive grid layout (1-4 columns)
- Color coding untuk priority levels
- Empty states dengan appropriate message

## 🔄 Data Flow

### Submit Complaint Flow
```
User Form
    ↓
Validation (Zod)
    ↓
POST /api/complaints
    ↓
Add to Database
    ↓
Generate Ticket
    ↓
Trigger AI Clustering (async)
    ↓
Return Response + Ticket
    ↓
Show Success Modal
```

### AI Clustering Flow
```
Extract Keywords from Text
    ↓
Search Existing Clusters
    ↓
Match Found?
    ├─ Yes → Update Cluster Volume
    │          Calculate Priority
    │          Update Complaint
    │
    └─ No → Create New Cluster
             Link Complaint
             Calculate Priority
             Update Complaint
```

### Dashboard Update Flow
```
User Opens /admin
    ↓
Parallel API Calls:
├─ GET /api/metrics
└─ GET /api/complaints
    ↓
Process Response Data:
├─ Transform dates
├─ Calculate priority colors
└─ Format table data
    ↓
Render Dashboard
    ↓
Setup 30s Interval for Auto-refresh
```

## 🔐 Error Handling Strategy

### API Layer Error Handling
```typescript
try {
  // Validate input
  const validatedData = SubmitComplaintSchema.parse(body);
  // Process
  // Return success (201)
} catch (error) {
  if (error instanceof z.ZodError) {
    // Validation error (400)
    return { error: "Invalid input", details: error.errors }
  }
  // Server error (500)
  return { error: "Server error" }
}
```

### Client Layer Error Handling
```typescript
try {
  const response = await fetch('/api/complaints', {
    method: 'POST',
    body: JSON.stringify(values)
  });
  const data = await response.json();
  if (data.success) {
    // Show success
  } else {
    // Show error toast
  }
} catch (error) {
  // Network error handling
  toast.error(translations.form.errorMessage);
}
```

### Database Layer Error Handling
```typescript
private read(): Database {
  try {
    const content = readFileSync(this.dbPath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.error('[DB] Error reading:', error);
    return { complaints: [], clusters: [], lastUpdated: new Date() };
  }
}
```

## 🎯 Algoritma Priority Scoring

### Formula
```
priorityScore = baseUrgencyScore + (clusterVolume × 0.5)
```

### Implementasi
```typescript
const baseUrgency = complaint.urgencyScore; // Default: 50
const clusterVolume = matchedCluster.relatedComplaintIds.length + 1;
const priorityScore = baseUrgency + (clusterVolume * 0.5);
```

### Contoh Skenario

**Skenario 1: Single Complaint (Baru)**
- Base Urgency: 50
- Cluster Volume: 1 (baru)
- Priority Score: 50 + (1 × 0.5) = 50.5 (Sedang)

**Skenario 2: Matching Cluster dengan 10 Complaints**
- Base Urgency: 50
- Cluster Volume: 11 (existing 10 + 1 new)
- Priority Score: 50 + (11 × 0.5) = 55.5 (Tinggi)

**Skenario 3: Multiple Matching Clusters**
- Base Urgency: 50
- Cluster Volume: 20 (matching cluster)
- Priority Score: 50 + (20 × 0.5) = 60 (Tinggi)

## 📊 Keyword Extraction

### Simple NLP Approach
```typescript
function extractKeywords(text: string): string[] {
  // 1. Normalize to lowercase
  // 2. Split by whitespace
  // 3. Filter words < 3 chars
  // 4. Remove common Indonesian stop words
  // 5. Return unique top 3 keywords
}
```

**Stop Words yang difilter:**
"yang", "dan", "atau", "di", "ke", "dari", "dengan", "untuk", "adalah", dll.

**Contoh:**
```
Input: "Waktu tunggu sangat lama untuk pemeriksaan dokter"
Output: ["waktu", "tunggu", "lama"]
```

## 🔄 State Persistence

### Database Write Strategy
- **On Every Write**: Data immediately persisted ke `.data/db.json`
- **File Format**: Pretty-printed JSON untuk readability
- **Atomic Operations**: Each write replaces entire file
- **Recovery**: Default empty state jika file corrupted

### Database Read Strategy
- **On Demand**: Fetch dari disk setiap kali diperlukan
- **Caching**: Component-level caching dengan React state
- **Auto-refresh**: Dashboard refresh setiap 30 detik

## 🚀 Performance Considerations

### Optimization Techniques
1. **Parallel API Calls**: Dashboard fetches metrics + complaints simultaneously
2. **Debounced Auto-refresh**: 30-second interval prevents excessive fetches
3. **Async Clustering**: AI processing doesn't block form submission
4. **Virtual Scrolling**: Table hanya render visible rows (future enhancement)
5. **Memoization**: Components wrapped dengan React.memo (future enhancement)

### Scalability Notes
- Current file-based DB suitable untuk < 10,000 complaints
- For larger scale, migrate ke proper database (PostgreSQL, MongoDB)
- Implement pagination untuk large datasets
- Add caching layer (Redis) untuk metrics

## 📈 Monitoring & Logging

### Logging Strategy
- **Console Logs**: Development debugging
- **Error Logs**: All exceptions logged dengan context
- **API Logs**: Request/response tracking
- **DB Logs**: Read/write operations

**Example:**
```typescript
console.error('[API] Error submitting complaint:', error);
console.log(`[AI] Complaint ${ticketNumber} clustered successfully`);
```

### Monitoring Recommendations
- Track API response times
- Monitor database file size
- Alert on error rates
- Dashboard uptime monitoring

## 🔄 Future Enhancement Opportunities

1. **Authentication**: Add user auth untuk admin dashboard
2. **Real Database**: Migrate ke PostgreSQL/MongoDB
3. **Advanced NLP**: Integrate real NLP service (e.g., GPT-4)
4. **Real-time Updates**: WebSocket untuk live dashboard
5. **Notifications**: Email/SMS alerts untuk high-priority complaints
6. **Analytics**: Advanced reporting dan insights
7. **Multi-language**: Support multiple languages
8. **Export**: PDF/Excel export untuk reports
9. **Bulk Operations**: Batch update complaints
10. **Advanced Filtering**: Complex query builder

---

**Last Updated**: April 2026
**Architecture Version**: 1.0.0
