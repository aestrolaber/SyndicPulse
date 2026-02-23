# SyndicPulse — Project Roadmap
> Strategic reference document · Confidential · Updated Feb 2026

---

## Vision

**SyndicPulse** is a multi-tenant AI-powered SaaS platform for Moroccan residential syndics (copropriétés).

The long-term goal: replace manual, opaque, conflict-ridden syndic management with a transparent, automated, AI-assisted operating system — starting in Tangier, scaling nationally.

**Core strategic bets:**
- WhatsApp as the primary resident interaction channel (not an app nobody downloads)
- AI automation that creates *trust* before it creates features
- French as the platform language, Darija as the AI voice/chat layer
- Multi-tenant from day one — what we build for Lotinor, we sell to 100 others

---

## User Roles & Access Model

| Role | Who | What they see |
|---|---|---|
| **Super Admin** | You (platform owner) | ALL buildings across ALL syndics · full switcher · analytics |
| **Syndic Manager** | Building manager / professional syndic | Only their registered building(s) · no switcher |
| **Resident** | Unit owner or tenant | Only their own unit data · read-only portal or WhatsApp |

> **Multi-tenant isolation:** Each Syndic Manager is scoped to their Organization. They cannot see other syndics' data — enforced at the database level (Row Level Security), not just the UI.

---

## Strategic Principles

1. **Trust before features.** Residents mistrust syndics by default (Law 18-00 context). Every feature must reduce suspicion, not add complexity.
2. **WhatsApp-first.** 95%+ of residents already use it. No app download friction.
3. **AI that explains, not just acts.** Residents should understand *why* they pay, not just *that* they pay.
4. **Scale from one building.** Every architectural decision must work for 1 building today and 500 buildings tomorrow.
5. **French interface, Darija AI layer.** Dashboard + documents = French. WhatsApp messages + voice = Darija + French.
6. **Law 18-00 compliance as a feature.** Not a constraint — a competitive advantage. SyndicPulse knows the law so the syndic doesn't have to.

---

## Tech Stack Decisions

### Frontend (Current)
- **Vite + React** — keep, mature, fast
- **Tailwind CSS** — already in use via CDN, migrate to npm in Phase 1
- **Framer Motion** — keep for animations
- Language: **French UI strings** (i18n via `react-i18next`)

### Backend
- **Node.js + Fastify** — fast, lightweight, TypeScript-ready
- **Supabase** as the BaaS layer:
  - PostgreSQL database (with Row Level Security for multi-tenancy)
  - Built-in Auth (JWT + magic links)
  - Storage (documents, invoices, PV files)
  - Realtime (for live dashboard updates)
  - Edge Functions (for webhooks)

> Why Supabase: it gives us 80% of a backend for free at the start, with a clear migration path to a custom Node.js API when scale demands it. Eliminates DevOps overhead in Phase 0-1.

### AI / Automation
- **OpenAI GPT-4o** — text reasoning, budget explanations, dispute analysis, PV generation
- **Vapi.ai** — voice phone agent (Darija + French STT/TTS)
- **WhatsApp Business API via Twilio** — reminders, conversational flows, AI responses

### Payments (Phase 3)
- **CMI** (Centre Monétique Interbancaire) — Moroccan card payments
- **WafaCash / CashPlus** — cash payment confirmation integration

### Infrastructure
- **Frontend:** Vercel (free tier → Pro)
- **Backend/DB:** Supabase (free → Pro → dedicated)
- **WhatsApp Webhook:** Railway or Render (always-on Node.js server)

---

## Data Architecture

### Core Tables

```
organizations          — Syndic companies / individual managers
  id, name, plan, owner_email, created_at

buildings              — Individual residences
  id, org_id, name, city, address, total_units, reserve_fund_mad

units                  — Individual apartments
  id, building_id, unit_number, floor, surface_m2, quota_percent

residents              — Owners or tenants per unit
  id, unit_id, full_name, phone_whatsapp, email, type(owner|tenant), is_active

charges                — Monthly/periodic fees declared by the syndic
  id, building_id, amount_per_unit, period(YYYY-MM), due_date, description

payments               — Payment records per resident per charge
  id, charge_id, resident_id, amount, paid_at, method, status(paid|pending|overdue)

expenses               — Syndic spending records (transparency layer)
  id, building_id, category, vendor, amount_mad, date, invoice_url, validated_by

meetings               — AG (General Assembly) meetings
  id, building_id, date, type(ordinary|extraordinary), agenda_json, pv_url, ai_summary

tickets                — Maintenance/incident reports
  id, building_id, unit_id, title, category, severity, status, assigned_to, closed_at

disputes               — Resident conflicts
  id, building_id, parties_json, description, status, ai_suggestion, law_reference

whatsapp_messages      — Full log of all WhatsApp interactions
  id, resident_id, direction(in|out), type, content, sent_at, status

users                  — Auth users mapped to roles
  id(auth), role(super_admin|syndic_manager|resident), org_id, building_id
```

### Multi-tenant Isolation (Supabase RLS)
Every table that contains `building_id` or `org_id` has a Row Level Security policy:
```sql
-- Example: syndic managers only see their building's data
CREATE POLICY "syndic_own_building" ON payments
  USING (building_id = get_my_building_id());
```
Super Admin bypasses all RLS via a service-role key (server-side only, never exposed to browser).

---

## Data Ingestion Strategy

All data lives in Supabase (PostgreSQL). There are **three channels** through which data enters the system:

### Channel 1 — Manual Entry via Dashboard UI (Phase 0-1, primary)
The syndic enters data directly through the SyndicPulse dashboard:
- Monthly charges declared → saved to `charges` table
- Payments received marked manually → saved to `payments` table
- Expenses logged (with invoice upload to Supabase Storage) → saved to `expenses` table
- Residents and units entered on onboarding → saved to `residents` / `units` tables

This replaces the Excel spreadsheet that most Moroccan syndics currently use. No external integration needed.

### Channel 2 — Bulk CSV / Excel Import (Phase 1, onboarding)
New syndics join with 1–3 years of existing history in spreadsheets. They should not have to re-enter it manually:
- Syndic uploads their Excel file on first onboarding
- App parses it client-side (column mapping UI)
- Data is validated and bulk-inserted into Supabase
- Critical for retention: no one accepts a tool that loses their history

### Channel 3 — Payment Gateway Webhooks (Phase 2-3, automation)
When a resident pays online (CMI, WafaCash), a webhook fires automatically:
- CMI / PayMe → HTTP POST → Supabase Edge Function → marks payment as `paid` in DB
- Zero manual entry for online payments
- Receipt generated and archived automatically
- WhatsApp confirmation sent to resident

> **The target state:** Syndic never manually records a payment again. The webhook does it. They only touch the UI to log cash payments and expenses.

### Manual vs. Automated — By Data Type

| Data type | Entry method (now) | Automation target (later) |
|---|---|---|
| Monthly charges | Manual once/month — syndic declares the amount | Auto-generate from charge templates |
| Payments received | Manual — syndic marks each receipt | CMI/WafaCash webhook auto-marks paid |
| Expenses | Manual — syndic logs each spend + uploads invoice | Receipt OCR via GPT-4 Vision (Phase 3) |
| Residents & units | Manual on onboarding, edits as needed | CSV bulk import for migration |
| WhatsApp messages | Auto-generated by backend (reminders, summaries) | Twilio webhooks log resident replies |
| Meeting PVs | AI-drafted by GPT-4o, syndic approves | Vapi transcript → GPT-4o → auto-saved |

### Current State (Phase 0)
- All data is mock, centralized in `src/lib/mockData.js`
- `src/lib/supabase.js` is a drop-in mock client with identical interface to `@supabase/supabase-js`
- Swap to production = 3 lines: import real client, pass `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`
- `getBuildingData()` in `App.jsx` is the only query layer to update — no component logic changes needed

---

## Roadmap

---

### PHASE 0 — Foundation
**Duration: 4–6 weeks**
**Goal: Build the skeleton everything else runs on**

#### Auth & Multi-tenancy
- [ ] Supabase project setup (DB + Auth + Storage)
- [ ] User roles: `super_admin`, `syndic_manager`, `resident`
- [ ] Syndic onboarding flow: register org → add building → add units
- [ ] Row Level Security policies on all tables
- [ ] Super Admin dashboard with building switcher (already UI-scaffolded)
- [ ] Syndic Manager login → sees only their building
- [ ] Resident portal (simple read-only, magic link auth via WhatsApp/email)

#### Data entry for Lotinor pilot
- [ ] Enter Lotinor Tangier: 48 units, resident list, quota percentages
- [ ] Enter historical charges (last 3 months)
- [ ] Enter current payment status per unit

#### Frontend migration
- [ ] Move Tailwind from CDN to npm (postcss + tailwind.config)
- [ ] Add `react-i18next` for French UI strings
- [ ] Connect Supabase client to React app
- [ ] Real data on dashboard (live from DB, not hardcoded)

#### Milestone: A real login exists. Omar logs in and sees only Lotinor. You log in and see all buildings.

---

### PHASE 1 — Pilot MVP: Trust Builders
**Duration: 6–8 weeks**
**Goal: Deploy to Lotinor, show value immediately, collect feedback**

#### 1A · WhatsApp Automatic Payment Reminders
The highest-impact, lowest-friction feature. Replaces the embarrassing phone call.

**Flow:**
```
Daily cron job
  → Query overdue payments
  → For each overdue resident:
      D+1:  Friendly reminder  "Bonjour [Prénom], votre cotisation de [X] MAD est due depuis hier..."
      D+7:  Formal notice      "Rappel: votre cotisation reste impayée. Des frais de retard s'appliquent selon la Loi 18-00..."
      D+30: Legal warning      "Dernier avis avant convocation en AG..."
  → Log in whatsapp_messages
  → Resident replies → webhook → AI processes:
      "je peux payer demain" → AI: "Merci [Prénom], notez que des frais de retard s'accumulent. Pouvez-vous confirmer une date?"
      "j'ai déjà payé"       → AI: "Merci de votre réponse. Envoyez-nous votre reçu ou contactez le syndic."
```

**Tech:**
- Twilio WhatsApp Business API
- Node.js webhook server (Railway)
- Supabase Edge Function for the cron
- OpenAI GPT-4o for reply classification and response generation

**Deliverables:**
- [ ] Twilio account + WhatsApp Business number setup
- [ ] Webhook server to receive replies
- [ ] Message templates (French + Darija variants) approved by WhatsApp
- [ ] Escalation engine (D+1, D+7, D+30 logic)
- [ ] AI reply classifier and responder
- [ ] Full message log in dashboard (Syndic sees all sent/received)
- [ ] Manual "Send reminder now" button per resident in dashboard

**Success metric:** Overdue rate drops by 20%+ in first 60 days. Syndic spends 0 hours making reminder calls.

---

#### 1B · Budget Transparency (AI-Powered)
Residents ask "pourquoi je paie 850 MAD?" and get a real answer. This kills disputes before they start.

**Two surfaces:**

**Surface 1 — Monthly WhatsApp expense summary (auto-sent)**
```
Envoyé le 1er de chaque mois:

📊 Résumé des dépenses — Résidence Lotinor — Janvier 2026

Votre cotisation: 850 MAD
Voici comment elle a été utilisée:

🔧 Entretien & réparations:  38% (323 MAD)
🔒 Gardiennage:              25% (213 MAD)
🧹 Nettoyage:                20% (170 MAD)
💡 Eau & Électricité:        12% (102 MAD)
📄 Administration:            5%  (43 MAD)

Fonds de réserve: 84,500 MAD ✅ (sain)

Voir le détail complet: [lien]
```

**Surface 2 — AI chat on resident portal (or WhatsApp)**
Resident asks any budget question → GPT-4o answers based on actual expense records.
> "Pourquoi on a dépensé 12,000 MAD en réparations ce mois?"
> AI: "L'ascenseur du Bloc B a nécessité une révision complète par Otis Morocco (8,400 MAD, facture disponible) et une fuite d'eau au parking a été réparée (3,600 MAD)."

**Deliverables:**
- [ ] Expense entry UI for Syndic (with invoice upload to Supabase Storage)
- [ ] Monthly WhatsApp summary auto-send (1st of each month)
- [ ] Resident portal page: expense breakdown with invoice viewer
- [ ] AI budget Q&A on resident portal (chat widget)
- [ ] Document archive: invoices accessible by residents, not just syndic

**Success metric:** Dispute volume drops. Trust score (survey) improves. Residents stop asking the syndic for receipts.

---

#### 1C · Meeting & Event Management
AG meetings are a legal requirement (Law 18-00) and a major pain point. Automate the before/during/after.

**Before the meeting:**
- Syndic creates meeting in dashboard → AI generates agenda draft
- WhatsApp invitations sent automatically to all residents (with date, time, topics)
- RSVP via WhatsApp reply ("1" to confirm, "2" to send proxy)

**During the meeting:**
- Meeting timer + agenda tracker in dashboard
- Syndic marks each agenda point as discussed/voted
- Vote results recorded digitally

**After the meeting:**
- AI generates PV (procès-verbal) draft based on notes + vote results
- Syndic reviews and approves
- PV sent to all residents via WhatsApp + stored in document archive

**Deliverables:**
- [ ] Meeting creation form (date, type, agenda items)
- [ ] AI agenda generator (GPT-4o based on pending issues, financial status)
- [ ] WhatsApp invitation + RSVP system
- [ ] Meeting live view (agenda progress, vote recorder)
- [ ] AI PV generator
- [ ] Document archive per building

**Success metric:** First AG at Lotinor with PV generated in <15 minutes after meeting ends.

---

### PHASE 2 — Core Platform
**Duration: 8–10 weeks**
**Goal: Full operational management — everything a professional syndic needs**

#### 2A · Financial Management (Law 18-00 Compliant)
- [ ] Charge calculation engine: per-unit quota allocation (tantièmes)
- [ ] Multiple charge types: charges communes, fonds de réserve, charges exceptionnelles
- [ ] Payment recording (manual + future CMI integration)
- [ ] Monthly financial reports (PDF generation)
- [ ] Budget planning tool (annual budget with variance tracking)
- [ ] AI anomaly detection: "Dépense inhabituelle détectée: 45,000 MAD pour l'entretien — 3x la moyenne"
- [ ] Cash flow forecast (3-month prediction)

#### 2B · Maintenance & Ticketing
- [ ] Resident submits issue via: portal, WhatsApp, or future voice call
- [ ] AI categorizes severity (urgent / normal / cosmetic)
- [ ] Ticket assigned to contractor
- [ ] SLA tracking (24h urgent, 72h normal)
- [ ] Resident notified via WhatsApp at each status change
- [ ] Contractor registry per building

#### 2C · Dispute Resolution Engine
- [ ] Dispute logging with parties, evidence, timestamps
- [ ] AI analysis: references relevant Law 18-00 articles
- [ ] AI generates mediation script for syndic (in French)
- [ ] Mediation outcome recorded
- [ ] Pattern detection: "Apt 4A has 3 noise disputes this quarter" → AI flags for proactive intervention

#### 2D · Resident Self-Service Portal
- [ ] Mobile-optimized web portal (PWA) — no app store required
- [ ] View: balance, payment history, expense breakdown, tickets, meeting history
- [ ] Submit: maintenance request, dispute, proxy for AG
- [ ] Pay: future CMI integration
- [ ] Accessible via magic link (no password needed) sent via WhatsApp/email

#### 2E · Document Management
- [ ] AG procès-verbaux archive
- [ ] Building regulations (règlement de copropriété)
- [ ] Contracts (cleaning, security, elevator)
- [ ] Invoices linked to expenses
- [ ] All documents accessible to residents (selective visibility)

---

### PHASE 3 — AI Elevation
**Duration: 8–12 weeks**
**Goal: True AI-first differentiation — what no competitor can replicate quickly**

#### 3A · Real AI Voice Agent (Inbound + Outbound)
Replace simulated voice demo with production Vapi.ai integration.

**Inbound calls (resident → system):**
- Resident calls a dedicated number
- Vapi handles: "3andi mochkil f l'ascenseur" → creates ticket → notifies syndic
- Understands Darija, French, and code-switching
- Logs call transcript to DB

**Outbound calls (system → resident, for overdue > D+45):**
- AI voice agent calls overdue residents
- Negotiates payment plan
- All logged and compliant with CNDP regulations

**Deliverables:**
- [ ] Vapi.ai integration with building knowledge base
- [ ] Phone number per building (virtual number)
- [ ] Call transcript archiving
- [ ] Outbound collection call campaign builder

#### 3B · Predictive Analytics
- [ ] Delinquency risk score per resident (payment history + behavior pattern)
- [ ] Building health score (maintenance backlog + reserve fund + collection rate)
- [ ] Cash flow prediction (3–6 months)
- [ ] "AI Board Advisor": monthly briefing for syndic ("Ce mois-ci, voici ce que vous devriez prioriser...")

#### 3C · CMI Payment Integration
- [ ] Residents pay directly via dashboard or WhatsApp link
- [ ] CMI sandbox → production onboarding
- [ ] Payment receipt auto-generated and archived
- [ ] Real-time payment status update

---

### PHASE 4 — Scale
**Duration: Ongoing**
**Goal: National expansion, platform business**

#### 4A · Syndic Onboarding Engine
- [ ] Self-service signup: syndic creates account, enters building details, invites residents
- [ ] Guided onboarding wizard (15 minutes to live)
- [ ] Free trial (1 building, 3 months)
- [ ] In-app billing (Stripe or local payment gateway)

#### 4B · Monetization Model

| Plan | Target | Price | Includes |
|---|---|---|---|
| **Starter** | Volunteer syndic, small building | 299 MAD/mo | 1 building, up to 30 units, WhatsApp reminders, basic dashboard |
| **Pro** | Medium buildings (30–100 units) | 599 MAD/mo | Unlimited units, AI budget transparency, meeting management, ticketing |
| **Elite** | Large / professional syndics | 1,299 MAD/mo | All Pro + AI voice agent, predictive analytics, CMI payments, multi-building |
| **Enterprise** | Property developers | Custom | White-label, API access, dedicated support |

> Per-unit pricing alternative: 15 MAD/unit/month (min 300 MAD/mo)

#### 4C · White-Label for Developers
- [ ] Custom domain + logo per building
- [ ] Developer dashboard for portfolio management
- [ ] API access for integrations

#### 4D · Mobile App
- [ ] React Native app for iOS + Android
- [ ] Syndic: full management on mobile
- [ ] Resident: lightweight portal app

---

## Pilot Plan: Lotinor Tangier

**Goal:** Deploy Phase 0 + Phase 1 features to Lotinor Tangier as the reference pilot.

**Timeline:** 10–12 weeks from start of development

**Success metrics for the pilot:**
| Metric | Baseline | Target (3 months) |
|---|---|---|
| Overdue payment rate | ~15% | <5% |
| Time spent on reminder calls | ~4h/week | ~0h/week |
| Resident trust score (survey) | Unknown | 7+/10 |
| AG PV generation time | 2–3 days | <30 minutes |
| Dispute volume | Baseline TBD | -30% |

**Pilot kickoff checklist:**
- [ ] Phase 0 fully deployed and tested
- [ ] Resident WhatsApp numbers collected (48 units)
- [ ] First month of real data entered
- [ ] WhatsApp Business number verified by Meta
- [ ] Omar (syndic) trained on dashboard (< 1 hour)
- [ ] First automated reminder batch sent
- [ ] First AI budget summary sent to residents

---

## Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| WhatsApp Business API approval delay | Medium | High | Apply immediately. Use Twilio sandbox for testing. Prepare SMS fallback. |
| Residents opt out of WhatsApp messages | Low | Medium | Make first messages clearly valuable. Easy opt-out. Show value before asking for anything. |
| Data privacy / CNDP compliance | Medium | Critical | Collect only necessary data. Explicit resident consent. Data deletion on request. Terms drafted by a Moroccan lawyer. |
| CMI integration complexity | High | Medium | Defer to Phase 3. Manual payment recording works for pilot. |
| Syndic resistance to change | Low | Medium | Pilot shows 0 extra work. They log in and it works. Onboarding < 1 hour. |
| AI hallucinations on budget Q&A | Medium | High | Ground AI strictly on DB records. No inference beyond recorded data. Show sources with every AI response. |

---

## Next Immediate Actions

### This sprint (next 2 weeks):
1. **Create Supabase project** — set up DB schema, RLS policies, auth
2. **Build auth flow** — login page, role detection, redirect logic
3. **Connect dashboard to real data** — replace hardcoded values with Supabase queries
4. **Apply for WhatsApp Business API** — Twilio account + Meta Business verification (takes 1–2 weeks, start now)
5. **Collect Lotinor resident data** — unit list, resident names, WhatsApp numbers

### Key decisions to make:
- [ ] Domain name for SyndicPulse (syndicpulse.ma ?)
- [ ] WhatsApp number (Moroccan +212 number recommended)
- [ ] Supabase project region (EU West for CNDP compliance)
- [ ] Resident consent strategy (WhatsApp opt-in message)

---

*This roadmap is a living document. Update it after each phase completion.*
*Owner: SyndicPulse · Confidential*
