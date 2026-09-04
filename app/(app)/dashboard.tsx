import { useFocusEffect } from "expo-router";
import { useCallback } from "react";
import { BackHandler, Platform, ScrollView, StyleSheet, Text, View } from "react-native";

import CareerReadinessCard from "../../components/dashboard-v2/CareerReadinessCard";
import DailyBriefCard from "../../components/dashboard-v2/DailyBriefCard";
import HeroCard from "../../components/dashboard-v2/HeroCard";
import QuickActions from "../../components/dashboard-v2/QuickActions";
import SalaryGrowthCard from "../../components/dashboard-v2/SalaryGrowthCard";

import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import LoadingScreen from "../../components/ui/LoadingScreen";

import MomentumCard from "../../components/dashboard-v2/MomentumCard";
import { Colors } from "../../constants/theme";
import { useDashboard } from "../../hooks/useDashboard";

export default function DashboardScreen() {
  const {
    loading,
    error,
    retry,
    userData,
    progress,
    momentum,
    statedTargetSalary,
    targetSalaryBand,
    careerBrief,
  } = useDashboard();

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
      <HeroCard
        name={userData.name}
        targetRole={userData.targetRole}
        progress={careerBrief.readiness}
      />

      <MomentumCard
        momentum={momentum}
        streak={progress.current_streak}
        missionsCompleted={progress.missions_completed}
      />

      <DailyBriefCard
        name={userData.name}
        progress={careerBrief.readiness}
        mission={careerBrief.mission.title}
        estimatedTime={careerBrief.estimatedTime}
        nextMilestone={careerBrief.nextMilestone}
        impact={careerBrief.impact}
      />

      <CareerReadinessCard progress={careerBrief.readiness} />

      <SalaryGrowthCard
        currentSalary={userData.currentSalary}
        statedTargetSalary={statedTargetSalary}
        targetSalaryBand={targetSalaryBand}
      />

      <QuickActions />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0B1120",
  },

  content: {
    padding: 20,
    paddingBottom: 40,
  },

  errorContainer: {
    flex: 1,
    backgroundColor: "#0B1120",
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
