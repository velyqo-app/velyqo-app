import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import Button from "../../components/ui/Button";

import ChatBubble from "../../components/ChatBubble";
import ChatInput from "../../components/ChatInput";
import TypingIndicator from "../../components/TypingIndicator";
import CoachHeader from "../../components/coach/CoachHeader";
import CurrentFocusCard from "../../components/coach/CurrentFocusCard";
import SuggestedQuestions from "../../components/coach/SuggestedQuestions";

import { useProfile } from "../../hooks/useProfile";

import { buildSuggestedQuestions } from "../../services/coachSuggestionService";
import { getAIContext } from "../../services/aiContextService";
import {
  loadCoachHistory,
  saveCoachHistory,
} from "../../services/coachHistoryService";
import { askAI, isAIFailureReply } from "../../services/openaiService";

import { Colors } from "../../constants/theme";
import { AIContext } from "../../types/ai";

type Message = {
  text: string;
  isUser: boolean;

  /** True only for a message that failed to reach/return from the AI. */
  failed?: boolean;
};

/** One item as handed to the inverted FlatList's `data` — the same Message
 * fields plus its position in the original, oldest-first `messages` array,
 * so retry logic (and anything else that needs "the message before this
 * one" in real conversation order) never has to reason about the reversed
 * render order. See the file-level comment on `reversedMessages` below. */
type RenderableMessage = Message & { originalIndex: number };

export default function AICoachScreen() {
  // Fetches independently rather than relying on an ancestor screen (e.g. the
  // dashboard) having already populated UserContext — otherwise a direct/hard
  // reload onto this screen renders the welcome message with blank fields.
  const { userData, error, reloadProfile } = useProfile();

  const {
    mission: missionParam,
    missionDescription: missionDescriptionParam,
    capabilityGapId,
    capabilityName,
  } = useLocalSearchParams<{
    mission?: string;
    missionDescription?: string;
    // Present only when Home's Next Move was the Tier 0 capability mission —
    // see capabilityMissionService. Carried through to Mission Complete
    // below so a future step can attach evidence to the right
    // capability_gaps row; this step does not act on it otherwise.
    capabilityGapId?: string;
    capabilityName?: string;
  }>();

  // Refetched once per screen focus rather than per message — sendMessage
  // reuses this same context object instead of re-fetching the profile,
  // progress and roadmap peek on every single question. Refreshing on focus
  // (not just on first mount) matters because expo-router's Tabs keep this
  // screen mounted in the background — without this, editing Profile in
  // another tab and returning here would keep showing the stale pre-edit
  // milestone/mission. Never triggers roadmap generation: getAIContext only
  // ever reads an already-cached roadmap (see aiContextService/findCachedRoadmap).
  const [context, setContext] = useState<AIContext | null>(null);
  const [contextLoading, setContextLoading] = useState(true);

  // Chat architecture — an inverted FlatList, replacing the previous plain
  // ScrollView + imperative scrollToEnd()/onContentSizeChange machinery.
  //
  // The prior architecture's entire class of bug (returning to Coach
  // showing a stale/middle position, sometimes correcting, sometimes not)
  // came from "the newest message" being a MOVING target: reaching it
  // required scrollToEnd(), whose correct value depends on the current
  // total content height — itself dependent on async state
  // (contextLoading resolving, CurrentFocusCard's own collapse/regrow,
  // welcomeMessage's text swap) and, per prior on-device testing, possibly
  // a native-layer process outside this file's control (see the git
  // history of this file for that investigation). No amount of retiming a
  // scrollToEnd() call fixes a moving target.
  //
  // An inverted list removes the target's dependency on content height
  // entirely: with `data` supplied newest-first (see reversedMessages
  // below) and `inverted` set, "the newest message visible" IS the list's
  // own default resting position (scroll offset 0) — a fixed constant,
  // known synchronously, that never changes no matter how tall the header/
  // footer content is. Returning to Coach needs no scroll call at all
  // (focusGeneration below gives the list a fresh `key` per focus, and a
  // freshly mounted inverted list already starts at offset 0); sending a
  // message or receiving a reply needs one immediate, unconditional
  // scrollToOffset({ offset: 0 }) call, which — unlike scrollToEnd() —
  // does not need to wait for anything to finish laying out first.
  const flatListRef = useRef<FlatList<RenderableMessage>>(null);
  const [focusGeneration, setFocusGeneration] = useState(0);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      // A fresh key forces React to unmount the previous FlatList instance
      // and mount a brand-new one rather than reusing the same long-lived
      // native view across focuses — a newly created inverted list starts
      // at offset 0 (the newest message) by default, with no imperative
      // scroll call needed for this path.
      setFocusGeneration((generation) => generation + 1);

      setContextLoading(true);

      getAIContext().then((loaded) => {
        if (active) {
          setContext(loaded);
          setContextLoading(false);
        }
      });

      return () => {
        active = false;
      };
    }, []),
  );

  // Same read-only snapshot CurrentFocusCard/suggested-questions already use
  // below — no second fetch, no new AI call, just reused earlier.
  const hasRoadmap = Boolean(context?.roadmap && context.roadmap.steps.length > 0);

  // context.mission is independently recomputed by getAIContext() from the
  // roadmap/fallback pipeline — it knows nothing about capability gaps, so
  // when this screen was opened for a capability mission (capabilityGapId
  // present), showing context.mission.title here would contradict the
  // mission the user actually opened Coach for (and already sees in the
  // welcome message and the Complete Mission flow below). Reuses the same
  // route-carried missionParam those already use — no new fetch, no new AI
  // context. Unchanged (still context.mission.title) whenever there is no
  // active capability mission.
  const currentFocusTitle = capabilityGapId
    ? (missionParam ?? "")
    : (context?.mission.title ?? "");

  const welcomeMessage = missionParam
    ? `🎯 Today's Mission

${missionParam}

I'll help you complete today's mission.

Ask me anything about this topic and we'll work through it together.`
    : error
      ? `Hi there 👋

I couldn't load your profile just now, so I don't have your career details
handy. You can still ask me anything, or retry below.`
      : hasRoadmap && context
        ? `Hi ${userData.name || "there"} 👋

Right now you're working toward "${context.mission.title}" on your way to ${userData.targetRole || "your target role"}. What would you like to dig into?`
        : `Hi ${userData.name || "there"} 👋

I'm your Velyqo Career Coach. How can I help today?`;

  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);

  // Local-only persistence (services/coachHistoryService.ts) so this
  // conversation survives a full app restart — it did not before, since
  // `messages` above is otherwise plain in-memory state. This is restoring
  // the CURRENT conversation, not a second source of truth: nothing here
  // is sent to the AI (Coach's own prompt still never includes prior
  // turns, unchanged), and nothing here touches the inverted FlatList
  // scroll architecture above.
  //
  // Loaded exactly once, the first time a real userId is available —
  // guarded by hasLoadedHistoryRef rather than re-running on every focus,
  // since `messages` in memory is already the freshest source once the
  // app is running; storage only needs to seed the very first render.
  const hasLoadedHistoryRef = useRef(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);

  useEffect(() => {
    const userId = userData.userId;

    if (!userId || hasLoadedHistoryRef.current) {
      return;
    }

    hasLoadedHistoryRef.current = true;

    loadCoachHistory(userId).then((stored) => {
      if (stored.length > 0) {
        // Functional update, and only applied while messages is still
        // empty: guards against the (rare, fast-typing-on-cold-start)
        // race where the user has already sent a new message before this
        // async load resolves — the load must never clobber it.
        setMessages((current) => (current.length === 0 ? stored : current));
      }

      setHistoryLoaded(true);
    });
  }, [userData.userId]);

  // Persists after every change, but only once the initial load above has
  // genuinely finished (success or "nothing to restore" both count) —
  // otherwise this would fire on the very first render, when `messages`
  // is still its initial `[]`, and overwrite a real stored conversation
  // with an empty one before the load had a chance to read it back.
  useEffect(() => {
    const userId = userData.userId;

    if (!userId || !historyLoaded) {
      return;
    }

    saveCoachHistory(userId, messages);
  }, [messages, userData.userId, historyLoaded]);

  // Newest-first view of `messages` for the inverted list's `data` prop —
  // `messages` itself stays exactly as-is (oldest-first, append-only;
  // unchanged everywhere it's written) since nothing else in this file
  // relies on reversed order. `originalIndex` preserves each item's real
  // position so retry logic below can still find "the message immediately
  // before this one" in true conversation order, not reversed-array order.
  const reversedMessages: RenderableMessage[] = messages
    .map((message, originalIndex) => ({ ...message, originalIndex }))
    .reverse();

  const sendMessage = async (message: string) => {
    setMessages((prev) => [...prev, { text: message, isUser: true }]);
    setLoading(true);
    flatListRef.current?.scrollToOffset({ offset: 0, animated: true });

    const reply = await askAI({ message, context });

    setLoading(false);
    setMessages((prev) => [
      ...prev,
      { text: reply, isUser: false, failed: isAIFailureReply(reply) },
    ]);
    // Unconditional, matching the existing product requirement that a new
    // reply is always shown regardless of whether the user had scrolled
    // away to read history while waiting for it.
    flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
  };

  const retry = (originalMessage: string) => {
    sendMessage(originalMessage);
  };

  const suggestedQuestions = buildSuggestedQuestions(context, Boolean(missionParam));

  const completeMission = () => {
    // A capability mission (capabilityGapId present) did not come from
    // getAIContext()'s roadmap/fallback pipeline, so context.mission would
    // be the wrong mission entirely here — use the route-carried title and
    // description instead, and thread capabilityGapId/capabilityName
    // through to Mission Complete. Otherwise, unchanged: reuse the same
    // AIContext.mission already loaded above (the shared
    // missionFromRoadmapStep/fallbackMission pipeline) rather than a second
    // mission source; falls back to the route's mission title if context
    // failed to load, and to the screen's own generic fallback if neither
    // is available.
    if (capabilityGapId) {
      router.replace({
        pathname: "/mission-complete",
        params: {
          missionTitle: missionParam ?? "",
          missionDescription: missionDescriptionParam ?? "",
          capabilityGapId,
          capabilityName: capabilityName ?? "",
        },
      });
      return;
    }

    router.replace({
      pathname: "/mission-complete",
      params: {
        missionTitle: context?.mission.title ?? missionParam ?? "",
        missionDescription: context?.mission.description ?? "",
      },
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <CoachHeader
        currentRole={userData.currentRole}
        targetRole={userData.targetRole}
      />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        <FlatList
          key={focusGeneration}
          ref={flatListRef}
          inverted
          style={styles.chat}
          contentContainerStyle={styles.chatContent}
          data={reversedMessages}
          keyExtractor={(item) => String(item.originalIndex)}
          renderItem={({ item }) => (
            <ChatBubble
              message={item.text}
              isUser={item.isUser}
              isError={item.failed}
              onRetry={
                item.failed
                  ? () =>
                      retry(messages[item.originalIndex - 1]?.text ?? "")
                  : undefined
              }
            />
          )}
          // In an inverted list, ListHeaderComponent renders at the visual
          // BOTTOM (closest to the composer) and ListFooterComponent at the
          // visual TOP — the exact opposite of their non-inverted names,
          // because the whole list is flipped. TypingIndicator belongs
          // closest to the composer (as it already did in the previous
          // chronological layout), so it's the header; everything that
          // used to render ABOVE the conversation (CurrentFocusCard, the
          // welcome bubble, the profile-error retry button, suggested
          // questions) belongs at the far end from the composer, so it's
          // the footer.
          ListHeaderComponent={loading ? <TypingIndicator /> : null}
          ListFooterComponent={
            <>
              <CurrentFocusCard
                loading={contextLoading}
                hasRoadmap={hasRoadmap}
                missionTitle={currentFocusTitle}
                estimatedJourney={context?.roadmap?.estimatedJourney ?? null}
                onViewJourney={() => router.push("/timeline")}
              />

              <ChatBubble message={welcomeMessage} isUser={false} />

              {error && (
                <View style={styles.retryContainer}>
                  <Button title="Retry" onPress={reloadProfile} />
                </View>
              )}

              {messages.length === 0 && suggestedQuestions.length > 0 && (
                <SuggestedQuestions
                  questions={suggestedQuestions}
                  onSelect={sendMessage}
                  disabled={loading}
                />
              )}
            </>
          }
        />

        {missionParam && (
          <Button title="✅ Complete Mission" onPress={completeMission} />
        )}

        <ChatInput onSend={sendMessage} disabled={loading} />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  flex: {
    flex: 1,
  },

  chat: {
    flex: 1,
  },

  // padding/paddingTop swapped relative to the previous non-inverted
  // contentContainerStyle (which used padding/paddingBottom): the whole
  // content container is flipped by `inverted`, so a value that geometrically
  // sits on ONE side before the flip visually ends up on the OPPOSITE side —
  // paddingTop here is what actually lands as the extra breathing room above
  // the composer (where paddingBottom previously provided it), and vice
  // versa. This preserves the original visual spacing rather than changing
  // it.
  chatContent: {
    padding: 16,
    paddingTop: 30,
  },

  retryContainer: {
    marginBottom: 16,
  },
});
