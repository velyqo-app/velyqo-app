-- Phase 10.1 Step 7.1 (continued) — closes a residual privilege gap
-- discovered during LIVE verification of the Step 7.1 migration, not
-- assumed from reading the schema: Supabase's project-level default
-- privileges (applied automatically to every new table created in the
-- `public` schema) grant a broader table-level UPDATE to `authenticated`
-- (and `anon`) than either the Step 7 or Step 7.1 migrations' own
-- explicit column-scoped GRANT statements ever intended.
--
-- Confirmed empirically before writing this migration: `created_at` —
-- never named in any GRANT UPDATE (...) statement in either prior
-- migration — was directly updatable by the owning authenticated user. A
-- column-scoped GRANT ADDS a narrower permission; it does not, by itself,
-- remove a broader one already in effect from a different source (e.g.
-- ALTER DEFAULT PRIVILEGES set up at project provisioning time). The
-- Step 7.1 migration's `revoke update (decisions) ... from authenticated`
-- therefore only removed the column-specific ACL entry it itself had
-- added — it left the coexisting, broader, implicit grant untouched,
-- so `decisions` (and every other column) remained genuinely writable.
--
-- Fix: REVOKE the table-level UPDATE privilege outright first — wiping
-- out whatever implicit grant exists, regardless of its origin — then
-- re-GRANT exactly the intended column set. This makes the intended
-- boundary (id/checkin_id/user_id/created_at/decisions never updatable;
-- apply_progress/status/journal_entry_id/completed_at updatable) the
-- actual, verified database state rather than an assumption that turned
-- out to be false.

revoke update on public.career_checkin_confirmations from authenticated;
revoke update on public.career_checkin_confirmations from anon;

grant update (apply_progress, status, journal_entry_id, completed_at)
  on public.career_checkin_confirmations to authenticated;
