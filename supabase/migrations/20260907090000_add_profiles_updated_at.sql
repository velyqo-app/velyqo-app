-- Phase 10.1 Step 1 — Profile Timestamp Foundation.
--
-- Adds updated_at to public.profiles so VELYQO can know WHEN the Career
-- Blueprint was last changed, in support of future Career Evolution /
-- Career Check-in logic. This records only "something changed, and when" —
-- never WHICH field changed, never the previous value. No field-level
-- history or versioning system is introduced by this migration.
--
-- Maintained by a database-level trigger, not application code, so every
-- existing and future write path bumps it automatically and identically:
--   - profileService.updateProfile's plain .update()
--   - onboarding/summary.tsx's direct .upsert(payload, {onConflict:
--     "user_id"}) — Postgres fires BEFORE UPDATE triggers for the
--     ON CONFLICT DO UPDATE branch of an upsert exactly like a plain
--     UPDATE, so this one trigger correctly covers both call sites with
--     zero application-side duplication.
--
-- Found during inspection, deliberately NOT fixed here (out of this
-- step's scope): capability_gaps.updated_at (Step 1 of Phase 8) uses only
-- `default now()` with no maintaining trigger — empirically confirmed it
-- does NOT change on UPDATE, so it has been frozen at each row's original
-- INSERT time all along. This migration exists specifically to give
-- profiles the correct, working version of that same intent.

-- 1. Add the column nullable first, so the backfill below can run before
--    a NOT NULL constraint would reject it.
alter table public.profiles
  add column updated_at timestamptz;

-- 2. Backfill existing rows. There is no real "last modified" information
--    for rows that predate this column — created_at is the most honest
--    available proxy. Deliberately NOT now(), which would falsely claim
--    every existing profile was just changed simultaneously.
update public.profiles
  set updated_at = created_at
  where updated_at is null;

-- 3. Enforce NOT NULL and give new rows the same now() default created_at
--    already uses — both defaults evaluate identically within one INSERT
--    statement (Postgres's now() is transaction-stable), so a freshly
--    created profile starts with updated_at === created_at, matching
--    every other timestamped table in this schema.
alter table public.profiles
  alter column updated_at set not null,
  alter column updated_at set default now();

-- 4. Database-level maintenance. SECURITY INVOKER (the default — no
--    explicit clause needed): this trigger never needs elevated
--    privileges, it only ever sets a column on a row the invoking user is
--    already permitted to update under the existing RLS policy.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_profiles_updated_at
  before update on public.profiles
  for each row
  execute function public.set_updated_at();

comment on column public.profiles.updated_at is
  'When any Career Blueprint field was last changed, maintained automatically by the set_profiles_updated_at trigger. Records only that something changed and when — not which field, not the previous value. No field-level history exists.';
