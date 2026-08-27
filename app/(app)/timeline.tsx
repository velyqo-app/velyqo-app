import { router } from "expo-router";
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import RoadmapStep from "../../components/RoadmapStep";
import Card from "../../components/ui/Card";
import LoadingScreen from "../../components/ui/LoadingScreen";
import { Colors } from "../../constants/theme";
import { useRoadmap } from "../../hooks/useRoadmap";
import { RoadmapEndpoint, RoadmapLimitation } from "../../types/roadmap";

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

function EndpointSalary({
  label,
  endpoint,
}: {
  label: string;
  endpoint: RoadmapEndpoint;
}) {
  return (
    <View style={styles.endpointBlock}>
      <Text style={styles.endpointLabel}>{label}</Text>

      {endpoint.salary ? (
        <>
          <Text style={styles.salary}>
            {formatMoney(endpoint.salary.currency, endpoint.salary.median)}
          </Text>

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
          No verified market data for this role yet.
        </Text>
      )}

      {/* The user's own figure, kept visually separate from market data. */}
      {endpoint.statedSalary !== null && (
        <Text style={styles.stated}>
          You told us: {endpoint.statedSalary.toLocaleString()}
        </Text>
      )}
    </View>
  );
}

export default function TimelineScreen() {
  const { loading, roadmap } = useRoadmap();

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
        {!roadmap ? (
          <Card>
            <Text style={styles.emptyTitle}>No roadmap yet</Text>

            <Text style={styles.emptyText}>
              Add a target role to your profile and your career roadmap will
              appear here.
            </Text>
          </Card>
        ) : (
          <>
            <Text style={styles.currentRole}>{roadmap.current.title}</Text>

            <Text style={styles.arrow}>↓</Text>

            <Text style={styles.targetRole}>{roadmap.target.title}</Text>

            {/* Summary and transferable skills only exist on generated
                roadmaps, so both are rendered conditionally. */}
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

  salary: {
    color: Colors.success,
    fontSize: 26,
    fontWeight: "800",
  },

  range: {
    color: Colors.subtext,
    marginTop: 6,
  },

  provenance: {
    color: Colors.subtext,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 10,
  },

  stated: {
    color: Colors.text,
    fontSize: 14,
    marginTop: 10,
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
});
