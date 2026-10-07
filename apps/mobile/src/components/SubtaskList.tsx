import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, PanResponder, Pressable, TextInput, View } from 'react-native';
import { CheckCircle2, Circle, GripVertical, Trash2 } from 'lucide-react-native';
import { gold } from '@bucketlist/ui/src/tokens/colors';

const ROW_HEIGHT = 52;
const DELETE_WIDTH = 84;

type RowProps = {
  st: any;
  index: number; // posición real en la lista
  slot: number; // posición visual a la que debe animarse (distinta de index mientras se arrastra)
  count: number;
  theme: any;
  isOwner: boolean;
  isActive: boolean;
  onDragStart: (i: number) => void;
  onDragOver: (i: number) => void;
  onDragEnd: (from: number, to: number) => void;
  onToggle: (st: any) => void;
  onChange: (st: any, text: string) => void;
  onDelete: (st: any) => void;
};

function Row(props: RowProps) {
  const { st, index, slot, theme, isOwner, isActive } = props;

  // Siempre apunta a las props más recientes (los PanResponder se crean una sola vez)
  const latest = useRef(props);
  latest.current = props;

  const y = useRef(new Animated.Value(index * ROW_HEIGHT)).current; // posición vertical absoluta
  const scale = useRef(new Animated.Value(1)).current;
  const swipeX = useRef(new Animated.Value(0)).current; // desplazamiento horizontal al borrar
  const swipeOpen = useRef(false);
  const lastOver = useRef(index);

  // ── La fila se anima siempre hacia su slot (menos la que se está arrastrando) ──
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

  // ── Reordenar: PanResponder del asa (⠿) ───────────────────────────────────
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
        // Limita el arrastre a los extremos de la lista
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

  // ── Borrar: swipe horizontal sobre la fila ────────────────────────────────
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
      // Solo gestos claramente horizontales, para no pelear con el scroll vertical
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
      {/* Botón de eliminar: solo visible mientras se desliza la fila */}
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
              props.onDelete(st);
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

      {/* Contenido que se desliza (fondo opaco para tapar el botón) */}
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
        <Pressable onPress={() => props.onToggle(st)}>
          {st.done ? (
            <CheckCircle2 color={gold[400]} size={22} strokeWidth={1.8} />
          ) : (
            <Circle color={theme.colors.foregroundMuted} size={22} strokeWidth={1.8} />
          )}
        </Pressable>

        <TextInput
          value={st.title}
          editable={isOwner}
          onChangeText={(t) => props.onChange(st, t)}
          numberOfLines={1}
          style={{
            flex: 1,
            padding: 0,
            color: theme.colors.foreground,
            textDecorationLine: st.done ? 'line-through' : 'none',
            opacity: st.done ? 0.6 : 1,
          }}
        />

        {isOwner && (
          <View {...pan.panHandlers} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <GripVertical color={theme.colors.foregroundMuted} size={20} strokeWidth={1.8} />
          </View>
        )}
      </Animated.View>
    </Animated.View>
  );
}

type ListProps = {
  subtasks: any[];
  isOwner: boolean;
  theme: any;
  onToggle: (st: any) => void;
  onChange: (st: any, text: string) => void;
  onDelete: (st: any) => void;
  onMove: (from: number, to: number) => void;
  onDraggingChange?: (dragging: boolean) => void;
};

export function SubtaskList({
  subtasks,
  isOwner,
  theme,
  onToggle,
  onChange,
  onDelete,
  onMove,
  onDraggingChange,
}: ListProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  // Orden local: se aplica en el mismo instante en que sueltas, sin esperar a la caché
  const [localOrder, setLocalOrder] = useState<string[] | null>(null);

  const handlers = useRef({ onMove, onDraggingChange });
  handlers.current = { onMove, onDraggingChange };

  // Los datos (título, done...) vienen siempre de las props; solo el orden puede ser local
  const items = useMemo(() => {
    if (!localOrder) return subtasks;
    const byId = new Map(subtasks.map((s) => [s.id, s]));
    const list = localOrder.filter((id) => byId.has(id)).map((id) => byId.get(id));
    subtasks.forEach((s) => {
      if (!localOrder.includes(s.id)) list.push(s);
    });
    return list;
  }, [subtasks, localOrder]);

  const itemsRef = useRef(items);
  itemsRef.current = items;

  // Cuando las props ya reflejan el nuevo orden, se descarta el orden local.
  // Si el guardado falla, el timeout también lo descarta y las filas vuelven animadas.
  const propsKey = subtasks.map((s) => s.id).join('|');
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
      const ids = itemsRef.current.map((s) => s.id);
      const [moved] = ids.splice(from, 1);
      ids.splice(to, 0, moved);
      setLocalOrder(ids);
      handlers.current.onMove(from, to);
    }
    setActiveIndex(null);
    setOverIndex(null);
    handlers.current.onDraggingChange?.(false);
  }, []);

  return (
    <View style={{ height: items.length * ROW_HEIGHT }}>
      {items.map((st, index) => {
        // Slot visual: las filas intermedias se apartan una posición mientras arrastras
        let slot = index;
        if (activeIndex !== null && overIndex !== null && index !== activeIndex) {
          if (activeIndex < overIndex && index > activeIndex && index <= overIndex) slot = index - 1;
          else if (activeIndex > overIndex && index < activeIndex && index >= overIndex) slot = index + 1;
        }

        return (
          <Row
            key={st.id}
            st={st}
            index={index}
            slot={slot}
            count={items.length}
            theme={theme}
            isOwner={isOwner}
            isActive={activeIndex === index}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
            onToggle={onToggle}
            onChange={onChange}
            onDelete={onDelete}
          />
        );
      })}
    </View>
  );
}