import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useState } from "react";
import { StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import RoadmapView from "../../components/journey/RoadmapView";
import StorySegmentedControl, {
  JourneyViewMode,
} from "../../components/journey/StorySegmentedControl";
import StoryView from "../../components/journey/StoryView";
import ScreenHeader from "../../components/ui/ScreenHeader";
import { Colors } from "../../constants/theme";

/**
 * Phase 11 Step 4 — Journey's thin shell. Owns nothing but the
 * Roadmap|Story switch itself: ScreenHeader and the segmented control
 * always render, regardless of which view is loading, so Story stays
 * reachable even while Roadmap's own data is still loading (the one
 * approved, intentional behavior change from before this step — see
 * RoadmapView's own header comment). All roadmap logic lives in
 * RoadmapView, unchanged; all Story logic lives in StoryView, new. This
 * file has no data-loading concerns of its own.
 *
 * `view` supports an incoming "roadmap" | "story" query param — the
 * mechanism career-journal.tsx's redirect and Profile's "Career Story"
 * link both use to land directly on Story — while still letting the user
 * freely switch segments afterward via local state.
 */
export default function TimelineScreen() {
  const { view: viewParam } = useLocalSearchParams<{ view?: string }>();

  const [view, setView] = useState<JourneyViewMode>(
    viewParam === "story" ? "story" : "roadmap",
  );

  // Consumes and clears the param on focus, rather than comparing it
  // against its previous value — a plain string-equality check would miss
  // a genuine repeat navigation (e.g. Profile's "Career Story" link tapped
  // again after the user locally switched back to Roadmap in between),
  // since the incoming value would be identical to the one already seen
  // and nothing would appear to have changed. Clearing it immediately after
  // consuming it also means a later plain tab-bar focus — carrying no new
  // navigation intent of its own — leaves the user's local segment choice
  // alone instead of silently reapplying a stale param.
  useFocusEffect(
    useCallback(() => {
      if (viewParam === "story" || viewParam === "roadmap") {
        setView(viewParam);
        router.setParams({ view: undefined });
      }
    }, [viewParam]),
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="Your Journey" />

      <StorySegmentedControl value={view} onChange={setView} />

      {view === "story" ? <StoryView /> : <RoadmapView />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
});
