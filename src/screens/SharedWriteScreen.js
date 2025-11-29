import React, { useState } from "react";
import { View, TextInput, Text, ScrollView } from "react-native";
import PremiumPressable from "../components/PremiumPressable";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useJournalStore } from "../stores/journalStore";
import { db } from "../firebaseConfig";
import { doc, setDoc } from "firebase/firestore";
import { useThemePalette } from "../stores/themeStore";

export default function SharedWriteScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { journalId } = route.params;
  const uuid = () => (
  Date.now().toString(36) + Math.random().toString(36).substring(2, 10)
);


  const palette = useThemePalette();

  const addSharedEntry = useJournalStore((s) => s.addSharedEntry);

  const [text, setText] = useState("");

  const handleSave = async () => {
const entryId = uuid();

    const entry = {
      id: entryId,
      text,
      date: new Date().toISOString(),
    };

    // 1. Local store update
    addSharedEntry(journalId, entry);

    // 2. Firestore update
    await setDoc(
      doc(db, "journals", journalId, "entries", entryId),
      entry
    );

    navigation.goBack();
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: palette.bg, padding: 16 }}
      contentContainerStyle={{ paddingBottom: 50 }}
    >
      <Text
        style={{
          color: palette.text,
          fontSize: 20,
          fontWeight: "700",
          marginBottom: 20,
        }}
      >
        New Entry
      </Text>

      <TextInput
        value={text}
        onChangeText={setText}
        placeholder="Write your entry..."
        placeholderTextColor={palette.sub}
        multiline
        style={{
          backgroundColor: palette.card,
          color: palette.text,
          borderRadius: 12,
          padding: 16,
          minHeight: 180,
          borderWidth: 1,
          borderColor: palette.border,
        }}
      />

      <PremiumPressable
        onPress={handleSave}
        haptic="light"
        style={{
          marginTop: 20,
          backgroundColor: palette.accent,
          borderRadius: 12,
          paddingVertical: 14,
          alignItems: "center",
        }}
      >
        <Text style={{ color: "white", fontWeight: "600", fontSize: 16 }}>
          Save Entry
        </Text>
      </PremiumPressable>
    </ScrollView>
  );
}
