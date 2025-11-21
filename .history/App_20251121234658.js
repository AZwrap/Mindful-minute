// App.js (with theme-aware header)
import React from 'react';
import { NavigationContainer, useTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme as useAppTheme } from './src/stores/themeStore'; // Import our theme store

import HomeScreen from './src/screens/HomeScreen';
import WriteScreen from './src/screens/WriteScreen';
import MoodTagScreen from './src/screens/MoodTagScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import EntryDetailScreen from './src/screens/EntryDetailScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import CustomPromptScreen from './src/screens/CustomPromptScreen';
import StatsScreen from './src/screens/StatsScreen';
import AchievementsScreen from './src/screens/AchievementsScreen';
import { useColorScheme } from 'react-native';
import { StatusBar } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

const Stack = createNativeStackNavigator();

// Create a wrapper component that has access to the theme
function StackNavigator() {
  const systemScheme = useColorScheme();
  const { getCurrentTheme } = useAppTheme();
  const currentTheme = getCurrentTheme(systemScheme);
  const isDark = currentTheme === 'dark';

  const headerStyle = {
    backgroundColor: isDark ? '#0F172A' : '#F8FAFC',
  };

  const headerTitleStyle = {
    color: isDark ? '#E5E7EB' : '#0F172A',
    fontWeight: '600',
  };

  const headerTintColor = isDark ? '#E5E7EB' : '#0F172A';

  return (
        <>
      <StatusBar 
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={isDark ? '#0F172A' : '#F8FAFC'}
      />
<Stack.Navigator
  screenOptions={{
    headerStyle: headerStyle,
    headerTintColor: headerTintColor,
    headerTitleStyle: headerTitleStyle,
    animation: 'slide_from_right',
  }}
>
      <Stack.Screen 
        name="Home" 
        component={HomeScreen}
        options={{
          title: 'Mindful Minute',
        }}
      />
      <Stack.Screen 
        name="MoodTag" 
        component={MoodTagScreen}
        options={{
          title: 'Add Mood',
        }}
      />
      
      <Stack.Screen 
        name="History" 
        component={HistoryScreen}
        options={{
          title: 'History',
        }}
      />
      
      <Stack.Screen 
        name="EntryDetail" 
        component={EntryDetailScreen}
        options={{
          title: 'Entry',
        }}
      />
      
      <Stack.Screen 
        name="Settings" 
        component={SettingsScreen}
        options={{
          title: 'Settings',
        }}
      />
      
      <Stack.Screen 
        name="CustomPrompt" 
        component={CustomPromptScreen}
        options={{
          title: 'Custom Prompt',
        }}
      />
      
      <Stack.Screen 
        name="Stats" 
        component={StatsScreen}
        options={{
          title: 'Stats',
        }}
      />
      
      <Stack.Screen 
        name="Achievements" 
        component={AchievementsScreen}
        options={{
          title: 'Achievements',
        }}
      />
<Stack.Screen 
  name="Write" 
  component={WriteScreen}
  options={{
    title: 'Write Reflection',
    animation: 'slide_from_bottom', // Special animation for Write screen
  }}
/>
    </Stack.Navigator>
    </>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <NavigationContainer>
      <StackNavigator />
   </NavigationContainer>
    </GestureHandlerRootView>
  );
}