import { TransitionPresets } from '@react-navigation/stack';

export const IOS_TRANSITION = {
  ...TransitionPresets.SlideFromRightIOS,
  gestureEnabled: true,
  gestureDirection: 'horizontal',
};

export const FADE_TRANSITION = {
  ...TransitionPresets.FadeFromBottomAndroid,
};

export const MODAL_TRANSITION = {
  ...TransitionPresets.ModalPresentationIOS,
  gestureEnabled: true,
  cardOverlayEnabled: true,
};