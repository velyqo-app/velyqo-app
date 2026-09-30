import * as Linking from "expo-linking";
import { router, Stack } from "expo-router";
import { DarkTheme, DefaultTheme, ThemeProvider } from "expo-router/react-navigation";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import * as SystemUI from "expo-system-ui";
import { Component, ReactNode, useEffect, useMemo } from "react";
import { AppState, Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { Spacing, type ThemeColors } from "../constants/theme";
import {
  ThemeProvider as AppThemeProvider,
  useTheme,
  useThemedStyles,
} from "../context/ThemeContext";
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
 * library — only the theme context, for its colours) so a bug in a shared
 * component can never also take down this fallback UI. "Try again" just
 * resets local state and re-renders the same tree — enough to recover from
 * a transient/data-dependent failure; a persistent bug will show this
 * screen again, which is expected.
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
      return <ErrorFallback onTryAgain={this.handleTryAgain} />;
    }

    return this.props.children;
  }
}

/** The boundary's fallback UI — a function component so it can read the
 * active theme (class components cannot use hooks). */
function ErrorFallback({ onTryAgain }: { onTryAgain: () => void }) {
  const errorBoundaryStyles = useThemedStyles(createErrorBoundaryStyles);

  return (
    <View style={errorBoundaryStyles.container}>
      <Text style={errorBoundaryStyles.logo}>Velyqo</Text>

      <Text style={errorBoundaryStyles.title}>Something went wrong.</Text>

      <Text style={errorBoundaryStyles.body}>Please try again.</Text>

      <TouchableOpacity style={errorBoundaryStyles.button} onPress={onTryAgain}>
        <Text style={errorBoundaryStyles.buttonText}>Try again</Text>
      </TouchableOpacity>
    </View>
  );
}

const createErrorBoundaryStyles = (Colors: ThemeColors) => StyleSheet.create({
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
    color: Colors.onPrimary,
    fontSize: 16,
    fontWeight: "700",
  },
});

/**
 * Everything that must follow the active theme outside individual screens:
 * React Navigation's own colours (screen/transition backgrounds), the status
 * bar icon colour, and the root view behind the app (visible during keyboard
 * resize and transitions). Lives under AppThemeProvider so it can read it.
 */
function ThemedNavigation({ children }: { children: ReactNode }) {
  const { scheme, colors } = useTheme();

  const navigationTheme = useMemo(() => {
    const base = scheme === "dark" ? DarkTheme : DefaultTheme;

    return {
      ...base,
      colors: {
        ...base.colors,
        primary: colors.primary,
        background: colors.background,
        card: colors.card,
        text: colors.text,
        border: colors.border,
      },
    };
  }, [scheme, colors]);

  useEffect(() => {
    SystemUI.setBackgroundColorAsync(colors.background).catch(() => {});
  }, [colors.background]);

  return (
    <ThemeProvider value={navigationTheme}>
      {children}

      <StatusBar style={scheme === "dark" ? "light" : "dark"} />
    </ThemeProvider>
  );
}

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
    <AppThemeProvider>
      <UserProvider>
        <ThemedNavigation>
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
        </ThemedNavigation>
      </UserProvider>
    </AppThemeProvider>
  );
}
