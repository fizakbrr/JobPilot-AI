# JobPilot AI Product Requirements Document

**Version:** 1.0  
**Author:** Product Owner  
**Project Type:** Portfolio / SaaS-style Product  
**Status:** MVP Planning  
**Last Updated:** May 21, 2026

---

## Implementation Update

The MVP now uses an open demo model instead of account authentication. A visitor enters only a display name to start. Data remains scoped to that guest session, and AI-related actions are limited to 3 per guest per day to reduce abuse.

## 1. Overview

### Product Name

JobPilot AI

### Tagline

Your personal operating system for job hunting.

### Vision

JobPilot AI helps job seekers manage applications, improve resumes, prepare for interviews, and organize their job search process in one centralized platform.

Instead of relying on spreadsheets, notes apps, scattered emails, and memory, users can track progress visually and receive AI-assisted support throughout the hiring journey.

---

## 2. Problem Statement

Job seekers, especially fresh graduates and junior developers, often struggle to stay organized during the application process.

Common problems include:

- Difficulty tracking job applications across many companies
- Poor visibility into interview stages and next steps
- Repetitive resume tailoring for different job descriptions
- Low confidence before interviews
- Missed follow-ups and deadlines
- No clear insight into application conversion rates

Current workflows are usually fragmented across spreadsheets, notes apps, email inboxes, job boards, and calendar reminders.

---

## 3. Proposed Solution

Build an AI-powered job application management platform that enables users to:

- Track job applications visually
- Organize each opportunity by hiring stage
- Analyze resumes for clarity and ATS readiness
- Generate interview preparation questions
- Monitor job search performance through analytics
- Stay consistent through reminders and follow-up prompts

---

## 4. Target Audience

### Primary Users

- Fresh graduates
- Junior frontend developers
- Junior software engineers
- Bootcamp graduates
- Career switchers
- Internship seekers

### Secondary Users

- Mid-level professionals applying to many roles at once
- Freelancers tracking client opportunities
- Students preparing for internship seasons

---

## 5. Goals

The MVP should help users:

1. Track all job applications in one place.
2. Understand the status of each application.
3. Improve resume quality with AI support.
4. Prepare for interviews based on role and company.
5. Monitor job search progress with simple metrics.

---

## 6. Non-Goals

The MVP will not include:

- Direct job board scraping
- Automated job applications
- Employer-side hiring tools
- Payment or subscription billing
- Complex CRM automation
- Browser extension support
- Mobile native apps

These may be considered after the MVP if the core workflow proves useful.

---

## 7. Core Value Proposition

Track applications, improve your resume, and prepare for interviews in one focused workspace.

---

## 8. MVP Scope

The MVP should prioritize practical, portfolio-worthy features that demonstrate full-stack product thinking, clean UI, session-scoped data modeling, and useful AI integration.

### Feature 1: Open Guest Workspace

#### Purpose

Allow visitors to try the app without registration while keeping each browser session scoped to its own workspace.

#### Requirements

- User can enter a display name to start.
- Guest session persists after refresh.
- Guest data is scoped to the current guest session.
- AI-related actions are limited to 3 per day.

#### Suggested Tech

- HTTP-only session cookie
- Server-side quota tracking

---

### Feature 2: Job Application Tracker

#### Purpose

Provide a visual system for managing job applications.

#### User Story

As a job seeker, I want to track my applications so I know where I stand in the hiring process.

#### Requirements

- User can create a job application.
- User can edit an existing job application.
- User can delete a job application.
- User can move an application between statuses.
- User can view all applications in a Kanban board.
- User can search or filter applications by company, role, status, or source.

#### Data Fields

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| Company Name | String | Yes | Example: Google |
| Role | String | Yes | Example: Frontend Developer |
| Location | String | No | Remote, hybrid, or city |
| Salary | Number | No | Optional expected salary |
| Source Platform | String | No | LinkedIn, Glints, Indeed, referral |
| Job URL | String | No | Link to job post |
| Application Date | Date | Yes | Defaults to current date |
| Status | Enum | Yes | Current hiring stage |
| Notes | Text | No | Freeform notes |
| Follow-up Date | Date | No | Optional reminder date |

#### Statuses

- Wishlist
- Applied
- Screening
- Technical Interview
- HR Interview
- Offer
- Rejected

#### UI Requirement

Use a Kanban board interface.

Example flow:

```text
Wishlist -> Applied -> Screening -> Technical Interview -> HR Interview -> Offer -> Rejected
```

#### Acceptance Criteria

- A visitor can add a new application from the dashboard after entering a display name.
- A visitor can drag or update an application to another status.
- Applications persist after page refresh.
- A user cannot see another user's applications.

---

### Feature 3: Application Detail Page

#### Purpose

Give each job opportunity a dedicated workspace.

#### Requirements

- Show company, role, status, source, salary, URL, and notes.
- Show application timeline.
- Allow status updates.
- Allow notes editing.
- Allow follow-up date editing.
- Display AI-generated interview questions if available.
- Display resume analysis history if available.

#### Acceptance Criteria

- User can open an application from the Kanban board.
- User can update the application without leaving the detail page.
- Changes are saved and reflected on the dashboard.

---

### Feature 4: Resume Analyzer

#### Purpose

Help users improve their resume for a specific job role.

#### User Story

As a job seeker, I want feedback on my resume so I can improve my chances of passing recruiter and ATS screening.

#### Requirements

- User can paste resume text.
- User can paste a job description.
- AI returns structured feedback.
- AI highlights missing skills or keywords.
- AI suggests clearer bullet points.
- AI gives an overall readiness score.

#### AI Output Format

- Overall score from 0 to 100
- Strengths
- Missing keywords
- Suggested improvements
- Rewritten bullet examples
- Final recommendation

#### Acceptance Criteria

- User receives readable, structured feedback.
- Feedback is relevant to the submitted job description.
- User can associate an analysis with a job application.

---

### Feature 5: Interview Preparation

#### Purpose

Help users prepare for interviews based on the role, company, and job description.

#### Requirements

- User can generate interview questions for an application.
- Questions are grouped by category.
- User can save generated questions.
- User can mark questions as practiced.
- User can add notes to answers.

#### Question Categories

- Behavioral
- Technical
- Role-specific
- Company-specific
- Questions to ask the interviewer

#### Acceptance Criteria

- User can generate questions from an application detail page.
- Generated questions are saved to the selected application.
- User can mark practice progress.

---

### Feature 6: Dashboard Analytics

#### Purpose

Give users a simple overview of their job search progress.

#### Requirements

- Total applications
- Applications by status
- Interview rate
- Offer rate
- Rejection count
- Applications submitted this week
- Upcoming follow-ups

#### Acceptance Criteria

- Dashboard metrics update when applications change.
- Empty states are shown for new users.
- Analytics are scoped to the current guest session.

---

### Feature 7: Reminders and Follow-ups

#### Purpose

Help users stay consistent and avoid missed opportunities.

#### Requirements

- User can set a follow-up date for an application.
- Dashboard shows upcoming follow-ups.
- Application cards show follow-up indicators.
- Overdue follow-ups are visually distinct.

#### Acceptance Criteria

- User can add, edit, and remove follow-up dates.
- Upcoming and overdue follow-ups are visible on the dashboard.

---

## 9. Suggested Pages

### App Views

- Dashboard
- Applications Kanban board
- Add application page or modal
- Application detail page
- Resume analyzer page
- Interview prep page
- Settings page

---

## 10. User Flows

### Flow 1: Create Application

1. User enters a display name.
2. User opens dashboard.
3. User clicks "Add Application".
4. User enters company, role, source, date, and notes.
5. User saves the application.
6. Application appears in the selected Kanban column.

### Flow 2: Update Application Status

1. User opens the Kanban board.
2. User selects an application card.
3. User changes the status.
4. Application moves to the new status column.
5. Dashboard analytics update.

### Flow 3: Analyze Resume

1. User opens resume analyzer.
2. User pastes resume text.
3. User pastes job description.
4. User clicks "Analyze".
5. AI returns structured feedback.
6. User optionally saves feedback to an application.

### Flow 4: Prepare for Interview

1. User opens an application detail page.
2. User clicks "Generate Interview Questions".
3. AI creates question groups.
4. User practices questions.
5. User marks questions as practiced and adds notes.

---

## 11. Data Model

### Guest

| Field | Type |
| --- | --- |
| id | String |
| name | String |
| createdAt | DateTime |
| updatedAt | DateTime |

### Application

| Field | Type |
| --- | --- |
| id | String |
| guestId | String |
| companyName | String |
| role | String |
| location | String |
| salary | Number |
| sourcePlatform | String |
| jobUrl | String |
| applicationDate | DateTime |
| status | Enum |
| notes | String |
| followUpDate | DateTime |
| createdAt | DateTime |
| updatedAt | DateTime |

### ResumeAnalysis

| Field | Type |
| --- | --- |
| id | String |
| guestId | String |
| applicationId | String |
| resumeText | Text |
| jobDescription | Text |
| score | Number |
| strengths | JSON |
| missingKeywords | JSON |
| suggestions | JSON |
| rewrittenBullets | JSON |
| createdAt | DateTime |

### InterviewQuestion

| Field | Type |
| --- | --- |
| id | String |
| guestId | String |
| applicationId | String |
| category | String |
| question | Text |
| answerNotes | Text |
| practiced | Boolean |
| createdAt | DateTime |
| updatedAt | DateTime |

---

## 12. AI Requirements

### AI Use Cases

- Resume analysis
- Job description keyword extraction
- Resume bullet rewriting
- Interview question generation
- Follow-up email draft generation, optional after MVP

### AI Quality Requirements

- Responses should be structured and easy to scan.
- Responses should avoid vague advice.
- Resume feedback should be specific to the job description.
- Interview questions should match the role and seniority level.
- The app should handle AI errors gracefully.

### AI Safety Requirements

- Do not guarantee job outcomes.
- Do not fabricate certifications, experience, education, or skills.
- Make rewritten resume bullets truthful and based only on user-provided content.
- Tell users to review AI-generated text before using it externally.

---

## 13. UX Requirements

### Design Direction

The product should feel like a focused productivity dashboard, not a marketing-heavy landing page.

Preferred qualities:

- Clean and modern interface
- Clear information hierarchy
- Fast scanning of application status
- Calm color palette with strong status indicators
- Responsive design for desktop and mobile
- Useful empty states for first-time users

### Key UI Components

- Sidebar navigation
- Dashboard metric cards
- Kanban board
- Application cards
- Add/edit application modal
- Search and filter controls
- Resume analysis result panel
- Interview preparation checklist
- Follow-up reminder list

---

## 14. Technical Requirements

### Suggested Stack

- Next.js
- TypeScript
- Tailwind CSS
- PostgreSQL
- Prisma or Drizzle
- Clerk, Auth.js, or Supabase Auth
- OpenAI API or compatible AI provider

### Functional Requirements

- Server-side data validation
- Client-side form validation
- Authenticated API routes
- Per-user data isolation
- Loading, empty, success, and error states
- Responsive layout

### Non-Functional Requirements

- Pages should load quickly for normal dashboard usage.
- AI requests should show loading states.
- Failed AI requests should not break saved application data.
- Database schema should support future expansion.
- Sensitive user data should not be exposed in client logs.

---

## 15. Success Metrics

MVP success can be measured by:

- User can create and manage applications end to end.
- User can generate useful resume feedback.
- User can generate useful interview questions.
- User can view meaningful job search analytics.
- Product can be demonstrated clearly in a portfolio or case study.

Potential product metrics:

- Number of applications added per user
- Percentage of applications with follow-up dates
- Number of resume analyses generated
- Number of interview questions practiced
- Weekly active users

---

## 16. MVP Milestones

### Milestone 1: Foundation

- Project setup
- Authentication
- Database setup
- Protected dashboard layout

### Milestone 2: Application Tracker

- Application CRUD
- Kanban board
- Application detail page
- Status updates

### Milestone 3: AI Features

- Resume analyzer
- Interview question generator
- Save AI outputs to application records

### Milestone 4: Dashboard Polish

- Analytics
- Follow-up reminders
- Empty states
- Responsive styling

### Milestone 5: Final Portfolio Readiness

- Seed/demo data
- Error handling pass
- README
- Deployment
- Demo walkthrough

---

## 17. Future Enhancements

- Follow-up email generator
- Calendar integration
- File upload for resume PDF/DOCX
- Job description parser from URL
- Browser extension for saving jobs
- Multiple resumes per user
- AI cover letter generator
- Networking contact tracker
- Application timeline history
- Export to CSV
- Mobile app
- Subscription billing

---

## 18. Risks and Mitigations

| Risk | Impact | Mitigation |
| --- | --- | --- |
| AI feedback is too generic | Users may not trust results | Use structured prompts with job-specific context |
| Users enter sensitive data | Privacy concerns | Avoid unnecessary logging and clearly communicate data usage |
| Kanban becomes cluttered | Poor usability | Add search, filters, and archived applications later |
| Resume parsing is complex | Slower MVP | Start with pasted text before file uploads |
| Scope becomes too large | Delayed delivery | Keep MVP focused on tracker, resume analysis, and interview prep |

---

## 19. Open Questions

- Should guest sessions later support optional account sync?
- Should the first version support resume file uploads or pasted text only?
- Should AI usage be limited per user?
- Should applications have activity history in the MVP?
- Should reminders be in-app only or email-based?

---

## 20. Final MVP Definition

The MVP is complete when a user can:

1. Enter a display name and open the workspace.
2. Add and manage job applications.
3. Track applications visually by status.
4. Open a detailed view for each application.
5. Analyze a resume against a job description.
6. Generate interview questions for a role.
7. View dashboard analytics and follow-up reminders.

This version should be strong enough to demonstrate as a polished full-stack AI SaaS portfolio project.
