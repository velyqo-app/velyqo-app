import { Redirect, Stack } from "expo-router";
import { useEffect, useState } from "react";

import LoadingScreen from "../../components/ui/LoadingScreen";
import { supabase } from "../../lib/supabase";
import { getSession } from "../../services/authService";

export default function AppLayout() {
  // null while the initial session check is still resolving.
  const [signedIn, setSignedIn] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;

    getSession()
      .then(({ data: { session } }) => {
        if (active) {
          setSignedIn(Boolean(session));
        }
      })
      .catch(() => {
        // A storage or network failure must still resolve, otherwise the guard
        // would spin forever. Fail closed.
        if (active) {
          setSignedIn(false);
        }
      });

    // Keeps the guard honest if the session ends while these screens are open.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSignedIn(Boolean(session));
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  if (signedIn === null) {
    return <LoadingScreen message="Loading your account..." />;
  }

  if (!signedIn) {
    return <Redirect href="/" />;
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
