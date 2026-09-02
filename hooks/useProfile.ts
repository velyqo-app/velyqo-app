import { useCallback, useContext, useEffect, useState } from "react";

import { UserContext } from "../context/UserContext";
import { getCurrentUser } from "../services/authService";
import { getProfile } from "../services/profileService";

export function useProfile() {
  const { userData, setUserData } = useContext(UserContext);

  const [loading, setLoading] = useState(true);

  // True only when the fetch itself failed — never true for "no profile
  // exists yet", which is a normal, distinct outcome handled below.
  const [error, setError] = useState(false);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setError(false);

    try {
      const {
        data: { user },
      } = await getCurrentUser();

      if (!user) {
        setLoading(false);
        return;
      }

      const { data, error: fetchError } = await getProfile(user.id);

      if (fetchError) {
        console.warn("Profile read failed:", fetchError);

        setError(true);
      } else if (data) {
        // Merge rather than replace. The occupation IDs captured during
        // onboarding have no column in `profiles` yet (Phase 2 adds them), so
        // overwriting the whole object here used to drop them mid-session.
        setUserData((prev) => ({
          ...prev,

          userType: data.user_type || "",
          name: data.full_name || "",
          goal: data.goal || "",
          country: data.country || "",

          currentRole: data.current_role || "",
          currentOccupationId: data.current_occupation_id || null,
          currentSalary: data.current_salary
            ? data.current_salary.toString()
            : "",

          targetRole: data.target_role || "",
          targetOccupationId: data.target_occupation_id || null,
          targetSalary: data.target_salary
            ? data.target_salary.toString()
            : "",

          startingSituation: data.starting_situation || "",
          experienceLevel: data.experience_level || "",
          educationLevel: data.education_level || "",
          skills: data.skills || [],
          targetTimeframe: data.target_timeframe || "",

          profileLoaded: true,
        }));
      }
      // data === null and no error: genuinely no profile yet — not an
      // error. userData is simply left as-is, exactly as before.
    } catch (thrown) {
      console.warn("Profile read threw:", thrown);

      setError(true);
    } finally {
      setLoading(false);
    }
  }, [setUserData]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  return {
    loading,
    error,
    userData,
    reloadProfile: loadProfile,
  };
}
