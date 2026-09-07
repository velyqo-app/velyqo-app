import { useNavigation } from "expo-router";
import { useEffect } from "react";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";

import CheckinApplyStep from "../../components/checkin/CheckinApplyStep";
import CheckinCategoryStep from "../../components/checkin/CheckinCategoryStep";
import CheckinCompleteStep from "../../components/checkin/CheckinCompleteStep";
import CheckinDetailsStep from "../../components/checkin/CheckinDetailsStep";
import CheckinEntryStep from "../../components/checkin/CheckinEntryStep";
import CheckinReviewCard from "../../components/checkin/CheckinReviewCard";
import CheckinSummaryStep from "../../components/checkin/CheckinSummaryStep";

import Button from "../../components/ui/Button";
import LoadingScreen from "../../components/ui/LoadingScreen";
import ScreenHeader from "../../components/ui/ScreenHeader";

import { Colors, Spacing } from "../../constants/theme";
import { SELECTABLE_CATEGORIES, useCareerCheckin } from "../../hooks/useCareerCheckin";
import { CareerCheckinCategory } from "../../types/careerCheckin";

/**
 * Phase 10.1 Step 8 — the one hidden route driving the entire Career
 * Check-in flow, registered exactly like career-journal/career-gaps/
 * mission-complete (href: null in app/(app)/_layout.tsx). All state lives
 * in useCareerCheckin — this file only renders the current step and wires
 * up the approved back-navigation rules (requirement 16):
 * - before a confirmation is saved: normal back, no interception.
 * - once a confirmation exists (Summary onward, excluding Completion):
 *   leaving warns that the check-in is unfinished.
 * - while applyCareerCheckinConfirmation is genuinely in flight: back is
 *   blocked outright, no dialog, matching mission-complete.tsx's own
 *   implicit behavior during its save.
 */
export default function CareerCheckinScreen() {
  const navigation = useNavigation();

  const {
    step,
    error,

    selectedCategories,
    toggleCategory,
    canProceedFromCategories,
    goToDetails,
    backToCategories,
    submitNoChange,

    details,
    setDetailField,
    canProceedFromDetails,
    submitDetails,
    savingInFlight,

    reviewRows,
    updateReviewRow,
    canProceedFromReview,
    capabilityOptions,
    submitReview,

    summary,
    runApply,
    applyInFlight,

    confirmation,
    retryApply,

    returnHome,
    returningHome,
    goToCategories,
  } = useCareerCheckin();

  useEffect(() => {
    const unsubscribe = navigation.addListener("beforeRemove", (e) => {
      if (applyInFlight) {
        e.preventDefault();
        return;
      }

      if (confirmation !== null && step !== "complete") {
        e.preventDefault();

        Alert.alert(
          "Leave this check-in?",
          "Your check-in is saved but hasn't finished applying. You can come back to it, but it won't be marked complete.",
          [
            { text: "Stay", style: "cancel" },
            {
              text: "Leave",
              style: "destructive",
              onPress: () => navigation.dispatch(e.data.action),
            },
          ],
        );
      }
    });

    return unsubscribe;
  }, [navigation, applyInFlight, confirmation, step]);

  if (step === "creating" || step === "saving") {
    return (
      <LoadingScreen
        message={
          step === "creating"
            ? "Saving your check-in..."
            : "Saving your decisions..."
        }
      />
    );
  }

  if (step === "applying" && applyInFlight) {
    return <LoadingScreen message="Applying your changes..." />;
  }

  if (step === "entry") {
    return (
      <CheckinEntryStep
        onStart={goToCategories}
        onNoChange={submitNoChange}
        error={error}
      />
    );
  }

  if (step === "complete" && confirmation) {
    return (
      <CheckinCompleteStep
        summary={summary}
        onReturnHome={returnHome}
        returning={returningHome}
      />
    );
  }

  const detailCategories = SELECTABLE_CATEGORIES.filter((category) =>
    selectedCategories.has(category as CareerCheckinCategory),
  );

  return (
    <View style={styles.container}>
      <ScreenHeader title="Career Check-in" />

      {step === "categories" && (
        <CheckinCategoryStep
          selected={selectedCategories}
          onToggle={toggleCategory}
          onContinue={goToDetails}
          canContinue={canProceedFromCategories}
        />
      )}

      {step === "details" && (
        <CheckinDetailsStep
          categories={detailCategories}
          details={details}
          onChangeField={setDetailField}
          onBack={backToCategories}
          onContinue={submitDetails}
          canContinue={canProceedFromDetails}
          submitting={savingInFlight}
          error={error}
        />
      )}

      {step === "review" && (
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.prompt}>Here&apos;s what we understood</Text>
          <Text style={styles.hint}>
            Confirm, edit, or decline each one — nothing is applied until you
            say so.
          </Text>

          {reviewRows.map((row) => (
            <CheckinReviewCard
              key={row.reportIndex}
              row={row}
              capabilityOptions={capabilityOptions}
              onChange={(patch) => updateReviewRow(row.reportIndex, patch)}
            />
          ))}

          {error && <Text style={styles.error}>{error}</Text>}

          <View style={styles.actions}>
            <Button
              title={savingInFlight ? "Saving..." : "Continue"}
              onPress={submitReview}
              disabled={!canProceedFromReview || savingInFlight}
            />
          </View>
        </ScrollView>
      )}

      {step === "summary" && (
        <CheckinSummaryStep
          summary={summary}
          onApply={runApply}
          submitting={applyInFlight}
          error={error}
        />
      )}

      {step === "applying" && confirmation && (
        <CheckinApplyStep
          confirmation={confirmation}
          reviewRows={reviewRows}
          error={error}
          onRetry={retryApply}
          retrying={applyInFlight}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  content: {
    padding: Spacing.lg,
    paddingBottom: 40,
  },

  prompt: {
    color: Colors.text,
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 4,
  },

  hint: {
    color: Colors.subtext,
    fontSize: 14,
    marginBottom: Spacing.lg,
  },

  error: {
    color: Colors.danger,
    fontSize: 14,
    textAlign: "center",
    marginTop: Spacing.sm,
  },

  actions: {
    marginTop: Spacing.lg,
  },
});
