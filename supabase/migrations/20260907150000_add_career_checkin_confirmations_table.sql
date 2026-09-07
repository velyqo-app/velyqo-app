-- Phase 10.1 Step 7 — Career Check-in Confirmation persistence.
--
-- One row per career_checkins record, holding the user's authoritative
-- confirm/edit/decline decisions and the orchestrator's own resumability
-- bookkeeping for applying them. Implements exactly the schema approved in
-- the Step 7 design report and its revision addendum — nothing more.
--
-- decisions/status/journal_entry_id/completed_at are STRICTLY
-- orchestration/resumability metadata, never authoritative career truth.
-- The application-level orchestrator (services/careerCheckinConfirmation
-- Service.ts) treats them as a resumability hint: it re-verifies every
-- profile-affecting decision against a fresh read of profiles before ever
-- setting status to "completed" (the one point where a cheap, real
-- verification is available), and accepts — as a disclosed, bounded-harm
-- trade-off rather than something this migration or new infrastructure
-- solves — that a client could, via a hand-crafted request, cause its own
-- evidence/journal bookkeeping to over- or under-claim completion. Per the
-- design report's analysis, the worst case of that is self-contained to
-- the tampering user's own account, is never treated as proof of a
-- capability's status (profile_snapshot evidence is already structurally
-- invisible to capabilityStatusService's status recalculation regardless
-- of how many rows exist), and is always recoverable because the
-- originating career_checkins row is immutable and can be reprocessed.
--
-- Deliberately NOT introduced here: a service_role credential, an Edge
-- Function, or any other trusted server-side writer — RLS plus a
-- column-scoped UPDATE grant (below) is the smallest mechanism that
-- supports the required pending -> completed/failed resumability without
-- that infrastructure.

create table public.career_checkin_confirmations (
  id uuid primary key default gen_random_uuid(),

  checkin_id uuid not null references public.career_checkins(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,

  -- CareerCheckinDecision[] (types/careerCheckinConfirmation.ts) as JSONB.
  -- Every decision is validated at the application layer, before this
  -- row is ever inserted, against a freshly recomputed interpretation of
  -- the immutable career_checkins row it belongs to — never trusted from
  -- the client blindly. Validated here only as "a JSON array", matching
  -- the career_checkins.reports precedent (Step 3) — the full per-decision
  -- shape is not duplicated in SQL.
  decisions jsonb not null
    check (jsonb_typeof(decisions) = 'array'),

  status text not null default 'pending'
    check (status in ('pending', 'completed', 'failed')),

  -- Nullable pointer to the career_journal row this confirmation's
  -- check-in journal entry produced, once created. Exists purely so a
  -- retry can tell "already journaled" from "not yet journaled" without
  -- risking a duplicate entry — career_journal itself is not modified by
  -- this migration and gains no reciprocal reference back.
  journal_entry_id uuid references public.career_journal(id) on delete set null,

  created_at timestamptz not null default now(),

  -- Set by the orchestrator (application code, not a trigger — see the
  -- file-level comment) only on the one transition to status =
  -- "completed". Null in every other state.
  completed_at timestamptz,

  constraint career_checkin_confirmations_checkin_id_unique unique (checkin_id)
);

comment on table public.career_checkin_confirmations is
  'Phase 10.1 Step 7: one row per career_checkins record, holding the user''s confirm/edit/decline decisions and the orchestrator''s own resumability bookkeeping for applying them. decisions/status/journal_entry_id/completed_at are orchestration metadata only, never authoritative career truth — profiles/capability_evidence/career_journal remain the actual sources of truth.';
comment on column public.career_checkin_confirmations.decisions is
  'CareerCheckinDecision[] (types/careerCheckinConfirmation.ts) as JSONB. Validated at the application layer against a freshly recomputed interpretation of the immutable career_checkins row before insert — never trusted from the client blindly.';
comment on column public.career_checkin_confirmations.status is
  'pending = decisions saved, not yet fully applied; completed = every non-declined decision applied AND the check-in journal entry exists, with profile-affecting decisions freshly re-verified against profiles; failed = something confirmed still needs (re)attempting.';

-- Scoped by user_id: a user's own confirmation-row history. The unique
-- constraint above already provides an efficient checkin_id lookup path.
create index career_checkin_confirmations_user_id_idx
  on public.career_checkin_confirmations (user_id);

alter table public.career_checkin_confirmations enable row level security;

create policy "Users can view their own checkin confirmations"
  on public.career_checkin_confirmations
  for select
  using (auth.uid() = user_id);

create policy "Users can create their own checkin confirmations"
  on public.career_checkin_confirmations
  for insert
  with check (auth.uid() = user_id);

-- UPDATE is required here (unlike career_checkins, which has none) — a
-- confirmation row legitimately advances pending -> completed/failed over
-- its lifetime. The row-level policy alone would still let a client
-- rewrite checkin_id/user_id via a hand-crafted PATCH; the column-scoped
-- GRANT below closes that specifically, without needing a trusted
-- server-side writer.
create policy "Users can update their own checkin confirmations"
  on public.career_checkin_confirmations
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant select, insert on public.career_checkin_confirmations to authenticated;

-- Column-scoped UPDATE grant: only the orchestration/resumability
-- bookkeeping columns are writable. id/checkin_id/user_id/created_at are
-- never grantable for update — a client cannot repoint a confirmation row
-- to a different check-in or a different user even with a hand-crafted
-- PostgREST request.
grant update (decisions, status, journal_entry_id, completed_at)
  on public.career_checkin_confirmations to authenticated;

-- No DELETE policy: append-only in spirit, matching career_checkins.
-- No grant to service_role: RLS bypass is already inherent to that role
-- at the platform level, independent of any table-level GRANT.
