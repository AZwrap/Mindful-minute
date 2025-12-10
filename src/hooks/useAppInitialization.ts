import { useEffect } from 'react';
import { useColorScheme } from 'react-native';
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