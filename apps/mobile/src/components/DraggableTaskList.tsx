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
  /** Permite arrastrar libremente fuera de los límites de la lista (ej. para mover entre días de la semana) */
  unclampedDrag?: boolean;
  /** Notifica el inicio del arrastre de un elemento */
  onDragStartGlobal?: (item: T) => void;
  /** Notifica la posición global del puntero mientras se arrastra */
  onDragMoveGlobal?: (item: T, coords: { pageY: number; clientY: number }, center: number) => void;
  /** Al soltar, si devuelve true indica que un destino externo (ej. otro día) capturó el elemento */
  onDragEndGlobal?: (item: T, coords: { pageY: number; clientY: number }) => boolean;
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
  unclampedDrag?: boolean;
  renderItem: (item: any, drag: DragHandle) => React.ReactNode;
  onMeasure: (id: string, h: number) => void;
  onDragStart: (id: string, index: number) => void;
  onDragMove: (center: number, coords: { pageY: number; clientY: number }) => void;
  onDragEnd: (coords: { pageY: number; clientY: number }) => void;
};

function Row(props: RowProps) {
  const { item, target, animate, isActive } = props;
  const latest = useRef(props);
  latest.current = props;

  const y = useRef(new Animated.Value(target)).current;
  const scale = useRef(new Animated.Value(1)).current;

  const isDraggingActive = useRef(false);

  // La fila completa responde de inmediato al arrastre cuando el puntero se mueve más de 4px:
  // - Los toques simples (dy < 4) van directamente a los botones hijos (checkbox, pin, delete, abrir modal).
  // - Si el usuario empieza a arrastrar, el PanResponder captura de inmediato y mueve la tarea suavemente.
  const rowPan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onStartShouldSetPanResponderCapture: () => false,
      onMoveShouldSetPanResponder: (_, g) => {
        return Math.abs(g.dy) > 4 || Math.abs(g.dx) > 4;
      },
      onMoveShouldSetPanResponderCapture: (_, g) => {
        return Math.abs(g.dy) > 4 || Math.abs(g.dx) > 4;
      },
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => {
        isDraggingActive.current = true;
        try {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        } catch {
          // ignore
        }
        const p = latest.current;
        y.setValue(p.top);
        p.onDragStart(p.item.id, p.index);
      },
      onPanResponderMove: (evt, g) => {
        if (!isDraggingActive.current && !latest.current.isActive) return;
        const p = latest.current;
        const rawY = p.top + g.dy;
        const next = p.unclampedDrag ? rawY : Math.max(0, Math.min(rawY, p.maxTop));
        y.setValue(next);
        const pageY = (evt.nativeEvent as any)?.pageY ?? (evt as any)?.pageY ?? g.moveY ?? 0;
        const clientY = (evt.nativeEvent as any)?.clientY ?? (evt as any)?.clientY ?? g.moveY ?? 0;
        p.onDragMove(next + p.height / 2, { pageY, clientY });
      },
      onPanResponderRelease: (evt, g) => {
        isDraggingActive.current = false;
        const pageY = (evt.nativeEvent as any)?.pageY ?? (evt as any)?.pageY ?? g.moveY ?? 0;
        const clientY = (evt.nativeEvent as any)?.clientY ?? (evt as any)?.clientY ?? g.moveY ?? 0;
        latest.current.onDragEnd({ pageY, clientY });
      },
      onPanResponderTerminate: (evt, g) => {
        isDraggingActive.current = false;
        const pageY = (evt.nativeEvent as any)?.pageY ?? (evt as any)?.pageY ?? g.moveY ?? 0;
        const clientY = (evt.nativeEvent as any)?.clientY ?? (evt as any)?.clientY ?? g.moveY ?? 0;
        latest.current.onDragEnd({ pageY, clientY });
      },
    }),
  ).current;

  return (
    <Animated.View
      {...rowPan.panHandlers}
      onLayout={(e) => props.onMeasure(item.id, e.nativeEvent.layout.height)}
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        top: 0,
        zIndex: isActive ? 9999 : 0,
        elevation: isActive ? 12 : 0,
        shadowColor: '#000',
        shadowOpacity: isActive ? 0.35 : 0,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
        transform: [{ translateY: y }, { scale }],
        ...(Platform.OS === 'web'
          ? ({
              userSelect: 'none',
              WebkitUserSelect: 'none',
              cursor: isActive ? 'grabbing' : 'grab',
            } as any)
          : {}),
      }}
    >
      {props.renderItem(item, { panHandlers: rowPan.panHandlers, isActive })}
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
  unclampedDrag = false,
  onDragStartGlobal,
  onDragMoveGlobal,
  onDragEndGlobal,
}: Props<T>) {
  const fallbackHeight = defaultItemHeight ?? (gap === 0 ? 52 : DEFAULT_HEIGHT);
  const [heights, setHeights] = useState<Record<string, number>>({});
  const [active, setActive] = useState<{ id: string; from: number; over: number } | null>(null);
  const [interacted, setInteracted] = useState(false);
  // Orden local: se aplica al soltar, sin esperar a que lleguen los datos del servidor.
  const [localOrder, setLocalOrder] = useState<string[] | null>(null);

  const handlers = useRef({ onReorder, onDraggingChange, onDragStartGlobal, onDragMoveGlobal, onDragEndGlobal });
  handlers.current = { onReorder, onDraggingChange, onDragStartGlobal, onDragMoveGlobal, onDragEndGlobal };

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
    const item = orderedRef.current.find((i) => i.id === id);
    if (item && handlers.current.onDragStartGlobal) {
      handlers.current.onDragStartGlobal(item);
    }
  }, []);

  const onDragMove = useCallback((center: number, coords: { pageY: number; clientY: number }) => {
    const current = activeRef.current;
    if (!current) return;
    if (handlers.current.onDragMoveGlobal) {
      const activeItem = orderedRef.current.find((i) => i.id === current.id);
      if (activeItem) {
        handlers.current.onDragMoveGlobal(activeItem, coords, center);
      }
    }
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

  const onDragEnd = useCallback((coords: { pageY: number; clientY: number }) => {
    const current = activeRef.current;
    let handledExternally = false;
    if (current && handlers.current.onDragEndGlobal) {
      const activeItem = orderedRef.current.find((i) => i.id === current.id);
      if (activeItem) {
        handledExternally = handlers.current.onDragEndGlobal(activeItem, coords);
      }
    }

    if (!handledExternally && current && current.from !== current.over) {
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
          unclampedDrag={unclampedDrag}
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
