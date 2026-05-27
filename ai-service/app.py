"""
JurisAI FastAPI entrypoint.

Run locally:
  uvicorn app:app --reload --host 0.0.0.0 --port 8000
"""

from __future__ import annotations

import os
import tempfile
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from services.analyzer import analyze_document_text
from services.chunking import chunk_text
from services.extraction import extract_text
from services.rag_pipeline import run_rag_chat
from services.rag_settings import get_rag_top_k
from services.vector_store import purge_document, upsert_chunks

load_dotenv()

app = FastAPI(title="JurisAI AI Service", version="3.0.0")

# Allow the Node backend to call this service from local dev.
_origins = os.getenv("CORS_ORIGINS", "http://localhost:5000,http://127.0.0.1:5000")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in _origins.split(",") if o.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class PurgeRequest(BaseModel):
    document_id: str = Field(..., min_length=1)


class AnalyzeRequest(BaseModel):
    document_id: str = Field(..., min_length=1)
    extracted_text: str = Field(..., min_length=1)
    explanation_mode: str = Field(default="normal", pattern="^(normal|beginner)$")


class ChatMessage(BaseModel):
    role: str = Field(..., pattern="^(user|ai)$")
    content: str = Field(..., min_length=1)


class ChatRequest(BaseModel):
    user_id: str = Field(..., min_length=1)
    document_id: str = Field(..., min_length=1)
    query: str = Field(..., min_length=1)
    chat_history: list[ChatMessage] = Field(default_factory=list)
    document_summary: str = Field(default="")
    entities: dict = Field(default_factory=dict)
    top_k: int = Field(default_factory=get_rag_top_k, ge=1, le=10)


@app.get("/health")
def health():
    return {"ok": True, "service": "jurisai-ai", "phase": 3}


@app.post("/chat")
def chat_endpoint(body: ChatRequest):
    """
    Phase 3: RAG chat — retrieve chunks from ChromaDB and generate an answer.
    """
    try:
        history = [{"role": m.role, "content": m.content} for m in body.chat_history]
        result = run_rag_chat(
            user_id=body.user_id,
            document_id=body.document_id,
            query=body.query,
            top_k=body.top_k,
            chat_history=history,
            document_summary=body.document_summary,
            entities=body.entities or None,
        )
        return {
            "answer": result["answer"],
            "sources": result["sources"],
        }
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.post("/analyze-document")
def analyze_document_endpoint(body: AnalyzeRequest):
    """
    Phase 2: summarize, extract entities, detect clauses, simplify language.
    Node passes extracted_text from MongoDB (Phase 1 ingestion).
    """
    try:
        result = analyze_document_text(
            body.extracted_text,
            explanation_mode=body.explanation_mode,
        )
        return {
            "document_id": body.document_id,
            "summary": result["summary"],
            "short_summary": result["short_summary"],
            "entities": result["entities"],
            "clauses": result["clauses"],
            "simplified_text": result["simplified_text"],
            "risks": result.get("risks", []),
            "analysis_status": "completed",
        }
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.post("/purge-document")
def purge_document_endpoint(body: PurgeRequest):
    """
    Remove vectors for a document.

    Called by the Node API when a user deletes an upload.
    """
    try:
        purge_document(body.document_id)
        return {"ok": True}
    except Exception as exc:  # noqa: BLE001 — surface useful message for operators
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.post("/process-document")
async def process_document(
    user_id: str = Form(...),
    document_id: str = Form(...),
    filename: str = Form(...),
    file: UploadFile = File(...),
):
    """
    Full pipeline:
    1) persist upload to a temp path
    2) extract text
    3) chunk text (500 words / 50 overlap)
    4) embed + store in ChromaDB
    5) return metadata to Node (including extracted text for Mongo)
    """
    suffix = Path(filename).suffix.lower() or ""
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
    tmp_path = Path(tmp.name)
    tmp.close()

    try:
        contents = await file.read()
        tmp_path.write_bytes(contents)

        extracted = extract_text(tmp_path)
        chunks = chunk_text(extracted, chunk_size=600, chunk_overlap=100)

        stored = upsert_chunks(
            user_id=user_id,
            document_id=document_id,
            filename=filename,
            chunks=chunks,
        )

        return {
            "chunk_count": stored,
            "processing_status": "completed",
            "extracted_text": extracted,
        }
    except HTTPException:
        raise
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    finally:
        try:
            if tmp_path.exists():
                tmp_path.unlink()
        except Exception:
            pass
