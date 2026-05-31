# JobPilot AI

JobPilot AI is an open-source job application tracker for people who want a calmer way to manage their search. It gives each visitor a name-only workspace, a kanban-style application board, resume feedback, interview prep, follow-up tracking, and a strict daily AI action limit.

The product tone is intentionally supportive and grounded. Job hunting is stressful; the app focuses on clarity, next steps, and momentum without turning setbacks into fake celebration.

## Features

- Name-only guest mode with first-time onboarding walkthrough.
- Application board with statuses from wishlist through offer or archived rejection.
- Resume analyzer with text paste and PDF import.
- Interview question generator with practice notes.
- Local JSON storage for simple self-hosting and demos.
- Daily AI action quota per guest workspace.
- Server-side Gemini integration with local fallback guidance when no API key is configured.
- Input validation, sanitization, route ownership checks, and lightweight rate limiting.
- High-end UI motion using `motion` and shadcn/ui primitives.

## Tech Stack

- Next.js App Router
- React 19
- TypeScript
- Tailwind CSS v4
- shadcn/ui
- Lucide React
- Motion
- Zod
- Google Gemini via `@google/generative-ai`
- Local JSON storage

## Local Setup

```bash
git clone https://github.com/fizakbrr/JobPilot-AI.git
cd JobPilot-AI
npm install
cp .env.example .env
npm run dev
```

Open `http://127.0.0.1:3000`.

## Environment Variables

```bash
GEMINI_API_KEY=
JOBPILOT_DATA_DIR=
JOBPILOT_DAILY_AI_ACTION_LIMIT=3
```

`GEMINI_API_KEY` is optional. If it is missing, JobPilot returns local structured guidance so the demo still works.

`JOBPILOT_DATA_DIR` is optional. By default, local development writes to `data/jobpilot.json`. On Vercel-style serverless hosts, the app writes to `/tmp/jobpilot/jobpilot.json`; that storage is temporary and may reset between deployments or cold starts.

## Scripts

```bash
npm run typecheck
npm run lint
npm run build
npm audit
```

## Project Structure

```text
app/                    Next.js routes, API routes, layout, global styles
components/jobpilot/    Product UI
components/ui/          shadcn/ui primitives used by the product
lib/jobpilot/           Domain logic, storage, validation, AI, rate limiting
public/brand/           Runtime brand assets
public/landing/         Landing page image assets
docs/                   Architecture, PRD, security, deployment notes
```

Detailed structure notes live in [`docs/PROJECT_STRUCTURE.md`](docs/PROJECT_STRUCTURE.md).

Release-readiness notes live in [`docs/RELEASE_AUDIT.md`](docs/RELEASE_AUDIT.md).

## Deployment

The simplest free deployment is Vercel Hobby:

1. Push the repository to GitHub.
2. In Vercel, create a new project and import the GitHub repository.
3. Keep the default Next.js settings.
4. Add environment variables:
   - `GEMINI_API_KEY`, optional.
   - `JOBPILOT_DAILY_AI_ACTION_LIMIT`, optional.
5. Deploy.

Vercel automatically creates preview deployments for pull requests and production deployments from the production branch. The current app does not require an external database for a demo deployment. For persistent multi-user production data, add a storage adapter first, then use a free Postgres provider such as Supabase.

More detail is available in [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md).

## Security

Read [`docs/SECURITY_THREAT_MODEL.md`](docs/SECURITY_THREAT_MODEL.md) for the current threat model.

Security issues should be reported using [`SECURITY.md`](SECURITY.md), not public GitHub issues.

## Contributing

Contributions are welcome. Start with [`CONTRIBUTING.md`](CONTRIBUTING.md).

Before opening a pull request, run:

```bash
npm run typecheck
npm run lint
npm run build
npm audit
```

## License

MIT. See [`LICENSE`](LICENSE).
