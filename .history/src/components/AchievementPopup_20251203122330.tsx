import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  useColorScheme,
  Animated,
  Easing,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useSharedPalette } from '../hooks/useSharedPalette'; // <--- Hook for dynamic colors

export default function AchievementPopup({ achievement, onClose, isVisible }) {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  
  // 1. Get the dynamic palette (includes your custom accent color)
  const palette = useSharedPalette();

  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(1)).current; // <--- For the pulse

  useEffect(() => {
    if (isVisible && achievement) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      // 2. Entrance Animation (Pop + Fade)
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

      // 3. Continuous "Breathing" Glow Loop
      const glowLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1.4, // Grow bigger
            duration: 1500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(glowAnim, {
            toValue: 1,   // Shrink back
            duration: 1500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );
      glowLoop.start();

      // Auto close
      const timer = setTimeout(() => {
        onClose();
      }, 3500); // Increased slightly so user enjoys the glow

      return () => {
        clearTimeout(timer);
        glowLoop.stop();
      };
    } else {
        // Reset when hidden
        scaleAnim.setValue(0);
        opacityAnim.setValue(0);
        glowAnim.setValue(1);
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
            shadowColor: palette.accent, // Dynamic Shadow
          },
        ]}
      >
        {/* 4. The Glowing Background Pulse */}
        <View style={styles.iconContainer}>
            <Animated.View
                style={[
                    styles.glowCircle,
                    {
                        backgroundColor: palette.accent, // Dynamic Color
                        transform: [{ scale: glowAnim }],
                    }
                ]}
            />
            <Text style={styles.emoji}>{achievement.icon}</Text>
        </View>

        <Text style={[styles.title, { color: isDark ? '#F9FAFB' : '#111827' }]}>
          Achievement Unlocked!
        </Text>
        
        {/* 5. Dynamic Text Color */}
        <Text style={[styles.achievementName, { color: palette.accent }]}>
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
    backgroundColor: 'rgba(0, 0, 0, 0.6)', // Slightly darker for better contrast
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  popup: {
    margin: 20,
    padding: 24,
    borderRadius: 24, // Softer corners
    alignItems: 'center',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
    width: '80%',
    maxWidth: 340,
  },
  iconContainer: {
    marginBottom: 16,
    alignItems: 'center',
    justifyContent: 'center',
    width: 80,
    height: 80,
  },
  glowCircle: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    opacity: 0.25, // Gentle see-through glow
  },
  emoji: {
    fontSize: 48,
    // No margin bottom here, handled by container
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    opacity: 0.8,
  },
  achievementName: {
    fontSize: 22,
    fontWeight: '800', // Extra bold for impact
    marginBottom: 12,
    textAlign: 'center',
  },
  description: {
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 22,
  },
  tapToClose: {
    fontSize: 12,
    fontStyle: 'italic',
    opacity: 0.7,
  },
});