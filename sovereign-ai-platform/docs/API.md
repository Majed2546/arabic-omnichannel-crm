# API Documentation

The OpenAPI document is exposed at `/docs` by FastAPI.

## Capability Mining

- `POST /api/documents/upload`
  - Multipart field: `file`
  - Supports `.pdf`, `.docx`, `.xlsx`, `.txt`
  - Extracts text, mines candidate capabilities, and stores them as pending validation items.
- `GET /api/capabilities/extracted`
  - Lists pending, approved, and rejected extracted capabilities.
- `PATCH /api/capabilities/extracted/{id}`
  - Edits candidate name, domain, area, capability, sub-capability.
- `POST /api/capabilities/extracted/{id}/approve`
  - Publishes a capability and its evidence to the database and graph.
- `POST /api/capabilities/extracted/{id}/reject`
  - Rejects a candidate.
- `POST /api/capabilities/merge`
  - Merges multiple candidates into one standardized capability name.

## Overlap Detection

- `POST /api/overlaps/run`
  - Rebuilds demo overlap findings.
- `GET /api/overlaps`
  - Returns overlap type, score, explanation, recommendation, and evidence.

## Knowledge Graph And Copilot

- `GET /api/graph`
  - Returns nodes, relationships, and evidence.
- `POST /api/copilot/chat`
  - Body: `{ "question": "Which systems support procurement capabilities?" }`
  - Returns direct answer, supporting evidence, related graph entities, confidence score, and follow-up questions.

## Reporting

- `GET /api/dashboard/summary`
- `POST /api/seed/reset`

