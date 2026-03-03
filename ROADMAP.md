# SyndicPulse — Roadmap

> Items are grouped by status. Dates are targets, not guarantees.

---

## ✅ Shipped

- Auth: super_admin + syndic_manager roles, building switcher
- Dashboard: collection rate, expenses, recent payments, history chart
- Finances: payment recording (bulk months), CSV + PDF export, payment receipts
- Residents: full list with pagination (15/page), filters, search, add/edit/delete, CSV/Excel bulk import (real file parsing), searchable combobox in payment modal
- Litiges: full CRUD, statuses, stats cards, 2-step confirmation, file/photo attachments (up to 5 files, 5 MB each)
- Planning: drag-and-drop kanban, EditTicketModal
- Assemblées: full AG lifecycle — schedule, convocation (print + WhatsApp), attendance sheet, procès-verbal
- Utilisateurs: super_admin user management, CreateUserModal, localStorage persistence
- Portail résident: read-only transparency portal (access code + unit), 6-month payment history
- Paramètres bâtiment: logo upload, name/city/manager override, AddBuildingModal
- Mot de passe oublié: 3-panel AnimatePresence login flow
- Favicon: cyan Zap on navy background
- Fournisseurs: supplier directory with CRUD, star rating, notes, categories, per-building state
- Finances — Appels de fonds: formal fund-call document generator (print + WhatsApp), 2-step modal with resident table preview
- Finances — Recouvrement sub-tab: 6-month collection matrix per resident, click-to-pay, CSV + PDF export
- Circulaires (Tier 1): template-driven notice generator (coupure eau/élec, travaux, AG, propreté, avis libre), print-ready bilingual document, copy-to-WhatsApp Broadcast flow, per-building archive, "Avis en cours" banner in resident portal

---

## 🔜 Planned

### Circulaires — Tier 3: Fully-automated WhatsApp broadcasting
**Priority:** Medium (after Supabase connection)
**Goal:** Eliminate manual copy-paste — syndic clicks "Envoyer" and all residents receive the message instantly via WhatsApp.

**Architecture:**
- **Meta Cloud API (free tier):** Requires a verified Meta Business account + dedicated WhatsApp Business number
- **Backend trigger:** Supabase Edge Function receives the circulaire payload and fans out one API call per resident phone number
- **Template pre-approval:** Message templates must be pre-approved by Meta (24–72 h review). SyndicPulse's 6 standard templates (coupure eau/élec, travaux, AG, propreté, avis libre) will be submitted as official HSM templates
- **Delivery receipts:** Meta webhooks push read/delivered status back → stored in `circulaire_deliveries` table → visible in the archive with per-resident status dots
- **Rate limits:** Meta free tier allows 1 000 conversations/month. Pilot buildings (42 + 28 + 22 = 92 residents) are well within limit. Upgrade path: WhatsApp Business API paid tier at ~$0.05/conversation

**Implementation steps:**
1. Create `circulaire_deliveries` table in Supabase (schema extension)
2. Write Edge Function `send_circulaire.ts` — accepts `{ circulaireId, buildingId }`, loads residents, calls Meta API for each
3. Add Meta Cloud API credentials to Supabase Vault (never in frontend)
4. UI upgrade: "Diffuser via WhatsApp" button in CirculairesPage sends request → shows live delivery status per resident
5. ResidentPortal banner reads from DB (not localStorage) — survives tab/device changes

**Cost at scale (50 buildings × 30 residents = 1 500 residents/month):**
- Meta API: ~75 MAD/month (1 500 × $0.05 @ ~50 MAD/$)
- Supabase Pro: 25 $/month
- Total infra: < 200 MAD/month — absorbed in Pro/Enterprise tier pricing

**Reference:** Meta Cloud API docs — https://developers.facebook.com/docs/whatsapp/cloud-api

### Connect real Supabase — live sync between browser tabs
**Priority:** High
**Scope:**
- Swap the mock Supabase client (`src/lib/supabase.js`) with a real `@supabase/supabase-js` connection
- Migrate mock data to Supabase tables (schema already drafted in `supabase/schema.sql`)
- Real-time sync: changes made in one browser tab reflect instantly in others
- Real auth (email/password via Supabase Auth) replaces the mock login check
- Row-Level Security (RLS) enforces building-scoped access per user role

**Reference:** See `OfflineSync.md` for the broader offline-first roadmap if this decision evolves.

---

## 💬 Under Discussion

- **Desktop / offline-first version** — PWA + offline write queue considered; decision pending. See `OfflineSync.md`.
- **Desktop licensing** — machine-fingerprint activation strategy documented in `DesktopLicensing.md`; awaiting first desktop prospect.
- **AI voice agent** — component exists (`AIVoiceAgent.jsx`); integration scope TBD.
- **WhatsApp automation (Tier 2)** — per-resident `wa.me` deep-link buttons for semi-automated sending; no batch API needed. Intermediate step before Tier 3.

---

## ❌ Out of Scope (for now)

- Electron desktop wrapper — only if a client hard-requires a `.exe`
- Offline write queue — deferred; depends on Supabase connection first
- Mobile native app

---

*Last updated: 3 Mars 2026 · SyndicPulse internal — Circulaires Tier 1 shipped, Tier 3 planned*
