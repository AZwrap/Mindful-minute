import React, { useState, useRef } from 'react';
import { View, Text, TextInput, StyleSheet, Pressable } from 'react-native';
import { useSharedPalette } from '../hooks/useSharedPalette';

interface GratitudeSectionProps {
  entries: string[];
  onEntriesChange: (entries: string[]) => void;
  onExpand?: (yPosition: number) => void;
  isVisible: boolean;
}

export default function GratitudeSection({ entries, onEntriesChange, onExpand, isVisible }: GratitudeSectionProps) {
  const palette = useSharedPalette();
  const [isExpanded, setIsExpanded] = useState(false);

  if (!isVisible) return null;

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: palette.card, borderColor: palette.border },
      ]}
      onLayout={(e) => {
        if (onExpand) onExpand(e.nativeEvent.layout.y);
      }}
    >
      <Pressable
        onPress={() => setIsExpanded((prev) => !prev)}
        style={styles.header}
      >
        <Text style={[styles.title, { color: palette.accent }]}>
          Gratitude Practice {isExpanded ? '▲' : '▼'}
        </Text>
        <Text style={[styles.subtitle, { color: palette.subtleText }]}>+10 XP bonus available</Text>
      </Pressable>

      {isExpanded && (
        <>
          <Text style={[styles.description, { color: palette.subtleText }]}>List 3 specific things you're grateful for today:</Text>
          {[0, 1, 2].map((index) => (
            <View key={index} style={styles.inputRow}>
              <Text style={[styles.number, { color: palette.accent }]}>{index + 1}.</Text>
              <TextInput
                style={[styles.input, { color: palette.text, backgroundColor: palette.bg, borderColor: palette.border }]}
                placeholder={`Gratitude #${index + 1}...`}
                placeholderTextColor={palette.subtleText}
                value={entries[index] || ''}
                onChangeText={(txt) => {
                  const next = [...entries];
                  next[index] = txt;
                  onEntriesChange(next);
                }}
              />
            </View>
          ))}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { borderWidth: 1, borderRadius: 16, padding: 12, marginBottom: 12, marginTop: 8 },
  header: { padding: 4 },
  title: { fontSize: 15, fontWeight: '700', textAlign: 'center' },
  subtitle: { fontSize: 12, textAlign: 'center', marginTop: 2, opacity: 0.8 },
  description: { fontSize: 14, marginBottom: 12, textAlign: 'center', lineHeight: 20, marginTop: 8 },
  inputRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  number: { fontSize: 14, fontWeight: '600', width: 24, marginRight: 8 },
  input: { flex: 1, borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, fontSize: 14 },
});