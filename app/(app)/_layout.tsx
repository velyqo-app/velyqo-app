import { Stack } from "expo-router";

export default function AppLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="dashboard" />
      <Stack.Screen name="timeline" />
      <Stack.Screen name="ai-coach" />
      <Stack.Screen name="profile" />
    </Stack>
  );
}
