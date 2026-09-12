import { router, useFocusEffect } from "expo-router";
import { useCallback } from "react";
import {
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
import LoadingScreen from "../../components/ui/LoadingScreen";
import ScreenHeader from "../../components/ui/ScreenHeader";

import { Colors, Spacing } from "../../constants/theme";
import { useCapabilityGaps } from "../../hooks/useCapabilityGaps";
import {
  CapabilityGap,
  CapabilityImportance,
  CapabilityStatus,
} from "../../types/capability";

const IMPORTANCE_LABELS: Record<CapabilityImportance, string> = {
  critical: "Critical",
  important: "Important",
  helpful: "Helpful",
};

/**
 * Display order and wording for each status bucket. Deliberately no
 * numeric alignment score anywhere here — status and importance are the
 * only signals shown. "Priority Gaps" is worded as "no evidence yet", not
 * "you lack this" — see the Step 4 report for why.
 */
const STATUS_GROUPS: {
  status: CapabilityStatus;
  title: string;
  description: string;
  color: string;
}[] = [
  {
    status: "priority_gap",
    title: "Priority Gaps",
    description:
      "Capabilities that matter for this role, where VELYQO doesn't have evidence yet.",
    color: Colors.warning,
  },
  {
    status: "developing",
    title: "Developing",
    description:
      "Capabilities you've self-reported, or supported by evidence from a completed VELYQO mission.",
    color: Colors.primary,
  },
  {
    status: "unknown",
    title: "Not Yet Assessed",
    description: "Capabilities we haven't evaluated yet.",
    color: Colors.subtext,
  },
  {
    status: "strength",
    title: "Strengths",
    description: "Capabilities backed by real evidence.",
    color: Colors.success,
  },
];

function CapabilityRow({
  capability,
  color,
}: {
  capability: CapabilityGap;
  color: string;
}) {
  return (
    <View style={styles.capabilityRow}>
      <View style={[styles.statusDot, { backgroundColor: color }]} />

      <View style={styles.capabilityTextBlock}>
        <Text style={styles.capabilityName}>{capability.capability_name}</Text>

        {capability.capability_description ? (
          <Text style={styles.capabilityDescription}>
            {capability.capability_description}
          </Text>
        ) : null}

        <Text style={styles.capabilityImportance}>
          {IMPORTANCE_LABELS[capability.importance]}
        </Text>
      </View>
    </View>
  );
}

export default function CapabilityGapsScreen() {
  const { phase, capabilities, errorMessage, retry } = useCapabilityGaps();

  // This screen is reached by push from Journey's Roadmap view
  // (components/journey/RoadmapView.tsx), but it lives in the same Tabs
  // navigator as every other screen (href: null in _layout.tsx) — and that
  // Tabs navigator's backBehavior is "initialRoute" (Home takes priority
  // when hardware Back is pressed anywhere else in the tab bar). Left
  // alone, Android hardware Back here would jump straight to Home instead
  // of returning to Journey, since a tab navigator's default Back handling
  // doesn't retrace push-style history the way a Stack does. Mirrors
  // capability-evidence.tsx's own fix for the identical situation.
  //
  // No `view` param is passed back (unlike capability-evidence.tsx, which
  // forces `view: "story"`): this screen is only ever reached from
  // Journey's Roadmap view, and Roadmap is already Journey's default view
  // (app/(app)/timeline.tsx), so a plain `/timeline` push lands in the
  // right place with no extra state to restore.
  useFocusEffect(
    useCallback(() => {
      if (Platform.OS !== "android") {
        return;
      }

      const subscription = BackHandler.addEventListener(
        "hardwareBackPress",
        () => {
          router.push("/timeline");
          return true;
        },
      );

      return () => subscription.remove();
    }, []),
  );

  if (phase === "loading") {
    return <LoadingScreen message="Assessing your capability gaps..." />;
  }

  if (phase === "no_target_role") {
    return (
      <SafeAreaView style={styles.container}>
        <ScreenHeader title="🎯 Capability Gaps" />

        <View style={styles.centeredContent}>
          <Card>
            <Text style={styles.emptyTitle}>No target role yet</Text>

            <Text style={styles.emptyText}>
              Set a target role to see your capability gaps.
            </Text>

            <View style={styles.buttonSpacing}>
              <Button
                title="Go to Profile"
                onPress={() => router.push("/profile")}
              />
            </View>
          </Card>
        </View>
      </SafeAreaView>
    );
  }

  if (phase === "error") {
    return (
      <SafeAreaView style={styles.container}>
        <ScreenHeader title="🎯 Capability Gaps" />

        <View style={styles.centeredContent}>
          <Card>
            <Text style={styles.emptyTitle}>
              We couldn&apos;t load your capability gaps
            </Text>

            <Text style={styles.emptyText}>{errorMessage}</Text>

            <View style={styles.buttonSpacing}>
              <Button title="Retry" onPress={retry} />
            </View>
          </Card>
        </View>
      </SafeAreaView>
    );
  }

  // phase === "ready" — the hook guarantees a non-empty list here (an empty
  // persisted result is itself treated as the error state above), so
  // reading capabilities[0] is safe.
  const targetRole = capabilities[0]?.target_role ?? "";

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="🎯 Capability Gaps" />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.targetRoleLabel}>TARGET ROLE</Text>
        <Text style={styles.targetRoleValue}>{targetRole}</Text>

        {STATUS_GROUPS.map((group) => {
          const items = capabilities.filter((c) => c.status === group.status);

          if (items.length === 0) {
            return null;
          }

          return (
            <View key={group.status} style={styles.groupSection}>
              <Text style={styles.groupTitle}>{group.title}</Text>
              <Text style={styles.groupDescription}>{group.description}</Text>

              <Card>
                {items.map((capability, index) => (
                  <View key={capability.id}>
                    <CapabilityRow capability={capability} color={group.color} />

                    {index < items.length - 1 ? (
                      <View style={styles.divider} />
                    ) : null}
                  </View>
                ))}
              </Card>
            </View>
          );
        })}
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

  emptyTitle: {
    color: Colors.text,
    fontSize: 20,
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

  targetRoleLabel: {
    color: Colors.subtext,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.2,
  },

  targetRoleValue: {
    color: Colors.text,
    fontSize: 22,
    fontWeight: "700",
    marginTop: 4,
    marginBottom: Spacing.lg,
  },

  groupSection: {
    marginBottom: Spacing.lg,
  },

  groupTitle: {
    color: Colors.text,
    fontSize: 17,
    fontWeight: "700",
    marginBottom: 4,
  },

  groupDescription: {
    color: Colors.subtext,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: Spacing.sm,
  },

  capabilityRow: {
    flexDirection: "row",
    paddingVertical: 12,
  },

  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
    marginRight: Spacing.sm,
  },

  capabilityTextBlock: {
    flex: 1,
  },

  capabilityName: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: "700",
  },

  capabilityDescription: {
    color: Colors.subtext,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4,
  },

  capabilityImportance: {
    color: Colors.subtext,
    fontSize: 12,
    fontWeight: "600",
    marginTop: 6,
  },

  divider: {
    height: 1,
    backgroundColor: Colors.border,
  },
});
