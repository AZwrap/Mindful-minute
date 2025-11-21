import React from 'react';
import { StatusBar, useColorScheme } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// Stores
import { useTheme as useAppTheme } from './src/stores/themeStore';

// Screens - temporarily comment out most screens
import HomeScreen from './src/screens/HomeScreen';
// import WriteScreen from './src/screens/WriteScreen';
// import MoodTagScreen from './src/screens/MoodTagScreen';
// import HistoryScreen from './src/screens/HistoryScreen';
// import EntryDetailScreen from './src/screens/EntryDetailScreen';
// import SettingsScreen from './src/screens/SettingsScreen';
// import CustomPromptScreen from './src/screens/CustomPromptScreen';
// import StatsScreen from './src/screens/StatsScreen';
// import AchievementsScreen from './src/screens/AchievementsScreen';

const Stack = createNativeStackNavigator();

// Simple test component to identify the issue
const TestScreen = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
    <Text>Test Screen - Working</Text>
  </View>
);

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
          headerStyle,
          headerTintColor,
          headerTitleStyle,
          animation: 'slide_from_right',
          headerShadowVisible: false,
        }}
      >
        <Stack.Screen 
          name="Home" 
          component={HomeScreen}
          options={{ title: 'Mindful Minute' }}
        />
        <Stack.Screen 
          name="Test" 
          component={TestScreen}
          options={{ title: 'Test Screen' }}
        />
        {/* Temporarily comment out other screens to find the problematic one */}
        {/*
        <Stack.Screen 
          name="Write" 
          component={WriteScreen}
          options={{
            title: 'Write Reflection',
            animation: 'slide_from_bottom',
          }}
        />
        <Stack.Screen 
          name="MoodTag" 
          component={MoodTagScreen}
          options={{ title: 'Add Mood' }}
        />
        <Stack.Screen 
          name="History" 
          component={HistoryScreen}
          options={{ title: 'History' }}
        />
        <Stack.Screen 
          name="EntryDetail" 
          component={EntryDetailScreen}
          options={{ title: 'Entry' }}
        />
        <Stack.Screen 
          name="Settings" 
          component={SettingsScreen}
          options={{ title: 'Settings' }}
        />
        <Stack.Screen 
          name="CustomPrompt" 
          component={CustomPromptScreen}
          options={{ title: 'Custom Prompt' }}
        />
        <Stack.Screen 
          name="Stats" 
          component={StatsScreen}
          options={{ title: 'Stats' }}
        />
        <Stack.Screen 
          name="Achievements" 
          component={AchievementsScreen}
          options={{ title: 'Achievements' }}
        />
        */}
      </Stack.Navigator>
    </>
  );
}

export default function App() {
  return (
    <NavigationContainer>
      <StackNavigator />
    </NavigationContainer>
  );
}