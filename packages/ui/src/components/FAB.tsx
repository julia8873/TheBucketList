/**
 * FAB — Floating Action Button (gold, 56px)
 * Positioned bottom-right above tab bar.
 */
import React, { useRef } from 'react';
import {
  Pressable,
  Text,
  StyleSheet,
  Animated,
  Platform,
} from 'react-native';
import { gold, dark } from '../tokens/colors';
import { fontFamily } from '../tokens/typography';

interface FABProps {
  onPress: () => void;
  icon?: string;         // defaults to "+"
  accessibilityLabel?: string;
  bottomOffset?: number; // distance from bottom (above tab bar)
}

export function FAB({
  onPress,
  icon = '+',
  accessibilityLabel = 'Crear nueva tarea',
  bottomOffset = 104,
}: FABProps) {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scale, {
      toValue: 0.92,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View
      style={[
        styles.container,
        { bottom: bottomOffset, transform: [{ scale }] },
      ]}
    >
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={styles.button}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
      >
        <Text style={styles.icon}>{icon}</Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: 20,
    zIndex: 100,
  },
  button: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#D4B13A',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#D4B13A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 8,
  },
  icon: {
    fontFamily: fontFamily.regular,
    fontSize: 26,
    color: '#000000',
    lineHeight: 30,
    marginTop: Platform.OS === 'android' ? -2 : 0,
  },
});
