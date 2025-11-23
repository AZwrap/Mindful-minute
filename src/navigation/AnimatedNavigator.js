import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator, CardStyleInterpolators } from '@react-navigation/stack';
import { Easing } from 'react-native';

const Stack = createStackNavigator();

// Custom slide from right animation
const slideFromRight = ({ current, next, inverted, layouts: { screen } }) => {
  const translateX = current.progress.interpolate({
    inputRange: [0, 1],
    outputRange: [screen.width, 0],
  });

  const opacity = current.progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  return {
    cardStyle: {
      opacity,
      transform: [{ translateX }],
    },
  };
};

// Custom slide from bottom animation (for modals)
const slideFromBottom = ({ current, next, inverted, layouts: { screen } }) => {
  const translateY = current.progress.interpolate({
    inputRange: [0, 1],
    outputRange: [screen.height * 0.1, 0],
  });

  const opacity = current.progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  return {
    cardStyle: {
      opacity,
      transform: [{ translateY }],
    },
  };
};

// Fade animation
const fadeIn = ({ current }) => ({
  cardStyle: {
    opacity: current.progress,
  },
});

export const AnimatedNavigator = ({ children }) => {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          cardStyleInterpolator: slideFromRight,
          transitionSpec: {
            open: {
              animation: 'timing',
              config: {
                duration: 300,
                easing: Easing.out(Easing.poly(4)),
              },
            },
            close: {
              animation: 'timing',
              config: {
                duration: 250,
                easing: Easing.in(Easing.poly(4)),
              },
            },
          },
          cardStyle: {
            backgroundColor: 'transparent',
          },
        }}
      >
        {children}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

// Export animation configs for individual screens
export const ScreenTransitions = {
  slideFromRight,
  slideFromBottom,
  fadeIn,
  modal: CardStyleInterpolators.forModalPresentationIOS,
  vertical: CardStyleInterpolators.forVerticalIOS,
};