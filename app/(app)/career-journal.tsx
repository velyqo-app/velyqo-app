import { Redirect } from "expo-router";

/**
 * Phase 11 Step 4 — this route no longer maintains its own history UI.
 * Story (Journey tab, "how did I get here") is a strict superset of what
 * this screen ever showed — a plain career_journal list — plus real
 * check-in/mission/profile-edit structure, provenance, and capability
 * evidence. Redirecting here (rather than deleting the route) keeps every
 * existing caller — Profile's own link included, though it now points
 * directly at Story — working without needing to know this changed.
 */
export default function CareerJournalScreen() {
  return <Redirect href={{ pathname: "/timeline", params: { view: "story" } }} />;
}
