import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  useColorScheme,
  Animated,
} from 'react-native';
import * as Haptics from 'expo-haptics';

export default function AchievementPopup({ achievement, onClose, isVisible }) {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const scaleAnim = new Animated.Value(0);
  const opacityAnim = new Animated.Value(0);

  useEffect(() => {
    if (isVisible && achievement) {
      // Trigger haptic feedback
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      // Animate in
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto close after 3 seconds
      const timer = setTimeout(() => {
        onClose();
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [isVisible, achievement]);

  if (!isVisible || !achievement) return null;

  return (
    <Pressable style={styles.overlay} onPress={onClose}>
      <Animated.View 
        style={[
          styles.popup,
          {
            backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
            transform: [{ scale: scaleAnim }],
            opacity: opacityAnim,
          },
        ]}
      >
        <Text style={styles.emoji}>{achievement.icon}</Text>
        <Text style={[styles.title, { color: isDark ? '#F9FAFB' : '#111827' }]}>
          Achievement Unlocked!
        </Text>
        <Text style={[styles.achievementName, { color: '#6366F1' }]}>
          {achievement.name}
        </Text>
        <Text style={[styles.description, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
          {achievement.description}
        </Text>
        <Text style={[styles.tapToClose, { color: isDark ? '#6B7280' : '#9CA3AF' }]}>
          Tap to close
        </Text>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  popup: {
    margin: 20,
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  emoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  achievementName: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 20,
  },
  tapToClose: {
    fontSize: 12,
    fontStyle: 'italic',
  },
});