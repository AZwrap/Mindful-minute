import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configure behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function registerForPushNotificationsAsync(): Promise<string | undefined> {
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
}

export async function cancelDailyReminders() {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

export async function scheduleDailyReminder(hour: number, minute: number) {
  // Clear old reminders first so we don't stack them
  await cancelDailyReminders();

  const identifier = await Notifications.scheduleNotificationAsync({
    content: {
      title: "Mindful Minute",
      body: "It's time for your daily reflection.",
    },
    trigger: {
      hour,
      minute,
      repeats: true,
    } as any, // Type assertion needed for repeating trigger in some Expo versions
  });
  
  return identifier;
}