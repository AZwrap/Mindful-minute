// src/components/SunTimesSelector.js
import React, { useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { useSettings } from "../stores/settingsStore";
import DateTimePickerModal from "react-native-modal-datetime-picker";

export default function SunTimesSelector() {
  const settings = useSettings();
  const [pickerVisible, setPickerVisible] = useState(false);
  const [activePicker, setActivePicker] = useState(null); // "sunrise" or "sunset"

  const openPicker = (mode) => {
    setActivePicker(mode);
    setPickerVisible(true);
  };

  const closePicker = () => {
    setPickerVisible(false);
    setActivePicker(null);
  };

  const handleConfirm = (date) => {
    if (activePicker === "sunrise") {
      settings.setDynamicSunrise(date);
    } else if (activePicker === "sunset") {
      settings.setDynamicSunset(date);
    }
    closePicker();
  };

  const formatTime = (date) => {
    if (!date) return "Select";
    return new Date(date).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <View style={styles.row}>
      {/* Sunrise */}
      <Pressable style={styles.box} onPress={() => openPicker("sunrise")}>
        <Text style={styles.label}>Sunrise</Text>
        <Text style={styles.value}>
          {formatTime(settings.dynamicSunrise)}
        </Text>
      </Pressable>

      {/* Sunset */}
      <Pressable style={styles.box} onPress={() => openPicker("sunset")}>
        <Text style={styles.label}>Sunset</Text>
        <Text style={styles.value}>
          {formatTime(settings.dynamicSunset)}
        </Text>
      </Pressable>

      <DateTimePickerModal
        isVisible={pickerVisible}
        mode="time"
        onConfirm={handleConfirm}
        onCancel={closePicker}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  box: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(99,102,241,0.25)",
    backgroundColor: "rgba(99,102,241,0.06)",
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 4,
    color: "#4F46E5",
    textAlign: "center",
  },
  value: {
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
    color: "#221f3b",
  },
});
