import { ScrollView, StyleSheet } from "react-native";

import { getIndicativeSalary } from "../../data/salaries";
import { useProfile } from "../../hooks/useProfile";

import HeroCard from "../../components/dashboard-v2/HeroCard";
import MissionCard from "../../components/dashboard-v2/MissionCard";
import SalaryGrowthCard from "../../components/dashboard-v2/SalaryGrowthCard";

export default function DashboardV2() {
  const { loading, userData } = useProfile();

  if (loading) return null;

  const roleInfo = getIndicativeSalary(userData.targetRole, userData.country);

  const statedTargetSalary = Number(userData.targetSalary) || null;

  const targetSalary = statedTargetSalary ?? roleInfo?.average ?? null;

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
        targetSalary={targetSalary}
        targetSalarySource={
          statedTargetSalary ? "stated" : roleInfo ? "market" : null
        }
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
