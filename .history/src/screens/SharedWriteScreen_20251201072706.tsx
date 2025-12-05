import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useSharedPalette } from "../hooks/useSharedPalette";

import { useJournalStore } from "../stores/journalStore";
import { db } from "../firebaseConfig";
import { doc, setDoc } from "firebase/firestore";

// SIMPLE ID generator (no Crypto, no errors)
const genId = () => "id-" + Math.random().toString(36).slice(2, 10);

export default function SharedWriteScreen() {
  const navigation = useNavigation();
const palette = useSharedPalette();


const { currentJournalId, addSharedEntryLocal } = useJournalStore((s) => ({
  currentJournalId: s.currentJournalId,
  addSharedEntryLocal: s.addSharedEntry,
}));


  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);

  if (!currentJournalId) {
    return (
      <View style={[styles.center, { backgroundColor: palette.bg }]}>
        <Text style={{ color: palette.text }}>
          You are not inside a shared journal.
        </Text>
      </View>
    );
  }

  // -----------------------------
  // SAVE ENTRY
  // -----------------------------
  const saveEntry = async () => {
    if (!text.trim()) return;

    setSaving(true);

    const id = genId();

    const entry = {
      id,
      text,
      createdAt: Date.now(),
      author: "You",
    };

    try {
      // Save to Firestore
      await setDoc(
        doc(db, "sharedJournals", currentJournalId, "entries", id),
        entry
      );

      // Save locally
      addSharedEntryLocal(entry);

      setSaving(false);

      navigation.goBack();
    } catch (e) {
      console.log("Error saving shared entry:", e);
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={[styles.container, { backgroundColor: palette.bg }]}
    >
      <Text style={[styles.title, { color: palette.text }]}>
        New Shared Entry
      </Text>

      <TextInput
        style={[
          styles.input,
          {
            backgroundColor: palette.card,
            borderColor: palette.border,
            color: palette.text,
          },
        ]}
        placeholder="Write something to share..."
        placeholderTextColor={palette.sub}
        multiline
        value={text}
        onChangeText={setText}
      />

      <Pressable
        disabled={saving || !text.trim()}
        onPress={saveEntry}
        style={[
          styles.button,
          {
            backgroundColor: !text.trim()
              ? palette.border
              : palette.accent,
            opacity: saving ? 0.6 : 1,
          },
        ]}
      >
        <Text style={styles.buttonText}>
          {saving ? "Saving..." : "Save Entry"}
        </Text>
      </Pressable>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 16,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    textAlignVertical: "top",
  },
  button: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 16,
  },
  buttonText: {
    color: "white",
    fontWeight: "600",
    fontSize: 15,
  },
});
