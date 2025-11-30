import React, { useEffect } from "react";
import { View, Text, FlatList, Pressable, StyleSheet, Platform } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useJournalStore } from "../stores/journalStore";
import { useSharedPalette } from "../hooks/useSharedPalette";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import ThemeFadeWrapper from "../components/ThemeFadeWrapper";

export default function SharedJournalScreen() {
  const navigation = useNavigation();
  const palette = useSharedPalette();

  const { currentJournalId, sharedEntries, createJournal } = useJournalStore((s) => ({
    currentJournalId: s.currentJournalId,
    sharedEntries: s.sharedEntries,
    createJournal: s.createJournal,
  }));

  const entries = sharedEntries[currentJournalId] || [];

  // If user has no shared journal
  if (!currentJournalId) {
    return (
      <View style={[styles.center, { backgroundColor: palette.bg }]}>
        <Pressable
          style={[styles.button, { backgroundColor: palette.accent }]}
          onPress={() => createJournal("You")}
        >
          <Text style={styles.buttonText}>Create Shared Journal</Text>
        </Pressable>

        <Pressable
          style={[styles.buttonOutline, { borderColor: palette.accent }]}
          onPress={() => navigation.navigate("JoinSharedJournal")}
        >
          <Text style={[styles.buttonOutlineText, { color: palette.accent }]}>
            Join Existing Journal
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ThemeFadeWrapper>
      <SafeAreaView style={{ flex: 1, backgroundColor: palette.bg }}>

        {/* ⭐ CUSTOM HEADER EXACTLY LIKE WRITESCREEN */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 16,
            paddingTop: Platform.OS === "ios" ? 12 : 8,
            paddingBottom: 12,
          }}
        >
          <Pressable
            onPress={() => navigation.goBack()}
            hitSlop={20}
            style={{ paddingRight: 12 }}
          >
            <Feather name="arrow-left" size={28} color={palette.text} />
          </Pressable>

          <Text
            style={{
              fontSize: 28,
              fontWeight: "700",
              color: palette.text,
            }}
          >
            Shared Journals
          </Text>
        </View>

        <View style={[styles.container, { backgroundColor: palette.bg }]}>

          <Pressable
            style={[styles.newEntryBtn, { backgroundColor: palette.accent }]}
            onPress={() => navigation.navigate("SharedWrite")}
          >
            <Text style={styles.newEntryText}>+ Start Shared Entry</Text>
          </Pressable>

          <FlatList
            data={entries}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingBottom: 60 }}
            renderItem={({ item }) => (
              <Pressable
                style={[styles.entryCard, { backgroundColor: palette.card }]}
                onPress={() =>
                  navigation.navigate("SharedEntryDetail", { entryId: item.id })
                }
              >
                <Text style={[styles.entryTitle, { color: palette.text }]}>
                  {item.title || "Untitled Entry"}
                </Text>

                <Text style={[styles.entryDate, { color: palette.sub }]}>
                  {new Date(item.createdAt).toLocaleString()}
                </Text>
              </Pressable>
            )}
            ListEmptyComponent={
              <Text style={[styles.empty, { color: palette.sub }]}>
                No shared entries yet.
              </Text>
            }
          />
        </View>
      </SafeAreaView>
    </ThemeFadeWrapper>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 16,
  },
  container: {
    flex: 1,
    padding: 16,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 12,
    width: "100%",
    alignItems: "center",
  },
  buttonText: {
    color: "white",
    fontWeight: "600",
  },
  buttonOutline: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 12,
    width: "100%",
    borderWidth: 2,
    alignItems: "center",
    marginTop: 10,
  },
  buttonOutlineText: {
    fontWeight: "600",
  },
  newEntryBtn: {
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 20,
  },
  newEntryText: {
    color: "white",
    fontWeight: "600",
    fontSize: 14,
  },
  entryCard: {
    padding: 14,
    borderRadius: 12,
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
});
