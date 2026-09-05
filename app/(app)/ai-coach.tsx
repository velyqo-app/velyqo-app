import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useState } from "react";
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";

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
import { askAI, isAIFailureReply } from "../../services/openaiService";

import { Colors } from "../../constants/theme";
import { AIContext } from "../../types/ai";

type Message = {
  text: string;
  isUser: boolean;

  /** True only for a message that failed to reach/return from the AI. */
  failed?: boolean;
};

export default function AICoachScreen() {
  // Fetches independently rather than relying on an ancestor screen (e.g. the
  // dashboard) having already populated UserContext — otherwise a direct/hard
  // reload onto this screen renders the welcome message with blank fields.
  const { userData, error, reloadProfile } = useProfile();

  const { mission: missionParam } = useLocalSearchParams<{
    mission?: string;
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

  useFocusEffect(
    useCallback(() => {
      let active = true;

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

  const welcomeMessage = missionParam
    ? `🎯 Today's Mission

${missionParam}

I'll help you complete today's mission.

Ask me anything about this topic and we'll work through it together.`
    : error
      ? `Hi there 👋

I couldn't load your profile just now, so I don't have your career details
handy. You can still ask me anything, or retry below.`
      : `Hi ${userData.name || "there"} 👋

I'm your Velyqo Career Coach. How can I help today?`;

  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);

  const sendMessage = async (message: string) => {
    setMessages((prev) => [...prev, { text: message, isUser: true }]);
    setLoading(true);

    const reply = await askAI({ message, context });

    setLoading(false);
    setMessages((prev) => [
      ...prev,
      { text: reply, isUser: false, failed: isAIFailureReply(reply) },
    ]);
  };

  const retry = (originalMessage: string) => {
    sendMessage(originalMessage);
  };

  const hasRoadmap = Boolean(context?.roadmap && context.roadmap.steps.length > 0);
  const suggestedQuestions = buildSuggestedQuestions(context, Boolean(missionParam));

  return (
    <SafeAreaView style={styles.container}>
      <CoachHeader
        currentRole={userData.currentRole}
        targetRole={userData.targetRole}
      />

      <ScrollView
        style={styles.chat}
        contentContainerStyle={styles.chatContent}
      >
        <CurrentFocusCard
          loading={contextLoading}
          hasRoadmap={hasRoadmap}
          missionTitle={context?.mission.title ?? ""}
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

        {messages.map((msg, index) => (
          <ChatBubble
            key={index}
            message={msg.text}
            isUser={msg.isUser}
            isError={msg.failed}
            onRetry={
              msg.failed
                ? () => retry(messages[index - 1]?.text ?? "")
                : undefined
            }
          />
        ))}

        {loading && <TypingIndicator />}
      </ScrollView>

      {missionParam && (
        <Button
          title="✅ Complete Mission"
          onPress={() => router.replace("/mission-complete")}
        />
      )}

      <ChatInput onSend={sendMessage} disabled={loading} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  chat: {
    flex: 1,
  },

  chatContent: {
    padding: 16,
    paddingBottom: 30,
  },

  retryContainer: {
    marginBottom: 16,
  },
});
