import React, { useRef } from 'react';
import { Pressable, Animated, StyleProp, ViewStyle, GestureResponderEvent, PressableProps } from 'react-native';
import * as Haptics from 'expo-haptics';

// Create an animated version of Pressable
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// --------------------------------------------------
// TYPES
// --------------------------------------------------
interface Props extends PressableProps {
  children: React.ReactNode;
  onPress?: (event: GestureResponderEvent) => void;
  style?: StyleProp<ViewStyle> | ((state: { pressed: boolean }) => StyleProp<ViewStyle>);
  haptic?: 'light' | 'medium' | 'heavy' | 'selection' | 'none';
  scaleTo?: number;
  disabled?: boolean;
}

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
  accessibilityRole = 'button', 
  ...props
}: Props) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    if (disabled) return;
    
    Animated.spring(scaleAnim, {
      toValue: scaleTo!,
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
        if (haptic === 'selection') {
          await Haptics.selectionAsync();
        } else {
          const feedbackStyle = 
            haptic === 'medium' ? Haptics.ImpactFeedbackStyle.Medium :
            haptic === 'heavy' ? Haptics.ImpactFeedbackStyle.Heavy :
            Haptics.ImpactFeedbackStyle.Light;
            
          await Haptics.impactAsync(feedbackStyle);
        }
      } catch {}
    }
    
    onPress?.(e);
  };

  return (
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      accessibilityRole={accessibilityRole}
      // FIX: Safely handle function styles vs object styles
      style={({ pressed }) => [
        typeof style === 'function' ? style({ pressed }) : style,
        { transform: [{ scale: scaleAnim }] },
        { opacity: disabled ? 0.6 : 1 }
      ]}
      {...props}
    >
      {children}
    </AnimatedPressable>
  );
}