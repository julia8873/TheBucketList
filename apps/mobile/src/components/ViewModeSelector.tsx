import { themedStyleSheet } from '@bucketlist/ui';
import React from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { View, Pressable, StyleSheet } from 'react-native';
import { LayoutList, LayoutGrid, AlignJustify } from 'lucide-react-native';
import { gold, useTheme } from '@bucketlist/ui';
import { useTranslation } from '@bucketlist/shared';

export type TaskViewMode = 'list' | 'gallery' | 'compact';

interface ViewModeSelectorProps {
  mode: TaskViewMode;
  onChange: (mode: TaskViewMode) => void;
  style?: StyleProp<ViewStyle>;
}

export function ViewModeSelector({ mode, onChange, style }: ViewModeSelectorProps) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const isDark = theme.dark;

  const inactiveIconColor = theme.colors.foregroundMuted ?? (isDark ? '#A0A0A0' : '#756E63');
  const activeIconColor = theme.colors.primaryForeground ?? (isDark ? '#0E0E0E' : '#FFFFFF');
  const activeBg = theme.colors.primary;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.surfaceElevated ?? (isDark ? '#181818' : '#EAE5DB'),
          borderColor: theme.colors.border,
        },
        style,
      ]}
    >
      <Pressable
        onPress={() => onChange('list')}
        style={[styles.btn, mode === 'list' && { backgroundColor: activeBg }]}
        hitSlop={4}
        accessibilityRole="button"
        accessibilityLabel={t('common.list')}
      >
        <LayoutList size={15} color={mode === 'list' ? activeIconColor : inactiveIconColor} />
      </Pressable>
      <Pressable
        onPress={() => onChange('gallery')}
        style={[styles.btn, mode === 'gallery' && { backgroundColor: activeBg }]}
        hitSlop={4}
        accessibilityRole="button"
        accessibilityLabel={t('common.gallery')}
      >
        <LayoutGrid size={15} color={mode === 'gallery' ? activeIconColor : inactiveIconColor} />
      </Pressable>
      <Pressable
        onPress={() => onChange('compact')}
        style={[styles.btn, mode === 'compact' && { backgroundColor: activeBg }]}
        hitSlop={4}
        accessibilityRole="button"
        accessibilityLabel={t('common.compact')}
      >
        <AlignJustify size={15} color={mode === 'compact' ? activeIconColor : inactiveIconColor} />
      </Pressable>
    </View>
  );
}

const styles = themedStyleSheet({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    padding: 2,
    gap: 2,
    borderWidth: 1,
    height: 32,
  },
  btn: {
    paddingHorizontal: 6,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
  },
});
