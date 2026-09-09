import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  BackHandler,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import ScreenHeader from "../../components/ui/ScreenHeader";
import ProvenanceBadge from "../../components/journey/ProvenanceBadge";
import { formatEventDate } from "../../components/journey/StoryEventCard";
import { Colors, Spacing } from "../../constants/theme";
import { useProfile } from "../../hooks/useProfile";
import { getCapabilityEvidenceTrails } from "../../services/capabilityEvidenceTrailService";
import { CapabilityStatus } from "../../types/capability";
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
 */

// Mirrors career-gaps.tsx's own status convention exactly — see
// StoryView.tsx's identical, deliberately duplicated constant for why this
// small map isn't factored into a new shared file.
const STATUS_LABELS: Record<CapabilityStatus, string> = {
  priority_gap: "Priority Gap",
  developing: "Developing",
  unknown: "Not Yet Assessed",
  strength: "Strength",
};

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

  const activeRef = useRef(true);

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

    setLoading(true);
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

    setTrail(found);
    setPartial(result.data.partial);
    setLoading(false);
  }, [userId, capabilityGapId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

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
            </Card>

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
