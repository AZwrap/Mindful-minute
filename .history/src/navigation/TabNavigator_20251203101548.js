import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSharedPalette } from '../hooks/useSharedPalette';
import { Home, Calendar, BarChart2, Settings } from 'lucide-react-native';
import { Platform } from 'react-native';

// Screens
import HomeScreen from '../screens/HomeScreen';
import HistoryScreen from '../screens/HistoryScreen';
import StatsScreen from '../screens/StatsScreen';
import SettingsScreen from '../screens/SettingsScreen';

const Tab = createBottomTabNavigator();

export default function TabNavigator() {
  const palette = useSharedPalette();

  return (
<Tab.Navigator
      screenOptions={{
        // 1. Clean Header Style (Matches your other screens)
        headerStyle: {
          backgroundColor: palette.bg,
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 1,
          borderBottomColor: palette.border,
        },
        headerTintColor: palette.text,
        headerTitleStyle: { fontWeight: '700' },

        // 2. Floating Tab Bar Style
        tabBarStyle: {
          position: 'absolute', // <--- Floats over content
          bottom: 20,           // <--- Lift from bottom
          left: 16,
          right: 16,
          height: 64,           // Taller, pill-shaped
          borderRadius: 32,     // Fully rounded corners
          
          backgroundColor: palette.card,
          borderTopWidth: 0,    // Remove default line
          
          // Shadow for "Float" effect
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.1,
          shadowRadius: 12,
          elevation: 5,
        },
        
        // 3. Icon Alignment
        tabBarItemStyle: {
          paddingVertical: 8,
        },
        tabBarActiveTintColor: palette.accent,
        tabBarInactiveTintColor: palette.subtleText,
        
        // 4. Hide Labels for a cleaner "Mindful" look? 
        // (Change to true if you prefer labels)
        tabBarShowLabel: false, 
      }}
    >
      <Tab.Screen 
        name="HomeTab" 
        component={HomeScreen} 
        options={{
          tabBarLabel: 'Today',
          tabBarIcon: ({ color, size }) => <Home size={size} color={color} />,
        }}
      />
      <Tab.Screen 
        name="History" 
        component={HistoryScreen} 
        options={{
          tabBarLabel: 'History',
          tabBarIcon: ({ color, size }) => <Calendar size={size} color={color} />,
        }}
      />
      <Tab.Screen 
        name="Stats" 
        component={StatsScreen} 
        options={{
          tabBarLabel: 'Insights',
          tabBarIcon: ({ color, size }) => <BarChart2 size={size} color={color} />,
        }}
      />
      <Tab.Screen 
        name="Settings" 
        component={SettingsScreen} 
        options={{
          tabBarLabel: 'Settings',
          tabBarIcon: ({ color, size }) => <Settings size={size} color={color} />,
        }}
      />
    </Tab.Navigator>
  );
}