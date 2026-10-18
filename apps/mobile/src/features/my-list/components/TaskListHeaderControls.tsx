import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import {
  Tag as TagIcon,
  X,
  LayoutList,
  LayoutGrid,
  AlignJustify,
  ArrowDown,
  ArrowUp,
  ChevronDown,
  Check,
} from 'lucide-react-native';
import { Typography, FilterChip } from '@bucketlist/ui';
import { gold } from '@bucketlist/ui/src/tokens/colors';
import { styles } from '../styles/my-list.styles';
import { FilterType, PriorityFilter, SortField, SortDir, TaskViewMode } from '../types';
import { Tag } from '@/hooks/useTags';
import { hexToRgba } from '@/constants/tagPresets';
import { TagSheetShell } from '@/components/TagSheetShell';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface TaskListHeaderControlsProps {
  filter: FilterType;
  setFilter: (f: FilterType) => void;
  priorityFilter: PriorityFilter;
  setPriorityFilter: React.Dispatch<React.SetStateAction<PriorityFilter>>;
  onOpenTagFilterSheet: () => void;
  selectedTagIds: string[];
  selectedTags: Tag[];
  onRemoveTagFilter: (id: string) => void;
  isSelectionMode: boolean;
  onToggleSelectionMode: () => void;
  taskViewMode: TaskViewMode;
  setTaskViewMode: (mode: TaskViewMode) => void;
  tasksCount: number;
  sortField: SortField;
  sortDir: SortDir;
  isReordering: boolean;
  setIsReordering: (r: boolean) => void;
  isSearching: boolean;
  sortTriggerRef: any;
  openSortMenu: () => void;
  theme: any;
}

const STATUS_OPTIONS: Array<{ key: FilterType; label: string; desc: string }> = [
  { key: 'all', label: 'Todas las tareas', desc: 'Muestra todas las tareas sin filtrar por estado' },
  { key: 'active', label: 'En curso', desc: 'Tareas activas o pendientes de realizar' },
  { key: 'in_progress', label: 'En progreso', desc: 'Tareas marcadas como actualmente en marcha' },
  { key: 'completed', label: 'Completadas', desc: 'Tareas que ya has marcado como finalizadas' },
  { key: 'expired', label: 'Vencidas', desc: 'Tareas cuya fecha límite ya ha expirado' },
  { key: 'public', label: 'Públicas', desc: 'Tareas con visibilidad pública en la comunidad' },
];

const STATUS_SHORT_LABEL: Record<FilterType, string> = {
  all: 'Estado',
  active: 'Estado: En curso',
  in_progress: 'Estado: En progreso',
  completed: 'Estado: Completadas',
  expired: 'Estado: Vencidas',
  public: 'Estado: Públicas',
};

const PRIORITY_OPTIONS: Array<{ key: PriorityFilter; label: string; desc: string }> = [
  { key: 'all', label: 'Todas las prioridades', desc: 'Muestra tareas de cualquier prioridad' },
  { key: 'high', label: '🔴 Alta', desc: 'Tareas urgentes o de máxima prioridad' },
  { key: 'medium', label: '🟡 Media', desc: 'Tareas de prioridad estándar' },
  { key: 'low', label: '🟢 Baja', desc: 'Tareas sin prisa o de prioridad baja' },
];

const PRIORITY_SHORT_LABEL: Record<PriorityFilter, string> = {
  all: 'Prioridad',
  high: 'Prioridad: 🔴 Alta',
  medium: 'Prioridad: 🟡 Media',
  low: 'Prioridad: 🟢 Baja',
};

export function TaskListHeaderControls({
  filter,
  setFilter,
  priorityFilter,
  setPriorityFilter,
  onOpenTagFilterSheet,
  selectedTagIds,
  selectedTags,
  onRemoveTagFilter,
  isSelectionMode,
  onToggleSelectionMode,
  taskViewMode,
  setTaskViewMode,
  tasksCount,
  sortField,
  sortDir,
  isReordering,
  setIsReordering,
  isSearching,
  sortTriggerRef,
  openSortMenu,
  theme,
}: TaskListHeaderControlsProps) {
  const insets = useSafeAreaInsets();
  const [statusSheetVisible, setStatusSheetVisible] = useState(false);
  const [prioritySheetVisible, setPrioritySheetVisible] = useState(false);

  return (
    <View>
      {/* Fila única de Filtros */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
        style={{ marginBottom: 16 }}
      >
        {/* Todas */}
        <FilterChip
          label="Todas"
          active={filter === 'all' && priorityFilter === 'all'}
          onPress={() => {
            setFilter('all');
            setPriorityFilter('all');
          }}
        />

        {/* Filtrar por estado */}
        <Pressable
          onPress={() => setStatusSheetVisible(true)}
          accessibilityRole="button"
          accessibilityLabel="Filtrar por estado"
          style={[
            styles.tagFilterBtn,
            {
              backgroundColor: filter !== 'all'
                ? (theme.dark ? 'transparent' : 'rgba(212, 175, 55, 0.12)')
                : theme.colors.surface,
              borderColor: filter !== 'all' ? gold[400] : theme.colors.border,
            },
          ]}
        >
          <Text style={[styles.tagFilterText, { color: filter !== 'all' ? gold[400] : theme.colors.foregroundMuted }]}>
            {STATUS_SHORT_LABEL[filter]}
          </Text>
          <ChevronDown size={14} color={filter !== 'all' ? gold[400] : theme.colors.foregroundMuted} />
        </Pressable>

        {/* Filtrar por prioridad */}
        <Pressable
          onPress={() => setPrioritySheetVisible(true)}
          accessibilityRole="button"
          accessibilityLabel="Filtrar por prioridad"
          style={[
            styles.tagFilterBtn,
            {
              backgroundColor: priorityFilter !== 'all'
                ? (theme.dark ? 'transparent' : 'rgba(212, 175, 55, 0.12)')
                : theme.colors.surface,
              borderColor: priorityFilter !== 'all' ? gold[400] : theme.colors.border,
            },
          ]}
        >
          <Text style={[styles.tagFilterText, { color: priorityFilter !== 'all' ? gold[400] : theme.colors.foregroundMuted }]}>
            {PRIORITY_SHORT_LABEL[priorityFilter]}
          </Text>
          <ChevronDown size={14} color={priorityFilter !== 'all' ? gold[400] : theme.colors.foregroundMuted} />
        </Pressable>

        {/* Etiquetas */}
        <Pressable
          onPress={onOpenTagFilterSheet}
          accessibilityRole="button"
          accessibilityLabel="Filtrar por etiquetas"
          style={[
            styles.tagFilterBtn,
            {
              backgroundColor: selectedTagIds.length > 0
                ? (theme.dark ? 'transparent' : 'rgba(212, 175, 55, 0.12)')
                : theme.colors.surface,
              borderColor: selectedTagIds.length > 0 ? gold[400] : theme.colors.border,
            },
          ]}
        >
          <TagIcon size={14} color={selectedTagIds.length > 0 ? gold[400] : theme.colors.foregroundMuted} strokeWidth={2} />
          <Text style={[styles.tagFilterText, { color: selectedTagIds.length > 0 ? gold[400] : theme.colors.foregroundMuted }]}>
            {selectedTagIds.length === 0
              ? 'Etiquetas'
              : selectedTagIds.length === 1
              ? '1 etiqueta'
              : `${selectedTagIds.length} etiquetas`}
          </Text>
        </Pressable>

        {/* Chips de etiquetas seleccionadas */}
        {selectedTags.map((t) => (
          <Pressable
            key={t.id}
            onPress={() => onRemoveTagFilter(t.id)}
            accessibilityRole="button"
            accessibilityLabel={`Quitar etiqueta ${t.name}`}
            style={[styles.activeTagChip, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
          >
            {t.emoji ? (
              <View style={[styles.activeTagEmoji, { backgroundColor: hexToRgba(t.color, 0.3) }]}>
                <Text style={styles.activeTagEmojiText}>{t.emoji}</Text>
              </View>
            ) : (
              <View style={[styles.activeTagDot, { backgroundColor: t.color }]} />
            )}
            <Text style={[styles.activeTagText, { color: theme.colors.foreground }]} numberOfLines={1}>
              {t.name}
            </Text>
            <X size={15} color={theme.colors.foregroundMuted} strokeWidth={2} />
          </Pressable>
        ))}
      </ScrollView>

      {/* Fila: Contador de tareas (izq) + Modos de vista y Ordenar (der) */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 14,
        }}
      >
        {/* Izquierda: Contador de tareas */}
        <Typography variant="caption" color={theme.colors.foregroundMuted} style={styles.tasksCountLabel}>
          {tasksCount} {tasksCount === 1 ? 'TAREA' : 'TAREAS'}
        </Typography>

        {/* Derecha: 1. Modo de vista (lista, galería, compacto), 2. Ordenar (Estado / etc.) */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          {/* Modos de vista a la izquierda de ordenar */}
          <View style={[styles.viewModeToggle, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <Pressable
              onPress={() => setTaskViewMode('list')}
              style={[styles.viewModeBtn, taskViewMode === 'list' && styles.viewModeBtnActive]}
              hitSlop={4}
              accessibilityRole="button"
              accessibilityLabel="Vista detallada"
            >
              <LayoutList size={15} color={taskViewMode === 'list' ? '#0E0E0E' : theme.colors.foregroundMuted} />
            </Pressable>
            <Pressable
              onPress={() => setTaskViewMode('gallery')}
              style={[styles.viewModeBtn, taskViewMode === 'gallery' && styles.viewModeBtnActive]}
              hitSlop={4}
              accessibilityRole="button"
              accessibilityLabel="Vista galería"
            >
              <LayoutGrid size={15} color={taskViewMode === 'gallery' ? '#0E0E0E' : theme.colors.foregroundMuted} />
            </Pressable>
            <Pressable
              onPress={() => setTaskViewMode('compact')}
              style={[styles.viewModeBtn, taskViewMode === 'compact' && styles.viewModeBtnActive]}
              hitSlop={4}
              accessibilityRole="button"
              accessibilityLabel="Vista compacta"
            >
              <AlignJustify size={15} color={taskViewMode === 'compact' ? '#0E0E0E' : theme.colors.foregroundMuted} />
            </Pressable>
          </View>

          {/* Ordenar (Estado / Manual / etc.) */}
          <View style={styles.sortTriggerContainer}>
            <Pressable
              ref={sortTriggerRef}
              collapsable={false}
              onPress={openSortMenu}
              hitSlop={8}
              style={[
                styles.sortTriggerBtn,
                {
                  height: 32,
                  paddingHorizontal: 8,
                  borderRadius: 8,
                  backgroundColor: theme.colors.surface,
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Ordenar tareas"
            >
              <Typography variant="caption" color={gold[400]} style={{ fontWeight: '600' }}>
                {sortField === 'manual'
                  ? 'Manual'
                  : sortField === 'status'
                  ? isReordering
                    ? 'Estado (manual)'
                    : 'Estado'
                  : sortField === 'priority'
                  ? 'Prioridad'
                  : sortField === 'alphabetical'
                  ? 'Alfabético'
                  : 'Fecha'}
              </Typography>
              {sortField !== 'manual' &&
                !isReordering &&
                (sortDir === 'desc' ? (
                  <ArrowDown color={gold[400]} size={13} />
                ) : (
                  <ArrowUp color={gold[400]} size={13} />
                ))}
            </Pressable>
          </View>

          {!isSearching && isReordering && (
            <Pressable
              onPress={() => setIsReordering(false)}
              style={{
                backgroundColor: gold[400],
                paddingHorizontal: 10,
                paddingVertical: 3,
                borderRadius: 6,
                marginLeft: 2,
              }}
              hitSlop={8}
            >
              <Text style={{ fontSize: 11, fontWeight: '700', color: '#0E0E0E' }}>OK</Text>
            </Pressable>
          )}
        </View>
      </View>

      {/* Bottom Sheet: Filtrar por Estado */}
      <TagSheetShell visible={statusSheetVisible} onClose={() => setStatusSheetVisible(false)}>
        <View style={[localStyles.sheetContent, { paddingBottom: Math.max(insets.bottom, 24) }]}>
          <View style={localStyles.sheetHeader}>
            <Text style={[localStyles.sheetTitle, { color: theme.colors.foreground }]}>Filtrar por estado</Text>
            <Pressable
              onPress={() => setStatusSheetVisible(false)}
              hitSlop={8}
              style={[localStyles.sheetCloseBtn, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
              accessibilityRole="button"
              accessibilityLabel="Cerrar filtro de estado"
            >
              <X size={16} color={theme.colors.foregroundMuted} />
            </Pressable>
          </View>

          <View style={localStyles.sheetOptionList}>
            {STATUS_OPTIONS.map((opt) => {
              const isSelected = filter === opt.key;
              return (
                <Pressable
                  key={opt.key}
                  onPress={() => {
                    setFilter(opt.key);
                    setStatusSheetVisible(false);
                  }}
                  style={({ pressed }) => [
                    localStyles.sheetOptionRow,
                    {
                      backgroundColor: isSelected
                        ? (theme.dark ? 'rgba(212, 177, 58, 0.08)' : 'rgba(212, 177, 58, 0.12)')
                        : theme.colors.surface,
                      borderColor: isSelected ? gold[400] : theme.colors.border,
                    },
                    pressed && { opacity: 0.8 },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`Filtrar por ${opt.label}`}
                >
                  <View style={{ flex: 1, marginRight: 12 }}>
                    <Text
                      style={[
                        localStyles.sheetOptionTitle,
                        { color: isSelected ? gold[400] : theme.colors.foreground },
                      ]}
                    >
                      {opt.label}
                    </Text>
                    <Text style={[localStyles.sheetOptionDesc, { color: theme.colors.foregroundMuted }]}>{opt.desc}</Text>
                  </View>
                  {isSelected && <Check size={18} color={gold[400]} strokeWidth={2.5} />}
                </Pressable>
              );
            })}
          </View>
        </View>
      </TagSheetShell>

      {/* Bottom Sheet: Filtrar por Prioridad */}
      <TagSheetShell visible={prioritySheetVisible} onClose={() => setPrioritySheetVisible(false)}>
        <View style={[localStyles.sheetContent, { paddingBottom: Math.max(insets.bottom, 24) }]}>
          <View style={localStyles.sheetHeader}>
            <Text style={[localStyles.sheetTitle, { color: theme.colors.foreground }]}>Filtrar por prioridad</Text>
            <Pressable
              onPress={() => setPrioritySheetVisible(false)}
              hitSlop={8}
              style={[localStyles.sheetCloseBtn, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
              accessibilityRole="button"
              accessibilityLabel="Cerrar filtro de prioridad"
            >
              <X size={16} color={theme.colors.foregroundMuted} />
            </Pressable>
          </View>

          <View style={localStyles.sheetOptionList}>
            {PRIORITY_OPTIONS.map((opt) => {
              const isSelected = priorityFilter === opt.key;
              return (
                <Pressable
                  key={opt.key}
                  onPress={() => {
                    setPriorityFilter(opt.key);
                    setPrioritySheetVisible(false);
                  }}
                  style={({ pressed }) => [
                    localStyles.sheetOptionRow,
                    {
                      backgroundColor: isSelected
                        ? (theme.dark ? 'rgba(212, 177, 58, 0.08)' : 'rgba(212, 177, 58, 0.12)')
                        : theme.colors.surface,
                      borderColor: isSelected ? gold[400] : theme.colors.border,
                    },
                    pressed && { opacity: 0.8 },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`Filtrar por prioridad ${opt.label}`}
                >
                  <View style={{ flex: 1, marginRight: 12 }}>
                    <Text
                      style={[
                        localStyles.sheetOptionTitle,
                        { color: isSelected ? gold[400] : theme.colors.foreground },
                      ]}
                    >
                      {opt.label}
                    </Text>
                    <Text style={[localStyles.sheetOptionDesc, { color: theme.colors.foregroundMuted }]}>{opt.desc}</Text>
                  </View>
                  {isSelected && <Check size={18} color={gold[400]} strokeWidth={2.5} />}
                </Pressable>
              );
            })}
          </View>
        </View>
      </TagSheetShell>
    </View>
  );
}

const localStyles = StyleSheet.create({
  sheetContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sheetTitle: {
    fontFamily: 'PlayfairDisplay_700Bold',
    fontSize: 18,
    color: '#FFF',
  },
  sheetCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#222',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetOptionList: {
    gap: 10,
  },
  sheetOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#1C1C1C',
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  sheetOptionRowActive: {
    backgroundColor: 'rgba(212, 177, 58, 0.08)',
    borderColor: gold[400],
  },
  sheetOptionTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
    color: '#F0F0F0',
    marginBottom: 2,
  },
  sheetOptionTitleActive: {
    color: gold[400],
  },
  sheetOptionDesc: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: '#8A8A80',
  },
});

