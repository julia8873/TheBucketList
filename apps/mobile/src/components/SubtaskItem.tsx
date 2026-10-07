import React, { useRef, useState } from 'react';
import { View, Animated, PanResponder, Pressable, TextInput, StyleSheet, Dimensions } from 'react-native';
import { Typography } from '@bucketlist/ui';
import { Trash2, CheckCircle2, Circle } from 'lucide-react-native';
import { gold, dark } from '@bucketlist/ui/src/tokens/colors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type SubtaskItemProps = {
  st: any;
  index: number;
  isOwner: boolean;
  theme: any;
  onToggle: (subtask: any) => void;
  onChange: (subtask: any, text: string) => void;
  onDelete: (subtask: any) => void;
  onMove: (fromIndex: number, toIndex: number) => void;
};

export function SubtaskItem({ st, index, isOwner, theme, onToggle, onChange, onDelete, onMove }: SubtaskItemProps) {
  const translateX = useRef(new Animated.Value(0)).current;
  const dragY = useRef(new Animated.Value(0)).current;
  const [dragging, setDragging] = useState(false);
  const draggingRef = useRef(false);
  const dragStartedAt = useRef<number | null>(null);
  const startY = useRef(0);
  const dragTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const swipeResponder = useRef(PanResponder.create({
    onMoveShouldSetPanResponder: (_, gesture) =>
      isOwner &&
      gesture.dx < -16 &&
      Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.8,
    onPanResponderMove: (_, gesture) => {
      if (gesture.dx < 0) translateX.setValue(Math.max(-110, gesture.dx));
    },
    onPanResponderRelease: (_, gesture) => {
      if (gesture.dx < -85 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.5) {
        Animated.timing(translateX, {
          toValue: -SCREEN_WIDTH,
          duration: 180,
          useNativeDriver: true,
        }).start(() => onDelete(st));
      } else {
        Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
      }
    },
    onPanResponderTerminate: () => {
      Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
    },
  })).current;

  const handleResponder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => isOwner,
    onMoveShouldSetPanResponder: () => isOwner,
    onPanResponderGrant: (_, gesture) => {
      startY.current = gesture.y0;
      dragStartedAt.current = Date.now();
      dragTimer.current = setTimeout(() => {
        if (dragStartedAt.current !== null) {
          draggingRef.current = true;
          setDragging(true);
        }
      }, 450);
    },
    onPanResponderMove: (_, gesture) => {
      if (!draggingRef.current) return;
      dragY.setValue(gesture.moveY - startY.current);
    },
    onPanResponderRelease: (_, gesture) => {
      if (draggingRef.current) {
        const rowHeight = 62;
        const offset = gesture.moveY - startY.current;
        const targetIndex = Math.max(0, index + Math.round(offset / rowHeight));
        dragY.setValue(0);
        draggingRef.current = false;
        setDragging(false);
        dragStartedAt.current = null;
        if (dragTimer.current) clearTimeout(dragTimer.current);
        onMove(index, targetIndex);
      } else {
        dragStartedAt.current = null;
        if (dragTimer.current) clearTimeout(dragTimer.current);
      }
    },
    onPanResponderTerminate: () => {
      dragStartedAt.current = null;
      if (dragTimer.current) clearTimeout(dragTimer.current);
      dragY.setValue(0);
      draggingRef.current = false;
      setDragging(false);
    },
  })).current;

  return (
    <View style={styles.swipeRowShell}>
      {isOwner && (
        <View style={[styles.deleteBackground, { backgroundColor: theme.colors.error }]}>
          <Trash2 color="#fff" size={20} strokeWidth={2} />
          <Typography variant="caption" color="#fff" style={{ marginLeft: 6, fontWeight: '700' }}>
            Eliminar
          </Typography>
        </View>
      )}
      <Animated.View
        {...swipeResponder.panHandlers}
        style={[
          styles.subtaskRow,
          { backgroundColor: theme.colors.background },
          dragging && styles.subtaskDragging,
          { transform: [{ translateX }, { translateY: dragY }] },
        ]}
      >
        <Pressable onPress={() => onToggle(st)}>
          {st.done ? (
            <CheckCircle2 color={gold[400]} size={22} strokeWidth={1.8} fill={dark[200]} />
          ) : (
            <Circle color={theme.colors.foregroundMuted} size={22} strokeWidth={1.8} />
          )}
        </Pressable>

        {isOwner ? (
          <TextInput
            defaultValue={st.title}
            style={[
              styles.subtaskText,
              { padding: 0, color: st.done ? theme.colors.foreground : theme.colors.foregroundMuted },
              st.done && styles.subtaskDoneText,
            ]}
            onChangeText={(newText) => onChange(st, newText)}
          />
        ) : (
          <Typography
            variant="body"
            color={st.done ? theme.colors.foreground : theme.colors.foregroundMuted}
            style={[styles.subtaskText, st.done && styles.subtaskDoneText]}
          >
            {st.title}
          </Typography>
        )}

        {isOwner && (
          <View
            {...handleResponder.panHandlers}
            style={styles.dragHandle}
            accessible
            accessibilityRole="button"
            accessibilityLabel="Mantén pulsado para reorganizar el paso"
          >
            <View style={styles.dragHandleLine} />
            <View style={styles.dragHandleLine} />
            <View style={styles.dragHandleLine} />
          </View>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  swipeRowShell: {
    position: 'relative',
    overflow: 'hidden',
  },
  deleteBackground: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: 18,
  },
  subtaskDragging: {
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 8,
  },
  subtaskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: dark[400],
    gap: 12,
  },
  subtaskText: {
    flex: 1,
    fontSize: 16,
  },
  dragHandle: {
    width: 34,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginLeft: 4,
  },
  dragHandleLine: {
    width: 20,
    height: 2,
    borderRadius: 1,
    backgroundColor: dark[500],
  },
  subtaskDoneText: {
    textDecorationLine: 'line-through',
  },
});
