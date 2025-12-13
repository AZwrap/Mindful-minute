import { LogBox } from 'react-native';

LogBox.ignoreLogs([
  'ViewPropTypes will be removed',
  'ColorPropType will be removed',
  'Constants.platform.ios.model',
  'fontFamily "Inter" is not a system font',
  'Expo AV has been deprecated',
  '[expo-av]',
  'setLayoutAnimationEnabledExperimental',
]);