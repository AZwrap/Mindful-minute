import React from "react";
import { View, Text, ScrollView } from "react-native";
import { useNavigation } from "@react-navigation/native";
import PremiumPressable from "../components/PremiumPressable";
import { useJournalStore } from "../stores/journalStore";
import { useThemePalette } from "../stores/themeStore";

export default function SharedJournalScreen({ route }) {
  const navigation = useNavigation();
  const { journalId } = route.params;
  const palette = useThemePalette();

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
      <PremiumPressable
  onPress={() => navigation.navigate("SharedWrite", { journalId })}
  haptic="light"
  style={{
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: palette.accent,
    borderRadius: 12,
    marginBottom: 16,
  }}
>
  <Text style={{ color: "white", fontWeight: "600", textAlign: "center" }}>
    Add Entry
  </Text>
</PremiumPressable>

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
