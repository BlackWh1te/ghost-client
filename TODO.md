# Ghost Client — Feature Roadmap

This document lists potential features to add to Ghost Client, organized by category and priority.

## Request/Response Features

### High Priority
- [ ] **GraphQL query builder** - Visual editor for GraphQL queries with schema introspection
- [ ] **Request chaining** - Use response data from one request as input for another (e.g., extract token and use in next request)
- [ ] **Response assertions** - Simple test assertions like "status is 200", "response contains key"
- [ ] **Cookie jar visualization** - View and manage cookies for each domain
- [ ] **HAR import/export** - Import HAR files from browser dev tools, export for sharing

### Medium Priority
- [ ] **Request/response diff** - Compare two requests or responses side-by-side
- [ ] **Bulk operations** - Send multiple requests at once (batch API calls)
- [ ] **Response schema validation** - Validate JSON responses against JSON Schema
- [ ] **Mock responses** - Define mock responses for offline testing
- [ ] **Request templates/snippets** - Save and reuse common request patterns

### Low Priority
- [ ] **Syntax highlighting for request bodies** - JSON, XML, GraphQL, YAML
- [ ] **Auto-complete for headers** - Suggest common headers as you type

## Developer Experience

### High Priority
- [ ] **Keyboard shortcuts** - Ctrl+Enter to send, Ctrl+S to save, etc.
- [ ] **Multiple tabs/panels** - Work on multiple requests simultaneously
- [ ] **Split view** - See request and response side-by-side

### Medium Priority
- [ ] **Mini-map for large responses** - Quick navigation through huge JSON
- [ ] **Request duplication** - Clone requests with one click
- [ ] **Drag-and-drop reordering** - Organize collections by dragging
- [ ] **Request notes** - Add descriptions/notes to saved requests

### Low Priority
- [ ] **Undo/redo** - For request builder changes

## Data Management

### High Priority
- [ ] **Import/export collections** - JSON export/import for backup/sharing
- [ ] **Nested collection folders** - Organize collections in subfolders
- [ ] **Collection search** - Search across all collections

### Medium Priority
- [ ] **Tagging requests** - Add tags like "production", "staging", "broken"
- [ ] **Backup/restore all data** - One-click backup of IndexedDB
- [ ] **Environment presets** - Quick switch between dev/staging/prod
- [ ] **Global variables** - Variables available across all environments

## Authentication

### High Priority
- [ ] **OAuth2 flow** - Interactive OAuth2 authorization code flow

### Medium Priority
- [ ] **AWS Signature v4** - Sign requests for AWS APIs
- [ ] **HMAC authentication** - Generic HMAC signing
- [ ] **Digest auth** - RFC 2617 digest authentication

### Low Priority
- [ ] **Token refresh helpers** - Auto-refresh expired tokens
- [ ] **PKCE flow** - For OAuth2 public clients
- [ ] **NTLM authentication** - Windows authentication

## Utilities (New Tools Tab)

### High Priority
- [ ] **Timestamp converter** - Unix timestamp ↔ human-readable
- [ ] **Hash generators** - MD5, SHA-1, SHA-256, SHA-512
- [ ] **UUID generator** - Generate v4 UUIDs

### Medium Priority
- [ ] **JSONPath evaluator** - Query JSON with JSONPath expressions
- [ ] **XPath for XML** - Query XML with XPath
- [ ] **YAML converter** - YAML ↔ JSON
- [ ] **XML to JSON converter** - Convert XML responses to JSON

### Low Priority
- [ ] **Regex tester** - Test regex patterns with sample text
- [ ] **Cron expression parser** - Understand cron schedules
- [ ] **Color palette generator** - Generate color schemes
- [ ] **QR code generator** - Generate QR codes for API keys

## Advanced Features

### High Priority
- [ ] **WebSocket support** - Full WebSocket client with message history
- [ ] **Server-Sent Events (SSE)** - Test SSE endpoints

### Medium Priority
- [ ] **Request interceptors** - Modify requests before sending
- [ ] **Response interceptors** - Process responses after receiving
- [ ] **Custom scripts** - JavaScript pre/post request scripts (like Postman)
- [ ] **Performance profiling** - Measure request timing breakdown
- [ ] **Bandwidth simulation** - Test slow network conditions

### Low Priority
- [ ] **Request replay with variations** - Replay with different parameters
- [ ] **Conditional requests** - Send If-Match, If-None-Match headers
- [ ] **Range requests** - Test partial content requests

## UI/UX

### High Priority
- [ ] **PWA support** - Install as desktop app
- [ ] **Offline indicator** - Show when working offline

### Medium Priority
- [ ] **Request progress bars** - Visual upload/download progress
- [ ] **Toast notifications** - Non-intrusive success/error messages
- [ ] **Custom themes** - User-defined color schemes
- [ ] **Layout presets** - Save preferred panel arrangements

### Low Priority
- [ ] **Compact view** - Denser layout for power users
- [ ] **Font size zoom** - Ctrl+/- to zoom
- [ ] **Status badges** - Visual indicators for request status

## Privacy/Security (On Brand)

### High Priority
- [ ] **Local encryption** - Encrypt IndexedDB with user password
- [ ] **Secure note storage** - Encrypted notes for sensitive data

### Medium Priority
- [ ] **Audit log** - Local log of all actions (no cloud)
- [ ] **Data shredder** - Secure delete when clearing data

### Low Priority
- [ ] **Privacy mode** - Disable history temporarily
- [ ] **Request anonymization** - Strip sensitive headers before logging

---

## Implementation Notes

- All features must maintain the privacy-first philosophy: no cloud, no account, no telemetry
- Consider browser-only limitations for features like WebSocket, file system access
- Keep bundle size minimal (~30KB target)
- Maintain vanilla JS approach (no frameworks/build tools)