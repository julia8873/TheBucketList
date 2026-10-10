import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';

const SCREEN_H = Dimensions.get('window').height;
/** Altura de las hojas de etiquetas (igual que el diseño: ~690 en 844). */
export const TAG_SHEET_H = Math.min(690, SCREEN_H * 0.88);
const MAX_H = Math.min(740, SCREEN_H * 0.92);

interface TagSheetShellProps {
  visible: boolean;
  onClose: () => void;
  /** Altura fija (hoja de filtros). Si no se indica, se ajusta al contenido hasta MAX_H. */
  fixedHeight?: number;
  children: React.ReactNode;
}

/**
 * Hoja inferior animada (fondo oscuro, asa, arrastrar hacia abajo para cerrar).
 * Se monta mientras `visible` o mientras dura la animación de salida.
 */
export function TagSheetShell({ visible, onClose, fixedHeight, children }: TagSheetShellProps) {
  const [mounted, setMounted] = useState(visible);
  const sheetH = fixedHeight ?? MAX_H;
  const translateY = useRef(new Animated.Value(sheetH)).current;
  const backdrop = useRef(new Animated.Value(0)).current;

  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (visible) {
      translateY.setValue(sheetH);
      setMounted(true);
      Animated.parallel([
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true, damping: 20, stiffness: 200 }),
        Animated.timing(backdrop, { toValue: 1, duration: 250, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateY, { toValue: sheetH, duration: 220, useNativeDriver: true }),
        Animated.timing(backdrop, { toValue: 0, duration: 220, useNativeDriver: true }),
      ]).start(({ finished }) => {
        if (finished) setMounted(false);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 4,
      onPanResponderMove: (_, g) => {
        if (g.dy > 0) translateY.setValue(g.dy);
      },
      onPanResponderRelease: (_, g) => {
        if (g.dy > 120 || g.vy > 1.2) closeRef.current();
        else Animated.spring(translateY, { toValue: 0, useNativeDriver: true }).start();
      },
    }),
  ).current;

  if (!mounted) return null;

  return (
    <Modal visible transparent animationType="none" onRequestClose={() => closeRef.current()} statusBarTranslucent>
      <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, { opacity: backdrop }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => closeRef.current()} accessibilityLabel="Cerrar" />
        </Animated.View>

        <Animated.View
          style={[
            styles.sheet,
            fixedHeight ? { height: fixedHeight } : { maxHeight: MAX_H },
            { transform: [{ translateY }] },
          ]}
        >
          <View {...pan.panHandlers} style={styles.handleArea}>
            <View style={styles.handle} />
          </View>
          <View style={fixedHeight ? styles.fill : styles.shrink}>{children}</View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { backgroundColor: 'rgba(0,0,0,0.7)' },
  sheet: {
    backgroundColor: '#141414',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: '#2A2A2A',
    overflow: 'hidden',
  },
  handleArea: { paddingTop: 10, paddingBottom: 14, alignItems: 'center' },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#444444' },
  fill: { flex: 1 },
  shrink: { flexShrink: 1 },
});
