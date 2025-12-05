import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, Pressable } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Feather } from '@expo/vector-icons';
import { useSharedPalette } from '../hooks/useSharedPalette';

interface SunTimesSelectorProps {
  sunrise: string;
  sunset: string;
  onUpdate: (type: 'sunrise' | 'sunset', time: string) => void;
}

export default function SunTimesSelector({ sunrise, sunset, onUpdate }: SunTimesSelectorProps) {
  const palette = useSharedPalette();
  const [showPicker, setShowPicker] = useState(false);
  const [activeType, setActiveType] = useState<'sunrise' | 'sunset' | null>(null);

  // Helper: "06:00" -> Date object
  const toDate = (timeStr: string) => {
    const [hh, mm] = timeStr.split(':').map(Number);
    const d = new Date();
    d.setHours(hh || 0, mm || 0, 0, 0);
    return d;
  };

  const handlePress = (type: 'sunrise' | 'sunset') => {
    setActiveType(type);
    setShowPicker(true);
  };

  const handleChange = (event: any, selectedDate?: Date) => {
    setShowPicker(false);
    if (selectedDate && activeType) {
      const hh = selectedDate.getHours().toString().padStart(2, '0');
      const mm = selectedDate.getMinutes().toString().padStart(2, '0');
      onUpdate(activeType, `${hh}:${mm}`);
    }
    setActiveType(null);
  };

  const TimeCard = ({ type, time, icon }: { type: 'sunrise' | 'sunset'; time: string; icon: string }) => (
    <Pressable 
      onPress={() => handlePress(type)}
      style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}
    >
      <View style={styles.row}>
        <Feather name={icon as any} size={18} color={palette.subtleText} />
        <Text style={[styles.label, { color: palette.subtleText }]}>
          {type === 'sunrise' ? 'Sunrise' : 'Sunset'}
        </Text>
      </View>
      <Text style={[styles.time, { color: palette.text }]}>{time}</Text>
    </Pressable>
  );

  return (
    <View style={styles.container}>
      <TimeCard type="sunrise" time={sunrise} icon="sun" />
      <TimeCard type="sunset" time={sunset} icon="moon" />

      {showPicker && (
        <DateTimePicker
          value={toDate(activeType === 'sunrise' ? sunrise : sunset)}
          mode="time"
          display="spinner"
          onChange={handleChange}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 12,
    marginVertical: 8,
  },
  card: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  time: {
    fontSize: 16,
    fontWeight: '700',
  },
});