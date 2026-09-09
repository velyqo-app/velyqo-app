import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
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

  // Adjusts state during render rather than in a useEffect (React's own
  // recommended pattern for "reset/sync state when a prop changes") —
  // tracks the last param value seen so a genuine change (e.g. navigating
  // here again from career-journal.tsx's redirect or Profile's direct
  // link while already mounted) updates `view`, while still leaving the
  // user free to switch segments locally afterward without this fighting
  // that choice on every render.
  const [lastViewParam, setLastViewParam] = useState(viewParam);

  if (viewParam !== lastViewParam) {
    setLastViewParam(viewParam);

    if (viewParam === "story" || viewParam === "roadmap") {
      setView(viewParam);
    }
  }

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
