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
    <View style={styles.wrapper}>

      <Text style={styles.sectionLabel}>Sunrise & Sunset</Text>

      <View style={styles.row}>

        {/* SUNRISE CARD */}
        <View style={styles.cardContainer}>
          <Text style={styles.cardLabel}>Sunrise</Text>
          <Pressable style={styles.card} onPress={() => setShowSunrisePicker(true)}>
            <Text style={styles.time}>{formatTime(sunriseTime)}</Text>
          </Pressable>
        </View>

        {/* SUNSET CARD */}
        <View style={styles.cardContainer}>
          <Text style={styles.cardLabel}>Sunset</Text>
          <Pressable style={styles.card} onPress={() => setShowSunsetPicker(true)}>
            <Text style={styles.time}>{formatTime(sunsetTime)}</Text>
          </Pressable>
        </View>

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
  wrapper: {
    marginTop: 24,
  },
  sectionLabel: {
    color: "#94A3B8",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 12,
    paddingLeft: 4,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 14,
  },
  cardContainer: {
    flex: 1,
  },
  cardLabel: {
    color: "#94A3B8",
    fontSize: 13,
    marginBottom: 6,
    paddingLeft: 4,
  },
  card: {
    backgroundColor: "#111827",
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#1F2937",
  },
  time: {
    color: "white",
    fontSize: 20,
    fontWeight: "600",
  },
});
