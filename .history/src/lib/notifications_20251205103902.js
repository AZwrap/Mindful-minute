import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import * as Application from 'expo-application';

// Check if we're in Expo Go (no notifications) or proper build
const IS_EXPO_GO = Application.applicationId === 'host.exp.Exponent';

export async function scheduleNotifications(settings) {
  // If in Expo Go, show helpful message instead of error
  if (IS_EXPO_GO) {
    console.log('Notifications not available in Expo Go - would schedule for:', settings.notificationTime);
    return;
  }
  
  await cancelNotifications();
  if (!settings.notificationsEnabled) return;

  const [hours, minutes] = settings.notificationTime.split(':').map(Number);
  
  settings.notificationDays.forEach(day => {
    Notifications.scheduleNotificationAsync({
      content: {
        title: "Mindful Minute 📝",
        body: "Take a moment to reflect and write today's entry",
        sound: true,
      },
      trigger: {
        hour: hours,
        minute: minutes,
        repeats: true,
        weekday: day + 1,
      },
    });
  });
}

export async function cancelNotifications() {
  if (IS_EXPO_GO) {
    console.log('Notifications not available in Expo Go');
    return;
  }
  await Notifications.cancelAllScheduledNotificationsAsync();
}

export async function requestPermissions() {
  if (IS_EXPO_GO) {
    // In Expo Go, pretend we have permissions for UI testing
    console.log('Expo Go - simulating notification permissions');
    return true;
  }
  
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function checkPermissions() {
  if (IS_EXPO_GO) {
    return true; // Simulate permissions in Expo Go
  }
  
  const { status } = await Notifications.getPermissionsAsync();
  return status === 'granted';
}

// Helper to show appropriate messages to user
export function getNotificationStatus() {
  if (IS_EXPO_GO) {
    return {
      available: false,
      message: "Notifications work in the full app version",
      type: "info"
    };
  }
  return {
    available: true,
    message: "Notifications are enabled",
    type: "success"
  };
}
// 🟢 NEW: Schedule based on user's most active time
export async function scheduleSmartReminder(analytics) {
  if (IS_EXPO_GO) {
    console.log("Smart Reminders: Notifications not available in Expo Go");
    return;
  }

  await cancelNotifications(); // Clear old fixed-time reminders

  // 1. Define default hours for each "slot"
  const timeMap = {
    Morning: 9,    // 9:00 AM
    Afternoon: 14, // 2:00 PM
    Evening: 20,   // 8:00 PM
    Night: 22      // 10:00 PM
  };

  // 2. Determine best time (Default to Evening if no data)
  const bestSlot = analytics?.timeStats?.mostActive || 'Evening';
  const hour = timeMap[bestSlot] || 20;

  console.log(`Scheduling Smart Reminder for ${bestSlot} (${hour}:00)`);

  // 3. Schedule daily
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "It's your time to write ✍️",
      body: `You are usually most productive in the ${bestSlot.toLowerCase()}. Ready to capture your thoughts?`,
      sound: true,
    },
    trigger: {
      hour: hour,
      minute: 0,
      repeats: true,
    },
  });
}

// 🟢 NEW: Instant Test
export async function runNotificationTest() {
  console.log("❌ Notifications disabled due to Expo Go SDK 53 limitations.");
  alert("Notifications are disabled in this version of Expo Go.");
  
  /* // DISABLED to prevent crashes/loops in Expo Go
  await Notifications.scheduleNotificationAsync({
    content: { title: "It Works!", body: "Test", sound: true },
    trigger: { seconds: 2 },
  });
  */
}