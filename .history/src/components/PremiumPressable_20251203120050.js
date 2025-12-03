// In PremiumPressable.js - Using Animated.createAnimatedComponent
import React, { useRef } from 'react';
import { Pressable, Animated } from 'react-native';
import * as Haptics from 'expo-haptics';
import PropTypes from 'prop-types';

// Create an animated version of Pressable
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

PremiumPressable.propTypes = {
  children: PropTypes.node.isRequired,
  onPress: PropTypes.func,
  style: PropTypes.oneOfType([PropTypes.object, PropTypes.array]),
  haptic: PropTypes.oneOf(['light', 'medium', 'heavy', 'success', 'warning', 'error']),
  disabled: PropTypes.bool,
};

export default function PremiumPressable({ 
  children, 
  onPress, 
  style, 
  haptic = 'light',
  scaleTo = 0.96,
  disabled = false 
}) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    if (disabled) return;
    
    Animated.spring(scaleAnim, {
      toValue: scaleTo,
      useNativeDriver: true,
      friction: 8,
      tension: 40,
    }).start();
  };

  const handlePressOut = () => {
    if (disabled) return;
    
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      friction: 8,
      tension: 40,
    }).start();
  };

  const handlePress = async () => {
    if (disabled) return;
    
    if (haptic && haptic !== 'none') {
      try {
        await Haptics.impactAsync(
          haptic === 'medium' ? Haptics.ImpactFeedbackStyle.Medium :
          haptic === 'heavy' ? Haptics.ImpactFeedbackStyle.Heavy :
          Haptics.ImpactFeedbackStyle.Light
        );
      } catch {}
    }
    
    onPress?.();
  };

  return (
    <AnimatedPressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
      disabled={disabled}
      style={[style, { transform: [{ scale: scaleAnim }] }]}
    >
      {children}
    </AnimatedPressable>
  );
}