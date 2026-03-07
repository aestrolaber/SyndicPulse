-- ═══════════════════════════════════════════════════════════════════════════════
-- SyndicPulse — Migration: add notes to disputes
-- Run in Supabase Dashboard › SQL Editor › New query › Run
--
-- Why: The dispute modals have a free-text notes field that was being
-- silently dropped (disputeToRow didn't include it). This adds the column.
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE disputes
    ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT NULL;

COMMENT ON COLUMN disputes.notes IS
    'Free-text internal notes added by the syndic during dispute handling.';
