import React from 'react';
import { Modal, View, Text, StyleSheet, Pressable, useColorScheme, Animated } from 'react-native';
import { useUIStore } from '../stores/uiStore';
import { Feather } from '@expo/vector-icons';

export default function GlobalAlert() {
  const { alertConfig, hideAlert } = useUIStore();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  // Animation for pop-in effect
  const scaleAnim = React.useRef(new Animated.Value(0.9)).current;
  const opacityAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (alertConfig.visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, friction: 7 }),
        Animated.timing(opacityAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.timing(opacityAnim, { toValue: 0, duration: 150, useNativeDriver: true }).start(() => {
        scaleAnim.setValue(0.9);
      });
    }
  }, [alertConfig.visible]);

  if (!alertConfig.visible) return null;

  return (
    <Modal transparent visible={alertConfig.visible} animationType="none">
      <View style={styles.overlay}>
        <Animated.View 
          style={[
            styles.alertBox, 
            { 
              backgroundColor: isDark ? '#1E293B' : 'white',
              opacity: opacityAnim,
              transform: [{ scale: scaleAnim }]
            }
          ]}
        >
          {/* Icon (Optional decoration) */}
          <View style={[styles.iconCircle, { backgroundColor: isDark ? '#334155' : '#F1F5F9' }]}>
            <Feather name="info" size={28} color="#6366F1" />
          </View>

          <Text style={[styles.title, { color: isDark ? '#F8FAFC' : '#1E293B' }]}>
            {alertConfig.title}
          </Text>
          
          <Text style={[styles.message, { color: isDark ? '#CBD5E1' : '#64748B' }]}>
            {alertConfig.message}
          </Text>

          <View style={styles.buttonContainer}>
            {alertConfig.buttons.map((btn, index) => {
              const isPrimary = btn.style !== 'cancel';
              return (
                <Pressable
                  key={index}
                  style={[
                    styles.button,
                    isPrimary ? styles.primaryButton : styles.secondaryButton,
                    index > 0 && { marginLeft: 12 }
                  ]}
                  onPress={() => {
                    hideAlert();
                    if (btn.onPress) btn.onPress();
                  }}
                >
                  <Text style={[
                    styles.buttonText,
                    isPrimary ? { color: 'white' } : { color: isDark ? '#94A3B8' : '#64748B' }
                  ]}>
                    {btn.text}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)', // Dim background
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  alertBox: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    width: '100%',
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {
    backgroundColor: '#6366F1',
    shadowColor: '#6366F1',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 4,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});