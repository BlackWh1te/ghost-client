# Ghost Client

> A privacy-first, zero-backend API client that runs entirely in your browser.

[![Stars](https://img.shields.io/github/stars/BlackWh1te/ghost-client?style=social)](https://github.com/BlackWh1te/ghost-client)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

**No telemetry. No cloud. No account.** Your API keys, collections, and request history never leave your machine. Everything is stored locally via IndexedDB.

[Live Demo](https://BlackWh1te.github.io/ghost-client) · [Features](#features) · [Screenshots](#screenshots)

---

## Why Ghost Client?

| Feature | Postman | Ghost Client |
|---------|---------|--------------|
| Cloud sync required | Yes | **No** |
| Telemetry | Yes | **Zero** |
| Works offline | No | **Yes** |
| Open source | No | **Yes** |
| Free forever | Partial | **Yes** |

---

## Features

### Core
- **All HTTP methods** — GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS
- **Beautiful JSON tree viewer** — Collapsible, syntax-highlighted response viewer with search
- **Collections** — Organize requests into folders, saved locally
- **Collection Runner** — Run all requests in a collection with pass/fail summary
- **Environment variables** — `{{baseUrl}}`, `{{apiKey}}` substitution across requests
- **Request history** — Last 100 requests, one-click replay
- **Custom timeout** — Per-request timeout control (1-300 seconds)
- **Auth helpers** — Bearer token, Basic auth, API key (header or query)
- **Light & Dark themes** — Toggle anytime
- **100% client-side** — Deploys to GitHub Pages, Vercel, Netlify, or runs as a local file

### Developer Tools (built-in)
- **Code generator** — Instantly generate cURL, Fetch, Axios, or Python requests code
- **cURL import** — Paste any `curl` command and convert it to a request
- **JWT Decoder** — Inspect header, payload, and signature of any JWT token
- **Base64 Encode/Decode** — Built-in converter
- **URL Encode/Decode** — Built-in converter
- **JSON Diff** — Compare two JSON objects side-by-side

### Import / Export
- Export your full workspace as JSON
- Import from Postman collections
- Import/restore your own backups

---

## Quick Start

### Use it now (no install)

Open `index.html` in any modern browser, or visit the live demo.

### Deploy to GitHub Pages

```bash
git clone https://github.com/BlackWh1te/ghost-client.git
cd ghost-client
git push origin main
# Then enable GitHub Pages in repo settings
```

### Run locally

```bash
# Just open the file — no build step, no server required
open index.html

# Or serve with any static server
npx serve .
```

---

## Screenshots

![Ghost Client Screenshot](docs/screenshot.png)

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| UI | Vanilla HTML + CSS (no frameworks) |
| Fonts | Inter + JetBrains Mono via Google Fonts |
| Storage | IndexedDB (browser-native) |
| Runtime | Any modern browser |

**Bundle size:** ~30KB total. Zero dependencies. Zero build step.

---

## Philosophy

> "The best API client is the one that doesn't spy on you."

Ghost Client was built in response to a growing number of developer tools silently collecting telemetry, requiring cloud accounts, and locking features behind paywalls. We believe:

- Your API traffic is **private**
- Your collections are **yours**
- Your tools should work **offline**
- Open source should mean **truly open**

---

## Roadmap

- [x] Code generator (cURL / Fetch / Axios / Python)
- [x] cURL import
- [x] JWT decoder
- [x] Base64 & URL utilities
- [x] JSON diff
- [x] Collection runner
- [x] Response search
- [ ] WebSocket testing
- [ ] Request chaining / scripts
- [ ] Response assertions
- [ ] Cookie jar management
- [ ] OAuth2 flow helper
- [ ] HAR import/export

---

## Contributing

Issues and PRs welcome. This is intentionally a small, focused tool — we won't add a backend or cloud features.

---

## License

MIT © [BlackWh1te](https://github.com/BlackWh1te)
