Generate a high-fidelity desktop web app screen for JobPilot AI's applications Kanban board.

Product direction:
- Open app; no authentication UI.
- Visitor is identified by a local name session only.
- AI usage limited to 3 actions per day; show quota as "AI actions 2 / 3 today".

DESIGN SYSTEM:
- Platform: Web app, desktop-first with mobile collapse.
- Theme: Light, calm productivity dashboard, charcoal/slate neutrals with one green accent.
- Background: Canvas Mist (#F8FAFC).
- Primary Accent: Verdant Action (#2F8F5B), used sparingly for primary actions and active states.
- Text Primary: Charcoal Ink (#18181B).
- Font: Geist Sans for UI, Geist Mono for metrics and timestamps.
- Layout: Sidebar shell, dense-but-readable dashboard, Kanban lanes, focused AI work panels, 8px-or-less card radii, no neon, no oversized hero treatment.
- No emojis, no neon, no purple/blue AI gradients, no generic names, no native browser-looking controls.

Screen:
1. Sidebar navigation with Applications active.
2. Header row: title "Applications", search field, status/source filters, "Add Application" action.
3. Horizontal Kanban board with lanes: Wishlist, Applied, Screening, Technical Interview, HR Interview, Offer, Rejected.
4. Each lane has compact count, faint divider, and cards with company, role, source, salary, application date, follow-up indicator.
5. Overdue follow-ups are visually distinct using Redwood Risk (#B94A48), upcoming reminders use Amber Reminder (#B7791F).
6. Include a right-side sheet or modal preview for "Add application" with shadcn-like fields: Company, Role, Location, Salary, Source, Job URL, Application date, Status, Notes, Follow-up date.
7. Cards should feel draggable without using gimmicky decoration.
