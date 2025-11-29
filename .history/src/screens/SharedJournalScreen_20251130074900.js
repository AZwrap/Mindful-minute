import React from "react";
import { View, Text, ScrollView } from "react-native";
import { useJournalStore } from "../stores/journalStore";
import { useThemePalette } from "../stores/themeStore";

export default function SharedJournalScreen({ route }) {
  const { journalId } = route.params;
  const palette = useThemePalette();

  const journal = useJournalStore((s) => s.sharedJournals[journalId]);
  const entries = journal?.entries || [];

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: palette.bg }}
      contentContainerStyle={{ padding: 16 }}
    >
      <Text style={{ color: palette.text, fontSize: 22, fontWeight: "700" }}>
        {journal?.name}
      </Text>

      <View style={{ marginTop: 16 }}>
        {entries.length === 0 && (
          <Text style={{ color: palette.sub }}>No entries yet.</Text>
        )}

        {entries.map((e) => (
          <View
            key={e.id}
            style={{
              padding: 12,
              backgroundColor: palette.card,
              borderRadius: 12,
              marginBottom: 12,
              borderWidth: 1,
              borderColor: palette.border,
            }}
          >
            <Text style={{ color: palette.text, fontSize: 16, fontWeight: "600" }}>
              {e.author}
            </Text>
            <Text style={{ color: palette.sub, marginTop: 4 }}>
              {e.text.slice(0, 200)}
            </Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}
