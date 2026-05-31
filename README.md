# JobPilot

JobPilot is an open-source job application tracker for people who want a calmer way to manage their search. It gives each visitor a name-only workspace, a kanban-style application board, resume guidance, interview prep, follow-up tracking, and local data controls.

The product tone is supportive and grounded. Job hunting is stressful, so the app focuses on clarity, next steps, and momentum without turning setbacks into empty cheerleading.

## Features

- Name-only guest mode with a first-time onboarding walkthrough.
- Application board with stages from wishlist through offer or archived rejection.
- Resume analyzer with text paste and PDF import.
- Interview prep workspace with practice notes.
- Follow-up tracking and recent activity history.
- Local JSON storage for simple self-hosting and demos.
- Input validation, sanitization, route ownership checks, and lightweight rate limiting.
- Polished interface with responsive layouts and smooth transitions.

## Tech Stack

- Next.js App Router
- React 19
- TypeScript
- Tailwind CSS v4
- Lucide React
- Zod
- Local JSON storage

## Local Setup

```bash
git clone <your-repo-url>
cd jobpilot
npm install
cp .env.example .env
npm run dev
```

Open `http://127.0.0.1:3000`.

## Environment

Create `.env` from `.env.example`.

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
components/ui/          Reusable UI primitives used by the product
lib/jobpilot/           Domain logic, storage, validation, and rate limiting
public/brand/           Runtime brand assets
public/landing/         Landing page image assets
docs/                   Architecture, security, deployment, and release notes
```

Detailed structure notes live in [`docs/PROJECT_STRUCTURE.md`](docs/PROJECT_STRUCTURE.md).

Release-readiness notes live in [`docs/RELEASE_AUDIT.md`](docs/RELEASE_AUDIT.md).

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
