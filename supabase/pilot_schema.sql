-- ═══════════════════════════════════════════════════════════════════════════════
-- SyndicPulse — PILOT SCHEMA (v1)
-- Flat tables that mirror the current app data model exactly.
-- Run in Supabase Dashboard › SQL Editor › New query › Run
--
-- Auth stays mock (app-layer). RLS grants anon full read/write so the app
-- can query without a Supabase Auth session.
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── 1. RESIDENTS ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS residents (
    id           TEXT PRIMARY KEY,
    building_id  TEXT NOT NULL,
    unit         TEXT NOT NULL,
    name         TEXT NOT NULL,
    phone        TEXT,
    paid_through TEXT,              -- 'YYYY-MM' — single source of truth
    floor        INTEGER DEFAULT 0,
    since        TEXT,              -- '2019'
    quota        NUMERIC(7,4),
    monthly_fee  NUMERIC(10,2),
    portal_pin   TEXT,              -- 4-digit string assigned by syndic
    portal_code  TEXT,              -- opaque code e.g. 'NW-4K8MRX'
    is_active    BOOLEAN DEFAULT true,
    created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ── 2. EXPENSES (individual log entries) ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS expenses (
    id          TEXT PRIMARY KEY,
    building_id TEXT NOT NULL,
    date        TEXT NOT NULL,      -- 'YYYY-MM-DD'
    category    TEXT NOT NULL,
    vendor      TEXT,
    amount      NUMERIC(12,2) NOT NULL,
    description TEXT,
    has_invoice BOOLEAN DEFAULT false,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── 3. TICKETS ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tickets (
    id          TEXT PRIMARY KEY,
    building_id TEXT NOT NULL,
    title       TEXT NOT NULL,
    status      TEXT NOT NULL DEFAULT 'scheduled', -- in_progress | scheduled | done
    date        TEXT,
    time        TEXT,
    agent       TEXT,
    priority    TEXT DEFAULT 'normal',             -- normal | urgent
    category    TEXT DEFAULT 'autre',
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── 4. DISPUTES ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS disputes (
    id            TEXT PRIMARY KEY,
    building_id   TEXT NOT NULL,
    title         TEXT NOT NULL,
    parties       JSONB,            -- ['Party A', 'Party B']
    status        TEXT NOT NULL DEFAULT 'open',   -- open | mediation | resolved | closed
    priority      TEXT DEFAULT 'medium',          -- high | medium | low
    date          TEXT,
    ai_suggestion TEXT,
    attachments   JSONB DEFAULT '[]',
    created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ── 5. SUPPLIERS ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS suppliers (
    id           TEXT PRIMARY KEY,
    building_id  TEXT NOT NULL,
    name         TEXT NOT NULL,
    category     TEXT,
    phone        TEXT,
    email        TEXT,
    contract_ref TEXT,
    since        TEXT,              -- 'YYYY-MM'
    rating       NUMERIC(3,1),
    notes        TEXT,
    created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ── 6. MEETINGS (Assemblées générales) ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS meetings (
    id               TEXT PRIMARY KEY,
    building_id      TEXT NOT NULL,
    title            TEXT NOT NULL,
    date             TEXT,          -- 'YYYY-MM-DD'
    time             TEXT,          -- 'HH:MM'
    location         TEXT,
    status           TEXT DEFAULT 'upcoming',     -- upcoming | completed
    convocation_sent BOOLEAN DEFAULT false,
    agenda           JSONB DEFAULT '[]',           -- [{id, title}]
    attendance       JSONB,                        -- {present, total} | null
    votes            JSONB DEFAULT '[]',           -- [{agendaId, pour, contre, abstention}]
    notes            TEXT DEFAULT '',
    created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ── 7. BUILDING SETTINGS ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS building_settings (
    building_id            TEXT PRIMARY KEY,      -- 'bld-1' | 'bld-2' | 'bld-3'
    name_override          TEXT,
    city_override          TEXT,
    manager_override       TEXT,
    logo_b64               TEXT,                  -- base64 data URL
    cachet_b64             TEXT,
    reserve_fund_mad       NUMERIC(12,2),
    payment_rib            TEXT,
    payment_bank           TEXT,
    payment_account_holder TEXT,
    payment_whatsapp       TEXT,
    wa_portal_template     TEXT,
    updated_at             TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY
-- ═══════════════════════════════════════════════════════════════════════════════
-- Auth is handled at the app layer (mock credentials).
-- Anon role gets full read/write access for the pilot.
-- Tighten to authenticated role once real Supabase Auth is connected.

ALTER TABLE residents         ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses          ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets           ENABLE ROW LEVEL SECURITY;
ALTER TABLE disputes          ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers         ENABLE ROW LEVEL SECURITY;
ALTER TABLE meetings          ENABLE ROW LEVEL SECURITY;
ALTER TABLE building_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pilot_anon_residents"         ON residents         FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "pilot_anon_expenses"          ON expenses          FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "pilot_anon_tickets"           ON tickets           FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "pilot_anon_disputes"          ON disputes          FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "pilot_anon_suppliers"         ON suppliers         FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "pilot_anon_meetings"          ON meetings          FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "pilot_anon_building_settings" ON building_settings FOR ALL TO anon USING (true) WITH CHECK (true);

-- ═══════════════════════════════════════════════════════════════════════════════
-- INDEXES
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_residents_building  ON residents(building_id);
CREATE INDEX IF NOT EXISTS idx_expenses_building   ON expenses(building_id);
CREATE INDEX IF NOT EXISTS idx_tickets_building    ON tickets(building_id);
CREATE INDEX IF NOT EXISTS idx_disputes_building   ON disputes(building_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_building  ON suppliers(building_id);
CREATE INDEX IF NOT EXISTS idx_meetings_building   ON meetings(building_id);
