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

export default function DashboardScreen() {
  const { loading, error, retry, userData, progress, momentum, careerBrief } =
    useDashboard();

  const goToJourney = () => router.push("/timeline");

  const startMission = () => {
    router.push({
      pathname: "/ai-coach",
      params: { mission: careerBrief.mission.title },
    });
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
        title={careerBrief.mission.title}
        description={careerBrief.mission.description}
        estimatedTime={careerBrief.estimatedTime}
        onStart={startMission}
      />

      <JourneySummaryCard
        currentRole={userData.currentRole}
        targetRole={userData.targetRole}
        progress={careerBrief.readiness}
        estimatedJourney={careerBrief.estimatedJourney}
        onPress={goToJourney}
      />

      <WhyThisMattersCard impact={careerBrief.impact} />

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
