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
```

If `GEMINI_API_KEY` is omitted, the app falls back to local structured AI-like guidance so the demo still works.

## Product Notes

- No login or registration: first-time visitors only enter a display name.
- AI actions are limited to 3 per guest per day.
- Local demo data is stored in `data/jobpilot.json`, which is intentionally ignored by git.
- Stitch-generated design references live in `.stitch/`.

## Scripts

```bash
npm run typecheck
npm run lint
npm run build
```
