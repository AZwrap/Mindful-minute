import { useEffect, useRef } from 'react';
import { useColorScheme } from 'react-native';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebaseConfig'; 
import { useJournalStore } from '../stores/journalStore'; 
import * as SplashScreen from 'expo-splash-screen';
import * as Linking from 'expo-linking';
import * as Notifications from 'expo-notifications';
import { navigationRef } from '../navigation/RootNavigation';
import { useTheme } from '../stores/themeStore';
import { useSettings } from '../stores/settingsStore';
import { useEntriesStore } from '../stores/entriesStore';
import { scheduleDailyReminder, cancelDailyReminders, registerForPushNotificationsAsync } from '../lib/notifications';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync().catch(console.warn);

export function useAppInitialization() {
  const system = useColorScheme();
  const { getCurrentTheme } = useTheme();
  const theme = getCurrentTheme(system);
  const settingsLoaded = useSettings((s) => s.loaded);
  const smartRemindersEnabled = useSettings((s) => s.smartRemindersEnabled);
  const reminderTime = useSettings((s) => s.reminderTime);

  // 1. Hide splash screen only when settings are loaded
  useEffect(() => {
    if (settingsLoaded) {
      setTimeout(() => {
        SplashScreen.hideAsync();
      }, 500); 
    }
  }, [settingsLoaded]);

  // 2. Deep Linking Config
  const linking = {
    prefixes: [Linking.createURL('/'), 'mindfulminute://'],
    config: {
      screens: {
        Invite: 'join/:journalId', 
      },
    },
  };

// 3. Notifications (Debounced Schedule)
  // We use a ref to track the timer so it persists across re-renders
  const scheduleTimeout = useRef<any>(null);

  useEffect(() => {
    // 1. CLEAR any pending schedule from the previous millisecond
    if (scheduleTimeout.current) {
      clearTimeout(scheduleTimeout.current);
    }

    // 2. SET A NEW TIMER
    // We wait 2 seconds. If another update comes in (e.g. settings loading),
    // this timer gets killed and a new one starts. Only the LAST one survives.
    if (settingsLoaded) {
      scheduleTimeout.current = setTimeout(async () => {
        try {
          if (smartRemindersEnabled) {
            const token = await registerForPushNotificationsAsync();
            if (token !== undefined) {
              const { hour, minute } = reminderTime || { hour: 20, minute: 0 };
              await scheduleDailyReminder(hour, minute);
            }
          } else {
            await cancelDailyReminders();
          }
        } catch (e) {
          console.warn("Debounced schedule failed:", e);
        }
      }, 2000); // 2000ms delay to let app settle completely
    }

    // Cleanup: Kill timer if component unmounts
    return () => {
      if (scheduleTimeout.current) clearTimeout(scheduleTimeout.current);
    };
    
    // FIX: Depend on specific values (hour/minute) to avoid object-reference loops
  }, [smartRemindersEnabled, reminderTime?.hour, reminderTime?.minute, settingsLoaded]);

  // 4. Auto-Sync Personal Entries on Start
  useEffect(() => {
    const initSync = async () => {
      await new Promise(resolve => setTimeout(resolve, 1500));
      try {
        await useEntriesStore.getState().syncWithCloud?.();
      } catch (e) {
        console.log("Background sync silent error:", e);
      }
    };
    initSync();
  }, []);

// 5. Shared Journals: Auth-Reactive Restore & Sync
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          // 1. Update Store Identity
          useJournalStore.getState().setCurrentUser(user.uid);

          // 2. Fetch Journals from Firestore
          await useJournalStore.getState().restoreJournals();
          
          // 3. Start Live Listeners
          useJournalStore.getState().subscribeToAllJournals();
        } catch (e) {
          console.warn("Failed to init shared journals on login:", e);
        }
      } else {
        // User logged out: Clear shared journal data from memory
        useJournalStore.getState().leaveJournal();
      }
    });

    return () => unsubscribe();
  }, []);

  return {
    isReady: settingsLoaded,
    theme,
    linking
  };
}