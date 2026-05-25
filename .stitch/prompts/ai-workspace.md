Generate a high-fidelity desktop web app screen for JobPilot AI's AI workspace.

Product direction:
- Open app; no login/register.
- Visitor enters only a name once.
- AI actions are limited to 3 per day to prevent abuse.
- Resume analysis and interview prep are practical portfolio-worthy workflows.

DESIGN SYSTEM:
- Platform: Web app, desktop-first with mobile collapse.
- Theme: Light, calm productivity dashboard, charcoal/slate neutrals with one green accent.
- Background: Canvas Mist (#F8FAFC).
- Primary Accent: Verdant Action (#2F8F5B), used sparingly for primary actions and active states.
- Text Primary: Charcoal Ink (#18181B).
- Font: Geist Sans for UI, Geist Mono for metrics and timestamps.
- Layout: Sidebar shell, dense-but-readable dashboard, Kanban lanes, focused AI work panels, 8px-or-less card radii, no neon, no oversized hero treatment.
- No emojis, no generic AI sparkle decoration, no purple/blue AI gradients, no vague advice.

Screen:
1. Sidebar with Resume Analyzer active and Interview Prep visible.
2. Header with AI quota indicator "1 action left today" and selected application dropdown.
3. Two-column work area: left side has resume text area and job description text area with labels above fields; right side has structured feedback result.
4. Result panel includes score 74, strengths, missing keywords, suggested improvements, rewritten bullet examples, and final recommendation.
5. Include an inline blocked state for quota reached: "Daily AI limit reached. Come back tomorrow to run more AI actions." Keep it calm, not alarmist.
6. Lower section shows Interview Prep checklist grouped by Behavioral, Technical, Role-specific, Company-specific, Questions to ask the interviewer, with practiced checkboxes and answer notes.
7. Loading state should use skeleton blocks matching the result panel, not a spinner.
