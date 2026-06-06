# JobPilot AI

JobPilot AI is an open-source job application workspace for people who want a calmer way to manage their search. It gives each browser a name-only workspace with an application board, resume guidance, interview prep, follow-up tracking, review-credit limits, and local data controls.

The product tone is supportive and grounded. Job hunting is stressful, so the app focuses on clear next steps without turning setbacks into empty cheerleading.

![JobPilot AI interface preview](public/landing/jobpilot-command-desk.png)

## Features

- Name-only guest mode with a first-time onboarding walkthrough.
- Application board with stages from wishlist through offer or archived rejection.
- Resume analyzer with text paste and PDF import.
- Interview prep workspace with practice notes.
- Follow-up tracking and recent activity history.
- Local JSON storage for simple self-hosting and demos.
- Input validation, sanitization, route ownership checks, and lightweight rate limiting.
- Responsive interface with motion, loading states, and empty states.

## Tech Stack

- Next.js App Router
- React 19
- TypeScript
- Tailwind CSS v4
- Radix/shadcn-style UI primitives
- Zod
- Vitest
- Local JSON storage
- Optional Gemini integration

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

Create `.env` from `.env.example`.

| Variable | Required | Default | Purpose |
| --- | --- | --- | --- |
| `GEMINI_API_KEY` | No | Empty | Enables Gemini-backed resume analysis and interview question generation. Without it, JobPilot uses local fallback guidance and does not spend AI quota. |
| `JOBPILOT_DATA_DIR` | No | `data/` locally, `/tmp/jobpilot` on Vercel | Directory for the local JSON database. |
| `JOBPILOT_DAILY_AI_ACTION_LIMIT` | No | `3` | Daily review-credit limit per visitor cookie. |
| `JOBPILOT_DAILY_AI_IP_LIMIT` | No | `3` | Daily review-credit limit per hashed client IP. |
| `JOBPILOT_ABUSE_SALT` | Recommended for public demos | Local development salt | Salt used to hash IP-based quota subjects. Set this to a private random value in hosted demos. |

## Scripts

```bash
npm run dev
npm run typecheck
npm run lint
npm run test
npm run build
npm audit --audit-level=moderate
```

## Project Structure

```text
app/                    Next.js routes, API routes, layout, global styles
components/jobpilot/    Product UI
components/ui/          Reusable UI primitives used by the product
lib/jobpilot/           Domain logic, storage, validation, AI helpers, rate limiting
public/brand/           Runtime brand assets
public/landing/         Landing page image assets
docs/                   Architecture, security, deployment, and roadmap notes
```

Detailed structure notes live in [`docs/PROJECT_STRUCTURE.md`](docs/PROJECT_STRUCTURE.md).

## Demo And Deployment Limits

JobPilot intentionally uses local JSON storage so the project is easy to inspect, run, and modify. That makes it good for local development and small demos, but it is not durable production infrastructure.

- Local development writes to `data/jobpilot.json`.
- Vercel-style serverless hosting writes to `/tmp/jobpilot/jobpilot.json`; this storage is temporary and can reset between deployments, cold starts, or instances.
- In-memory request rate limiting resets when the server restarts and is not shared across multiple instances.
- Public hosted demos should set `JOBPILOT_ABUSE_SALT`, provider-side AI budget limits, and ideally use durable storage plus shared rate limiting.

See [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) for more detail.

## Security

Read [`docs/SECURITY_THREAT_MODEL.md`](docs/SECURITY_THREAT_MODEL.md) for the current threat model.

Security issues should be reported using [`SECURITY.md`](SECURITY.md), not public GitHub issues.

## Contributing

Start with [`CONTRIBUTING.md`](CONTRIBUTING.md). The short version:

1. Keep PRs focused.
2. Run the quality scripts before opening a PR.
3. Use existing UI primitives and product tone.
4. Add or update tests for validation, storage, route, and quota behavior.

## Roadmap

The current roadmap is in [`ROADMAP.md`](ROADMAP.md).

## License

MIT. See [`LICENSE`](LICENSE).
