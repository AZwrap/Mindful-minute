// App.js (with theme-aware header + FIXED Quick Actions)
import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme as useAppTheme } from './src/stores/themeStore'; 
import HomeScreen from './src/screens/HomeScreen';
import WriteScreen from './src/screens/WriteScreen';
import MoodTagScreen from './src/screens/MoodTagScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import EntryDetailScreen from './src/screens/EntryDetailScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import CustomPromptScreen from './src/screens/CustomPromptScreen';
import StatsScreen from './src/screens/StatsScreen';
import AchievementsScreen from './src/screens/AchievementsScreen';
import FocusWriteScreen from './src/screens/FocusWriteScreen';
import WeeklyRecapScreen from './src/screens/WeeklyRecapScreen';

import { useColorScheme, StatusBar } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { useProgress } from './src/stores/progressStore';
import { useEntries } from './src/stores/entriesStore';
import { useSettings } from './src/stores/settingsStore';

import * as QuickActions from "expo-quick-actions";
import { navigationRef } from "./src/navigation/RootNavigation";


global.useEntries = useEntries;
global.useSettings = useSettings;
global.useProgress = useProgress;

const Stack = createNativeStackNavigator();

function StackNavigator() {
  const systemScheme = useColorScheme();
  const { getCurrentTheme } = useAppTheme();
  const currentTheme = getCurrentTheme(systemScheme);
  const isDark = currentTheme === 'dark';

  return (
    <>
      <StatusBar 
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={isDark ? '#0F172A' : '#F8FAFC'}
      />

      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: isDark ? '#0F172A' : '#F8FAFC' },
          headerTintColor: isDark ? '#E5E7EB' : '#0F172A',
          headerTitleStyle: { 
            color: isDark ? '#E5E7EB' : '#0F172A',
            fontWeight: '600'
          },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'Mindful Minute' }} />
        <Stack.Screen name="MoodTag" component={MoodTagScreen} options={{ title: 'Add Mood' }} />
        <Stack.Screen name="WeeklyRecap" component={WeeklyRecapScreen} options={{ title: 'Weekly Recap' }} />
        <Stack.Screen name="History" component={HistoryScreen} options={{ title: 'History' }} />
        <Stack.Screen name="EntryDetail" component={EntryDetailScreen} options={{ title: 'Entry' }} />
        <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings' }} />
        <Stack.Screen name="CustomPrompt" component={CustomPromptScreen} options={{ title: 'Custom Prompt' }} />
        <Stack.Screen name="Stats" component={StatsScreen} options={{ title: 'Stats' }} />
        <Stack.Screen name="Achievements" component={AchievementsScreen} options={{ title: 'Achievements' }} />

        <Stack.Screen 
          name="FocusWrite" 
          component={FocusWriteScreen}
          options={{ headerShown: false }}
        />

        <Stack.Screen 
          name="Write" 
          component={WriteScreen}
          options={{ 
            title: 'Write Reflection',
            animation: 'slide_from_bottom'
          }}
        />
      </Stack.Navigator>
    </>
  );
}

export default function App() {

  // ✅ Quick Actions setup finally works
  useEffect(() => {
    QuickActions.setShortcutItems([
      {
        id: "new_entry",
        title: "New Entry",
        subtitle: "Start writing now",
        icon: "square.and.pencil",
      },
      {
        id: "gratitude",
        title: "Gratitude",
        subtitle: "Write 3 things you're grateful for",
        icon: "heart.fill",
      },
    ]);

    const sub = QuickActions.addListener((shortcut) => {
      if (!shortcut) return;

      switch (shortcut.id) {
        case "new_entry":
          navigationRef.current?.navigate("Write", {
            date: new Date().toISOString(),
            prompt: null,
          });
          break;

        case "gratitude":
          navigationRef.current?.navigate("Write", {
            date: new Date().toISOString(),
            prompt: {
              text: "What are 3 things you're grateful for today?",
            },
          });
          break;
      }
    });

    return () => sub.remove();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <NavigationContainer ref={navigationRef}>
        <StackNavigator />
      </NavigationContainer>
    </GestureHandlerRootView>
  );
}
