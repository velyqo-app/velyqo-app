import { supabase } from "../lib/supabase";
import { GeneratedCapability } from "./capabilityGenerationService";
import { CapabilityGap, CapabilityStatus } from "../types/capability";

const MIN_CAPABILITIES = 6;
const MAX_CAPABILITIES = 10;

/**
 * Deterministic initial status for a freshly generated capability — the AI
 * proposes the capability, name, description and importance; VELYQO alone
 * decides what status that implies. Never returns "strength": initial
 * generation has no completed-mission evidence to justify that yet.
 *
 * - A self-reported skill match means the person claims something related,
 *   which is real but unproven — "developing", not "strength".
 * - No match, but the role genuinely can't be done without it (critical) or
 *   normally needs it (important) — a "priority_gap": important enough to
 *   act on despite there being no evidence yet, never a claim the person
 *   lacks it.
 * - No match, and the role only benefits from it (helpful) — "unknown":
 *   genuinely low-stakes and unaddressed, not worth prioritising yet.
 */
export function determineInitialStatus(
  capability: GeneratedCapability,
): CapabilityStatus {
  if (capability.matchesConfirmedSkill !== null) {
    return "developing";
  }

  if (capability.importance === "critical" || capability.importance === "important") {
    return "priority_gap";
  }

  return "unknown";
}

export type SaveAssessmentResult =
  | { data: CapabilityGap[]; error: null }
  | { data: null; error: string };

/**
 * Persists a freshly generated, already-validated capability list as one
 * user's initial assessment for a target role.
 *
 * Written as a single multi-row INSERT (one `.insert(array)` call is one
 * PostgREST request, which Postgres executes as one SQL
 * `INSERT ... VALUES (...), (...), ...` statement) rather than N separate
 * inserts. A single INSERT statement is atomic on its own — if any row
 * fails (e.g. the user_id+target_role+capability_name unique constraint
 * catching a concurrent duplicate generation), the whole statement rolls
 * back and nothing is written. This is real transactional safety from the
 * existing client architecture; no RPC was needed or added for it.
 *
 * Re-checks the 6-10 bound even though the only caller
 * (capabilityGenerationService.generateCapabilities) already guarantees
 * it — this function is the last line of defense before a real write and
 * must not trust its input blindly.
 */
export async function saveCapabilityAssessment(
  userId: string,
  targetRole: string,
  capabilities: GeneratedCapability[],
): Promise<SaveAssessmentResult> {
  if (
    capabilities.length < MIN_CAPABILITIES ||
    capabilities.length > MAX_CAPABILITIES
  ) {
    return {
      data: null,
      error: `refusing_to_persist_out_of_bounds_count (${capabilities.length})`,
    };
  }

  const rows = capabilities.map((capability) => ({
    user_id: userId,
    target_role: targetRole,
    capability_name: capability.name,
    capability_description: capability.description,
    importance: capability.importance,
    status: determineInitialStatus(capability),
  }));

  const { data, error } = await supabase
    .from("capability_gaps")
    .insert(rows)
    .select()
    .returns<CapabilityGap[]>();

  if (error || !data) {
    return { data: null, error: error?.message ?? "insert_failed" };
  }

  return { data, error: null };
}
