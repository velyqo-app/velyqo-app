import * as Linking from "expo-linking";
import { router, Stack } from "expo-router";
import { DarkTheme, ThemeProvider } from "expo-router/react-navigation";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { Component, ReactNode, useEffect } from "react";
import { AppState, Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { Colors, Spacing } from "../constants/theme";
import { UserProvider } from "../context/UserContext";
import { supabase } from "../lib/supabase";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

/**
 * Catches an otherwise-uncaught render/runtime error anywhere in the tree
 * below it, so a bug never crashes to a blank/red screen with no way back.
 * Deliberately self-contained (no imports from this app's own component
 * library) so a bug in a shared component can never also take down this
 * fallback UI. "Try again" just resets local state and re-renders the same
 * tree — enough to recover from a transient/data-dependent failure; a
 * persistent bug will show this screen again, which is expected.
 */
class RootErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error("RootErrorBoundary caught an error:", error.message);
  }

  handleTryAgain = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={errorBoundaryStyles.container}>
          <Text style={errorBoundaryStyles.logo}>Velyqo</Text>

          <Text style={errorBoundaryStyles.title}>Something went wrong.</Text>

          <Text style={errorBoundaryStyles.body}>Please try again.</Text>

          <TouchableOpacity
            style={errorBoundaryStyles.button}
            onPress={this.handleTryAgain}
          >
            <Text style={errorBoundaryStyles.buttonText}>Try again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

const errorBoundaryStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.lg,
  },

  logo: {
    color: Colors.primary,
    fontSize: 32,
    fontWeight: "800",
    marginBottom: Spacing.xl,
  },

  title: {
    color: Colors.text,
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
  },

  body: {
    color: Colors.subtext,
    fontSize: 16,
    textAlign: "center",
    marginTop: Spacing.xs,
    marginBottom: Spacing.lg,
  },

  button: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.xl,
    borderRadius: 12,
  },

  buttonText: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: "700",
  },
});

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

  // Expo Router's automatic linking reliably resolves a cold-start URL, but
  // does not reliably re-navigate an already-running (warm-resumed) app to a
  // new incoming URL. Without this, tapping the password-recovery link while
  // the app is already open re-enters whatever screen it was already on
  // instead of reset-password.tsx. Deliberately reads only the URL's path —
  // never its query/hash — so recovery tokens never pass through this
  // listener, navigation params, or logs; reset-password.tsx's own
  // Linking.useURL() remains solely responsible for parsing them.
  useEffect(() => {
    const subscription = Linking.addEventListener("url", (event) => {
      const { path } = Linking.parse(event.url);

      if (path?.replace(/^\//, "") === "reset-password") {
        router.replace("/reset-password");
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  return (
    <UserProvider>
      <ThemeProvider value={DarkTheme}>
        <RootErrorBoundary>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="login" />
            <Stack.Screen name="signup" />
            <Stack.Screen name="forgot-password" />
            <Stack.Screen name="reset-password" />
            <Stack.Screen name="terms" />
            <Stack.Screen name="privacy" />
            <Stack.Screen name="(app)" />
          </Stack>
        </RootErrorBoundary>

        <StatusBar style="light" />
      </ThemeProvider>
    </UserProvider>
  );
}
