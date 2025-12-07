import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Svg, Circle } from 'react-native-svg';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface BreathingCircleProps {
  running: boolean;
  isDark: boolean;
  size?: number; // Added optional size prop
}

export default function BreathingCircle({ running, isDark, size = 40 }: BreathingCircleProps) {
  const [phase, setPhase] = useState<'inhale' | 'holdIn' | 'exhale' | 'holdOut'>('inhale');
  const progressAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current; // New breathing animation
  
  const strokeWidth = size * 0.05; // Responsive thickness
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;

  const colors = {
    circle: isDark ? '#A5B4FC' : '#4F46E5',
    text: isDark ? '#E5E7EB' : '#0F172A',
  };

  const phaseLabels = {
    inhale: 'Inhale',
    holdIn: 'Hold',
    exhale: 'Exhale', 
    holdOut: 'Hold'
  };

  useEffect(() => {
    if (!running) {
      progressAnim.setValue(0);
      setPhase('inhale');
      return;
    }

    let animationActive = true;

    const cycle = () => {
      if (!animationActive) return;

// Inhale
      setPhase('inhale');
      Animated.parallel([
        Animated.timing(progressAnim, { toValue: 1, duration: 4000, useNativeDriver: true }),
        Animated.timing(scaleAnim, { toValue: 1.15, duration: 4000, useNativeDriver: true }) // Expand
      ]).start(({ finished }) => {
        if (!finished || !animationActive) return;
        
        // Hold In
        setPhase('holdIn');
        setTimeout(() => {
          if (!animationActive) return;
          
// Exhale
          setPhase('exhale');
          Animated.parallel([
            Animated.timing(progressAnim, { toValue: 0, duration: 4000, useNativeDriver: true }),
            Animated.timing(scaleAnim, { toValue: 1, duration: 4000, useNativeDriver: true }) // Contract
          ]).start(({ finished }) => {
            if (!finished || !animationActive) return;
            
            // Hold Out
            setPhase('holdOut');
            setTimeout(() => {
              if (animationActive && running) cycle();
            }, 4000);
          });
        }, 4000);
      });
    };

    cycle();

    return () => {
      animationActive = false;
    };
  }, [running]);

const strokeDashoffset = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [circumference, 0]
  });

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <Svg width={size} height={size}>
          {/* Background Track with subtle fill */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'}
            strokeWidth={strokeWidth}
            fill={isDark ? 'rgba(255,255,255,0.05)' : 'rgba(99,102,241,0.05)'}
          />
          {/* Active Progress Ring */}
          <AnimatedCircle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={colors.circle}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            rotation="-90"
            origin={`${size / 2}, ${size / 2}`}
          />
        </Svg>
      </Animated.View>
      
      {/* Centered Text Overlay */}
      <View style={StyleSheet.absoluteFillObject} pointerEvents="none" justifyContent="center" alignItems="center">
        <Text style={[styles.phaseText, { color: colors.text, fontSize: size * 0.16 }]}>
          {phaseLabels[phase]}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  phaseText: {
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    opacity: 0.9,
  },
});