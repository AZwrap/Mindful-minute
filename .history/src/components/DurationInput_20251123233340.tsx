// src/components/DurationInput.js
import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import PremiumPressable from './PremiumPressable';

const MIN_DURATION = 5;
const MAX_DURATION = 600;

export default function DurationInput({
  label,
  value,
  onValueChange,
  presets,
  palette,
  onToast,
}) {
  const [customText, setCustomText] = useState(String(value ?? 60));

  useEffect(() => {
    setCustomText(String(value));
  }, [value]);

  const { invalid, message, parsed } = useMemo(() => {
    if (customText.trim().length === 0) {
      return { invalid: true, message: `Enter a value between ${MIN_DURATION}–${MAX_DURATION} seconds`, parsed: NaN };
    }
    const n = Number(customText);
    if (!Number.isFinite(n)) {
      return { invalid: true, message: 'Please enter a number', parsed: NaN };
    }
    if (n < MIN_DURATION || n > MAX_DURATION) {
      return { invalid: true, message: `Must be between ${MIN_DURATION}–${MAX_DURATION} seconds`, parsed: n };
    }
    return { invalid: false, message: '', parsed: Math.round(n) };
  }, [customText]);

  const handleApply = () => {
    if (!invalid) {
      onValueChange(parsed);
      onToast(`${label} updated`);
    }
  };

  return (
    <View>
      <Text style={[styles.label, { color: palette.sub, marginBottom: 8 }]}>
        {label}
      </Text>

      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
        {presets.map((s) => {
          const active = value === s;
          return (
            <PremiumPressable
              key={s}
              onPress={() => onValueChange(s)}
              haptic="light"
              style={[
                styles.chip,
                {
                  borderColor: palette.border,
                  backgroundColor: active ? palette.accentSoft : 'transparent',
                },
              ]}
            >
              <Text style={{ color: active ? palette.accent : palette.sub, fontSize: 12 }}>
                {s < 60 ? `${s}s` : `${s / 60}min`}
              </Text>
            </PremiumPressable>
          );
        })}
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <TextInput
          keyboardType="numeric"
          placeholder={`Custom (${MIN_DURATION}-${MAX_DURATION}s)`}
          placeholderTextColor={palette.sub}
          value={customText}
          onChangeText={setCustomText}
          onSubmitEditing={handleApply}
          style={[
            styles.input,
            { color: palette.text, borderColor: palette.border, backgroundColor: palette.card },
          ]}
        />
        <PremiumPressable
          onPress={handleApply}
          disabled={invalid}
          haptic="light"
          style={[
            styles.applyBtn,
            { backgroundColor: invalid ? '#CBD5E1' : palette.accent },
          ]}
        >
          <Text style={{ color: invalid ? '#475569' : 'white', fontWeight: '600', fontSize: 12 }}>
            Apply
          </Text>
        </PremiumPressable>
      </View>

      {invalid ? (
        <Text style={{ color: palette.warn, marginBottom: 16, fontSize: 12 }}>
          {message}
        </Text>
      ) : (
        <Text style={{ color: palette.sub, marginBottom: 16, fontSize: 12 }}>
          Will set to {parsed < 60 ? `${parsed}s` : `${Math.round(parsed / 60)}min`}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 15, fontWeight: '500', marginBottom: 2 },
  chip: { borderWidth: 1, borderRadius: 999, paddingVertical: 6, paddingHorizontal: 12 },
  input: { flexGrow: 1, minWidth: 110, borderWidth: 1, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 10 },
  applyBtn: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10 },
});