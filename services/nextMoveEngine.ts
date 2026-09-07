import { fallbackMission, missionFromRoadmapStep } from "./careerMissionService";
import { CareerState } from "../types/careerState";
import { CareerStateSummary } from "./careerStateRules";
import { NextMove } from "../types/nextMove";
import { Roadmap } from "../types/roadmap";

/**
 * Phase 9.2 Step 2 — the Next Move Engine's decision function. Pure,
 * synchronous, deterministic: no Supabase, no AsyncStorage, no AI, no
 * network, no Date.now()/Math.random(), no mutation of its inputs. Given
 * the same (state, summary, roadmap) it always returns the same NextMove.
 *
 * Reuses existing deterministic building blocks exactly as they already
 * exist — this file introduces no new mission-selection algorithm:
 * - Tier 0 reads CareerState.focus (already computed by
 *   careerStateService.getCareerState via capabilityMissionService
 *   .selectPriorityCapabilityGap / missionFromCapabilityGap) rather than
 *   recomputing it — no priority_rank recalculation happens here.
 * - Tier 1 reuses careerMissionService.missionFromRoadmapStep unchanged.
 * - Tier 2 reuses careerMissionService.fallbackMission unchanged.
 *
 * ARCHITECTURAL LIMITATION, deliberately not silently worked around (see
 * the Step 2 report for the full writeup): CareerState does not carry
 * roadmap steps. CareerStateProgress.journeyProgress is only
 * RoadmapJourneyEstimate (month/step COUNTS), never the actual
 * Roadmap.steps array missionFromRoadmapStep needs — Step 2 of Phase 9.1
 * deliberately did not add it, precisely because doing so was flagged as
 * "arguably the Next Move Engine's job." A pure function fed only
 * (CareerState, CareerStateSummary) therefore CANNOT determine Tier 1 on
 * its own — there is nothing in either object to select a step from. The
 * resolution taken here: `roadmap` is an OPTIONAL third parameter, typed
 * as the existing, unmodified `Roadmap` (never a new structure), which the
 * engine itself never fetches (staying pure/no I/O) — a future caller that
 * already has a fresh Roadmap in hand (e.g. from findCachedRoadmap, the
 * same read Home/Coach already perform) may pass it in. When omitted or
 * null, Tier 1 is skipped entirely and the engine falls through to Tier 2 —
 * never invented, never guessed. types/careerState.ts was NOT modified to
 * work around this; expanding it was explicitly the option this report
 * chose not to take silently.
 */
export function selectNextMove(
  state: CareerState,
  summary: CareerStateSummary,
  roadmap?: Roadmap | null,
): NextMove {
  // Gate, checked first and unconditionally: no destination means nothing
  // below can be personalised. Never interpreted as a capability gap, a
  // lack of ability, or a generic deficiency — see types/nextMove.ts's own
  // doc comment on NextMoveNeedsDestination.
  if (summary.destinationState === "no_destination") {
    return {
      type: "needs_destination",
      title: "No target role set yet",
      description:
        "Add a target role in your Profile so VELYQO can point you toward a specific next step.",
    };
  }

  // TIER 0 — the highest-priority priority_gap, exactly as
  // careerStateService already selected it (capabilityMissionService
  // .selectPriorityCapabilityGap: lowest valid priority_rank wins,
  // AI-generation order preserved within a tier). Reading it here, not
  // recalculating it, is what satisfies "do not recalculate or repair
  // priority ranks" and "do not duplicate an existing mission-selection
  // algorithm." A capability whose status has moved past "priority_gap"
  // (Step 7's evidence flow) is automatically excluded here for free —
  // selectPriorityCapabilityGap already filters strictly on
  // status === "priority_gap", so CareerState.focus.priorityCapabilityGap
  // is null the moment a capability progresses, with no separate
  // completed-mission lookup needed.
  const { priorityCapabilityGap, activeMission } = state.focus;

  if (priorityCapabilityGap !== null && activeMission !== null) {
    return {
      type: "capability_gap",
      title: activeMission.mission.title,
      description: activeMission.mission.description,
      capabilityGapId: priorityCapabilityGap.id,
      capabilityName: priorityCapabilityGap.capability_name,
      mission: activeMission.mission,
    };
  }

  // TIER 1 — the real next step of an already-cached roadmap, exactly as
  // useDashboard's own Tier 1 already selects it (roadmap.steps[0] via
  // missionFromRoadmapStep) — never regenerated, never a second selection
  // algorithm. See the file-level comment for why `roadmap` is an
  // optional parameter rather than something CareerState itself carries.
  if (roadmap && roadmap.steps.length > 0) {
    const mission = missionFromRoadmapStep(roadmap.steps[0]);

    return {
      type: "roadmap",
      title: mission.title,
      description: mission.description,
      mission,
    };
  }

  // TIER 2 — the existing generic fallback, but only while there is
  // genuinely nothing else to go on yet (destinationState === "destination
  // _set": a target role exists, no capability assessment has ever been
  // generated for it). Once an assessment exists (destinationState ===
  // "destination_assessed") and neither Tier 0 nor Tier 1 fired, "go
  // research your target role" would be stale, redundant advice — the
  // user has already gone well past that stage — so falling through to an
  // honest "up_to_date" is more correct than repeating Tier 2 forever.
  // This condition is read directly from the already-computed
  // destinationState fact, not a new score or threshold.
  //
  // startingSituation is passed as "" (the app's existing "not answered"
  // convention) because CareerStateProfileContext does not carry it —
  // unlike the roadmap gap above, this is a minor, already-safely-
  // degrading default fallbackMission's own logic already tolerates
  // (impliesNoProfessionalExperience("") is false), not a structural
  // blocker, so no parameter was added for it.
  if (summary.destinationState === "destination_set") {
    const mission = fallbackMission(
      state.destination.targetRole,
      state.destination.currentRole,
      "",
    );

    return {
      type: "generic",
      title: mission.title,
      description: mission.description,
      mission,
    };
  }

  // TIER 3B — a destination and an assessment both exist, but nothing is
  // currently actionable (no priority gap, no roadmap step, and Tier 2 is
  // deliberately not repeated once an assessment exists). Honest, not
  // manufactured urgency.
  return {
    type: "up_to_date",
    title: "Nothing outstanding right now",
    description:
      "There's no priority capability gap or roadmap step waiting for you at the moment.",
  };
}
