// src/components/SunTimesSelector.js
import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import { useSettings } from "../stores/settingsStore";

export default function SunTimesSelector() {
  const sunriseTime = useSettings((s) => s.sunriseTime);
  const sunsetTime = useSettings((s) => s.sunsetTime);
  const setSunriseTime = useSettings((s) => s.setSunriseTime);
  const setSunsetTime = useSettings((s) => s.setSunsetTime);
  const isDark = useColorScheme() === "dark";


  const [pickerVisible, setPickerVisible] = React.useState(false);
  const [activePicker, setActivePicker] = React.useState(null); // "sunrise" or "sunset"

  const openPicker = (mode) => {
    setActivePicker(mode);
    setPickerVisible(true);
  };

  const handleConfirm = (date) => {
    if (activePicker === "sunrise") {
      setSunriseTime(date);
    } else {
      setSunsetTime(date);
    }

    setPickerVisible(false);
    setActivePicker(null);
  };

  const formatTime = (d) => {
    if (!d) return "Select";
    return new Date(d).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <View style={styles.row}>
      // Sunrise box
<Pressable onPress={() => openPicker("sunrise")} style={styles.box}>
  <Text style={[styles.label, { color: isDark ? "#CBD5E1" : "#334155" }]}>
    Sunrise
  </Text>

  <Text
    style={{
      fontSize: 20,
      fontWeight: "600",
      marginTop: 2,
      color: isDark ? "#E5E7EB" : "#0F172A",
    }}
  >
    {formatTime(sunriseTime)}
  </Text>
</Pressable>

{/* Sunset box */}
<Pressable onPress={() => openPicker("sunset")} style={styles.box}>
  <Text style={[styles.label, { color: isDark ? "#CBD5E1" : "#334155" }]}>
    Sunset
  </Text>

  <Text
    style={{
      fontSize: 20,
      fontWeight: "600",
      marginTop: 2,
      color: isDark ? "#E5E7EB" : "#0F172A",
    }}
  >
    {formatTime(sunsetTime)}
  </Text>
</Pressable>


      <DateTimePickerModal
        isVisible={pickerVisible}
        mode="time"
        onConfirm={handleConfirm}
        onCancel={() => setPickerVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
    marginTop: 8,
  },
  box: {
    flex: 1,
    padding: 14,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
  },
  label: {
    fontSize: 12,
    opacity: 0.7,
  },
  time: {
    fontSize: 20,
    fontWeight: "600",
    marginTop: 2,
  },
});
