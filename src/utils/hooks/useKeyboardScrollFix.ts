import { useEffect } from 'react';
import { Keyboard, Platform, ScrollView } from 'react-native';

export const useKeyboardScrollFix = (
  scrollRef: React.RefObject<ScrollView>, 
  inputY: number
) => {
  useEffect(() => {
    if (Platform.OS !== 'ios') return;

    const subscription = Keyboard.addListener('keyboardDidShow', (e) => {
      // Optional: Scroll to ensure input is visible
      // This logic can be expanded for advanced handling
      if (scrollRef.current && inputY > 0) {
         scrollRef.current.scrollTo({ y: Math.max(0, inputY - 100), animated: true });
      }
    });

    return () => subscription.remove();
  }, [inputY, scrollRef]);
};