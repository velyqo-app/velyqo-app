import { useCallback, useContext, useEffect, useState } from "react";

import { UserContext } from "../context/UserContext";
import { getCurrentUser } from "../services/authService";
import { getProfile } from "../services/profileService";

export function useProfile() {
  const { userData, setUserData } = useContext(UserContext);

  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async () => {
    setLoading(true);

    const {
      data: { user },
    } = await getCurrentUser();

    if (!user) {
      setLoading(false);
      return;
    }

    const { data, error } = await getProfile(user.id);

    if (!error && data) {
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
        targetSalary: data.target_salary ? data.target_salary.toString() : "",

        startingSituation: data.starting_situation || "",
        experienceLevel: data.experience_level || "",
        educationLevel: data.education_level || "",
        skills: data.skills || [],
        targetTimeframe: data.target_timeframe || "",

        profileLoaded: true,
      }));
    }

    setLoading(false);
  }, [setUserData]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  return {
    loading,
    userData,
    reloadProfile: loadProfile,
  };
}
