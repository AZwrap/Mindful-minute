import React, { useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useSettings } from "../stores/settingsStore";

export default function SunTimesSelector() {
  const { sunriseTime, sunsetTime, setSunriseTime, setSunsetTime } = useSettings();
  const [showSunrisePicker, setShowSunrisePicker] = useState(false);
  const [showSunsetPicker, setShowSunsetPicker] = useState(false);

  const formatTime = (date) => {
    if (!date) return "--:--";
    const h = date.getHours().toString().padStart(2, "0");
    const m = date.getMinutes().toString().padStart(2, "0");
    return `${h}:${m}`;
  };

  return (
    <View style={styles.container}>

      {/* SUNRISE LABEL */}
      <Text style={styles.label}>Sunrise</Text>

      {/* BOXES ROW */}
      <View style={styles.row}>
        
        {/* SUNRISE BOX */}
        <Pressable style={styles.box} onPress={() => setShowSunrisePicker(true)}>
          <Text style={styles.boxText}>{formatTime(sunriseTime)}</Text>
        </Pressable>

        {/* SUNSET BOX */}
        <Pressable style={styles.box} onPress={() => setShowSunsetPicker(true)}>
          <Text style={styles.boxText}>{formatTime(sunsetTime)}</Text>
        </Pressable>

      </View>

      {showSunrisePicker && (
        <DateTimePicker
          mode="time"
          value={sunriseTime || new Date()}
          is24Hour={true}
          onChange={(event, selected) => {
            setShowSunrisePicker(false);
            if (event.type !== "dismissed" && selected) {
              setSunriseTime(selected);
            }
          }}
        />
      )}

      {showSunsetPicker && (
        <DateTimePicker
          mode="time"
          value={sunsetTime || new Date()}
          is24Hour={true}
          onChange={(event, selected) => {
            setShowSunsetPicker(false);
            if (event.type !== "dismissed" && selected) {
              setSunsetTime(selected);
            }
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 20,
  },
  label: {
    color: "#94A3B8",
    marginBottom: 8,
    fontSize: 14,
    fontWeight: "500",
  },
  row: {
    flexDirection: "row",
    gap: 12,
  },
  box: {
    flex: 1,
    backgroundColor: "#111827",
    borderRadius: 14,
    paddingVertical: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  boxText: {
    color: "white",
    fontSize: 18,
    fontWeight: "600",
  },
});
