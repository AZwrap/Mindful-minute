// src/screens/SettingsScreen.js
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Switch,
  useColorScheme,
  Pressable,
  TextInput,
  Animated,
  ScrollView,
  TouchableWithoutFeedback,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import PremiumPressable from "../components/PremiumPressable";
import { useSettings } from "../stores/settingsStore";
import { useEntries } from "../stores/entriesStore";
import { useTheme } from "../stores/themeStore";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system";
import { Easing } from "react-native";

export default function SettingsScreen() {
  const systemScheme = useColorScheme();
  const { theme, setTheme, getCurrentTheme } = useTheme();
  const currentTheme = getCurrentTheme(systemScheme);
  const isDark = currentTheme === "dark";

  const loaded = useSettings((s) => s.loaded);
  const showTimer = useSettings((s) => s.showTimer);
  const setShowTimer = useSettings((s) => s.setShowTimer);

  const durationSec = useSettings((s) => s.durationSec);
  const setDurationSec = useSettings((s) => s.setDurationSec);

  const hapticsEnabled = useSettings((s) => s.hapticsEnabled);
  const setHapticsEnabled = useSettings((s) => s.setHapticsEnabled);

  const soundEnabled = useSettings((s) => s.soundEnabled);
  const setSoundEnabled = useSettings((s) => s.setSoundEnabled);

  const preserveTimerProgress = useSettings((s) => s.preserveTimerProgress);
  const setPreserveTimerProgress = useSettings((s) => s.setPreserveTimerProgress);

  const gratitudeModeEnabled = useSettings((s) => s.gratitudeModeEnabled);
  const setGratitudeModeEnabled = useSettings((s) => s.setGratitudeModeEnabled);

  const dynamicSunrise = useSettings((s) => s.dynamicSunrise);
  const dynamicSunset = useSettings((s) => s.dynamicSunset);
  const setDynamicSunrise = useSettings((s) => s.setDynamicSunrise);
  const setDynamicSunset = useSettings((s) => s.setDynamicSunset);

  const map = useEntries((s) => s.map);

  // Dropdown
  const [dropdownVisible, setDropdownVisible] = useState(false);

  const dropdownAnim = useRef(new Animated.Value(0)).current;

  const openDropdown = () => {
    setDropdownVisible(true);
    Animated.timing(dropdownAnim, {
      toValue: 1,
      duration: 180,
      easing: Easing.out(Easing.ease),
      useNativeDriver: false,
    }).start();
  };

  const closeDropdown = () => {
    Animated.timing(dropdownAnim, {
      toValue: 0,
      duration: 150,
      easing: Easing.in(Easing.ease),
      useNativeDriver: false,
    }).start(() => setDropdownVisible(false));
  };

  const toggleDropdown = () => {
    dropdownVisible ? closeDropdown() : openDropdown();
  };

  // Dynamic theme inputs
  const [sunrise, setSunriseState] = useState(dynamicSunrise || "06:00");
  const [sunset, setSunsetState] = useState(dynamicSunset || "18:00");

  const palette = {
    bg: isDark ? "#0F172A" : "#F8FAFC",
    card: isDark ? "#111827" : "#FFFFFF",
    border: isDark ? "#1F2937" : "#E2E8F0",
    text: isDark ? "#E5E7EB" : "#0F172A",
    sub: isDark ? "#CBD5E1" : "#475569",
    accent: "#6366F1",
    accentSoft: "rgba(99,102,241,0.12)",
  };

  const dropdownHeight = dropdownAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 180],
  });

  const dropdownOpacity = dropdownAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  const themeOptions = [
    { label: "System", value: "system" },
    { label: "Light", value: "light" },
    { label: "Dark", value: "dark" },
    { label: "Dynamic (Time-based)", value: "dynamic" },
  ];

  const SettingRow = ({ label, description, value, onValueChange }) => (
    <View style={styles.row}>
      <View style={{ flex: 1 }}>
        <Text style={[styles.label, { color: palette.text }]}>{label}</Text>
        <Text style={[styles.description, { color: palette.sub }]}>
          {description}
        </Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        thumbColor={"#FFFFFF"}
        trackColor={{ false: "#CBD5E1", true: "#6366F1" }}
      />
    </View>
  );

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[palette.bg, palette.bg]}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>

          {/* -------- APPEARANCE -------- */}
          <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
            <Text style={[styles.title, { color: palette.text }]}>Appearance</Text>

            <SettingRow
              label="Show timer"
              description="Display timer on the write screen"
              value={showTimer}
              onValueChange={setShowTimer}
            />

            {/* Theme selector */}
            <Text style={[styles.label, { color: palette.sub, marginTop: 10 }]}>
              Theme
            </Text>

            <Pressable
              onPress={toggleDropdown}
              style={[
                styles.dropdownHeader,
                {
                  backgroundColor: isDark ? "#1F2937" : "#F1F5F9",
                  borderColor: palette.border,
                },
              ]}
            >
              <Text style={[styles.dropdownHeaderText, { color: palette.text }]}>
                {theme === "dynamic"
                  ? "Dynamic (Sunrise/Sunset)"
                  : theme.charAt(0).toUpperCase() + theme.slice(1)}
              </Text>
            </Pressable>

            {dropdownVisible && (
              <View style={{ position: "relative", marginTop: 6 }}>
                {/* Backdrop */}
                <TouchableWithoutFeedback onPress={closeDropdown}>
                  <View style={styles.backdrop} />
                </TouchableWithoutFeedback>

                {/* Dropdown list */}
                <Animated.View
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    backgroundColor: palette.card,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: palette.border,
                    overflow: "hidden",
                    opacity: dropdownOpacity,
                    height: dropdownHeight,
                    zIndex: 99,
                  }}
                >
                  <ScrollView
                    nestedScrollEnabled
                    showsVerticalScrollIndicator={false}
                  >
                    {themeOptions.map((o) => (
                      <Pressable
                        key={o.value}
                        onPress={() => {
                          setTheme(o.value);
                          closeDropdown();
                        }}
                        style={{
                          paddingVertical: 12,
                          paddingHorizontal: 14,
                          backgroundColor:
                            theme === o.value
                              ? palette.accentSoft
                              : "transparent",
                        }}
                      >
                        <Text
                          style={{
                            color: palette.text,
                            fontWeight: theme === o.value ? "700" : "500",
                          }}
                        >
                          {o.label}
                        </Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                </Animated.View>
              </View>
            )}

            {/* Dynamic theme settings */}
            {theme === "dynamic" && (
              <View style={{ marginTop: 16 }}>
                <Text style={[styles.smallLabel, { color: palette.sub }]}>
                  Sunrise & Sunset Times
                </Text>

                <View style={{ flexDirection: "row", gap: 12, marginTop: 8 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.smallLabel, { color: palette.sub }]}>
                      Sunrise
                    </Text>
                    <TextInput
                      value={sunrise}
                      onChangeText={(t) => {
                        setSunriseState(t);
                        setDynamicSunrise(t);
                      }}
                      style={[
                        styles.timeInput,
                        {
                          backgroundColor: isDark ? "#1F2937" : "#F3F4F6",
                          color: palette.text,
                          borderColor: palette.border,
                        },
                      ]}
                    />
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={[styles.smallLabel, { color: palette.sub }]}>
                      Sunset
                    </Text>
                    <TextInput
                      value={sunset}
                      onChangeText={(t) => {
                        setSunsetState(t);
                        setDynamicSunset(t);
                      }}
                      style={[
                        styles.timeInput,
                        {
                          backgroundColor: isDark ? "#1F2937" : "#F3F4F6",
                          color: palette.text,
                          borderColor: palette.border,
                        },
                      ]}
                    />
                  </View>
                </View>
              </View>
            )}
          </View>

          {/* -------- FEEDBACK -------- */}
          <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
            <Text style={[styles.title, { color: palette.text }]}>Feedback</Text>

            <SettingRow
              label="Haptic Feedback"
              description="Vibration on interactions"
              value={hapticsEnabled}
              onValueChange={setHapticsEnabled}
            />

            <SettingRow
              label="Completion Sound"
              description="Chime when timers finish"
              value={soundEnabled}
              onValueChange={setSoundEnabled}
            />

            <SettingRow
              label="Preserve Timer Progress"
              description="Keep remaining time between screens"
              value={preserveTimerProgress}
              onValueChange={setPreserveTimerProgress}
            />
          </View>

          {/* -------- MODES -------- */}
          <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
            <Text style={[styles.title, { color: palette.text }]}>Modes</Text>

            <SettingRow
              label="Gratitude Mode"
              description="Always use gratitude section"
              value={gratitudeModeEnabled}
              onValueChange={setGratitudeModeEnabled}
            />
          </View>
        </ScrollView>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40, gap: 16 },
  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
  },
  title: { fontSize: 17, fontWeight: "600", marginBottom: 8 },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
  },
  label: { fontSize: 15, fontWeight: "500" },
  description: { fontSize: 13, marginTop: 2 },
  dropdownHeader: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  dropdownHeaderText: { fontSize: 16, fontWeight: "500" },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "transparent",
  },
  smallLabel: { fontSize: 13, fontWeight: "500" },
  timeInput: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    fontSize: 15,
    marginTop: 4,
  },
});
