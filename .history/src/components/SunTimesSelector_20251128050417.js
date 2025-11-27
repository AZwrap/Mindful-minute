import React, { useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import { useSettings } from "../stores/settingsStore";

export default function SunTimesSelector() {
  const { sunriseTime, sunsetTime, setSunriseTime, setSunsetTime } = useSettings();
  const [pickerMode, setPickerMode] = useState(null);

  const openPicker = (mode) => {
    setPickerMode(mode);
  };

  const handleConfirm = (date) => {
    if (pickerMode === "sunrise") setSunriseTime(date);
    if (pickerMode === "sunset") setSunsetTime(date);
    setPickerMode(null);
  };

  return (
    <View style={styles.container}>

      {/* Title */}
      <Text style={styles.label}>Dynamic theme times</Text>

      <View style={styles.row}>
        {/* Sunrise */}
        <Pressable style={styles.box} onPress={() => openPicker("sunrise")}>
          <Text style={styles.title}>Sunrise</Text>
          <Text style={styles.time}>
            {sunriseTime ? sunriseTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Select"}
          </Text>
        </Pressable>

        {/* Sunset */}
        <Pressable style={styles.box} onPress={() => openPicker("sunset")}>
          <Text style={styles.title}>Sunset</Text>
          <Text style={styles.time}>
            {sunsetTime ? sunsetTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Select"}
          </Text>
        </Pressable>
      </View>

      <DateTimePickerModal
        isVisible={pickerMode !== null}
        mode="time"
        onConfirm={handleConfirm}
        onCancel={() => setPickerMode(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 20,
    width: "100%",
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 10,
    opacity: 0.8,
  },
  row: {
    flexDirection: "row",
    gap: 12,
  },
  box: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 12,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 12,
  },
  title: {
    fontSize: 14,
    opacity: 0.7,
    marginBottom: 6,
  },
  time: {
    fontSize: 18,
    fontWeight: "600",
  },
});
