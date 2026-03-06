# SyndicPulse — Roadmap

> Items are grouped by status. Dates are targets, not guarantees.

---

## ✅ Shipped

- Auth: super_admin + syndic_manager roles, building switcher
- Auth hardening (Pilot): SHA-256 password hashing for created accounts (Web Crypto API, no library); 8-hour session timeout enforced in `getSession()`; `visibilitychange` listener auto-logs out expired sessions on tab focus; plain-text password shown once to admin at creation only — stored hash never exposed
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
- Circulaires — extensions: Objet trouvé template, edit from archive, template-aware history summary, custom template builder (Tier 2)
- Thèmes UI: 3-mode switcher (Navy/Cyan · Indigo/Or · Blanc) via Palette button in TopBar, persisted in localStorage, full coverage across all modals and panels
- KpiCard: hover scale effect; StatCard: hover + click-selected state

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

### 🔴 Journal d'activité — Audit log (super_admin)
**Priority:** High — required before onboarding paying clients
**Status:** Next to implement (post-PIN hardening)
**Goal:** Append-only activity log giving the super_admin a tamper-evident record of every significant change across all buildings. Primary use case: support diagnosis and dispute resolution between syndic managers and co-owners.

**Legal context:** Loi 18-00 (Maroc) and loi ALUR (France) require syndics to retain financial and administrative records. An audit trail is the platform's legal shield as well as the client's.

**Retention policy by category:**

| Category | Retention |
|---|---|
| Financial events (payments, expenses) | 5 years |
| Resident changes (add / delete / PIN reset) | 2 years |
| Building settings changes (especially RIB) | 3 years |
| User management (create / edit / delete) | 12 months |
| General activity (disputes, AG, suppliers) | 6 months |

**What to log (priority order):**
- **Critical:** Payment recorded, expense added/deleted, resident added/deleted, portal PIN reset, building RIB/bank settings changed
- **Important:** Dispute status changed, AG created/convocation sent, supplier added/deleted, user created/edited/deleted, building access reassigned
- **Skip for now:** Read/view events (too noisy, not actionable at pilot scale)

**Supabase schema:**
```sql
CREATE TABLE audit_log (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    building_id  TEXT,                  -- null for platform-level actions
    actor_id     TEXT NOT NULL,         -- user who performed the action
    actor_name   TEXT NOT NULL,         -- denormalized (readable if user is later deleted)
    action       TEXT NOT NULL,         -- e.g. 'payment.recorded', 'resident.deleted', 'settings.rib_changed'
    entity_type  TEXT,                  -- 'resident' | 'expense' | 'user' | 'building' | ...
    entity_id    TEXT,
    summary      TEXT NOT NULL,         -- human-readable FR: "Paiement 1 200 MAD enregistré — App. 4B (Omar Benali)"
    meta         JSONB,                 -- before/after values or any extra context
    created_at   TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_audit_building  ON audit_log(building_id);
CREATE INDEX idx_audit_actor     ON audit_log(actor_id);
CREATE INDEX idx_audit_action    ON audit_log(action);
CREATE INDEX idx_audit_created   ON audit_log(created_at DESC);
-- Append-only: never UPDATE or DELETE rows in this table
```

**Implementation steps:**
1. Add `audit_log` table to Supabase (extend `pilot_schema.sql`)
2. Create `logAction(action, entityType, entityId, summary, meta)` helper in `src/lib/db.js` — fire-and-forget (never block the UI)
3. Instrument every write action in Dashboard: saveResident, removeResident, saveExpense, saveDispute, saveBuildingSettings, user create/edit/delete
4. Add **Journal** page (super_admin only) — filterable by building, actor, date range, action category; paginated 25/page; export to CSV
5. RLS: anon/authenticated role can INSERT; SELECT restricted to authenticated users with `role = super_admin`

**UI — Journal page:**
- Filter bar: building picker, date range, action category dropdown (Finances / Résidents / Paramètres / Utilisateurs / Tout)
- Table: timestamp · bâtiment · acteur · résumé (human-readable) · détails (expandable JSON)
- Export button: filtered view → CSV (for legal archiving)
- Read-only — no edit or delete actions exposed

**Design principle:** The log is append-only at the database level. Even super_admin cannot delete entries through the UI.

**Phase 1 scope** (when building): financial events + resident changes only — covers 90% of real support scenarios.
**Phase 2:** All entity types + CSV export + retention-based archiving.

---

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

### Auth — Production hardening (post-pilot)
**Priority:** High — required before scaling beyond pilot
**Current state (pilot):** Mock auth + SHA-256 hashed passwords + 8h session timeout. Acceptable for a closed 3-building pilot managed by a single operator.

**What's still missing for production:**

| Gap | Risk | Fix |
|---|---|---|
| No server-side token | Role can be spoofed in DevTools | Switch to Supabase Auth (JWT issued by server) |
| RLS not enforced | Any anon caller can read all buildings' data | Add Supabase RLS policies keyed on `auth.uid()` |
| No login rate limiting | Brute force possible | Supabase Auth has built-in rate limiting |
| DEMO_USERS passwords in source code | Leaked if repo goes public | Remove before open-sourcing; move to env/Vault |
| No password policy | Weak passwords allowed | Supabase Auth enforces minimum complexity |
| No MFA | Single factor only | Supabase Auth supports TOTP MFA |

**Migration path (Supabase Auth):**
1. Enable Supabase Auth in project dashboard (email/password provider)
2. Create real users: `supabase.auth.admin.createUser({ email, password, user_metadata: { role, building_ids } })`
3. Replace mock `signInWithPassword` in `supabase.js` with real Supabase client — 1 line change
4. Add RLS policies on all tables: `USING (building_id = ANY((auth.jwt() ->> 'building_ids')::text[]))`
5. Remove `sp_created_users` localStorage — users now live in Supabase `auth.users`
6. Update AuthContext to read `user_metadata` for role + building access

**Note:** Steps 1–6 are a single migration sprint (est. 1 day). This replaces the entire mock auth layer cleanly.

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

*Last updated: 6 Mars 2026 · SyndicPulse internal — Portal PIN hashing shipped (salted SHA-256, 6-digit, CSV auto-gen); seed.sql migrated; login logo updated; Journal d'activité flagged as next high-priority*
