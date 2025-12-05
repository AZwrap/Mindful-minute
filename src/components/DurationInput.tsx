import React from 'react';
import { View, Text, StyleSheet, Pressable, ViewStyle } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSharedPalette } from '../hooks/useSharedPalette';

interface DurationInputProps {
  value: number;
  onChange: (val: number) => void;
  min?: number;
  max?: number;
  step?: number;
}

export default function DurationInput({ 
  value, 
  onChange, 
  min = 1, 
  max = 60, 
  step = 1 
}: DurationInputProps) {
  const palette = useSharedPalette();

  const handleIncrement = () => {
    if (value + step <= max) onChange(value + step);
  };

  const handleDecrement = () => {
    if (value - step >= min) onChange(value - step);
  };

  return (
    <View style={[styles.container, { backgroundColor: palette.card, borderColor: palette.border }]}>
      <Pressable 
        onPress={handleDecrement}
        style={({ pressed }) => [
          styles.button, 
          { opacity: pressed || value <= min ? 0.5 : 1 }
        ]}
        disabled={value <= min}
      >
        <Feather name="minus" size={20} color={palette.text} />
      </Pressable>

      <Text style={[styles.value, { color: palette.text }]}>
        {value} min
      </Text>

      <Pressable 
        onPress={handleIncrement}
        style={({ pressed }) => [
          styles.button, 
          { opacity: pressed || value >= max ? 0.5 : 1 }
        ]}
        disabled={value >= max}
      >
        <Feather name="plus" size={20} color={palette.text} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 12,
    padding: 4,
    width: 140,
  },
  button: {
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});