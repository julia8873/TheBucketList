/**
 * FAB — Floating Action Button (brand blue, 52px)
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
import { useTranslation } from '@bucketlist/shared';

interface FABProps {
  onPress: () => void;
  icon?: string;         // defaults to "+"
  accessibilityLabel?: string;
  bottomOffset?: number; // distance from bottom (above tab bar)
}

export function FAB({
  onPress,
  icon = '+',
  accessibilityLabel,
  bottomOffset = 104,
}: FABProps) {
  const { t } = useTranslation();
  const a11y = accessibilityLabel ?? t('bucket.new', { defaultValue: 'Crear nueva tarea' });
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
        accessibilityLabel={a11y}
      >
        <Text style={styles.icon}>{icon}</Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: 16,
    zIndex: 100,
  },
  button: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#0073CF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0073CF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  icon: {
    fontFamily: fontFamily.regular,
    fontSize: 26,
    color: '#FFFFFF',
    lineHeight: 30,
    marginTop: Platform.OS === 'android' ? -2 : 0,
  },
});
