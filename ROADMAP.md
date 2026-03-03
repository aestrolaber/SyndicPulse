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

---

## 🔜 Planned

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
- **WhatsApp automation** — currently generates draft messages; real API (Meta Cloud) not yet wired.

---

## ❌ Out of Scope (for now)

- Electron desktop wrapper — only if a client hard-requires a `.exe`
- Offline write queue — deferred; depends on Supabase connection first
- Mobile native app

---

*Last updated: 3 Mars 2026 · SyndicPulse internal*
