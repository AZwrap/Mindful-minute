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
  Platform,
  LayoutAnimation,
  UIManager,
  Keyboard
} from 'react-native';
import * as Haptics from 'expo-haptics';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';
import * as Updates from 'expo-updates';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { 
  Trash2, Save, FileText, Database, RotateCcw, Share, 
  ChevronDown, ChevronUp, Palette, Cloud, CloudDownload, Bell, Lock, Zap, Volume2, Sun, Moon
} from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Stores & Config
import { useSettings } from "../stores/settingsStore";
import { useEntriesStore } from "../stores/entriesStore";
import { useJournalStore } from '../stores/journalStore';
import { useTheme, ThemeType } from "../stores/themeStore";
import { useWritingSettings } from "../stores/writingSettingsStore";
import { saveBackupToCloud, restoreBackupFromCloud } from '../services/cloudBackupService';
import { analyzeWritingAnalytics } from '../constants/writingAnalytics';
import { scheduleDailyReminder } from '../lib/notifications'; // Removed runNotificationTest/cancelNotifications if not exported in your lib
import { RootStackParamList } from '../navigation/RootStack';
import { useSharedPalette } from '../hooks/useSharedPalette';

// Components
import PremiumPressable from '../components/PremiumPressable';
import SunTimesSelector from '../components/SunTimesSelector';

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

type Props = NativeStackScreenProps<RootStackParamList, 'Settings'>;

export default function SettingsScreen({ navigation }: Props) {
  const systemScheme = useColorScheme();
  const { getCurrentTheme } = useTheme();
  const currentTheme = getCurrentTheme(systemScheme);
  const isDark = currentTheme === 'dark';
  const palette = useSharedPalette();
  
  const loaded = useSettings((s) => s.loaded);
  
  // Store Hooks
  const { 
    showTimer, setShowTimer,
    writeDuration, breakDuration, totalCycles,
    setWriteDuration, setBreakDuration, setTotalCycles,
  } = useWritingSettings();

  const { 
    hapticsEnabled, setHapticsEnabled,
    soundEnabled, setSoundEnabled,
    preserveTimerProgress, setPreserveTimerProgress,
    gratitudeModeEnabled, setGratitudeModeEnabled,
    isBiometricsEnabled, setIsBiometricsEnabled,
    smartRemindersEnabled, setSmartRemindersEnabled 
  } = useSettings();

  const entriesMap = useEntriesStore((s) => s.entries);
  
// Local UI State
  const [themeDropdownOpen, setThemeDropdownOpen] = useState(false); 
  const [accentDropdownOpen, setAccentDropdownOpen] = useState(false);
  const [customHex, setCustomHex] = useState(accentColor || '#6366F1'); // NEW
  
  const [customWriteText, setCustomWriteText] = useState(String(writeDuration ?? 60));
  const [customBreakText, setCustomBreakText] = useState(String(breakDuration ?? 30));
  const [toastMsg, setToastMsg] = useState('');
  
  const contentFadeAnim = useRef(new Animated.Value(0)).current;
  const toastAnim = useRef(new Animated.Value(0)).current;

  const {
    theme, setTheme,
    setDynamicSunrise, setDynamicSunset,
    sunriseTime, sunsetTime,
    accentColor, setAccentColor
  } = useTheme();

// --- EFFECTS ---
  useEffect(() => {
    if (loaded) {
      Animated.timing(contentFadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    }
  }, [loaded]);

  // Sync custom hex input when color changes
  useEffect(() => {
    if (accentColor) setCustomHex(accentColor.toUpperCase());
  }, [accentColor]);

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
    return Object.entries(entriesMap || {}).sort((a, b) => (a[0] < b[0] ? 1 : -1))
      .map(([date, entry]) => ({ date, ...entry }));
  }, [entriesMap]);

  // --- ACTIONS ---
  const showToast = (msg: string) => {
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
               await AsyncStorage.clear();
               
               // Reset Stores
               useEntriesStore.setState({ entries: {}, drafts: {} });
               useSettings.setState({ hasOnboarded: false, isBiometricsEnabled: false });
               useJournalStore.setState({ sharedEntries: {}, journalInfo: null });
               
               try {
                 await Updates.reloadAsync();
               } catch (e) {
                 if (NativeModules.DevSettings) {
                    NativeModules.DevSettings.reload();
                 } else {
                    navigation.reset({ index: 0, routes: [{ name: 'Onboarding' }] });
                 }
               }
             } catch (e) {
               Alert.alert("Error", "Failed to reset data.");
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
                Updates.reloadAsync();
            } else {
                Alert.alert("Error", "Could not find backup or download failed.");
            }
          } 
        }
      ]
    );
  };

  const generateTherapistReport = () => Alert.alert("Report", "Feature coming soon.");

  // --- UI COMPONENTS ---

const SettingRow = ({ label, description, value, onValueChange, icon }: any) => (
    <View style={styles.row}>
      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, marginRight: 16 }}>
         {icon && <View style={{ width: 24 }}>{icon}</View>}
         <View style={styles.settingTexts}>
            <Text style={[styles.label, { color: palette.text }]}>{label}</Text>
            {description && <Text style={[styles.description, { color: palette.sub }]}>{description}</Text>}
         </View>
      </View>
      <Switch 
        value={value} 
        onValueChange={onValueChange} 
        thumbColor={'#FFFFFF'} 
        trackColor={{ false: '#CBD5E1', true: palette.accent }} 
      />
    </View>
  );

  const gradients = {
    dark: { primary: ['#0F172A', '#1E293B', '#334155'] },
    light: { primary: ['#F8FAFC', '#F1F5F9', '#E2E8F0'] },
  };
  const currentGradient = gradients[currentTheme === 'dark' ? 'dark' : 'light'];

  return (
    <View style={{ flex: 1, backgroundColor: palette.bg }}>
      <LinearGradient
        colors={currentGradient.primary}
        style={styles.container}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      >
        <SafeAreaView style={{ flex: 1 }} edges={['top']}>
          <Animated.View style={{ opacity: contentFadeAnim, flex: 1 }}>
            
            <ScrollView 
              style={styles.container} 
              contentContainerStyle={[styles.scrollContent, { flexGrow: 1 }]} // FIXED: Ensures full height
              showsVerticalScrollIndicator={false}
            >
              
              {/* 1. APPEARANCE CARD */}
              <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border, paddingBottom: 12 }]}>
                <Text style={[styles.title, { color: palette.text }]}>Appearance</Text>
                <SettingRow 
                    label="Show Timer" 
                    value={showTimer} 
                    onValueChange={setShowTimer} 
                    icon={<RotateCcw size={18} color={palette.sub} />}
                />
                
                {/* THEME DROPDOWN */}
                <View style={{ marginTop: 12 }}>
                    <Text style={[styles.label, { color: palette.text, marginBottom: 8 }]}>Theme</Text>
                    <Pressable 
                        onPress={toggleThemeDropdown}
                        style={[styles.dropdownHeader, { backgroundColor: isDark ? "#1F2937" : "#F3F4F6", borderColor: palette.border }]}
                    >
                        <Text style={{ fontSize: 15, fontWeight: "600", color: palette.text }}>
                            {theme ? theme.charAt(0).toUpperCase() + theme.slice(1) : 'System'}
                        </Text>
                        {themeDropdownOpen ? <ChevronUp size={16} color={palette.sub} /> : <ChevronDown size={16} color={palette.sub} />}
                    </Pressable>

                    {themeDropdownOpen && (
                        <View style={{ marginTop: 6, borderRadius: 12, borderWidth: 1, borderColor: palette.border, overflow: 'hidden' }}>
                            {["light", "dark", "system", "dynamic"].map((opt) => (
                                <Pressable
                                    key={opt}
                                    onPress={() => { setTheme(opt as ThemeType); toggleThemeDropdown(); }}
                                    style={({ pressed }) => ({
                                        paddingVertical: 12, paddingHorizontal: 16,
                                        backgroundColor: pressed ? (isDark ? '#374151' : '#E5E7EB') : 'transparent'
                                    })}
                                >
                                    <Text style={{ fontSize: 14, fontWeight: '600', color: palette.text }}>
                                        {opt.charAt(0).toUpperCase() + opt.slice(1)}
                                    </Text>
                                </Pressable>
                            ))}
                        </View>
                    )}
                </View>

                {/* Dynamic Times */}
                {theme === "dynamic" && (
                   <View style={{ marginTop: 12 }}>
                     <Text style={{ color: palette.subtleText, fontSize: 12, marginBottom: 8 }}>Auto-switch based on:</Text>
                     <SunTimesSelector 
                       sunrise={sunriseTime} 
                       sunset={sunsetTime} 
                       onUpdate={(type, time) => type === 'sunrise' ? setDynamicSunrise(time) : setDynamicSunset(time)} 
                     />
                   </View>
                )}

{/* ACCENT COLOR */}
                <View style={{ marginTop: 16, zIndex: 10 }}>
                    <Pressable 
                      onPress={toggleAccentDropdown}
                      style={[
                        styles.dropdownHeader,
                        {
                          backgroundColor: isDark ? "#1F2937" : "#F3F4F6",
                          borderColor: palette.border,
                          flexDirection: 'row', 
                          justifyContent: 'space-between', 
                          alignItems: 'center'
                        },
                      ]}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Palette size={16} color={palette.sub} />
                        <Text style={{ fontSize: 15, fontWeight: "600", color: palette.text }}>Accent Color</Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          {!accentDropdownOpen && (
                            <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: accentColor || '#6366F1' }} />
                          )}
                          {accentDropdownOpen ? <ChevronUp size={16} color={palette.sub} /> : <ChevronDown size={16} color={palette.sub} />}
                      </View>
                    </Pressable>

{accentDropdownOpen && (
                      <View style={[styles.colorGrid, { backgroundColor: isDark ? "#1E293B" : "#F9FAFB", borderColor: palette.border }]}>
                        <Text style={{ color: palette.sub, fontSize: 12, marginBottom: 8, fontWeight: '600' }}>Select Color</Text>
                        <View style={{ height: 40, borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: palette.border }}>
                          <Pressable
                            style={{ flex: 1 }}
                            onTouchStart={(e) => {
                              const width = 300; // Approx interactive width
                              const x = e.nativeEvent.locationX;
                              const hue = Math.max(0, Math.min(360, (x / width) * 360));
                              const color = hslToHex(hue, 100, 50);
                              setAccentColor(color);
                              if (hapticsEnabled) Haptics.selectionAsync();
                            }}
                          >
                            <LinearGradient
                              colors={[
                                '#FF0000', '#FF7F00', '#FFFF00', '#00FF00', 
                                '#00FFFF', '#0000FF', '#8B00FF', '#FF0000'
                              ]}
                              start={{ x: 0, y: 0 }}
                              end={{ x: 1, y: 0 }}
                              style={{ flex: 1 }}
                            />
                          </Pressable>
                        </View>
                      </View>

{/* 2. FEEDBACK CARD */}
              <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
                <Text style={[styles.title, { color: palette.text }]}>Feedback</Text>
                <SettingRow 
                    label="Haptic Feedback" 
                    value={hapticsEnabled} 
                    onValueChange={setHapticsEnabled} 
                />
                <SettingRow 
                    label="Completion Sound" 
                    value={soundEnabled} 
                    onValueChange={setSoundEnabled} 
                />
              </View>

              {/* 3. SECURITY CARD */}
              <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
                <Text style={[styles.title, { color: palette.text }]}>Security</Text>
                <SettingRow 
                    label="Biometric Lock" 
                    value={isBiometricsEnabled} 
                    onValueChange={(val: boolean) => { setIsBiometricsEnabled(val); if (val && hapticsEnabled) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); }} 
                />
              </View>

              {/* 3. SESSION SETTINGS */}
              <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
                <Text style={[styles.title, { color: palette.text }]}>Session Configuration</Text>
                
                <Text style={[styles.label, { color: palette.sub, marginBottom: 8 }]}>Writing Duration</Text>
                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                  {[30, 60, 120, 300].map((s) => (
                    <PremiumPressable key={s} onPress={() => { setWriteDuration(s); setCustomWriteText(String(s)); }} haptic="light" style={[styles.chip, { borderColor: palette.border, backgroundColor: writeDuration === s ? palette.accentSoft : 'transparent' }]}>
                        <Text style={{ color: writeDuration === s ? palette.accent : palette.sub, fontSize: 12 }}>{s < 60 ? `${s}s` : `${s/60}m`}</Text>
                    </PremiumPressable>
                  ))}
                </View>
                
<View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                  <TextInput keyboardType="numeric" placeholder="Custom (5-600s)" placeholderTextColor={palette.sub} value={customWriteText} onChangeText={setCustomWriteText} style={[styles.input, { color: palette.text, borderColor: palette.border, backgroundColor: palette.bg }]} />
                  <PremiumPressable onPress={() => { if (!writeInvalid) { setWriteDuration(writeParsed); showToast('Duration updated'); }}} disabled={writeInvalid} style={[styles.applyBtn, { backgroundColor: writeInvalid ? '#CBD5E1' : palette.accent }]}>
                    <Text style={{ color: 'white', fontWeight: '600', fontSize: 12 }}>Set</Text>
                  </PremiumPressable>
                </View>

                <Text style={[styles.label, { color: palette.sub, marginBottom: 8 }]}>Break Duration</Text>
                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                  {[30, 60, 120].map((s) => (
                    <PremiumPressable key={s} onPress={() => { setBreakDuration(s); setCustomBreakText(String(s)); }} haptic="light" style={[styles.chip, { borderColor: palette.border, backgroundColor: breakDuration === s ? palette.accentSoft : 'transparent' }]}>
                        <Text style={{ color: breakDuration === s ? palette.accent : palette.sub, fontSize: 12 }}>{s < 60 ? `${s}s` : `${s/60}m`}</Text>
                    </PremiumPressable>
                  ))}
                </View>
                
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                  <TextInput keyboardType="numeric" placeholder="Custom (5-600s)" placeholderTextColor={palette.sub} value={customBreakText} onChangeText={setCustomBreakText} style={[styles.input, { color: palette.text, borderColor: palette.border, backgroundColor: palette.bg }]} />
                  <PremiumPressable onPress={() => { if (!breakInvalid) { setBreakDuration(breakParsed); showToast('Break updated'); }}} disabled={breakInvalid} style={[styles.applyBtn, { backgroundColor: breakInvalid ? '#CBD5E1' : palette.accent }]}>
                    <Text style={{ color: 'white', fontWeight: '600', fontSize: 12 }}>Set</Text>
                  </PremiumPressable>
                </View>

                <Text style={{ fontSize: 12, color: palette.sub, marginBottom: 12, fontStyle: 'italic' }}>
                  * Custom duration limits: 5s minimum, 600s maximum.
                </Text>

<Text style={[styles.label, { color: palette.sub, marginBottom: 8 }]}>Total Cycles</Text>
                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
                  {[2, 4, 6].map((cycles) => {
                    const isSelected = totalCycles === cycles;
                    return (
                      <PremiumPressable 
                        key={cycles} 
                        onPress={() => setTotalCycles(cycles)} 
                        haptic="light" 
                        style={[
                          styles.chip, 
                          { 
                            // Solid fill when selected for better visibility
                            backgroundColor: isSelected ? palette.accent : 'transparent',
                            borderColor: isSelected ? palette.accent : palette.border 
                          }
                        ]}
                      >
                        <Text style={{ 
                          color: isSelected ? 'white' : palette.sub, 
                          fontSize: 12,
                          fontWeight: isSelected ? '700' : '400'
                        }}>
                          {cycles}
                        </Text>
                      </PremiumPressable>
                    );
                  })}
                </View>

                <SettingRow 
                    label="Gratitude Mode" 
                    description="Always show gratitude prompts"
                    value={gratitudeModeEnabled} 
                    onValueChange={setGratitudeModeEnabled} 
                />
              </View>

              {/* 4. NOTIFICATIONS */}
              <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <Bell size={18} color={palette.accent} />
                  <Text style={[styles.title, { color: palette.text, marginBottom: 0 }]}>Notifications</Text>
                </View>
                
                <SettingRow 
                  label="Smart Reminders" 
                  description="Nudge at your most productive time" 
                  value={smartRemindersEnabled} 
                  onValueChange={async (val: boolean) => {
                    setSmartRemindersEnabled(val);
                    if (val) {
                      const entriesList = Object.values(entriesMap || {});
                      const analytics = analyzeWritingAnalytics(entriesList);
                      // Default to 20:00 if no analytics
                      const hour = analytics?.timeStats?.mostActive === "Morning" ? 8 : 20;
                      await scheduleDailyReminder(hour, 0);
                      Alert.alert("Smart Scheduler", `Reminder set for ${hour}:00 based on your habits.`);
                    } else {
                      // await cancelNotifications(); 
                    }
                  }} 
                />
              </View>

              {/* 5. DATA & PRIVACY */}
              <View style={[styles.section, { marginTop: 8 }]}>
                <Text style={[styles.sectionTitle, { color: palette.sub }]}>Data & Privacy</Text>
                <View style={[styles.menuGroup, { backgroundColor: palette.card, borderColor: palette.border }]}>
                  
                  <PremiumPressable onPress={handleCloudSave} haptic="light" style={[styles.menuItem, { borderBottomWidth: 1, borderBottomColor: palette.border }]}>
                    <View style={styles.menuItemContent}>
                        <Cloud size={20} color={palette.accent} />
                        <Text style={[styles.menuItemTitle, { color: palette.text }]}>Sync to Cloud</Text>
                    </View>
                    <Text style={{ color: palette.subtleText }}>›</Text>
                  </PremiumPressable>

                  <PremiumPressable onPress={handleCloudRestore} haptic="medium" style={[styles.menuItem, { borderBottomWidth: 1, borderBottomColor: palette.border }]}>
                    <View style={styles.menuItemContent}>
                        <CloudDownload size={20} color={palette.accent} />
                        <Text style={[styles.menuItemTitle, { color: palette.text }]}>Restore from Cloud</Text>
                    </View>
                    <Text style={{ color: palette.subtleText }}>›</Text>
                  </PremiumPressable>

                  <PremiumPressable onPress={generateTherapistReport} style={[styles.menuItem, { borderBottomWidth: 1, borderBottomColor: palette.border }]}>
                    <View style={styles.menuItemContent}>
                      <FileText size={20} color={palette.accent} />
                      <Text style={[styles.menuItemTitle, { color: palette.text }]}>Therapist Report</Text>
                    </View>
                    <Text style={{ color: palette.subtleText }}>›</Text>
                  </PremiumPressable>

                  <PremiumPressable onPress={handleBackup} style={[styles.menuItem, { borderBottomWidth: 1, borderBottomColor: palette.border }]}>
                    <View style={styles.menuItemContent}>
                      <Database size={20} color={palette.accent} />
                      <Text style={[styles.menuItemTitle, { color: palette.text }]}>Backup Data (Local)</Text>
                    </View>
                    <Text style={{ color: palette.subtleText }}>›</Text>
                  </PremiumPressable>

                  <PremiumPressable onPress={handleRestore} style={[styles.menuItem, { borderBottomWidth: 1, borderBottomColor: palette.border }]}>
                    <View style={styles.menuItemContent}>
                      <RotateCcw size={20} color={palette.accent} />
                      <Text style={[styles.menuItemTitle, { color: palette.text }]}>Restore Backup (Local)</Text>
                    </View>
                    <Text style={{ color: palette.subtleText }}>›</Text>
                  </PremiumPressable>

                  <PremiumPressable onPress={exportAllEntries} style={styles.menuItem}>
                    <View style={styles.menuItemContent}>
                      <Share size={20} color={palette.accent} />
                      <Text style={[styles.menuItemTitle, { color: palette.text }]}>Export as Text</Text>
                    </View>
                    <Text style={{ color: palette.subtleText }}>›</Text>
                  </PremiumPressable>

                </View>
              </View>

              {/* 6. DANGER ZONE */}
              <View style={{ marginTop: 12, marginBottom: 80 }}>
                <PremiumPressable 
                  onPress={handleFactoryReset} 
                  style={{ 
                    backgroundColor: isDark ? 'rgba(239, 68, 68, 0.1)' : '#FEF2F2', 
                    borderColor: isDark ? 'rgba(239, 68, 68, 0.3)' : '#FCA5A5', 
                    borderWidth: 1, 
                    borderRadius: 16, 
                    padding: 16, 
                    alignItems: 'center' 
                  }}
                >
                  <Text style={{ color: isDark ? '#F87171' : '#DC2626', fontWeight: '700' }}>
                    Reset App & Clear All Data
                  </Text>
                </PremiumPressable>
              </View>

            </ScrollView>

            {/* Toast Overlay */}
            <Animated.View style={[
                styles.toast, 
                { 
                   transform: [{ translateY: toastAnim.interpolate({ inputRange: [0, 1], outputRange: [100, 0] }) }],
                   opacity: toastAnim,
                   backgroundColor: isDark ? 'rgba(17, 24, 39, 0.95)' : 'rgba(255, 255, 255, 0.95)', 
                   borderColor: palette.accent 
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

// Helper: Convert HSL to Hex
function hslToHex(h: number, s: number, l: number) {
  l /= 100;
  const a = s * Math.min(l, 1 - l) / 100;
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`.toUpperCase();
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 16, gap: 14, paddingBottom: 100 },
  card: { borderWidth: 1, borderRadius: 16, padding: 16, marginBottom: 4 },
  title: { fontSize: 16, fontWeight: '700', marginBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12 },
  settingTexts: { flex: 1, marginRight: 8 },
  label: { fontSize: 15, fontWeight: '600', marginBottom: 2 },
  description: { fontSize: 13, lineHeight: 16 },
  chip: { borderWidth: 1, borderRadius: 8, paddingVertical: 6, paddingHorizontal: 12, minWidth: 48, alignItems: 'center' },
  input: { flexGrow: 0, minWidth: 110, borderWidth: 1, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 10, fontSize: 14 },
  applyBtn: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10 },
  toast: { position: 'absolute', bottom: 40, left: 20, right: 20, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 16, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3, zIndex: 9999, alignItems: 'center' },
  toastText: { fontWeight: '600', fontSize: 14 },
  dropdownHeader: { paddingVertical: 12, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  colorGrid: { marginTop: 8, padding: 12, borderRadius: 12, borderWidth: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'center' },
  colorDot: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 3 },
  section: { marginBottom: 12 },
  sectionTitle: { fontSize: 12, fontWeight: '700', marginBottom: 8, marginLeft: 4, textTransform: 'uppercase', letterSpacing: 1 },
  menuGroup: { borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  menuItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 16, paddingHorizontal: 16 },
  menuItemContent: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  menuItemTitle: { fontSize: 15, fontWeight: '600' },
});