import { useCallback, useState } from "react";
import {
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  SharedValue,
  useAnimatedScrollHandler,
  useSharedValue,
} from "react-native-reanimated";

import DestinationDecision from "../../components/DestinationDecision";
import JourneyPath from "../../components/journey/JourneyPath";
import StickyDateIndicator from "../../components/journey/StickyDateIndicator";
import Card from "../../components/ui/Card";
import LoadingScreen from "../../components/ui/LoadingScreen";
import { Colors, Radius } from "../../constants/theme";
import { useRoadmap } from "../../hooks/useRoadmap";
import { formatJourneyHeadline } from "../../services/journeyEstimateFormat";
import {
  JourneyTimeline,
  buildJourneyTimeline,
  describeTimelineNode,
} from "../../services/journeyTimelineService";
import { TARGET_TIMEFRAME_LABELS } from "../../types/careerContext";
import { Roadmap, RoadmapLimitation } from "../../types/roadmap";

const LIMITATION_TEXT: Record<RoadmapLimitation, string> = {
  CURRENT_ROLE_NOT_IN_CATALOGUE:
    "Your current role isn't in our occupation data yet, so we can't map it to market information.",
  TARGET_ROLE_NOT_IN_CATALOGUE:
    "Your target role isn't in our occupation data yet, so we can't map it to market information.",
  UNKNOWN_LEVEL:
    "We couldn't work out the seniority of one of these roles, so the steps may be incomplete.",
  NO_LADDER_DATA:
    "We don't have the intermediate roles between these two positions yet.",
  NO_COUNTRY: "We don't have salary data for your selected country.",
  NO_SALARY_DATA:
    "No verified salary data is available for these roles yet.",
  AI_UNAVAILABLE:
    "We couldn't build detailed steps for this transition right now. Please try again shortly.",
};

/** Lowercases only a label's leading character, so a value written for
 * standalone display (an onboarding option, "Target timeframe: X") also
 * reads naturally embedded mid-sentence. */
function decapitalize(text: string): string {
  return text.charAt(0).toLowerCase() + text.slice(1);
}

function EstimateHeaderCard({
  roadmap,
  requestedTimeframe,
}: {
  roadmap: Roadmap;
  requestedTimeframe: string | null;
}) {
  const estimate = roadmap.estimatedJourney;

  if (!estimate) {
    return null;
  }

  const { minMonths, maxMonths, stepsCounted, stepsTotal } = estimate;
  const partial = stepsCounted < stepsTotal;

  return (
    <Card>
      {requestedTimeframe && (
        <Text style={styles.requestedTimeframe}>
          You asked to get there in {decapitalize(requestedTimeframe)}.
        </Text>
      )}

      <Text style={styles.journeyHeadline}>
        Estimated journey: approximately{" "}
        {formatJourneyHeadline(minMonths, maxMonths)}
      </Text>

      <Text style={styles.journeyDetail}>
        {stepsTotal} step{stepsTotal === 1 ? "" : "s"} · {minMonths}–
        {maxMonths} months estimated
        {partial ? ` (based on ${stepsCounted} of ${stepsTotal} steps)` : ""}
      </Text>

      <Text style={styles.journeyFootnote}>
        Assumes some steps can overlap with earlier ones — e.g. building a
        portfolio or networking while still in your current role — rather
        than every step happening strictly one after another. This is
        VELYQO&apos;s estimate, not a promise.
      </Text>
    </Card>
  );
}

/**
 * One complete roadmap rendered as a journey — used twice, unchanged, when
 * the user chose "show me both pathways." `onLabelChange` reports whichever
 * node this specific pathway's scroll position is currently near, so the
 * screen-level sticky pill can reflect either one.
 */
function JourneyView({
  roadmap,
  requestedTimeframe,
  onRetry,
  scrollY,
  onLabelChange,
}: {
  roadmap: Roadmap;
  requestedTimeframe: string | null;
  onRetry: () => void;
  scrollY: SharedValue<number>;
  onLabelChange: (label: string | null) => void;
}) {
  const timeline: JourneyTimeline = buildJourneyTimeline(roadmap);

  const handleActiveIndexChange = useCallback(
    (index: number) => {
      onLabelChange(describeTimelineNode(timeline, index));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [roadmap.generatedAt, roadmap.target.title],
  );

  return (
    <>
      {roadmap.destinationResolution && (
        <Card>
          <Text style={styles.resolutionNote}>
            You asked about{" "}
            <Text style={styles.resolutionEmphasis}>
              {roadmap.destinationResolution.requestedTitle}
            </Text>
            {roadmap.destinationResolution.requestedSalary
              ? ` at ${roadmap.destinationResolution.requestedSalary.toLocaleString()}`
              : ""}
            . This roadmap targets{" "}
            <Text style={styles.resolutionEmphasis}>{roadmap.target.title}</Text>{" "}
            instead — a salary-driven alternative, not the role you
            originally entered.
          </Text>
        </Card>
      )}

      <EstimateHeaderCard
        roadmap={roadmap}
        requestedTimeframe={requestedTimeframe}
      />

      {roadmap.summary ? (
        <Card>
          <Text style={styles.cardTitle}>Your transition</Text>

          <Text style={styles.summary}>{roadmap.summary}</Text>
        </Card>
      ) : null}

      {roadmap.steps.length === 0 ? (
        <Card>
          <Text style={styles.unavailable}>
            We can&apos;t map the steps between these two roles yet. Your
            current and target roles are still shown above.
          </Text>

          {roadmap.limitations.includes("AI_UNAVAILABLE") && (
            <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
              <Text style={styles.retryText}>Try again</Text>
            </TouchableOpacity>
          )}
        </Card>
      ) : (
        <JourneyPath
          key={roadmap.generatedAt ?? roadmap.target.title}
          roadmap={roadmap}
          timeline={timeline}
          scrollY={scrollY}
          onActiveIndexChange={handleActiveIndexChange}
        />
      )}

      {roadmap.alternativeCareers.length > 0 && (
        <Card>
          <Text style={styles.cardTitle}>You might also consider</Text>

          <Text style={styles.alternativesCaveat}>
            Suggestions, not a change to your roadmap above.
          </Text>

          {roadmap.alternativeCareers.map((career) => (
            <View key={career.title} style={styles.alternativeItem}>
              <Text style={styles.alternativeTitle}>{career.title}</Text>

              <Text style={styles.alternativeReason}>
                {career.whySuitable}
              </Text>
            </View>
          ))}
        </Card>
      )}

      {roadmap.regulatoryConsiderations.length > 0 && (
        <Card>
          <Text style={styles.cardTitle}>
            Regulatory considerations (AI-flagged, not verified)
          </Text>

          {roadmap.regulatoryConsiderations.map((note) => (
            <Text key={note} style={styles.limitation}>
              • {note}
            </Text>
          ))}
        </Card>
      )}

      {roadmap.limitations.length > 0 && (
        <>
          <Text style={styles.section}>What we don&apos;t know yet</Text>

          <Card>
            {roadmap.limitations.map((limitation) => (
              <Text key={limitation} style={styles.limitation}>
                • {LIMITATION_TEXT[limitation]}
              </Text>
            ))}
          </Card>
        </>
      )}
    </>
  );
}

export default function TimelineScreen() {
  const {
    loading,
    profileError,
    retryProfile,
    needsDecision,
    comparison,
    roadmap,
    alternateRoadmap,
    chooseDestination,
    choosingDestination,
    reconsiderDestination,
    retryGeneration,
    targetTimeframe,
  } = useRoadmap();

  const [activeLabel, setActiveLabel] = useState<string | null>(null);

  const scrollY = useSharedValue(0);

  const scrollHandler = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });

  // Never invented — absent whenever the user hasn't set one, exactly as
  // stored, so the UI never displays a preference they didn't state.
  const requestedTimeframe = targetTimeframe
    ? TARGET_TIMEFRAME_LABELS[targetTimeframe]
    : null;

  if (loading) {
    return <LoadingScreen message="Building your career roadmap..." />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Your Journey</Text>
      </View>

      <View style={styles.scrollWrapper}>
        {!profileError && !needsDecision && roadmap && (
          <StickyDateIndicator label={activeLabel} />
        )}

        <Animated.ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          onScroll={scrollHandler}
          scrollEventThrottle={16}
        >
          {profileError ? (
            <Card>
              <Text style={styles.emptyTitle}>
                We couldn&apos;t load your profile
              </Text>

              <Text style={styles.emptyText}>Please try again.</Text>

              <TouchableOpacity
                style={styles.retryButton}
                onPress={retryProfile}
              >
                <Text style={styles.retryText}>Retry</Text>
              </TouchableOpacity>
            </Card>
          ) : needsDecision && comparison ? (
            <DestinationDecision
              comparison={comparison}
              onChoose={chooseDestination}
              submitting={choosingDestination}
            />
          ) : !roadmap ? (
            <Card>
              <Text style={styles.emptyTitle}>No roadmap yet</Text>

              <Text style={styles.emptyText}>
                Add a target role to your profile and your career roadmap
                will appear here.
              </Text>
            </Card>
          ) : (
            <>
              {roadmap.destinationResolution && (
                <TouchableOpacity onPress={reconsiderDestination}>
                  <Text style={styles.reconsiderLink}>
                    Reconsider this choice
                  </Text>
                </TouchableOpacity>
              )}

              <JourneyView
                roadmap={roadmap}
                onRetry={retryGeneration}
                requestedTimeframe={requestedTimeframe}
                scrollY={scrollY}
                onLabelChange={setActiveLabel}
              />

              {alternateRoadmap && (
                <>
                  <View style={styles.pathwayDivider} />

                  <Text style={styles.section}>The alternative pathway</Text>

                  <JourneyView
                    roadmap={alternateRoadmap}
                    onRetry={retryGeneration}
                    requestedTimeframe={requestedTimeframe}
                    scrollY={scrollY}
                    onLabelChange={setActiveLabel}
                  />
                </>
              )}
            </>
          )}
        </Animated.ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },

  headerTitle: {
    color: Colors.text,
    fontSize: 22,
    fontWeight: "700",
  },

  scrollWrapper: {
    flex: 1,
    position: "relative",
  },

  content: {
    padding: 20,
    paddingBottom: 40,
  },

  cardTitle: {
    color: Colors.text,
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 18,
  },

  requestedTimeframe: {
    color: Colors.subtext,
    fontSize: 13,
    textAlign: "center",
    marginBottom: 8,
  },

  journeyHeadline: {
    color: Colors.text,
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
  },

  journeyDetail: {
    color: Colors.subtext,
    fontSize: 13,
    textAlign: "center",
    marginTop: 8,
  },

  journeyFootnote: {
    color: Colors.subtext,
    fontSize: 12,
    lineHeight: 17,
    textAlign: "center",
    marginTop: 10,
  },

  summary: {
    color: Colors.text,
    fontSize: 15,
    lineHeight: 23,
  },

  section: {
    color: Colors.text,
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 20,
    marginTop: 10,
  },

  unavailable: {
    color: Colors.subtext,
    fontSize: 14,
    lineHeight: 20,
  },

  limitation: {
    color: Colors.subtext,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 10,
  },

  alternativesCaveat: {
    color: Colors.subtext,
    fontSize: 12,
    fontStyle: "italic",
    marginBottom: 16,
  },

  alternativeItem: {
    marginBottom: 16,
  },

  alternativeTitle: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4,
  },

  alternativeReason: {
    color: Colors.subtext,
    fontSize: 14,
    lineHeight: 20,
  },

  emptyTitle: {
    color: Colors.text,
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
  },

  emptyText: {
    color: Colors.subtext,
    textAlign: "center",
    marginTop: 12,
    lineHeight: 24,
  },

  resolutionNote: {
    color: Colors.text,
    fontSize: 14,
    lineHeight: 21,
  },

  resolutionEmphasis: {
    fontWeight: "700",
  },

  reconsiderLink: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 8,
  },

  pathwayDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginTop: 30,
    marginBottom: 10,
  },

  retryButton: {
    marginTop: 16,
    alignSelf: "center",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.primary,
  },

  retryText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: "600",
  },
});
