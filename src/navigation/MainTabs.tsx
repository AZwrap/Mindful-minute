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

// --- JOURNAL SCREENS (For Tab Visibility) ---
import SharedJournalScreen from "../screens/SharedJournalScreen";
import { createNativeStackNavigator } from '@react-navigation/native-stack';

const Tab = createBottomTabNavigator();
const HomeStack = createNativeStackNavigator();

function HomeStackNavigator() {
  // Fix: Get palette here to set the container background (prevents white flash on swipe)
  const palette = useSharedPalette();
  
  return (
    <HomeStack.Navigator 
      initialRouteName="HomeScreen" 
      screenOptions={{ 
        headerShown: false, 
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: palette.bg } // <--- The Magic Fix
      }}
    >
      <HomeStack.Screen name="HomeScreen" component={HomeScreen} />
      {/* ONLY these two are added here to keep the Tab Bar visible */}
      <HomeStack.Screen name="JournalList" component={require('../screens/JournalListScreen').default} />
      <HomeStack.Screen name="SharedJournal" component={SharedJournalScreen} />
    </HomeStack.Navigator>
  );
}

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
{/* 1. TODAY -> HomeStack (Includes Journal Lists) */}
      <Tab.Screen 
        name="Today" 
        component={HomeStackNavigator}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            // Prevent default action (which preserves stack history)
            e.preventDefault();
            // Always reset to the root 'HomeScreen' of this stack
            navigation.navigate('Today', { screen: 'HomeScreen' });
          },
        })}
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