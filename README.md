# JobPilot AI

JobPilot AI is an open, name-only workspace for tracking job applications, improving resumes with AI feedback, and preparing for interviews.

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS v4
- shadcn/ui
- Lucide React
- Google Gemini via `@google/generative-ai`

## Getting Started

```bash
npm install
npm run dev
```

Open `http://127.0.0.1:3000`.

## Environment

Create `.env` from `.env.example`.

```bash
GEMINI_API_KEY=
JOBPILOT_DATA_DIR=
```

If `GEMINI_API_KEY` is omitted, the app falls back to local structured AI-like guidance so the demo still works.

JobPilot does not use an external database. It stores local JSON data in `data/jobpilot.json` by default. You can set `JOBPILOT_DATA_DIR` to choose a different local folder.

On Vercel-style serverless hosts, the app writes to `/tmp/jobpilot/jobpilot.json` so it can run without a database. That data is temporary and can disappear between deployments or cold starts.

## Product Notes

- No login or registration: first-time visitors only enter a display name.
- AI actions are limited to 3 per guest per day.
- App data is local JSON only. `data/` is intentionally ignored by git.
- Serverless deployments can run without a database, but their local data is temporary.
- Stitch-generated design references live in `.stitch/`.
- Repository layout is documented in [`docs/PROJECT_STRUCTURE.md`](docs/PROJECT_STRUCTURE.md).

## Scripts

```bash
npm run typecheck
npm run lint
npm run build
```
