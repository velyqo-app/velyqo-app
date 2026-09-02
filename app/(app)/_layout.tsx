import { Redirect, Stack } from "expo-router";
import { useEffect, useState } from "react";

import LoadingScreen from "../../components/ui/LoadingScreen";
import { supabase } from "../../lib/supabase";
import { getSession } from "../../services/authService";
import { getProfile } from "../../services/profileService";

type SessionForCheck = Awaited<ReturnType<typeof getSession>>["data"]["session"];

type AccessStatus = "checking" | "signed-out" | "needs-onboarding" | "ready";

export default function AppLayout() {
  // "checking" while the initial session/profile check is still resolving.
  const [status, setStatus] = useState<AccessStatus>("checking");

  useEffect(() => {
    let active = true;

    // Mirrors app/index.tsx's hasProfile check — a signed-in user without a
    // saved profile has not finished onboarding, and these screens have
    // nothing to show them.
    const resolveAccess = async (session: SessionForCheck) => {
      if (!session) {
        if (active) {
          setStatus("signed-out");
        }
        return;
      }

      let hasProfile: boolean;

      try {
        const { data: profile, error } = await getProfile(session.user.id);

        if (error) {
          // A failed read is not the same as "no profile": assume onboarded
          // so a transient failure never locks a real user out of the app
          // they already finished setting up.
          console.warn("Profile read failed, assuming onboarded:", error);

          hasProfile = true;
        } else {
          hasProfile = Boolean(profile?.target_role);
        }
      } catch (thrown) {
        console.warn("Profile read threw, assuming onboarded:", thrown);

        hasProfile = true;
      }

      if (active) {
        setStatus(hasProfile ? "ready" : "needs-onboarding");
      }
    };

    getSession()
      .then(({ data: { session } }) => resolveAccess(session))
      .catch(() => {
        // A storage or network failure must still resolve, otherwise the guard
        // would spin forever. Fail closed.
        if (active) {
          setStatus("signed-out");
        }
      });

    // Keeps the guard honest if the session ends — or a new one starts —
    // while these screens are open.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      resolveAccess(session);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  if (status === "checking") {
    return <LoadingScreen message="Loading your account..." />;
  }

  if (status === "signed-out") {
    return <Redirect href="/" />;
  }

  if (status === "needs-onboarding") {
    return <Redirect href="/onboarding/name" />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="dashboard" />
      <Stack.Screen name="timeline" />
      <Stack.Screen name="ai-coach" />
      <Stack.Screen name="profile" />
    </Stack>
  );
}
