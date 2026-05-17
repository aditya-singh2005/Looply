<div align="center">

<img src="https://img.shields.io/badge/Looply-Goal%20Tracking%20Portal-1D4ED8?style=for-the-badge&logoColor=white" />

# Looply

### In-House Goal Setting & Tracking Portal

**AtomQuest Hackathon 1.0 — 2026**

[![Live Demo](https://img.shields.io/badge/Live%20Demo-looply--fsc.vercel.app-22c55e?style=flat-square&logo=vercel)](https://looply-fsc.vercel.app/dashboard)
[![GitHub](https://img.shields.io/badge/GitHub-Repository-181717?style=flat-square&logo=github)](https://github.com/aditya-singh2005/Looply)
[![Architecture](https://img.shields.io/badge/Architecture-Diagram-6366f1?style=flat-square)](https://gitdiagram.com/aditya-singh2005/Looply)
[![Next.js](https://img.shields.io/badge/Next.js-14-black?style=flat-square&logo=next.js)](https://nextjs.org)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?style=flat-square&logo=supabase)](https://supabase.com)
[![Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?style=flat-square&logo=vercel)](https://vercel.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Tailwind](https://img.shields.io/badge/Tailwind-CSS-38BDF8?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)

</div>

---

## 🚀 Live Links

| Resource | Link |
|----------|------|
| 🌐 Live Portal | [https://looply-fsc.vercel.app/dashboard](https://looply-fsc.vercel.app/dashboard) |
| 💻 Source Code | [github.com/aditya-singh2005/Looply](https://github.com/aditya-singh2005/Looply) |
| 🏗️ Architecture Diagram | [gitdiagram.com/aditya-singh2005/Looply](https://gitdiagram.com/aditya-singh2005/Looply) |

> **For Evaluators:** Use the **Role Switcher** chip in the top-right corner of the portal to instantly switch between Employee, Manager, and Admin — no separate logins or credentials needed.

---

## 📋 Table of Contents

- [Problem Statement](#-problem-statement)
- [Tech Stack](#-tech-stack)
- [Features](#-features)
- [User Roles](#-user-roles)
- [Score Computation Engine](#-score-computation-engine)
- [BRD Validation Rules](#-brd-validation-rules)
- [Project Structure](#-project-structure)
- [Architecture](#-architecture)
- [Getting Started](#-getting-started)
- [Environment Variables](#-environment-variables)
- [Demo Walkthrough](#-demo-walkthrough)

---

## 🎯 Problem Statement

Organisations relying on spreadsheets and emails for goal tracking face three core failures:

- **No real-time visibility** — managers cannot monitor team progress without waiting for periodic reviews
- **Misalignment** — employees are unclear how their day-to-day work connects to organisational priorities
- **Audit gaps** — HR teams piece together data at appraisal time with no immutable change history

**Looply** eliminates all three pain points with a structured, digital goal lifecycle:

```
Create → Submit → Approve → Track → Check-in → Report
```

Every step is role-gated, time-windowed, and audit-logged — giving managers real-time visibility, employees clarity, and HR a complete, tamper-evident record.

---

## 🛠️ Tech Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Framework | Next.js 14 (App Router) | Server components, edge middleware, file-based routing |
| Language | TypeScript 5 | Full type safety across client and server code |
| UI Library | shadcn/ui + Tailwind CSS | Accessible component primitives; utility-first styling |
| Forms & Validation | react-hook-form + Zod | Schema-driven validation with zero boilerplate |
| Database | Supabase (PostgreSQL) | Row-Level Security, real-time subscriptions, SSR auth |
| Authentication | Supabase SSR + Cookie Sessions | Server-side session management with middleware refresh |
| Charts | Recharts | Lightweight, composable charting for dashboards |
| CSV Export | PapaParse | Client-side CSV generation — no server round-trip required |
| Hosting | Vercel (Edge Network) | Zero-config CI/CD, global CDN, serverless functions |

---

## ✅ Features

### Phase 1 — Goal Creation & Approval

- **Multi-step Goal Wizard** guided flow: Thrust Area → Title/Description → UoM Type → Target → Weightage
- **Four UoM Types** fully supported: Numeric Min, Numeric Max, Timeline, Zero
- **Live Weightage Bar** updates in real time as goals are added, showing remaining allocation
- **Validation Rules** enforced at both client (Zod schema) and server (API route + DB constraints):
  - Total weightage across all goals must equal **100%**
  - Minimum **10%** weightage per individual goal
  - Maximum **8 goals** per employee per cycle
- **Manager Approval Workflow** — inline editing of targets and weightages during review; Approve or Return-for-Rework with comments
- **Goal Locking** — goals become immutable on approval; `locked_at` timestamp is set; no further edits without Admin intervention
- **Shared Goals** — Admin pushes a departmental KPI to multiple employees; recipients can adjust weightage only; Goal Title and Target are read-only; achievement updates by the primary owner sync across all linked sheets

### Phase 2 — Achievement Tracking & Quarterly Check-ins

- **Quarterly Achievement Entry** — employees log actual values against planned targets for each active quarter
- **Per-goal Status Selection** — Not Started / On Track / At Risk / Off Track / Completed
- **Auto-computed Progress Score** — calculated live from the score engine and displayed via `ScorePill` component
- **Manager Check-in Module** — Planned vs. Actual view per team member; structured Check-in Comment field for documenting discussions
- **Check-in Window Enforcement** — portal enforces quarterly windows; submission UI is disabled outside the active period
- **Time-Travel Widget** — dev/demo floating widget to simulate any date for testing window logic without waiting for the real calendar quarter

### Admin & Governance

- **Cycle Management** — create, activate, and close performance cycles with configurable date windows for each quarter
- **Audit Trail** — every post-lock change and approval action is logged with user ID, goal ID, action type, and full JSON diffs (`old_value` / `new_value`)
- **Achievement Report** — exportable CSV of Planned vs. Actual for all employees; generated client-side via PapaParse
- **Completion Dashboard** — real-time view of org-wide goal submission rates, manager approval rates, and quarterly check-in completion

---

## 👥 User Roles

| Role | Capabilities |
|------|-------------|
| **Employee** | Create & edit goals pre-submission · Submit for manager approval · View own locked goals · Enter quarterly actuals · View own computed progress scores |
| **Manager (L1)** | Team dashboard with all direct reports · Inline target/weightage editing during approval · Approve or Return-for-Rework · Log structured check-in comments · Team check-in completion status view |
| **Admin / HR** | Full cycle management · Push shared departmental goals · Searchable & filterable Audit Log · Export Achievement Report (CSV) · Goal unlock capability for exception handling |

---

## 📊 Score Computation Engine

Scores are computed in [`src/lib/utils/score.ts`](src/lib/utils/score.ts) and capped at 100%.

| UoM Type | Description | Formula |
|----------|-------------|---------|
| **Numeric Min** | Higher is better — e.g. Sales Revenue | `(Achievement ÷ Target) × 100` |
| **Numeric Max** | Lower is better — e.g. TAT, Cost | `(Target ÷ Achievement) × 100` |
| **Timeline** | Date-based completion | `100%` if on/before deadline; 5% penalty per day late |
| **Zero** | Zero = success — e.g. Safety incidents | `If actual = 0 → 100%, else → 0%` |

---

## 🔢 BRD Validation Rules

All rules from the Business Requirements Document are enforced at two layers — client-side for immediate UX feedback, server-side for data integrity.

| BRD Rule | Implementation | Enforced At |
|----------|---------------|------------|
| Total weightage = 100% | `validateWeightage()` in `lib/utils/weightage.ts` | Client (Zod) + pre-submit guard |
| Min weightage per goal = 10% | `z.number().min(10)` in GoalWizard schema | Client (Zod) + DB check constraint |
| Max 8 goals per employee | `MAX_GOALS = 8` constant checked before create | Client guard + API route handler |
| Goals locked after approval | `locked_at` timestamp set on approval; UI blocks edits | API route + UI conditional rendering |
| Shared goal title/target read-only | `is_shared` flag; fields disabled in wizard | UI conditional + RLS policy |
| Achievement synced from primary owner | `shared_from_goal_id` FK; server-side sync on update | API route handler |
| Check-in window enforcement | `isWindowOpen()` checks cycle date ranges | Client (wizard disabled when closed) |

---

## 📂 Project Structure

```
src/
├── app/
│   ├── (portal)/
│   │   ├── admin/
│   │   │   ├── page.tsx              # Admin overview & completion dashboard
│   │   │   ├── cycles/page.tsx       # Cycle management
│   │   │   ├── shared-goals/page.tsx # Push shared goals to employees
│   │   │   ├── audit/page.tsx        # Filterable audit log
│   │   │   └── reports/page.tsx      # Achievement report + CSV export
│   │   ├── goals/
│   │   │   ├── page.tsx              # My Goals list with filters
│   │   │   ├── new/page.tsx          # New goal wizard entry
│   │   │   └── [id]/page.tsx         # Goal detail & edit view
│   │   ├── checkin/
│   │   │   └── page.tsx              # Quarterly check-in entry
│   │   └── manager/
│   │       ├── team/page.tsx         # Team goals view
│   │       └── checkins/page.tsx     # Team check-in status
│   ├── api/
│   │   ├── goals/[id]/approve/       # Approval route handler + audit write
│   │   └── seed/route.ts             # Demo data seeder
│   ├── dashboard/                    # Role-aware entry dashboards
│   ├── login/page.tsx
│   └── signup/page.tsx
├── components/
│   ├── goals/
│   │   ├── GoalWizard.tsx            # Multi-step goal creation form
│   │   ├── GoalRow.tsx               # Single goal row with status
│   │   ├── GoalDetailPage.tsx        # Full goal view & manager editing
│   │   ├── WeightageBar.tsx          # Live weightage allocation bar
│   │   ├── FilterPills.tsx           # Status filter chips
│   │   └── GoalStatusBadge.tsx       # Coloured status chip
│   ├── checkin/
│   │   ├── QuarterlyCheckinPage.tsx  # Achievement entry form
│   │   └── ScorePill.tsx             # Computed score display
│   ├── dashboard/
│   │   ├── EmployeeDashboard.tsx     # Employee home with progress rings
│   │   └── ManagerDashboard.tsx      # Manager home with team summary
│   ├── layout/
│   │   ├── AppShell.tsx              # Root layout wrapper
│   │   ├── Sidebar.tsx               # Role-aware navigation sidebar
│   │   ├── Topbar.tsx                # Top bar with user info
│   │   ├── RoleSwitcher.tsx          # One-click role switching (demo)
│   │   └── TimeTravelWidget.tsx      # Date simulator for window testing
│   ├── shared/
│   │   ├── ProgressRing.tsx          # SVG progress ring component
│   │   ├── ThrustAreaBadge.tsx       # Colour-coded thrust area chip
│   │   ├── EmptyState.tsx            # Empty list placeholder
│   │   └── SkeletonRow.tsx           # Loading skeleton
│   └── ui/                           # shadcn/ui component library
├── lib/
│   ├── supabase/
│   │   ├── client.ts                 # Browser Supabase client
│   │   ├── server.ts                 # Server Supabase client (SSR)
│   │   └── audit.ts                  # logAudit() helper
│   ├── hooks/
│   │   ├── useRole.ts                # Current role context hook
│   │   ├── useGoals.ts               # Goals data fetching hook
│   │   └── useUser.ts                # Current user hook
│   ├── context/                      # React context providers
│   └── utils/
│       ├── score.ts                  # computeScore() — all 4 UoM formulas
│       ├── weightage.ts              # validateWeightage() — 100% rule
│       ├── goal-format.ts            # UOM labels, status labels
│       └── dates.ts                  # Quarter window helpers
├── types/index.ts                    # Central TypeScript type definitions
├── constants/index.ts                # IDs, nav config, MAX_GOALS, MIN_WEIGHTAGE
└── middleware.ts                     # Session refresh + route protection
```

---

## 🏗️ Architecture

Full interactive diagram → [gitdiagram.com/aditya-singh2005/Looply](https://gitdiagram.com/aditya-singh2005/Looply)

```
┌──────────────────────────────────────────────────────────────┐
│                        Vercel Edge                           │
│                                                              │
│  ┌─────────────────────┐      ┌────────────────────────────┐ │
│  │    Next.js 14        │      │     Route Handlers         │ │
│  │    App Router        │─────▶│  POST /api/goals/approve   │ │
│  │                      │      │  POST /api/seed            │ │
│  │  Server Components   │      └────────────┬───────────────┘ │
│  │  (data fetch + SSR)  │                   │               │
│  │         +            │      ┌────────────▼───────────────┐ │
│  │  Client Components   │─────▶│        Supabase            │ │
│  │  (interactive UI)    │      │  PostgreSQL + RLS Policies │ │
│  └──────────┬───────────┘      │  Auth (SSR cookies)        │ │
│             │                  │  Audit Logs Table          │ │
│  ┌──────────▼───────────┐      └────────────────────────────┘ │
│  │     Middleware        │                                    │
│  │   src/middleware.ts   │  Refreshes Supabase session on    │
│  │                       │  every request; blocks unauthd    │
│  │                       │  access to all /portal routes     │
│  └───────────────────────┘                                    │
└──────────────────────────────────────────────────────────────┘

Data Flow:
Employee → Goal Wizard → Supabase (draft)
       → Submit → Manager notified
Manager → Approve → locked_at set → Audit log written
Employee → Quarterly Check-in → Score computed → Supabase
Admin    → Reports → PapaParse → CSV downloaded
```

---

## 🏁 Getting Started

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project (free tier is sufficient)

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/aditya-singh2005/Looply.git
cd Looply

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env.local
# Fill in your Supabase URL and anon key (see below)

# 4. Run the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Seed Demo Data

Navigate to `/api/seed` in your browser once the app is running to populate the database with demo users, a cycle, thrust areas, and sample goals.

---

## 🔐 Environment Variables

Create a `.env.local` file in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Both values are available in your Supabase project under **Settings → API**.

---

## 🎬 Demo Walkthrough

> **Tip:** Use the **Time-Travel Widget** (floating clock icon in the top bar) to simulate any date and test quarterly window enforcement — no need to wait for July, October, or January.

### Step 1 — Employee Journey

1. Open the portal — the role chip shows **Employee** by default
2. Go to **My Goals → New Goal**
3. Complete the wizard: select a Thrust Area → enter Title → choose UoM type → set Target → set Weightage
4. Add 2–3 more goals until the total weightage reaches exactly 100%
5. Click **Submit for Approval** — goals move to *Pending* status

### Step 2 — Manager Journey

1. Click the role chip → switch to **Manager**
2. Go to **Team Goals** — submitted goals appear as *Pending Approval*
3. Click a goal → review details → optionally edit a target or weightage inline
4. Click **Approve** — the goal is locked; employees can no longer edit it
5. Or click **Return for Rework** with a comment to send it back

### Step 3 — Quarterly Check-in

1. Switch role back to **Employee** → go to **Check-ins**
2. *(Use the Time-Travel Widget to set the date to July if the Q1 window isn't open yet)*
3. Enter actual achievement values for each goal
4. Select a status per goal (On Track, Completed, etc.)
5. Save — the auto-computed **progress score** appears in the ScorePill

### Step 4 — Admin Journey

1. Click the role chip → switch to **Admin**
2. **Overview** — view org-wide submission and approval completion rates
3. **Cycle Management** — inspect or modify the active performance cycle
4. **Shared Goals** — push a departmental KPI to multiple employees
5. **Audit Log** — verify every approval, return, and post-lock edit is logged with user and timestamp
6. **Reports** — click Export CSV to download the full Planned vs. Actual achievement report

---

## 📄 Submission Details

| Field | Detail |
|-------|--------|
| Event | AtomQuest Hackathon 1.0 — 2026 |
| Problem Statement | In-House Goal Setting & Tracking Portal |
| Live Demo | [https://looply-fsc.vercel.app/dashboard](https://looply-fsc.vercel.app/dashboard) |
| Source Code | [github.com/aditya-singh2005/Looply](https://github.com/aditya-singh2005/Looply) |
| Architecture Diagram | [gitdiagram.com/aditya-singh2005/Looply](https://gitdiagram.com/aditya-singh2005/Looply) |
| Stack | Next.js 14 · TypeScript · Supabase · Tailwind CSS · Vercel |

---

<div align="center">

Made with ☕ and way too many Supabase queries

**[⬆ Back to top](#looply)**

</div>
