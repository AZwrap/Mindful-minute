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
  NativeModules,
  TouchableWithoutFeedback,
  Platform,
  LayoutAnimation,
  UIManager
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useSettings } from "../stores/settingsStore";
import { useEntriesStore } from "../stores/entriesStore";
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { useJournalStore } from '../stores/journalStore';
import { useTheme } from "../stores/themeStore";
import { LinearGradient } from 'expo-linear-gradient';
import PremiumPressable from '../components/PremiumPressable';
import { Easing } from "react-native";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import { useWritingSettings } from "../stores/writingSettingsStore";
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Updates from 'expo-updates';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import { 
  Trash2, Plus, Save, FileText, Database, RotateCcw, Share, 
  ChevronDown, ChevronUp, Palette 
} from 'lucide-react-native'; // <--- Added Icons

// Enable LayoutAnimation for Android
if (Platform.OS === 'android') {
  if (UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }
}

const APP_COLORS = [
  '#6366F1', // Indigo (Default)
  '#EC4899', // Pink
  '#10B981', // Emerald
  '#F59E0B', // Amber
  '#06B6D4', // Cyan
  '#8B5CF6', // Violet
];

export default function SettingsScreen({ navigation }) {
  const systemScheme = useColorScheme();
  const { getCurrentTheme } = useTheme();
  const currentTheme = getCurrentTheme(systemScheme);
  const isDark = currentTheme === 'dark';
  
  const loaded = useSettings((s) => s.loaded);
  
  const showTimer = useWritingSettings((s) => s.showTimer);
  const hapticsEnabled = useSettings((s) => s.hapticsEnabled);
  const soundEnabled = useSettings((s) => s.soundEnabled);
  const preserveTimerProgress = useSettings((s) => s.preserveTimerProgress);
  const {
    writeDuration,
    breakDuration,
    totalCycles,
    setWriteDuration,
    setBreakDuration,
    setTotalCycles,
  } = useWritingSettings();
  const setShowTimer = useWritingSettings((s) => s.setShowTimer);
  
  const setHapticsEnabled = useSettings((s) => s.setHapticsEnabled);
  const setSoundEnabled = useSettings((s) => s.setSoundEnabled);
  const setPreserveTimerProgress = useSettings((s) => s.setPreserveTimerProgress);
  
  const map = useJournalStore((s) => s.entries);
  const gratitudeModeEnabled = useSettings((s) => s.gratitudeModeEnabled);
  const setGratitudeModeEnabled = useSettings((s) => s.setGratitudeModeEnabled);
  
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [accentDropdownOpen, setAccentDropdownOpen] = useState(false); // <--- New State for Color Dropdown

  const {
    theme,
    setTheme,
    dynamicSunrise,
    dynamicSunset,
    setDynamicSunrise,
    setDynamicSunset,
    accentColor,
    setAccentColor
  } = useTheme();

  const [pickerVisible, setPickerVisible] = useState(false);
  const [activePicker, setActivePicker] = useState(null);
  
  const { sunriseTime, sunsetTime } = useTheme();
  
  const formatTime = (date) => {
    if (!date) return null;
    const d = new Date(date);
    const h = d.getHours().toString().padStart(2, "0");
    const m = d.getMinutes().toString().padStart(2, "0");
    return `${h}:${m}`;
  };

  const { isBiometricsEnabled, setIsBiometricsEnabled } = useSettings();
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

  // Validation hooks (preserved from previous code)
  const [customWriteText, setCustomWriteText] = useState(String(writeDuration ?? 60));
  const [customBreakText, setCustomBreakText] = useState(String(breakDuration ?? 30));

  const { invalid: writeInvalid, parsed: writeParsed } = useMemo(() => {
    const n = Number(customWriteText);
    if (!Number.isFinite(n) || n < 5 || n > 600) return { invalid: true, parsed: n };
    return { invalid: false, parsed: Math.round(n) };
  }, [customWriteText]);

  const { invalid: breakInvalid, parsed: breakParsed } = useMemo(() => {
    const n = Number(customBreakText);
    if (!Number.isFinite(n) || n < 5 || n > 600) return { invalid: true, parsed: n };
    return { invalid: false, parsed: Math.round(n) };
  }, [customBreakText]);

  const getPalette = () => {
    const currentScheme = currentTheme || 'light';
    const activeColor = accentColor || '#6366F1';

    return {
      bg: currentScheme === 'dark' ? '#0F172A' : '#F8FAFC',
      card: currentScheme === 'dark' ? '#111827' : '#FFFFFF',
      border: currentScheme === 'dark' ? '#1F2937' : '#E2E8F0',
      text: currentScheme === 'dark' ? '#E5E7EB' : '#0F172A',
      sub: currentScheme === 'dark' ? '#CBD5E1' : '#334155',
      accent: activeColor,
      accentSoft: activeColor + '20', 
      warn: currentScheme === 'dark' ? '#FCA5A5' : '#B91C1C',
    };
  };

  const palette = getPalette();

  // Function to toggle Accent Dropdown with animation
  const toggleAccentDropdown = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setAccentDropdownOpen(!accentDropdownOpen);
  };

  // Existing handlers (shortened for brevity)
  const exportAllEntries = async () => { /* ... */ };
  const generateTherapistReport = async () => { /* ... */ };
  const handleBackup = async () => { /* ... */ };
  const handleRestore = async () => { /* ... */ };
  const handleFactoryReset = () => { /* ... */ };
  const showToast = (msg) => { setToastMsg(msg); /* ... */ };
  const [toastMsg, setToastMsg] = useState('');
  const toastAnim = useRef(new Animated.Value(0)).current;

  const SettingRow = ({ label, description, value, onValueChange }) => (
    <View style={styles.row}>
      <View style={styles.settingTexts}>
        <Text style={[styles.label, { color: palette.text }]}>{label}</Text>
        {description && <Text style={[styles.description, { color: palette.sub }]}>{description}</Text>}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        thumbColor={'#FFFFFF'}
        trackColor={{ false: '#CBD5E1', true: palette.accent }}
      />
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: isDark ? "#0F172A" : "#FFFFFF" }}>
      <LinearGradient
        colors={gradients[currentTheme]?.primary || gradients.light.primary}
        style={styles.container}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      >
        <SafeAreaView style={{ flex: 1 }} edges={['top']}>
          <Animated.View style={{ opacity: contentFadeAnim, flex: 1 }}>
            
            {/* Close Theme Dropdown overlay */}
            {dropdownOpen && (
              <TouchableWithoutFeedback onPress={() => setDropdownOpen(false)}>
                <View style={styles.overlay} />
              </TouchableWithoutFeedback>
            )}

            <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
              
              {/* 1. MAIN CONFIG CARD */}
              <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border, paddingBottom: 12 }]}>
                
                {/* Appearance */}
                <Text style={[styles.title, { color: palette.text }]}>Appearance</Text>
                <SettingRow
                  label="Show Timer"
                  value={showTimer}
                  onValueChange={setShowTimer}
                />
                
                {/* Theme Selector */}
                <Text style={[styles.title, { color: palette.text, marginTop: 12 }]}>Theme</Text>
                <View style={{ width: "100%", zIndex: 50 }}>
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
                    <Text style={{ fontSize: 15, fontWeight: "600", color: isDark ? "#E5E7EB" : "#0F172A" }}>
                      {theme === "system" ? "System" : theme === "dynamic" ? "Dynamic" : theme === "light" ? "Light" : "Dark"}
                    </Text>
                    <ChevronDown size={16} color={palette.sub} />
                  </Pressable>

                  {/* Theme Dropdown Options */}
                  {dropdownOpen && (
                    <Animated.View
                      style={{
                        position: 'absolute',
                        top: '100%', left: 0, right: 0,
                        marginTop: 4,
                        backgroundColor: isDark ? "#1E293B" : "#FFFFFF",
                        borderRadius: 12,
                        paddingVertical: 4,
                        borderWidth: 1,
                        borderColor: isDark ? "#374151" : "#E5E7EB",
                        elevation: 12,
                        shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10,
                        zIndex: 100
                      }}
                    >
                      {["light", "dark", "system", "dynamic"].map((opt) => (
                        <Pressable
                          key={opt}
                          onPress={() => { setTheme(opt); setDropdownOpen(false); }}
                          style={{ paddingVertical: 12, paddingHorizontal: 16 }}
                        >
                          <Text style={{ fontSize: 14, fontWeight: "600", color: isDark ? "#E5E7EB" : "#0F172A" }}>
                            {opt === "system" ? "System" : opt === "dynamic" ? "Dynamic" : opt.charAt(0).toUpperCase() + opt.slice(1)}
                          </Text>
                        </Pressable>
                      ))}
                    </Animated.View>
                  )}
                </View>

                {/* Dynamic Times (Only if Dynamic) */}
                {theme === "dynamic" && (
                  <View style={{ marginTop: 12, gap: 8 }}>
                     <View style={{ flexDirection: "row", gap: 12 }}>
                      <Pressable
                        onPress={() => { setActivePicker("sunrise"); setPickerVisible(true); }}
                        style={[styles.timeBox, { flex: 1, backgroundColor: isDark ? "#1E293B" : "#F1F5F9", borderColor: isDark ? "#334155" : "#CBD5E1" }]}
                      >
                        <Text style={{ fontSize: 11, color: palette.sub, marginBottom: 2 }}>SUNRISE</Text>
                        <Text style={{ fontSize: 14, fontWeight: "600", color: palette.text }}>{sunriseTime}</Text>
                      </Pressable>
                      <Pressable
                        onPress={() => { setActivePicker("sunset"); setPickerVisible(true); }}
                        style={[styles.timeBox, { flex: 1, backgroundColor: isDark ? "#1E293B" : "#F1F5F9", borderColor: isDark ? "#334155" : "#CBD5E1" }]}
                      >
                        <Text style={{ fontSize: 11, color: palette.sub, marginBottom: 2 }}>SUNSET</Text>
                        <Text style={{ fontSize: 14, fontWeight: "600", color: palette.text }}>{sunsetTime}</Text>
                      </Pressable>
                    </View>
                  </View>
                )}

                {/* --- ACCENT COLOR DROPDOWN (Hidden if Dynamic) --- */}
                {theme !== "dynamic" && (
                  <View style={{ marginTop: 16, zIndex: 10 }}>
                    <Pressable 
                      onPress={toggleAccentDropdown}
                      style={[
                        styles.dropdownHeader,
                        {
                          backgroundColor: isDark ? "#1F2937" : "#F3F4F6",
                          borderColor: isDark ? "#374151" : "#D1D5DB",
                          flexDirection: 'row', 
                          justifyContent: 'space-between', 
                          alignItems: 'center'
                        },
                      ]}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Palette size={16} color={palette.sub} />
                        <Text style={{ fontSize: 15, fontWeight: "600", color: isDark ? "#E5E7EB" : "#0F172A" }}>
                          Accent Color
                        </Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                         {/* Show current color dot when collapsed */}
                         {!accentDropdownOpen && (
                            <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: accentColor || '#6366F1' }} />
                         )}
                         {accentDropdownOpen ? <ChevronUp size={16} color={palette.sub} /> : <ChevronDown size={16} color={palette.sub} />}
                      </View>
                    </Pressable>

                    {/* Expandable Color Grid */}
                    {accentDropdownOpen && (
                      <View style={{ 
                          marginTop: 8, 
                          padding: 12, 
                          backgroundColor: isDark ? "#1E293B" : "#F9FAFB",
                          borderRadius: 12,
                          borderWidth: 1,
                          borderColor: palette.border,
                          flexDirection: 'row', 
                          flexWrap: 'wrap', 
                          gap: 12,
                          justifyContent: 'center'
                      }}>
                        {APP_COLORS.map((color) => (
                          <Pressable
                            key={color}
                            onPress={() => {
                              setAccentColor(color);
                              if (hapticsEnabled) Haptics.selectionAsync();
                              // Optional: auto-close after select
                              // setAccentDropdownOpen(false); 
                            }}
                            style={{
                              width: 40, height: 40,
                              borderRadius: 20,
                              backgroundColor: color,
                              alignItems: 'center', justifyContent: 'center',
                              borderWidth: 3,
                              borderColor: accentColor === color ? palette.text : 'transparent',
                              shadowColor: color, shadowOpacity: 0.3, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }
                            }}
                          >
                            {accentColor === color && <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: 'white' }} />}
                          </Pressable>
                        ))}
                      </View>
                    )}
                  </View>
                )}

                {/* DIVIDER */}
                <View style={{ height: 1, backgroundColor: palette.border, marginVertical: 12 }} />

                {/* Privacy Row */}
                <View style={[styles.row, { paddingVertical: 0, alignItems: 'center' }]}>
                  <View>
                    <Text style={[styles.label, { color: palette.text }]}>Biometric Lock</Text>
                    <Text style={[styles.description, { color: palette.sub, fontSize: 12 }]}>
                      FaceID / Fingerprint
                    </Text>
                  </View>
                  <Switch
                    value={isBiometricsEnabled}
                    onValueChange={(val) => {
                      setIsBiometricsEnabled(val);
                      if (val && hapticsEnabled) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    }}
                    trackColor={{ false: '#CBD5E1', true: palette.accent }}
                    thumbColor={'white'}
                  />
                </View>

              </View>

              {/* 2. FEEDBACK CARD */}
              <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
                <Text style={[styles.title, { color: palette.text }]}>Feedback</Text>
                <SettingRow
                  label="Haptic Feedback"
                  description="Vibrate on interactions"
                  value={hapticsEnabled}
                  onValueChange={setHapticsEnabled}
                />
                <SettingRow
                  label="Completion Sound"
                  description="Play a chime when timer finishes"
                  value={soundEnabled}
                  onValueChange={setSoundEnabled}
                />
                <SettingRow
                  label="Preserve Timer"
                  description="Keep time when saving draft"
                  value={preserveTimerProgress}
                  onValueChange={setPreserveTimerProgress}
                />
              </View>

              {/* 3. WRITING MODES */}
              <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
                <Text style={[styles.title, { color: palette.text }]}>Writing Modes</Text>
                <SettingRow
                  label="Gratitude Mode"
                  description="Always show gratitude prompts"
                  value={gratitudeModeEnabled}
                  onValueChange={setGratitudeModeEnabled}
                />
              </View>

              {/* 4. DATA */}
              <View style={[styles.section, { marginTop: 8 }]}>
                <Text style={[styles.sectionTitle, { color: palette.sub }]}>Data & Privacy</Text>
                <View style={[styles.menuGroup, { backgroundColor: palette.card, borderColor: palette.border }]}>
                  <PremiumPressable onPress={generateTherapistReport} style={[styles.menuItem, { borderBottomWidth: 1, borderBottomColor: palette.border }]}>
                    <View style={styles.menuItemContent}>
                      <FileText size={20} color={palette.accent} />
                      <View><Text style={[styles.menuItemTitle, { color: palette.text }]}>Therapist Report</Text></View>
                    </View>
                  </PremiumPressable>
                  <PremiumPressable onPress={handleBackup} style={[styles.menuItem, { borderBottomWidth: 1, borderBottomColor: palette.border }]}>
                    <View style={styles.menuItemContent}>
                      <Database size={20} color={palette.accent} />
                      <View><Text style={[styles.menuItemTitle, { color: palette.text }]}>Backup Data</Text></View>
                    </View>
                  </PremiumPressable>
                </View>
              </View>

              {/* 5. DANGER ZONE */}
              <View style={{ marginTop: 12, marginBottom: 40 }}>
                <PremiumPressable
                  onPress={handleFactoryReset}
                  style={{
                    backgroundColor: isDark ? 'rgba(239, 68, 68, 0.1)' : '#FEF2F2',
                    borderColor: isDark ? 'rgba(239, 68, 68, 0.3)' : '#FCA5A5',
                    borderWidth: 1, borderRadius: 16, padding: 16, alignItems: 'center',
                  }}
                >
                  <Text style={{ color: isDark ? '#F87171' : '#DC2626', fontWeight: '700' }}>
                    Reset App & Clear All Data
                  </Text>
                </PremiumPressable>
              </View>

            </ScrollView>

            <DateTimePickerModal
              isVisible={pickerVisible}
              mode="time"
              onConfirm={(value) => {
                const formatted = formatTime(value);
                if (activePicker === "sunrise") useTheme.getState().setDynamicSunrise(formatted);
                else if (activePicker === "sunset") useTheme.getState().setDynamicSunset(formatted);
                setPickerVisible(false);
              }}
              onCancel={() => setPickerVisible(false)}
            />

            {/* Toast */}
            <Animated.View style={[
              styles.toast, 
              premiumToastStyle,
              { 
                backgroundColor: isDark ? 'rgba(17, 24, 39, 0.95)' : 'rgba(255, 255, 255, 0.95)',
                borderColor: palette.accent + '40',
              }
            ]}>
              <Text style={[styles.toastText, { color: palette.text }]}>{toastMsg}</Text>
            </Animated.View>

          </Animated.View>
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 16, gap: 14, paddingBottom: 80 },
  card: { borderWidth: 1, borderRadius: 16, padding: 12 },
  title: { fontSize: 16, fontWeight: '600', marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12 },
  settingTexts: { flex: 1, marginRight: 16 },
  label: { fontSize: 15, fontWeight: '500', marginBottom: 2 },
  description: { fontSize: 13, lineHeight: 16 },
  chip: { borderWidth: 1, borderRadius: 999, paddingVertical: 6, paddingHorizontal: 12 },
  input: { flexGrow: 0, minWidth: 110, borderWidth: 1, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 10 },
  applyBtn: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10 },
  toast: {
    position: 'absolute', bottom: 30, left: 20, right: 20,
    borderRadius: 12, paddingVertical: 12, paddingHorizontal: 16,
    borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, shadowRadius: 4, elevation: 3, zIndex: 1000,
  },
  toastText: { fontWeight: '600', textAlign: 'center', fontSize: 14 },
  dropdownHeader: { 
    paddingVertical: 12, paddingHorizontal: 14, 
    borderRadius: 12, borderWidth: 1,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'
  },
  overlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "transparent", zIndex: 10 },
  smallLabel: { fontSize: 13, marginBottom: 4, fontWeight: "500" },
  timeBox: { marginTop: 6, paddingVertical: 14, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 12, fontWeight: '700', marginBottom: 8, marginLeft: 4, textTransform: 'uppercase', letterSpacing: 1 },
  menuGroup: { borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  menuItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 16, paddingHorizontal: 16 },
  menuItemContent: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  menuItemTitle: { fontSize: 15, fontWeight: '600' },
  iconBox: { padding: 8, borderRadius: 8, marginRight: 8 },
});