import { useCallback, useEffect } from "react";
import { LayoutChangeEvent, StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  runOnJS,
  SharedValue,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  FadeInUp,
} from "react-native-reanimated";

import { Colors } from "../../constants/theme";
import {
  JourneyTimeline,
  formatTimelineDate,
  resolveMilestoneState,
} from "../../services/journeyTimelineService";
import { Roadmap } from "../../types/roadmap";
import MilestoneCard, { MilestoneEmphasis } from "./MilestoneCard";
import TargetArrivalCard from "./TargetArrivalCard";

interface Props {
  roadmap: Roadmap;
  timeline: JourneyTimeline;
  scrollY: SharedValue<number>;

  /** Node 0 is "you are here", nodes 1..N are milestones in order, node N+1
   * is the destination — timeline.tsx uses this same indexing to resolve a
   * sticky-pill label without JourneyPath needing to know about the pill. */
  onActiveIndexChange: (index: number) => void;
}

/** How far below the top of the viewport a node must scroll before it's
 * considered "reached" — roughly where the header/sticky pill sit, so the
 * active node is whichever one the user is actually reading. */
const VIEWPORT_OFFSET = 160;

export default function JourneyPath({
  roadmap,
  timeline,
  scrollY,
  onActiveIndexChange,
}: Props) {
  const { milestones, hasDates } = timeline;
  const nodeCount = milestones.length + 2;

  const containerTop = useSharedValue(0);
  const containerHeight = useSharedValue(1);
  const nodeOffsets = useSharedValue<number[]>(new Array(nodeCount).fill(0));
  const pulse = useSharedValue(0);

  useEffect(() => {
    // A slow, low-amplitude breathing loop reserved for the single current
    // node's ring — never anything continuous or attention-grabbing beyond
    // this one restrained use.
    pulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 1400, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true,
    );
  }, [pulse]);

  // containerTop/containerHeight are Reanimated shared values — stable refs
  // for the component's lifetime, mutated via `.value` by design, not state
  // this callback depends on — so they're deliberately left out of the
  // dependency array below.
  const handleContainerLayout = useCallback((event: LayoutChangeEvent) => {
    containerTop.value = event.nativeEvent.layout.y;
    containerHeight.value = Math.max(1, event.nativeEvent.layout.height);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const registerNodeLayout = useCallback(
    (index: number) => (event: LayoutChangeEvent) => {
      const y = event.nativeEvent.layout.y;
      const next = nodeOffsets.value.slice();
      next[index] = y;
      nodeOffsets.value = next;
    },
    [nodeOffsets],
  );

  useAnimatedReaction(
    () => {
      const offsets = nodeOffsets.value;
      const target = scrollY.value + VIEWPORT_OFFSET - containerTop.value;

      let idx = 0;
      for (let i = 0; i < offsets.length; i += 1) {
        if (target >= offsets[i]) {
          idx = i;
        }
      }
      return idx;
    },
    (idx, prevIdx) => {
      if (idx !== prevIdx) {
        runOnJS(onActiveIndexChange)(idx);
      }
    },
  );

  const lineFillStyle = useAnimatedStyle(() => {
    const progress = interpolate(
      scrollY.value + VIEWPORT_OFFSET - containerTop.value,
      [0, containerHeight.value],
      [0, containerHeight.value],
      Extrapolation.CLAMP,
    );

    return { height: progress };
  });

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: interpolate(pulse.value, [0, 1], [0.35, 0.7]),
    transform: [{ scale: interpolate(pulse.value, [0, 1], [1, 1.2]) }],
  }));

  // The single node currently inside its own calendar window — the you-are-
  // here marker unless real time has already carried the user into a later
  // milestone's own span.
  let currentAbsoluteIndex = 0;

  milestones.forEach((milestone, index) => {
    if (resolveMilestoneState(milestone, index) === "current") {
      currentAbsoluteIndex = index + 1;
    }
  });

  const nextTitleFor = (index: number) =>
    milestones[index + 1]?.step.title ?? roadmap.target.title;

  return (
    <View style={styles.container} onLayout={handleContainerLayout}>
      <View style={styles.lineTrack} pointerEvents="none">
        <Animated.View style={[styles.lineFill, lineFillStyle]} />
      </View>

      {/* Node 0 — you are here */}
      <Animated.View
        style={styles.nodeRow}
        onLayout={registerNodeLayout(0)}
        entering={FadeInUp.duration(400)}
      >
        <View style={styles.dotColumn}>
          {currentAbsoluteIndex === 0 && (
            <Animated.View style={[styles.pulseRing, pulseStyle]} />
          )}
          <View style={[styles.dot, styles.dotCurrent]} />
        </View>

        <View style={styles.nodeContent}>
          <Text style={styles.hereLabel}>YOU ARE HERE</Text>
          <Text style={styles.hereRole}>{roadmap.current.title}</Text>

          {roadmap.transferableSkills.length > 0 && (
            <View style={styles.chipRow}>
              {roadmap.transferableSkills.slice(0, 4).map((skill) => (
                <View key={skill} style={styles.chip}>
                  <Text style={styles.chipText}>{skill}</Text>
                </View>
              ))}

              {roadmap.transferableSkills.length > 4 && (
                <Text style={styles.chipMore}>
                  +{roadmap.transferableSkills.length - 4} more
                </Text>
              )}
            </View>
          )}
        </View>
      </Animated.View>

      {milestones.map((milestone, index) => {
        const state = resolveMilestoneState(milestone, index);
        const isNext = index === currentAbsoluteIndex;

        const emphasis: MilestoneEmphasis =
          state === "current" ? "current" : isNext ? "next" : state;

        const dateLabel =
          hasDates && milestone.startDate
            ? formatTimelineDate(milestone.startDate)
            : null;

        return (
          <Animated.View
            key={milestone.step.id}
            style={styles.nodeRow}
            onLayout={registerNodeLayout(index + 1)}
            entering={FadeInUp.delay(Math.min(index, 4) * 60).duration(400)}
          >
            <View style={styles.dotColumn}>
              {currentAbsoluteIndex === index + 1 && (
                <Animated.View style={[styles.pulseRing, pulseStyle]} />
              )}

              <View
                style={[
                  styles.dot,
                  state === "current" && styles.dotCurrent,
                  state === "past" && styles.dotPast,
                ]}
              />
            </View>

            <View style={styles.nodeContent}>
              <MilestoneCard
                step={milestone.step}
                emphasis={emphasis}
                dateLabel={dateLabel}
                unlocks={nextTitleFor(index)}
              />
            </View>
          </Animated.View>
        );
      })}

      {/* Final node — the destination */}
      <Animated.View
        style={[styles.nodeRow, styles.lastNodeRow]}
        onLayout={registerNodeLayout(milestones.length + 1)}
        entering={FadeInUp.duration(500)}
      >
        <View style={styles.dotColumn}>
          <View style={[styles.dot, styles.dotTarget]} />
        </View>

        <View style={styles.nodeContent}>
          <TargetArrivalCard
            roadmap={roadmap}
            arrivalLabel={
              hasDates && timeline.targetDate
                ? formatTimelineDate(timeline.targetDate)
                : null
            }
          />
        </View>
      </Animated.View>
    </View>
  );
}

const DOT_SIZE = 14;
const DOT_TARGET_SIZE = 20;
const LINE_WIDTH = 2;
const COLUMN_WIDTH = 32;

const styles = StyleSheet.create({
  container: {
    position: "relative",
  },

  lineTrack: {
    position: "absolute",
    left: COLUMN_WIDTH / 2 - LINE_WIDTH / 2,
    top: 6,
    bottom: 6,
    width: LINE_WIDTH,
    backgroundColor: Colors.border,
    borderRadius: LINE_WIDTH / 2,
  },

  lineFill: {
    width: LINE_WIDTH,
    backgroundColor: Colors.primary,
    borderRadius: LINE_WIDTH / 2,
  },

  nodeRow: {
    flexDirection: "row",
    marginBottom: 22,
  },

  lastNodeRow: {
    marginBottom: 0,
  },

  dotColumn: {
    width: COLUMN_WIDTH,
    alignItems: "center",
    paddingTop: 4,
  },

  dot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    backgroundColor: Colors.background,
    borderWidth: 2,
    borderColor: Colors.subtext,
  },

  dotCurrent: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },

  dotPast: {
    backgroundColor: Colors.subtext,
    borderColor: Colors.subtext,
  },

  dotTarget: {
    width: DOT_TARGET_SIZE,
    height: DOT_TARGET_SIZE,
    borderRadius: DOT_TARGET_SIZE / 2,
    backgroundColor: Colors.success,
    borderColor: Colors.success,
  },

  pulseRing: {
    position: "absolute",
    top: -3,
    width: DOT_SIZE + 12,
    height: DOT_SIZE + 12,
    borderRadius: (DOT_SIZE + 12) / 2,
    backgroundColor: Colors.glow,
  },

  nodeContent: {
    flex: 1,
    paddingLeft: 14,
  },

  hereLabel: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.4,
    marginBottom: 4,
  },

  hereRole: {
    color: Colors.text,
    fontSize: 17,
    fontWeight: "700",
  },

  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
    marginTop: 10,
  },

  chip: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 999,
    paddingVertical: 5,
    paddingHorizontal: 12,
  },

  chipText: {
    color: Colors.text,
    fontSize: 12,
    fontWeight: "600",
  },

  chipMore: {
    color: Colors.subtext,
    fontSize: 12,
  },
});
