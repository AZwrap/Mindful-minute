// src/utils/hooks/useKeyboardScrollFix.js
// Custom hook to automatically scroll target inputs into view on keyboard show

import { useEffect, useRef } from "react";
import { Keyboard, Platform } from "react-native";

export default function useKeyboardScrollFix(scrollViewRef) {
  const activeInputY = useRef(0);

  // Register input position when focused
  const registerInput = (y) => {
    activeInputY.current = y;
  };

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.select({ android: "keyboardDidShow", ios: "keyboardWillShow" }),
      (e) => {
        if (!scrollViewRef?.current || !activeInputY.current) return;

        const keyboardHeight = e.endCoordinates.height;
        const targetY = activeInputY.current - 100; // small offset

        scrollViewRef.current.scrollTo({
          y: Math.max(0, targetY - keyboardHeight),
          animated: true,
        });
      }
    );

    const hideSub = Keyboard.addListener(
      Platform.select({ android: "keyboardDidHide", ios: "keyboardWillHide" }),
      () => {
        // Optionally scroll back up
      }
    );

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  return { registerInput };
}
