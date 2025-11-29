import React from "react";
import { View, Text, ScrollView } from "react-native";
import { useJournalStore } from "../stores/journalStore";
import { useThemePalette } from "../stores/themeStore";

export default function SharedJournalScreen({ route }) {
  const { journalId } = route.params;
  const palette = useThemePalette();

  // 🔥 FIX: use correct selector for array-based journals[]
  const journal = useJournalStore(
    React.useCallback(
      (s) => s.journals.find((j) => j.journalId === journalId),
      [journalId]
    )
  );

  const entries = journal?.entries || [];

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: palette.bg }}
      contentContainerStyle={{ padding: 16 }}
    >
      <Text style={{ color: palette.text, fontSize: 22, fontWeight: "700" }}>
        {journal?.name ?? "Shared Journal"}
      </Text>

      <View style={{ marginTop: 20 }}>
        {entries.length === 0 ? (
          <Text style={{ color: palette.sub }}>No entries yet.</Text>
        ) : (
          entries.map((e) => (
            <View
              key={e.id}
              style={{
                backgroundColor: palette.card,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: palette.border,
                padding: 12,
                marginBottom: 12,
              }}
            >
              <Text
                style={{
                  color: palette.text,
                  fontSize: 16,
                  fontWeight: "600",
                }}
              >
                {e.author}
              </Text>

              <Text
                style={{
                  color: palette.sub,
                  marginTop: 6,
                  fontSize: 14,
                }}
              >
                {e.text}
              </Text>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}
