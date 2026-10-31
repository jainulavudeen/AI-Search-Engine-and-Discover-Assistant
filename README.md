# 🧠 Hack Guru — AI Smart Search & Discovery Assistant

> Helping college students discover hackathons, internships, competitions, workshops, conferences, scholarships, and more — powered by AI.

---

## 📌 Project Purpose

Hack Guru is an AI-powered opportunity discovery platform for college students. A student types a natural-language query such as:

> *"Find AI hackathons for engineering students in Chennai this month"*

The AI understands **category**, **location**, **date range**, **student type**, **eligibility**, and other filters to surface the most relevant results.

---

## 🛠 Technology Stack

| Layer       | Technology                                                        |
|-------------|-------------------------------------------------------------------|
| Frontend    | Next.js 16, React 19, TypeScript, Tailwind CSS                    |
| Backend     | Node.js, Express.js, TypeScript                                   |
| Database    | PostgreSQL + Prisma ORM                                           |
| AI / DL     | Gemini (query understanding) + local transformer models via transformers.js (ONNX Runtime) |

---

## 🧠 Deep Learning Search Pipeline

Search runs in stages, and every deep learning model runs **locally inside the backend** (no API key, no per-query cost):

```
"coding contests for AI beginners"
        ↓
1. Query understanding — Gemini → structured intent (category, city, dates…)
   (rule-based fallback if Gemini is unavailable)
        ↓
2. Hybrid retrieval
   • Keyword search   — Postgres text match on intent terms
   • Semantic search  — all-MiniLM-L6-v2 bi-encoder (Sentence-BERT, 384-d),
                        cosine similarity vs precomputed opportunity embeddings
   → union, scored 60% semantic + 40% keyword
        ↓
3. Re-ranking — ms-marco-MiniLM-L-6-v2 cross-encoder reads query + opportunity
   together; blended 50/50 with the stage-2 score
        ↓
4. Personalization — 70% search score + 30% student-profile match (logged-in users)
```

| Technique | Model | Where |
|-----------|-------|-------|
| Sentence embeddings (contrastive-trained transformer) | `Xenova/all-MiniLM-L6-v2` | `backend/src/services/embeddingService.ts` |
| Cross-encoder re-ranking (cross-attention relevance) | `Xenova/ms-marco-MiniLM-L-6-v2` | `backend/src/services/rerankerService.ts` |
| Hybrid retrieval + score fusion | — | `backend/src/services/aiSearchService.ts` |

- Model weights (~100 MB total) download once on first run into `backend/.model-cache/` (gitignored).
- Opportunity embeddings are stored in `Opportunity.embedding` and kept up to date automatically on server start, after a Brabble sync, and after admin edits. `npm run db:embed` runs a manual backfill.
- If a model can't load, search degrades gracefully (keyword-only / first-stage ranking) instead of failing.

---

## 📁 Project Structure

```
Hack-Guru/
├── frontend/          # Next.js App Router frontend
│   ├── app/           # Pages and layouts
│   ├── components/    # Reusable UI components
│   ├── lib/           # API clients and utilities
│   ├── types/         # Shared TypeScript types
│   └── public/        # Static assets
│
└── backend/           # Express.js REST API
    ├── src/
    │   ├── controllers/   # Route handler functions
    │   ├── routes/        # Express route definitions
    │   ├── services/      # Business logic, AI search, embeddings, reranker
    │   ├── middleware/    # Custom middleware
    │   └── types/         # Shared TypeScript types
    ├── prisma/            # Prisma schema, migrations, seed
    └── scripts/           # Admin, data, and embedding scripts
```

---

## ⚙️ Installation

### Prerequisites

- Node.js ≥ 18
- npm ≥ 9
- PostgreSQL 14+

### 1. Clone and navigate

```bash
git clone https://github.com/jainulavudeen/AI-Search-Engine-and-Discover-Assistant.git
cd AI-Search-Engine-and-Discover-Assistant
```

### 2. Create the database

```bash
brew install postgresql@14        # macOS; use your OS package manager otherwise
brew services start postgresql@14
createdb hack_guru_db
```

### 3. Backend setup

```bash
cd backend
npm install
cp .env.example .env              # fill in DATABASE_URL, JWT_SECRET, GEMINI_API_KEY
npx prisma migrate deploy         # create tables
npm run db:seed                   # sample opportunities
npm run db:embed                  # build embeddings (downloads models once)
```

### 4. Frontend setup

```bash
cd ../frontend
npm install
cp .env.example .env.local        # NEXT_PUBLIC_API_URL=http://localhost:4000
```

---

## 🚀 Running the Application

Open two terminals:

```bash
# Terminal 1 — backend on http://localhost:4000
cd backend
npm run dev
```

```bash
# Terminal 2 — frontend on http://localhost:3000
cd frontend
npm run dev
```

Then open **http://localhost:3000**. Health check: `GET http://localhost:4000/api/health`

---

## 🔐 Environment Variables

### Backend (`backend/.env`)

| Variable            | Description                                   | Default                   |
|---------------------|-----------------------------------------------|---------------------------|
| `PORT`              | Port the Express server listens on            | `4000`                    |
| `NODE_ENV`          | Environment mode                              | `development`             |
| `FRONTEND_URL`      | Allowed CORS origin                           | `http://localhost:3000`   |
| `DATABASE_URL`      | PostgreSQL connection string                  | —                         |
| `JWT_SECRET`        | Secret for signing auth tokens                | —                         |
| `GEMINI_API_KEY`    | Gemini key for query understanding (optional) | —                         |
| `GEMINI_MODEL`      | Gemini model name (optional)                  | `gemini-3.5-flash-lite`   |
| `BRABBLE_API_KEY`   | External event data (optional)                | —                         |
| `ADMIN_SYNC_SECRET` | Protects the admin sync endpoint              | —                         |

### Frontend (`frontend/.env.local`)

| Variable               | Description                          | Default                   |
|------------------------|--------------------------------------|---------------------------|
| `NEXT_PUBLIC_API_URL`  | Backend API base URL                 | `http://localhost:4000`   |
| `ADMIN_SYNC_SECRET`    | Same as backend, server-side only    | —                         |

---

*Built for hackathon prototyping — 2026*

---

## 🌐 External Opportunity Data

CampusFind AI can ingest external student opportunity data from [Brabble AI](https://brabble.ai) — a hackathon and competition aggregator with a free API tier.

### How it works

```
Brabble API (https://brabble.ai/api/listings)
        ↓
backend/src/services/eventApiClient.ts   — HTTP client, auth, pagination
        ↓
backend/src/services/eventIngestionService.ts  — normalize, validate, deduplicate
        ↓
PostgreSQL (Opportunity table, source='brabble')
        ↓
Existing LLM search + /discover  — externally imported events work identically
```

### Required environment variables

Add to **`backend/.env`**:
```env
BRABBLE_API_KEY=brbl_your_key_here          # Get free key: brabble.ai/dashboard
BRABBLE_API_BASE_URL=https://brabble.ai/api
EVENT_API_MAX_PAGES=5                        # Pages per sync (50 events each)
EVENT_API_PAGE_SIZE=50
ADMIN_SYNC_SECRET=your_strong_secret_here   # Protects the sync endpoint
```

Add to **`frontend/.env.local`**:
```env
ADMIN_SYNC_SECRET=your_strong_secret_here   # Same secret, server-side only
```

> ⚠️ **Security**: `BRABBLE_API_KEY` and `ADMIN_SYNC_SECRET` live **only** in server-side env files. They are never sent to the browser or exposed as `NEXT_PUBLIC_` variables.

### Synchronization

**Manual sync via Admin UI:**
1. Navigate to `/admin/events` in the app
2. Click "Sync Opportunities"

**Manual sync via API (curl):**
```bash
curl -X POST http://localhost:4000/api/admin/events/sync \
  -H "x-admin-secret: your_strong_secret_here"
```

**Response:**
```json
{
  "success": true,
  "fetched": 120,
  "created": 35,
  "updated": 70,
  "skipped": 15,
  "errors": 0,
  "lastSyncAt": "2026-09-01T22:00:00.000Z"
}
```

### Deduplication

- Primary: `source` + `sourceId` (unique DB constraint)
- Fallback: normalized title + organizer slug (when external API has no ID)
- Running sync multiple times is safe — existing records are updated, not duplicated

### Category normalization

External categories are mapped to the app's schema:
- `"hackathon"`, `"AI hackathon"`, `"tech hackathon"` → `HACKATHON`
- `"competition"`, `"challenge"`, `"contest"` → `COMPETITION`
- `"workshop"`, `"bootcamp"`, `"webinar"` → `WORKSHOP`
- `"internship"`, `"fellowship"` → `INTERNSHIP`
- etc.

### Integration with LLM search

After import, externally sourced events work identically to hand-curated data:
```
User: "Find AI hackathons for engineering students in Chennai this month"
LLM: { category: "Hackathon", location: "Chennai", timeRange: "this_month" }
Backend: searches ALL opportunities (manual + Brabble) in PostgreSQL
```

