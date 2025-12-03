import React, { useLayoutEffect, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useJournalStore } from "../stores/journalStore";
import { useSharedPalette } from "../hooks/useSharedPalette";
import ThemeFadeWrapper from "../components/ThemeFadeWrapper";
import ScreenLoader from "../components/ScreenLoader";

export default function SharedJournalScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const palette = useSharedPalette();
  
  // Get the specific Journal ID passed from Home
  const { journalId } = route.params || {};

const { 
    sharedEntries, 
    journalInfo, 
    subscribeToJournal, 
    leaveJournal,
    isLoading // <--- Added
  } = useJournalStore((s) => ({
    sharedEntries: s.sharedEntries,
    journalInfo: s.journalInfo,
    subscribeToJournal: s.subscribeToJournal,
    leaveJournal: s.leaveJournal,
    isLoading: s.isLoading, // <--- Added
  }));

  // STEP 12: Trigger Real-Time Sync on Mount
  useEffect(() => {
    if (journalId) {
      console.log("🔌 Subscribing to journal:", journalId);
      subscribeToJournal(journalId);
    }
  }, [journalId]);

  // STEP 1: Trigger Real-Time Sync on Mount
  useEffect(() => {
    // ... existing code ...
  }, [journalId]);

  // STEP 1.5: Show Loader while fetching
  // We only show loader if we have NO data yet. 
  // If we have cached data, we show that while refreshing silently.
  if (isLoading && entries.length === 0) {
    return <ScreenLoader />;
  }

  // FIXED: Select entries ONLY for this journal ID
  // (Old code 'Object.values' was returning an array of arrays, which breaks FlatList)
  const entries = sharedEntries[journalId] || [];

  // 1. Set the Standard Navigation Header
  useLayoutEffect(() => {
    navigation.setOptions({
      title: "Shared Journal", 
      headerShown: true,
      headerStyle: {
        backgroundColor: palette.bg,
      },
      headerTintColor: palette.text,
      headerShadowVisible: false,
    });
  }, [navigation, palette]);

  return (
    <ThemeFadeWrapper>
      <View style={[styles.container, { backgroundColor: palette.bg }]}>
        
        {/* LIST */}
        <FlatList
          data={entries}
          keyExtractor={(item, index) => item.id || String(index)}
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
                {item.title || "Untitled Entry"}
              </Text>

              <Text style={[styles.entryDate, { color: palette.subtleText }]}>
                {item.createdAt ? new Date(item.createdAt).toLocaleString() : "Just now"}
              </Text>
            </Pressable>
          )}
          ListEmptyComponent={
            <Text style={[styles.empty, { color: palette.subtleText }]}>
              No entries yet. Write the first one!
            </Text>
          }
        />

        {/* CREATE NEW SHARED ENTRY BUTTON (Fixed Context) */}
        <Pressable
          onPress={() => navigation.navigate("SharedWrite", { journalId })}
          style={[
            styles.createButton,
            { backgroundColor: palette.accent, shadowColor: palette.text },
          ]}
        >
          <Text style={styles.createButtonText}>Write New Entry</Text>
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