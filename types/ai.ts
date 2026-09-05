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
}
