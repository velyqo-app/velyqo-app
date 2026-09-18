import { RecentCapabilityMilestones } from "../services/capabilityDevelopmentTimelineService";
import { RecentDirectionChange } from "../services/careerDirectionHistoryService";
import { CareerStandingBrief } from "../services/careerStandingBriefService";
import { Momentum } from "../services/momentumService";
import { SalaryPriority } from "./careerContext";
import { JournalEntry } from "./journal";
import { Mission } from "./mission";
import { Profile } from "./profile";
import { Progress } from "./progress";
import { Roadmap } from "./roadmap";

export interface AIContext {
  profile: Profile;
  progress: Progress;
  mission: Mission;
  momentum: Momentum;
  journal: JournalEntry[];

  /** Read-only peek at an already-cached roadmap, the same one Home/Journey
   * would show — never built or generated here. Null when the user has no
   * target role yet, or nothing has been generated for it. */
  roadmap: Roadmap | null;

  /** The user's stored salary-priority choice from a resolved Destination
   * Decision, or null when none has ever been made for their current target. */
  priority: SalaryPriority | null;

  /**
   * Phase 14 — Career Standing Intelligence. VELYQO's own deterministic,
   * current-target-role-only summary of accumulated capability/evidence
   * standing (see services/careerStandingBriefService.ts). Enrichment
   * only: null whenever the underlying reads fail, or the user has no
   * target role yet — Coach must remain fully usable either way.
   */
  standingBrief: CareerStandingBrief | null;

  /**
   * Phase 15 — Career Direction History. The most recent prior target-role
   * destination only (see services/careerDirectionHistoryService.ts) —
   * never the full historical episode list, which must not reach the Coach
   * prompt. Enrichment only: null whenever the underlying reads fail, or
   * the user has never changed their target role — Coach must remain fully
   * usable either way.
   */
  directionChange: RecentDirectionChange | null;

  /**
   * Phase 16 — Capability Development Timeline. The most recent
   * reconstructed capability-status milestones (developing/strength) for
   * the current target role only (see
   * services/capabilityDevelopmentTimelineService.ts) — never the full
   * timeline, and never an elapsed-time value between entries, which this
   * feature never computes anywhere. Enrichment only: null whenever the
   * underlying reads fail, or no milestone has ever been reached — Coach
   * must remain fully usable either way.
   */
  capabilityMilestones: RecentCapabilityMilestones | null;
}
