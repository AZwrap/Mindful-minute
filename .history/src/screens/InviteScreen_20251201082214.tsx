import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
} from "react-native";
import { useSharedPalette } from "../hooks/useSharedPalette";
import { useJournalStore } from "../stores/journalStore";

export default function InviteScreen() {
const palette = useSharedPalette();

  const createSharedJournal = useJournalStore((s) => s.createSharedJournal);
  const joinSharedJournal = useJournalStore((s) => s.joinSharedJournal);

  const [journalName, setJournalName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [generatedCode, setGeneratedCode] = useState(null);

  const handleCreate = async () => {
    const id = await createSharedJournal(journalName);
    setGeneratedCode(id);
  };

  const handleJoin = async () => {
    const ok = await joinSharedJournal(joinCode);
    if (ok) {
      alert("Joined successfully!");
    } else {
      alert("Invalid code.");
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: palette.bg }]}>
      <Text style={[styles.title, { color: palette.text }]}>Shared Journals</Text>

      {/* CREATE */}
      <TextInput
        placeholder="Journal name"
        placeholderTextColor={palette.sub}
        style={[
          styles.input,
          { backgroundColor: palette.card, color: palette.text, borderColor: palette.border },
        ]}
        value={journalName}
        onChangeText={setJournalName}
      />

      <Pressable onPress={handleCreate} style={[styles.button, { backgroundColor: palette.accent }]}>
        <Text style={styles.buttonText}>Create Shared Journal</Text>
      </Pressable>

      {generatedCode && (
        <View style={styles.codeBox}>
          <Text style={{ color: palette.text, fontSize: 14 }}>Share this code:</Text>
          <Text selectable style={{ color: palette.accent, fontWeight: "700", fontSize: 20 }}>
            {generatedCode}
          </Text>
        </View>
      )}

      {/* JOIN */}
      <TextInput
        placeholder="Enter code to join"
        placeholderTextColor={palette.sub}
        style={[
          styles.input,
          { backgroundColor: palette.card, color: palette.text, borderColor: palette.border },
        ]}
        value={joinCode}
        onChangeText={setJoinCode}
      />

      <Pressable onPress={handleJoin} style={[styles.button, { backgroundColor: palette.accentSoft }]}>
        <Text style={[styles.buttonText, { color: palette.accent }]}>Join Journal</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    fontSize: 15,
  },
  button: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 20,
  },
  buttonText: {
    color: "white",
    fontWeight: "600",
    fontSize: 15,
  },
  codeBox: {
    padding: 14,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    alignItems: "center",
  },
});
