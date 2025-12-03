// src/utils/ignoreWarnings.js

import { LogBox } from 'react-native';

if (__DEV__) {
  // Warnings to suppress in development
  const ignoreWarns = [
    "Expo AV has been deprecated",
    "setLayoutAnimationEnabledExperimental",
    "Non-serializable values were found",
  ];

  const error = console.error;
  console.error = (...arg) => {
    for (const warning of ignoreWarns) {
      if (arg[0].includes(warning)) return;
    }
    error(...arg);
  };
  
  // Suppress warnings in LogBox too
  LogBox.ignoreLogs(ignoreWarns);
}