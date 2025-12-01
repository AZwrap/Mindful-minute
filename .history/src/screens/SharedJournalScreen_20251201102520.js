import React, { useLayoutEffect } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useJournalStore } from "../stores/journalStore";
import { useSharedPalette } from "../hooks/useSharedPalette";
import ThemeFadeWrapper from "../components/ThemeFadeWrapper";

export default function SharedJournalScreen() {
  const navigation = useNavigation();
  const palette = useSharedPalette();

  const { sharedEntries, createJournal } = useJournalStore((s) => ({
    sharedEntries: s.sharedEntries,
    createJournal: s.createJournal,
  }));

  const entries = Object.values(sharedEntries || {});

  // 1. Set the Standard Navigation Header (Matches WriteScreen)
  useLayoutEffect(() => {
    navigation.setOptions({
      title: "Shared Journals", // Sets the text in the standard header
      headerShown: true,        // Ensures the standard header is visible
      headerStyle: {
        backgroundColor: palette.bg, // Matches your screen background
      },
      headerTintColor: palette.text, // Matches your text color
      headerShadowVisible: false,    // Optional: removes the line for a cleaner look
    });
  }, [navigation, palette]);

  return (
    <ThemeFadeWrapper>
      <View style={[styles.container, { backgroundColor: palette.bg }]}>
        
        {/* 2. REMOVED the manual <View> header here completely. 
               We now rely on the system header configured above. */}

        {/* LIST */}
        <FlatList
          data={entries}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16 }}
          renderItem={({ item }) => (
            <Pressable
              onPress={() =>
                navigation.navigate("SharedEntryDetail", { entryId: item.id })
              }
              style={[
                styles.entryCard,
                { backgroundColor: palette.card, borderColor: palette.border },
              ]}
            >
              <Text style={[styles.entryTitle, { color: palette.text }]}>
                {item.title || "Untitled"}
              </Text>

              <Text style={[styles.entryDate, { color: palette.subtleText }]}>
                {new Date(item.createdAt).toLocaleString()}
              </Text>
            </Pressable>
          )}
          ListEmptyComponent={
            <Text style={[styles.empty, { color: palette.subtleText }]}>
              No shared entries yet.
            </Text>
          }
        />

        {/* CREATE NEW SHARED JOURNAL BUTTON */}
        <Pressable
          onPress={() => createJournal()}
          style={[
            styles.createButton,
            { backgroundColor: palette.accent, shadowColor: palette.text },
          ]}
        >
          <Text style={styles.createButtonText}>Create New Shared Journal</Text>
        </Pressable>
      </View>
    </ThemeFadeWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  entryCard: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  entryTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  entryDate: {
    marginTop: 6,
    fontSize: 12,
  },
  empty: {
    textAlign: "center",
    marginTop: 40,
    fontSize: 14,
  },
  createButton: {
    margin: 16,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    shadowOpacity: 0.3,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
  },
});