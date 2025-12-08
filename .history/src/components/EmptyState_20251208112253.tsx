import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { LucideIcon } from 'lucide-react-native';
import { useSharedPalette } from '../hooks/useSharedPalette';
import PremiumPressable from './PremiumPressable';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  style?: ViewStyle;
}

export default function EmptyState({ icon: Icon, title, message, actionLabel, onAction, style }: EmptyStateProps) {
  const palette = useSharedPalette();

  return (
    <View style={[styles.container, style]}>
      <View style={[styles.iconBubble, { backgroundColor: palette.accent + '15' }]}>
        <Icon size={32} color={palette.accent} />
      </View>
      
      <Text style={[styles.title, { color: palette.text }]}>{title}</Text>
      <Text style={[styles.message, { color: palette.subtleText }]}>{message}</Text>

      {actionLabel && onAction && (
        <PremiumPressable
          onPress={onAction}
          haptic="medium"
          style={[styles.button, { backgroundColor: palette.card, borderColor: palette.border }]}
        >
          <Text style={[styles.buttonText, { color: palette.accent }]}>{actionLabel}</Text>
        </PremiumPressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    flex: 1,
  },
  iconBubble: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 280,
    marginBottom: 24,
  },
  button: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  buttonText: {
    fontWeight: '600',
    fontSize: 15,
  }
});