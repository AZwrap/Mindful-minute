import React, { useState } from "react";
import { View, TextInput, Text, ScrollView } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import PremiumPressable from "../components/PremiumPressable";
import { useJournalStore } from "../stores/journalStore";
import { db } from "../firebaseConfig";
import { doc, updateDoc, deleteDoc } from "firebase/firestore";
import { useThemePalette } from "../stores/themeStore";

export default function SharedEntryDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { journalId, entryId } = route.params;

  const palette = useThemePalette();

  const journal = useJournalStore((s) =>
    s.journals.find((j) => j.journalId === journalId)
  );

  const entry = journal?.entries?.find((e) => e.id === entryId);

  const updateSharedEntry = useJournalStore((s) => s.updateSharedEntry);
  const deleteSharedEntry = useJournalStore((s) => s.deleteSharedEntry);

  const [text, setText] = useState(entry?.text || "");

  const handleSave = async () => {
    updateSharedEntry(journalId, entryId, { text });

    await updateDoc(doc(db, "journals", journalId, "entries", entryId), {
      text,
    });

    navigation.goBack();
  };

  const handleDelete = async () => {
    deleteSharedEntry(journalId, entryId);

    await deleteDoc(doc(db, "journals", journalId, "entries", entryId));

    navigation.goBack();
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: palette.bg, padding: 16 }}>

      <TextInput
        value={text}
        onChangeText={setText}
        multiline
        style={{
          padding: 16,
          backgroundColor: palette.card,
          color: palette.text,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: palette.border,
          minHeight: 200,
          marginBottom: 20,
        }}
      />

      <PremiumPressable
        onPress={handleSave}
        haptic="light"
        style={{
          backgroundColor: palette.accent,
          paddingVertical: 14,
          borderRadius: 12,
          alignItems: "center",
          marginBottom: 12,
        }}
      >
        <Text style={{ color: "white", fontWeight: "600" }}>Save Changes</Text>
      </PremiumPressable>

      <PremiumPressable
        onPress={handleDelete}
        haptic="heavy"
        style={{
          backgroundColor: "#EF4444",
          paddingVertical: 14,
          borderRadius: 12,
          alignItems: "center",
        }}
      >
        <Text style={{ color: "white", fontWeight: "600" }}>Delete Entry</Text>
      </PremiumPressable>
    </ScrollView>
  );
}
