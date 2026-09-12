import { generateCapabilities } from "./capabilityGenerationService";
import { hasCapabilityAssessment } from "./capabilityGapService";
import { saveCapabilityAssessment } from "./capabilityPersistenceService";
import { applyPriorityRanking } from "./capabilityPriorityService";
import { CapabilityGap } from "../types/capability";

export type LoadOrCreateAssessmentResult =
  | { data: CapabilityGap[]; error: null }
  | { data: null; error: string };

/**
 * Phase 12 — one in-flight generate-if-needed run per (user, target role),
 * shared by every caller in this process: the Career Gaps screen's own
 * hook (useCapabilityGaps.ts) AND the background triggers below. A second
 * caller for the SAME key while one is already running joins the SAME
 * promise instead of starting a second AI call/insert — e.g. a user
 * opening Career Gaps while a background trigger fired from Profile is
 * still generating for that exact role.
 *
 * This only dedupes within one JS process. It does not protect against two
 * separate app processes/devices racing at the same instant for the same
 * user + target role — the pre-persistence re-check inside
 * runLoadOrCreateAssessment below, and the existing DB unique constraint
 * on capability_gaps (user_id, target_role, capability_name), remain the
 * backstops for that.
 */
const inFlightAssessments = new Map<
  string,
  Promise<LoadOrCreateAssessmentResult>
>();

function assessmentKey(userId: string, targetRole: string): string {
  return `${userId}::${targetRole}`;
}

/**
 * Whether a generate-if-needed run is currently in flight, in this
 * process, for this exact user + target role. Read-only, synchronous, no
 * I/O — a lightweight signal Home uses (see hooks/useDashboard.ts) to
 * avoid presenting the generic Tier 2 fallback mission as though it were
 * final while an assessment is actively being prepared in the background.
 *
 * Deliberately NOT persisted anywhere: this is in-memory session state
 * only, exactly like every other piece of "is something happening right
 * now" state in this app (e.g. the hook's own inFlightForRole ref) — it
 * resets on app restart, which is acceptable because the underlying
 * generation is itself resumable (the next visit to Career Gaps, or the
 * next trigger call, simply re-evaluates from scratch).
 */
export function isCapabilityAssessmentInProgress(
  userId: string,
  targetRole: string,
): boolean {
  if (!userId || !targetRole.trim()) {
    return false;
  }

  return inFlightAssessments.has(assessmentKey(userId, targetRole.trim()));
}

/**
 * Reads a user's persisted capability assessment for a target role, or
 * generates and persists one when none exists yet.
 *
 * Phase 12 — extracted from hooks/useCapabilityGaps.ts (formerly a private
 * `loadOrCreateAssessment`) so this exact logic has no React dependency
 * and can be called from onboarding/Profile/Career Check-in as well as the
 * Career Gaps screen. Nothing about the generation/validation/persistence/
 * ranking behaviour changed in the move — only two things were added:
 * cross-caller in-flight de-duplication (above) and a pre-persistence
 * concurrency re-check (below).
 */
export async function loadOrCreateCapabilityAssessment(
  userId: string,
  currentRole: string,
  targetRole: string,
  confirmedSkills: string[],
): Promise<LoadOrCreateAssessmentResult> {
  const key = assessmentKey(userId, targetRole);

  const existing = inFlightAssessments.get(key);

  if (existing) {
    return existing;
  }

  const run = runLoadOrCreateAssessment(
    userId,
    currentRole,
    targetRole,
    confirmedSkills,
  ).finally(() => {
    inFlightAssessments.delete(key);
  });

  inFlightAssessments.set(key, run);

  return run;
}

async function runLoadOrCreateAssessment(
  userId: string,
  currentRole: string,
  targetRole: string,
  confirmedSkills: string[],
): Promise<LoadOrCreateAssessmentResult> {
  const rankedExisting = await applyPriorityRanking(userId, targetRole);

  if (rankedExisting.error !== null) {
    // rankedExisting.error is an internal/backend string (e.g. a raw
    // Postgrest error message) never meant for a user to read directly —
    // logged for debugging, replaced with the same honest, generic wording
    // every other failure branch here uses.
    console.warn("Capability gap read failed:", rankedExisting.error);

    return {
      data: null,
      error: "We couldn't load your capability assessment. Please try again.",
    };
  }

  if (rankedExisting.data.length > 0) {
    return { data: rankedExisting.data, error: null };
  }

  const generated = await generateCapabilities({
    currentRole,
    targetRole,
    skills: confirmedSkills,
  });

  if (!generated) {
    return {
      data: null,
      error: "We couldn't generate your capability assessment. Please try again.",
    };
  }

  // Concurrency re-check: the AI call above can take long enough for a
  // DIFFERENT process (another device, or a second app session for the
  // same account) to have completed its own generation for this exact
  // user + target role in the meantime. The in-flight map above only
  // dedupes callers within THIS process — this is the cross-process guard:
  // never persist a second, redundant assessment set once one already
  // exists, even though our own freshly generated set is itself perfectly
  // valid on its own.
  const alreadyPersisted = await hasCapabilityAssessment(userId, targetRole);

  if (alreadyPersisted) {
    const existingRanked = await applyPriorityRanking(userId, targetRole);

    if (existingRanked.error !== null) {
      console.warn(
        "Capability gap re-read after concurrency check failed:",
        existingRanked.error,
      );

      return {
        data: null,
        error: "We couldn't load your capability assessment. Please try again.",
      };
    }

    return { data: existingRanked.data, error: null };
  }

  const saved = await saveCapabilityAssessment(userId, targetRole, generated);

  if (saved.error !== null) {
    // Same as above — saved.error is an internal string (e.g.
    // "refusing_to_persist_out_of_bounds_count (...)"), not user-facing
    // copy.
    console.warn("Capability assessment save failed:", saved.error);

    return {
      data: null,
      error: "We couldn't generate your capability assessment. Please try again.",
    };
  }

  // Pass the true AI generation order (still available here, before it
  // gets flattened by persistence) so this first ranking pass is exact,
  // not the (created_at, id) fallback. Non-fatal: a fresh, already-valid,
  // already-persisted assessment shouldn't be discarded just because this
  // refinement failed.
  const ranked = await applyPriorityRanking(
    userId,
    targetRole,
    generated.map((capability) => capability.name),
  );

  if (ranked.error !== null) {
    return { data: saved.data, error: null };
  }

  return { data: ranked.data, error: null };
}

export type TriggerAssessmentResult = {
  started: boolean;
  error: string | null;
};

/**
 * Phase 12 — fire-and-forget entry point for the three target-role write
 * paths (onboarding summary, Profile edit, Career Check-in confirmation).
 * Callers are expected to call this WITHOUT awaiting it before navigating
 * or completing their own flow — it exists precisely so a target-role save
 * never has to wait on, or depend on the success of, an AI call.
 *
 * Never throws: every failure (a real generation/persistence error, or
 * anything unexpected) is caught and logged here, never propagated to the
 * caller. Callers may still `await` this if they want the returned
 * status for logging/telemetry, but must never treat a rejection as a
 * reason to fail their own save.
 *
 * No-ops (without touching the in-flight map at all) when userId or
 * targetRole is empty, so every caller can call this unconditionally right
 * after a successful, genuinely-changed target-role write, without its own
 * validity guard.
 */
export async function triggerCapabilityAssessmentIfNeeded(
  userId: string,
  currentRole: string,
  targetRole: string,
  confirmedSkills: string[],
): Promise<TriggerAssessmentResult> {
  const trimmedTargetRole = targetRole.trim();

  if (!userId || !trimmedTargetRole) {
    return { started: false, error: null };
  }

  try {
    // Cheap existence check before touching the heavier generate-if-needed
    // path at all — the common case for this entry point (a target role
    // the user has had before, e.g. reverting a Profile edit) needs
    // nothing more than this.
    const alreadyAssessed = await hasCapabilityAssessment(
      userId,
      trimmedTargetRole,
    );

    if (alreadyAssessed) {
      return { started: false, error: null };
    }

    const result = await loadOrCreateCapabilityAssessment(
      userId,
      currentRole.trim(),
      trimmedTargetRole,
      confirmedSkills,
    );

    if (result.error !== null) {
      console.warn("Background capability assessment failed:", result.error);

      return { started: true, error: result.error };
    }

    return { started: true, error: null };
  } catch (err) {
    console.warn("Background capability assessment threw:", err);

    return { started: true, error: "unexpected_error" };
  }
}
