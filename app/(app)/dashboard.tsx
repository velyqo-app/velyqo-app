import { ScrollView, StyleSheet } from "react-native";

import CareerReadinessCard from "../../components/dashboard-v2/CareerReadinessCard";
import DailyBriefCard from "../../components/dashboard-v2/DailyBriefCard";
import HeroCard from "../../components/dashboard-v2/HeroCard";
import MissionCard from "../../components/dashboard-v2/MissionCard";
import QuickActions from "../../components/dashboard-v2/QuickActions";
import SalaryGrowthCard from "../../components/dashboard-v2/SalaryGrowthCard";

import LoadingScreen from "../../components/ui/LoadingScreen";

import MomentumCard from "../../components/dashboard-v2/MomentumCard";
import { useDashboard } from "../../hooks/useDashboard";

export default function DashboardScreen() {
  const {
    loading,
    userData,
    progress,
    momentum,
    targetSalary,
    targetSalarySource,
    recommendation,
    careerBrief,
  } = useDashboard();

  if (loading) {
    return <LoadingScreen message="Preparing your Career Brief..." />;
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

      <MissionCard title={recommendation.title} />

      <CareerReadinessCard progress={careerBrief.readiness} />

      <SalaryGrowthCard
        currentSalary={userData.currentSalary}
        targetSalary={targetSalary}
        targetSalarySource={targetSalarySource}
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
});
