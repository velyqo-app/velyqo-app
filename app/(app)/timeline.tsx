import { router } from "expo-router";
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import DestinationDecision from "../../components/DestinationDecision";
import RoadmapStep from "../../components/RoadmapStep";
import Card from "../../components/ui/Card";
import LoadingScreen from "../../components/ui/LoadingScreen";
import { Colors } from "../../constants/theme";
import { useRoadmap } from "../../hooks/useRoadmap";
import { TARGET_TIMEFRAME_LABELS } from "../../types/careerContext";
import {
  Roadmap,
  RoadmapEndpoint,
  RoadmapJourneyEstimate,
  RoadmapLimitation,
} from "../../types/roadmap";

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

function formatMoney(currency: string, amount: number) {
  return `${currency} ${amount.toLocaleString()}`;
}

/** Lowercases only a label's leading character, so a value written for
 * standalone display (an onboarding option, "Target timeframe: X") also
 * reads naturally embedded mid-sentence — without a per-label special
 * case, and without altering labels that don't start with a letter (e.g.
 * "1–2 years"). */
function decapitalize(text: string): string {
  return text.charAt(0).toLowerCase() + text.slice(1);
}

/**
 * A defensive display sanity bound, not verified market data and not a
 * claim that any real career transition necessarily completes within 5
 * years. A maximum beyond this is shown open-ended ("5+ years") rather
 * than silently shortened — a genuinely longer transition, honestly
 * implied by the roadmap's own steps, is never misrepresented as
 * achievable within the ceiling.
 */
const CEILING_MONTHS = 60;
const CEILING_YEARS = CEILING_MONTHS / 12;

function pluralize(value: number, unit: string): string {
  return `${value} ${unit}${value === 1 ? "" : "s"}`;
}

/** Expresses a single bound in whichever unit it naturally belongs to,
 * rather than always converting to years once the range as a whole is
 * "in years" — see formatJourneyHeadline. */
function formatBound(months: number): { value: number; unit: "month" | "year" } {
  return months < 12
    ? { value: months, unit: "month" }
    : { value: Math.round(months / 12), unit: "year" };
}

/**
 * "3-6 months" for short ranges; "2-3 years" once both bounds are
 * naturally years; "3 months–2 years" when they're not — never rounding a
 * genuinely sub-year minimum up into "1 year" just because the maximum
 * crossed into years. Beyond CEILING_MONTHS, the maximum is shown
 * open-ended rather than silently capped to a shorter, wrong number.
 */
function formatJourneyHeadline(minMonths: number, maxMonths: number): string {
  if (maxMonths < 18) {
    return minMonths === maxMonths
      ? pluralize(minMonths, "month")
      : `${minMonths}-${maxMonths} months`;
  }

  const openEnded = maxMonths > CEILING_MONTHS;
  const min = formatBound(minMonths);

  if (openEnded) {
    return min.unit === "year"
      ? min.value >= CEILING_YEARS
        ? `${CEILING_YEARS}+ years`
        : `${min.value}-${CEILING_YEARS}+ years`
      : `${pluralize(minMonths, "month")}–${CEILING_YEARS}+ years`;
  }

  const max = formatBound(maxMonths);

  if (min.unit === max.unit) {
    return min.value === max.value
      ? pluralize(min.value, min.unit)
      : `${min.value}-${max.value} ${max.unit}s`;
  }

  // Mixed units — a sub-year minimum with a multi-year maximum.
  return `${pluralize(minMonths, "month")}–${pluralize(max.value, "year")}`;
}

function JourneyEstimateCard({
  estimate,
  requestedTimeframe,
}: {
  estimate: RoadmapJourneyEstimate;
  /** The user's own stated preference, or null when they never set one —
   * never invented, and never rendered as though it were a guarantee. */
  requestedTimeframe: string | null;
}) {
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

function EndpointSalary({
  label,
  endpoint,
}: {
  label: string;
  endpoint: RoadmapEndpoint;
}) {
  // Prefer the currency derived from the user's own country; the market
  // band's currency is only a fallback for the rare case that's unset but a
  // band still somehow exists.
  const statedCurrency = endpoint.currency ?? endpoint.salary?.currency ?? null;

  return (
    <View style={styles.endpointBlock}>
      <Text style={styles.endpointLabel}>{label}</Text>

      {/* The user's own figure is the primary, most prominent line — it must
          never be displaced by or read as secondary to market data. */}
      {endpoint.statedSalary !== null ? (
        <Text style={styles.statedSalary}>
          {statedCurrency
            ? formatMoney(statedCurrency, endpoint.statedSalary)
            : endpoint.statedSalary.toLocaleString()}
        </Text>
      ) : (
        <Text style={styles.notProvided}>Not provided</Text>
      )}

      <View style={styles.marketDivider} />

      <Text style={styles.marketLabel}>VERIFIED MARKET RANGE</Text>

      {endpoint.salary ? (
        <>
          <Text style={styles.range}>
            {formatMoney(endpoint.salary.currency, endpoint.salary.low)} –{" "}
            {formatMoney(endpoint.salary.currency, endpoint.salary.high)}
          </Text>

          <Text style={styles.provenance}>
            {endpoint.salary.dataType.toLowerCase()} data
            {endpoint.salary.source ? ` · ${endpoint.salary.source}` : ""} ·{" "}
            {endpoint.salary.confidence}% confidence
          </Text>
        </>
      ) : (
        <Text style={styles.unavailable}>
          No verified market data available for this role yet.
        </Text>
      )}
    </View>
  );
}

/**
 * Renders one complete roadmap. Used twice, unchanged, when the user chose
 * "show me both pathways" — each destination gets the identical treatment,
 * neither is visually privileged over the other. `requestedTimeframe` is
 * the same single user preference either way, not per-destination.
 */
function RoadmapView({
  roadmap,
  onRetry,
  requestedTimeframe,
}: {
  roadmap: Roadmap;
  onRetry: () => void;
  requestedTimeframe: string | null;
}) {
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

      <Text style={styles.currentRole}>{roadmap.current.title}</Text>

      <Text style={styles.arrow}>↓</Text>

      <Text style={styles.targetRole}>{roadmap.target.title}</Text>

      {roadmap.estimatedJourney ? (
        <JourneyEstimateCard
          estimate={roadmap.estimatedJourney}
          requestedTimeframe={requestedTimeframe}
        />
      ) : null}

      {roadmap.summary ? (
        <Card>
          <Text style={styles.cardTitle}>Your transition</Text>

          <Text style={styles.summary}>{roadmap.summary}</Text>
        </Card>
      ) : null}

      {roadmap.transferableSkills.length > 0 && (
        <Card>
          <Text style={styles.cardTitle}>What you already bring</Text>

          {roadmap.transferableSkills.map((skill) => (
            <Text key={skill} style={styles.skill}>
              ✓ {skill}
            </Text>
          ))}
        </Card>
      )}

      {roadmap.nextAction ? (
        <Card>
          <Text style={styles.cardTitle}>Recommended next step</Text>

          <Text style={styles.nextAction}>{roadmap.nextAction}</Text>
        </Card>
      ) : null}

      <Card>
        <Text style={styles.cardTitle}>Salary</Text>

        <EndpointSalary label="CURRENT ROLE" endpoint={roadmap.current} />

        <View style={styles.divider} />

        <EndpointSalary label="TARGET ROLE" endpoint={roadmap.target} />
      </Card>

      <Text style={styles.section}>Career Roadmap</Text>

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
        roadmap.steps.map((step, index) => (
          <View key={step.id} style={styles.stepContainer}>
            <RoadmapStep index={index} step={step} />

            {index < roadmap.steps.length - 1 && (
              <Text style={styles.arrow}>↓</Text>
            )}
          </View>
        ))
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
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>← Career Brief</Text>
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Career Timeline</Text>

        <View style={{ width: 90 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {profileError ? (
          <Card>
            <Text style={styles.emptyTitle}>
              We couldn&apos;t load your profile
            </Text>

            <Text style={styles.emptyText}>Please try again.</Text>

            <TouchableOpacity style={styles.retryButton} onPress={retryProfile}>
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
              Add a target role to your profile and your career roadmap will
              appear here.
            </Text>
          </Card>
        ) : (
          <>
            {roadmap.destinationResolution && (
              <TouchableOpacity onPress={reconsiderDestination}>
                <Text style={styles.reconsiderLink}>Reconsider this choice</Text>
              </TouchableOpacity>
            )}

            <RoadmapView
              roadmap={roadmap}
              onRetry={retryGeneration}
              requestedTimeframe={requestedTimeframe}
            />

            {alternateRoadmap && (
              <>
                <View style={styles.pathwayDivider} />

                <Text style={styles.section}>The alternative pathway</Text>

                <RoadmapView
                  roadmap={alternateRoadmap}
                  onRetry={retryGeneration}
                  requestedTimeframe={requestedTimeframe}
                />
              </>
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

  back: {
    color: Colors.primary,
    fontSize: 16,
    fontWeight: "600",
    width: 90,
  },

  headerTitle: {
    color: Colors.text,
    fontSize: 22,
    fontWeight: "700",
  },

  content: {
    padding: 20,
    paddingBottom: 40,
  },

  currentRole: {
    color: Colors.subtext,
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
    marginTop: 20,
  },

  targetRole: {
    color: Colors.success,
    fontSize: 24,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 30,
  },

  arrow: {
    color: Colors.primary,
    fontSize: 28,
    textAlign: "center",
    marginVertical: 10,
  },

  cardTitle: {
    color: Colors.text,
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 18,
  },

  nextAction: {
    color: Colors.primary,
    fontSize: 18,
    fontWeight: "700",
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

  skill: {
    color: Colors.text,
    fontSize: 16,
    marginBottom: 10,
  },

  endpointBlock: {
    marginBottom: 4,
  },

  endpointLabel: {
    color: Colors.subtext,
    fontSize: 13,
    letterSpacing: 1,
    fontWeight: "700",
    marginBottom: 8,
  },

  statedSalary: {
    color: Colors.text,
    fontSize: 26,
    fontWeight: "800",
  },

  notProvided: {
    color: Colors.subtext,
    fontSize: 16,
    fontStyle: "italic",
  },

  marketDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginTop: 16,
    marginBottom: 12,
  },

  marketLabel: {
    color: Colors.subtext,
    fontSize: 12,
    letterSpacing: 1,
    fontWeight: "700",
    marginBottom: 6,
  },

  range: {
    color: Colors.success,
    fontSize: 18,
    fontWeight: "700",
  },

  provenance: {
    color: Colors.subtext,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 6,
  },

  unavailable: {
    color: Colors.subtext,
    fontSize: 14,
    lineHeight: 20,
  },

  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 18,
  },

  section: {
    color: Colors.text,
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 20,
    marginTop: 10,
  },

  stepContainer: {
    marginBottom: 10,
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
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.primary,
  },

  retryText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: "600",
  },
});
