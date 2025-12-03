import { LogBox } from 'react-native';

if (__DEV__) {
  const ignoreWarns = [
    "Expo AV has been deprecated",
    "setLayoutAnimationEnabledExperimental",
    "Non-serializable values were found",
  ];

  const error = console.error;
  console.error = (...args) => {
    // Safe check: Ensure first argument is a string before checking includes
    if (typeof args[0] === 'string') {
      for (const warning of ignoreWarns) {
        if (args[0].includes(warning)) return;
      }
    }
    error(...args);
  };

  const warn = console.warn;
  console.warn = (...args) => {
    if (typeof args[0] === 'string') {
      for (const warning of ignoreWarns) {
        if (args[0].includes(warning)) return;
      }
    }
    warn(...args);
  };

  LogBox.ignoreLogs(ignoreWarns);
}