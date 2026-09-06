import { useRoute } from "@react-navigation/native";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { SafeAreaView, StyleSheet, Text, View } from "react-native";

import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import LoadingScreen from "../../components/ui/LoadingScreen";

import { createJournalEntry } from "../../services/journalService";

import { Colors, Spacing } from "../../constants/theme";

import { getCurrentUser } from "../../services/authService";
import { getCapabilityGapById } from "../../services/capabilityGapService";
import { recordMissionCompletionEvidence } from "../../services/capabilityEvidenceService";
import { recalculateCapabilityStatus } from "../../services/capabilityStatusService";
import { completeMission } from "../../services/progressService";

const MAX_JOURNAL_DESCRIPTION = 200;

function truncate(text: string, max: number): string {
  const trimmed = text.trim();
  return trimmed.length <= max ? trimmed : `${trimmed.slice(0, max - 1).trimEnd()}…`;
}

/**
 * Runs only when this completion is for a Step 6/7 capability mission
 * (capabilityGapId non-empty). Never allowed to affect the outcome of
 * saveMissionProgress below — mission completion and the journal entry
 * have already genuinely succeeded by the time this runs, and nothing here
 * should turn that into a failure the user sees. Every internal step
 * returns/logs its own error rather than throwing, and the caller wraps
 * this call in try/catch as a second line of defense.
 *
 * Verifies the gap belongs to this user before writing anything (a
 * getCapabilityGapById miss covers both "doesn't exist" and "not this
 * user's row" identically — see that function's doc comment) — required
 * because capabilityGapId arrives as a plain route param, not something
 * the server has already verified.
 */
async function recordCapabilityEvidence(
  userId: string,
  capabilityGapId: string,
  capabilityName: string,
  journalEntryId: string | null,
): Promise<void> {
  const { data: gap, error: gapError } = await getCapabilityGapById(
    userId,
    capabilityGapId,
  );

  if (gapError || !gap) {
    console.warn(
      "Capability evidence skipped — gap not found or not owned by user:",
      gapError?.message,
    );
    return;
  }

  const evidenceResult = await recordMissionCompletionEvidence(
    userId,
    capabilityGapId,
    journalEntryId,
    capabilityName,
  );

  if (evidenceResult.error !== null) {
    console.warn("Capability evidence creation failed:", evidenceResult.error);
    return;
  }

  if (!evidenceResult.created) {
    // Already recorded for this exact journal entry — the earlier attempt
    // that created it already triggered recalculation, nothing new here.
    return;
  }

  const statusResult = await recalculateCapabilityStatus(userId, gap);

  if (statusResult.error !== null) {
    console.warn(
      "Capability status recalculation failed (evidence is preserved, will be picked up by a later recalculation):",
      statusResult.error,
    );
  }
}

export type SaveMissionProgressResult = {
  userId: string;
  journalEntryId: string | null;
};

/**
 * Plain module-level helper (no component state) so the two call sites
 * below — the mount effect and retry() — each own their own try/catch and
 * setState calls directly, rather than sharing a closure that captures
 * setState across an effect boundary. missionTitle/missionDescription come
 * from the route params the caller already resolved from the same
 * missionFromRoadmapStep/fallbackMission pipeline Home and Coach use — this
 * never re-derives or re-fetches the mission itself. Falls back to the
 * original generic entry only when the actual mission genuinely wasn't
 * passed in, rather than inventing content.
 *
 * Returns the userId and journal entry id (rather than recording capability
 * evidence itself, as it did before this correction) so the CALLER can
 * apply a component-scoped idempotency guard before invoking the
 * capability evidence step — see MissionCompleteScreen's
 * attemptCapabilityEvidence and the Step 7 correction report for why that
 * guard could not safely live in this plain module-level function.
 */
async function saveMissionProgress(
  missionTitle: string,
  missionDescription: string,
): Promise<SaveMissionProgressResult | null> {
  const {
    data: { user },
  } = await getCurrentUser();

  if (!user) {
    return null;
  }

  const { error: missionError } = await completeMission(user.id);

  if (missionError) {
    throw missionError;
  }

  const title = missionTitle
    ? `Completed: ${missionTitle}`
    : "Completed Today's Mission";

  const description = missionTitle
    ? truncate(
        missionDescription || "Successfully completed today's career mission.",
        MAX_JOURNAL_DESCRIPTION,
      )
    : "Successfully completed today's career mission.";

  const { data: journalEntry, error: journalError } = await createJournalEntry({
    userId: user.id,
    title,
    description,
    entryType: "mission",
  });

  if (journalError) {
    throw journalError;
  }

  return { userId: user.id, journalEntryId: journalEntry?.id ?? null };
}

export default function MissionCompleteScreen() {
  const { missionTitle, missionDescription, capabilityGapId, capabilityName } =
    useLocalSearchParams<{
      missionTitle?: string;
      missionDescription?: string;
      capabilityGapId?: string;
      capabilityName?: string;
    }>();

  // React Navigation assigns a fresh `key` to a route on every navigation
  // action — including router.replace() to this SAME screen — even if the
  // underlying component instance is reused rather than remounted (expo-
  // router's Tabs.Screen keeps hidden screens like this one mounted in the
  // background; see the pre-existing, out-of-scope "route-instance reuse"
  // issue noted elsewhere). That makes route.key a reliable, already-
  // existing identifier for "this specific navigation to Mission Complete"
  // — stable across a Retry tap (which never navigates, just re-runs local
  // state) or an accidental double-invoke of the mount effect, but
  // guaranteed different for any later, genuinely separate completion. No
  // new identifier was invented — this is existing React Navigation
  // infrastructure (@react-navigation/native, already a dependency).
  const route = useRoute();

  const [saving, setSaving] = useState(true);
  const [error, setError] = useState(false);

  // The route.key for which capability evidence has already been
  // attempted, if any. A Retry (or a same-instance double-invoke) reuses
  // the SAME route.key and is refused; a genuinely new completion — even
  // for the identical capability, with identical mission text — arrives
  // via a fresh router.replace() and therefore a fresh route.key, and is
  // correctly allowed through. This intentionally does NOT protect the
  // mission-completion/journal-creation steps above it — see the Step 7
  // correction report for why that remains an accepted, disclosed,
  // out-of-scope limitation.
  const evidenceAttemptedForRouteKey = useRef<string | null>(null);

  const attemptCapabilityEvidence = useCallback(
    (userId: string, journalEntryId: string | null) => {
      if (!capabilityGapId) {
        return;
      }

      if (evidenceAttemptedForRouteKey.current === route.key) {
        return;
      }

      evidenceAttemptedForRouteKey.current = route.key;

      recordCapabilityEvidence(
        userId,
        capabilityGapId,
        capabilityName ?? "",
        journalEntryId,
      ).catch((thrown) => {
        // Mission completion and the journal entry already succeeded by the
        // time this is called — an unexpected throw here (vs. the
        // returned-error paths already handled inside
        // recordCapabilityEvidence) must still never fail the mission
        // completion the user is looking at.
        console.warn("Capability evidence flow failed unexpectedly:", thrown);
      });
    },
    [capabilityGapId, capabilityName, route.key],
  );

  useEffect(() => {
    const run = async () => {
      try {
        const result = await saveMissionProgress(
          missionTitle ?? "",
          missionDescription ?? "",
        );

        if (result) {
          attemptCapabilityEvidence(result.userId, result.journalEntryId);
        }

        setSaving(false);
      } catch (thrown) {
        // Either write can fail independently (a thrown network error, or a
        // returned Supabase error neither call throws on by itself) —
        // either way the user must see a real retry, not a spinner that
        // never resolves.
        console.warn("Mission completion failed:", thrown);

        setError(true);
        setSaving(false);
      }
    };

    run();
  }, [missionTitle, missionDescription, attemptCapabilityEvidence]);

  const retry = () => {
    setSaving(true);
    setError(false);

    saveMissionProgress(missionTitle ?? "", missionDescription ?? "")
      .then((result) => {
        if (result) {
          attemptCapabilityEvidence(result.userId, result.journalEntryId);
        }

        setSaving(false);
      })
      .catch((thrown) => {
        console.warn("Mission completion retry failed:", thrown);

        setError(true);
        setSaving(false);
      });
  };

  if (saving) {
    return <LoadingScreen message="Saving your progress..." />;
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <Card>
            <Text style={styles.errorTitle}>
              We couldn&apos;t save your progress
            </Text>

            <Text style={styles.errorText}>
              Please check your connection and try again.
            </Text>

            <View style={styles.buttonSpacing}>
              <Button title="Retry" onPress={retry} />
            </View>
          </Card>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Card>
          <Text style={styles.badge}>MISSION COMPLETE</Text>

          <Text style={styles.title}>Nice work.</Text>

          <Text style={styles.subtitle}>
            You completed today&apos;s mission.
          </Text>

          <View style={styles.divider} />

          <Text style={styles.metric}>Momentum increased</Text>

          <Text style={styles.metric}>Career readiness updated</Text>

          <Text style={styles.metric}>
            One step closer to your target career
          </Text>

          <View style={styles.buttonSpacing}>
            <Button
              title="Return to Career Brief"
              onPress={() => router.replace("/dashboard")}
            />
          </View>
        </Card>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: "center",
  },

  content: {
    padding: Spacing.lg,
  },

  badge: {
    color: Colors.success,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.4,
    textAlign: "center",
    marginBottom: Spacing.sm,
  },

  title: {
    color: Colors.text,
    fontSize: 26,
    fontWeight: "800",
    textAlign: "center",
  },

  subtitle: {
    color: Colors.subtext,
    textAlign: "center",
    marginTop: Spacing.xs,
    fontSize: 15,
    lineHeight: 22,
  },

  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing.lg,
  },

  metric: {
    color: Colors.text,
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: Spacing.xs,
  },

  buttonSpacing: {
    marginTop: Spacing.lg,
  },

  errorTitle: {
    color: Colors.text,
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
  },

  errorText: {
    color: Colors.subtext,
    textAlign: "center",
    marginTop: Spacing.sm,
    fontSize: 15,
    lineHeight: 22,
  },
});
