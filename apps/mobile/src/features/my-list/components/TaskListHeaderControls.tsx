import React from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import {
  Tag as TagIcon,
  X,
  CheckSquare,
  LayoutList,
  LayoutGrid,
  AlignJustify,
  ArrowDown,
  ArrowUp,
} from 'lucide-react-native';
import { Typography, FilterChip } from '@bucketlist/ui';
import { gold } from '@bucketlist/ui/src/tokens/colors';
import { styles } from '../styles/my-list.styles';
import { FilterType, PriorityFilter, SortField, SortDir, TaskViewMode } from '../types';
import { Tag } from '@/hooks/useTags';
import { hexToRgba } from '@/constants/tagPresets';

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
  return (
    <View>
      {/* Filtros */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filtersContainer}
        style={{ flexGrow: 0, marginBottom: 8, marginHorizontal: -20 }}
      >
        <FilterChip label="Todas" active={filter === 'all'} onPress={() => setFilter('all')} />
        <FilterChip label="En curso" active={filter === 'active'} onPress={() => setFilter('active')} />
        <FilterChip label="En progreso" active={filter === 'in_progress'} onPress={() => setFilter('in_progress')} />
        <FilterChip label="Completadas" active={filter === 'completed'} onPress={() => setFilter('completed')} />
        <FilterChip label="Vencidas" active={filter === 'expired'} onPress={() => setFilter('expired')} />
      </ScrollView>

      {/* Filtro por prioridad */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filtersContainer}
        style={{ flexGrow: 0, marginBottom: 12, marginHorizontal: -20 }}
      >
        <FilterChip
          label="Prioridad: Todas"
          active={priorityFilter === 'all'}
          onPress={() => setPriorityFilter('all')}
        />
        <FilterChip
          label="🔴 Alta"
          active={priorityFilter === 'high'}
          onPress={() => setPriorityFilter(priorityFilter === 'high' ? 'all' : 'high')}
        />
        <FilterChip
          label="🟡 Media"
          active={priorityFilter === 'medium'}
          onPress={() => setPriorityFilter(priorityFilter === 'medium' ? 'all' : 'medium')}
        />
        <FilterChip
          label="🟢 Baja"
          active={priorityFilter === 'low'}
          onPress={() => setPriorityFilter(priorityFilter === 'low' ? 'all' : 'low')}
        />
      </ScrollView>

      {/* Fila de etiquetas + Vistas */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 14,
        }}
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingRight: 8 }}
          style={{ flex: 1, marginRight: 8 }}
        >
          <Pressable
            onPress={onOpenTagFilterSheet}
            accessibilityRole="button"
            accessibilityLabel="Filtrar por etiquetas"
            style={[styles.tagFilterBtn, selectedTagIds.length > 0 && styles.tagFilterBtnActive]}
          >
            <TagIcon size={14} color={selectedTagIds.length > 0 ? gold[400] : '#E5E5E5'} strokeWidth={2} />
            <Text style={[styles.tagFilterText, selectedTagIds.length > 0 && { color: gold[400] }]}>
              {selectedTagIds.length === 0
                ? 'Etiquetas'
                : selectedTagIds.length === 1
                ? '1 etiqueta'
                : `${selectedTagIds.length} etiquetas`}
            </Text>
          </Pressable>

          {selectedTags.map((t) => (
            <Pressable
              key={t.id}
              onPress={() => onRemoveTagFilter(t.id)}
              accessibilityRole="button"
              accessibilityLabel={`Quitar etiqueta ${t.name}`}
              style={styles.activeTagChip}
            >
              {t.emoji ? (
                <View style={[styles.activeTagEmoji, { backgroundColor: hexToRgba(t.color, 0.3) }]}>
                  <Text style={styles.activeTagEmojiText}>{t.emoji}</Text>
                </View>
              ) : (
                <View style={[styles.activeTagDot, { backgroundColor: t.color }]} />
              )}
              <Text style={styles.activeTagText} numberOfLines={1}>{t.name}</Text>
              <X size={15} color="#E5E5E5" strokeWidth={2} />
            </Pressable>
          ))}
        </ScrollView>

        {/* Toggle de selección múltiple + Toggle de vistas */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Pressable
            onPress={onToggleSelectionMode}
            style={[styles.selectionBtn, isSelectionMode && styles.selectionBtnActive]}
            hitSlop={4}
            accessibilityRole="button"
            accessibilityLabel={isSelectionMode ? 'Cancelar selección' : 'Seleccionar tareas'}
          >
            <CheckSquare size={13} color={isSelectionMode ? '#0E0E0E' : gold[400]} />
            <Text style={[styles.selectionBtnText, isSelectionMode && { color: '#0E0E0E' }]}>
              {isSelectionMode ? 'Listo' : 'Elegir'}
            </Text>
          </Pressable>

          <View style={styles.viewModeToggle}>
            <Pressable
              onPress={() => setTaskViewMode('list')}
              style={[styles.viewModeBtn, taskViewMode === 'list' && styles.viewModeBtnActive]}
              hitSlop={4}
              accessibilityRole="button"
              accessibilityLabel="Vista detallada"
            >
              <LayoutList size={15} color={taskViewMode === 'list' ? '#0E0E0E' : '#A0A0A0'} />
            </Pressable>
            <Pressable
              onPress={() => setTaskViewMode('gallery')}
              style={[styles.viewModeBtn, taskViewMode === 'gallery' && styles.viewModeBtnActive]}
              hitSlop={4}
              accessibilityRole="button"
              accessibilityLabel="Vista galería"
            >
              <LayoutGrid size={15} color={taskViewMode === 'gallery' ? '#0E0E0E' : '#A0A0A0'} />
            </Pressable>
            <Pressable
              onPress={() => setTaskViewMode('compact')}
              style={[styles.viewModeBtn, taskViewMode === 'compact' && styles.viewModeBtnActive]}
              hitSlop={4}
              accessibilityRole="button"
              accessibilityLabel="Vista compacta"
            >
              <AlignJustify size={15} color={taskViewMode === 'compact' ? '#0E0E0E' : '#A0A0A0'} />
            </Pressable>
          </View>
        </View>
      </View>

      {/* Fila de Ordenar por */}
      <View style={styles.sortRow}>
        <Typography variant="caption" color={theme.colors.foregroundMuted} style={styles.tasksCountLabel}>
          {tasksCount} {tasksCount === 1 ? 'TAREA' : 'TAREAS'}
        </Typography>

        <View style={styles.sortTriggerContainer}>
          <Typography variant="caption" color={theme.colors.foregroundMuted}>
            Ordenar por:
          </Typography>
          <Pressable
            ref={sortTriggerRef}
            collapsable={false}
            onPress={openSortMenu}
            hitSlop={8}
            style={styles.sortTriggerBtn}
            accessibilityRole="button"
            accessibilityLabel="Ordenar tareas"
          >
            <Typography variant="caption" color={gold[400]} style={{ fontWeight: '600' }}>
              {sortField === 'manual'
                ? 'Manual'
                : sortField === 'status'
                ? (isReordering ? 'Estado (manual)' : 'Estado')
                : sortField === 'priority'
                ? 'Prioridad'
                : sortField === 'alphabetical'
                ? 'Alfabético'
                : 'Fecha'}
            </Typography>
            {sortField !== 'manual' && !isReordering &&
              (sortDir === 'desc' ? (
                <ArrowDown color={gold[400]} size={14} />
              ) : (
                <ArrowUp color={gold[400]} size={14} />
              ))}
          </Pressable>

          {!isSearching && isReordering && (
            <Pressable
              onPress={() => setIsReordering(false)}
              style={{
                backgroundColor: gold[400],
                paddingHorizontal: 12,
                paddingVertical: 4,
                borderRadius: 6,
                marginLeft: 8,
              }}
              hitSlop={8}
            >
              <Text style={{ fontSize: 11, fontWeight: '700', color: '#0E0E0E' }}>OK</Text>
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}
