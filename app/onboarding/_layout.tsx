import { Redirect, Slot } from "expo-router";
import { useEffect, useState } from "react";

import LoadingScreen from "../../components/ui/LoadingScreen";
import { supabase } from "../../lib/supabase";
import { getSession } from "../../services/authService";
import { getProfile } from "../../services/profileService";

type SessionForCheck = Awaited<ReturnType<typeof getSession>>["data"]["session"];

type AccessStatus = "checking" | "signed-out" | "already-onboarded" | "ready";

export default function OnboardingLayout() {
  // "checking" while the initial session/profile check is still resolving.
  const [status, setStatus] = useState<AccessStatus>("checking");

  useEffect(() => {
    let active = true;

    // Mirrors app/(app)/_layout.tsx's guard, inverted: a signed-in user who
    // already has a profile has nothing to do here, and re-running onboarding
    // would upsert a blank profile over their real one (summary.tsx's save
    // is a full-row upsert, not a partial patch).
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
          // Unlike app/(app)/_layout.tsx, a failed read here fails toward
          // *allowing* onboarding rather than assuming a profile exists.
          // Wrongly bouncing a genuinely new user away from onboarding on a
          // transient error blocks them from ever finishing signup; wrongly
          // letting an existing user see onboarding on a transient error is
          // recoverable, since reaching the screen alone does not touch
          // their data.
          console.warn("Profile read failed, allowing onboarding:", error);

          hasProfile = false;
        } else {
          hasProfile = Boolean(profile?.target_role);
        }
      } catch (thrown) {
        console.warn("Profile read threw, allowing onboarding:", thrown);

        hasProfile = false;
      }

      if (active) {
        setStatus(hasProfile ? "already-onboarded" : "ready");
      }
    };

    getSession()
      .then(({ data: { session } }) => resolveAccess(session))
      .catch(() => {
        // A storage or network failure must still resolve, otherwise the
        // guard would spin forever. Fail closed, matching app/(app)/_layout.
        if (active) {
          setStatus("signed-out");
        }
      });

    // Keeps the guard honest if the session ends — or a new one starts —
    // while an onboarding screen is open.
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

  if (status === "already-onboarded") {
    return <Redirect href="/(app)/dashboard" />;
  }

  return <Slot />;
}
