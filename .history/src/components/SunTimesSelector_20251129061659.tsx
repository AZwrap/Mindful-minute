// src/components/SunTimesSelector.js
import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import { useTheme } from "../stores/themeStore";

export default function SunTimesSelector() {
const sunriseTime = useTheme((s) => s.sunriseTime);
const sunsetTime = useTheme((s) => s.sunsetTime);
const setSunriseTime = useTheme((s) => s.setDynamicSunrise);
const setSunsetTime = useTheme((s) => s.setDynamicSunset);

const systemScheme = useColorScheme();
const { getCurrentTheme } = useTheme();
const isDark = getCurrentTheme(systemScheme) === "dark";


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

const formatTime = (value) => {
  if (!value) return "Select";

  // If value is already a simple "HH:MM" string → return as-is
  if (typeof value === "string" && /^\d{2}:\d{2}$/.test(value)) {
    return value;
  }

  // If it's a Date object → convert to HH:MM
  const d = new Date(value);
  if (isNaN(d.getTime())) return "Select";

  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
};


  return (
    <View style={styles.row}>
      // Sunrise box
<Pressable
  onPress={() => openPicker("sunrise")}
  style={[
    styles.box,
    { backgroundColor: isDark ? "#1F2937" : "#FFFFFF" }
  ]}
>


<Text
  style={{
    fontSize: 20,
    fontWeight: "600",
    marginTop: 2,
    color: isDark ? "#F8FAFC" : "#0F172A",  // NOW WORKS
  }}
>
  {formatTime(sunriseTime)}
</Text>

</Pressable>

{/* Sunset box */}
<Pressable
  onPress={() => openPicker("sunset")}
  style={[
    styles.box,
    {
      backgroundColor: isDark ? "#1F2937" : "#FFFFFF",
      opacity: 1,            // prevent inherited dimming
      overflow: "visible",   // prevent parent style overriding text
    }
  ]}
>
  <Text
    style={{
      fontSize: 20,
      fontWeight: "600",
      marginTop: 2,
      color: isDark ? "#F8FAFC" : "#0F172A",  // PURE BLACK IN LIGHT MODE
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
