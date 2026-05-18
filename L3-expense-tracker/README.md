# Level 3 — Personal Expense Tracker

A vanilla HTML/CSS/JS expense tracker connected to a real PostgreSQL database via [Supabase](https://supabase.com). This is Level 3 of the app journey — the focus is CRUD operations and working with a real database.

## What it does

- **Add** an expense with a description, amount, and category
- **View** all expenses in a table, sorted newest-first
- **Edit** any expense inline — click Edit, change the fields, click Save
- **Delete** any expense with a confirmation prompt
- **Running total** updates live as expenses change

## Tech decisions

| What | Why |
|------|-----|
| Supabase JS client via CDN | No bundler or build step — the browser loads it directly |
| `build.js` + `.env` | Keeps credentials out of source code; teaches the concept of build-time config injection |
| Vanilla JS, no framework | Focus is on the database layer, not component libraries |
| Row Level Security + GRANT | Two separate permission layers are both required — see Gotchas below |

## Setup

### 1. Create the database table

Open your Supabase project → SQL Editor → paste and run `schema.sql`.

`schema.sql` handles three things in order:
1. Creates the `expenses` table
2. Enables Row Level Security and adds a policy allowing full access via the anon key
3. Grants table-level privileges to the `anon` and `authenticated` roles

All three steps are required. If you only run the `CREATE TABLE`, the app will get a `permission denied` error.

### 2. Install dependencies

```bash
npm install
```

### 3. Configure credentials

Copy `.env.example` to `.env` and fill in your values:

```
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
```

### 4. Build and run

```bash
npm start
```

This runs `build.js` first (which reads `.env` and writes `public/js/config.js`), then serves the `public/` folder on `http://localhost:3000`.

To build without serving:

```bash
npm run build
```

## Project structure

```
L3-expense-tracker/
├── .env                  ← your credentials (gitignored)
├── .env.example          ← template committed to git
├── .gitignore
├── build.js              ← reads .env, writes public/js/config.js
├── schema.sql            ← run this once in Supabase SQL Editor
├── package.json
└── public/
    ├── index.html
    ├── css/
    │   └── styles.css
    └── js/
        ├── config.js     ← GENERATED — never commit this
        └── app.js        ← all app logic
```

## Key concepts covered

- **CRUD** — Create, Read, Update, Delete against a real PostgreSQL table
- **Supabase client** — a thin wrapper that turns JS method chains into REST API calls
- **Row Level Security** — Supabase's permission system, scoped per-table per-operation
- **Build-time config injection** — keeping secrets out of source control
- **Optimistic vs pessimistic UI** — this app re-fetches after every mutation (pessimistic); the next level will show optimistic updates

## Gotchas

### "permission denied for table expenses"

Supabase has two separate permission layers and both must be set up:

| Layer | What it controls | How to set it |
|-------|-----------------|---------------|
| PostgreSQL `GRANT` | Whether a role can touch the table at all | `GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.expenses TO anon;` |
| Row Level Security (RLS) | Which rows within the table the role can see/modify | `CREATE POLICY ... USING (true)` |

When you create a table via the Supabase SQL Editor, neither is configured automatically. The Supabase UI table builder handles this for you — the SQL editor does not. `schema.sql` sets up both.

### Variable naming clash with the Supabase CDN

The CDN script (`supabase.min.js`) exposes the library as `window.supabase`. If you name your client variable `supabase`, it silently overwrites that global and causes confusing failures. The client is named `supabaseClient` in `app.js` to avoid the clash:

```js
// Safe — doesn't shadow window.supabase
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
```
