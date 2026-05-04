# Ghost Client — Feature Roadmap

This document tracks shipped and pending features. Last updated: 2025-05-04.

## Shipped

### Phase 1 — Developer Utilities
- [x] Timestamp converter (Unix / ISO / local / relative)
- [x] Hash generator (MD5, SHA-1, SHA-256, SHA-512 via Web Crypto + pure-JS MD5)
- [x] UUID generator (v4, batches of 1/5/10)

### Phase 2 — Data Management
- [x] Collection search (real-time filter by name / method)
- [x] Nested collection folders (1 subfolder level, recursive delete)
- [x] Per-collection JSON export/import
- [x] Request notes (add/edit descriptions on saved requests)

### Phase 3 — Request/Response
- [x] Cookie jar visualization (auto-inject Cookie headers from jar)
- [x] HAR import/export (DevTools-compatible HTTP Archive 1.2)
- [x] Response assertions / mini test runner (status, header, body contains, JSON path, response time)
- [x] Request chaining (`{{$chain.response.body.token}}`, `{{$chain.response.header.x-auth}}`)

### Phase 4 — Real-time Protocols
- [x] WebSocket client (connect/send/receive log, clear)
- [x] Server-Sent Events (SSE) client (live event stream)

### Phase 5 — PWA & UX
- [x] PWA support (manifest.json + service worker for offline caching)
- [x] Offline indicator (header dot + toast)
- [x] Download progress bars (ReadableStream with Content-Length tracking)
- [x] Multiple request tabs (persistent in localStorage, close/switch/new)

### Phase 6 — Security
- [x] OAuth2 PKCE helper flow (generate auth URL, exchange code for token)
- [x] Secure note storage (sidebar panel with CRUD)
- [x] Data Vault — AES-256-GCM local encryption (PBKDF2 key derivation, lock/unlock)

## Pending

### Request/Response
- [ ] Response schema validation (JSON Schema)
- [ ] Request/response diff side-by-side
- [ ] Request templates/snippets
- [ ] Bulk operations / batch API calls
- [ ] Mock responses for offline testing

### Developer Experience
- [ ] Custom pre/post request scripts (like Postman)
- [ ] Bandwidth / latency simulation
- [ ] Mini-map for large JSON responses
- [ ] Drag-and-drop reordering in collections
- [ ] Undo/redo for request builder

### Data Management
- [ ] Import/export with nested folder structure
- [ ] Backup/restore all data (one-click)
- [ ] Tagging requests (production, staging, broken)

### Advanced
- [ ] Response interceptors
- [ ] Request replay with variations
- [ ] Conditional requests (If-Match, If-None-Match)

## Implementation Notes

- All features maintain the privacy-first philosophy: no cloud, no account, no telemetry
- Keep bundle size minimal (~30KB target, currently ~35KB gzipped)
- Maintain vanilla JS approach (no frameworks/build tools)
- IndexedDB schema version: 4 (collections, requests, history, environments, cookies, notes, vault)
