# Free Deployment Guide

## Recommended Free Path

Use Vercel for both the Next.js frontend and API routes.

Why:

- The app already uses Next.js App Router.
- API routes run as Vercel Functions without a separate backend service.
- GitHub integration gives preview deployments for pull requests and production deployments from `main`.
- No external database is required for a public demo.

Important limitation: serverless local JSON data is temporary. Vercel can run the app with `/tmp/jobpilot/jobpilot.json`, but that data can reset after deployments, cold starts, or function lifecycle changes.

## Vercel Steps

1. Push the repository to GitHub.
2. Create a Vercel account.
3. Choose **Add New Project**.
4. Import the GitHub repository.
5. Keep the detected framework as **Next.js**.
6. Add environment variables:
   - `GEMINI_API_KEY`, optional.
   - `JOBPILOT_DAILY_AI_ACTION_LIMIT`, optional, default `3`.
7. Deploy.

After setup:

- Pull requests create preview deployments.
- Pushes to `main` create production deployments.
- Vercel stores environment variables in the project settings.

## Database Options

### Current project behavior

JobPilot currently uses local JSON storage only. This is best for:

- Local development.
- Demos.
- Single-instance self-hosting.
- Public previews where data persistence is not required.

### Persistent free database option

Use Supabase Free only after adding a storage adapter. Supabase provides hosted Postgres on a free plan, but this codebase does not currently include a Postgres adapter or migration.

Recommended future path:

1. Add a `StorageAdapter` interface in `lib/jobpilot`.
2. Keep the current JSON adapter for local development.
3. Add a Supabase/Postgres adapter for hosted persistence.
4. Move rate limits to a shared store.
5. Add migration SQL under `docs/database/` or `supabase/migrations/`.

## Alternative Hosts

### Netlify

Netlify can deploy Next.js apps from GitHub and supports environment variables. It is a reasonable alternative, but Vercel is the better default for this project because the app uses standard Next.js server routes and needs minimal configuration.

### Self-hosted free VM

If you have a free VPS, you can run:

```bash
npm ci
npm run build
npm run start
```

Set `JOBPILOT_DATA_DIR` to a persistent folder on the VM. This gives persistent local JSON without adding a database, but you must manage process restarts, HTTPS, backups, and updates yourself.

## Production Checklist

- Set `GEMINI_API_KEY` only in host environment variables.
- Do not expose server secrets with `NEXT_PUBLIC_`.
- Decide whether temporary JSON storage is acceptable.
- Run `npm run typecheck`, `npm run lint`, `npm run build`, and `npm audit`.
- Keep `data/` ignored.

## References

- Vercel Hobby plan: https://vercel.com/docs/accounts/plans/hobby
- Vercel Git deployments: https://vercel.com/docs/deployments/git
- Vercel environment variables: https://vercel.com/docs/environment-variables
- Netlify Next.js overview: https://docs.netlify.com/frameworks/next-js/overview/
- Netlify environment variables: https://docs.netlify.com/build/environment-variables/overview
- Supabase pricing: https://supabase.com/pricing
