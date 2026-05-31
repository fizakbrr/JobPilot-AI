# Project Structure

JobPilot keeps framework routes, product code, design references, and generated files in separate places.

## App Routes

- `app/` contains Next.js App Router pages, API routes, metadata, favicon, and global styles.
- `app/api/` is intentionally thin: routes validate input, require the guest session, and call JobPilot domain helpers.

## Product Code

- `components/jobpilot/` contains the JobPilot application interface.
- `components/ui/` contains shadcn/ui primitives. Product code should compose these instead of using raw native interactive elements.
- `lib/jobpilot/` contains JobPilot domain logic:
  - `ai.ts` for Gemini integration and local AI-style fallback responses.
  - `config.ts` for app metadata and configurable AI quota defaults.
  - `guest.ts` for name-only guest sessions.
  - `rate-limit.ts` for lightweight server-side traffic controls.
  - `route-errors.ts` for consistent API error responses.
  - `sanitize.ts` for shared input and AI-output sanitization.
  - `store.ts` for local JSON storage, IDs, analytics, and AI quota handling.
  - `types.ts` for shared product types.
  - `validators.ts` for API input schemas.
- `lib/utils.ts` stays at the top level because shadcn/ui components import it directly.

## Brand And Design Assets

- `public/brand/` stores canonical brand assets served by Next.js.
- `.stitch/` stores Google Stitch design references, prompts, and exported screen artifacts. Raw API responses are ignored by git.
- `docs/DEPLOYMENT.md`, `docs/RELEASE_AUDIT.md`, and `docs/SECURITY_THREAT_MODEL.md` document public-release operations and risk controls.

## Local Generated Files

These are intentionally ignored:

- `.env` and `.env.*` for local secrets.
- `.next/`, `tsconfig.tsbuildinfo`, and `node_modules/`.
- `data/` for local JSON storage fallback.
- `.playwright-cli/` and `output/` for browser-check artifacts.
