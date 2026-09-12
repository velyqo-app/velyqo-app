import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  BackHandler,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import ScreenHeader from "../../components/ui/ScreenHeader";
import ProvenanceBadge from "../../components/journey/ProvenanceBadge";
import { formatEventDate } from "../../components/journey/StoryEventCard";
import { Colors, Spacing } from "../../constants/theme";
import { useProfile } from "../../hooks/useProfile";
import {
  countEvidenceByProvenance,
  describeEvidenceSummary,
  reconstructCapabilityMilestones,
} from "../../services/capabilityAchievementService";
import { getCapabilityGapById } from "../../services/capabilityGapService";
import { getCapabilityEvidenceTrails } from "../../services/capabilityEvidenceTrailService";
import { missionFromCapabilityGap } from "../../services/capabilityMissionService";
import { CAPABILITY_STATUS_LABELS as STATUS_LABELS } from "../../types/capability";
import { CapabilityEvidenceTrail } from "../../types/capabilityEvidenceTrail";

/**
 * Phase 11 Step 4 — the Capability Evidence Trail's own screen: "why does
 * VELYQO currently assess this capability this way." A hidden route
 * (href: null in _layout.tsx), reached only by push from Story — never a
 * tab, matching career-gaps/career-checkin/mission-complete/career-
 * journal's own established convention exactly.
 *
 * Never recomputes status: currentStatus is read straight off the
 * fetched CapabilityGap-derived trail, exactly as
 * capabilityEvidenceTrailService already resolved it from
 * capability_gaps.status.
 *
 * Phase 13 — Career Achievement Record. This screen additionally renders
 * capabilityAchievementService's deterministic milestone reconstruction and
 * evidence summary (both pure, computed here from the same trail.evidence
 * already fetched above — no new query), and, only for a developing
 * capability belonging to the user's CURRENT target role, a "Build more
 * evidence" entry point back into the existing mission pipeline (see
 * handleBuildMoreEvidence below). Nothing here recomputes or reinterprets
 * capability status — that remains capability_gaps.status alone.
 */

export default function CapabilityEvidenceScreen() {
  const { capabilityGapId, capabilityName } = useLocalSearchParams<{
    capabilityGapId?: string;
    capabilityName?: string;
  }>();

  const { userData } = useProfile();
  const userId = userData.userId;

  const [trail, setTrail] = useState<CapabilityEvidenceTrail | null>(null);
  const [partial, setPartial] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Phase 13 — "Build more evidence" CTA state, entirely local to this
  // screen. Not the same idempotency concern as mission-complete.tsx's own
  // route-key guard: this only fetches a read-only CapabilityGap row and
  // navigates away on success, so a duplicate tap before navigation simply
  // re-fetches the same row rather than recording anything.
  const [buildingMission, setBuildingMission] = useState(false);
  const [buildMissionError, setBuildMissionError] = useState<string | null>(
    null,
  );

  const activeRef = useRef(true);
  const hasLoadedOnce = useRef(false);

  useEffect(() => {
    activeRef.current = true;

    return () => {
      activeRef.current = false;
    };
  }, []);

  const load = useCallback(async () => {
    if (!userId || !capabilityGapId) {
      setLoading(false);
      setNotFound(true);
      return;
    }

    // Mirrors StoryView.tsx's own hasLoadedOnce gate: useFocusEffect below
    // re-runs this on every refocus (backgrounding the app, returning from
    // capability-evidence's own back navigation, etc.), not just the first
    // mount — without this gate, that refetch blanked already-loaded
    // evidence back to a full-screen spinner every single time.
    const showFullLoading = !hasLoadedOnce.current;

    if (showFullLoading) {
      setLoading(true);
    }

    setError(null);
    setNotFound(false);

    const result = await getCapabilityEvidenceTrails(userId);

    if (!activeRef.current) {
      return;
    }

    if (result.error !== null) {
      setError(result.error);
      setLoading(false);
      return;
    }

    const found = result.data.trails.find(
      (candidate) => candidate.capabilityGapId === capabilityGapId,
    );

    if (!found) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    hasLoadedOnce.current = true;

    setTrail(found);
    setPartial(result.data.partial);
    setLoading(false);
  }, [userId, capabilityGapId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  /**
   * Phase 13 — reuses the existing capability mission pipeline exactly:
   * getCapabilityGapById -> missionFromCapabilityGap -> /ai-coach ->
   * (existing, unmodified) /mission-complete -> recordMissionCompletionEvidence
   * -> recalculateCapabilityStatus. No separate mission engine, no AI call —
   * missionFromCapabilityGap is the same deterministic Tier 0 builder Home
   * already uses. getCapabilityGapById re-verifies ownership (scoped to
   * userId) before building anything, exactly as mission-complete.tsx
   * already relies on it doing.
   */
  const handleBuildMoreEvidence = useCallback(async () => {
    if (!userId || !capabilityGapId || !trail) {
      return;
    }

    setBuildingMission(true);
    setBuildMissionError(null);

    const { data: gap, error: gapError } = await getCapabilityGapById(
      userId,
      capabilityGapId,
    );

    if (!activeRef.current) {
      return;
    }

    if (gapError || !gap) {
      setBuildingMission(false);
      setBuildMissionError(
        "We couldn't start a new mission for this capability. Please try again.",
      );
      return;
    }

    const mission = missionFromCapabilityGap(gap);

    setBuildingMission(false);

    router.push({
      pathname: "/ai-coach",
      params: {
        mission: mission.title,
        missionDescription: mission.description,
        capabilityGapId: gap.id,
        capabilityName: gap.capability_name,
      },
    });
  }, [userId, capabilityGapId, trail]);

  // This screen is reached by push from Story, but it lives in the same
  // Tabs navigator as every other screen (href: null, matching career-gaps/
  // career-checkin/career-journal/mission-complete's own convention) — and
  // that Tabs navigator's backBehavior is "initialRoute" (Home takes
  // priority when hardware Back is pressed anywhere else in the tab bar).
  // Left alone, Android hardware Back here would jump straight to Home
  // instead of returning to Story, since a tab navigator's default Back
  // handling doesn't retrace push-style history the way a Stack does.
  // Explicitly routing back to Story on hardware Back — never touching the
  // shared Tabs config, so every other tab keeps its existing behavior.
  useFocusEffect(
    useCallback(() => {
      if (Platform.OS !== "android") {
        return;
      }

      const subscription = BackHandler.addEventListener(
        "hardwareBackPress",
        () => {
          router.push({ pathname: "/timeline", params: { view: "story" } });
          return true;
        },
      );

      return () => subscription.remove();
    }, []),
  );

  // Use the route param immediately for a no-flash heading — never
  // invented, just the same real name the tap that got here already knew.
  const headerTitle = trail?.capabilityName ?? capabilityName ?? "Capability";

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <ScreenHeader title={headerTitle} />

        <View style={styles.centeredContent}>
          <Card>
            <Text style={styles.emptyTitle}>
              We couldn&apos;t load this capability&apos;s evidence
            </Text>

            <Text style={styles.emptyText}>{error}</Text>

            <View style={styles.buttonSpacing}>
              <Button title="Retry" onPress={load} />
            </View>
          </Card>
        </View>
      </SafeAreaView>
    );
  }

  if (!loading && notFound) {
    return (
      <SafeAreaView style={styles.container}>
        <ScreenHeader title={headerTitle} />

        <View style={styles.centeredContent}>
          <Card>
            <Text style={styles.emptyTitle}>
              We couldn&apos;t find this capability
            </Text>

            <Text style={styles.emptyText}>
              It may no longer be available.
            </Text>
          </Card>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title={headerTitle} />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {loading || !trail ? (
          <ActivityIndicator
            size="large"
            color={Colors.primary}
            style={styles.spinner}
          />
        ) : (
          <>
            {partial ? (
              <Text style={styles.partialNote}>
                Some history details couldn&apos;t load right now.
              </Text>
            ) : null}

            <Card>
              <ProvenanceBadge variant="assessment" />

              <Text style={styles.statusValue}>
                {STATUS_LABELS[trail.currentStatus]}
              </Text>

              {!trail.isCurrentTargetRole ? (
                <Text style={styles.historicalNote}>
                  From a previous goal: {trail.targetRole}
                </Text>
              ) : null}

              <Text style={styles.evidenceSummary}>
                {describeEvidenceSummary(
                  countEvidenceByProvenance(trail.evidence),
                )}
              </Text>

              {(() => {
                const milestones = reconstructCapabilityMilestones(
                  trail.evidence,
                );

                return (
                  <>
                    {milestones.firstEvidenceDate ? (
                      <Text style={styles.milestoneRow}>
                        First evidence ·{" "}
                        {formatEventDate(milestones.firstEvidenceDate)}
                      </Text>
                    ) : null}

                    {milestones.developingAt ? (
                      <Text style={styles.milestoneRow}>
                        Became Developing ·{" "}
                        {formatEventDate(milestones.developingAt)}
                      </Text>
                    ) : null}

                    {milestones.strengthAt ? (
                      <Text style={styles.milestoneRow}>
                        Became a Strength ·{" "}
                        {formatEventDate(milestones.strengthAt)}
                      </Text>
                    ) : null}
                  </>
                );
              })()}
            </Card>

            {trail.currentStatus === "developing" &&
            trail.isCurrentTargetRole ? (
              <View style={styles.ctaBlock}>
                <Button
                  title="Build more evidence"
                  onPress={handleBuildMoreEvidence}
                  disabled={buildingMission}
                />

                {buildMissionError ? (
                  <Text style={styles.ctaError}>{buildMissionError}</Text>
                ) : null}
              </View>
            ) : null}

            <Text style={styles.sectionHeading}>Evidence</Text>

            {trail.evidence.length === 0 ? (
              <Card>
                <Text style={styles.emptyText}>
                  No evidence recorded yet for this capability.
                </Text>
              </Card>
            ) : (
              trail.evidence.map((item) => (
                <Card key={item.id}>
                  <View style={styles.evidenceHeaderRow}>
                    <ProvenanceBadge variant={item.provenance} />

                    <Text style={styles.date}>
                      {formatEventDate(item.date)}
                    </Text>
                  </View>

                  <Text style={styles.note}>{item.note}</Text>

                  {item.sourceReference ? (
                    <Text style={styles.sourceReference}>
                      {item.sourceReference}
                    </Text>
                  ) : null}
                </Card>
              ))
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  content: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xl,
  },

  centeredContent: {
    flex: 1,
    justifyContent: "center",
    padding: Spacing.lg,
  },

  spinner: {
    marginTop: Spacing.xl,
  },

  emptyTitle: {
    color: Colors.text,
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
  },

  emptyText: {
    color: Colors.subtext,
    textAlign: "center",
    marginTop: 10,
    lineHeight: 22,
  },

  buttonSpacing: {
    marginTop: Spacing.lg,
  },

  partialNote: {
    color: Colors.subtext,
    fontSize: 12,
    textAlign: "center",
    marginBottom: Spacing.md,
    fontStyle: "italic",
  },

  statusValue: {
    color: Colors.text,
    fontSize: 22,
    fontWeight: "700",
    marginTop: Spacing.sm,
  },

  historicalNote: {
    color: Colors.subtext,
    fontSize: 13,
    marginTop: Spacing.xs,
  },

  evidenceSummary: {
    color: Colors.text,
    fontSize: 14,
    lineHeight: 20,
    marginTop: Spacing.md,
  },

  milestoneRow: {
    color: Colors.subtext,
    fontSize: 12,
    marginTop: 4,
  },

  ctaBlock: {
    marginTop: Spacing.md,
  },

  ctaError: {
    color: Colors.subtext,
    fontSize: 12,
    textAlign: "center",
    marginTop: Spacing.sm,
  },

  sectionHeading: {
    color: Colors.text,
    fontSize: 17,
    fontWeight: "700",
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },

  evidenceHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },

  date: {
    color: Colors.subtext,
    fontSize: 12,
  },

  note: {
    color: Colors.text,
    fontSize: 14,
    lineHeight: 20,
  },

  sourceReference: {
    color: Colors.subtext,
    fontSize: 12,
    marginTop: 6,
    fontStyle: "italic",
  },
});
