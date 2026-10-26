import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, PanResponder, Pressable, View } from 'react-native';
import { GripVertical, Trash2 } from 'lucide-react-native';
import { Typography } from '@bucketlist/ui';
import { useTranslation } from '@bucketlist/shared';
import type { MentionTask } from './TaskMentionPickerSheet';

const ROW_HEIGHT = 50;
const DELETE_WIDTH = 84;

export type MentionItem = {
  mentionId: string;
  task: MentionTask;
};

type RowProps = {
  item: MentionItem;
  index: number;
  slot: number;
  count: number;
  theme: any;
  isOwner: boolean;
  isActive: boolean;
  onDragStart: (i: number) => void;
  onDragOver: (i: number) => void;
  onDragEnd: (from: number, to: number) => void;
  onPress: (task: MentionTask) => void;
  onDelete: (mentionId: string, title: string) => void;
};

function Row(props: RowProps) {
  const { item, index, slot, theme, isOwner, isActive } = props;
  const { t } = useTranslation();

  const latest = useRef(props);
  latest.current = props;

  const y = useRef(new Animated.Value(index * ROW_HEIGHT)).current;
  const scale = useRef(new Animated.Value(1)).current;
  const swipeX = useRef(new Animated.Value(0)).current;
  const swipeOpen = useRef(false);
  const lastOver = useRef(index);

  useEffect(() => {
    if (isActive) return;
    Animated.spring(y, {
      toValue: slot * ROW_HEIGHT,
      useNativeDriver: true,
      damping: 20,
      stiffness: 260,
      mass: 0.7,
    }).start();
  }, [slot, isActive, y]);

  useEffect(() => {
    Animated.spring(scale, {
      toValue: isActive ? 1.03 : 1,
      useNativeDriver: true,
      damping: 20,
      stiffness: 300,
    }).start();
  }, [isActive, scale]);

  // ── Reordenar: PanResponder del asa (⠿) ──
  const endDrag = () => {
    const { index: i, onDragEnd } = latest.current;
    onDragEnd(i, lastOver.current);
  };

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => {
        const { index: i, onDragStart } = latest.current;
        lastOver.current = i;
        y.setValue(i * ROW_HEIGHT);
        onDragStart(i);
      },
      onPanResponderMove: (_, g) => {
        const { index: i, count: n, onDragOver } = latest.current;
        const dy = Math.max(-i * ROW_HEIGHT, Math.min(g.dy, (n - 1 - i) * ROW_HEIGHT));
        y.setValue(i * ROW_HEIGHT + dy);
        const over = Math.max(0, Math.min(n - 1, Math.round(i + dy / ROW_HEIGHT)));
        if (over !== lastOver.current) {
          lastOver.current = over;
          onDragOver(over);
        }
      },
      onPanResponderRelease: endDrag,
      onPanResponderTerminate: endDrag,
    }),
  ).current;

  // ── Borrar: swipe horizontal sobre la fila ──
  const settleSwipe = (open: boolean) => {
    swipeOpen.current = open;
    Animated.spring(swipeX, {
      toValue: open ? -DELETE_WIDTH : 0,
      useNativeDriver: true,
      damping: 22,
      stiffness: 260,
    }).start();
  };

  const swipe = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponderCapture: (_, g) =>
        latest.current.isOwner && Math.abs(g.dx) > 10 && Math.abs(g.dx) > Math.abs(g.dy) * 2,
      onPanResponderTerminationRequest: () => false,
      onPanResponderMove: (_, g) => {
        const base = swipeOpen.current ? -DELETE_WIDTH : 0;
        swipeX.setValue(Math.max(-DELETE_WIDTH * 1.3, Math.min(0, base + g.dx)));
      },
      onPanResponderRelease: (_, g) => {
        const base = swipeOpen.current ? -DELETE_WIDTH : 0;
        settleSwipe(base + g.dx < -DELETE_WIDTH / 2);
      },
      onPanResponderTerminate: () => settleSwipe(false),
    }),
  ).current;

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        top: 0,
        height: ROW_HEIGHT,
        zIndex: isActive ? 10 : 0,
        elevation: isActive ? 8 : 0,
        shadowColor: '#000',
        shadowOpacity: isActive ? 0.35 : 0,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
        transform: [{ translateY: y }, { scale }],
      }}
    >
      {/* Botón de eliminar con swipe */}
      {isOwner && (
        <Animated.View
          style={{
            position: 'absolute',
            right: 0,
            top: 0,
            bottom: 0,
            width: DELETE_WIDTH,
            opacity: swipeX.interpolate({
              inputRange: [-DELETE_WIDTH, -8, 0],
              outputRange: [1, 1, 0],
              extrapolate: 'clamp',
            }),
          }}
        >
          <Pressable
            onPress={() => {
              settleSwipe(false);
              props.onDelete(item.mentionId, item.task.title);
            }}
            style={{
              flex: 1,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#dc2626',
              borderRadius: 12,
            }}
          >
            <Trash2 color="#fff" size={20} strokeWidth={2} />
          </Pressable>
        </Animated.View>
      )}

      {/* Fila principal */}
      <Animated.View
        {...swipe.panHandlers}
        style={{
          width: '100%',
          height: '100%',
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          borderRadius: 12,
          backgroundColor: theme.colors.background,
          transform: [{ translateX: swipeX }],
        }}
      >
        {/* Asa para reorganizar en vez de la foto */}
        {isOwner && (
          <View
            {...pan.panHandlers}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            style={{
              width: 36,
              height: '100%',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            accessible
            accessibilityRole="button"
            accessibilityLabel={t('tasks.drag_to_reorder_mention')}
          >
            <GripVertical color={theme.colors.foregroundMuted} size={20} strokeWidth={1.8} />
          </View>
        )}

        {/* Solo el nombre de la tarea. Al pulsar te lleva a esa tarea */}
        <Pressable
          onPress={() => props.onPress(item.task)}
          onLongPress={isOwner ? () => props.onDelete(item.mentionId, item.task.title) : undefined}
          style={({ pressed }) => ({
            flex: 1,
            height: '100%',
            justifyContent: 'center',
            paddingLeft: isOwner ? 0 : 4,
            paddingRight: 8,
            opacity: pressed ? 0.6 : 1,
          })}
        >
          <Typography
            variant="bodySemibold"
            numberOfLines={1}
            color={item.task.status === 'completed' ? theme.colors.foregroundMuted : theme.colors.foreground}
            style={item.task.status === 'completed' ? { textDecorationLine: 'line-through' } : undefined}
          >
            {item.task.title}
          </Typography>
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
}

type ListProps = {
  mentions: MentionItem[];
  isOwner: boolean;
  theme: any;
  onPress: (task: MentionTask) => void;
  onDelete: (mentionId: string, title: string) => void;
  onMove: (from: number, to: number) => void;
  onDraggingChange?: (dragging: boolean) => void;
};

export function TaskMentionList({
  mentions,
  isOwner,
  theme,
  onPress,
  onDelete,
  onMove,
  onDraggingChange,
}: ListProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const [localOrder, setLocalOrder] = useState<string[] | null>(null);

  const handlers = useRef({ onMove, onDraggingChange });
  handlers.current = { onMove, onDraggingChange };

  const items = useMemo(() => {
    if (!localOrder) return mentions;
    const byId = new Map(mentions.map((m) => [m.mentionId, m]));
    const list = localOrder.filter((id) => byId.has(id)).map((id) => byId.get(id)!);
    mentions.forEach((m) => {
      if (!localOrder.includes(m.mentionId)) list.push(m);
    });
    return list;
  }, [mentions, localOrder]);

  const itemsRef = useRef(items);
  itemsRef.current = items;

  const propsKey = mentions.map((m) => m.mentionId).join('|');
  useEffect(() => {
    if (!localOrder) return;
    if (propsKey === localOrder.join('|')) {
      setLocalOrder(null);
      return;
    }
    const t = setTimeout(() => setLocalOrder(null), 2500);
    return () => clearTimeout(t);
  }, [propsKey, localOrder]);

  const handleDragStart = useCallback((i: number) => {
    setActiveIndex(i);
    setOverIndex(i);
    handlers.current.onDraggingChange?.(true);
  }, []);

  const handleDragOver = useCallback((i: number) => setOverIndex(i), []);

  const handleDragEnd = useCallback((from: number, to: number) => {
    if (from !== to) {
      const ids = itemsRef.current.map((s) => s.mentionId);
      const [moved] = ids.splice(from, 1);
      if (moved) {
        ids.splice(to, 0, moved);
        setLocalOrder(ids);
        handlers.current.onMove(from, to);
      }
    }
    setActiveIndex(null);
    setOverIndex(null);
    handlers.current.onDraggingChange?.(false);
  }, []);

  return (
    <View style={{ height: items.length * ROW_HEIGHT }}>
      {items.map((item, index) => {
        let slot = index;
        if (activeIndex !== null && overIndex !== null && index !== activeIndex) {
          if (activeIndex < overIndex && index > activeIndex && index <= overIndex) slot = index - 1;
          else if (activeIndex > overIndex && index < activeIndex && index >= overIndex) slot = index + 1;
        }

        return (
          <Row
            key={item.mentionId}
            item={item}
            index={index}
            slot={slot}
            count={items.length}
            theme={theme}
            isOwner={isOwner}
            isActive={activeIndex === index}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
            onPress={onPress}
            onDelete={onDelete}
          />
        );
      })}
    </View>
  );
}
