import { router } from "expo-router";
import { View } from "react-native";

import QuickActionCard from "../QuickActionCard";

export default function DashboardActions() {
  return (
    <View>
      <QuickActionCard
        icon="sparkles"
        title="AI Career Coach"
        subtitle="Get personalised career advice"
        onPress={() => router.push("/ai-coach")}
      />

      <QuickActionCard
        icon="map"
        title="Career Roadmap"
        subtitle="Track your learning journey"
        onPress={() => router.push("/timeline")}
      />

      <QuickActionCard
        icon="document-text"
        title="CV Optimiser"
        subtitle="Improve your CV with AI"
        onPress={() => {
          // TODO: Create CV screen
        }}
      />

      <QuickActionCard
        icon="school"
        title="Learning Hub"
        subtitle="Recommended courses and certifications"
        onPress={() => {
          // TODO: Create Learning Hub
        }}
      />

      <QuickActionCard
        icon="briefcase"
        title="Job Opportunities"
        subtitle="Discover matching roles"
        onPress={() => {
          // TODO: Create Jobs screen
        }}
      />

      <QuickActionCard
        icon="trending-up"
        title="Salary Insights"
        subtitle="Explore salary trends"
        onPress={() => {
          // TODO: Create Salary Insights screen
        }}
      />
    </View>
  );
}
