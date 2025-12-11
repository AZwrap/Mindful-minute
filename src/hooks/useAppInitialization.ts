import { useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { auth } from '../firebaseConfig'; // <--- Add this
import { useJournalStore } from '../stores/journalStore'; // <--- Add this
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

  // 3. Notifications (Schedule & Tap Handler)
  useEffect(() => {
// A. Handle "Tap to Open"
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      // "Write" is now type-checked!
      if (navigationRef.isReady()) {
        navigationRef.navigate("Write", {
          date: new Date().toISOString().split('T')[0],
          prompt: { text: "Time for your daily mindful minute.", isSmart: false }
        });
      }
    });

    // B. Manage Schedule based on Settings
    const manageSchedule = async () => {
      if (smartRemindersEnabled) {
        const token = await registerForPushNotificationsAsync();
if (token !== undefined) {
          // Use stored time or default to 20:00
          const { hour, minute } = reminderTime || { hour: 20, minute: 0 };
          await scheduleDailyReminder(hour, minute);
        }
      } else {
        await cancelDailyReminders();
      }
    };

    if (settingsLoaded) {
      manageSchedule();
    }

// 5. Shared Journals: Restore & Listen for Notifications
  useEffect(() => {
    const initShared = async () => {
      // Small delay to ensure Firebase Auth is ready
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const user = auth.currentUser;
      if (user) {
        try {
          // 1. Restore the user's groups from the cloud
          await useJournalStore.getState().restoreJournals();
          
          // 2. Start listening to ALL groups for notifications (New)
          // This keeps the socket open so "onSnapshot" can trigger alerts
          useJournalStore.getState().subscribeToAllJournals();
        } catch (e) {
          console.warn("Failed to init shared journals:", e);
        }
      }
    };

    initShared();
  }, []);

return () => subscription.remove();
  }, [smartRemindersEnabled, reminderTime, settingsLoaded]);

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

  return {
    isReady: settingsLoaded,
    theme,
    linking
  };
}