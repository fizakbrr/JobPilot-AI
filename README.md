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
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
JOBPILOT_STORAGE_KEY=jobpilot:database
```

If `GEMINI_API_KEY` is omitted, the app falls back to local structured AI-like guidance so the demo still works.

For production deployment, set the Upstash Redis REST variables above. Without them, JobPilot uses a file fallback: `data/jobpilot.json` locally, or `/tmp/jobpilot/jobpilot.json` on Vercel. The fallback keeps demos running, but it is not durable on serverless hosts.

## Product Notes

- No login or registration: first-time visitors only enter a display name.
- AI actions are limited to 3 per guest per day.
- Production data is stored through Upstash Redis REST when configured.
- Demo data falls back to a local or temporary JSON file, which is intentionally ignored by git.
- Stitch-generated design references live in `.stitch/`.
- Repository layout is documented in [`docs/PROJECT_STRUCTURE.md`](docs/PROJECT_STRUCTURE.md).

## Scripts

```bash
npm run typecheck
npm run lint
npm run build
```
