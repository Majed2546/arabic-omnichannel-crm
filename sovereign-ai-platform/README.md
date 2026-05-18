# Sovereign AI-Native Enterprise Intelligence Platform MVP

Offline-first executive demo focused on:

1. Capability Mining
2. Overlap Detection
3. AI Copilot over Knowledge Graph

The MVP is intentionally scoped. It ingests enterprise source material, mines capabilities with evidence, requires human validation before publishing, detects overlaps, and answers executive questions from local evidence and graph data only.

## Services

- `frontend`: Next.js + React + Tailwind executive UI
- `backend`: Python FastAPI API and orchestration modules
- `postgres`: relational store for documents, validation workflow, entities, findings
- `neo4j`: enterprise knowledge graph
- `vector-db`: Qdrant local vector store
- `ollama`: local LLM runtime for ALLaM, Mistral, Qwen, or other on-prem models

## Quick Start

```bash
cd sovereign-ai-platform
docker compose up --build
```

Then open:

- Frontend: http://localhost:3000
- Backend API docs: http://localhost:8000/docs
- Neo4j Browser: http://localhost:7474
- Qdrant: http://localhost:6333/dashboard
- Ollama: http://localhost:11434

Optional local model pull:

```bash
docker compose exec ollama ollama pull qwen2.5:7b
docker compose exec ollama ollama pull mistral
```

## Local Development

Backend:

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

## Demo Scenario

Seed data models a procurement transformation portfolio:

- Organization units: Procurement Department, Finance Department, IT Department, Vendor Management Office
- Capabilities: Strategic Sourcing, Purchase Requisition Management, Contract Lifecycle Management, Supplier Performance Management
- Systems: ERP Procurement, Supplier Portal, Contract Archive
- Projects: eProcurement Modernization, Vendor Portal Upgrade, Contract Digitization
- Process: Source-to-Pay
- KPIs: Procurement Cycle Time, Contract Compliance Rate

Try these executive questions in the copilot:

- What capabilities are not owned by any department?
- Which systems support procurement capabilities?
- Which projects overlap with each other?
- What is the impact of retiring ERP Procurement?
- Which departments are involved in Contract Lifecycle Management?

## Offline Rules

- No external cloud APIs are required.
- LLM calls target Ollama only.
- Embeddings default to deterministic local hashing for demo readiness. Replace with local embedding models through Qdrant when available.
- Every extracted capability includes evidence before it can be approved.
- Copilot answers cite local documents or graph nodes.

## API Highlights

- `GET /health`
- `GET /api/dashboard/summary`
- `POST /api/documents/upload`
- `GET /api/documents`
- `GET /api/capabilities/extracted`
- `PATCH /api/capabilities/extracted/{id}`
- `POST /api/capabilities/extracted/{id}/approve`
- `POST /api/capabilities/extracted/{id}/reject`
- `POST /api/capabilities/merge`
- `GET /api/capabilities/map`
- `POST /api/overlaps/run`
- `GET /api/overlaps`
- `GET /api/graph`
- `POST /api/copilot/chat`
- `POST /api/seed/reset`

## Repository Structure

```text
sovereign-ai-platform/
  backend/
    app/
      document_ingestion/
      text_extraction/
      capability_extraction/
      overlap_detection/
      graph_builder/
      copilot_rag/
      validation_workflow/
      reporting_api/
  frontend/
    app/
    components/
    lib/
  infra/
    postgres/
    neo4j/
  seed/
  docs/
  docker-compose.yml
```

