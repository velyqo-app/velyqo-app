-- Phase 10.1 Step 7.1 — Confirmation RLS/write-boundary correction.
--
-- Closes two Critical findings (C1, C2) from the Step 7 code-review pass:
-- `decisions` was persisted with a client-updatable applyStatus field
-- baked into it, and the orchestrator trusted status/journal_entry_id/
-- decisions[].applyStatus as proof that a write had actually happened,
-- rather than re-verifying against live source-of-truth data. Because
-- there is no service-role/Edge Function writer, the orchestrator and a
-- hand-crafted client request are indistinguishable at the RLS layer — so
-- the fix is not "prevent the client from writing bookkeeping columns"
-- (impossible without that infrastructure), it is "make what the client
-- can write irrelevant, by never trusting it." See the Step 7.1 design
-- report for the full analysis.
--
-- 1. `decisions` becomes genuinely write-once: still insertable (via the
--    existing table-level INSERT grant), never updatable, at the
--    column-grant level — a hard Postgres-enforced block, not a
--    convention. This alone closes C2 (no client, including the
--    orchestrator itself, can repoint a validated capabilityGapId after
--    the row exists).
-- 2. `apply_progress` is added as a small, separate, orchestrator-owned
--    bookkeeping column — NOT source-of-truth career data. It is purely a
--    display/resumability cache the orchestrator always recomputes and
--    overwrites from a fresh, live verification against
--    profiles/capability_evidence/career_journal; it is never read as
--    proof of anything by the updated orchestrator (see
--    services/careerCheckinConfirmationService.ts). This, together with
--    the same "never trust, always re-verify" treatment for `status` and
--    `journal_entry_id`, closes C1.
-- 3. `decisions` no longer carries applyStatus at all going forward — the
--    persisted shape is exactly {reportIndex, decision, appliedValue,
--    capabilityGapId}. The public TypeScript
--    CareerCheckinConfirmation.decisions (which still carries applyStatus
--    per item) is reconstructed by the application layer by merging
--    `decisions` with `apply_progress` at read time — this migration does
--    not change that public contract.

alter table public.career_checkin_confirmations
  add column apply_progress jsonb not null default '[]'::jsonb
    check (jsonb_typeof(apply_progress) = 'array');

comment on column public.career_checkin_confirmations.apply_progress is
  'Orchestrator-owned bookkeeping only: [{reportIndex, applyStatus}]. NOT source-of-truth career data and NEVER trusted as proof of a write — services/careerCheckinConfirmationService.ts always re-verifies against profiles/capability_evidence/career_journal before relying on completion. Purely a display/resumability cache the orchestrator recomputes and overwrites on every apply call.';

comment on column public.career_checkin_confirmations.decisions is
  'CareerCheckinDecision content ONLY (reportIndex, decision, appliedValue, capabilityGapId) — no applyStatus (moved to apply_progress). Validated at the application layer against a freshly recomputed interpretation of the immutable career_checkins row before insert, and write-once thereafter: no UPDATE grant exists on this column (see below), so it cannot be mutated by any authenticated client — including the orchestrator itself — once the row exists.';

comment on column public.career_checkin_confirmations.status is
  'Orchestrator-owned bookkeeping only — NEVER trusted as proof of completion. Always recomputed from a fresh, live re-verification against profiles/capability_evidence/career_journal on every applyCareerCheckinConfirmation call; a client-tampered value is silently corrected on the next such call rather than trusted as a terminal short-circuit.';

-- Column-level REVOKE/GRANT, not a table-level REVOKE ALL + re-GRANT:
-- this targets exactly the one column that must stop being updatable and
-- exactly the one new column that must become updatable, leaving the
-- already-correct status/journal_entry_id/completed_at grants from the
-- Step 7 migration untouched.
revoke update (decisions)
  on public.career_checkin_confirmations from authenticated;

grant update (apply_progress)
  on public.career_checkin_confirmations to authenticated;

-- id/checkin_id/user_id/created_at remain outside every UPDATE grant,
-- exactly as before this migration.
