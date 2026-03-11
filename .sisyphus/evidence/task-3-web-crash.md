# Task 3 — Web Pencil Crash Evidence

**Captured**: 2026-03-10  
**URL**: http://localhost:5173  
**App**: Paperclip (Pencil web build, port 5173)

---

## Crash Signature

**Type**: Blank page / error state (NOT an abort overlay)

**DOM state after load:**
```html
<div id="root">
  <div class="mx-auto max-w-xl py-10 text-sm text-destructive">
    Failed to load health (500)
  </div>
</div>
```

The app renders a single error message: **"Failed to load health (500)"** and nothing else. The page is effectively blank — no navigation, no UI, just this error string.

---

## Root Cause

The app calls `GET /api/health` on startup. The backend returns **HTTP 500 Internal Server Error**. The app treats this as a fatal condition and renders the error message instead of the normal UI.

**Secondary failures** (cascading from the health check failure):
- `GET /api/companies` → 500 Internal Server Error
- `WebSocket ws://localhost:5173/api/companies/town/events/ws` → connection failed (repeated, from `LiveUpdatesProvider.tsx:355`)

---

## Network Evidence

```
[GET] http://localhost:5173/api/health   => 500 Internal Server Error
[GET] http://localhost:5173/api/companies => 500 Internal Server Error
[GET] http://localhost:5173/api/health   => 500 Internal Server Error  (retry)
```

---

## Console Errors

```
[ERROR] Failed to load resource: the server responded with a status of 500 (Internal Server Error) @ http://localhost:5173/api/health
[ERROR] WebSocket connection to 'ws://localhost:5173/api/companies/town/events/ws' failed @ LiveUpdatesProvider.tsx:355
[ERROR] Failed to load resource: the server responded with a status of 500 (Internal Server Error) @ http://localhost:5173/api/companies
```

(Plus ~180 Vite HMR debug messages from hot-reload activity — not crash-related)

---

## Artifacts

| File | Description |
|------|-------------|
| `task-3-web-crash.md` | This summary |
| `task-3-web-crash-blank.png` | Screenshot showing blank/error page |
| `task-3-web-crash-console.log` | Full console log (189 entries) |
| `task-3-web-crash-network.log` | Network requests (3 failed API calls) |

---

## Diagnosis

The Pencil web app is a **different app** (Bot Town / NanoClaw frontend) running on port 5173 — NOT the Slopcade Pencil design tool. It requires a backend API server that is either:
1. Not running, or
2. Running but returning 500 on `/api/health`

The crash is **not a JS runtime error** — it's a deliberate error boundary triggered by the health check returning 500. The app is working as designed; the backend is the problem.

**To fix**: Start the backend API that serves `/api/health` and `/api/companies` on the same origin (port 5173 via Vite proxy, or a separate port).
