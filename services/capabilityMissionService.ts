import { applyPriorityRanking } from "./capabilityPriorityService";
import { CapabilityGap } from "../types/capability";
import { Mission } from "../types/mission";

const CAPABILITY_MISSION_ESTIMATED_TIME = "20 mins";

/**
 * Picks the single capability to act on next: the "priority_gap" row with
 * the lowest (highest-priority) rank. Ranks are only ever assigned to
 * priority_gap rows (capabilityPriorityService, Step 5), so filtering on
 * status is technically redundant with filtering on a non-null rank — kept
 * anyway so this reads correctly on its own, without depending on that
 * invariant holding elsewhere. Returns null when there is nothing to rank,
 * which callers treat as "fall back to the existing mission pipeline",
 * never as an error.
 */
export function selectPriorityCapabilityGap(
  gaps: CapabilityGap[],
): CapabilityGap | null {
  let best: CapabilityGap | null = null;

  for (const gap of gaps) {
    if (gap.status !== "priority_gap" || gap.priority_rank === null) {
      continue;
    }

    if (best === null || gap.priority_rank < (best.priority_rank as number)) {
      best = gap;
    }
  }

  return best;
}

function endsWithTerminalPunctuation(text: string): boolean {
  return /[.!?]$/.test(text);
}

/**
 * Deterministic Tier 0 mission for a capability gap — no AI call, no
 * invented project/employer/technology/qualification. Frames the mission as
 * building evidence, never as a claim the user currently lacks the
 * capability. Incorporates the AI-authored capability_description when
 * present (Step 3's contract requires it to be one honest sentence about
 * what the capability means for the role, never a claim about this
 * specific person — safe to surface verbatim), falling back to the fully
 * generic template otherwise.
 */
export function missionFromCapabilityGap(gap: CapabilityGap): Mission {
  const name = gap.capability_name.trim();
  const description = gap.capability_description?.trim();

  const roleContext = description
    ? endsWithTerminalPunctuation(description)
      ? description
      : `${description}.`
    : null;

  return {
    title: `Build evidence for ${name}`,

    description: roleContext
      ? `Complete one focused task that demonstrates ${name}. ${roleContext} Use the task to create something concrete you can point to or discuss.`
      : `Complete one focused task that demonstrates ${name}. Use the task to create something concrete you can point to or discuss.`,

    estimatedTime: CAPABILITY_MISSION_ESTIMATED_TIME,

    impact: `Builds real evidence toward "${name}" for ${gap.target_role}.`,
  };
}

export interface CapabilityMissionResult {
  mission: Mission;
  capabilityGapId: string;
  capabilityName: string;
}

/**
 * Read-only Tier 0 mission lookup for Home: reuses capabilityPriorityService
 * (Step 5) rather than a new query — one read, and (only the first time
 * after a generation, if ever needed) one already-atomic upsert it owns, no
 * AI call either way. Returns null on any failure or absence — a missing
 * target role, a read error, no assessment yet, or an assessment with no
 * priority_gap rows — so callers can treat this as "no Tier 0 mission
 * available right now" and fall through to the existing roadmap/generic
 * mission pipeline without ever surfacing a capability-engine error on
 * Home. Never throws.
 */
export async function selectCapabilityMission(
  userId: string,
  targetRole: string,
): Promise<CapabilityMissionResult | null> {
  const target = targetRole.trim();

  if (!target) {
    return null;
  }

  try {
    const { data, error } = await applyPriorityRanking(userId, target);

    if (error || !data) {
      return null;
    }

    const gap = selectPriorityCapabilityGap(data);

    if (!gap) {
      return null;
    }

    return {
      mission: missionFromCapabilityGap(gap),
      capabilityGapId: gap.id,
      capabilityName: gap.capability_name,
    };
  } catch (thrown) {
    console.warn("Capability mission lookup failed, falling back:", thrown);

    return null;
  }
}
