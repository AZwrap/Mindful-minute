import React from 'react';
import { View, Text, StyleSheet, useColorScheme } from 'react-native';

export default function HomeHeader({ scheme }) {
  const isDark = scheme === 'dark';
  
  return (
    <View style={[
      styles.header,
      { 
        backgroundColor: isDark ? '#0F172A' : '#F8FAFC',
        borderBottomColor: isDark ? '#1E293B' : '#E2E8F0',
      }
    ]}>
      <Text style={[
        styles.title,
        { color: isDark ? '#E5E7EB' : '#0F172A' }
      ]}>
        Mindful Minute
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    height: 100, // Slightly taller for prominence
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
});