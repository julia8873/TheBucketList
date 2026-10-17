import React from 'react';
import { View, Pressable, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { LayoutList, LayoutGrid, AlignJustify } from 'lucide-react-native';
import { gold } from '@bucketlist/ui';

export type TaskViewMode = 'list' | 'gallery' | 'compact';

interface ViewModeSelectorProps {
  mode: TaskViewMode;
  onChange: (mode: TaskViewMode) => void;
  style?: StyleProp<ViewStyle>;
}

export function ViewModeSelector({ mode, onChange, style }: ViewModeSelectorProps) {
  return (
    <View style={[styles.container, style]}>
      <Pressable
        onPress={() => onChange('list')}
        style={[styles.btn, mode === 'list' && styles.btnActive]}
        hitSlop={4}
        accessibilityRole="button"
        accessibilityLabel="Vista detallada"
      >
        <LayoutList size={15} color={mode === 'list' ? '#0E0E0E' : '#A0A0A0'} />
      </Pressable>
      <Pressable
        onPress={() => onChange('gallery')}
        style={[styles.btn, mode === 'gallery' && styles.btnActive]}
        hitSlop={4}
        accessibilityRole="button"
        accessibilityLabel="Vista galería"
      >
        <LayoutGrid size={15} color={mode === 'gallery' ? '#0E0E0E' : '#A0A0A0'} />
      </Pressable>
      <Pressable
        onPress={() => onChange('compact')}
        style={[styles.btn, mode === 'compact' && styles.btnActive]}
        hitSlop={4}
        accessibilityRole="button"
        accessibilityLabel="Vista compacta"
      >
        <AlignJustify size={15} color={mode === 'compact' ? '#0E0E0E' : '#A0A0A0'} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#181818',
    borderRadius: 8,
    padding: 2,
    borderWidth: 1,
    borderColor: '#242424',
    height: 32,
  },
  btn: {
    paddingHorizontal: 8,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
  },
  btnActive: {
    backgroundColor: gold[400],
  },
});
