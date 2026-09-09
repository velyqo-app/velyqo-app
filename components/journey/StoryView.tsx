import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import Button from "../ui/Button";
import Card from "../ui/Card";
import LoadingScreen from "../ui/LoadingScreen";
import StoryEventCard from "./StoryEventCard";
import { Colors, Spacing } from "../../constants/theme";
import { useProfile } from "../../hooks/useProfile";
import { getCapabilityEvidenceTrails } from "../../services/capabilityEvidenceTrailService";
import { getCareerJourney } from "../../services/careerJourneyService";
import {
  CAPABILITY_STATUS_LABELS as STATUS_LABELS,
  CapabilityStatus,
} from "../../types/capability";
import {
  CapabilityEvidenceTrail,
  CapabilityEvidenceTrails,
} from "../../types/capabilityEvidenceTrail";
import { CareerJourney, JourneyEvent } from "../../types/careerJourney";

/**
 * Phase 11 Step 4 — "how did I get here." Independent of RoadmapView in
 * every respect: its own data loading (getCareerJourney +
 * getCapabilityEvidenceTrails, in parallel), its own loading/error/empty/
 * partial states, no shared state with the roadmap side at all.
 */

const STATUS_COLORS: Record<CapabilityStatus, string> = {
  priority_gap: Colors.warning,
  developing: Colors.primary,
  unknown: Colors.subtext,
  strength: Colors.success,
};

// ---------------------------------------------------------------------
// Pure helpers — exported for direct unit testing (no RN renderer exists
// in this project; these are tested the same way dashboard.tsx's own
// presentation helpers are, via a mirror-test file).
// ---------------------------------------------------------------------

export type StoryDateGroupLabel = "This week" | "This month" | "Earlier";

export interface StoryDateGroup {
  label: StoryDateGroupLabel;
  events: JourneyEvent[];
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Pure UI-layer date bucketing — deliberately NOT part of
 * careerJourneyService, which returns events newest-first and nothing
 * more (Phase 11 Step 2's own design). `events` is assumed already
 * newest-first; this function partitions without re-sorting, so
 * newest-first is preserved within each bucket for free.
 */
export function groupEventsByRecency(
  events: JourneyEvent[],
  now: Date,
): StoryDateGroup[] {
  const thisWeek: JourneyEvent[] = [];
  const thisMonth: JourneyEvent[] = [];
  const earlier: JourneyEvent[] = [];

  const nowTime = now.getTime();

  for (const event of events) {
    const ageDays = (nowTime - new Date(event.date).getTime()) / MS_PER_DAY;

    if (ageDays < 7) {
      thisWeek.push(event);
    } else if (ageDays < 30) {
      thisMonth.push(event);
    } else {
      earlier.push(event);
    }
  }

  const groups: StoryDateGroup[] = [];

  if (thisWeek.length > 0) {
    groups.push({ label: "This week", events: thisWeek });
  }

  if (thisMonth.length > 0) {
    groups.push({ label: "This month", events: thisMonth });
  }

  if (earlier.length > 0) {
    groups.push({ label: "Earlier", events: earlier });
  }

  return groups;
}

export type StoryScreenState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "empty" }
  | {
      kind: "ready";
      groups: StoryDateGroup[];
      trails: CapabilityEvidenceTrail[];
      partialNote: string | null;
    };

/** Pure derivation of what StoryView should render — exported for direct
 * unit testing, kept separate from the async fetch/effect machinery. */
export function deriveStoryScreenState(
  loading: boolean,
  error: string | null,
  journey: CareerJourney | null,
  trails: CapabilityEvidenceTrails | null,
  now: Date,
): StoryScreenState {
  if (loading) {
    return { kind: "loading" };
  }

  // Checked before `!journey`: on a first-load failure, load() sets error
  // but never sets journey (it stays null), so testing `!journey` first
  // would keep returning "loading" forever and this state — and its Retry
  // button — would never be reachable.
  if (error) {
    return { kind: "error", message: error };
  }

  if (!journey) {
    return { kind: "loading" };
  }

  const trailList = trails?.trails ?? [];

  if (journey.events.length === 0 && trailList.length === 0) {
    return { kind: "empty" };
  }

  const partial = journey.partial || (trails?.partial ?? false);

  return {
    kind: "ready",
    groups: groupEventsByRecency(journey.events, now),
    trails: trailList,
    partialNote: partial
      ? "Some history details couldn't load right now."
      : null,
  };
}

// ---------------------------------------------------------------------
// Presentation
// ---------------------------------------------------------------------

function CapabilityRow({
  trail,
  muted,
  showDivider,
  onPress,
}: {
  trail: CapabilityEvidenceTrail;
  muted: boolean;
  showDivider: boolean;
  onPress: (capabilityGapId: string, capabilityName: string) => void;
}) {
  const statusLabel = STATUS_LABELS[trail.currentStatus];

  return (
    <View>
      <TouchableOpacity
        style={styles.capabilityRow}
        onPress={() => onPress(trail.capabilityGapId, trail.capabilityName)}
        accessibilityRole="button"
        accessibilityLabel={`${trail.capabilityName}, ${statusLabel}${
          muted ? ", from a previous goal" : ""
        }. View evidence.`}
      >
        <View
          style={[
            styles.statusDot,
            { backgroundColor: STATUS_COLORS[trail.currentStatus] },
          ]}
        />

        <Text
          style={[styles.capabilityName, muted && styles.mutedText]}
          numberOfLines={1}
        >
          {trail.capabilityName}
        </Text>

        <Text style={[styles.capabilityStatus, muted && styles.mutedText]}>
          {statusLabel}
        </Text>

        <Text style={styles.chevron}>›</Text>
      </TouchableOpacity>

      {showDivider && <View style={styles.divider} />}
    </View>
  );
}

function CapabilitiesSection({
  trails,
  onPress,
}: {
  trails: CapabilityEvidenceTrail[];
  onPress: (capabilityGapId: string, capabilityName: string) => void;
}) {
  if (trails.length === 0) {
    return null;
  }

  const current = trails.filter((trail) => trail.isCurrentTargetRole);
  const historical = trails.filter((trail) => !trail.isCurrentTargetRole);

  return (
    <View style={styles.capabilitiesSection}>
      <Text style={styles.sectionHeading}>Your capabilities</Text>

      <Card>
        {current.map((trail, index) => (
          <CapabilityRow
            key={trail.capabilityGapId}
            trail={trail}
            muted={false}
            showDivider={index < current.length - 1 || historical.length > 0}
            onPress={onPress}
          />
        ))}

        {historical.length > 0 && (
          <>
            <Text style={styles.historicalCaption}>From a previous goal</Text>

            {historical.map((trail, index) => (
              <CapabilityRow
                key={trail.capabilityGapId}
                trail={trail}
                muted
                showDivider={index < historical.length - 1}
                onPress={onPress}
              />
            ))}
          </>
        )}
      </Card>
    </View>
  );
}

export default function StoryView() {
  const { userData } = useProfile();
  const userId = userData.userId;

  const [journey, setJourney] = useState<CareerJourney | null>(null);
  const [trails, setTrails] = useState<CapabilityEvidenceTrails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const hasLoadedOnce = useRef(false);
  const activeRef = useRef(true);

  useEffect(() => {
    activeRef.current = true;

    return () => {
      activeRef.current = false;
    };
  }, []);

  const load = useCallback(async () => {
    if (!userId) {
      return;
    }

    const showFullLoading = !hasLoadedOnce.current;

    if (showFullLoading) {
      setLoading(true);
    }

    const [journeyResult, trailsResult] = await Promise.all([
      getCareerJourney(userId),
      getCapabilityEvidenceTrails(userId),
    ]);

    if (!activeRef.current) {
      return;
    }

    if (journeyResult.error || trailsResult.error) {
      // Silent-refresh failure: leave whatever is already on screen alone
      // rather than overwrite a working Story with an error — the same
      // principle useDashboard already established. Only the very first
      // load (nothing shown yet) surfaces the error state.
      if (showFullLoading) {
        setError(journeyResult.error ?? trailsResult.error);
      }

      setLoading(false);
      return;
    }

    hasLoadedOnce.current = true;

    setJourney(journeyResult.data);
    setTrails(trailsResult.data);
    setError(null);
    setLoading(false);
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const handleCapabilityPress = useCallback(
    (capabilityGapId: string, capabilityName: string) => {
      router.push({
        pathname: "/capability-evidence",
        params: { capabilityGapId, capabilityName },
      });
    },
    [],
  );

  const state = deriveStoryScreenState(loading, error, journey, trails, new Date());

  if (state.kind === "loading") {
    return <LoadingScreen message="Loading your career story..." />;
  }

  if (state.kind === "error") {
    return (
      <View style={styles.centeredContent}>
        <Card>
          <Text style={styles.emptyTitle}>
            We couldn&apos;t load your career story
          </Text>

          <Text style={styles.emptyText}>{state.message}</Text>

          <View style={styles.buttonSpacing}>
            <Button title="Retry" onPress={load} />
          </View>
        </Card>
      </View>
    );
  }

  if (state.kind === "empty") {
    return (
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Card>
          <Text style={styles.emptyTitle}>Nothing to show yet</Text>

          <Text style={styles.emptyText}>
            Your story builds as you check in and complete missions.
          </Text>
        </Card>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {state.partialNote ? (
        <Text style={styles.partialNote}>{state.partialNote}</Text>
      ) : null}

      <CapabilitiesSection
        trails={state.trails}
        onPress={handleCapabilityPress}
      />

      {state.groups.map((group) => (
        <View key={group.label}>
          <Text style={styles.sectionHeading}>{group.label}</Text>

          {group.events.map((event) => (
            <StoryEventCard
              key={event.id}
              event={event}
              onCapabilityPress={handleCapabilityPress}
            />
          ))}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xl + Spacing.md,
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

  partialNote: {
    color: Colors.subtext,
    fontSize: 12,
    textAlign: "center",
    marginBottom: Spacing.md,
    fontStyle: "italic",
  },

  sectionHeading: {
    color: Colors.text,
    fontSize: 17,
    fontWeight: "700",
    marginBottom: Spacing.sm,
    marginTop: Spacing.sm,
  },

  capabilitiesSection: {
    marginBottom: Spacing.md,
  },

  capabilityRow: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 44,
    paddingVertical: 10,
  },

  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: Spacing.sm,
  },

  capabilityName: {
    flex: 1,
    color: Colors.text,
    fontSize: 15,
    fontWeight: "600",
    marginRight: Spacing.sm,
  },

  capabilityStatus: {
    color: Colors.subtext,
    fontSize: 12,
    fontWeight: "600",
  },

  mutedText: {
    color: Colors.subtext,
  },

  chevron: {
    color: Colors.subtext,
    fontSize: 18,
    marginLeft: Spacing.xs,
  },

  divider: {
    height: 1,
    backgroundColor: Colors.border,
  },

  historicalCaption: {
    color: Colors.subtext,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.4,
    textTransform: "uppercase",
    marginTop: Spacing.sm,
    marginBottom: 4,
  },
});
