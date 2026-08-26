import { Stack } from "expo-router";
import { DarkTheme, ThemeProvider } from "expo-router/react-navigation";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { AppState, Platform } from "react-native";

import { UserProvider } from "../context/UserContext";
import { supabase } from "../lib/supabase";

// Keep the native splash up until the initial session check resolves, so the
// Welcome screen never flashes for an already signed-in user. Called in global
// scope rather than in a hook, otherwise the splash may already be hidden.
// index.tsx owns the matching hideAsync().
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  // Refresh the stored session only while the app is foregrounded.
  // Native only: on web supabase-js already handles this itself.
  useEffect(() => {
    if (Platform.OS === "web") {
      return;
    }

    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        supabase.auth.startAutoRefresh();
      } else {
        supabase.auth.stopAutoRefresh();
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

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
