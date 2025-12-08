import React, { useRef } from 'react';
import { Pressable, Animated, StyleProp, ViewStyle, GestureResponderEvent } from 'react-native';
import * as Haptics from 'expo-haptics';

// Create an animated version of Pressable
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// --------------------------------------------------
// TYPES
// --------------------------------------------------
import { PressableProps } from 'react-native';

interface Props extends PressableProps {
  children: React.ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle> | ((state: { pressed: boolean }) => StyleProp<ViewStyle>);
  haptic?: 'light' | 'medium' | 'heavy' | 'selection';
  disabled?: boolean;
}

const PremiumPressable = ({ 
  children, 
  onPress, 
  style, 
  haptic = 'light', 
  disabled = false,
  accessibilityRole = 'button', // Default role
  ...props // Pass through other props like accessibilityLabel
}: Props) => {

// --------------------------------------------------
// COMPONENT
// --------------------------------------------------
export default function PremiumPressable({ 
  children, 
  onPress, 
  style, 
  haptic = 'light',
  scaleTo = 0.96,
  disabled = false,
  ...props
}: PremiumPressableProps) {
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

  const handlePress = async (e: GestureResponderEvent) => {
    if (disabled) return;
    
    if (haptic && haptic !== 'none') {
      try {
        const feedbackStyle = 
          haptic === 'medium' ? Haptics.ImpactFeedbackStyle.Medium :
          haptic === 'heavy' ? Haptics.ImpactFeedbackStyle.Heavy :
          Haptics.ImpactFeedbackStyle.Light;
          
        await Haptics.impactAsync(feedbackStyle);
      } catch {}
    }
    
    onPress?.(e);
  };

  return (
    <AnimatedPressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
      disabled={disabled}
      style={[style, { transform: [{ scale: scaleAnim }] }]}
      {...props}
    >
      {children}
    </AnimatedPressable>
  );
}