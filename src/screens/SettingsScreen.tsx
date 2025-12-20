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
  NativeModules,
Platform,
  LayoutAnimation,
UIManager,
  Keyboard,
  Linking,
  Image, // <--- Added
  TouchableOpacity // <--- Added
} from 'react-native';
import { useUIStore } from '../stores/uiStore';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker'; // <--- Added
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';
import * as Updates from 'expo-updates';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { 
Trash2, Save, FileText, Database, RotateCcw, Share, LogOut,
ChevronDown, ChevronUp, Palette, Cloud, CloudDownload, Bell, Lock, Zap, Volume2, Sun, Moon, User,
MessageSquare, Gift, UserX, Shield
} from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { updateProfile, signOut } from 'firebase/auth';
import { auth } from '../firebaseConfig';

// Stores & Config
import { useSettings } from "../stores/settingsStore";
import { useEntriesStore } from "../stores/entriesStore";
import { useJournalStore } from '../stores/journalStore';
import { useTheme, ThemeType } from "../stores/themeStore";
import { useWritingSettings } from "../stores/writingSettingsStore";
import { updateUserNameInJournals } from '../services/syncedJournalService'; // <--- Added
import { saveBackupToCloud, restoreBackupFromCloud } from '../services/cloudBackupService';
import { updateUserPhotoInJournals } from '../services/syncedJournalService'; // <--- Added
import { MediaService } from '../services/mediaService'; // <--- Added
import { analyzeWritingAnalytics } from '../constants/writingAnalytics';
import { scheduleDailyReminder, cancelDailyReminders } from '../lib/notifications'; 
import { exportBulkEntries } from '../utils/exportHelper';
import DateTimePickerModal from "react-native-modal-datetime-picker";
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
  const { showAlert } = useUIStore();
  const { getCurrentTheme } = useTheme();
  const currentTheme = getCurrentTheme(systemScheme);
  const isDark = currentTheme === 'dark';
  const palette = useSharedPalette();

  // FIX: Get Store actions via Hook (Prevents "undefined" error)
  const updateJournalMeta = useJournalStore(state => state.updateJournalMeta);
  const allJournals = useJournalStore(state => state.journals);
  
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
    zenModeEnabled, setZenModeEnabled,
    isBiometricsEnabled, setIsBiometricsEnabled,
smartRemindersEnabled, setSmartRemindersEnabled,
    reminderTime, setReminderTime,
    isPremium // <--- Get isPremium
  } = useSettings();

  const entriesMap = useEntriesStore((s) => s.entries);
  
// Local UI State
  const [isTimePickerVisible, setTimePickerVisibility] = useState(false);
  const [themeDropdownOpen, setThemeDropdownOpen] = useState(false);
  const [accentDropdownOpen, setAccentDropdownOpen] = useState(false);
  // Track hue (0-360) and lightness (0-100) for the sliders
  const [hue, setHue] = useState(0); 
  const [lightness, setLightness] = useState(50);
  const [sliderWidth, setSliderWidth] = useState(0); // Track exact width for touch calc
  
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

// --- PROFILE STATE ---
  const [displayName, setDisplayName] = useState(auth.currentUser?.displayName || '');
  const [photoUrl, setPhotoUrl] = useState(auth.currentUser?.photoURL || null); 
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

// Load local avatar override (Unique to this user)
  React.useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (uid) {
      AsyncStorage.getItem(`user_avatar_${uid}`).then(local => {
         if (local) setPhotoUrl(local);
         else setPhotoUrl(null); // Reset if no local photo found for this user
      });
    }
  }, []);

const handlePickAvatar = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        // FIX 1: New array syntax to remove deprecation warning
        mediaTypes: ['images'], 
        allowsEditing: true,
        aspect: [1, 1],
        // FIX 2: Lower quality to 0.2 to keep Base64 string small for Firestore
        quality: 0.2, 
      });

      if (!result.canceled && result.assets[0].uri) {
         setPhotoUrl(result.assets[0].uri); 
      }
    } catch (e) {
      console.error("Pick Avatar Error:", e);
      showAlert("Error", "Could not pick image.");
    }
  };

  const handleUpdateProfile = async () => {
    if (!auth.currentUser) {
      showAlert("Not Signed In", "You must be signed in to set a profile name.");
      return;
    }
    if (!displayName.trim()) return;

setIsUpdatingProfile(true);
    try {
      let finalPhotoUrl = auth.currentUser?.photoURL;

      // 1. Process Photo if changed (if it's not an http link, it's a local URI or base64)
      // We check if it starts with 'file://' (local) or if it's different from current
      if (photoUrl && photoUrl !== auth.currentUser?.photoURL) {
          // If it's already a web URL, ignore. If it's local file, convert.
          if (!photoUrl.startsWith('http')) {
             const uploaded = await MediaService.uploadImage(photoUrl);
             if (uploaded) finalPhotoUrl = uploaded;
          }
      }

// 2. Update Auth Profile (Name Only)
      // Note: We DO NOT save photoURL here because Base64 is too long for Firebase Auth.
      await updateProfile(auth.currentUser, { 
          displayName: displayName.trim()
      });

// 3. Save Photo Locally & Sync to Shared Journals
      if (finalPhotoUrl) {
          const uid = auth.currentUser?.uid;
          if (uid) {
            await AsyncStorage.setItem(`user_avatar_${uid}`, finalPhotoUrl);
            
            // A. Update Cloud (Firestore)
            await updateUserPhotoInJournals(uid, finalPhotoUrl);

// B. Update Local App State
            // We use the variables from the hook we defined at the top
            Object.values(allJournals).forEach(j => {
                // If I am a member, update my photo in this journal locally
                if (j.memberIds?.includes(uid)) {
                     const newPhotos = { ...(j.memberPhotos || {}), [uid]: finalPhotoUrl };
                     // Check if function exists before calling
                     if (updateJournalMeta) {
                        updateJournalMeta(j.id, { memberPhotos: newPhotos });
                     }
                }
            });
          }
      }

      showToast('Profile Updated');
      Keyboard.dismiss();
    } catch (e) {
      console.error("Profile Update Error:", e);
      showAlert("Error", "Failed to update profile.");
      const handleConfirmTime = async (date: Date) => {
    const h = date.getHours();
    const m = date.getMinutes();
    setReminderTime(h, m);
    setTimePickerVisibility(false);
    
    if (smartRemindersEnabled) {
      await scheduleDailyReminder(h, m);
      showToast(`Reminder set for ${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
    }
  };

  const handleToggleReminders = async (val: boolean) => {
     setSmartRemindersEnabled(val);
     if (val) {
       // Use stored time or default to 20:00
       const { hour, minute } = reminderTime || { hour: 20, minute: 0 };
       await scheduleDailyReminder(hour, minute);
       showToast("Daily reminders enabled");
     } else {
       await cancelDailyReminders();
     }
  };
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleConfirmTime = async (date: Date) => {
    const h = date.getHours();
    const m = date.getMinutes();
    setReminderTime(h, m);
    setTimePickerVisibility(false);
    
    if (smartRemindersEnabled) {
      await scheduleDailyReminder(h, m);
      showToast(`Reminder set for ${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
    }
  };

  const handleToggleReminders = async (val: boolean) => {
     setSmartRemindersEnabled(val);
     if (val) {
       // Use stored time or default to 20:00
       const { hour, minute } = reminderTime || { hour: 20, minute: 0 };
       await scheduleDailyReminder(hour, minute);
       showToast("Daily reminders enabled");
     } else {
       await cancelDailyReminders();
     }
  };

// --- EFFECTS ---
  useEffect(() => {
    if (loaded) {
      Animated.timing(contentFadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    }
  }, [loaded]);

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

const handleBulkExport = () => {
    showAlert(
      "Export All Data",
      "Choose a format for your journal export:",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "PDF Document", 
          onPress: () => exportBulkEntries(entries, 'pdf') 
        },
        { 
          text: "CSV (Excel)", 
          onPress: () => exportBulkEntries(entries, 'csv') 
        },
        { 
          text: "JSON (Backup)", 
          onPress: () => exportBulkEntries(entries, 'json') 
        }
      ]
    );
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
            showAlert("Success", "Data restored!");
        }
     } catch (e) { showAlert("Error", "Failed to restore data."); }
  };

const handleLogout = () => {
    showAlert(
      "Log Out",
      "Are you sure you want to sign out?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Log Out", 
          style: "destructive", 
          onPress: async () => {
            try {
              // 1. Reset Global Stores (Clears Shared Journals & Entries from memory)
              useJournalStore.getState().reset();
              
              // 2. Clear Private Entries (Prevents data leak between accounts)
              useEntriesStore.setState({ 
                 entries: {}, 
                 drafts: {},
                 draftTimers: {},
                 pomodoroState: {}
              });

              // 3. Clear Settings/State if desired (Optional, but safer)
              useSettings.setState({ isBiometricsEnabled: false });

              // 4. Sign Out of Firebase
              await signOut(auth);

              // 5. Navigate away
              navigation.reset({
                index: 0,
                routes: [{ name: 'Auth' }],
              });
            } catch (e) {
              console.error(e);
              showAlert("Error", "Failed to log out.");
            }
          }
        }
      ]
    );
  };

  const handleFactoryReset = () => {
    showAlert(
      "Factory Reset",
      "This will permanently delete ALL entries. Are you sure?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset Everything",
          style: "destructive",
onPress: async () => {
             try {
               // 1. Sign out explicitly so cloud data doesn't auto-restore on reload
               try { await signOut(auth); } catch (e) { console.log('Already signed out'); }

               await AsyncStorage.clear();
               
               // Reset Stores - Explicitly clear timers and pomodoro state to prevent ghosting
               useEntriesStore.setState({ 
                 entries: {},
                 drafts: {}, 
                 draftTimers: {}, 
                 pomodoroState: {} 
               });
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
showAlert("Error", "Failed to reset data.");
             }
          }
        }
      ]
    );
  };

  const handleDeleteAccount = () => {
    showAlert(
      "Delete Account",
      "This will permanently delete your account and all cloud data. This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete Forever", 
          style: "destructive", 
          onPress: async () => {
            const user = auth.currentUser;
            if (!user) return;
            
            try {
              await deleteUser(user);
              
              // Clear local data (same as factory reset)
              await AsyncStorage.clear();
              useEntriesStore.setState({ 
                 entries: {},
                 drafts: {}, 
                 draftTimers: {}, 
                 pomodoroState: {} 
               });
               useSettings.setState({ hasOnboarded: false, isBiometricsEnabled: false });
               useJournalStore.setState({ sharedEntries: {}, journalInfo: null });
               
               // Navigate to Auth
               navigation.reset({ index: 0, routes: [{ name: 'Auth' }] });
            } catch (e: any) {
              if (e.code === 'auth/requires-recent-login') {
                showAlert("Security Check", "Please log out and sign in again to confirm account deletion.");
              } else {
                showAlert("Error", "Failed to delete account: " + e.message);
              }
            }
          }
        }
      ]
    );
  };

const handleCloudSave = async () => {
    if (!isPremium) { navigation.navigate('Premium'); return; } // <--- Premium Lock
    showToast("Backing up to cloud...");
    const result = await saveBackupToCloud();
    if (result.success) {
        showAlert("Success", "App data safely backed up to the cloud.");
    } else {
        showAlert("Error", "Backup failed. Check your internet connection.");
    }
  };

const handleCloudRestore = () => {
    if (!isPremium) { navigation.navigate('Premium'); return; } // <--- Premium Lock
    showAlert(
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
                showAlert("Restored", "Your data is back!");
                Updates.reloadAsync();
            } else {
                showAlert("Error", "Could not find backup or download failed.");
            }
          } 
        }
      ]
    );
  };

  const generateTherapistReport = () => showAlert("Report", "Feature coming soon.");

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

  console.log("MY UID:", auth.currentUser?.uid);

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
              contentContainerStyle={[styles.scrollContent, { flexGrow: 1 }]} 
              showsVerticalScrollIndicator={false}
            >
              
{/* 0. PROFILE CARD */}
              <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <User size={18} color={palette.accent} />
                  <Text style={[styles.title, { color: palette.text, marginBottom: 0 }]}>Profile Identity</Text>
                </View>
                
                <View style={{ flexDirection: 'row', gap: 16, alignItems: 'center', marginBottom: 16 }}>
                    {/* Avatar Picker */}
                    <TouchableOpacity onPress={handlePickAvatar} style={{ position: 'relative' }}>
                        <View style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: palette.bg, borderWidth: 1, borderColor: palette.border, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                            {photoUrl ? (
                                <Image source={{ uri: photoUrl }} style={{ width: '100%', height: '100%' }} />
                            ) : (
                                <User size={24} color={palette.sub} />
                            )}
                        </View>
                        <View style={{ position: 'absolute', bottom: -2, right: -2, backgroundColor: palette.accent, borderRadius: 12, padding: 4, borderWidth: 2, borderColor: palette.card }}>
                            <Palette size={10} color="white" /> 
                        </View>
                    </TouchableOpacity>

                    <View style={{ flex: 1 }}>
                        <Text style={[styles.label, { color: palette.sub, marginBottom: 8 }]}>Display Name</Text>
                        <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TextInput 
                    value={displayName}
                    onChangeText={setDisplayName}
                    placeholder="e.g. Alice"
                    placeholderTextColor={palette.sub}
                    style={[styles.input, { flex: 1, color: palette.text, borderColor: palette.border, backgroundColor: palette.bg }]} 
                  />
<PremiumPressable 
                    onPress={handleUpdateProfile} 
                    disabled={isUpdatingProfile}
                    style={[styles.applyBtn, { backgroundColor: palette.accent, opacity: isUpdatingProfile ? 0.7 : 1 }]}
                  >
<Text style={{ color: 'white', fontWeight: '600', fontSize: 12 }}>
                      {isUpdatingProfile ? '...' : 'Save'}
                    </Text>
                  </PremiumPressable>
                </View>
              </View>
            </View>
          </View>

              {/* BETA PROGRAM CARD (Tester Strategy) */}
              <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.accent }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <MessageSquare size={18} color={palette.accent} />
                  <Text style={[styles.title, { color: palette.text, marginBottom: 0 }]}>Beta Program</Text>
                </View>

                {/* Bug Bounty Banner */}
                <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center', marginBottom: 16 }}>
                   <View style={{ padding: 10, borderRadius: 12, backgroundColor: 'rgba(245, 158, 11, 0.15)' }}>
                      <Gift size={24} color="#F59E0B" />
                   </View>
                   <View style={{ flex: 1 }}>
                      <Text style={{ color: palette.text, fontWeight: '700', fontSize: 14 }}>Bug Bounty</Text>
                      <Text style={{ color: palette.sub, fontSize: 12, lineHeight: 18 }}>
                        Find a crash or typo? Report it below to win a <Text style={{ fontWeight: '700', color: '#F59E0B' }}>Lifetime Premium</Text> code.
                      </Text>
                   </View>
                </View>

                <PremiumPressable
                  onPress={() => {
                     // TODO: Replace with your Google Form URL
                     Linking.openURL('https://forms.gle/vLkDC4UwUnkPHddz8'); 
                  }}
                  style={[styles.applyBtn, { backgroundColor: palette.accent, alignItems: 'center', paddingVertical: 14 }]}
                >
                  <Text style={{ color: 'white', fontWeight: '700', fontSize: 15 }}>
                    Submit Beta Feedback
                  </Text>
                </PremiumPressable>
              </View>

              {/* 1. APPEARANCE CARD */}
              <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border, paddingBottom: 12 }]}>
                <Text style={[styles.title, { color: palette.text }]}>Appearance</Text>
<SettingRow 
                    label="Show Timer" 
                    value={showTimer} 
                    onValueChange={setShowTimer} 
                />

                {showTimer && (
                  <SettingRow 
                      label="Save Timer Progress" 
                      description="Resume timer on 'Save & Exit'"
                      value={preserveTimerProgress} 
                      onValueChange={setPreserveTimerProgress} 
                  />
                )}
                
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
                            {["light", "dark", "system", "dynamic"].map((opt) => {
                                const isLocked = opt === 'dynamic' && !isPremium;
                                return (
                                <Pressable
                                    key={opt}
                                    onPress={() => { 
                                      if (isLocked) { navigation.navigate('Premium'); return; }
                                      setTheme(opt as ThemeType); 
                                      toggleThemeDropdown(); 
                                    }}
                                    style={({ pressed }) => ({
                                        paddingVertical: 12, paddingHorizontal: 16,
                                        backgroundColor: pressed ? (isDark ? '#374151' : '#E5E7EB') : 'transparent',
                                        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'
                                    })}
                                >
                                    <Text style={{ fontSize: 14, fontWeight: '600', color: isLocked ? palette.sub : palette.text }}>
                                        {opt.charAt(0).toUpperCase() + opt.slice(1)}
                                    </Text>
                                    {isLocked && <Lock size={14} color={palette.sub} />}
                                </Pressable>
                            )})}
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
                      onPress={() => {
                        if (!isPremium) { navigation.navigate('Premium'); return; }
                        toggleAccentDropdown();
                      }}
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
                          {!isPremium && <Lock size={14} color={palette.sub} />}
                          {!accentDropdownOpen && (
                            <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: accentColor || '#6366F1' }} />
                          )}
                          {accentDropdownOpen ? <ChevronUp size={16} color={palette.sub} /> : <ChevronDown size={16} color={palette.sub} />}
                      </View>
                    </Pressable>

{accentDropdownOpen && (
                      <View 
                        onLayout={(e) => setSliderWidth(e.nativeEvent.layout.width - 24)} // Measure exact width minus padding
                        style={[
                          styles.colorGrid, 
                          { 
                            backgroundColor: isDark ? "#1E293B" : "#F9FAFB", 
                            borderColor: palette.border, 
                            padding: 12, 
                            gap: 16, 
                            flexDirection: 'column',
                            flexWrap: 'nowrap' // Ensure full width
                          }
                        ]}
                      >
                        
                        {/* 1. HUE SLIDER (Rainbow) */}
                        <View style={{ width: '100%' }}>
                          <Text style={{ color: palette.sub, fontSize: 11, marginBottom: 6, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                            1. Pick Color
                          </Text>
                          <View style={{ height: 48, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: palette.border, width: '100%' }}>
                            <Pressable
                              style={{ flex: 1 }}
                              onTouchStart={(e) => {
                                const width = sliderWidth || 300; 
                                const x = e.nativeEvent.locationX;
                                const newHue = Math.max(0, Math.min(360, (x / width) * 360));
                                setHue(newHue);
                                const color = hslToHex(newHue, 100, lightness);
                                setAccentColor(color);
                                if (hapticsEnabled) Haptics.selectionAsync();
                              }}
                              onTouchMove={(e) => {
                                const width = sliderWidth || 300; 
                                const x = e.nativeEvent.locationX;
                                const newHue = Math.max(0, Math.min(360, (x / width) * 360));
                                setHue(newHue);
                                const color = hslToHex(newHue, 100, lightness);
                                setAccentColor(color);
                              }}
                            >
                              <LinearGradient
                                colors={['#FF0000', '#FFFF00', '#00FF00', '#00FFFF', '#0000FF', '#FF00FF', '#FF0000']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={{ flex: 1 }}
                              />
                            </Pressable>
                          </View>
                        </View>

                        {/* 2. LIGHTNESS SLIDER (Darker/Brighter) */}
                        <View style={{ width: '100%' }}>
                          <Text style={{ color: palette.sub, fontSize: 11, marginBottom: 6, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                            2. Adjust Brightness
                          </Text>
                          <View style={{ height: 48, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: palette.border, width: '100%' }}>
                            <Pressable
                              style={{ flex: 1 }}
                              onTouchStart={(e) => {
                                const width = sliderWidth || 300;
                                const x = e.nativeEvent.locationX;
                                const newLight = Math.max(0, Math.min(100, (x / width) * 100));
                                setLightness(newLight);
                                const color = hslToHex(hue, 100, newLight);
                                setAccentColor(color);
                                if (hapticsEnabled) Haptics.selectionAsync();
                              }}
                              onTouchMove={(e) => {
                                const width = sliderWidth || 300;
                                const x = e.nativeEvent.locationX;
                                const newLight = Math.max(0, Math.min(100, (x / width) * 100));
                                setLightness(newLight);
                                const color = hslToHex(hue, 100, newLight);
                                setAccentColor(color);
                              }}
                            >
                              <LinearGradient
                                // Dynamic Gradient: Black -> Current Color -> White
                                colors={['#000000', hslToHex(hue, 100, 50), '#FFFFFF']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={{ flex: 1 }}
                              />
                            </Pressable>
                          </View>
                        </View>

{/* Preview */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 4 }}>
                             <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: accentColor || '#6366F1', borderWidth: 1, borderColor: palette.border }} />
                        </View>

                      </View>
                    )}
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
                  {[30, 60, 120, 300].map((s) => {
                    const isSelected = writeDuration === s;
                    return (
                      <PremiumPressable 
                        key={s} 
                        onPress={() => { setWriteDuration(s); setCustomWriteText(String(s)); }} 
                        haptic="light" 
                        style={[
                          styles.chip, 
                          { 
                            // Solid accent color when selected
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
                          {s < 60 ? `${s}s` : `${s/60}m`}
                        </Text>
                      </PremiumPressable>
                    );
                  })}
                </View>
                
<View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                  <View style={[styles.inputWrapper, { borderColor: palette.border, backgroundColor: palette.bg }]}>
                    <TextInput keyboardType="numeric" placeholder="Custom" placeholderTextColor={palette.sub} value={customWriteText} onChangeText={setCustomWriteText} style={[styles.inputField, { color: palette.text }]} />
                    <Text style={{ color: palette.sub, fontWeight: '600' }}>s</Text>
                  </View>
                  <PremiumPressable onPress={() => { if (!writeInvalid) { setWriteDuration(writeParsed); showToast('Duration updated'); }}} disabled={writeInvalid} style={[styles.applyBtn, { backgroundColor: writeInvalid ? '#CBD5E1' : palette.accent }]}>
                    <Text style={{ color: 'white', fontWeight: '600', fontSize: 12 }}>Set</Text>
                  </PremiumPressable>
                </View>

                <Text style={[styles.label, { color: palette.sub, marginBottom: 8 }]}>Break Duration</Text>
<View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                  {[30, 60, 120].map((s) => {
                    const isSelected = breakDuration === s;
                    return (
                      <PremiumPressable 
                        key={s} 
                        onPress={() => { setBreakDuration(s); setCustomBreakText(String(s)); }} 
                        haptic="light" 
                        style={[
                          styles.chip, 
                          { 
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
                          {s < 60 ? `${s}s` : `${s/60}m`}
                        </Text>
                      </PremiumPressable>
                    );
                  })}
                </View>
                
<View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                  <View style={[styles.inputWrapper, { borderColor: palette.border, backgroundColor: palette.bg }]}>
                    <TextInput keyboardType="numeric" placeholder="Custom" placeholderTextColor={palette.sub} value={customBreakText} onChangeText={setCustomBreakText} style={[styles.inputField, { color: palette.text }]} />
                    <Text style={{ color: palette.sub, fontWeight: '600' }}>s</Text>
                  </View>
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
                    description="Always show gratitude reflections"
                    value={gratitudeModeEnabled} 
                    onValueChange={setGratitudeModeEnabled} 
                />
<SettingRow 
                    label="Zen Mode Pre-roll" 
                    description="48s breathing exercise before writing (Focus Mode only)"
                    value={zenModeEnabled} 
                    onValueChange={setZenModeEnabled} 
                />
              </View>

{/* 4. NOTIFICATIONS */}
              <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <Bell size={18} color={palette.accent} />
                  <Text style={[styles.title, { color: palette.text, marginBottom: 0 }]}>Notifications</Text>
                </View>
                
                <SettingRow 
                  label="Daily Reminders" 
                  description="Get a gentle nudge to journal" 
                  value={smartRemindersEnabled} 
                  onValueChange={handleToggleReminders} 
                />

                {smartRemindersEnabled && (
                  <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: palette.border }}>
                    <Text style={[styles.label, { color: palette.sub, marginBottom: 8 }]}>Reminder Time</Text>
                    <PremiumPressable 
                      onPress={() => setTimePickerVisibility(true)}
                      style={[styles.dropdownHeader, { backgroundColor: palette.bg, borderColor: palette.border }]}
                    >
                      <Text style={{ fontSize: 15, fontWeight: "600", color: palette.text }}>
                        {reminderTime 
                          ? `${String(reminderTime.hour).padStart(2, '0')}:${String(reminderTime.minute).padStart(2, '0')}` 
                          : "20:00"}
                      </Text>
                      <Text style={{ fontSize: 12, color: palette.accent, fontWeight: "600" }}>Change</Text>
                    </PremiumPressable>
                  </View>
                )}

                <DateTimePickerModal
                  isVisible={isTimePickerVisible}
                  mode="time"
                  onConfirm={handleConfirmTime}
                  onCancel={() => setTimePickerVisibility(false)}
                  date={(() => {
                    const d = new Date();
                    d.setHours(reminderTime?.hour || 20);
                    d.setMinutes(reminderTime?.minute || 0);
                    return d;
                  })()}
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

<PremiumPressable onPress={handleRestore} style={[styles.menuItem, { borderBottomWidth: 1, borderBottomColor: palette.border }]}>
                    <View style={styles.menuItemContent}>
                      <RotateCcw size={20} color={palette.accent} />
                      <Text style={[styles.menuItemTitle, { color: palette.text }]}>Restore Backup</Text>
                    </View>
                    <Text style={{ color: palette.subtleText }}>›</Text>
                  </PremiumPressable>

<PremiumPressable onPress={handleBulkExport} style={[styles.menuItem, { borderBottomWidth: 1, borderBottomColor: palette.border }]}>
                    <View style={styles.menuItemContent}>
                      <Share size={20} color={palette.accent} />
                      <Text style={[styles.menuItemTitle, { color: palette.text }]}>Download All Data</Text>
                    </View>
                    <Text style={{ color: palette.subtleText }}>›</Text>
                  </PremiumPressable>

<PremiumPressable onPress={handleFactoryReset} style={[styles.menuItem, { borderBottomWidth: 1, borderBottomColor: palette.border }]}>
                    <View style={styles.menuItemContent}>
                      <Trash2 size={20} color="#EF4444" />
                      <Text style={[styles.menuItemTitle, { color: "#EF4444" }]}>Factory Reset (Dev)</Text>
                    </View>
                    <Text style={{ color: palette.subtleText }}>›</Text>
                  </PremiumPressable>

                  <PremiumPressable onPress={handleDeleteAccount} style={styles.menuItem}>
                    <View style={styles.menuItemContent}>
                      <UserX size={20} color="#EF4444" />
                      <Text style={[styles.menuItemTitle, { color: "#EF4444" }]}>Delete Account</Text>
                    </View>
                    <Text style={{ color: palette.subtleText }}>›</Text>
                  </PremiumPressable>

                </View>
              </View>

              {/* LOGOUT BUTTON */}
              {auth.currentUser && (
                <View style={{ marginTop: 24 }}>
                  <PremiumPressable 
                    onPress={handleLogout} 
                    style={{ 
                      backgroundColor: palette.card, 
                      borderColor: palette.border, 
                      borderWidth: 1, 
                      borderRadius: 16, 
                      padding: 16, 
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 12
                    }}
                  >
                    <LogOut size={20} color={palette.text} />
                    <Text style={{ color: palette.text, fontWeight: '700' }}>
                      Log Out
                    </Text>
                  </PremiumPressable>
                </View>
              )}

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
  scrollContent: { padding: 16, gap: 14, paddingBottom: 30 },
  card: { borderWidth: 1, borderRadius: 16, padding: 16, marginBottom: 4 },
  title: { fontSize: 16, fontWeight: '700', marginBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12 },
  settingTexts: { flex: 1, marginRight: 8 },
  label: { fontSize: 15, fontWeight: '600', marginBottom: 2 },
  description: { fontSize: 13, lineHeight: 16 },
chip: { borderWidth: 1, borderRadius: 8, paddingVertical: 6, paddingHorizontal: 12, minWidth: 48, alignItems: 'center' },
  input: { flexGrow: 0, minWidth: 110, borderWidth: 1, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 10, fontSize: 14 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, minWidth: 110 },
  inputField: { flex: 1, fontSize: 14, padding: 0 },
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