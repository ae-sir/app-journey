# Progress Log

A running record of what was built, what was learned, and what clicked at each level.

---

## Level 1 — Weather Dashboard
**Date completed:** early May 2026
**Commit:** `4778592`

### What was built
A dark-themed weather dashboard. Type a city name, get back live temperature, humidity, wind speed, and a weather icon from OpenWeatherMap.

### What was learned
- **How HTTP requests work** — `fetch()` sends a request over the network and waits for a response; it doesn't pull from local storage
- **JSON** — a language-agnostic data format. APIs use it because every language can parse it, and it's human-readable unlike binary
- **Server-side proxy pattern** — the API key lives in `.env` on the server; the browser calls your own `/api/weather` endpoint instead of OpenWeatherMap directly, so the key is never exposed in the browser's Network tab
- **Error handling** — `if (!response.ok)` catches HTTP errors (like 404 for a fake city) before trying to parse the response body
- **`new Error(message)`** — how to create a custom error message that ends up in the UI

### What clicked
The mental model of: browser → your server → external API → back. Understanding that the server is a secure middleman, not just an extra hop.

---

## Level 2 — Receipt Scanner
**Date completed:** mid May 2026
**Commit:** `0249dbb`

### What was built
Drag-drop a receipt photo, and Claude AI reads it and returns structured data — store name, line items, and totals — rendered as a formatted card.

### What was learned
- **Multimodal AI** — Claude can read images, not just text. Images are encoded as base64 (a way of turning binary image data into plain text characters so it can be sent in a JSON payload)
- **File uploads in the browser** — `<input type="file">` and drag-and-drop events; `FormData` packages everything into `multipart/form-data` format automatically
- **Multer** — a Node.js middleware that parses multipart uploads so `req.file` gives you easy access to the uploaded file
- **Prompt engineering basics** — asking the AI to return structured JSON (not free text) so the front end can reliably parse and display it
- **Why the server handles AI calls** — same reason as Level 1: API key security. The Anthropic key never touches the browser

### What clicked
The idea that an AI can be used as a "structured data extractor" — give it an image with a prompt, get back predictable JSON instead of a conversational response.

---

## Level 3 — Personal Expense Tracker
**Date completed:** mid May 2026
**Commit:** `f6f261a`

### What was built
A full CRUD expense tracker backed by a real PostgreSQL database via Supabase. Add expenses with a description, amount, and category. Edit inline. Delete with confirmation. Running total updates live.

### What was learned
- **CRUD** — Create, Read, Update, Delete. The four fundamental database operations that almost every real app is built on
- **Supabase** — a service that gives you a PostgreSQL database with a JavaScript client. Instead of writing raw SQL queries, you call methods like `.select()`, `.insert()`, `.update()`, `.delete()`
- **Row Level Security (RLS)** — Supabase's permission system. You define *policies* that control which rows a user can see or modify. Without this, your data is locked even from your own app
- **Build-time config injection** — `build.js` reads `.env` and writes `public/js/config.js` at startup, injecting credentials at build time rather than hardcoding them in source code
- **Two separate permission layers in Supabase:**
  1. PostgreSQL `GRANT` — controls whether a role can touch the table at all
  2. RLS policy — controls which rows within the table they can access
  Both must be set up; setting up only one causes "permission denied" errors

### Gotchas hit
- **`window.supabase` naming clash** — the Supabase CDN sets `window.supabase` as a global. Naming your client variable `supabase` silently overwrites it, causing confusing failures. Fixed by using `supabaseClient` instead
- **SQL Editor vs UI table builder** — creating a table via the Supabase SQL Editor does not auto-configure permissions. The UI table builder handles this for you; the SQL Editor does not. `schema.sql` sets up both layers explicitly

### What clicked
Understanding that databases aren't magic storage — you have to explicitly grant permission for your app to read and write, and then also define *which rows* it's allowed to touch.

---

## Level 4 — Outfit Mood Board
**Date completed:** 18 May 2026
**Commits:** `9781179`, `8025970`

### What was built
An AI-assisted wardrobe organiser. Upload a clothing photo → background is automatically stripped by the Remove.bg API → item saved to Supabase with type, colour, and tags metadata. The wardrobe grid lets you click items to assemble an outfit mood board. A filter bar (dynamically built from your actual wardrobe) lets you filter by item type and tags.

### What was learned

**Binary data and `Buffer`:**
Images are binary data (raw bytes). Node.js represents them as `Buffer` objects — basically an array of bytes. Using `multer.memoryStorage()` keeps the uploaded file in RAM as a `Buffer` instead of writing it to disk first. That buffer gets piped directly to Remove.bg, which returns another buffer (the processed PNG). Only the processed result gets saved to disk.

**`arraybuffer` response type with Axios:**
When calling Remove.bg, you set `responseType: 'arraybuffer'` so Axios returns raw bytes instead of trying to parse the response as text or JSON. You then wrap it in `Buffer.from(response.data)` to get a Node.js Buffer you can write to disk.

**Chained async operations with rollback:**
The upload handler does four things in order:
1. Receive the file in memory (Multer)
2. Send it to Remove.bg, get back a processed PNG
3. Save the PNG to `/uploads`
4. Insert a row in Supabase with the filename + metadata

If step 4 fails after step 3 has already written the file, the server deletes the PNG before returning the error. This prevents "orphaned" files — images on disk that have no matching database row.

**Client-side state with a `Set`:**
A JavaScript `Set` of selected item IDs (`selectedIds`) drives the outfit panel without hitting the server. When you click an item, its ID is toggled in the `Set`, and the grid + outfit panel re-render from that in-memory state.

**Dynamic filter chips:**
The filter bar is built from `[...new Set(allItems.map(i => i.item_type))]` — it derives unique values from whatever is actually in your wardrobe, rather than hardcoding a fixed list. If a type disappears (all items of that type deleted), the filter chip disappears too.

**PostgreSQL arrays (`text[]`):**
The `tags` column is a native PostgreSQL array type. Supabase stores and retrieves it as a JavaScript array automatically. On the server side, a comma-separated string from the form gets `.split(',').map(t => t.trim())` before being inserted.

**Form data vs JSON:**
The upload form uses `multipart/form-data` (via `FormData`) because it carries both text fields (item_type, colour, tags) and a binary file in one request. Regular JSON can't carry binary data directly.

### Gotchas hit
- **`form-data` headers with Axios** — when posting multipart to Remove.bg, you must spread `form.getHeaders()` into the Axios request headers. Without this, the server doesn't know where each part of the multipart body begins and ends
- **`multer` v2 breaking change** — Multer 2.x requires `fileFilter` to call `cb(null, true)` synchronously; throwing an error inside the callback without calling `cb` causes the request to hang
- **Supabase array insertion** — passing an empty array `[]` vs `null` matters. An empty `text[]` is valid; `null` for a `NOT NULL` column would error. The tags field defaults to `'{}'` in the schema to match

### What clicked
The idea of "the server as an orchestrator" — it doesn't just forward one request, it coordinates multiple external services (Remove.bg + Supabase), handles failures between them, and keeps the system consistent. This is the pattern behind most real-world backend APIs.

---

## Where this is heading

| Level | Focus |
|-------|-------|
| 1 | External API + server proxy + error handling |
| 2 | Multimodal AI + file uploads |
| 3 | Database CRUD + permissions |
| 4 | Third-party image processing + chained async + client-side state |
| 5+ | Authentication, outfit suggestions (AI), user accounts, mobile UI |

---

## Level 5a — Unified Wardrobe App (Weather + Wardrobe)
**Date completed:** 19 May 2026
**Commit:** `0677266`

### What was built
A unified wardrobe app where clothing photos can be uploaded, backgrounds automatically stripped, and items tagged and stored in a grid. Items can be selected from the grid to assemble an outfit. A weather widget sits above the wardrobe with city search, so clothing choices can be matched to current conditions. Both features run off a single Express server with one shared database and one `.env` file.

### What was learned
- **DevTools Network tab** — how to inspect every HTTP request the browser makes in real time. Useful for verifying API calls are going to the local server (`localhost:3000/api/...`) rather than directly to third-party services, confirming no API keys are leaking, and reading error responses when things break
- **Authenticated endpoints vs public assets** — data API calls need proxying through the server because they carry a secret key in the URL. Public assets like weather icons don't — they have no key and hitting them directly is both correct and faster
- **`main.js` orchestrator pattern** — `main.js` imports and initialises both `weather.js` and `wardrobe.js` on page load. Neither module knows the other exists. Adding a new feature in 5b means adding one new file and one new `init` call in `main.js`, without touching existing modules
- **`.gitkeep`** — git tracks files, not folders. An empty folder is invisible to git and won't appear in a cloned repo. Adding a zero-byte `.gitkeep` file gives git something to track, forcing the folder to exist. The `uploads/*` + `!uploads/.gitkeep` pattern in `.gitignore` keeps the folder in git while excluding everything uploaded into it

### Gotchas hit
None during the build itself — the integration was straightforward because both source projects already followed similar patterns (Express server, `.env` for secrets, server-side API calls). The main friction was pre-commit verification and understanding what to look for in the Network tab.

### What clicked
Verification before committing isn't just good hygiene — it's about preserving the ability to isolate bugs later. If a bug surfaces in 5c (auth), it needs to be attributable to the auth layer, not to an unverified integration. Committing a clean, verified baseline means any future regression can be confidently traced to whatever changed after this commit. "Claude Code said it's done" is not a baseline. A passing checklist is.