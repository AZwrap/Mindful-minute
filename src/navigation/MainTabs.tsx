import React from 'react';
import { View, Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSharedPalette } from '../hooks/useSharedPalette';
import { Sun, Calendar, BarChart2, Award, Settings } from 'lucide-react-native';

// --- IMPORT YOUR REAL SCREENS ---
import HomeScreen from '../screens/HomeScreen';
import HistoryScreen from '../screens/HistoryScreen';
import StatsScreen from '../screens/StatsScreen';           // Insights
import AchievementsScreen from '../screens/AchievementsScreen'; // Awards
import SettingsScreen from '../screens/SettingsScreen';

const Tab = createBottomTabNavigator();

export default function MainTabs() {
  const palette = useSharedPalette();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: palette.card,
          borderTopColor: palette.border,
          borderTopWidth: 1,
          height: 85,
          paddingTop: 10,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
          marginBottom: 10,
        },
        tabBarActiveTintColor: palette.accent,
        tabBarInactiveTintColor: palette.sub,
      }}
    >
      {/* 1. TODAY -> HomeScreen (Restores your main dashboard) */}
      <Tab.Screen 
        name="Today" 
        component={HomeScreen}
        options={{
          tabBarIcon: ({ color }) => <Sun color={color} size={24} />,
        }}
      />

      {/* 2. HISTORY -> HistoryScreen */}
      <Tab.Screen 
        name="History" 
        component={HistoryScreen}
        options={{
          tabBarIcon: ({ color }) => <Calendar color={color} size={24} />,
        }}
      />

      {/* 3. INSIGHTS -> StatsScreen */}
      <Tab.Screen 
        name="Insights" 
        component={StatsScreen}
        options={{
          tabBarIcon: ({ color }) => <BarChart2 color={color} size={24} />,
        }}
      />

      {/* 4. AWARDS -> AchievementsScreen */}
      <Tab.Screen 
        name="Awards" 
        component={AchievementsScreen}
        options={{
          tabBarIcon: ({ color }) => <Award color={color} size={24} />,
        }}
      />

      {/* 5. SETTINGS -> SettingsScreen */}
      <Tab.Screen 
        name="Settings" 
        component={SettingsScreen}
        options={{
          tabBarIcon: ({ color }) => <Settings color={color} size={24} />,
        }}
      />
    </Tab.Navigator>
  );
}