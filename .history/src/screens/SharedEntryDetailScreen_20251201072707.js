import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
} from "react-native";
import { useSharedPalette } from "../hooks/useSharedPalette";

import { useJournalStore } from "../stores/journalStore";
import { useNavigation, useRoute } from "@react-navigation/native";

export default function SharedEntryDetailScreen() {
const palette = useSharedPalette();

  const navigation = useNavigation();
  const route = useRoute();

  const { entryId } = route.params ?? {};

const { sharedEntries, currentJournalId, removeSharedEntry } =
  useJournalStore((s) => ({
    sharedEntries: s.sharedEntries,
    currentJournalId: s.currentJournalId,
    removeSharedEntry: s.removeSharedEntry,
  }));


  if (!currentJournalId) {
    return (
      <View style={[styles.center, { backgroundColor: palette.bg }]}>
        <Text style={{ color: palette.text }}>Journal unavailable</Text>
      </View>
    );
  }

  const entriesInJournal = sharedEntries[currentJournalId] || [];
  const entry = entriesInJournal.find((e) => e.id === entryId);

  if (!entry) {
    return (
      <View style={[styles.center, { backgroundColor: palette.bg }]}>
        <Text style={{ color: palette.text }}>Entry not found.</Text>
      </View>
    );
  }

  const confirmDelete = () => {
    Alert.alert("Delete Entry", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          removeSharedEntry(entryId);
          navigation.goBack();
        },
      },
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: palette.bg }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        style={{ flex: 1 }}
      >
        <Text style={[styles.date, { color: palette.sub }]}>
          {new Date(entry.createdAt).toLocaleString()}
        </Text>

        <Text style={[styles.author, { color: palette.sub }]}>
          By: {entry.author || "Unknown"}
        </Text>

        <Text style={[styles.text, { color: palette.text }]}>
          {entry.text}
        </Text>

        <Pressable
          onPress={confirmDelete}
          style={[
            styles.deleteButton,
            { backgroundColor: palette.accentSoft },
          ]}
        >
          <Text style={[styles.deleteText, { color: palette.accent }]}>
            Delete Entry
          </Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  date: {
    fontSize: 13,
    marginBottom: 6,
  },
  author: {
    fontSize: 13,
    marginBottom: 16,
  },
  text: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 32,
  },
  deleteButton: {
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  deleteText: {
    fontWeight: "600",
    fontSize: 14,
  },
});
