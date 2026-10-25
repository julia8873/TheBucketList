import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, PanResponder, View, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

/**
 * Lista reordenable con el mismo gesto que los pasos de una tarea (SubtaskList):
 * se arrastra desde un asa (⠿) y el resto de filas se apartan con una animación.
 * A diferencia de SubtaskList, las filas pueden tener alturas distintas (se miden con onLayout).
 */

const GAP = 10;
const DEFAULT_HEIGHT = 96;

export type DragHandle = {
  /** Se esparcen sobre la vista que hace de asa: <View {...drag.panHandlers}> */
  panHandlers: any;
  isActive: boolean;
};

type Props<T extends { id: string }> = {
  items: T[];
  renderItem: (item: T, drag: DragHandle) => React.ReactNode;
  /** Nuevo orden (ids) tras soltar. */
  onReorder: (orderedIds: string[]) => void;
  /** Para desactivar el scroll del padre mientras se arrastra. */
  onDraggingChange?: (dragging: boolean) => void;
  /** Espacio entre filas en píxeles (por defecto 10). */
  gap?: number;
  /** Altura estimada por defecto de cada elemento antes de layout (por defecto 96, o 52 si gap === 0). */
  defaultItemHeight?: number;
};

type RowProps = {
  item: any;
  index: number;
  count: number;
  /** Posición vertical de la fila en el orden actual (sin arrastre). */
  top: number;
  /** Posición vertical máxima a la que se puede llevar esta fila. */
  maxTop: number;
  height: number;
  /** Posición a la que debe animarse (cambia mientras otra fila se arrastra). */
  target: number;
  animate: boolean;
  isActive: boolean;
  renderItem: (item: any, drag: DragHandle) => React.ReactNode;
  onMeasure: (id: string, h: number) => void;
  onDragStart: (id: string, index: number) => void;
  onDragMove: (center: number) => void;
  onDragEnd: () => void;
};

function Row(props: RowProps) {
  const { item, target, animate, isActive } = props;
  const latest = useRef(props);
  latest.current = props;

  const y = useRef(new Animated.Value(target)).current;
  const scale = useRef(new Animated.Value(1)).current;

  const isLongPressing = useRef(false);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const touchStartPos = useRef({ x: 0, y: 0 });

  const clearTimer = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      clearTimer();
    };
  }, [clearTimer]);

  useEffect(() => {
    if (isActive) return;
    if (!animate) {
      y.setValue(target);
      return;
    }
    Animated.spring(y, {
      toValue: target,
      useNativeDriver: true,
      damping: 22,
      stiffness: 280,
      mass: 0.6,
    }).start();
  }, [target, isActive, animate, y]);

  useEffect(() => {
    Animated.spring(scale, {
      toValue: isActive ? 1.025 : 1,
      useNativeDriver: true,
      damping: 22,
      stiffness: 300,
    }).start();
  }, [isActive, scale]);

  // Asa explícita (icono ⠿): inicia arrastre inmediatamente al tocarlo
  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponderCapture: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => {
        clearTimer();
        isLongPressing.current = true;
        try {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        } catch {
          // ignore
        }
        const p = latest.current;
        y.setValue(p.top);
        p.onDragStart(p.item.id, p.index);
      },
      onPanResponderMove: (_, g) => {
        const p = latest.current;
        const next = Math.max(0, Math.min(p.top + g.dy, p.maxTop));
        y.setValue(next);
        p.onDragMove(next + p.height / 2);
      },
      onPanResponderRelease: () => {
        clearTimer();
        isLongPressing.current = false;
        latest.current.onDragEnd();
      },
      onPanResponderTerminate: () => {
        clearTimer();
        isLongPressing.current = false;
        latest.current.onDragEnd();
      },
    }),
  ).current;

  const endDrag = useCallback(() => {
    clearTimer();
    if (isLongPressing.current || latest.current.isActive) {
      isLongPressing.current = false;
      latest.current.onDragEnd();
    }
  }, [clearTimer]);

  // Fila completa: al mantener pulsado ~320ms, vibra e inicia el arrastre para cambiar el orden
  const rowPan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onStartShouldSetPanResponderCapture: (evt) => {
        clearTimer();
        isLongPressing.current = false;
        touchStartPos.current = {
          x: evt.nativeEvent.pageX,
          y: evt.nativeEvent.pageY,
        };
        longPressTimer.current = setTimeout(() => {
          isLongPressing.current = true;
          try {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          } catch {
            // ignore
          }
          const p = latest.current;
          y.setValue(p.top);
          p.onDragStart(p.item.id, p.index);
        }, Platform.OS === 'web' ? 200 : 320);
        return false;
      },
      onMoveShouldSetPanResponder: () => isLongPressing.current,
      onMoveShouldSetPanResponderCapture: (evt) => {
        if (isLongPressing.current) {
          return true;
        }
        const dx = Math.abs(evt.nativeEvent.pageX - touchStartPos.current.x);
        const dy = Math.abs(evt.nativeEvent.pageY - touchStartPos.current.y);
        // Si el usuario desliza para hacer scroll antes de que pasen los ms, cancelamos el timer
        const maxDelta = Platform.OS === 'web' ? 14 : 8;
        if (dx > maxDelta || dy > maxDelta) {
          clearTimer();
          return false;
        }
        return false;
      },
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => {
        const p = latest.current;
        y.setValue(p.top);
      },
      onPanResponderMove: (_, g) => {
        if (!isLongPressing.current && !latest.current.isActive) return;
        const p = latest.current;
        const next = Math.max(0, Math.min(p.top + g.dy, p.maxTop));
        y.setValue(next);
        p.onDragMove(next + p.height / 2);
      },
      onPanResponderRelease: () => {
        endDrag();
      },
      onPanResponderTerminate: () => {
        endDrag();
      },
    }),
  ).current;

  return (
    <Animated.View
      {...rowPan.panHandlers}
      onTouchEnd={() => {
        clearTimer();
      }}
      onTouchCancel={() => {
        clearTimer();
      }}
      onLayout={(e) => props.onMeasure(item.id, e.nativeEvent.layout.height)}
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        top: 0,
        zIndex: isActive ? 10 : 0,
        elevation: isActive ? 8 : 0,
        shadowColor: '#000',
        shadowOpacity: isActive ? 0.35 : 0,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
        transform: [{ translateY: y }, { scale }],
        ...(Platform.OS === 'web'
          ? ({
              userSelect: 'none',
              WebkitUserSelect: 'none',
            } as any)
          : {}),
      }}
    >
      {props.renderItem(item, { panHandlers: pan.panHandlers, isActive })}
    </Animated.View>
  );
}

export function DraggableTaskList<T extends { id: string }>({
  items,
  renderItem,
  onReorder,
  onDraggingChange,
  gap = GAP,
  defaultItemHeight,
}: Props<T>) {
  const fallbackHeight = defaultItemHeight ?? (gap === 0 ? 52 : DEFAULT_HEIGHT);
  const [heights, setHeights] = useState<Record<string, number>>({});
  const [active, setActive] = useState<{ id: string; from: number; over: number } | null>(null);
  const [interacted, setInteracted] = useState(false);
  // Orden local: se aplica al soltar, sin esperar a que lleguen los datos del servidor.
  const [localOrder, setLocalOrder] = useState<string[] | null>(null);

  const handlers = useRef({ onReorder, onDraggingChange });
  handlers.current = { onReorder, onDraggingChange };

  const ordered = useMemo(() => {
    if (!localOrder) return items;
    const byId = new Map(items.map((i) => [i.id, i]));
    const list = localOrder.filter((id) => byId.has(id)).map((id) => byId.get(id)!);
    items.forEach((i) => {
      if (!localOrder.includes(i.id)) list.push(i);
    });
    return list;
  }, [items, localOrder]);

  const orderedRef = useRef(ordered);
  orderedRef.current = ordered;
  const heightsRef = useRef(heights);
  heightsRef.current = heights;
  const activeRef = useRef(active);
  activeRef.current = active;

  // Descarta el orden local cuando los datos ya lo reflejan (o si el guardado falló).
  const propsKey = items.map((i) => i.id).join('|');
  useEffect(() => {
    if (!localOrder) return;
    if (propsKey === localOrder.join('|')) {
      setLocalOrder(null);
      return;
    }
    const t = setTimeout(() => setLocalOrder(null), 2500);
    return () => clearTimeout(t);
  }, [propsKey, localOrder]);

  const h = (id: string) => heights[id] ?? fallbackHeight;

  const offsetsFor = (ids: string[]) => {
    const out: number[] = [];
    let acc = 0;
    ids.forEach((id) => {
      out.push(acc);
      acc += h(id) + gap;
    });
    return { offsets: out, total: Math.max(0, acc - gap) };
  };

  const ids = ordered.map((i) => i.id);
  const base = offsetsFor(ids);

  // Orden visual: el de siempre, con la fila arrastrada movida a la posición sobre la que está.
  const visualIds = [...ids];
  if (active) {
    const [moved] = visualIds.splice(active.from, 1);
    if (moved) visualIds.splice(active.over, 0, moved);
  }
  const visual = offsetsFor(visualIds);

  const onMeasure = useCallback((id: string, height: number) => {
    setHeights((prev) => (Math.abs((prev[id] ?? 0) - height) < 0.5 ? prev : { ...prev, [id]: height }));
  }, []);

  const onDragStart = useCallback((id: string, index: number) => {
    setInteracted(true);
    setActive({ id, from: index, over: index });
    handlers.current.onDraggingChange?.(true);
  }, []);

  const onDragMove = useCallback((center: number) => {
    const current = activeRef.current;
    if (!current) return;
    const list = orderedRef.current.map((i) => i.id);
    let acc = 0;
    let over = list.length - 1;
    for (let j = 0; j < list.length; j++) {
      const itemId = list[j];
      const hj = (itemId ? heightsRef.current[itemId] : undefined) ?? fallbackHeight;
      if (center < acc + hj + gap / 2) {
        over = j;
        break;
      }
      acc += hj + gap;
    }
    if (over !== current.over) setActive({ ...current, over });
  }, [gap, fallbackHeight]);

  useEffect(() => {
    return () => {
      handlers.current.onDraggingChange?.(false);
    };
  }, []);

  const onDragEnd = useCallback(() => {
    const current = activeRef.current;
    if (current && current.from !== current.over) {
      const next = orderedRef.current.map((i) => i.id);
      const [moved] = next.splice(current.from, 1);
      if (moved) next.splice(current.over, 0, moved);
      setLocalOrder(next);
      handlers.current.onReorder(next);
    }
    setActive(null);
    handlers.current.onDraggingChange?.(false);
  }, []);

  return (
    <View style={{ height: base.total }}>
      {ordered.map((item, index) => (
        <Row
          key={item.id}
          item={item}
          index={index}
          count={ordered.length}
          top={base.offsets[index] ?? 0}
          maxTop={Math.max(0, base.total - h(item.id))}
          height={h(item.id)}
          target={visual.offsets[visualIds.indexOf(item.id)] ?? 0}
          animate={interacted}
          isActive={active?.id === item.id}
          renderItem={renderItem as any}
          onMeasure={onMeasure}
          onDragStart={onDragStart}
          onDragMove={onDragMove}
          onDragEnd={onDragEnd}
        />
      ))}
    </View>
  );
}
