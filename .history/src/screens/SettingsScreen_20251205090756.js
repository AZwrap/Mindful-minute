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
import DateTimePickerModal from "react-native-modal-datetime-picker";
import { useWritingSettings } from "../stores/writingSettingsStore";
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Updates from 'expo-updates';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import { 
  Trash2, Plus, Save, FileText, Database, RotateCcw, Share, 
  ChevronDown, ChevronUp, Palette, Cloud, CloudDownload, Bell 
} from 'lucide-react-native';
import { saveBackupToCloud, restoreBackupFromCloud } from '../services/cloudBackupService';
import { scheduleSmartReminder, cancelNotifications } from '../lib/notifications';
import { analyzeWritingAnalytics } from '../constants/writingAnalytics';
import { scheduleSmartReminder, cancelNotifications } from '../lib/notifications';

// Enable LayoutAnimation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
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
  
  // Store Hooks
  const showTimer = useWritingSettings((s) => s.showTimer);
  const setShowTimer = useWritingSettings((s) => s.setShowTimer);
  const setPreserveTimerProgress = useSettings((s) => s.setPreserveTimerProgress);
  const { 
    isBiometricsEnabled, setIsBiometricsEnabled,
    smartRemindersEnabled, setSmartRemindersEnabled 
  } = useSettings();
  const { 
    hapticsEnabled, setHapticsEnabled,
    soundEnabled, setSoundEnabled,
    preserveTimerProgress, 
    gratitudeModeEnabled, setGratitudeModeEnabled, 
  } = useSettings();
  const entriesMap = useEntriesStore((s) => s.entries);
  const {
    writeDuration, breakDuration, totalCycles,
    setWriteDuration, setBreakDuration, setTotalCycles,
  } = useWritingSettings();
  const map = useJournalStore((s) => s.entries);

  // Local UI State
  const [themeDropdownOpen, setThemeDropdownOpen] = useState(false); 
  const [accentDropdownOpen, setAccentDropdownOpen] = useState(false);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [activePicker, setActivePicker] = useState(null);
  const [customWriteText, setCustomWriteText] = useState(String(writeDuration ?? 60));
  const [customBreakText, setCustomBreakText] = useState(String(breakDuration ?? 30));
  const [toastMsg, setToastMsg] = useState('');
  
  const contentFadeAnim = useRef(new Animated.Value(0)).current;
  const toastAnim = useRef(new Animated.Value(0)).current;

  const {
    theme, setTheme,
    dynamicSunrise, dynamicSunset, setDynamicSunrise, setDynamicSunset,
    sunriseTime, sunsetTime,
    accentColor, setAccentColor
  } = useTheme();

  // --- EFFECTS ---
  useEffect(() => {
    if (loaded) {
      Animated.timing(contentFadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    }
  }, [loaded]);

  // --- HELPERS ---
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

  const formatTime = (date) => {
    if (!date) return null;
    const d = new Date(date);
    const h = d.getHours().toString().padStart(2, "0");
    const m = d.getMinutes().toString().padStart(2, "0");
    return `${h}:${m}`;
  };

  // --- ANIMATED TOGGLES ---
  const toggleThemeDropdown = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setThemeDropdownOpen(!themeDropdownOpen);
  };

  const toggleAccentDropdown = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setAccentDropdownOpen(!accentDropdownOpen);
  };

  // --- VALIDATION ---
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

  const entries = useMemo(() => {
    return Object.entries(map || {}).sort((a, b) => (a[0] < b[0] ? 1 : -1))
      .map(([date, entry]) => ({ date, ...entry }));
  }, [map]);

  // --- ACTIONS ---
  const showToast = (msg) => {
    setToastMsg(msg);
    toastAnim.setValue(0);
    Animated.sequence([
      Animated.timing(toastAnim, { toValue: 1, duration: 180, useNativeDriver: true }),
      Animated.delay(1200),
      Animated.timing(toastAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start();
  };

  const exportAllEntries = async () => {
    try {
      let content = 'MINDFUL MINUTE EXPORT\n';
      content += `Generated on: ${new Date().toLocaleDateString()}\n\n`;
      entries.forEach((entry, index) => {
        content += `ENTRY ${index + 1} - ${entry.date}\n${entry.text}\n\n`;
      });
      const fileUri = FileSystem.documentDirectory + `mindful-minute-export-${Date.now()}.txt`;
      await FileSystem.writeAsStringAsync(fileUri, content);
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri);
      }
      showToast(`Exported ${entries.length} entries`);
    } catch (error) { console.log(error); }
  };

  const handleBackup = async () => {
    const data = JSON.stringify(useEntriesStore.getState().entries);
    const fileUri = FileSystem.documentDirectory + `backup-${Date.now()}.json`;
    await FileSystem.writeAsStringAsync(fileUri, data);
    if (await Sharing.isAvailableAsync()) { await Sharing.shareAsync(fileUri); }
  };
  
  const handleRestore = async () => {
     try {
        const res = await DocumentPicker.getDocumentAsync({ type: 'application/json' });
        if (res.assets && res.assets[0]) {
            const content = await FileSystem.readAsStringAsync(res.assets[0].uri);
            useEntriesStore.getState().replaceEntries(JSON.parse(content));
            Alert.alert("Success", "Data restored!");
        }
     } catch (e) { Alert.alert("Error", "Failed to restore data."); }
  };

const handleFactoryReset = () => {
    Alert.alert(
      "Factory Reset",
      "This will permanently delete ALL entries. Are you sure?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset Everything",
          style: "destructive",
          onPress: async () => {
             try {
               // 1. Clear Disk Storage
               await AsyncStorage.clear();
               
               // 2. Clear Memory State (Zustand)
               useEntriesStore.setState({ entries: {}, drafts: {} });
               useSettings.setState({ hasOnboarded: false, isBiometricsEnabled: false });
               useJournalStore.setState({ sharedEntries: {}, journalInfo: null });
               
               // 3. Force Reload
               try {
                 await Updates.reloadAsync();
               } catch (e) {
                 // Fallback for Expo Go if Updates fails
                 if (NativeModules.DevSettings) {
                    NativeModules.DevSettings.reload();
                 } else {
                    // Final fallback: just go to onboarding manually
                    navigation.reset({ index: 0, routes: [{ name: 'Onboarding' }] });
                 }
               }
             } catch (e) {
               Alert.alert("Error", "Failed to reset data. Please reinstall the app.");
             }
          }
        }
      ]
    );
  };

  const handleCloudSave = async () => {
    showToast("Backing up to cloud...");
    const result = await saveBackupToCloud();
    if (result.success) {
        Alert.alert("Success", "App data safely backed up to the cloud.");
    } else {
        Alert.alert("Error", "Backup failed. Check your internet connection.");
    }
  };

  const handleCloudRestore = () => {
    Alert.alert(
      "Restore from Cloud",
      "This will OVERWRITE current data with your cloud backup. Continue?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Restore", 
          onPress: async () => {
            showToast("Restoring...");
            const result = await restoreBackupFromCloud();
            if (result.success) {
                Alert.alert("Restored", "Your data is back!");
                Updates.reloadAsync(); // Reload to ensure all stores refresh
            } else {
                Alert.alert("Error", "Could not find backup or download failed.");
            }
          } 
        }
      ]
    );
  };

  const generateTherapistReport = () => Alert.alert("Report", "Feature coming soon.");

  const premiumToastStyle = {
    opacity: toastAnim,
    transform: [
      { translateY: toastAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) },
      { scale: toastAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.8, 1.05, 1] }) },
    ],
  };

  const SettingRow = ({ label, description, value, onValueChange }) => (
    <View style={styles.row}>
      <View style={styles.settingTexts}>
        <Text style={[styles.label, { color: palette.text }]}>{label}</Text>
        {description && <Text style={[styles.description, { color: palette.sub }]}>{description}</Text>}
      </View>
      <Switch value={value} onValueChange={onValueChange} thumbColor={'#FFFFFF'} trackColor={{ false: '#CBD5E1', true: palette.accent }} />
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: isDark ? "#0F172A" : "#FFFFFF" }}>
      <LinearGradient
        colors={currentGradient.primary}
        style={styles.container}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      >
        <SafeAreaView style={{ flex: 1 }} edges={['top']}>
          <Animated.View style={{ opacity: contentFadeAnim, flex: 1 }}>
            
            <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
              
              {/* 1. MAIN CONFIG CARD */}
              <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border, paddingBottom: 12 }]}>
                
                <Text style={[styles.title, { color: palette.text }]}>Appearance</Text>
                <SettingRow label="Show Timer" value={showTimer} onValueChange={setShowTimer} />
                
                {/* --- THEME SELECTOR (ACCORDION STYLE) --- */}
                <View style={{ marginTop: 12 }}>
                    <Text style={[styles.label, { color: palette.text, marginBottom: 8 }]}>Theme</Text>
                    <Pressable 
                        onPress={toggleThemeDropdown}
                        style={[styles.dropdownHeader, { backgroundColor: isDark ? "#1F2937" : "#F3F4F6", borderColor: palette.border }]}
                    >
                        <Text style={{ fontSize: 15, fontWeight: "600", color: palette.text }}>
                            {theme === "system" ? "System" : theme === "dynamic" ? "Dynamic" : theme === "light" ? "Light" : "Dark"}
                        </Text>
                        {themeDropdownOpen ? <ChevronUp size={16} color={palette.sub} /> : <ChevronDown size={16} color={palette.sub} />}
                    </Pressable>

                    {themeDropdownOpen && (
                        <View style={{ marginTop: 6, borderRadius: 12, borderWidth: 1, borderColor: palette.border, overflow: 'hidden' }}>
                            {["light", "dark", "system", "dynamic"].map((opt) => (
                                <Pressable
                                    key={opt}
                                    onPress={() => { setTheme(opt); toggleThemeDropdown(); }} // Auto close on select
                                    style={({ pressed }) => ({
                                        paddingVertical: 12, paddingHorizontal: 16,
                                        backgroundColor: pressed ? (isDark ? '#374151' : '#E5E7EB') : 'transparent'
                                    })}
                                >
                                    {/* ADDED FONTWEIGHT: 600 HERE */}
                                    <Text style={{ fontSize: 14, fontWeight: '600', color: palette.text }}>
                                        {opt.charAt(0).toUpperCase() + opt.slice(1)}
                                    </Text>
                                </Pressable>
                            ))}
                        </View>
                    )}
                </View>

                {/* Dynamic Times (Only if Dynamic) */}
                {theme === "dynamic" && (
                  <View style={{ marginTop: 12, gap: 8 }}>
                     <View style={{ flexDirection: "row", gap: 12 }}>
                      <Pressable onPress={() => { setActivePicker("sunrise"); setPickerVisible(true); }} style={[styles.timeBox, { flex: 1, borderColor: palette.border, backgroundColor: palette.bg }]}>
                        <Text style={{ fontSize: 11, color: palette.sub, marginBottom: 2 }}>SUNRISE</Text>
                        <Text style={{ fontSize: 14, fontWeight: "600", color: palette.text }}>{sunriseTime}</Text>
                      </Pressable>
                      <Pressable onPress={() => { setActivePicker("sunset"); setPickerVisible(true); }} style={[styles.timeBox, { flex: 1, borderColor: palette.border, backgroundColor: palette.bg }]}>
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
                          borderColor: palette.border, // Consistent border
                          flexDirection: 'row', 
                          justifyContent: 'space-between', 
                          alignItems: 'center'
                        },
                      ]}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Palette size={16} color={palette.sub} />
                        <Text style={{ fontSize: 15, fontWeight: "600", color: palette.text }}>
                          Accent Color
                        </Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                         {!accentDropdownOpen && (
                            <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: accentColor || '#6366F1' }} />
                         )}
                         {accentDropdownOpen ? <ChevronUp size={16} color={palette.sub} /> : <ChevronDown size={16} color={palette.sub} />}
                      </View>
                    </Pressable>

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

                <View style={{ height: 1, backgroundColor: palette.border, marginVertical: 12 }} />

                {/* Privacy Row */}
                <View style={[styles.row, { paddingVertical: 0, alignItems: 'center' }]}>
                  <View>
                    <Text style={[styles.label, { color: palette.text }]}>Biometric Lock</Text>
                    <Text style={[styles.description, { color: palette.sub, fontSize: 12 }]}>FaceID / Fingerprint</Text>
                  </View>
                  <Switch
                    value={isBiometricsEnabled}
                    onValueChange={(val) => { setIsBiometricsEnabled(val); if (val && hapticsEnabled) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); }}
                    trackColor={{ false: '#CBD5E1', true: palette.accent }}
                    thumbColor={'white'}
                  />
                </View>

              </View>

              {/* 2. FEEDBACK */}
              <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
                <Text style={[styles.title, { color: palette.text }]}>Feedback</Text>
                <SettingRow label="Haptic Feedback" description="Vibrate on interactions" value={hapticsEnabled} onValueChange={setHapticsEnabled} />
                <SettingRow label="Completion Sound" description="Play a chime when timer finishes" value={soundEnabled} onValueChange={setSoundEnabled} />
                <SettingRow label="Preserve Timer" description="Keep time when saving draft" value={preserveTimerProgress} onValueChange={setPreserveTimerProgress} />
              </View>

              {/* 3. WRITING MODES */}
              <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
                <Text style={[styles.title, { color: palette.text }]}>Writing Modes</Text>
                <SettingRow label="Gratitude Mode" description="Always show gratitude prompts" value={gratitudeModeEnabled} onValueChange={setGratitudeModeEnabled} />
              </View>

              {/* 4. NOTIFICATIONS (Smart Reminders) */}
              <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border, marginTop: 14 }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <Bell size={18} color={palette.accent} />
                  <Text style={[styles.title, { color: palette.text, marginBottom: 0 }]}>Notifications</Text>
                </View>
                
                <SettingRow 
                  label="Smart Reminders" 
                  description="Auto-schedule based on your peak writing time" 
                  value={smartRemindersEnabled} 
                  onValueChange={async (val) => {
                    setSmartRemindersEnabled(val);
                    if (val) {
                      const entriesList = Object.values(map || {});
                      const analytics = analyzeWritingAnalytics(entriesList);
                      await scheduleSmartReminder(analytics);
                      Alert.alert("Smart Scheduler Active", "We've analyzed your history and set a reminder for your most productive time.");
                    } else {
                      await cancelNotifications();
                    }
                  }} 
                />
              </View>

{/* 4. SESSION SETTINGS */}
              <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
                <Text style={[styles.title, { color: palette.text }]}>Session</Text>
                
                {/* New Caption */}
                <Text style={[styles.description, { color: palette.sub, marginBottom: 16 }]}>
                  Custom durations must be between 5s (min) and 600s (max).
                </Text>

                <Text style={[styles.label, { color: palette.sub, marginBottom: 8 }]}>Writing Duration</Text>
                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
                  {[30, 60, 120, 300].map((s) => (
                    <PremiumPressable key={s} onPress={() => { setWriteDuration(s); setCustomWriteText(String(s)); }} haptic="light" style={[styles.chip, { borderColor: palette.border, backgroundColor: writeDuration === s ? palette.accentSoft : 'transparent' }]}>
                        <Text style={{ color: writeDuration === s ? palette.accent : palette.sub, fontSize: 12 }}>{s < 60 ? `${s}s` : `${s/60}min`}</Text>
                    </PremiumPressable>
                  ))}
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                  <TextInput keyboardType="numeric" placeholder="Custom (5-600s)" placeholderTextColor={palette.sub} value={customWriteText} onChangeText={setCustomWriteText} style={[styles.input, { color: palette.text, borderColor: palette.border, backgroundColor: palette.card }]} />
                  <PremiumPressable onPress={() => { if (!writeInvalid) { setWriteDuration(writeParsed); showToast('Duration updated'); }}} disabled={writeInvalid} style={[styles.applyBtn, { backgroundColor: writeInvalid ? '#CBD5E1' : palette.accent }]}>
                    <Text style={{ color: 'white', fontWeight: '600', fontSize: 12 }}>Apply</Text>
                  </PremiumPressable>
                </View>
                
                <Text style={[styles.label, { color: palette.sub, marginBottom: 8 }]}>Break Duration</Text>
                 <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
                  {[15, 30, 60, 120].map((s) => (
                    <PremiumPressable key={s} onPress={() => { setBreakDuration(s); setCustomBreakText(String(s)); }} haptic="light" style={[styles.chip, { borderColor: palette.border, backgroundColor: breakDuration === s ? palette.accentSoft : 'transparent' }]}>
                        <Text style={{ color: breakDuration === s ? palette.accent : palette.sub, fontSize: 12 }}>{s}s</Text>
                    </PremiumPressable>
                  ))}
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                  <TextInput keyboardType="numeric" placeholder="Custom (5-600s)" placeholderTextColor={palette.sub} value={customBreakText} onChangeText={setCustomBreakText} style={[styles.input, { color: palette.text, borderColor: palette.border, backgroundColor: palette.card }]} />
                  <PremiumPressable onPress={() => { if (!breakInvalid) { setBreakDuration(breakParsed); showToast('Break duration updated'); }}} disabled={breakInvalid} style={[styles.applyBtn, { backgroundColor: breakInvalid ? '#CBD5E1' : palette.accent }]}>
                    <Text style={{ color: 'white', fontWeight: '600', fontSize: 12 }}>Apply</Text>
                  </PremiumPressable>
                </View>

                <Text style={[styles.label, { color: palette.sub, marginBottom: 8 }]}>Total Cycles</Text>
                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
                  {[2, 4, 6].map((cycles) => (
                    <PremiumPressable key={cycles} onPress={() => setTotalCycles(cycles)} haptic="light" style={[styles.chip, { borderColor: palette.border, backgroundColor: totalCycles === cycles ? palette.accentSoft : 'transparent' }]}>
                      <Text style={{ color: totalCycles === cycles ? palette.accent : palette.sub, fontSize: 12 }}>{cycles}</Text>
                    </PremiumPressable>
                  ))}
                </View>
              </View>

{/* 5. DATA & PRIVACY */}
              <View style={[styles.section, { marginTop: 8 }]}>
                <Text style={[styles.sectionTitle, { color: palette.sub }]}>Data & Privacy</Text>
                <View style={[styles.menuGroup, { backgroundColor: palette.card, borderColor: palette.border }]}>
                  
                  {/* CLOUD SAVE (No Caption) */}
                  <PremiumPressable onPress={handleCloudSave} haptic="light" style={[styles.menuItem, { borderBottomWidth: 1, borderBottomColor: palette.border }]}>
                    <View style={styles.menuItemContent}>
                        <Cloud size={20} color={palette.accent} />
                        <View>
                            <Text style={[styles.menuItemTitle, { color: palette.text }]}>Sync to Cloud</Text>
                        </View>
                    </View>
                    <Text style={{ color: palette.subtleText }}>›</Text>
                  </PremiumPressable>

                  {/* CLOUD RESTORE (No Caption) */}
                  <PremiumPressable onPress={handleCloudRestore} haptic="medium" style={[styles.menuItem, { borderBottomWidth: 1, borderBottomColor: palette.border }]}>
                    <View style={styles.menuItemContent}>
                        <CloudDownload size={20} color={palette.accent} />
                        <View>
                            <Text style={[styles.menuItemTitle, { color: palette.text }]}>Restore from Cloud</Text>
                        </View>
                    </View>
                    <Text style={{ color: palette.subtleText }}>›</Text>
                  </PremiumPressable>

                  {/* Smart Reminders Toggle */}
          <View style={[styles.optionRow, { marginTop: 12 }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.optionLabel, { color: palette.text }]}>Smart Reminders 🧠</Text>
              <Text style={[styles.optionSubLabel, { color: palette.subtleText }]}>
                Auto-schedule based on when you write most
              </Text>
            </View>
            <Switch
              value={smartRemindersEnabled}
              onValueChange={async (val) => {
                setSmartRemindersEnabled(val);
                if (val) {
                  // Calculate analytics on the fly and schedule
                  const entriesList = Object.values(entriesMap || {});
                  const analytics = analyzeWritingAnalytics(entriesList);
                  await scheduleSmartReminder(analytics);
                  Alert.alert("Smart Scheduler Active", "We've set your reminder to your most productive time.");
                } else {
                  await cancelNotifications();
                }
              }}
              trackColor={{ false: palette.border, true: palette.accent }}
              thumbColor={'white'}
            />
          </View>

                  {/* THERAPIST REPORT */}
                  <PremiumPressable onPress={generateTherapistReport} style={[styles.menuItem, { borderBottomWidth: 1, borderBottomColor: palette.border }]}>
                    <View style={styles.menuItemContent}>
                      <FileText size={20} color={palette.accent} />
                      <View><Text style={[styles.menuItemTitle, { color: palette.text }]}>Therapist Report</Text></View>
                    </View>
                    <Text style={{ color: palette.subtleText }}>›</Text>
                  </PremiumPressable>

                  {/* BACKUP DATA (Local) */}
                  <PremiumPressable onPress={handleBackup} style={[styles.menuItem, { borderBottomWidth: 1, borderBottomColor: palette.border }]}>
                    <View style={styles.menuItemContent}>
                      <Database size={20} color={palette.accent} />
                      <View><Text style={[styles.menuItemTitle, { color: palette.text }]}>Backup Data</Text></View>
                    </View>
                    <Text style={{ color: palette.subtleText }}>›</Text>
                  </PremiumPressable>

                  {/* RESTORE BACKUP (Local) */}
                  <PremiumPressable onPress={handleRestore} style={[styles.menuItem, { borderBottomWidth: 1, borderBottomColor: palette.border }]}>
                    <View style={styles.menuItemContent}>
                      <RotateCcw size={20} color={palette.accent} />
                      <View><Text style={[styles.menuItemTitle, { color: palette.text }]}>Restore Backup</Text></View>
                    </View>
                    <Text style={{ color: palette.subtleText }}>›</Text>
                  </PremiumPressable>

                  {/* EXPORT */}
                  <PremiumPressable onPress={exportAllEntries} style={styles.menuItem}>
                    <View style={styles.menuItemContent}>
                      <Share size={20} color={palette.accent} />
                      <View><Text style={[styles.menuItemTitle, { color: palette.text }]}>Export as Text</Text></View>
                    </View>
                    <Text style={{ color: palette.subtleText }}>›</Text>
                  </PremiumPressable>

                </View>
              </View>

              {/* 6. DANGER */}
              <View style={{ marginTop: 12, marginBottom: 40 }}>
                <PremiumPressable onPress={handleFactoryReset} style={{ backgroundColor: isDark ? 'rgba(239, 68, 68, 0.1)' : '#FEF2F2', borderColor: isDark ? 'rgba(239, 68, 68, 0.3)' : '#FCA5A5', borderWidth: 1, borderRadius: 16, padding: 16, alignItems: 'center' }}>
                  <Text style={{ color: isDark ? '#F87171' : '#DC2626', fontWeight: '700' }}>Reset App & Clear All Data</Text>
                </PremiumPressable>
              </View>

            </ScrollView>

            <DateTimePickerModal isVisible={pickerVisible} mode="time" onConfirm={(value) => { const formatted = formatTime(value); if (activePicker === "sunrise") useTheme.getState().setDynamicSunrise(formatted); else if (activePicker === "sunset") useTheme.getState().setDynamicSunset(formatted); setPickerVisible(false); }} onCancel={() => setPickerVisible(false)} />
            <Animated.View style={[styles.toast, premiumToastStyle, { backgroundColor: isDark ? 'rgba(17, 24, 39, 0.95)' : 'rgba(255, 255, 255, 0.95)', borderColor: palette.accent + '40' }]}><Text style={[styles.toastText, { color: palette.text }]}>{toastMsg}</Text></Animated.View>

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
  toast: { position: 'absolute', bottom: 30, left: 20, right: 20, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 16, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3, zIndex: 1000 },
  toastText: { fontWeight: '600', textAlign: 'center', fontSize: 14 },
  dropdownHeader: { paddingVertical: 12, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
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