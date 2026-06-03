# Deployment Notes

JobPilot AI is currently designed as a local-first demo application.

## Local Development

By default, local development stores records in `data/jobpilot.json`. The `data/` directory is ignored by Git.

```bash
npm install
cp .env.example .env
npm run dev
```

## Public Demo Hosting

The app can run on serverless hosts, but the default JSON store is temporary on platforms such as Vercel because it writes to `/tmp/jobpilot/jobpilot.json`.

Before using JobPilot as a public demo:

- Set `JOBPILOT_ABUSE_SALT` to a private random value.
- Set provider-side spend limits for the Gemini project.
- Keep `JOBPILOT_DAILY_AI_ACTION_LIMIT` and `JOBPILOT_DAILY_AI_IP_LIMIT` low.
- Treat `/tmp` JSON storage as disposable.
- Avoid promising persistent user data unless you add durable storage.

## Production Hardening Backlog

For a durable multi-user deployment, replace:

- Local JSON storage with a database-backed storage adapter.
- Process-local transaction locking with database transactions.
- In-memory rate limiting with shared Redis/Upstash-style rate limiting.
- Name-only guest sessions with real authentication if private data should persist across browsers.

Keep the local JSON adapter available for contributors and demos.
