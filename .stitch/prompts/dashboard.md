Generate a high-fidelity desktop web app screen for JobPilot AI.

Product direction:
- Open to everyone; no login/register.
- On first use, the app asks only for the visitor's name in a polished modal.
- AI usage is limited to 3 AI actions per day, visible as a small quota indicator.
- The product is a focused job search operating system for tracking applications, reminders, resume analysis, and interview prep.

DESIGN SYSTEM:
- Platform: Web app, desktop-first with mobile collapse.
- Theme: Light, calm productivity dashboard, charcoal/slate neutrals with one green accent.
- Background: Canvas Mist (#F8FAFC).
- Primary Accent: Verdant Action (#2F8F5B), used sparingly for primary actions and active states.
- Text Primary: Charcoal Ink (#18181B).
- Font: Geist Sans for UI, Geist Mono for metrics and timestamps.
- Layout: Sidebar shell, dense-but-readable dashboard, Kanban lanes, focused AI work panels, 8px-or-less card radii, no neon, no oversized hero treatment.
- No emojis, no centered marketing hero, no native browser-looking controls, no purple/blue AI gradients.

Screen:
1. Left sidebar with JobPilot AI wordmark, nav items Dashboard, Applications, Resume Analyzer, Interview Prep, Settings.
2. Top bar greeting "Good morning, Hafiz" with compact search and "Add Application" action.
3. Small name prompt modal overlay as a first-run state: label "What should JobPilot call you?", single name field, primary action "Enter workspace"; modal should look like a shadcn dialog.
4. Dashboard metrics: total applications 18, interview rate 27%, offer rate 5%, submitted this week 4, overdue follow-ups 2.
5. Main content has an asymmetric split: status distribution chart on the left, upcoming follow-ups and AI quota on the right.
6. Recent applications table/list with companies: Linear, Vercel, Tailscale, Ramp, Figma. Include role, status, follow-up date, and source.
7. Include useful empty/loading/error state hints as compact UI patterns, not explanatory marketing text.
