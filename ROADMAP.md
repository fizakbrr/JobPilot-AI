# Roadmap

## Near Term

- Add route-handler tests for guest ownership, destructive actions, and AI quota behavior.
- Add Playwright smoke tests for onboarding, creating an application, and saving interview notes.
- Split `components/jobpilot/jobpilot-app.tsx` into view, form, card, and hook modules.
- Add import/export controls for workspace data.
- Improve mobile application tracking with a grouped list view.

## Medium Term

- Introduce a storage adapter interface with JSON and durable database implementations.
- Move rate limiting and AI quota counters to shared durable infrastructure for hosted demos.
- Add analysis history per application.
- Add a real help panel and keyboard shortcuts.
- Add changelog discipline for public releases.

## Later

- Optional authenticated workspaces.
- Calendar export for follow-ups and interviews.
- Job posting import from URL.
- Multi-resume comparison per application.
