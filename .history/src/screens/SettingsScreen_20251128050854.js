import React, { useEffect, useMemo, useRef, useState } from 'react';
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
  Alert,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useSettings } from "../stores/settingsStore";
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { useEntries } from '../stores/entriesStore';
import { useTheme } from "../stores/themeStore";
import { LinearGradient } from 'expo-linear-gradient';
import PremiumPressable from '../components/PremiumPressable';
import {  Easing } from "react-native";
import { TouchableWithoutFeedback } from "react-native";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import SunTimesSelector from "../components/SunTimesSelector";





const PRESETS = [30, 60, 120];
const MIN = 5;
const MAX = 600;

export default function SettingsScreen({ navigation }) {
  const systemScheme = useColorScheme();
  const { getCurrentTheme } = useTheme();
  const currentTheme = getCurrentTheme(systemScheme);
  const isDark = currentTheme === 'dark';
  
  const loaded = useSettings((s) => s.loaded);
  const showTimer = useSettings((s) => s.showTimer);
  const durationSec = useSettings((s) => s.durationSec);
  const hapticsEnabled = useSettings((s) => s.hapticsEnabled);
  const soundEnabled = useSettings((s) => s.soundEnabled);
  const preserveTimerProgress = useSettings((s) => s.preserveTimerProgress);
  const writeDuration = useSettings((s) => s.writeDuration);
  const breakDuration = useSettings((s) => s.breakDuration);
  const longBreakDuration = useSettings((s) => s.longBreakDuration);
  const totalCycles = useSettings((s) => s.totalCycles);
  const setWriteDuration = useSettings((s) => s.setWriteDuration);
  const setBreakDuration = useSettings((s) => s.setBreakDuration);
  const setLongBreakDuration = useSettings((s) => s.setLongBreakDuration);
  const setTotalCycles = useSettings((s) => s.setTotalCycles);
  const setShowTimer = useSettings((s) => s.setShowTimer);
  const setDurationSec = useSettings((s) => s.setDurationSec);
  const setHapticsEnabled = useSettings((s) => s.setHapticsEnabled);
  const setSoundEnabled = useSettings((s) => s.setSoundEnabled);
  const setPreserveTimerProgress = useSettings((s) => s.setPreserveTimerProgress);
  const init = useSettings((s) => s.init);
  const map = useEntries((s) => s.map);
  const gratitudeModeEnabled = useSettings((s) => s.gratitudeModeEnabled);
  const setGratitudeModeEnabled = useSettings((s) => s.setGratitudeModeEnabled);
  const [showThemeDropdown, setShowThemeDropdown] = useState(false);
const animHeight = useRef(new Animated.Value(0)).current;
const animOpacity = useRef(new Animated.Value(0)).current;
const [dropdownOpen, setDropdownOpen] = useState(false);
const {
  theme,
  setTheme,
  dynamicSunrise,
  dynamicSunset,
  setDynamicSunrise,
  setDynamicSunset,
} = useTheme();
const [pickerVisible, setPickerVisible] = useState(false);
const [activePicker, setActivePicker] = useState(null); // "sunrise" or "sunset"
const settings = useSettings();




const dropdownAnim = useRef(new Animated.Value(0)).current;

useEffect(() => {
  Animated.timing(dropdownAnim, {
    toValue: dropdownOpen ? 1 : 0,
    duration: 150,
    useNativeDriver: true,
  }).start();
}, [dropdownOpen]);




// For dynamic theme time config
const [sunrise, setSunrise] = useState(dynamicSunrise || "06:00");
const [sunset, setSunset] = useState(dynamicSunset || "18:00");

const openDropdown = () => {
  setShowThemeDropdown(true);
  Animated.parallel([
    Animated.timing(animHeight, {
      toValue: 140, // enough for 4 items
      duration: 180,
      easing: Easing.out(Easing.ease),
      useNativeDriver: false,
    }),
    Animated.timing(animOpacity, {
      toValue: 1,
      duration: 150,
      useNativeDriver: false,
    }),
  ]).start();
};

const closeDropdown = () => {
  Animated.parallel([
    Animated.timing(animHeight, {
      toValue: 0,
      duration: 150,
      easing: Easing.in(Easing.ease),
      useNativeDriver: false,
    }),
    Animated.timing(animOpacity, {
      toValue: 0,
      duration: 120,
      useNativeDriver: false,
    }),
  ]).start(() => {
    setShowThemeDropdown(false);
  });
};

const toggleDropdown = () => {
  showThemeDropdown ? closeDropdown() : openDropdown();
};




  const gradients = {
    dark: {
      primary: ['#0F172A', '#1E293B', '#334155'],
      card: ['rgba(30, 41, 59, 0.4)', 'rgba(15, 23, 42, 0.6)'],
    },
    light: {
      primary: ['#F8FAFC', '#F1F5F9', '#E2E8F0'],
      card: ['rgba(241, 245, 249, 0.6)', 'rgba(248, 250, 252, 0.8)'],
    },
  };

  const currentGradient = gradients[currentTheme] || gradients.light;
  const [customWriteText, setCustomWriteText] = useState(String(writeDuration ?? 60));
  const [customBreakText, setCustomBreakText] = useState(String(breakDuration ?? 30));
  const contentFadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (loaded) {
      Animated.timing(contentFadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();
    }
  }, [loaded]);

  useEffect(() => {
    console.log('Current Pomodoro settings:', {
      writeDuration,
      breakDuration,
      longBreakDuration, 
      totalCycles
    });
  }, [writeDuration, breakDuration, longBreakDuration, totalCycles]);

  useEffect(() => { setCustomWriteText(String(writeDuration)); }, [writeDuration]);
  useEffect(() => { setCustomBreakText(String(breakDuration)); }, [breakDuration]);

  // Validation for writing duration
  const { invalid: writeInvalid, message: writeMessage, parsed: writeParsed } = useMemo(() => {
    if (customWriteText.trim().length === 0) {
      return { invalid: true, message: `Enter a value between 5–600 seconds`, parsed: NaN };
    }
    const n = Number(customWriteText);
    if (!Number.isFinite(n)) {
      return { invalid: true, message: 'Please enter a number', parsed: NaN };
    }
    if (n < 5 || n > 600) {
      return { invalid: true, message: `Must be between 5–600 seconds`, parsed: n };
    }
    return { invalid: false, message: '', parsed: Math.round(n) };
  }, [customWriteText]);

  // Validation for break duration  
  const { invalid: breakInvalid, message: breakMessage, parsed: breakParsed } = useMemo(() => {
    if (customBreakText.trim().length === 0) {
      return { invalid: true, message: `Enter a value between 5–600 seconds`, parsed: NaN };
    }
    const n = Number(customBreakText);
    if (!Number.isFinite(n)) {
      return { invalid: true, message: 'Please enter a number', parsed: NaN };
    }
    if (n < 5 || n > 600) {
      return { invalid: true, message: `Must be between 5–600 seconds`, parsed: n };
    }
    return { invalid: false, message: '', parsed: Math.round(n) };
  }, [customBreakText]);

  const entries = useMemo(() => {
    return Object.entries(map || {})
      .sort((a, b) => (a[0] < b[0] ? 1 : -1))
      .map(([date, entry]) => ({ date, ...entry }));
  }, [map]);

  const textMain = isDark ? '#E5E7EB' : '#0F172A';
  const textSub = isDark ? '#CBD5E1' : '#334155';

  const getPalette = () => {
    const currentScheme = currentTheme || 'light';
    return {
      bg: currentScheme === 'dark' ? '#0F172A' : '#F8FAFC',
      card: currentScheme === 'dark' ? '#111827' : '#FFFFFF',
      border: currentScheme === 'dark' ? '#1F2937' : '#E2E8F0',
      text: currentScheme === 'dark' ? '#E5E7EB' : '#0F172A',
      sub: currentScheme === 'dark' ? '#CBD5E1' : '#334155',
      accent: '#6366F1',
      accentSoft: 'rgba(99,102,241,0.12)',
      warn: currentScheme === 'dark' ? '#FCA5A5' : '#B91C1C',
    };
  };

  const palette = getPalette();

  const exportAllEntries = async () => {
    try {
      let content = 'MINDFUL MINUTE EXPORT\n';
      content += `Generated on: ${new Date().toLocaleDateString()}\n`;
      content += `Total entries: ${entries.length}\n\n`;
      content += '='.repeat(50) + '\n\n';

      entries.forEach((entry, index) => {
        const formattedDate = formatDate(entry.date);
        content += `ENTRY ${index + 1}\n`;
        content += `Date: ${formattedDate}\n`;
        content += `Prompt: ${entry.promptText}\n\n`;
        content += `Your Entry:\n${entry.text}\n\n`;
        content += `Mood: ${entry.moodTag?.value || 'Not specified'}\n`;
        content += `XP Earned: +${entry.xpAwarded || 0}\n`;
        content += '='.repeat(50) + '\n\n';
      });

      const fileUri = FileSystem.documentDirectory + `mindful-minute-export-${Date.now()}.txt`;
      
      await FileSystem.writeAsStringAsync(fileUri, content);
      
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'text/plain',
          dialogTitle: `Export ${entries.length} Journal Entries`,
        });
      }
      
      showToast(`Exported ${entries.length} entries`);
    } catch (error) {
      console.log('Export error:', error);
      showToast('Export failed');
    }
  };

  function formatDate(iso) {
    const d = new Date(`${iso}T00:00:00`);
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  }

  const [customText, setCustomText] = useState(String(writeDuration ?? 60));
  useEffect(() => { if (!loaded) init(); }, [loaded, init]);
  useEffect(() => { setCustomText(String(writeDuration)); }, [writeDuration]);

  const { invalid, message, parsed } = useMemo(() => {
    if (customText.trim().length === 0) {
      return { invalid: true, message: `Enter a value between ${MIN}–${MAX} seconds`, parsed: NaN };
    }
    const n = Number(customText);
    if (!Number.isFinite(n)) {
      return { invalid: true, message: 'Please enter a number', parsed: NaN };
    }
    if (n < MIN || n > MAX) {
      return { invalid: true, message: `Must be between ${MIN}–${MAX} seconds`, parsed: n };
    }
    return { invalid: false, message: '', parsed: Math.round(n) };
  }, [customText]);

  const [toastMsg, setToastMsg] = useState('');
  const toastAnim = useRef(new Animated.Value(0)).current;
  const showToast = (msg) => {
    setToastMsg(msg);
    toastAnim.stopAnimation();
    toastAnim.setValue(0);
    Animated.sequence([
      Animated.timing(toastAnim, { toValue: 1, duration: 180, useNativeDriver: true }),
      Animated.delay(1200),
      Animated.timing(toastAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start();
  };

const premiumToastStyle = {
  opacity: toastAnim,
  transform: [
    {
      translateY: toastAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [20, 0],
      }),
    },
    {
      scale: toastAnim.interpolate({
        inputRange: [0, 0.5, 1],
        outputRange: [0.8, 1.05, 1],
      }),
    },
  ],
};

  const applyScale = useRef(new Animated.Value(1)).current;
  const onApplyPressIn = () => {
    Animated.spring(applyScale, {
      toValue: 0.96,
      useNativeDriver: true,
      friction: 6,
      tension: 160,
    }).start();
  };

  const onApplyPressOut = () => {
    Animated.spring(applyScale, {
      toValue: 1,
      useNativeDriver: true,
      friction: 6,
      tension: 160,
    }).start();
  };

  const SettingRow = ({ label, description, value, onValueChange }) => (
    <View style={styles.row}>
      <View style={styles.settingTexts}>
        <Text style={[styles.label, { color: palette.text }]}>{label}</Text>
        <Text style={[styles.description, { color: palette.sub }]}>{description}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        thumbColor={'#FFFFFF'}
        trackColor={{ false: '#CBD5E1', true: '#6366F1' }}
      />
    </View>
  );

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={currentGradient.primary}
        style={styles.container}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      >
        <Animated.View style={{ opacity: contentFadeAnim, flex: 1 }}>
        {showThemeDropdown && (
  <TouchableWithoutFeedback onPress={closeDropdown}>
    <View style={styles.overlay} />
  </TouchableWithoutFeedback>
)}

          <ScrollView 
            style={[styles.container, { backgroundColor: palette.bg }]}
            contentContainerStyle={styles.scrollContent}
          >
            {/* Appearance */}
            <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
              <Text style={[styles.title, { color: palette.text }]}>Appearance</Text>
              <View style={styles.row}>
                <Text style={[styles.label, { color: palette.sub }]}>Show timer</Text>
                <Switch
                  value={!!showTimer}
                  onValueChange={setShowTimer}
                  thumbColor={'#FFFFFF'}
                  trackColor={{ false: '#CBD5E1', true: '#6366F1' }}
                />
              </View>
              
{/* Theme */}
<Text style={[styles.label, { color: palette.sub, marginTop: 12 }]}>
  Theme
</Text>

<View style={{ marginTop: 6 }}>

  {/* Header */}
  <Pressable
    onPress={() => setDropdownOpen((p) => !p)}
    style={[
      styles.dropdownHeader,
      {
        backgroundColor: isDark ? "#1F2937" : "#F3F4F6",
        borderColor: isDark ? "#374151" : "#D1D5DB",
      },
    ]}
  >
    <Text style={[styles.dropdownHeaderText, { color: palette.text }]}>
      {theme === "dynamic"
        ? "Dynamic (Sunrise/Sunset)"
        : theme.charAt(0).toUpperCase() + theme.slice(1)}
    </Text>
  </Pressable>

  {/* ABSOLUTE CONTAINER (fixes Android layering) */}
  <View style={{ position: "relative", zIndex: 9999 }}>

    {dropdownOpen && (
      <>
        {/* BACKDROP */}
        <Pressable
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 1,
          }}
          onPress={() => setDropdownOpen(false)}
        />

        {/* DROPDOWN PANEL */}
        <Animated.View
          style={{
            position: "absolute",
            top: 50,
            left: 0,
            right: 0,
            zIndex: 9999,
            backgroundColor: isDark ? "#1E293B" : "#FFFFFF",
            borderRadius: 12,
            paddingVertical: 8,
            elevation: 18,
            maxHeight: 240,
            overflow: "hidden",
            transform: [
              {
                scale: dropdownAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.9, 1],
                }),
              },
            ],
            opacity: dropdownAnim,
          }}
        >
          <ScrollView nestedScrollEnabled>
            {[
              { label: "System", value: "system" },
              { label: "Light", value: "light" },
              { label: "Dark", value: "dark" },
              { label: "Dynamic (Time-based)", value: "dynamic" },
            ].map((opt) => (
              <Pressable
                key={opt.value}
                onPress={() => {
                  setTheme(opt.value);
                  setDropdownOpen(false);
                }}
                style={{
                  paddingVertical: 12,
                  paddingHorizontal: 16,
                  backgroundColor:
                    theme === opt.value
                      ? isDark
                        ? "rgba(99,102,241,0.2)"
                        : "rgba(99,102,241,0.1)"
                      : "transparent",
                }}
              >
                <Text
                  style={{
                    color: isDark ? "#E5E7EB" : "#0F172A",
                    fontWeight: theme === opt.value ? "700" : "500",
                  }}
                >
                  {opt.label}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </Animated.View>
      </>
    )}

  </View>
</View>

{/* Dynamic time configuration */}
{theme === "dynamic" && (
  <View style={{ marginTop: 12, gap: 12 }}>
    <Text style={[styles.label, { color: palette.sub }]}>
      Dynamic Theme Times
    </Text>

<View style={{ flexDirection: "row", gap: 12 }}>

  {/* Sunrise box */}
  <View style={{ flex: 1 }}>
    <Text style={[styles.smallLabel, { color: palette.sub }]}>Sunrise</Text>

    <Pressable
      onPress={() => {
  setActivePicker("sunrise");
  setPickerVisible(true);
}}

      style={[
        styles.timeBox,
        {
          backgroundColor: isDark ? "#1E293B" : "#F1F5F9",
          borderColor: isDark ? "#334155" : "#CBD5E1",
        },
      ]}
    >
<Text style={{ color: palette.main }}>
  { settings.sunriseTime ?? "Select" }
</Text>

    </Pressable>
  </View>

  {/* Sunset box */}
  <View style={{ flex: 1 }}>
    <Text style={[styles.smallLabel, { color: palette.sub }]}>Sunset</Text>

    <Pressable
onPress={() => {
  setActivePicker("sunset");
  setPickerVisible(true);
}}
      style={[
        styles.timeBox,
        {
          backgroundColor: isDark ? "#1E293B" : "#F1F5F9",
          borderColor: isDark ? "#334155" : "#CBD5E1",
        },
      ]}
    >
<Text style={{ color: palette.main }}>
  { settings.sunsetTime ?? "Select" }
</Text>

    </Pressable>
  </View>

</View>

  </View>
)}





            </View>

            {/* Feedback */}
            <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
              <Text style={[styles.title, { color: palette.text }]}>Feedback</Text>
              <SettingRow
                label="Haptic Feedback"
                description="Vibrate on interactions and timer completion"
                value={hapticsEnabled}
                onValueChange={setHapticsEnabled}
              />

              <SettingRow
                label="Completion Sound"
                description="Play a chime when the timer finishes"
                value={soundEnabled}
                onValueChange={setSoundEnabled}
              />

              <SettingRow
                label="Preserve Timer Progress"
                description="Keep remaining time when saving and exiting"
                value={preserveTimerProgress}
                onValueChange={setPreserveTimerProgress}
              />
              

            </View>

            {/* Writing Modes */}
            <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
              <Text style={[styles.title, { color: palette.text }]}>Writing Modes</Text>
              <SettingRow
                label="Gratitude Mode"
                description="Always show gratitude writing prompts and bonus XP"
                value={gratitudeModeEnabled}
                onValueChange={setGratitudeModeEnabled}
              />
            </View>

            {/* Session */}
            <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
              <Text style={[styles.title, { color: palette.text }]}>Session</Text>

              {/* Writing Duration */}
              <Text style={[styles.label, { color: palette.sub, marginBottom: 8 }]}>
                Writing Duration
              </Text>

              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
                {[30, 60, 120, 300].map((s) => {
                  const active = writeDuration === s;
                  return (
                    <PremiumPressable
                      key={s}
                      onPress={() => setWriteDuration(s)}
                      haptic="light"
                      style={[
                        styles.chip,
                        {
                          borderColor: palette.border,
                          backgroundColor: active ? palette.accentSoft : 'transparent',
                        },
                      ]}
                    >
                      <Text style={{ color: active ? palette.accent : palette.sub, fontSize: 12 }}>
                        {s < 60 ? `${s}s` : `${s/60}min`}
                      </Text>
                    </PremiumPressable>
                  );
                })}
              </View>

              {/* Writing Duration Manual Input */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <TextInput
                  keyboardType="numeric"
                  placeholder="Custom writing (5-600s)"
                  placeholderTextColor={palette.sub}
                  value={customWriteText}
                  onChangeText={setCustomWriteText}
                  onSubmitEditing={() => { 
                    if (!writeInvalid) {
                      setWriteDuration(writeParsed);
                      showToast('Writing duration updated');
                    }
                  }}
                  style={[
                    styles.input,
                    { color: palette.text, borderColor: palette.border, backgroundColor: palette.card },
                  ]}
                />
                <PremiumPressable
                  onPress={() => {
                    if (!writeInvalid) {
                      setWriteDuration(writeParsed);
                      showToast('Writing duration updated');
                    }
                  }}
                  disabled={writeInvalid}
                  haptic="light"
                  style={[
                    styles.applyBtn,
                    { backgroundColor: writeInvalid ? '#CBD5E1' : palette.accent },
                  ]}
                >
                  <Text style={{ color: writeInvalid ? '#475569' : 'white', fontWeight: '600', fontSize: 12 }}>
                    Apply
                  </Text>
                </PremiumPressable>
              </View>

              {/* Writing Validation */}
              {writeInvalid ? (
                <Text style={{ color: palette.warn, marginBottom: 16, fontSize: 12 }}>
                  {writeMessage}
                </Text>
              ) : (
                <Text style={{ color: palette.sub, marginBottom: 16, fontSize: 12 }}>
                  Will set to {writeParsed < 60 ? `${writeParsed}s` : `${Math.round(writeParsed / 60)}min`} (allowed 5–600s)
                </Text>
              )}

              {/* Break Duration */}
              <Text style={[styles.label, { color: palette.sub, marginBottom: 8 }]}>
                Break Duration
              </Text>

              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
                {[15, 30, 60, 120].map((s) => {
                  const active = breakDuration === s;
                  return (
                    <PremiumPressable
                      key={s}
                      onPress={() => setBreakDuration(s)}
                      haptic="light"
                      style={[
                        styles.chip,
                        {
                          borderColor: palette.border,
                          backgroundColor: active ? palette.accentSoft : 'transparent',
                        },
                      ]}
                    >
                      <Text style={{ color: active ? palette.accent : palette.sub, fontSize: 12 }}>
                        {s}s
                      </Text>
                    </PremiumPressable>
                  );
                })}
              </View>

              {/* Break Duration Manual Input */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <TextInput
                  keyboardType="numeric"
                  placeholder="Custom break (5-600s)"
                  placeholderTextColor={palette.sub}
                  value={customBreakText}
                  onChangeText={setCustomBreakText}
                  onSubmitEditing={() => { 
                    if (!breakInvalid) {
                      setBreakDuration(breakParsed);
                      showToast('Break duration updated');
                    }
                  }}
                  style={[
                    styles.input,
                    { color: palette.text, borderColor: palette.border, backgroundColor: palette.card },
                  ]}
                />
                <PremiumPressable
                  onPress={() => {
                    if (!breakInvalid) {
                      setBreakDuration(breakParsed);
                      showToast('Break duration updated');
                    }
                  }}
                  disabled={breakInvalid}
                  haptic="light"
                  style={[
                    styles.applyBtn,
                    { backgroundColor: breakInvalid ? '#CBD5E1' : palette.accent },
                  ]}
                >
                  <Text style={{ color: breakInvalid ? '#475569' : 'white', fontWeight: '600', fontSize: 12 }}>
                    Apply
                  </Text>
                </PremiumPressable>
              </View>

              {/* Break Validation */}
              {breakInvalid ? (
                <Text style={{ color: palette.warn, marginBottom: 16, fontSize: 12 }}>
                  {breakMessage}
                </Text>
              ) : (
                <Text style={{ color: palette.sub, marginBottom: 16, fontSize: 12 }}>
                  Will set to {breakParsed}s (allowed 5–600s)
                </Text>
              )}

              {/* Total Cycles */}
              <Text style={[styles.label, { color: palette.sub, marginBottom: 8 }]}>
                Total Cycles
              </Text>

              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
                {[2, 4, 6, 8].map((cycles) => {
                  const active = totalCycles === cycles;
                  return (
                    <PremiumPressable
                      key={cycles}
                      onPress={() => setTotalCycles(cycles)}
                      haptic="light"
                      style={[
                        styles.chip,
                        {
                          borderColor: palette.border,
                          backgroundColor: active ? palette.accentSoft : 'transparent',
                        },
                      ]}
                    >
                      <Text style={{ color: active ? palette.accent : palette.sub, fontSize: 12 }}>
                        {cycles}
                      </Text>
                    </PremiumPressable>
                  );
                })}
              </View>

              <Text style={{ color: palette.sub, marginTop: 8, fontSize: 12 }}>
                {totalCycles} cycles of {writeDuration < 60 ? `${writeDuration}s` : `${writeDuration/60}min`} writing + {breakDuration}s breaks
              </Text>
            </View>

            {/* Export Section */}
            <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
              <Text style={[styles.title, { color: palette.text }]}>Data</Text>
              
              <PremiumPressable
                onPress={() => exportAllEntries()}
                haptic="light"
                style={[
                  styles.exportBtn,
                  { 
                    backgroundColor: palette.accent,
                  }
                ]}
              >
                <Text style={[styles.exportText, { color: 'white' }]}>
                  Export All Entries
                </Text>
              </PremiumPressable>
              
              <Text style={[styles.exportDescription, { color: palette.sub }]}>
                Export all your journal entries as a text file that you can save, print, or share.
              </Text>
            </View>
            <DateTimePickerModal
  isVisible={pickerVisible}
  mode="time"
  onConfirm={(date) => {
    const hh = String(date.getHours()).padStart(2, "0");
    const mm = String(date.getMinutes()).padStart(2, "0");
    const value = `${hh}:${mm}`;

if (activePicker === "sunrise") {
  settings.setSunriseTime(value);
} else 
if (activePicker === "sunset") {
  settings.setSunsetTime(value);
}


    setPickerVisible(false);
  }}
  onCancel={() => setPickerVisible(false)}
/>

          </ScrollView>

          {/* Toast */}
          <Animated.View style={[
            styles.toast, 
            premiumToastStyle,
            { 
              backgroundColor: isDark ? 'rgba(17, 24, 39, 0.95)' : 'rgba(255, 255, 255, 0.95)',
              borderColor: isDark ? 'rgba(99, 102, 241, 0.3)' : 'rgba(99, 102, 241, 0.2)',
            }
          ]}>
            <Text style={[
              styles.toastText,
              { color: isDark ? '#F8FAFC' : '#0F172A' }
            ]}>
              {toastMsg}
            </Text>
          </Animated.View>
        </Animated.View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: {
    padding: 16,
    gap: 14,
    paddingBottom: 40,
  },
  card: { borderWidth: 1, borderRadius: 16, padding: 12 },
  title: { fontSize: 16, fontWeight: '600', marginBottom: 8 },
  row: { 
    flexDirection: 'row', 
    alignItems: 'flex-start', 
    justifyContent: 'space-between', 
    paddingVertical: 12,
  },
  settingTexts: { flex: 1, marginRight: 16 },
  label: { fontSize: 15, fontWeight: '500', marginBottom: 2 },
  description: { fontSize: 13, lineHeight: 16 },
  themeOptions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    gap: 8,
  },
  themeOption: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderRadius: 16,
    borderWidth: 1,
    minHeight: 48,
    minWidth: 80,
  },
  themeOptionActive: {
    borderColor: '#6366F1',
    backgroundColor: '#6366F1',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  themeLabel: {
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
    minWidth: 60,
  },
  chip: { borderWidth: 1, borderRadius: 999, paddingVertical: 6, paddingHorizontal: 12 },
  input: { flexGrow: 0, minWidth: 110, borderWidth: 1, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 10 },
  applyBtn: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10 },
  exportBtn: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 8,
  },
  exportText: {
    fontWeight: '700',
    fontSize: 16,
  },
  exportDescription: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
  toast: {
    position: 'absolute',
    bottom: 30,
    left: 20,
    right: 20,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    zIndex: 1000,
  },
  toastText: { 
    fontWeight: '600', 
    textAlign: 'center',
    fontSize: 14,
  },
  customizationButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  customizationButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  dropdownHeader: {
  paddingVertical: 12,
  paddingHorizontal: 14,
  borderRadius: 12,
  borderWidth: 1,
},

dropdownHeaderText: {
  fontSize: 16,
  fontWeight: "500",
},

dropdownMenu: {
  marginTop: 4,
  borderWidth: 1,
  borderRadius: 12,
  overflow: "hidden",
},

dropdownItem: {
  paddingVertical: 10,
  paddingHorizontal: 14,
},

dropdownItemText: {
  fontSize: 15,
},
overlay: {
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: "transparent",
  zIndex: 10,
},
dropdownHeader: {
  paddingVertical: 12,
  paddingHorizontal: 14,
  borderRadius: 12,
  borderWidth: 1,
},

dropdownHeaderText: {
  fontSize: 16,
  fontWeight: "500",
},

dropdownMenu: {
  marginTop: 4,
  borderWidth: 1,
  borderRadius: 12,
  overflow: "hidden",
},

dropdownItem: {
  paddingVertical: 10,
  paddingHorizontal: 14,
},

dropdownItemText: {
  fontSize: 15,
},

smallLabel: {
  fontSize: 13,
  marginBottom: 4,
  fontWeight: "500",
},

timeInput: {
  padding: 10,
  borderRadius: 10,
  borderWidth: 1,
  fontSize: 15,
},
timeBox: {
  marginTop: 6,
  paddingVertical: 14,
  borderRadius: 12,
  borderWidth: 1,
  alignItems: "center",
  justifyContent: "center",
},

});