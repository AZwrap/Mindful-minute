import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Svg, Circle } from 'react-native-svg';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface BreathingCircleProps {
  running: boolean;
  isDark: boolean;
}

export default function BreathingCircle({ running, isDark }: BreathingCircleProps) {
  const [phase, setPhase] = useState<'inhale' | 'holdIn' | 'exhale' | 'holdOut'>('inhale');
  const progressAnim = useRef(new Animated.Value(0)).current;
  
  const size = 40;
  const strokeWidth = 3;
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
      Animated.timing(progressAnim, {
        toValue: 1,
        duration: 4000,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (!finished || !animationActive) return;
        
        // Hold In
        setPhase('holdIn');
        setTimeout(() => {
          if (!animationActive) return;
          
          // Exhale
          setPhase('exhale');
          Animated.timing(progressAnim, {
            toValue: 0,
            duration: 4000,
            useNativeDriver: true,
          }).start(({ finished }) => {
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
    <View style={styles.container}>
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}
          strokeWidth={strokeWidth}
          fill="none"
        />
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
      <Text style={[styles.phaseText, { color: colors.text }]}>
        {phaseLabels[phase]}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 50,
  },
  phaseText: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});