# JurisAI — Phase 1 & 2

JurisAI is an AI-powered legal document intelligence and learning platform.

- **Phase 1** — Upload, extract text, chunk, embed, and index in ChromaDB.
- **Phase 2** — Summarize documents, extract key entities (NER), detect clauses, and generate plain-language explanations.

## Architecture

- **frontend/** — React (Vite), Tailwind CSS, Axios, React Router
- **backend/** — Node.js + Express + MongoDB (Mongoose), JWT auth, Multer uploads
- **ai-service/** — FastAPI + LangChain + ChromaDB + Transformers + spaCy

### End-to-end flow

**Phase 1 (ingestion)**

1. User signs up or logs in (JWT).
2. User uploads a document (PDF, DOCX, TXT, or image).
3. Backend saves the file and creates a MongoDB `Document` row.
4. Backend forwards the file to `POST /process-document`.
5. AI service extracts text, chunks it (500 words / 50 overlap), embeds with `all-MiniLM-L6-v2`, stores in ChromaDB.
6. Backend updates MongoDB with `extractedText`, `chunkCount`, and `processingStatus`.

**Phase 2 (analysis)**

1. User opens a document from the dashboard and clicks **Analyze document**.
2. Backend loads `extractedText` and calls `POST /analyze-document`.
3. AI service returns summary, entities, clauses, and simplified text.
4. Backend persists results and the UI shows structured insights.

## Prerequisites

- **Node.js 18+**
- **MongoDB** running locally (or a connection string)
- **Python 3.11 or 3.12** (recommended). **Python 3.14+** may fail to install wheels for native dependencies.
- **Tesseract OCR** (for scanned pages)

### Install Tesseract

- **macOS (Homebrew):** `brew install tesseract`
- **Ubuntu/Debian:** `sudo apt-get install tesseract-ocr`

### Phase 2 — spaCy model

After installing Python dependencies:

```bash
cd ai-service
source .venv/bin/activate
python -m spacy download en_core_web_sm
```

The first analysis run also downloads the HuggingFace summarization model (see `SUMMARIZER_MODEL` in `.env`).

## Environment variables

| Variable | App | Purpose |
|----------|-----|---------|
| `MONGODB_URI` | backend | MongoDB connection |
| `JWT_SECRET` | backend | JWT signing |
| `PORT` | backend | API port (use 5001 on macOS if 5000 is taken) |
| `AI_SERVICE_URL` | backend | FastAPI base URL |
| `FRONTEND_URL` | backend | CORS |
| `VITE_BACKEND_ORIGIN` | frontend | Vite proxy target |
| `CHROMA_PERSIST_DIR` | ai-service | Chroma persistence |
| `SUMMARIZER_MODEL` | ai-service | HuggingFace summarizer model id |
| `TESSERACT_CMD` | ai-service | Optional OCR binary path |

Copy `backend/.env.example`, `frontend/.env.example`, and `ai-service/.env.example` to `.env` in each app.

## Installation

### 1) MongoDB

Ensure MongoDB is reachable at your `MONGODB_URI`.

### 2) Backend

```bash
cd backend
cp .env.example .env
npm install
npm start
```

### 3) AI service

```bash
cd ai-service
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python -m spacy download en_core_web_sm
cp .env.example .env
uvicorn app:app --reload --host 0.0.0.0 --port 8000
```

### 4) Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

## Run commands (summary)

| App | Command |
|-----|---------|
| Frontend | `npm run dev` |
| Backend | `npm start` |
| AI service | `uvicorn app:app --reload` (from `ai-service/`) |

## API reference

### Auth

- `POST /api/auth/register` — `{ name, email, password }`
- `POST /api/auth/login` — `{ email, password }`

### Documents (requires `Authorization: Bearer <token>`)

- `POST /api/documents/upload` — multipart field: `file`
- `GET /api/documents` — optional `?q=` search
- `GET /api/documents/:id`
- `POST /api/documents/analyze/:id` — body: `{ "explanationMode": "normal" | "beginner" }`
- `DELETE /api/documents/:id`

### AI service

- `POST /process-document` — Phase 1 ingest
- `POST /analyze-document` — Phase 2 analysis (JSON: `document_id`, `extracted_text`, `explanation_mode`)
- `POST /purge-document` — remove vectors on delete
- `GET /health`

## Project structure

```
jurisai/
├── frontend/
│   └── src/pages/DocumentDetailPage.jsx   # Phase 2 insights UI
├── backend/
│   ├── models/Document.js                   # + summary, entities, clauses, …
│   └── services/aiService.js
└── ai-service/
    └── services/
        ├── summarizer.py
        ├── ner.py
        ├── clause_detector.py
        ├── simplifier.py
        └── analyzer.py
```

## Phase 2 features

| Feature | Implementation |
|---------|----------------|
| Summarization | HuggingFace `transformers` (default: `distilbart-cnn-12-6`) |
| NER / key details | spaCy + regex fallbacks (owner, tenant, rent, deposit, duration, address) |
| Clause detection | Paragraph split + keyword classification |
| Plain language | Rule-based legal term replacement + optional summarizer |
| Dashboard | Analysis status, link to document insights |
| UI extras | Clause importance colors, simple/legal toggle, entity highlight, download summary |

## Troubleshooting

- **Upload succeeds but status is `failed`:** confirm the AI service is running and `AI_SERVICE_URL` matches.
- **Analysis fails / 502:** install Phase 2 Python deps, download spaCy model, ensure enough RAM for the summarizer (first run downloads model weights).
- **Empty entities:** regex patterns work best on rental/lease-style documents; spaCy augments person/date/money/location when available.
- **Port 5000 in use (macOS):** set `PORT=5001` in `backend/.env` and `VITE_BACKEND_ORIGIN=http://127.0.0.1:5001` in `frontend/.env`.

## Security note

This stack is optimized for **local development**. Before public deployment, harden secrets, add rate limiting, scan uploads, tighten CORS, and use managed object storage.
