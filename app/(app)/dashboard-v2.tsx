import { ScrollView, StyleSheet } from "react-native";

import { useProfile } from "../../hooks/useProfile";

import HeroCard from "../../components/dashboard-v2/HeroCard";
import MissionCard from "../../components/dashboard-v2/MissionCard";
import SalaryGrowthCard from "../../components/dashboard-v2/SalaryGrowthCard";

export default function DashboardV2() {
  const { loading, userData } = useProfile();

  if (loading) return null;

  const statedTargetSalary = Number(userData.targetSalary) || null;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <HeroCard
        name={userData.name}
        targetRole={userData.targetRole}
        progress={25}
      />

      <MissionCard title="Complete today's roadmap milestone" />

      <SalaryGrowthCard
        currentSalary={userData.currentSalary}
        statedTargetSalary={statedTargetSalary}
        targetSalaryBand={null}
      />
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
