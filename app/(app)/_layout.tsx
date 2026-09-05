import { Ionicons } from "@expo/vector-icons";
import { Redirect, Tabs } from "expo-router";
import { useEffect, useState } from "react";

import LoadingScreen from "../../components/ui/LoadingScreen";
import { Colors } from "../../constants/theme";
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
    <Tabs
      initialRouteName="dashboard"
      backBehavior="initialRoute"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.subtext,
        tabBarStyle: {
          backgroundColor: Colors.card,
          borderTopColor: Colors.border,
        },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: "Home",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "home" : "home-outline"}
              size={24}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="timeline"
        options={{
          title: "Journey",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "map" : "map-outline"}
              size={24}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="ai-coach"
        options={{
          title: "Coach",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "chatbubble-ellipses" : "chatbubble-ellipses-outline"}
              size={24}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "person" : "person-outline"}
              size={24}
              color={color}
            />
          ),
        }}
      />

      {/* Shares the same navigator so it can be reached with router.push, but
          never appears as a tab button (href: null) and hides the tab bar
          chrome while open (tabBarStyle display: none) so it reads as a
          pushed destination, not a fifth tab — Career Journal lives under
          Profile, per product decision. */}
      <Tabs.Screen
        name="career-journal"
        options={{ href: null, tabBarStyle: { display: "none" } }}
      />

      {/* Same treatment — reached by push from Home/Journey, never a tab. */}
      <Tabs.Screen
        name="mission-complete"
        options={{ href: null, tabBarStyle: { display: "none" } }}
      />
    </Tabs>
  );
}
