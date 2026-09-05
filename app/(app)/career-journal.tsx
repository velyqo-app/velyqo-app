import {
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";

import Card from "../../components/ui/Card";
import LoadingScreen from "../../components/ui/LoadingScreen";

import { Colors } from "../../constants/theme";

import { useJournal } from "../../hooks/useJournal";

export default function CareerJournalScreen() {
  const { loading, journal } = useJournal();

  if (loading) {
    return <LoadingScreen message="Loading your Career Journal..." />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>📖 Career Journal</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {journal.length === 0 ? (
          <Card>
            <Text style={styles.emptyTitle}>Your journey starts today 🚀</Text>

            <Text style={styles.emptyText}>
              Complete your first mission and your achievements will appear
              here.
            </Text>
          </Card>
        ) : (
          journal.map((entry) => (
            <Card key={entry.id}>
              <Text style={styles.entryTitle}>{entry.title}</Text>

              {entry.description ? (
                <Text style={styles.description}>{entry.description}</Text>
              ) : null}

              <View style={styles.footer}>
                <Text style={styles.type}>
                  {entry.entry_type.toUpperCase()}
                </Text>

                <Text style={styles.date}>
                  {new Date(entry.created_at).toLocaleDateString()}
                </Text>
              </View>
            </Card>
          ))
        )}
      </ScrollView>
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
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },

  title: {
    color: Colors.text,
    fontSize: 24,
    fontWeight: "700",
  },

  content: {
    padding: 20,
    gap: 16,
  },

  entryTitle: {
    color: Colors.text,
    fontSize: 20,
    fontWeight: "700",
  },

  description: {
    color: Colors.subtext,
    marginTop: 10,
    lineHeight: 22,
  },

  footer: {
    marginTop: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  type: {
    color: Colors.primary,
    fontWeight: "700",
    fontSize: 13,
  },

  date: {
    color: Colors.subtext,
    fontSize: 13,
  },

  emptyTitle: {
    color: Colors.text,
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
  },

  emptyText: {
    color: Colors.subtext,
    textAlign: "center",
    marginTop: 12,
    lineHeight: 24,
  },
});
