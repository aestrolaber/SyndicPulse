-- ═══════════════════════════════════════════════════════════════════
-- SyndicPulse — Supabase PostgreSQL Schema
-- Paste this into: Supabase Dashboard > SQL Editor > New query > Run
-- ═══════════════════════════════════════════════════════════════════

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─────────────────────────────────────────────────────────────────
-- 1. ORGANIZATIONS  (syndic companies or individual managers)
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE organizations (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name        TEXT NOT NULL,
    owner_email TEXT NOT NULL UNIQUE,
    plan        TEXT NOT NULL DEFAULT 'starter' CHECK (plan IN ('starter','pro','elite','enterprise')),
    is_active   BOOLEAN NOT NULL DEFAULT true,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────
-- 2. BUILDINGS  (individual residences)
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE buildings (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id              UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name                TEXT NOT NULL,
    city                TEXT NOT NULL,
    address             TEXT,
    total_units         INTEGER NOT NULL DEFAULT 0,
    reserve_fund_mad    NUMERIC(12,2) NOT NULL DEFAULT 0,
    logo_url            TEXT,
    color_hex           TEXT NOT NULL DEFAULT '#06b6d4',
    law_18_00_regulated BOOLEAN NOT NULL DEFAULT true,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────
-- 3. UNITS  (individual apartments / parking spots)
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE units (
    id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    building_id    UUID NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
    unit_number    TEXT NOT NULL,   -- e.g. "Apt 4B", "Parking P12"
    floor          INTEGER,
    surface_m2     NUMERIC(7,2),
    unit_type      TEXT NOT NULL DEFAULT 'residential' CHECK (unit_type IN ('residential','commercial','parking','storage')),
    -- tantième (quota) as per Loi 18-00 — percentage of charges allocated
    quota_percent  NUMERIC(6,4) NOT NULL DEFAULT 2.0833, -- 100/48 for 48-unit building
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(building_id, unit_number)
);

-- ─────────────────────────────────────────────────────────────────
-- 4. RESIDENTS  (owners or tenants linked to a unit)
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE residents (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    unit_id         UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
    full_name       TEXT NOT NULL,
    phone_whatsapp  TEXT,           -- E.164 format: +212661234567
    email           TEXT,
    national_id     TEXT,           -- CIN
    resident_type   TEXT NOT NULL DEFAULT 'owner' CHECK (resident_type IN ('owner','tenant')),
    move_in_date    DATE,
    is_active       BOOLEAN NOT NULL DEFAULT true,
    whatsapp_opt_in BOOLEAN NOT NULL DEFAULT false,  -- CNDP consent
    opted_in_at     TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────
-- 5. USERS  (auth users — maps Supabase Auth to roles)
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE users (
    id          UUID PRIMARY KEY,  -- matches auth.users.id
    full_name   TEXT NOT NULL,
    role        TEXT NOT NULL DEFAULT 'syndic_manager' CHECK (role IN ('super_admin','syndic_manager','resident')),
    org_id      UUID REFERENCES organizations(id) ON DELETE SET NULL,
    resident_id UUID REFERENCES residents(id) ON DELETE SET NULL,  -- for resident role
    avatar_url  TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Junction: which buildings can a user access
CREATE TABLE user_building_access (
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    building_id UUID NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, building_id)
);

-- ─────────────────────────────────────────────────────────────────
-- 6. CHARGES  (fees declared by the syndic per period)
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE charges (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    building_id     UUID NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
    period          TEXT NOT NULL,  -- YYYY-MM format: "2026-02"
    amount_per_unit NUMERIC(10,2) NOT NULL,
    due_date        DATE NOT NULL,
    charge_type     TEXT NOT NULL DEFAULT 'charges_communes'
                    CHECK (charge_type IN ('charges_communes','fonds_reserve','charge_exceptionnelle')),
    description     TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(building_id, period, charge_type)
);

-- ─────────────────────────────────────────────────────────────────
-- 7. PAYMENTS  (per-resident payment records)
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE payments (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    charge_id    UUID NOT NULL REFERENCES charges(id) ON DELETE CASCADE,
    resident_id  UUID NOT NULL REFERENCES residents(id) ON DELETE CASCADE,
    unit_id      UUID NOT NULL REFERENCES units(id),
    amount_due   NUMERIC(10,2) NOT NULL,
    amount_paid  NUMERIC(10,2) NOT NULL DEFAULT 0,
    paid_at      TIMESTAMPTZ,
    method       TEXT CHECK (method IN ('cash','bank_transfer','cmi','wafacash','cashplus')),
    reference    TEXT,   -- bank reference or receipt number
    status       TEXT NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending','paid','partial','overdue')),
    notes        TEXT,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(charge_id, resident_id)
);

-- Auto-compute overdue status (called by a cron or trigger)
CREATE OR REPLACE FUNCTION update_overdue_payments()
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
    UPDATE payments p
    SET status = 'overdue'
    FROM charges c
    WHERE p.charge_id = c.id
      AND p.status = 'pending'
      AND c.due_date < CURRENT_DATE;
END;
$$;

-- ─────────────────────────────────────────────────────────────────
-- 8. EXPENSES  (syndic spending records — transparency layer)
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE expenses (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    building_id  UUID NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
    category     TEXT NOT NULL CHECK (category IN (
                     'entretien_reparations','gardiennage','nettoyage',
                     'eau_electricite','administration','assurance',
                     'espaces_verts','piscine','ascenseur','autre'
                 )),
    vendor       TEXT,
    amount_mad   NUMERIC(12,2) NOT NULL,
    expense_date DATE NOT NULL,
    invoice_url  TEXT,   -- Supabase Storage URL
    description  TEXT,
    validated_by UUID REFERENCES users(id),
    validated_at TIMESTAMPTZ,
    period       TEXT,   -- YYYY-MM, auto-computed from expense_date
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────
-- 9. MEETINGS  (AG — Assemblées Générales)
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE meetings (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    building_id  UUID NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
    meeting_type TEXT NOT NULL DEFAULT 'ordinary' CHECK (meeting_type IN ('ordinary','extraordinary','emergency')),
    scheduled_at TIMESTAMPTZ NOT NULL,
    location     TEXT,
    agenda_json  JSONB,    -- [{item, description, duration_min}]
    status       TEXT NOT NULL DEFAULT 'planned'
                 CHECK (status IN ('planned','in_progress','completed','cancelled')),
    quorum_met   BOOLEAN,
    -- AI-generated content
    ai_agenda_draft TEXT,
    ai_pv_draft     TEXT,
    pv_url           TEXT,  -- Supabase Storage URL for final signed PV
    pv_approved_at   TIMESTAMPTZ,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Meeting attendance
CREATE TABLE meeting_attendance (
    meeting_id  UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
    resident_id UUID NOT NULL REFERENCES residents(id) ON DELETE CASCADE,
    status      TEXT NOT NULL DEFAULT 'invited'
                CHECK (status IN ('invited','confirmed','proxy','absent','present')),
    proxy_for   UUID REFERENCES residents(id),  -- if attending as proxy
    PRIMARY KEY (meeting_id, resident_id)
);

-- ─────────────────────────────────────────────────────────────────
-- 10. TICKETS  (maintenance & incident reports)
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE tickets (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    building_id   UUID NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
    unit_id       UUID REFERENCES units(id),  -- NULL if common area
    reported_by   UUID REFERENCES residents(id),
    title         TEXT NOT NULL,
    description   TEXT,
    category      TEXT NOT NULL DEFAULT 'autre'
                  CHECK (category IN ('ascenseur','plomberie','electricite','gardiennage',
                                      'espaces_communs','structure','securite','autre')),
    priority      TEXT NOT NULL DEFAULT 'normal'
                  CHECK (priority IN ('urgent','normal','cosmetic')),
    status        TEXT NOT NULL DEFAULT 'open'
                  CHECK (status IN ('open','assigned','in_progress','resolved','closed')),
    assigned_to   TEXT,  -- contractor name (future: contractors table)
    ai_severity   TEXT,  -- AI-classified severity
    photo_urls    TEXT[], -- array of Supabase Storage URLs
    sla_deadline  TIMESTAMPTZ,  -- urgent=24h, normal=72h
    resolved_at   TIMESTAMPTZ,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────
-- 11. DISPUTES
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE disputes (
    id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    building_id    UUID NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
    title          TEXT NOT NULL,
    description    TEXT,
    parties_json   JSONB NOT NULL,  -- [{resident_id, name, unit}]
    status         TEXT NOT NULL DEFAULT 'open'
                   CHECK (status IN ('open','mediation','resolved','escalated')),
    priority       TEXT NOT NULL DEFAULT 'medium'
                   CHECK (priority IN ('low','medium','high')),
    law_reference  TEXT,    -- e.g. "Art. 22, Loi 18-00"
    ai_suggestion  TEXT,    -- GPT-4o generated mediation script
    resolution     TEXT,    -- final resolution notes
    resolved_at    TIMESTAMPTZ,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────
-- 12. WHATSAPP MESSAGES  (full log of all messages)
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE whatsapp_messages (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    building_id     UUID NOT NULL REFERENCES buildings(id),
    resident_id     UUID REFERENCES residents(id),
    phone_number    TEXT NOT NULL,
    direction       TEXT NOT NULL CHECK (direction IN ('outbound','inbound')),
    message_type    TEXT NOT NULL
                    CHECK (message_type IN ('payment_reminder','payment_confirmation',
                                             'maintenance_update','meeting_invite',
                                             'budget_summary','dispute_notice','ai_response','other')),
    content         TEXT NOT NULL,
    template_name   TEXT,   -- WhatsApp approved template name
    twilio_sid      TEXT,   -- Twilio message SID for tracking
    status          TEXT NOT NULL DEFAULT 'queued'
                    CHECK (status IN ('queued','sent','delivered','read','failed')),
    sent_at         TIMESTAMPTZ,
    delivered_at    TIMESTAMPTZ,
    read_at         TIMESTAMPTZ,
    escalation_day  INTEGER, -- 1, 7, or 30 for payment reminders
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────
-- 13. AI LOGS  (audit trail of all AI actions)
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE ai_logs (
    id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    building_id    UUID REFERENCES buildings(id),
    action_type    TEXT NOT NULL
                   CHECK (action_type IN ('budget_explanation','dispute_suggestion',
                                           'pv_generation','reminder_generation',
                                           'voice_transcript','payment_risk_score','other')),
    input_summary  TEXT,
    output_text    TEXT,
    model_used     TEXT NOT NULL DEFAULT 'gpt-4o',
    tokens_used    INTEGER,
    cost_usd       NUMERIC(8,6),
    resident_id    UUID REFERENCES residents(id),
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY (RLS)
-- Enforces multi-tenant isolation at the database level
-- ─────────────────────────────────────────────────────────────────

-- Enable RLS on all tenant tables
ALTER TABLE buildings          ENABLE ROW LEVEL SECURITY;
ALTER TABLE units              ENABLE ROW LEVEL SECURITY;
ALTER TABLE residents          ENABLE ROW LEVEL SECURITY;
ALTER TABLE charges            ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments           ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses           ENABLE ROW LEVEL SECURITY;
ALTER TABLE meetings           ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets            ENABLE ROW LEVEL SECURITY;
ALTER TABLE disputes           ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_messages  ENABLE ROW LEVEL SECURITY;

-- Helper function: get the current user's accessible building IDs
CREATE OR REPLACE FUNCTION get_my_building_ids()
RETURNS UUID[] LANGUAGE sql STABLE SECURITY DEFINER AS $$
    SELECT ARRAY(
        SELECT building_id FROM user_building_access
        WHERE user_id = auth.uid()
    );
$$;

-- Helper function: check if current user is super_admin
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
    SELECT EXISTS (
        SELECT 1 FROM users WHERE id = auth.uid() AND role = 'super_admin'
    );
$$;

-- RLS policy template (apply to each table)
-- Super admin sees everything; syndic_manager sees only their buildings

CREATE POLICY "buildings_access" ON buildings
    FOR ALL USING (
        is_super_admin() OR id = ANY(get_my_building_ids())
    );

CREATE POLICY "units_access" ON units
    FOR ALL USING (
        is_super_admin() OR building_id = ANY(get_my_building_ids())
    );

CREATE POLICY "residents_access" ON residents
    FOR ALL USING (
        is_super_admin() OR
        unit_id IN (SELECT id FROM units WHERE building_id = ANY(get_my_building_ids()))
    );

CREATE POLICY "charges_access" ON charges
    FOR ALL USING (
        is_super_admin() OR building_id = ANY(get_my_building_ids())
    );

CREATE POLICY "payments_access" ON payments
    FOR ALL USING (
        is_super_admin() OR
        charge_id IN (SELECT id FROM charges WHERE building_id = ANY(get_my_building_ids()))
    );

CREATE POLICY "expenses_access" ON expenses
    FOR ALL USING (
        is_super_admin() OR building_id = ANY(get_my_building_ids())
    );

CREATE POLICY "meetings_access" ON meetings
    FOR ALL USING (
        is_super_admin() OR building_id = ANY(get_my_building_ids())
    );

CREATE POLICY "tickets_access" ON tickets
    FOR ALL USING (
        is_super_admin() OR building_id = ANY(get_my_building_ids())
    );

CREATE POLICY "disputes_access" ON disputes
    FOR ALL USING (
        is_super_admin() OR building_id = ANY(get_my_building_ids())
    );

CREATE POLICY "whatsapp_messages_access" ON whatsapp_messages
    FOR ALL USING (
        is_super_admin() OR building_id = ANY(get_my_building_ids())
    );

-- ─────────────────────────────────────────────────────────────────
-- INDEXES  (performance)
-- ─────────────────────────────────────────────────────────────────
CREATE INDEX idx_units_building          ON units(building_id);
CREATE INDEX idx_residents_unit          ON residents(unit_id);
CREATE INDEX idx_charges_building_period ON charges(building_id, period);
CREATE INDEX idx_payments_status         ON payments(status);
CREATE INDEX idx_payments_charge         ON payments(charge_id);
CREATE INDEX idx_tickets_building_status ON tickets(building_id, status);
CREATE INDEX idx_whatsapp_resident       ON whatsapp_messages(resident_id, created_at);
CREATE INDEX idx_ai_logs_building        ON ai_logs(building_id, created_at);

-- ─────────────────────────────────────────────────────────────────
-- SEED DATA  (Lotinor Tangier pilot — development only)
-- ─────────────────────────────────────────────────────────────────
-- Run in development Supabase only. Delete before production.

INSERT INTO organizations (id, name, owner_email, plan) VALUES
    ('00000000-0000-0000-0000-000000000001', 'Benali Syndic', 'omar@lotinor.ma', 'elite');

INSERT INTO buildings (id, org_id, name, city, address, total_units, reserve_fund_mad, color_hex) VALUES
    ('00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000001',
     'Lotinor', 'Tanger', 'Av. Mohammed VI, Résidence Lotinor, Tanger 90000',
     48, 84500, '#22c55e');
