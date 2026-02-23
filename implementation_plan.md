# SyndicPulse — Implementation Plan
> Technical reference for active development · Updated Feb 2026

---

## Project Identity

**SyndicPulse** is the platform brand. It is a multi-tenant SaaS sold to Moroccan residential syndic managers.
**Lotinor · Tanger** is the first pilot property — it appears as the active building for the `syndic_manager` role.
The `super_admin` role (platform owner) sees all buildings via a building switcher.

---

## Current Stack

| Layer | Technology | Status |
|---|---|---|
| Frontend | Vite + React (no TypeScript) | Active |
| Styling | Tailwind CSS via CDN + custom CSS classes | Active (migrate to npm later) |
| Animations | Framer Motion | Active |
| Icons | Lucide-React | Active |
| Auth + DB | Supabase (mock client in Phase 0) | Mock → real swap pending |
| Hosting | Local dev (Vercel target) | — |

**Theme:** Navy dark — `#0a0f1e` background, `#111d35` cards, `#06b6d4` cyan accent.
**CSS custom classes defined in `src/index.css`:** `glass-card`, `nav-active`, `glow-cyan`, `pulse-dot`, `shimmer`.

---

## Key Files

| File | Purpose |
|---|---|
| `src/lib/mockData.js` | All mock data — swap individual datasets with Supabase queries |
| `src/lib/supabase.js` | Mock Supabase client — identical interface to real `@supabase/supabase-js` |
| `src/context/AuthContext.jsx` | Auth state, role detection, building access, login/logout |
| `src/pages/LoginPage.jsx` | French login page with demo credential hints (dev only) |
| `src/App.jsx` | Root routing (loading → login → dashboard) + all 4 page components |
| `src/components/AIVoiceAgent.jsx` | Simulated AI voice agent demo (Darija + French scenarios) |
| `supabase/schema.sql` | Full production PostgreSQL schema with RLS policies |
| `.env.example` | Template for all environment variables |
| `ROADMAP.md` | Strategic roadmap — the authoritative reference for all phases |

---

## Auth Model

### Demo credentials (Phase 0 mock)
| Email | Password | Role | Sees |
|---|---|---|---|
| admin@syndicpulse.ma | admin | `super_admin` | All buildings + switcher |
| omar@lotinor.ma | omar | `syndic_manager` | Lotinor only, no switcher |
| sara@atlas.ma | sara | `syndic_manager` | Résidence Atlas only |

### How auth works (mock)
1. `supabase.auth.signInWithPassword()` → checks `DEMO_USERS` array in `mockData.js`
2. Returns `{ data: { user, session: { user, access_token } }, error }` — matches real Supabase shape
3. `AuthContext.login()` reads `data.session?.user ?? data.user`, calls `setUser()` + `initBuilding()`
4. `initBuilding()` filters `BUILDINGS` by `user.accessible_building_ids`, sets first as `activeBuilding`
5. `canSwitchBuildings = user.role === 'super_admin'` — building switcher only shown to super_admin

### How to go production
Replace `src/lib/supabase.js` with:
```js
import { createClient } from '@supabase/supabase-js'
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)
```
No other file needs to change — the interface is identical.

---

## Data Ingestion Strategy

### Three channels (in order of implementation)

**Channel 1 — Manual dashboard entry (Phase 0-1)**
Syndic uses the UI to enter: charges, payments received, expenses, residents, units.
Replaces Excel. This is where 90% of data originates in the pilot phase.

**Channel 2 — Bulk CSV/Excel import (Phase 1, onboarding)**
Syndic uploads their existing spreadsheet on first onboarding.
Parsed client-side → column mapping → bulk insert into Supabase.
Required for adoption: no one will re-enter 2 years of history manually.

**Channel 3 — Payment gateway webhooks (Phase 2-3)**
CMI or WafaCash fires a webhook on successful payment → Supabase Edge Function → marks payment as `paid` automatically.
Zero manual entry for online payments. The target state for the platform.

### Manual vs. automated breakdown

| Data type | Now (manual) | Later (automated) |
|---|---|---|
| Monthly charges | Syndic declares once/month | Auto-generate from charge templates |
| Payments received | Syndic marks each receipt | CMI/WafaCash webhook |
| Expenses | Syndic logs + uploads invoice | Receipt OCR via GPT-4 Vision |
| Residents & units | Manual on onboarding | CSV bulk import |
| WhatsApp messages | Auto-sent by backend | Twilio webhooks log replies |
| Meeting PVs | AI-drafted, syndic approves | Vapi transcript → GPT-4o |

---

## Phase 0 — Active Work

### Completed
- [x] Mock Supabase client (identical interface to real library)
- [x] Auth context with role-based access
- [x] French login page with demo credentials
- [x] Dashboard: KPI cards, bar chart (pixel-height fix), expense breakdown
- [x] Financials page
- [x] Residents page
- [x] Disputes page
- [x] Building switcher (super_admin only)
- [x] Full PostgreSQL schema with RLS (`supabase/schema.sql`)
- [x] Auth bugs fixed: login after logout, session shape consistency

### Remaining (Phase 0 completion)
- [ ] Create real Supabase project (supabase.com)
- [ ] Run `supabase/schema.sql` in Supabase SQL Editor
- [ ] Copy URL + anon key into `.env` (from `.env.example`)
- [ ] Swap mock client for real `@supabase/supabase-js`
- [ ] Replace `getBuildingData()` mock returns with live `supabase.from('...').select()` queries
- [ ] Move Tailwind from CDN to npm (`npm install -D tailwindcss postcss autoprefixer`)
- [ ] Collect Lotinor pilot data: 48 units, resident names, WhatsApp numbers

---

## Phase 1 — Next (WhatsApp + Transparency)

See `ROADMAP.md` → PHASE 1 for full specs.

### Critical long-lead item: WhatsApp Business API
Apply immediately — Meta approval takes 1–2 weeks minimum.
- Create Twilio account at twilio.com
- Apply for WhatsApp Business API sender
- Submit message templates for pre-approval (French + Darija variants)
- Use Twilio sandbox for development while waiting for approval

### Phase 1 deliverables summary
- [ ] WhatsApp reminder engine (D+1 / D+7 / D+30 escalation)
- [ ] AI reply classifier + responder (GPT-4o)
- [ ] Monthly expense summary auto-sent via WhatsApp
- [ ] Resident budget Q&A (AI chat grounded strictly on DB records)
- [ ] Meeting creation → AI agenda → WhatsApp invites → RSVP → AI PV generation

---

## Verification Plan

### Phase 0 (current)
- Manual: Log in as each demo user, verify role-based UI and building access
- Manual: Log out and log in as a different user (regression test for auth bug)
- Manual: Check bar chart renders with correct proportional heights

### Phase 1 (upcoming)
- Twilio WhatsApp sandbox: send test reminders and verify delivery
- AI response: verify GPT-4o answers are grounded on DB data only (no hallucinations)
- End-to-end: Resident sends reply → webhook → DB updated → dashboard reflects it

### Future
- `npm test`: Unit tests for charge calculation and quota allocation logic
- `cypress`: End-to-end resident onboarding and payment flow
- Load test: 100 buildings, 5000 residents, bulk WhatsApp send

---

## Key Decisions Made

| Decision | Choice | Rationale |
|---|---|---|
| BaaS | Supabase | 80% of backend for free, clear migration path, built-in RLS |
| WhatsApp channel | Twilio | Best API, sandbox for dev, Meta-approved templates |
| AI model | GPT-4o | Best reasoning for budget explanations and dispute analysis |
| Voice agent | Vapi.ai | Darija + French STT/TTS, purpose-built for phone agents |
| CSS approach | Tailwind CDN → npm | CDN for Phase 0 speed, npm when CI/build needed |
| Multi-tenancy | RLS at DB level | Enforced at storage, not just UI — cannot be bypassed |
| Payments | CMI (Phase 3) | Manual first for pilot, webhook integration later |
| Compliance | CNDP (Morocco) | Data stored in EU West Supabase region |

---

*This plan is updated as phases complete. For strategic context see `ROADMAP.md`.*
