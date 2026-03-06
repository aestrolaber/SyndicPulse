-- ═══════════════════════════════════════════════════════════════════
-- SyndicPulse — Backups table migration
-- Paste into: Supabase Dashboard > SQL Editor > New query > Run
-- Purpose: Stores JSONB snapshots for automatic + manual data recovery
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS backups (
    id           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    building_id  TEXT NOT NULL,
    type         TEXT NOT NULL DEFAULT 'full',   -- 'full_auto' | 'full' | 'residents' | 'expenses' | etc.
    snapshot     JSONB NOT NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for efficient per-building queries sorted by date
CREATE INDEX IF NOT EXISTS idx_backups_building ON backups(building_id, created_at DESC);

-- RLS: anon access (auth is handled at the app layer, consistent with all other tables)
ALTER TABLE backups ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "anon_all_backups" ON backups
    FOR ALL TO anon USING (true) WITH CHECK (true);

-- ── Notes ──────────────────────────────────────────────────────────────────────
-- App retains at most 7 snapshots per building (pruning handled in db.js createBackup).
-- Snapshot size: ~50 KB per building per backup → 7 × 50 KB × 3 buildings = ~1 MB total.
-- Well within Supabase free-tier 500 MB database limit.
-- Auto-backup is triggered client-side every 7 days on app open (Dashboard useEffect).
