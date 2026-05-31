# JobPilot AI Threat Model

## Scope And Assumptions

This model covers the Next.js app, API routes under `app/api`, local JSON storage in `data/jobpilot.json`, and the Gemini integration in `lib/jobpilot/ai.ts`.

Assumptions:
- JobPilot is an open demo with no account authentication.
- A guest cookie scopes one browser session to one local workspace, and a separate visitor cookie scopes AI quota.
- Production uses server-side environment variables for `GEMINI_API_KEY`.
- Local JSON storage remains the source of truth. There is no SQL database.

## Assets

- Guest display names and guest ids.
- Application records, salary values, notes, resume text, job descriptions, and interview notes.
- AI usage counters and daily quota state.
- `GEMINI_API_KEY` and server runtime environment variables.
- Availability of AI endpoints and local JSON storage.

## Entry Points

- `POST /api/session` creates or updates a guest session.
- `PATCH /api/session` records onboarding completion.
- `GET/POST /api/applications` lists and creates applications.
- `GET/PATCH/DELETE /api/applications/[id]` reads, updates, and deletes an application.
- `POST /api/ai/resume` sends resume and job text to the server-side AI proxy.
- `POST /api/ai/interview` generates interview questions.
- `PATCH /api/interview-questions/[id]` updates question notes and practiced state.
- `DELETE /api/local-data` clears workspace records and the guest cookie while preserving daily AI usage counters.
- Resume PDF upload is parsed client-side before text is sent to the API.

## Trust Boundaries

- Browser to API routes over HTTP: untrusted user input enters the server.
- API routes to local JSON file: server code mutates integrity-critical state.
- API routes to Gemini: server sends sanitized user content to an external model provider.
- Server environment to client bundle: secrets must stay server-only.

## Existing And Added Controls

- Zod schemas validate request bodies before storage.
- Shared sanitizers strip tags, angle brackets, control characters, excessive whitespace, and cap field lengths.
- Route ids use a strict `prefix_hex` pattern before lookup.
- AI outputs are sanitized before storage.
- Application ownership checks require `guestId` matches before update, delete, AI resume linkage, and interview generation.
- Critical routes use in-memory rate limits by client IP, and AI routes also rate limit by a server-issued visitor cookie.
- Daily AI usage is enforced against both visitor and hashed-IP quota subjects. Workspace reset does not reset these counters.
- `GEMINI_API_KEY` is read only inside `server-only` code. The client calls internal API routes, not Gemini directly.
- `.env` files and `data/` are ignored by Git.

## Primary Abuse Paths

| Threat | Likelihood | Impact | Priority | Notes |
| --- | --- | --- | --- | --- |
| Stored XSS through application notes, resume text, or AI output | Medium | High | High | Sanitization and React escaping reduce risk. Avoid adding `dangerouslySetInnerHTML`. |
| AI endpoint abuse to consume quota or provider spend | Medium | Medium | Medium | Daily visitor and hashed-IP quotas reduce casual bypasses from clearing guest data or changing browser sessions. VPN/proxy rotation and multi-instance deployments need stronger controls. |
| Cross-guest record modification by guessing ids | Low | Medium | Medium | Id validation and `guestId` ownership checks protect application and question routes. |
| Destructive local data reset abuse | Low | High | Medium | The reset route is rate limited. For shared public hosting, add an admin gate or remove the endpoint. |
| Secret exposure through client bundle | Low | High | Medium | Gemini access stays in `server-only` modules and `.env` remains ignored. |

## Follow-Up Controls

- Replace in-memory rate limits and local JSON quota storage with a shared durable store before running multiple server instances.
- Add CAPTCHA, account verification, payment gates, or provider-side budget limits if the public demo must resist VPN/proxy rotation.
- Add CSRF protection if the app becomes reachable beyond a same-site demo context.
- Add structured audit logs for destructive actions if multiple people operate the same deployment.
- Keep `npm audit` clean during dependency updates.
