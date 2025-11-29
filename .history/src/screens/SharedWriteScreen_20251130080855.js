import React, { useState } from "react";
import { View, Text, TextInput, KeyboardAvoidingView, Platform } from "react-native";
import PremiumPressable from "../components/PremiumPressable";
import { useJournalStore } from "../stores/journalStore";
import { useTheme } from "../stores/themeStore";

export default function SharedWriteScreen({ route, navigation }) {
  const { journalId } = route.params;
  const [text, setText] = useState("");

  const addSharedEntry = useJournalStore((s) => s.addSharedEntry);

  const { palette } = useTheme();

  const handleSave = () => {
    if (!text.trim()) return;

    addSharedEntry(journalId, text.trim());
    navigation.goBack();
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: palette.bg, padding: 16 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Text style={{ color: palette.text, fontSize: 20, fontWeight: "600", marginBottom: 12 }}>
        New Entry
      </Text>

      <TextInput
        value={text}
        onChangeText={setText}
        placeholder="Write your entry..."
        placeholderTextColor={palette.sub}
        multiline
        style={{
          flex: 1,
          color: palette.text,
          backgroundColor: palette.card,
          borderColor: palette.border,
          borderWidth: 1,
          padding: 16,
          borderRadius: 12,
          textAlignVertical: "top",
        }}
      />

      <PremiumPressable
        haptic="light"
        style={{
          marginTop: 16,
          paddingVertical: 14,
          backgroundColor: palette.accent,
          borderRadius: 12,
        }}
        onPress={handleSave}
      >
        <Text style={{ color: "white", fontWeight: "600", textAlign: "center" }}>
          Save Entry
        </Text>
      </PremiumPressable>
    </KeyboardAvoidingView>
  );
}
