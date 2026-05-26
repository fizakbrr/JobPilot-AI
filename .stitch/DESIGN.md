# Design System: JobPilot AI

## 1. Visual Theme & Atmosphere
JobPilot AI is a focused productivity dashboard for job seekers. The interface should feel calm, decisive, and work-ready: like a well-organized command center for career momentum. Density is daily-app balanced, variance is asymmetrical but controlled, and motion is fluid through small tactile transitions rather than spectacle.

## 2. Color Palette & Roles
- **Canvas Mist** (#F8FAFC) - primary page background.
- **Pure Surface** (#FFFFFF) - panels, modals, and focused work areas.
- **Charcoal Ink** (#18181B) - primary text.
- **Slate Signal** (#64748B) - descriptions, metadata, secondary labels.
- **Whisper Line** (#E2E8F0) - borders, dividers, and Kanban boundaries.
- **Verdant Action** (#2F8F5B) - the single accent for primary actions, active navigation, success states, and focus rings.
- **Amber Reminder** (#B7791F) - warning-only status indicator for upcoming follow-ups.
- **Redwood Risk** (#B94A48) - destructive or overdue state.

## 3. Typography Rules
- **Display:** Geist Sans, controlled scale, tight tracking, weight-driven hierarchy.
- **Body:** Geist Sans, relaxed leading, maximum 65 characters for descriptive copy.
- **Mono:** Geist Mono for metrics, dates, conversion rates, IDs, and compact status metadata.
- **Banned:** Inter, generic serif fonts, neon purple/blue gradients, pure black.

## 4. Component Stylings
- **Buttons:** shadcn Button only. Verdant primary fill, ghost/outline secondary states, no outer glow, tactile translate on active.
- **Inputs:** shadcn Input, Textarea, Select, Checkbox only. Label above, helper or error text below, 44px minimum height.
- **Cards:** Use for individual applications, metrics, and AI result sections only. Prefer 4px radii, with 2px radii for dense operational surfaces.
- **Overlays:** shadcn Dialog/Sheet only, never native dialog.
- **Loaders:** Use layout-matched skeletons, never circular spinners.
- **Empty States:** Concrete next action with one primary command.

## 5. Layout Principles
- Dashboard-first product, not a marketing-heavy site.
- Sidebar navigation for the open product workspace.
- Kanban board uses horizontal scroll on desktop and single-column status sections on narrow screens.
- Grid-first responsive architecture with strict single-column collapse below 768px.
- No horizontal overflow on mobile except the intentional Kanban board scroll area.
- Avoid equal three-card feature rows. Use asymmetrical dashboard zones and status lanes.

## 6. Design System Notes for Stitch Generation
**DESIGN SYSTEM (REQUIRED):**
- Platform: Web app, desktop-first with mobile collapse.
- Theme: Light precision productivity dashboard, charcoal/slate neutrals with one green accent.
- Background: Canvas Mist (#F8FAFC).
- Primary Accent: Verdant Action (#2F8F5B), used sparingly for primary actions and active states.
- Text Primary: Charcoal Ink (#18181B).
- Font: Geist Sans for UI, Geist Mono for metrics and timestamps.
- Layout: Sidebar shell, dense dashboard, precision Kanban lanes, focused AI work panels, 2-4px card radii, no neon, no oversized hero treatment.

## 7. Anti-Patterns
- No emojis.
- No native interactive controls in implementation.
- No pure black.
- No neon or purple/blue AI gradients.
- No generic names or fake perfect metrics.
- No circular loading spinners.
- No centered marketing-first hero as the primary app screen.
- No overlapping text or controls.
