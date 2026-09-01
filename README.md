# 🧠 Hack Guru — AI Smart Search & Discovery Assistant

> Helping college students discover hackathons, internships, competitions, workshops, conferences, scholarships, and more — powered by AI.

---

## 📌 Project Purpose

Hack Guru is an AI-powered opportunity discovery platform for college students. A student types a natural-language query such as:

> *"Find AI hackathons for engineering students in Chennai this month"*

The AI understands **category**, **location**, **date range**, **student type**, **eligibility**, and other filters to surface the most relevant results.

---

## 🛠 Technology Stack

| Layer       | Technology                              |
|-------------|-----------------------------------------|
| Frontend    | Next.js 15, TypeScript, Tailwind CSS    |
| Backend     | Node.js, Express.js, TypeScript         |
| Database    | PostgreSQL + Prisma ORM *(Phase 2+)*    |
| AI          | To be integrated in a later phase       |

---

## 📁 Project Structure

```
Hack-Guru/
├── frontend/          # Next.js App Router frontend
│   ├── app/           # Pages and layouts
│   ├── components/    # Reusable UI components (Phase 2+)
│   ├── lib/           # API clients and utilities
│   ├── types/         # Shared TypeScript types
│   └── public/        # Static assets
│
└── backend/           # Express.js REST API
    ├── src/
    │   ├── controllers/   # Route handler functions
    │   ├── routes/        # Express route definitions
    │   ├── services/      # Business logic (Phase 2+)
    │   ├── middleware/     # Custom middleware
    │   └── types/         # Shared TypeScript types
    └── prisma/            # Prisma schema (Phase 2+)
```

---

## ⚙️ Installation

### Prerequisites

- Node.js ≥ 18
- npm ≥ 9

### 1. Clone and navigate

```bash
git clone <repo-url>
cd Hack-Guru
```

### 2. Install frontend dependencies

```bash
cd frontend
npm install
```

### 3. Install backend dependencies

```bash
cd ../backend
npm install
```

---

## 🚀 Running the Application

### Start the Backend

```bash
cd backend
cp .env.example .env   # already done if you cloned the repo
npm run dev
```

The backend will start at **http://localhost:4000**

Health check: `GET http://localhost:4000/api/health`

### Start the Frontend

Open a **new terminal tab**:

```bash
cd frontend
npm run dev
```

The frontend will start at **http://localhost:3000**

---

## 🏥 API Endpoints (Phase 1)

| Method | Path          | Description              |
|--------|---------------|--------------------------|
| GET    | `/api/health` | Returns backend status   |

Example response:
```json
{
  "status": "ok",
  "service": "AI Smart Search Backend",
  "version": "1.0.0",
  "environment": "development"
}
```

---

## 🗄️ PostgreSQL — Future Integration

In **Phase 2**, PostgreSQL will be connected via Prisma ORM.

Steps that will be performed:
1. Install Prisma: `npm install @prisma/client prisma`
2. Set `DATABASE_URL` in `backend/.env`
3. Define models in `backend/prisma/schema.prisma`
4. Run `npx prisma migrate dev` to apply migrations
5. Use `PrismaClient` in service layer

The `backend/prisma/schema.prisma` file currently contains a commented-out template ready for activation.

---

## 🔐 Environment Variables

### Backend (`backend/.env`)

| Variable       | Description                        | Default                   |
|----------------|------------------------------------|---------------------------|
| `PORT`         | Port the Express server listens on | `4000`                    |
| `NODE_ENV`     | Environment mode                   | `development`             |
| `FRONTEND_URL` | Allowed CORS origin                | `http://localhost:3000`   |
| `DATABASE_URL` | PostgreSQL connection string        | *(Phase 2)*               |

### Frontend (`frontend/.env.local`)

| Variable               | Description              | Default                   |
|------------------------|--------------------------|---------------------------|
| `NEXT_PUBLIC_API_URL`  | Backend API base URL     | `http://localhost:4000`   |

---

## 🗺️ Roadmap

- [x] Phase 1 — Foundation & Backend Connection
- [ ] Phase 2 — Database Schema & Seed Data
- [ ] Phase 3 — Search UI & Filters
- [ ] Phase 4 — AI Query Understanding
- [ ] Phase 5 — Authentication & User Profiles
- [ ] Phase 6 — Production Deployment

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

