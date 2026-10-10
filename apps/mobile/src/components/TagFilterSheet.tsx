import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, ScrollView, TextInput, StyleSheet, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { Check, Plus, Search, Tag as TagIcon, X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FilterChip } from '@bucketlist/ui';
import { TagSheetShell, TAG_SHEET_H } from './TagSheetShell';
import { sortTags, useTags, useTagUsage, type TagSort } from '../hooks/useTags';
import { hexToRgba } from '../constants/tagPresets';

const GOLD = '#D4B13A';

interface TagFilterSheetProps {
  visible: boolean;
  /** Ids de las etiquetas activas en el filtro. */
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  /** Nº de tareas que coinciden con la selección actual (botón "Ver N tareas"). Solo en modo filtro. */
  matchCount?: number;
  /** Total de tareas (cuando no hay etiquetas elegidas). Solo en modo filtro. */
  totalCount?: number;
  onClose: () => void;
  /** Ir a la pantalla de gestión de etiquetas. */
  onManage?: () => void;
  /**
   * `filter` (por defecto): filtrar la lista de tareas.
   * `assign`: asignar etiquetas a una tarea (mismo menú, otro texto de botón y «Nueva etiqueta»).
   */
  mode?: 'filter' | 'assign';
  /** Texto del botón principal (por defecto depende del modo). */
  ctaLabel?: string;
  /** Modo `assign`: crear una etiqueta nueva sin salir del menú. */
  onCreate?: () => void;
  /** Contenido extra dentro de la hoja (p. ej. otra hoja anidada). */
  overlay?: React.ReactNode;
}

const SORTS: Array<{ key: TagSort; label: string }> = [
  { key: 'popular', label: 'Más usadas' },
  { key: 'az', label: 'A–Z' },
  { key: 'recent', label: 'Recientes' },
];

const VISIBLE_ROWS = 6;

export function TagFilterSheet({
  visible,
  selectedIds,
  onChange,
  matchCount = 0,
  totalCount = 0,
  onClose,
  onManage,
  mode = 'filter',
  ctaLabel: ctaLabelProp,
  onCreate,
  overlay,
}: TagFilterSheetProps) {
  const assign = mode === 'assign';
  const insets = useSafeAreaInsets();
  const { data: tags = [], isLoading, isError, refetch } = useTags();
  const { data: usage } = useTagUsage();
  const counts = usage?.counts ?? {};

  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<TagSort>('popular');
  const [atEnd, setAtEnd] = useState(false);

  useEffect(() => {
    if (visible) {
      setQuery('');
      setAtEnd(false);
    }
  }, [visible]);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q ? tags.filter((t) => t.name.toLowerCase().includes(q)) : tags;
    return sortTags(filtered, sort, counts);
  }, [tags, query, sort, counts]);

  const selected = new Set(selectedIds);
  const toggle = (id: string) =>
    onChange(selected.has(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id]);

  const hidden = Math.max(0, list.length - VISIBLE_ROWS);
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
    setAtEnd(contentOffset.y + layoutMeasurement.height >= contentSize.height - 12);
  };

  const n = selectedIds.length > 0 ? matchCount : totalCount;
  const ctaLabel =
    ctaLabelProp ??
    (assign
      ? 'Guardar etiquetas'
      : selectedIds.length > 0
        ? `Ver ${n} ${n === 1 ? 'tarea' : 'tareas'}`
        : 'Ver todas las tareas');

  return (
    <TagSheetShell visible={visible} onClose={onClose} fixedHeight={TAG_SHEET_H}>
      {/* Cabecera */}
      <View style={styles.headerRow}>
        <Text style={styles.title}>Etiquetas</Text>
        <Pressable
          onPress={() => onChange([])}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Limpiar filtros"
          disabled={selectedIds.length === 0}
          style={selectedIds.length === 0 && { opacity: 0.5 }}
        >
          <Text style={styles.clear}>Limpiar</Text>
        </Pressable>
      </View>

      {/* Buscador */}
      <View style={styles.searchBox}>
        <Search color="#9A9A9A" size={20} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar etiqueta"
          placeholderTextColor="#8A8A8A"
          value={query}
          onChangeText={setQuery}
          autoCorrect={false}
          returnKeyType="search"
        />
        {query.length > 0 && (
          <Pressable onPress={() => setQuery('')} hitSlop={10} accessibilityLabel="Borrar búsqueda">
            <X color="#9A9A9A" size={18} />
          </Pressable>
        )}
      </View>

      {/* Orden */}
      <View style={styles.sortRow}>
        {SORTS.map((s) => (
          <FilterChip key={s.key} label={s.label} active={sort === s.key} onPress={() => setSort(s.key)} />
        ))}
      </View>

      {/* Lista */}
      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={64}
      >
        {isLoading ? (
          <Text style={styles.stateText}>Cargando etiquetas…</Text>
        ) : isError ? (
          <View style={styles.stateBox}>
            <Text style={styles.errorText}>No se pudieron cargar tus etiquetas.</Text>
            <Pressable onPress={() => void refetch()} hitSlop={8}>
              <Text style={styles.retry}>Reintentar</Text>
            </Pressable>
          </View>
        ) : list.length === 0 ? (
          <Text style={styles.stateText}>
            {tags.length === 0
              ? assign
                ? 'Aún no tienes etiquetas. Crea la primera con «Nueva etiqueta».'
                : 'Aún no tienes etiquetas. Crea la primera desde «Gestionar etiquetas».'
              : `Ninguna etiqueta coincide con «${query.trim()}».`}
          </Text>
        ) : (
          list.map((t) => {
            const on = selected.has(t.id);
            return (
              <Pressable
                key={t.id}
                onPress={() => toggle(t.id)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: on }}
                accessibilityLabel={t.name}
                style={styles.row}
              >
                <View style={[styles.checkbox, on && styles.checkboxOn]}>
                  {on && <Check size={17} color="#111111" strokeWidth={3} />}
                </View>
                <View style={styles.slot}>
                  {t.emoji ? (
                    <View style={[styles.emojiBubble, { backgroundColor: hexToRgba(t.color, 0.28) }]}>
                      <Text style={styles.emoji}>{t.emoji}</Text>
                    </View>
                  ) : (
                    <View style={[styles.dot, { backgroundColor: t.color }]} />
                  )}
                </View>
                <Text style={styles.name} numberOfLines={1}>
                  {t.name}
                </Text>
                <Text style={styles.count}>{counts[t.id] ?? 0}</Text>
              </Pressable>
            );
          })
        )}

        {hidden > 0 && !atEnd && (
          <Text style={styles.more}>
            y {hidden} más · desliza para ver todas
          </Text>
        )}
      </ScrollView>

      {/* Pie */}
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) + 12 }]}>
        <Pressable style={styles.cta} onPress={onClose} accessibilityRole="button">
          <Text style={styles.ctaText}>{ctaLabel}</Text>
        </Pressable>
        {assign && onCreate ? (
          <Pressable style={styles.manage} onPress={onCreate} hitSlop={8} accessibilityRole="button">
            <Plus size={18} color={GOLD} strokeWidth={2.2} />
            <Text style={styles.manageText}>Nueva etiqueta</Text>
          </Pressable>
        ) : onManage ? (
          <Pressable style={styles.manage} onPress={onManage} hitSlop={8} accessibilityRole="button">
            <TagIcon size={18} color={GOLD} strokeWidth={2} />
            <Text style={styles.manageText}>Gestionar etiquetas</Text>
          </Pressable>
        ) : null}
      </View>

      {overlay}
    </TagSheetShell>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginTop: 4,
  },
  title: { fontFamily: 'PlayfairDisplay_700Bold', fontSize: 24, color: '#F5F0E6' },
  clear: { fontFamily: 'Inter_600SemiBold', fontSize: 15, color: GOLD },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    height: 48,
    marginTop: 18,
    marginHorizontal: 20,
    paddingHorizontal: 18,
    borderRadius: 24,
    backgroundColor: '#161616',
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  searchInput: { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 16, color: '#F5F5F5', padding: 0 },
  sortRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 20, marginTop: 14, marginBottom: 6 },
  list: { flex: 1 },
  listContent: { paddingHorizontal: 20, paddingBottom: 8 },
  row: {
    height: 57,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#1F1F1F',
  },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#3A3A3A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: { backgroundColor: GOLD, borderColor: GOLD },
  slot: { width: 24, marginLeft: 14, marginRight: 12, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 12, height: 12, borderRadius: 6 },
  emojiBubble: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  emoji: { fontSize: 13, lineHeight: 17, textAlign: 'center' },
  name: { flex: 1, fontFamily: 'Inter_500Medium', fontSize: 17, color: '#F5F0E6' },
  count: { fontFamily: 'Inter_400Regular', fontSize: 15, color: '#8A8A8A', marginLeft: 12 },
  more: {
    textAlign: 'center',
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: '#8A8A8A',
    paddingTop: 14,
    paddingBottom: 6,
  },
  stateText: { fontFamily: 'Inter_400Regular', fontSize: 15, color: '#8A8A8A', textAlign: 'center', paddingTop: 28 },
  stateBox: { alignItems: 'center', paddingTop: 28, gap: 6 },
  errorText: { fontFamily: 'Inter_400Regular', fontSize: 14, color: '#E5877D' },
  retry: { fontFamily: 'Inter_600SemiBold', fontSize: 14, color: GOLD },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#1F1F1F',
    backgroundColor: '#141414',
  },
  cta: { height: 54, borderRadius: 27, backgroundColor: GOLD, alignItems: 'center', justifyContent: 'center' },
  ctaText: { fontFamily: 'Inter_700Bold', fontSize: 18, color: '#111111' },
  manage: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 18,
  },
  manageText: { fontFamily: 'Inter_600SemiBold', fontSize: 16, color: GOLD },
});