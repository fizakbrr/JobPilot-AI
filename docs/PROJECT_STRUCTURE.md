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
  - `guest.ts` for name-only guest sessions.
  - `store.ts` for durable storage, local fallback storage, IDs, analytics, and AI quota handling.
  - `types.ts` for shared product types.
  - `validators.ts` for API input schemas.
- `lib/utils.ts` stays at the top level because shadcn/ui components import it directly.

## Brand And Design Assets

- `assets/brand/` stores source brand assets.
- `public/brand/` stores runtime brand assets served by Next.js.
- `.stitch/` stores Google Stitch design references, prompts, and exported screen artifacts. Raw API responses are ignored by git.

## Local Generated Files

These are intentionally ignored:

- `.env` and `.env.*` for local secrets.
- `.next/`, `tsconfig.tsbuildinfo`, and `node_modules/`.
- `data/` for local JSON storage fallback.
- `.playwright-cli/` and `output/` for browser-check artifacts.
