import { CapabilityGap } from "./capability";
import {
  EducationLevel,
  ExperienceLevel,
  TargetTimeframe,
} from "./careerContext";
import { JournalEntry } from "./journal";
import { Mission } from "./mission";
import { RoadmapJourneyEstimate } from "./roadmap";

/**
 * Phase 9 — Adaptive Career GPS.
 *
 * CareerState is VELYQO's current understanding of where a user stands
 * relative to their chosen career destination. It is a DERIVED application
 * object, never a persisted database entity: every field below is either
 * copied or filtered from data that already exists in `profiles`,
 * `capability_gaps`, `capability_evidence`, `user_progress` and
 * `career_journal` (via the app's existing services), reassembled into one
 * shape a future Next Move Engine can read without re-deriving it from
 * scratch each time. This file defines only that shape — no service builds
 * it yet (a later Phase 9 step), and nothing here changes how or where the
 * underlying data is stored.
 *
 * Product principle this contract exists to serve: AI proposes; VELYQO
 * decides and remembers. Nothing in CareerState is itself an AI call or an
 * AI response — it is VELYQO's own record of what it already knows.
 *
 * Design rules a future assembler must keep honouring:
 * - Missing information is represented honestly (the existing `""` /
 *   `null` / empty-array conventions already used by UserData, Roadmap and
 *   AIContext — never a guessed or defaulted value standing in for
 *   "unknown").
 * - No percentages, confidence numbers, or readiness scores are part of
 *   this contract, even though a pre-existing one (`user_progress
 *   .career_readiness`) exists elsewhere in the schema — deliberately not
 *   pulled in here (see CareerStateProgress).
 * - Capability status terminology is reused exactly as-is from
 *   types/capability.ts (`unknown` | `developing` | `strength` |
 *   `priority_gap`) — this file never redefines or renames it.
 * - Self-reported skills (CareerStateProfileContext.skills) and
 *   demonstrated capability evidence (the `capabilities` list, backed by
 *   capability_evidence rows) stay visibly distinct fields — never merged
 *   into one undifferentiated "skills" bucket.
 * - The shape is intentionally pathway-agnostic (nothing here assumes a
 *   professional-career pathway specifically) so a future Student/Explorer
 *   or Financial Freedom pathway could populate the same contract — but no
 *   pathway-specific field has been added speculatively; that waits until
 *   a pathway actually needs it.
 */

/**
 * Where the user is headed, and on what rough timeline. Reuses the exact
 * string+"" convention profiles/UserData already use for "not yet
 * answered" — never null, never a placeholder string.
 */
export interface CareerStateDestination {
  currentRole: string;

  targetRole: string;

  targetTimeframe: TargetTimeframe | "";
}

/**
 * Background context about the user themselves, independent of the
 * destination. `skills` is exactly what the user typed/selected during
 * onboarding or Profile — self-reported, not verified by any completed
 * mission. Demonstrated capability evidence lives separately in
 * CareerState.capabilities; the two are never merged.
 */
export interface CareerStateProfileContext {
  experienceLevel: ExperienceLevel | "";

  educationLevel: EducationLevel | "";

  skills: string[];
}

/**
 * Honest, non-numeric-score progress signals. Deliberately does not
 * include `user_progress.career_readiness` — that is a 0-100 score, and
 * this contract's design rule is no percentages or readiness scores;
 * `missionsCompleted` and `currentStreak` are plain counts, not scores.
 */
export interface CareerStateProgress {
  missionsCompleted: number;

  currentStreak: number;

  /**
   * However many of the user's most-recent career_journal entries the
   * assembling service chooses to include (that choice belongs to that
   * future service, not to this contract) — never a claim that this is
   * the complete history.
   */
  recentActivity: JournalEntry[];

  /**
   * Reuses roadmap.ts's own estimate shape exactly. Null whenever no
   * cached roadmap exists yet — never a guessed duration standing in for
   * "we don't know".
   */
  journeyProgress: RoadmapJourneyEstimate | null;
}

/**
 * The mission the user is currently pointed at, from whichever tier
 * supplied it (the Tier 0 capability mission, a Tier 1 roadmap step, or
 * the Tier 2 generic fallback — see capabilityMissionService and
 * careerMissionService). `capabilityGapId`/`capabilityName` mirror the
 * exact pairing already threaded through Home → Coach → Mission Complete
 * (Phase 8 Step 6) — non-null only when `mission` is the Tier 0 capability
 * mission; null for a Tier 1/2 mission, which has no capability link.
 */
export interface CareerStateActiveMission {
  mission: Mission;

  capabilityGapId: string | null;

  capabilityName: string | null;
}

/**
 * What VELYQO would currently point the user toward, if asked right now.
 * Both fields are independently nullable — a priority gap can exist with
 * no mission started for it yet, and (rarely) no mission may be derivable
 * at all (e.g. profile still loading).
 */
export interface CareerStateFocus {
  /**
   * The same single highest-priority capability_gaps row Home's Tier 0
   * mission selection already derives (capabilityMissionService
   * .selectPriorityCapabilityGap) — null whenever no priority_gap exists,
   * which is a normal, honest outcome, not an error.
   */
  priorityCapabilityGap: CapabilityGap | null;

  activeMission: CareerStateActiveMission | null;
}

/**
 * VELYQO's full current understanding of one user's career position.
 * Assembled entirely from already-persisted data (see the file-level
 * comment); a future assembling service is expected to return
 * `CareerState | null` for a user with no target role yet, the same way
 * getAIContext() returns `AIContext | null` today — that decision belongs
 * to that future service, not to this type.
 *
 * `capabilities` intentionally stays a single list rather than four
 * pre-split arrays (strengths/developing/priorityGaps/unassessed): each
 * row's own `status` field already fully encodes which of the four
 * categories it belongs to (see types/capability.ts), exactly like
 * career-gaps.tsx and capabilityMissionService already filter it — a
 * future consumer groups by `status` the same way, rather than this
 * contract duplicating that grouping ahead of any code that needs it.
 */
export interface CareerState {
  destination: CareerStateDestination;

  profileContext: CareerStateProfileContext;

  /** Every capability_gaps row for the current target role, across all
   * four statuses (unknown, developing, strength, priority_gap). */
  capabilities: CapabilityGap[];

  progress: CareerStateProgress;

  focus: CareerStateFocus;
}
