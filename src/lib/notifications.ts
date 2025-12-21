import * as Notifications from 'expo-notifications';
import { Platform, Alert, Linking } from 'react-native';

// 1. GLOBAL CONFIG
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const openSettings = () => {
  if (Platform.OS === 'ios') {
    Linking.openURL('app-settings:');
  } else {
    Linking.openSettings();
  }
};

export async function registerForPushNotificationsAsync() {
  if (Platform.OS === 'android') {
try {
      // NOTE: Changed ID to force update on Android
      await Notifications.setNotificationChannelAsync('daily-reminders-subtle', {
        name: 'Daily Reminders',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 100, 100, 100], // Soft "bip-bip"
        lightColor: '#6366F1',
        sound: 'default',
      });
    } catch (e: any) {
      console.log("Channel creation failed: " + e.message);
    }
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    Alert.alert("Permission Required", "Please enable notifications in settings.");
    return false;
  }

  return true;
}

export async function cancelDailyReminders() {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

// ROBUST SCHEDULER: Uses 'TimeInterval' (Seconds) which is proven to work on your device.
export async function scheduleDailyReminder(hour: number, minute: number) {
  try {
    const hasPermission = await registerForPushNotificationsAsync();
    if (!hasPermission) return;

// 1. NUCLEAR CLEANUP
    // Remove alerts already in the tray (fixes "Wrong Screen" from old notifications)
    await Notifications.dismissAllNotificationsAsync(); 
    
    // Cancel all future schedules
    await Notifications.cancelAllScheduledNotificationsAsync();

    // Safety Delay: Give Android 1 second to fully clear the queue
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Double Check: explicitly kill anything that survived
    const zombies = await Notifications.getAllScheduledNotificationsAsync();
    for (const n of zombies) {
      await Notifications.cancelScheduledNotificationAsync(n.identifier);
    }

    const h = Math.floor(hour);
    const m = Math.floor(minute);
    
    let scheduledCount = 0;
    let dayOffset = 0;

    // Schedule 14 future notifications
    while (scheduledCount < 14 && dayOffset < 30) {
        const target = new Date();
        target.setDate(target.getDate() + dayOffset);
        target.setHours(h, m, 0, 0);
        
        const diffSeconds = (target.getTime() - Date.now()) / 1000;
        
        if (diffSeconds > 0) {
            await Notifications.scheduleNotificationAsync({
                content: {
                    title: "Micro Muse",
                    body: "It's time for your daily reflection.",
                    sound: true,
                    priority: Notifications.AndroidNotificationPriority.MAX,
// FORCE HOME NAVIGATION
                    data: { screen: 'Home' },
                    ...(Platform.OS === 'android' ? { channelId: 'daily-reminders-subtle' } : {}),
                },
                trigger: {
                    type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
                    seconds: Math.floor(diffSeconds),
                    repeats: false,
                    channelId: 'daily-reminders-subtle', 
                },
            });
            scheduledCount++;
        }
        dayOffset++;
    }

    console.log(`Daily reminders refreshed for ${h}:${m}`);
    return true;

  } catch (e: any) {
    console.warn("Schedule failed:", e);
    Alert.alert("Schedule Error", e.message || "Unknown error");
    return undefined;
  }
}

// TEST FUNCTION (Immediate)
export async function sendTestNotification() {
  try {
    const hasPermission = await registerForPushNotificationsAsync();
    if (!hasPermission) return;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Test Notification",
body: "Notifications are working!",
        sound: true,
        priority: Notifications.AndroidNotificationPriority.MAX,
        ...(Platform.OS === 'android' ? { channelId: 'daily-reminders-subtle' } : {}),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 2,
        repeats: false,
        channelId: 'daily-reminders-subtle',
      },
    });
  } catch (e: any) {
    Alert.alert("Test Failed", e.message);
  }
}

// DEBUG FUNCTION
export async function checkPendingNotifications() {
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    
    if (scheduled.length === 0) {
       Alert.alert("Status", "No notifications scheduled.");
       return;
    }

    // Sort to find the next one
    const sorted = scheduled.sort((a, b) => {
        const tA = (a.trigger as any).value || (a.trigger as any).seconds || 0;
        const tB = (b.trigger as any).value || (b.trigger as any).seconds || 0;
        return tA - tB; // Loose sort
    });
    
    const next = sorted[0];
    const trigger = next.trigger as any;
    
    let timeMsg = "Unknown";
    // Since we are now using Interval for everything:
    if (trigger.type === 'timeInterval') {
        const mins = Math.floor(trigger.seconds / 60);
        timeMsg = `In ${mins} minutes (${trigger.seconds}s)`;
    }

    Alert.alert(
      "Pending Notifications",
      `Total Queued: ${scheduled.length}\nNext Up: ${timeMsg}`
    );
  } catch (e: any) {
    Alert.alert("Debug Error", e.message);
  }
}

export async function sendImmediateNotification(title: string, body: string, data?: any) {
  try {
     await Notifications.scheduleNotificationAsync({
      content: { 
        title, 
        body, 
data,
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
        ...(Platform.OS === 'android' ? { channelId: 'daily-reminders-subtle' } : {}),
      },
      trigger: null,
    });
  } catch (e) {
    console.log("Failed to send alert:", e);
  }
}