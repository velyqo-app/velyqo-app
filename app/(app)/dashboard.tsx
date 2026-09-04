import { ScrollView, StyleSheet, Text, View } from "react-native";

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
