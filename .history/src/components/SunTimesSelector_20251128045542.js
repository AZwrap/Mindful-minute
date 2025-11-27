// SunTimesSelector.js
import React, { useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import { useSettings } from "../stores/settingsStore";

export default function SunTimesSelector() {
  const {
    sunriseTime,
    sunsetTime,
    setSunriseTime,
    setSunsetTime,
  } = useSettings();

  const [pickerVisible, setPickerVisible] = useState(false);
  const [mode, setMode] = useState("sunrise");

  // Format time or fallback to "Select"
  const formatTime = (date) => {
    if (!date) return "Select";
    const d = new Date(date);
    const h = d.getHours().toString().padStart(2, "0");
    const m = d.getMinutes().toString().padStart(2, "0");
    return `${h}:${m}`;
  };

  return (
    <View style={styles.container}>
      {/* Sunrise Box */}
      <Pressable
        style={styles.box}
        onPress={() => {
          setMode("sunrise");
          setPickerVisible(true);
        }}
      >
        <Text style={styles.label}>Sunrise</Text>
        <Text style={styles.time}>{formatTime(sunriseTime)}</Text>
      </Pressable>

      {/* Sunset Box */}
      <Pressable
        style={styles.box}
        onPress={() => {
          setMode("sunset");
          setPickerVisible(true);
        }}
      >
        <Text style={styles.label}>Sunset</Text>
        <Text style={styles.time}>{formatTime(sunsetTime)}</Text>
      </Pressable>

      <DateTimePickerModal
        isVisible={pickerVisible}
        mode="time"
        onConfirm={(date) => {
          setPickerVisible(false);
          if (mode === "sunrise") setSunriseTime(date);
          else setSunsetTime(date);
        }}
        onCancel={() => setPickerVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    gap: 16,
    marginTop: 12,
  },
  box: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.08)",
    paddingVertical: 14,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  label: {
    color: "#AAA",
    fontSize: 14,
    marginBottom: 4,
  },
  time: {
    color: "#FFF",
    fontSize: 18,
    fontWeight: "600",
  },
});
