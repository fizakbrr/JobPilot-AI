# Release Audit

## Fixes Applied

| Area | Finding | Change |
| --- | --- | --- |
| Repository structure | Unused shadcn/ui components made the public repo look larger than the app. | Removed unused `avatar`, `badge`, `calendar`, `card`, `command`, `dropdown-menu`, `popover`, `table`, and `tabs` components. |
| Dependencies | `cmdk`, `react-day-picker`, and `next-themes` were only needed by removed components. | Uninstalled the unused packages and simplified `components/ui/sonner.tsx`. |
| Assets | Brand SVGs were duplicated under `assets/brand` and `public/brand`. | Kept `public/brand` as the canonical runtime asset folder and removed the duplicate source folder. |
| Logging | API error handling still wrote server errors with `console.error`. | Removed console logging from `lib/jobpilot/route-errors.ts`. |
| Documentation | README lacked open-source project detail and deployment guidance. | Rewrote `README.md` and added `docs/DEPLOYMENT.md`. |
| Governance | The repository lacked standard public-project files. | Added `LICENSE`, `CONTRIBUTING.md`, `SECURITY.md`, `CODE_OF_CONDUCT.md`, and GitHub CI. |
| CI | Contributors had no automated verification path. | Added `.github/workflows/ci.yml` for install, typecheck, lint, build, and audit. |

## Remaining Improvements

| Area | Recommendation | Reason |
| --- | --- | --- |
| Persistent storage | Add a formal `StorageAdapter` interface before integrating Supabase or another hosted database. | The current JSON store is correct for local demos, but serverless persistence needs a real shared store. |
| Rate limiting | Move rate-limit buckets to a shared store when deploying multiple instances. | In-memory limits reset on restart and do not coordinate across serverless instances. |
| Observability | Add structured server logs behind a production-safe logger. | Public maintainers need debug visibility without raw console noise. |
