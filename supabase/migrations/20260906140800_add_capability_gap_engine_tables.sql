-- Phase 8 (Career Gap Engine) — Step 1: schema only.
--
-- Adds two new, additive tables. Does not modify profiles, user_progress,
-- career_journal, or any other existing table, policy, or function.
--
-- RLS pattern verified empirically against the live database before writing
-- this migration (no schema-introspection tool was available without Docker
-- or psql): signed in as a real test user and confirmed
--   - unauthenticated (anon) reads return zero rows on profiles,
--     user_progress and career_journal despite real data existing,
--   - an authenticated user's read is scoped to exactly their own row on
--     all three tables,
--   - a cross-user UPDATE (via a `.neq(own_user_id)` filter) affects zero
--     rows,
--   - an INSERT into career_journal with a spoofed user_id is explicitly
--     rejected: "new row violates row-level security policy for table
--     career_journal".
-- This confirms the existing convention is per-command RLS policies scoped
-- to `auth.uid() = user_id`, matching the one policy whose exact text is
-- captured in migration 20260903080104
-- ("Users can create their own profile" WITH CHECK (auth.uid() = user_id)).
-- The two tables below follow that exact, verified pattern.
--
-- Deliberately NOT created in this migration (see the Phase 8 architecture
-- assessment): a target-role-requirements catalogue table, a separate
-- priority/assessment table, or a missions table. "Target role" is
-- represented as a plain text snapshot column, never an occupation_id, since
-- the occupations catalogue is confirmed too sparse to key a capability
-- model off. No classification/priority logic is implemented here — this
-- migration only creates the tables that will hold it.

-- ---------------------------------------------------------------------
-- capability_gaps
--
-- One row per capability, per user, for their current target role.
-- Represents the requirement, its current assessed status, and its
-- deterministic priority ordering together — these are always 1:1 per
-- user/target-role in this product, so they are intentionally not split
-- into separate requirement/assessment/priority tables for this MVP.
--
-- `status` is a 4-state model, not 3: `unknown` and `priority_gap` are
-- deliberately distinct states (per product principle — the app must
-- never claim a capability is missing on the strength of an absence of
-- evidence alone). Classification logic that decides which status a row
-- gets is out of scope for this migration.
--
-- Existing rows for a user are expected to be deleted (not soft-deleted)
-- when their target role changes, and regenerated from scratch — this is
-- why the uniqueness constraint below is scoped to (user_id, target_role,
-- capability_name) rather than just (user_id, capability_name): it keeps
-- a fresh generation for a new target role safe to insert without
-- colliding with rows from a prior target role, and makes upserts for the
-- *same* target role (e.g. a retried generation) idempotent.
-- ---------------------------------------------------------------------
create table public.capability_gaps (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null references auth.users(id) on delete cascade,

  -- Snapshot of profiles.target_role at generation time, not a foreign
  -- key — the occupations catalogue is too sparse to key this model off,
  -- and free-text target roles must be supported like everywhere else in
  -- the app (see roadmap generation, which works the same way).
  target_role text not null,

  capability_name text not null,
  capability_description text,

  importance text not null
    check (importance in ('critical', 'important', 'helpful')),

  status text not null default 'unknown'
    check (status in ('unknown', 'developing', 'strength', 'priority_gap')),

  -- Deterministic sort position among this user's priority_gap rows.
  -- Nullable: only meaningful once priority logic (a later step) assigns
  -- it. Never intended to be surfaced to the user as a raw number — see
  -- the Phase 8 architecture assessment's note on avoiding false
  -- precision.
  priority_rank integer,

  -- Short, human-readable explanation of why this status was assigned —
  -- populated by later application logic, not by this migration.
  evidence_summary text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint capability_gaps_user_role_capability_unique
    unique (user_id, target_role, capability_name)
);

comment on table public.capability_gaps is
  'Phase 8 Career Gap Engine: one row per capability the target role requires, per user, with its current assessed status and deterministic priority. Rows are deleted and regenerated when the user''s target role changes.';
comment on column public.capability_gaps.target_role is
  'Free-text snapshot of profiles.target_role at generation time — not an occupation_id. Used to detect staleness if an invalidation call site is ever missed.';
comment on column public.capability_gaps.status is
  'unknown = not yet assessed; developing = some supporting evidence; strength = well-evidenced; priority_gap = important/critical for the target role with no supporting evidence yet. unknown and priority_gap are intentionally distinct states.';
comment on column public.capability_gaps.priority_rank is
  'Deterministic sort position among this user''s priority_gap rows. Not intended for display as a raw number.';

create index capability_gaps_user_id_idx
  on public.capability_gaps (user_id);

create index capability_gaps_user_target_role_idx
  on public.capability_gaps (user_id, target_role);

-- Serves "what is this user's highest-priority gap" lookups directly.
create index capability_gaps_user_status_priority_idx
  on public.capability_gaps (user_id, status, priority_rank);

alter table public.capability_gaps enable row level security;

create policy "Users can view their own capability gaps"
  on public.capability_gaps
  for select
  using (auth.uid() = user_id);

create policy "Users can create their own capability gaps"
  on public.capability_gaps
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own capability gaps"
  on public.capability_gaps
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own capability gaps"
  on public.capability_gaps
  for delete
  using (auth.uid() = user_id);

grant select, insert, update, delete on public.capability_gaps to authenticated;

-- ---------------------------------------------------------------------
-- capability_evidence
--
-- One row per evidence event supporting (or contributing to) a capability
-- row's status. Many rows can point at the same capability_gaps row —
-- this is what lets status escalate deterministically from a single
-- mission completion (-> developing) to a second independent
-- corroborating event including at least one mission completion
-- (-> strength). That escalation rule is application logic, out of scope
-- here; this migration only makes it representable.
--
-- Evidence rows are treated as an append-only event log by the app: no
-- update policy is created below, since nothing in the current design
-- ever edits an evidence row after it's written. A delete policy is
-- still required so that `on delete cascade` from capability_gaps can
-- actually execute under RLS as the `authenticated` role (Postgres RLS
-- still applies to cascaded deletes for non-superuser roles), which is
-- what makes target-role invalidation (deleting a user's capability_gaps
-- rows) safe and complete.
-- ---------------------------------------------------------------------
create table public.capability_evidence (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null references auth.users(id) on delete cascade,

  capability_gap_id uuid not null
    references public.capability_gaps(id) on delete cascade,

  source_type text not null
    check (source_type in ('profile_snapshot', 'mission_completion')),

  -- Links mission-derived evidence back to the human-readable journal
  -- entry already created on mission completion, instead of duplicating
  -- its text here. Nullable because profile_snapshot evidence has no
  -- journal entry. ON DELETE SET NULL rather than CASCADE: a journal
  -- entry going away (no current code path does this) should not silently
  -- destroy the evidence record itself.
  journal_entry_id uuid
    references public.career_journal(id) on delete set null,

  strength text not null
    check (strength in ('supports_developing', 'supports_strength')),

  note text,

  created_at timestamptz not null default now()
);

comment on table public.capability_evidence is
  'Phase 8 Career Gap Engine: append-only evidence events (profile data at generation time, or mission completions) that inform a capability_gaps row''s status. Classification/escalation logic is application-level, not implemented here.';
comment on column public.capability_evidence.source_type is
  'MVP scope only: profile_snapshot (profile skills/experience at generation time) or mission_completion. No external sources (CV, LinkedIn, etc.) by design.';

create index capability_evidence_user_id_idx
  on public.capability_evidence (user_id);

create index capability_evidence_capability_gap_id_idx
  on public.capability_evidence (capability_gap_id);

create index capability_evidence_journal_entry_id_idx
  on public.capability_evidence (journal_entry_id);

alter table public.capability_evidence enable row level security;

create policy "Users can view their own capability evidence"
  on public.capability_evidence
  for select
  using (auth.uid() = user_id);

create policy "Users can create their own capability evidence"
  on public.capability_evidence
  for insert
  with check (auth.uid() = user_id);

create policy "Users can delete their own capability evidence"
  on public.capability_evidence
  for delete
  using (auth.uid() = user_id);

grant select, insert, delete on public.capability_evidence to authenticated;
