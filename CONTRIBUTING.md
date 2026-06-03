# Contributing

Thanks for helping improve JobPilot AI.

## Development Workflow

1. Fork the repository.
2. Create a branch from `main`.
3. Install dependencies with `npm install`.
4. Copy `.env.example` to `.env`.
5. Run `npm run dev`.
6. Open `http://127.0.0.1:3000`.

## Quality Bar

Before opening a pull request, run:

```bash
npm run typecheck
npm run lint
npm run test
npm run build
npm audit --audit-level=moderate
```

## Pull Request Guidelines

- Keep changes focused.
- Use shadcn/ui primitives for interactive UI. Do not add raw native interactive elements in product code.
- Keep copy supportive, clear, and grounded.
- Add or update tests when changing validation, storage, rate limits, route ownership, or quota behavior.
- Avoid adding a database dependency unless the PR includes a full storage adapter and migration notes.
- Do not commit `.env`, `data/`, `.stitch/`, `.agents/`, `.next/`, or generated logs.

## Good First Contributions

- Improve docs, screenshots, or setup instructions.
- Add route or storage tests around existing behavior.
- Tighten accessibility labels, focus states, and loading states.
- Add small UI affordances that use existing components and tokens.

## Commit Style

Use short imperative commit messages:

```text
Add onboarding walkthrough
Fix quota meter
Harden application validation
```

Do not add co-author trailers unless every co-author explicitly requests attribution.
