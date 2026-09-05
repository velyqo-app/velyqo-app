import { router } from "expo-router";
import { useContext, useEffect, useState } from "react";
import { useProfile } from "../../hooks/useProfile";

import {
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import { Colors } from "../../constants/theme";
import { UserContext, UserData } from "../../context/UserContext";
import { signOut } from "../../services/authService";

import OccupationAutocomplete from "../../components/OccupationAutocomplete";
import CareerBlueprintCard from "../../components/profile/CareerBlueprintCard";
import EditModal from "../../components/profile/EditModal";
import ProfileLinkRow from "../../components/profile/ProfileLinkRow";
import SkillSelector from "../../components/SkillSelector";

import { useOccupationSearch } from "../../hooks/useOccupationSearch";
import {
  getStoredPriority,
  invalidateCachedRoadmap,
} from "../../hooks/useRoadmap";
import { getAllKnownSkills } from "../../services/skillSuggestionService";
import {
  EXPERIENCE_LEVEL_LABELS,
  ExperienceLevel,
  SalaryPriority,
  TARGET_TIMEFRAME_LABELS,
  TargetTimeframe,
} from "../../types/careerContext";
import { Occupation } from "../../types/occupation";
import { updateProfile } from "../../services/profileService";

const EXPERIENCE_OPTIONS: ExperienceLevel[] = [
  "none",
  "under_1",
  "1_to_3",
  "3_to_5",
  "5_to_10",
  "10_plus",
];

const TIMEFRAME_OPTIONS: TargetTimeframe[] = [
  "as_fast_as_possible",
  "1_to_2_years",
  "3_to_5_years",
  "5_to_10_years",
  "flexible",
];

type EditingField =
  | "currentRole"
  | "currentSalary"
  | "experienceLevel"
  | "skills"
  | "targetRole"
  | "targetSalary"
  | "targetTimeframe"
  | null;

function isValidMoney(value: string): boolean {
  const trimmed = value.trim();
  return trimmed === "" || /^\d+(\.\d+)?$/.test(trimmed);
}

export default function ProfileScreen() {
  const { userData } = useProfile();

  const { setUserData, clearUserData } = useContext(UserContext);

  const [signingOut, setSigningOut] = useState(false);

  // Read-only, local-only lookup — never triggers the salary-conflict check
  // itself, just reflects a decision already made (if any) on Journey.
  const [priority, setPriority] = useState<SalaryPriority | null>(null);

  useEffect(() => {
    let active = true;

    getStoredPriority(userData).then((result) => {
      if (active) {
        setPriority(result);
      }
    });

    return () => {
      active = false;
    };
  }, [userData]);

  const [editingField, setEditingField] = useState<EditingField>(null);
  const [saving, setSaving] = useState(false);

  const [draftSalary, setDraftSalary] = useState("");
  const [draftExperience, setDraftExperience] = useState<ExperienceLevel | "">(
    "",
  );
  const [draftTimeframe, setDraftTimeframe] = useState<TargetTimeframe | "">(
    "",
  );
  const [draftSkills, setDraftSkills] = useState<string[]>([]);
  const [draftOccupationId, setDraftOccupationId] = useState<string | null>(
    null,
  );

  const {
    query: roleQuery,
    setQuery: setRoleQuery,
    results: roleResults,
    loading: roleLoading,
    clearSearch: clearRoleSearch,
  } = useOccupationSearch();

  const closeEditor = () => {
    setEditingField(null);
    clearRoleSearch();
  };

  const openEditor = (field: EditingField) => {
    if (field === "currentSalary") setDraftSalary(userData.currentSalary);
    if (field === "targetSalary") setDraftSalary(userData.targetSalary);
    if (field === "experienceLevel")
      setDraftExperience(userData.experienceLevel);
    if (field === "targetTimeframe")
      setDraftTimeframe(userData.targetTimeframe);
    if (field === "skills") setDraftSkills(userData.skills);

    if (field === "currentRole") {
      setRoleQuery(userData.currentRole);
      setDraftOccupationId(userData.currentOccupationId);
    }

    if (field === "targetRole") {
      setRoleQuery(userData.targetRole);
      setDraftOccupationId(userData.targetOccupationId);
    }

    setEditingField(field);
  };

  const handleRoleSelect = (occupation: Occupation) => {
    setRoleQuery(occupation.title);
    setDraftOccupationId(occupation.id);
  };

  const handleRoleQueryChange = (text: string) => {
    setRoleQuery(text);

    if (draftOccupationId) {
      setDraftOccupationId(null);
    }
  };

  /** Applies a partial Supabase update and, on success, merges the same
   * fields into local UserContext state — never a full-row replace, so
   * every field not being edited is left exactly as it was. */
  const saveFields = async (updates: Record<string, unknown>) => {
    if (!userData.userId) {
      Alert.alert("Not signed in", "Please sign in again and retry.");
      return false;
    }

    setSaving(true);

    const { error } = await updateProfile(userData.userId, updates);

    setSaving(false);

    if (error) {
      Alert.alert("Update Failed", error.message);
      return false;
    }

    return true;
  };

  const saveSimpleField = async (
    updates: Record<string, unknown>,
    localPatch: Partial<UserData>,
  ) => {
    const ok = await saveFields(updates);

    if (!ok) {
      return;
    }

    setUserData((prev) => ({ ...prev, ...localPatch }));
    closeEditor();
  };

  const saveCurrentSalary = () => {
    saveSimpleField(
      { current_salary: draftSalary.trim() ? Number(draftSalary) : null },
      { currentSalary: draftSalary.trim() },
    );
  };

  const saveTargetSalary = () => {
    saveSimpleField(
      { target_salary: draftSalary.trim() ? Number(draftSalary) : null },
      { targetSalary: draftSalary.trim() },
    );
  };

  const saveExperienceLevel = () => {
    saveSimpleField(
      { experience_level: draftExperience || null },
      { experienceLevel: draftExperience },
    );
  };

  const saveTargetTimeframe = () => {
    saveSimpleField(
      { target_timeframe: draftTimeframe || null },
      { targetTimeframe: draftTimeframe },
    );
  };

  const saveSkills = () => {
    saveSimpleField(
      { skills: draftSkills.length > 0 ? draftSkills : null },
      { skills: draftSkills },
    );
  };

  /** Shared by Current Role and Target Role — the only two fields whose
   * change can make the existing roadmap stale, so they share the same
   * warn-then-save-then-invalidate flow rather than the plain saveSimpleField
   * path every other field uses. */
  const saveRoleField = (field: "currentRole" | "targetRole") => {
    const newRole = roleQuery.trim();

    if (!newRole) {
      Alert.alert("Role required", "Please enter a role, or close this without saving.");
      return;
    }

    const originalRole =
      field === "currentRole" ? userData.currentRole : userData.targetRole;

    if (newRole === originalRole.trim()) {
      // No actual change — nothing to warn about or save.
      closeEditor();
      return;
    }

    const roleLabel = field === "currentRole" ? "current" : "target";

    Alert.alert(
      "Your journey may change",
      `Changing your ${roleLabel} role may affect your career roadmap. You'll need to revisit Journey to see the updated plan. Continue?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Continue",
          style: "destructive",
          onPress: async () => {
            // Snapshot before the write — invalidation needs the OLD values
            // to compute the cache keys that are about to go stale.
            const previousUserData = userData;

            const updates =
              field === "currentRole"
                ? {
                    current_role: newRole,
                    current_occupation_id: draftOccupationId,
                  }
                : {
                    target_role: newRole,
                    target_occupation_id: draftOccupationId,
                  };

            const ok = await saveFields(updates);

            if (!ok) {
              return;
            }

            setUserData((prev) => ({
              ...prev,
              ...(field === "currentRole"
                ? { currentRole: newRole, currentOccupationId: draftOccupationId }
                : { targetRole: newRole, targetOccupationId: draftOccupationId }),
            }));

            await invalidateCachedRoadmap(previousUserData, {
              alsoDecision: field === "targetRole",
            });

            closeEditor();
          },
        },
      ],
    );
  };

  const handleReconsiderPriority = () => {
    Alert.alert(
      "Change your priority?",
      "You'll be asked to choose again next time you view your Journey.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Continue",
          onPress: async () => {
            await invalidateCachedRoadmap(userData, { alsoDecision: true });
            setPriority(null);
            router.push("/timeline");
          },
        },
      ],
    );
  };

  const handleSignOut = async () => {
    setSigningOut(true);

    const { error } = await signOut();

    if (error) {
      setSigningOut(false);
      Alert.alert("Sign Out Failed", error.message);
      return;
    }

    // Drop the previous user's details so they can't briefly show for whoever
    // signs in next.
    clearUserData();

    router.replace("/");
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Profile</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.name}>{userData.name || "Your Name"}</Text>

        <CareerBlueprintCard
          currentRole={userData.currentRole}
          currentSalary={userData.currentSalary}
          experienceLevel={userData.experienceLevel}
          skills={userData.skills}
          targetRole={userData.targetRole}
          targetSalary={userData.targetSalary}
          targetTimeframe={userData.targetTimeframe}
          priority={priority}
          onEditCurrentRole={() => openEditor("currentRole")}
          onEditCurrentSalary={() => openEditor("currentSalary")}
          onEditExperienceLevel={() => openEditor("experienceLevel")}
          onEditSkills={() => openEditor("skills")}
          onEditTargetRole={() => openEditor("targetRole")}
          onEditTargetSalary={() => openEditor("targetSalary")}
          onEditTargetTimeframe={() => openEditor("targetTimeframe")}
          onEditPriority={priority ? handleReconsiderPriority : undefined}
        />

        <ProfileLinkRow
          icon="📖"
          title="Career Journal"
          subtitle="Your milestones and completed missions"
          onPress={() => router.push("/career-journal")}
        />

        <ProfileLinkRow icon="⚙️" title="Preferences" subtitle="Coming soon" />

        <ProfileLinkRow
          icon="❓"
          title="Help & Support"
          subtitle="Coming soon"
        />

        <Text style={styles.sectionLabel}>ACCOUNT</Text>

        <Card>
          <Button
            title={signingOut ? "Signing out..." : "Sign Out"}
            variant="secondary"
            disabled={signingOut}
            onPress={handleSignOut}
          />
        </Card>
      </ScrollView>

      <EditModal
        visible={editingField === "currentSalary"}
        title="Current Salary"
        onClose={closeEditor}
        onSave={saveCurrentSalary}
        saveDisabled={!isValidMoney(draftSalary)}
        saving={saving}
      >
        <TextInput
          style={styles.input}
          value={draftSalary}
          onChangeText={setDraftSalary}
          placeholder="e.g. 45000"
          placeholderTextColor={Colors.subtext}
          keyboardType="numeric"
        />

        {!isValidMoney(draftSalary) && (
          <Text style={styles.error}>Enter a whole number, or leave blank.</Text>
        )}
      </EditModal>

      <EditModal
        visible={editingField === "targetSalary"}
        title="Target Salary"
        onClose={closeEditor}
        onSave={saveTargetSalary}
        saveDisabled={!isValidMoney(draftSalary)}
        saving={saving}
      >
        <TextInput
          style={styles.input}
          value={draftSalary}
          onChangeText={setDraftSalary}
          placeholder="e.g. 60000"
          placeholderTextColor={Colors.subtext}
          keyboardType="numeric"
        />

        {!isValidMoney(draftSalary) && (
          <Text style={styles.error}>Enter a whole number, or leave blank.</Text>
        )}
      </EditModal>

      <EditModal
        visible={editingField === "experienceLevel"}
        title="Experience Level"
        onClose={closeEditor}
        onSave={saveExperienceLevel}
        saving={saving}
      >
        {EXPERIENCE_OPTIONS.map((option) => (
          <TouchableOpacity
            key={option}
            style={[
              styles.choiceRow,
              draftExperience === option && styles.choiceRowSelected,
            ]}
            onPress={() => setDraftExperience(option)}
          >
            <Text style={styles.choiceText}>
              {EXPERIENCE_LEVEL_LABELS[option]}
            </Text>

            {draftExperience === option && (
              <Text style={styles.checkmark}>✓</Text>
            )}
          </TouchableOpacity>
        ))}
      </EditModal>

      <EditModal
        visible={editingField === "targetTimeframe"}
        title="Target Timeframe"
        onClose={closeEditor}
        onSave={saveTargetTimeframe}
        saving={saving}
      >
        {TIMEFRAME_OPTIONS.map((option) => (
          <TouchableOpacity
            key={option}
            style={[
              styles.choiceRow,
              draftTimeframe === option && styles.choiceRowSelected,
            ]}
            onPress={() => setDraftTimeframe(option)}
          >
            <Text style={styles.choiceText}>
              {TARGET_TIMEFRAME_LABELS[option]}
            </Text>

            {draftTimeframe === option && (
              <Text style={styles.checkmark}>✓</Text>
            )}
          </TouchableOpacity>
        ))}
      </EditModal>

      <EditModal
        visible={editingField === "skills"}
        title="Skills"
        onClose={closeEditor}
        onSave={saveSkills}
        saving={saving}
      >
        <SkillSelector
          suggested={[]}
          allKnown={getAllKnownSkills()}
          selected={draftSkills}
          onChange={setDraftSkills}
        />
      </EditModal>

      <EditModal
        visible={editingField === "currentRole"}
        title="Current Role"
        onClose={closeEditor}
        onSave={() => saveRoleField("currentRole")}
        saveDisabled={!roleQuery.trim()}
        saving={saving}
      >
        <OccupationAutocomplete
          label="Current Occupation"
          placeholder="Start typing..."
          value={roleQuery}
          results={roleResults}
          loading={roleLoading}
          onChangeText={handleRoleQueryChange}
          onSelect={handleRoleSelect}
        />
      </EditModal>

      <EditModal
        visible={editingField === "targetRole"}
        title="Target Role"
        onClose={closeEditor}
        onSave={() => saveRoleField("targetRole")}
        saveDisabled={!roleQuery.trim()}
        saving={saving}
      >
        <OccupationAutocomplete
          label="Target Occupation"
          placeholder="Start typing..."
          value={roleQuery}
          results={roleResults}
          loading={roleLoading}
          onChangeText={handleRoleQueryChange}
          onSelect={handleRoleSelect}
        />
      </EditModal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },

  headerTitle: {
    color: Colors.text,
    fontSize: 22,
    fontWeight: "700",
  },

  content: {
    padding: 20,
    paddingBottom: 40,
  },

  name: {
    color: Colors.text,
    fontSize: 28,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 20,
  },

  sectionLabel: {
    color: Colors.subtext,
    fontSize: 12,
    letterSpacing: 1.2,
    fontWeight: "800",
    marginBottom: 10,
    marginTop: 4,
  },

  input: {
    backgroundColor: Colors.background,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
  },

  error: {
    color: Colors.danger,
    fontSize: 13,
    marginTop: 8,
  },

  choiceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },

  choiceRowSelected: {
    opacity: 1,
  },

  choiceText: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: "600",
  },

  checkmark: {
    color: Colors.primary,
    fontSize: 18,
    fontWeight: "700",
  },
});
