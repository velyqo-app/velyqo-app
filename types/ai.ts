import { Momentum } from "../services/momentumService";
import { JournalEntry } from "./journal";
import { Mission } from "./mission";
import { Profile } from "./profile";
import { Progress } from "./progress";

export interface AIContext {
  profile: Profile;
  progress: Progress;
  mission: Mission;
  momentum: Momentum;
  journal: JournalEntry[];
}
