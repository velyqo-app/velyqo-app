import { router, useFocusEffect } from "expo-router";
import { useCallback } from "react";
import { BackHandler, Platform, ScrollView, StyleSheet, Text, View } from "react-native";

import MomentumCard from "../../components/dashboard-v2/MomentumCard";

import CareerCoachEntry from "../../components/home/CareerCoachEntry";
import Greeting from "../../components/home/Greeting";
import JourneySummaryCard from "../../components/home/JourneySummaryCard";
import NextMoveCard from "../../components/home/NextMoveCard";
import RoleIndicatorRow from "../../components/home/RoleIndicatorRow";
import WhyThisMattersCard from "../../components/home/WhyThisMattersCard";

import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import LoadingScreen from "../../components/ui/LoadingScreen";

import { Colors } from "../../constants/theme";
import { useDashboard } from "../../hooks/useDashboard";
import { NextMove } from "../../types/nextMove";

/**
 * "Why this matters" copy for the two NextMove types with no mission
 * attached — Home-specific display text, not part of the engine's own
 * deterministic decision (nextMoveEngine.ts never invents display copy
 * beyond its own title/description). Kept here, not in the engine, since
 * this is presentation, not a decision.
 */
function getImpactText(nextMove: NextMove): string {
  switch (nextMove.type) {
    case "capability_gap":
    case "roadmap":
    case "generic":
      return nextMove.mission.impact;
    case "needs_destination":
      return "VELYQO can only point you toward useful next steps once you've set a target role.";
    case "up_to_date":
      return "You're caught up — check back after your next mission or roadmap update.";
  }
}

function getEstimatedTime(nextMove: NextMove): string | undefined {
  switch (nextMove.type) {
    case "capability_gap":
    case "roadmap":
    case "generic":
      return nextMove.mission.estimatedTime;
    case "needs_destination":
    case "up_to_date":
      return undefined;
  }
}

/** Undefined falls back to NextMoveCard's own default ("▶ Start") for a
 * real mission — only the two non-mission types get an explicit, honest
 * label instead of implying there's something to start. */
function getActionLabel(nextMove: NextMove): string | undefined {
  switch (nextMove.type) {
    case "needs_destination":
      return "Set destination";
    case "up_to_date":
      return "View Journey";
    case "capability_gap":
    case "roadmap":
    case "generic":
      return undefined;
  }
}

export default function DashboardScreen() {
  const { loading, error, retry, userData, progress, momentum, careerBrief } =
    useDashboard();

  const goToJourney = () => router.push("/timeline");

  // Routes each NextMove type to its correct existing destination. Never a
  // new route: capability_gap/roadmap/generic all still go to the existing
  // Coach screen (capability_gap alone threads missionDescription/
  // capabilityGapId/capabilityName through, exactly as before — Coach
  // re-derives its own title+description for the roadmap/generic pipeline,
  // so nothing else needs to change there). needs_destination goes to the
  // existing Profile route; up_to_date goes to the existing Journey route —
  // neither ever fabricates a mission just to keep a "Start" action.
  const handleNextMoveAction = () => {
    const { nextMove } = careerBrief;

    switch (nextMove.type) {
      case "capability_gap":
        router.push({
          pathname: "/ai-coach",
          params: {
            mission: nextMove.mission.title,
            missionDescription: nextMove.mission.description,
            capabilityGapId: nextMove.capabilityGapId,
            capabilityName: nextMove.capabilityName,
          },
        });
        return;
      case "roadmap":
      case "generic":
        router.push({
          pathname: "/ai-coach",
          params: { mission: nextMove.mission.title },
        });
        return;
      case "needs_destination":
        router.push("/profile");
        return;
      case "up_to_date":
        router.push("/timeline");
        return;
    }
  };

  const goToCoach = () => router.push("/ai-coach");

  // Dashboard is the root of the authenticated app — there is no meaningful
  // authenticated screen below it to go back to. Without this, hardware
  // Back falls through to the pre-auth stack and briefly shows index.tsx's
  // stale signed-out state (its session check only runs once, on mount,
  // before login happened). Exiting here matches standard Android behavior
  // for a root/home screen instead of exposing that stale screen.
  useFocusEffect(
    useCallback(() => {
      if (Platform.OS !== "android") {
        return;
      }

      const subscription = BackHandler.addEventListener(
        "hardwareBackPress",
        () => {
          BackHandler.exitApp();
          return true;
        },
      );

      return () => subscription.remove();
    }, []),
  );

  if (loading) {
    return <LoadingScreen message="Preparing your Career Brief..." />;
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Card>
          <Text style={styles.errorText}>
            We couldn&apos;t load your profile. Please try again.
          </Text>

          <Button title="Retry" onPress={retry} />
        </Card>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <Greeting name={userData.name} />

      <RoleIndicatorRow
        currentRole={userData.currentRole}
        targetRole={userData.targetRole}
        onPress={goToJourney}
      />

      <NextMoveCard
        title={careerBrief.nextMove.title}
        description={careerBrief.nextMove.description}
        estimatedTime={getEstimatedTime(careerBrief.nextMove)}
        actionLabel={getActionLabel(careerBrief.nextMove)}
        onStart={handleNextMoveAction}
      />

      <JourneySummaryCard
        currentRole={userData.currentRole}
        targetRole={userData.targetRole}
        progress={careerBrief.readiness}
        estimatedJourney={careerBrief.estimatedJourney}
        onPress={goToJourney}
      />

      <WhyThisMattersCard impact={getImpactText(careerBrief.nextMove)} />

      <MomentumCard
        momentum={momentum}
        streak={progress.current_streak}
        missionsCompleted={progress.missions_completed}
      />

      <CareerCoachEntry onPress={goToCoach} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  content: {
    padding: 20,
    paddingBottom: 40,
  },

  errorContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: "center",
    padding: 20,
  },

  errorText: {
    color: Colors.text,
    fontSize: 16,
    textAlign: "center",
    marginBottom: 20,
  },
});
