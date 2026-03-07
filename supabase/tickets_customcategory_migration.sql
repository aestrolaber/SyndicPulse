-- ═══════════════════════════════════════════════════════════════════════════════
-- SyndicPulse — Migration: add custom_category to tickets
-- Run in Supabase Dashboard › SQL Editor › New query › Run
--
-- Why: Tickets with category='autre' can now have a user-defined label.
-- This column persists that label. NULL = standard category name is used.
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE tickets
    ADD COLUMN IF NOT EXISTS custom_category TEXT DEFAULT NULL;

COMMENT ON COLUMN tickets.custom_category IS
    'Free-text label when category = ''autre''. NULL for all standard categories.';
