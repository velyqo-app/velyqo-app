import { router } from "expo-router";
import { useContext, useEffect, useState } from "react";
import { Alert, SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";

import { UserContext } from "../../context/UserContext";
import { supabase } from "../../lib/supabase";
import { getCurrentUser } from "../../services/authService";
import { triggerCapabilityAssessmentIfNeeded } from "../../services/capabilityAssessmentService";
import { toCountryCode } from "../../services/countryService";
import { loadSalary, resolveEndpoint } from "../../services/roadmapService";
import {
  EDUCATION_LEVEL_LABELS,
  EXPERIENCE_LEVEL_LABELS,
  STARTING_SITUATION_LABELS,
  TARGET_TIMEFRAME_LABELS,
} from "../../types/careerContext";
import { RoadmapSalary } from "../../types/roadmap";

import OnboardingProgress from "../../components/onboarding/OnboardingProgress";
import BlueprintField from "../../components/profile/BlueprintField";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import { Colors, Spacing } from "../../constants/theme";
import { ONBOARDING_STEP, ONBOARDING_TOTAL_STEPS } from "../../constants/onboardingSteps";

function formatMoney(currency: string, amount: number) {
  return `${currency} ${amount.toLocaleString()}`;
}

export default function SummaryScreen() {
  const { userData } = useContext(UserContext);

  // Same authoritative lookup Dashboard/Timeline use (resolveEndpoint +
  // loadSalary against occupation_salary_bands) — never the retired seeded
  // table, so the blueprint can never disagree with the rest of the app on
  // this figure.
  const [targetSalaryBand, setTargetSalaryBand] =
    useState<RoadmapSalary | null>(null);

  useEffect(() => {
    let active = true;

    const loadTargetSalary = async () => {
      if (!userData.targetRole.trim()) {
        if (active) {
          setTargetSalaryBand(null);
        }
        return;
      }

      const occupation = await resolveEndpoint(
        userData.targetRole,
        userData.targetOccupationId,
      );

      const band = await loadSalary(
        occupation?.id ?? null,
        toCountryCode(userData.country),
      );

      if (active) {
        setTargetSalaryBand(band);
      }
    };

    loadTargetSalary();

    return () => {
      active = false;
    };
  }, [userData.targetRole, userData.targetOccupationId, userData.country]);

  const statedCurrentSalary = userData.currentSalary
    ? Number(userData.currentSalary)
    : null;

  const statedTargetSalary = userData.targetSalary
    ? Number(userData.targetSalary)
    : null;

  const increase =
    statedCurrentSalary !== null && statedTargetSalary !== null
      ? statedTargetSalary - statedCurrentSalary
      : null;

  const saveProfile = async () => {
    const session = await getCurrentUser();

    const {
      data: { user },
    } = session;

    if (!user) {
      Alert.alert("Error", "You must be signed in.");
      return;
    }

    const { error } = await supabase.from("profiles").upsert(
      {
        user_id: user.id,
        full_name: userData.name,
        goal: userData.goal,
        country: userData.country,
        current_role: userData.currentRole,
        current_occupation_id: userData.currentOccupationId,
        current_salary: userData.currentSalary
          ? Number(userData.currentSalary)
          : null,
        target_role: userData.targetRole,
        target_occupation_id: userData.targetOccupationId,
        target_salary: userData.targetSalary
          ? Number(userData.targetSalary)
          : null,
        starting_situation: userData.startingSituation || null,
        experience_level: userData.experienceLevel || null,
        education_level: userData.educationLevel || null,
        skills: userData.skills.length > 0 ? userData.skills : null,
        target_timeframe: userData.targetTimeframe || null,
      },
      {
        onConflict: "user_id",
      },
    );

    if (error) {
      console.log(error);
      Alert.alert("Save Failed", error.message);
      return;
    }

    // Phase 12 — fire-and-forget: the target role has already saved
    // successfully above, and navigation below must never wait on or
    // depend on this succeeding. A blank target role never reaches here
    // (the earlier onboarding steps require one), but this is guarded
    // again anyway since triggerCapabilityAssessmentIfNeeded is meant to
    // be safe to call unconditionally.
    if (userData.targetRole.trim()) {
      triggerCapabilityAssessmentIfNeeded(
        user.id,
        userData.currentRole,
        userData.targetRole,
        userData.skills,
      );
    }

    router.replace("/dashboard");
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <OnboardingProgress
          step={ONBOARDING_STEP.summary}
          total={ONBOARDING_TOTAL_STEPS}
        />

        <Text style={styles.title}>Your Career Blueprint</Text>

        <Text style={styles.subtitle}>
          This is what we&apos;ll build your roadmap around.
        </Text>

        <Card>
          <Text style={styles.cardTitle}>Career Blueprint</Text>

          <BlueprintField label="Current Role" value={userData.currentRole || "Not set"} />

          <BlueprintField
            label="Current Salary"
            value={
              userData.currentSalary
                ? `£${Number(userData.currentSalary).toLocaleString()}`
                : "Not provided"
            }
          />

          <BlueprintField
            label="Experience Level"
            value={
              userData.experienceLevel
                ? EXPERIENCE_LEVEL_LABELS[userData.experienceLevel]
                : "Not set"
            }
          />

          <BlueprintField
            label="Skills"
            value={
              userData.skills.length > 0 ? userData.skills.join(", ") : "None added yet"
            }
          />

          <BlueprintField label="Target Role" value={userData.targetRole || "Not set"} />

          <BlueprintField
            label="Target Salary"
            value={
              userData.targetSalary
                ? `£${Number(userData.targetSalary).toLocaleString()}`
                : "Not provided"
            }
          />

          <BlueprintField
            label="Target Timeframe"
            value={
              userData.targetTimeframe
                ? TARGET_TIMEFRAME_LABELS[userData.targetTimeframe]
                : "Not set"
            }
            last
          />
        </Card>

        <Card>
          <Text style={styles.cardTitle}>About You</Text>

          <BlueprintField label="Name" value={userData.name || "Not set"} />

          <BlueprintField label="Goal" value={userData.goal || "Not set"} />

          <BlueprintField label="Country" value={userData.country || "Not set"} />

          <BlueprintField
            label="Starting Situation"
            value={
              userData.startingSituation
                ? STARTING_SITUATION_LABELS[userData.startingSituation]
                : "Not set"
            }
          />

          <BlueprintField
            label="Education"
            value={
              userData.educationLevel
                ? EDUCATION_LEVEL_LABELS[userData.educationLevel]
                : "Not set"
            }
            last
          />
        </Card>

        <Card>
          <Text style={styles.cardTitle}>Salary Outlook</Text>

          {increase !== null ? (
            <BlueprintField
              label="Potential Increase"
              value={
                increase >= 0
                  ? `£${increase.toLocaleString()}`
                  : `-£${Math.abs(increase).toLocaleString()}`
              }
            />
          ) : null}

          <Text style={styles.marketLabel}>Verified Market Range</Text>

          {targetSalaryBand ? (
            <>
              <Text style={styles.marketValue}>
                {formatMoney(targetSalaryBand.currency, targetSalaryBand.low)} –{" "}
                {formatMoney(targetSalaryBand.currency, targetSalaryBand.high)}
              </Text>

              <Text style={styles.provenance}>
                {targetSalaryBand.dataType.toLowerCase()} data
                {targetSalaryBand.source ? ` · ${targetSalaryBand.source}` : ""} ·{" "}
                {targetSalaryBand.confidence}% confidence
              </Text>
            </>
          ) : (
            <Text style={styles.provenance}>
              No verified market data available for this role yet.
            </Text>
          )}
        </Card>

        <View style={styles.buttonSpacing}>
          <Button title="Create My Career Roadmap" onPress={saveProfile} />
        </View>
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

  title: {
    color: Colors.text,
    fontSize: 28,
    fontWeight: "700",
    marginBottom: Spacing.xs,
    textAlign: "center",
  },

  subtitle: {
    color: Colors.subtext,
    fontSize: 14,
    marginBottom: Spacing.lg,
    textAlign: "center",
  },

  cardTitle: {
    color: Colors.text,
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 6,
  },

  marketLabel: {
    color: Colors.subtext,
    fontSize: 13,
    marginTop: Spacing.sm,
    marginBottom: 6,
  },

  marketValue: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: "600",
  },

  provenance: {
    color: Colors.subtext,
    fontSize: 12,
    lineHeight: 18,
    marginBottom: Spacing.sm,
  },

  buttonSpacing: {
    marginTop: Spacing.lg,
  },
});
