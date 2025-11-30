import React, { useEffect } from "react";
import { View, Text, FlatList, Pressable, StyleSheet } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useJournalStore } from "../stores/journalStore";
import { useSharedPalette } from "../hooks/useSharedPalette";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";


export default function SharedJournalScreen() {
  const navigation = useNavigation();
const palette = useSharedPalette();


const { currentJournalId, sharedEntries, joinJournal, createJournal } =
  useJournalStore((s) => ({
    currentJournalId: s.currentJournalId,
    sharedEntries: s.sharedEntries,
    joinJournal: s.joinJournal,
    createJournal: s.createJournal,
  }));
const entries = sharedEntries[currentJournalId] || [];


  // Load journal if needed
  useEffect(() => {
    console.log("SharedJournalScreen loaded. Journal ID:", currentJournalId);
  }, [currentJournalId]);

  // ----------------------------------------------------------------------
  // If user has NO journal → show simplified “Join or Create”
  // ----------------------------------------------------------------------
  if (!currentJournalId) {
    return (
      <View style={[styles.center, { backgroundColor: palette.bg }]}>
        <Text style={[styles.title, { color: palette.text }]}>
          Shared Journals
        </Text>

        <Pressable
          style={[styles.button, { backgroundColor: palette.accent }]}
          onPress={() => {
            createJournal("You");
          }}
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

  // ----------------------------------------------------------------------
  // User IS in a journal → display shared entries
  // ----------------------------------------------------------------------
return (
<ThemeFadeWrapper>
  <SafeAreaView style={{ flex: 1, backgroundColor: palette.bg }}>
    <View style={[styles.container, { backgroundColor: palette.bg, paddingTop: 0 }]}>

{/* MATCHING HEADER */}
<View
  style={{
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingTop: 4,
    paddingBottom: 12,
  }}
>
  <Pressable
    onPress={() => navigation.goBack()}
    hitSlop={20}
    style={{ paddingRight: 8 }}
  >
    <Feather name="arrow-left" size={26} color={palette.text} />
  </Pressable>

  <Text
    style={{
      fontSize: 24,
      fontWeight: "700",
      color: palette.text,
      marginLeft: 4,
    }}
  >
    Shared Journals
  </Text>
</View>


<View
  style={{
    flexDirection: "row",
    alignItems: "center",
    paddingTop: Platform.OS === "ios" ? 16 : 12,
    paddingBottom: 12,
    paddingHorizontal: 16,
  }}
>
  <Pressable
    onPress={() => navigation.goBack()}
    hitSlop={20}
    style={{ padding: 4, marginRight: 8 }}
  >
    <Feather name="arrow-left" size={28} color={palette.text} />
  </Pressable>

  <Text
    style={{
      fontSize: 26,
      fontWeight: "700",
      color: palette.text,
    }}
  >
    Shared Journals
  </Text>
</View>


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
onPress={() => navigation.navigate("SharedEntryDetail", { entryId: item.id })}
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
  title: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 20,
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
