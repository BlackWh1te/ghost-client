```
                     .-.
                    ("  )
                     /|
                    / |
                   /  |
              .-""-/   \-.         G H O S T   C L I E N T
             /        oo  \\        a privacy-first api client
            |    ___      o |       that lives in your browser
            |   /   \      | |
             \  | o |     / /
              '-.___/.---' /
                   |     |_
                   |     __)         no telemetry. no cloud. no account.
                   |       \
                   |        |
                   |_________|

```

<p align="center">
  <a href="https://ghost-client-mocha.vercel.app"><strong>try it live →</strong></a>
</p>
https://github.com/BlackWh1te/ghost-client
---

Most API clients treat your data like a product.

They sync your collections to their cloud. They phone home with telemetry. They lock basic features behind a login wall. They own your workspace even though *you* built it.

**Ghost Client doesn't.**

It runs entirely in your browser. Your API keys stay on your machine. Your collections live in your IndexedDB. There is no server, no database, no analytics beacon, no "we've updated our privacy policy" email.

Zero dependencies. Zero backends. Zero trust required.

---

## the fight card

| | Postman / Insomnia | Ghost Client |
|:---|:---|:---|
| Cloud required | yes | **never** |
| Telemetry | yes | **zero packets** |
| Works offline | no | **always** |
| Open source | no | **MIT** |
| Free forever | partially | **completely** |
| Bundle size | ~200MB installer | **~30KB** |
| Account needed | yes | **no** |

---

## what it does

```
┌─ REQUEST BUILDER ───────────────────────────────┐
│ GET ▼  https://api.github.com/users/BlackWh1te │
│                                                  │
│ [Params] [Headers] [Body] [Auth]                 │
│                                                  │
│ Authorization: Bearer {{github_token}}           │
│                                                  │
│              [  S E N D  ]                       │
└──────────────────────────────────────────────────┘
```

**7 HTTP methods.** GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS. Each one gets a color so you can scan your history at a glance.

**Collapsible JSON tree.** Not pretty-printed text. A real tree you can expand and collapse, with syntax highlighting that makes strings green, numbers red, and keys blue. Search results highlight right in the tree.

**Environment variables.** Write `{{baseUrl}}` or `{{apiKey}}` anywhere. Switch environments and every request updates instantly. No find-and-replace.

**Collections.** Save requests into named folders. Duplicate, rename, or delete individual requests. Never lose that carefully crafted GraphQL mutation again.

**History.** Every request you send is logged. One click replays it exactly. Filter by method, URL, or status code. Last 100 only — this isn't a surveillance tool.

**Auth that actually helps.** Bearer token, Basic auth, API key (header or query param). No digging through docs to remember the header format.

**Settings that stay set.** 25+ configurable options: theme (light/dark/system), font size, sidebar width, JSON indent, history retention, timeout defaults, body type, auth type, auto-save, sound notifications, word wrap, line numbers, and more. All persist to localStorage.

**Keyboard shortcuts.** Ctrl+Enter to send, Ctrl+S to save, Ctrl+K to focus the URL bar, Ctrl+/ to toggle theme, Ctrl+1-4 for sidebar tabs.

**Request templates.** One-click load common patterns — REST GET/POST/PUT/PATCH/DELETE, GraphQL query, auth login, file upload. Stop typing the same JSON body over and over.

**Pre/post request scripts.** Write JavaScript that runs before or after every request. Set environment variables dynamically, validate response shape, extract tokens for chaining. `pm.environment.set()`, `pm.response.json()`, `pm.expect().to.equal()`.

**Network throttle simulation.** Test how your API feels on Slow 3G, Fast 3G, or Slow 4G. No extra tools needed.

**JSON minimap.** When the API dumps 10,000 lines, a 2px structural overview appears in the sidebar so you can navigate without losing your place.

**Request tags.** Label saved requests as `production`, `staging`, `dev`, `broken`, or `wip`. Scan your collection at a glance.

**Drag-and-drop reordering.** Reorganize requests within collections by dragging. No more delete-and-recreate.

**Schema validation.** Paste a JSON Schema and validate the last response against it. Catches API contract drift before your frontend does.

**Side-by-side diff.** Compare two JSON responses directly in the app. No external diff tool required.

**Complete backup & restore.** Export every collection, request, history entry, environment, note, cookie, setting, and vault as a single JSON file. Restore on any machine in one click.

**Error recovery.** Failed requests show a beautiful error panel with a one-click retry button. No more copying and pasting after a timeout.

---

## the toolbox

Ghost Client isn't just a request sender. It ships with utilities that developers actually open separate browser tabs for:

| Tool | Use it when |
|:---|:---|
| **Code Generator** | You need a snippet in cURL, Fetch, Axios, Python, Ruby, Go, or PHP |
| **cURL Import** | Stack Overflow gives you a `curl` command and you need to break it into parts |
| **cURL Export** | You need to share or debug a request as a curl command |
| **JWT Decoder** | You're debugging auth and need to see the header, payload, and expiration status |
| **Base64** | You're handling basic auth headers or image data URIs |
| **URL Encode/Decode** | You're building query strings by hand |
| **JSON Diff** | You have "before" and "after" API responses and need to see what changed |
| **Collection Runner** | You want to smoke-test every endpoint — sequential or parallel |
| **Response Search** | The API returns 4000 lines and you need one key (with regex and case options) |
| **Timestamp Converter** | Unix timestamp, ISO date, local time, relative — all at once |
| **Hash Generator** | MD5 / SHA-1 / SHA-256 / SHA-512 of any text |
| **UUID Generator** | v4 UUIDs in batches of 1, 5, or 10 |
| **WebSocket Client** | Real-time messaging with connect/send/receive log |
| **Server-Sent Events** | Stream and inspect live event feeds |
| **HAR Import/Export** | Exchange requests with browser DevTools |
| **Cookie Jar** | Manual cookie storage and auto-injection per domain |
| **JSON Schema Validator** | Paste a schema and validate the last response |
| **Request/Response Diff** | Side-by-side comparison of two JSON bodies |
| **Request Templates** | One-click load common REST / GraphQL / auth patterns |
| **Pre/Post Scripts** | JavaScript hooks for dynamic env vars and assertions |
| **Network Throttle** | Simulate Slow 3G / Fast 3G / Slow 4G latency |
| **JSON Minimap** | Navigate 10,000-line responses with a structural sidebar |
| **Request Tags** | Color-coded labels: production, staging, dev, broken, wip |
| **Backup & Restore** | One-click full export/import of all data |
| **Data Vault** | AES-256-GCM encryption for all local data |

---

## look at it

![screenshot](docs/screenshot.png)

*Dark mode. No distractions. Just you and the API.*

---

## use it right now

No install. No signup. No build step.

**Option 1:** Open [ghost-client-mocha.vercel.app](https://ghost-client-mocha.vercel.app) in your browser.

**Option 2:** One-line local server:

```bash
git clone https://github.com/BlackWh1te/ghost-client.git
cd ghost-client
python -m http.server 8080
# open http://localhost:8080
```

**Option 3:** Don't even clone it. Save the raw `index.html` to your desktop. Double-click it. It works.

---

## who this is for

- Developers who are tired of logging into tools just to test an endpoint
- People working with sensitive APIs who don't want their traffic routed through a third-party cloud
- Anyone who believes their development environment should work on a plane
- Teams who want a shared Postman collection without the Postman

## who this is NOT for

- People who want "team collaboration" with real-time cursors and chat bubbles
- Enterprise buyers who need SSO and audit logs
- Anyone who thinks "cloud-native" is a feature

---

## the stack

One HTML file. One CSS file. One JS file. That's the entire application.

No React. No Vue. No build system. No `npm install`. No `node_modules` folder that takes 15 minutes to download and 3GB of disk. No webpack. No vite. No framework-of-the-month.

Just the platform. The way the web was meant to work.

| Layer | What |
|:---|:---|
| UI | Hand-written HTML + CSS |
| Fonts | Inter + JetBrains Mono |
| Storage | Browser IndexedDB |
| Runtime | Any browser from the last 5 years |
| Dependencies | **None** |
| Size | **~30KB total** |

---

## philosophy

> "The best API client is the one that doesn't spy on you."

This tool exists because the current state of developer tools is embarrassing. We've accepted that software we run locally needs accounts. That debugging an API requires internet access. That our request history is someone else's business intelligence.

Ghost Client rejects all of that. It's a single-page application in the original sense: one page, one purpose, no surveillance.

Your data is yours. Your tools should be too.

---

## roadmap

### shipped

- [x] Code generator (cURL / Fetch / Axios / Python / Ruby / Go / PHP)
- [x] cURL import & export
- [x] JWT decoder with expiration status
- [x] Base64 & URL utilities
- [x] JSON diff
- [x] Collection runner (sequential + parallel)
- [x] Response search (case-sensitive, regex)
- [x] 20+ settings with persistence
- [x] Timestamp converter (Unix / ISO / local / relative)
- [x] Hash generator (MD5, SHA-1, SHA-256, SHA-512)
- [x] UUID generator (v4)
- [x] WebSocket client with message log
- [x] Server-Sent Events (SSE) client
- [x] Response assertions / mini test runner
- [x] Cookie jar visualization with auto-injection
- [x] OAuth2 PKCE helper flow
- [x] HAR import/export (DevTools compatible)
- [x] Collection search & nested folders
- [x] Per-collection JSON export/import
- [x] Request notes
- [x] Request chaining (sequential collection runner)
- [x] PWA support (offline-capable, installable)
- [x] Offline indicator
- [x] Download progress bars
- [x] Multiple request tabs with persistence
- [x] Secure note storage
- [x] Data Vault — AES-256-GCM local encryption
- [x] Response schema validation (JSON Schema)
- [x] Request/response diff side-by-side
- [x] Request templates / snippets (8 built-in)
- [x] Custom pre/post request scripts (pm.environment, pm.response, pm.expect API)
- [x] Bandwidth / latency simulation (Slow 3G / Fast 3G / Slow 4G)
- [x] JSON minimap for large responses
- [x] Drag-and-drop reordering in collections
- [x] Request tags (production, staging, dev, broken, wip)
- [x] Backup & restore all data (one-click JSON export/import)

### pending

- [ ] Bulk operations / batch API calls
- [ ] Mock responses for offline testing
- [ ] Undo/redo for request builder
- [ ] Response interceptors

Want something else? Open an issue. But remember: the answer to "can it do cloud sync?" is **no**. Forever.

---

## license

MIT — do whatever you want. Fork it. Rename it. Sell it. Embed it. The only requirement is keeping the license file intact.

Created by **[BlackWh1te](https://github.com/BlackWh1te)** because the tools we use should respect us.

---

<p align="center">
  <sub>if you found this useful, star the repo. if you didn't, don't.</sub>
</p>
