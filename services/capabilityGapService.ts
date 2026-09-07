import { supabase } from "../lib/supabase";
import { CapabilityEvidence, CapabilityGap } from "../types/capability";

/**
 * All capability_gaps rows for a user's given target role, oldest first.
 * Scoped by role because a gap only means something relative to a specific
 * target — rows from a previous target role are expected to be deleted
 * before new ones are generated (a later step), not filtered out here.
 *
 * Read-only. Returns `data: []` (not null) when the user has no rows for
 * this role, so callers never need to special-case "no assessment yet".
 */
export async function getCapabilityGaps(userId: string, targetRole: string) {
  return await supabase
    .from("capability_gaps")
    .select("*")
    .eq("user_id", userId)
    .eq("target_role", targetRole)
    .order("created_at", { ascending: true })
    .returns<CapabilityGap[]>();
}

/**
 * A single capability_gaps row by id, scoped to the given user. Returns
 * `data: null` both when the row doesn't exist at all and when it exists
 * but belongs to a different user — RLS already makes those
 * indistinguishable from here, and every caller that needs this (e.g.
 * verifying ownership before recording evidence) should treat both cases
 * identically: refuse to proceed. Read-only, like the rest of this
 * service.
 */
export async function getCapabilityGapById(
  userId: string,
  capabilityGapId: string,
) {
  return await supabase
    .from("capability_gaps")
    .select("*")
    .eq("id", capabilityGapId)
    .eq("user_id", userId)
    .returns<CapabilityGap[]>()
    .maybeSingle();
}

/**
 * Whether a capability assessment already exists for this user's target
 * role. A cheap existence check (count only, no row data) for callers that
 * just need to decide whether to trigger generation later. Returns false
 * on a fetch error as well as on a genuine empty result — a conservative
 * default, not a claim that no assessment exists.
 */
export async function hasCapabilityAssessment(
  userId: string,
  targetRole: string,
): Promise<boolean> {
  const { count, error } = await supabase
    .from("capability_gaps")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("target_role", targetRole);

  if (error || !count) {
    return false;
  }

  return count > 0;
}

/**
 * Phase 11 Step 3 — every capability_gaps row for a user, across EVERY
 * target role they have ever had, not just their current one. Needed
 * because a piece of evidence (or a Career Check-in decision) can
 * legitimately link to a capability from a PAST target role — capability_
 * gaps rows are never deleted on a target-role change (see
 * careerCheckinConfirmationService's own "historical link" precedent) — so
 * resolving a capability's name for Journey Assembly must not be scoped to
 * the current target role the way getCapabilityGaps deliberately is.
 *
 * Read-only, like the rest of this service. Returns `data: []` (not null)
 * when the user has no capability_gaps rows at all.
 */
export async function getAllCapabilityGapsForUser(userId: string) {
  return await supabase
    .from("capability_gaps")
    .select("*")
    .eq("user_id", userId)
    .returns<CapabilityGap[]>();
}

/**
 * All capability_evidence rows for a single capability gap, oldest first —
 * accumulation order matters for future status-escalation logic (e.g. "a
 * second independent evidence event"), even though this step doesn't
 * implement that logic yet.
 */
export async function getCapabilityEvidence(capabilityGapId: string) {
  return await supabase
    .from("capability_evidence")
    .select("*")
    .eq("capability_gap_id", capabilityGapId)
    .order("created_at", { ascending: true })
    .returns<CapabilityEvidence[]>();
}
