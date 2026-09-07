-- Phase 10.1 Step 3 — Career Check-ins persistence.
--
-- Creates the minimal, secure persistence layer for the approved
-- CareerCheckin contract (types/careerCheckin.ts, committed in Step 2).
-- A career_checkins row is a historical record of one completed check-in
-- and which categories of career change the user reported at that moment
-- — append-only, never a mutable snapshot, and never itself a source of
-- derived state.
--
-- Deliberately NOT created here:
--   - Any derived field (status, priority, score, impact, confidence,
--     roadmap, next_move) — a check-in is raw user-reported input, never
--     an interpretation. Career State and the Next Move Engine remain
--     entirely unaffected by this table's existence; nothing in this
--     migration is read by careerStateService.ts or nextMoveEngine.ts.
--   - A child/normalized table for individual reports — a check-in holds
--     a small, fixed set of possible report categories
--     (role_change/new_evidence/new_skill/target_change/no_change), and
--     there is currently no requirement to query an individual report
--     field independently of its check-in. JSONB is the appropriate
--     minimal representation; normalizing would be premature structure
--     for a query pattern that does not exist yet.
--   - A profiles-update trigger/mechanism — reports.proposedCurrentRole
--     and reports.proposedTargetRole are proposals only. Nothing in this
--     migration writes to public.profiles, and no future service reading
--     this table is authorized by this migration to do so automatically;
--     applying either remains a separate, explicit, user-confirmed action
--     through the existing profileService.updateProfile path.
--   - An UPDATE policy — a completed check-in is treated as an
--     append-only historical record, matching how capability_evidence
--     (Step 1 of Phase 8) is already append-only for the same reason.
--   - A DELETE policy — see the trade-off note below.
--
-- RLS pattern (auth.uid() = user_id) matches the already-established,
-- already-verified convention used by capability_gaps / capability_evidence
-- (Step 1 of Phase 8) and profiles — reused here rather than re-derived,
-- and re-verified empirically against the live database as part of this
-- step's own testing (see the Step 3 report).

create table public.career_checkins (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null references auth.users(id) on delete cascade,

  -- The CareerCheckinReport[] array exactly as types/careerCheckin.ts
  -- defines it — one JSON array holding one or more discriminated-union
  -- report objects, each already tagged by its own "category" field. No
  -- per-category columns: see the file-level comment for why a child
  -- table isn't justified yet. Validated here only as "a JSON array", not
  -- as a full re-implementation of the TypeScript discriminated-union
  -- shape — that validation belongs to application code (Step 2's
  -- contract), not duplicated in SQL.
  reports jsonb not null
    check (jsonb_typeof(reports) = 'array'),

  created_at timestamptz not null default now()
);

comment on table public.career_checkins is
  'Phase 10.1: one row per completed Career Check-in — an append-only historical record of which categories of career change the user reported. Never a derived/interpreted value; Career State and the Next Move Engine do not read this table.';
comment on column public.career_checkins.reports is
  'CareerCheckinReport[] (types/careerCheckin.ts) as JSONB. Each item is a discriminated union tagged by "category" (role_change | new_evidence | new_skill | target_change | no_change). Validated here only as "a JSON array" — the full per-category shape is validated in application code, not duplicated in SQL.';

-- user_id is the only currently-justified access pattern (a user's own
-- check-in history, most-recent-first via created_at at query time — no
-- separate created_at index needed for that at this scale). No JSONB
-- index: there is no requirement yet to query into individual report
-- fields.
create index career_checkins_user_id_idx
  on public.career_checkins (user_id);

alter table public.career_checkins enable row level security;

create policy "Users can view their own career checkins"
  on public.career_checkins
  for select
  using (auth.uid() = user_id);

create policy "Users can create their own career checkins"
  on public.career_checkins
  for insert
  with check (auth.uid() = user_id);

-- No UPDATE policy: a completed check-in is immutable once recorded.
--
-- No DELETE policy — TRADE-OFF, reported rather than silently decided.
-- Preferred here because a career_checkins row is explicitly a historical
-- record (per this step's own instructions), and capability_evidence
-- already establishes the precedent of an append-only table with no
-- delete policy in this schema. The known cost: this project's existing
-- test scripts have, for other tables, relied on a working delete policy
-- to clean up rows created during live-backend testing — profiles and
-- career_journal already lack one for the same reason and already
-- accumulate harmless, isolated test residue as a result (documented in
-- prior steps' reports). The same will now be true for career_checkins.
-- This migration does not add a delete policy to work around that; doing
-- so would be a deliberate, separate decision to make later, not an
-- oversight here.

grant select, insert on public.career_checkins to authenticated;

-- No grant to service_role is added: Supabase's service_role already
-- bypasses RLS by default at the platform level, independent of any
-- table-level GRANT — there is nothing for this migration to add or
-- restrict for it, and no service-role credential is used anywhere in
-- this project's application code or test scripts.
