import { Stack } from "expo-router";
import { DarkTheme, ThemeProvider } from "expo-router/react-navigation";
import { StatusBar } from "expo-status-bar";

import { UserProvider } from "../context/UserContext";

export default function RootLayout() {
  return (
    <UserProvider>
      <ThemeProvider value={DarkTheme}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="login" />
          <Stack.Screen name="signup" />
          <Stack.Screen name="(app)" />
          <Stack.Screen name="test-supabase" />
        </Stack>

        <StatusBar style="light" />
      </ThemeProvider>
    </UserProvider>
  );
}
