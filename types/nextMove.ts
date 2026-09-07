import { Mission } from "./mission";

/**
 * Phase 9.2 — Next Move Engine.
 *
 * CareerState (types/careerState.ts) answers "where am I?" — a derived
 * snapshot of persisted facts. NextMove answers "what should I do next?" —
 * VELYQO's single deterministic recommendation, derived FROM a CareerState
 * (and its CareerStateSummary) by a future engine this file does not
 * implement. The two concepts are deliberately not merged: CareerState
 * never recommends anything, and NextMove never re-derives destination or
 * capability facts — it only expresses the one conclusion drawn from them.
 *
 * This file defines the CONTRACT only. No engine, no service, no AI call,
 * no write — see the Phase 9.2 Step 1 report for the semantic rules a
 * future engine must satisfy (priority-gap-first, existing priority_rank
 * as the tiebreaker, no synthetic score, exactly one move returned, etc.):
 * none of that logic exists yet, and nothing here implements it.
 *
 * Shape: a discriminated union on `type`, not a single flat interface with
 * several nullable fields. The fields that would have needed to be
 * `| null` on a flat shape (`capabilityGapId`, `capabilityName`,
 * `mission`) instead exist only on the variants where they are always
 * meaningful — `NextMoveCapabilityGap` doesn't need a nullable
 * `capabilityGapId` because every value of that variant has one, and
 * `NextMoveNeedsDestination`/`NextMoveUpToDate` don't carry a `mission`
 * field at all, because there is no actionable mission attached to either
 * state. `title`/`description` stay universal, non-nullable, top-level
 * fields on every variant instead (they were never nullable in the shape
 * this contract is based on) — this lets any consumer (Home, Coach) render
 * a NextMove's headline without first branching on `type`, while still
 * requiring that branch for anything type-specific (linking a capability
 * gap, starting a mission, or recognising a non-actionable state).
 *
 * Reuses the existing `Mission` type exactly (types/mission.ts) rather than
 * inventing a second mission-shaped structure — a NextMove's `mission`
 * field is meant to be literally the same Mission a future engine would
 * source from missionFromCapabilityGap / missionFromRoadmapStep /
 * fallbackMission, unchanged.
 */

/**
 * Where this NextMove came from — not a priority score, just which of the
 * (future) engine's decision tiers produced it:
 *
 * - "capability_gap": the Tier 0 capability mission — a priority_gap
 *   capability with an assigned priority_rank exists, and this is the
 *   highest-priority one.
 * - "roadmap": no priority gap, but an actionable next step exists on the
 *   user's cached roadmap.
 * - "generic": neither of the above, but a meaningful role-aware generic
 *   mission can still be templated.
 * - "needs_destination": no target role exists yet — never a personalised
 *   action; the honest state is "set a destination first."
 * - "up_to_date": a destination and assessment exist, but nothing
 *   currently actionable was found (e.g. no priority gaps, no roadmap
 *   step, evidence already covers what's available) — an honest
 *   "nothing outstanding right now" state, never fabricated busywork.
 */
export type NextMoveType =
  | "capability_gap"
  | "roadmap"
  | "generic"
  | "needs_destination"
  | "up_to_date";

interface NextMoveBase {
  title: string;

  description: string;
}

/**
 * The Tier 0 capability mission. `capabilityGapId`/`capabilityName` mirror
 * the exact pairing already threaded through Home → Coach → Mission
 * Complete (Phase 8 Step 6) and present on CareerStateActiveMission — a
 * future engine is expected to source these three fields directly from
 * CareerState.focus, not recompute them.
 */
export interface NextMoveCapabilityGap extends NextMoveBase {
  type: "capability_gap";

  capabilityGapId: string;

  capabilityName: string;

  mission: Mission;
}

/** An actionable next step from the user's cached roadmap. No capability
 * link — a roadmap step is not tied to any capability_gaps row. */
export interface NextMoveRoadmap extends NextMoveBase {
  type: "roadmap";

  mission: Mission;
}

/** The role-aware generic fallback — used only when neither a capability
 * gap nor a roadmap step is available. No capability link. */
export interface NextMoveGeneric extends NextMoveBase {
  type: "generic";

  mission: Mission;
}

/** No target role exists yet. Deliberately carries no `mission` — there is
 * nothing to start, only somewhere to go (Profile) to set one. */
export interface NextMoveNeedsDestination extends NextMoveBase {
  type: "needs_destination";
}

/** A destination and assessment exist, but nothing is currently
 * actionable. Deliberately carries no `mission` — an honest "nothing
 * outstanding" state is not the same as having a mission to show. */
export interface NextMoveUpToDate extends NextMoveBase {
  type: "up_to_date";
}

/**
 * VELYQO's single next-action recommendation. Always exactly one value,
 * never a list or a ranked set — "the engine must eventually return ONE
 * move, not a list" applies to this type's very shape, not just to how a
 * future engine happens to call it.
 */
export type NextMove =
  | NextMoveCapabilityGap
  | NextMoveRoadmap
  | NextMoveGeneric
  | NextMoveNeedsDestination
  | NextMoveUpToDate;
