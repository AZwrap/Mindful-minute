import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configure behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true, // Replaces shouldShowAlert
    shouldShowList: true,   // Replaces shouldShowAlert
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function registerForPushNotificationsAsync(): Promise<string | undefined> {
  try {
    let token;

    if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    return undefined;
  }

  // In a real app, you'd get the expo push token here
// token = (await Notifications.getExpoPushTokenAsync()).data;
    
    return token;
  } catch (error) {
    console.warn("Notification permissions failed (likely Expo Go limitation):", error);
    return undefined;
  }
}

export async function cancelDailyReminders() {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

export async function scheduleDailyReminder(hour: number, minute: number) {
  try {
    // Clear old reminders first so we don't stack them
    await cancelDailyReminders();

    const identifier = await Notifications.scheduleNotificationAsync({
    content: {
      title: "Micro Muse",
      body: "It's time for your daily reflection.",
    },
    trigger: {
      hour,
      minute,
      repeats: true,
} as any, // Type assertion needed for repeating trigger in some Expo versions
    });
    
    return identifier;
  } catch (e) {
    console.warn("Schedule failed:", e);
    return undefined;
  }
}

// Trigger an immediate local alert (mimicking a push notification)
export async function sendImmediateNotification(title: string, body: string, data?: any) {
  try {
    await Notifications.scheduleNotificationAsync({
      content: { title, body, data }, // Pass data payload (e.g., { journalId: '...' })
      trigger: null, // null means "show immediately"
    });
  } catch (e) {
    console.log("Failed to send alert:", e);
  }
}