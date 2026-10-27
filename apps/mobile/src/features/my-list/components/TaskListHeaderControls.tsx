import { themedStyleSheet } from '@bucketlist/ui';
import React, { useState, useMemo } from 'react';
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
  SlidersHorizontal,
  ListChecks,
} from 'lucide-react-native';
import { Typography, FilterChip } from '@bucketlist/ui';
import { gold } from '@bucketlist/ui/src/tokens/colors';
import { useTranslation } from 'react-i18next';
import { styles } from '../styles/my-list.styles';
import type { FilterType, PriorityFilter, SortField, SortDir, TaskViewMode } from '../types';
import type { Tag } from '@/hooks/useTags';
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
  onOpenCustomize?: () => void;
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
  onOpenCustomize,
  theme,
}: TaskListHeaderControlsProps) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const [statusSheetVisible, setStatusSheetVisible] = useState(false);
  const [prioritySheetVisible, setPrioritySheetVisible] = useState(false);

  const statusOptions: Array<{ key: FilterType; label: string; desc: string }> = useMemo(() => [
    { key: 'all', label: t('my_list.status_filter_all'), desc: t('my_list.status_filter_all_desc') },
    { key: 'active', label: t('my_list.status_filter_active'), desc: t('my_list.status_filter_active_desc') },
    { key: 'in_progress', label: t('my_list.status_filter_in_progress'), desc: t('my_list.status_filter_in_progress_desc') },
    { key: 'completed', label: t('my_list.status_filter_completed'), desc: t('my_list.status_filter_completed_desc') },
    { key: 'expired', label: t('my_list.status_filter_expired'), desc: t('my_list.status_filter_expired_desc') },
    { key: 'public', label: t('my_list.status_filter_public'), desc: t('my_list.status_filter_public_desc') },
  ], [t]);

  const statusShortLabel: Record<FilterType, string> = useMemo(() => ({
    all: t('my_list.filter_status_short'),
    active: `${t('my_list.filter_status_short')}: ${t('my_list.status_filter_active')}`,
    in_progress: `${t('my_list.filter_status_short')}: ${t('my_list.status_filter_in_progress')}`,
    completed: `${t('my_list.filter_status_short')}: ${t('my_list.status_filter_completed')}`,
    expired: `${t('my_list.filter_status_short')}: ${t('my_list.status_filter_expired')}`,
    public: `${t('my_list.filter_status_short')}: ${t('my_list.status_filter_public')}`,
  }), [t]);

  const priorityOptions: Array<{ key: PriorityFilter; label: string; desc: string }> = useMemo(() => [
    { key: 'all', label: t('my_list.priority_filter_all'), desc: t('my_list.priority_filter_all_desc') },
    { key: 'high', label: t('my_list.priority_filter_high'), desc: t('my_list.priority_filter_high_desc') },
    { key: 'medium', label: t('my_list.priority_filter_medium'), desc: t('my_list.priority_filter_medium_desc') },
    { key: 'low', label: t('my_list.priority_filter_low'), desc: t('my_list.priority_filter_low_desc') },
  ], [t]);

  const priorityShortLabel: Record<PriorityFilter, string> = useMemo(() => ({
    all: t('my_list.filter_priority_short'),
    high: `${t('my_list.filter_priority_short')}: ${t('my_list.priority_filter_high')}`,
    medium: `${t('my_list.filter_priority_short')}: ${t('my_list.priority_filter_medium')}`,
    low: `${t('my_list.filter_priority_short')}: ${t('my_list.priority_filter_low')}`,
  }), [t]);

  return (
    <View>
      {/* Fila única de Filtros */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexGrow: 1 }}
        style={{ marginBottom: 16 }}
      >
        {/* Todas */}
        <FilterChip
          label={t('my_list.filter_all')}
          active={filter === 'all' && priorityFilter === 'all'}
          style={{ flexGrow: 1, flexShrink: 0, paddingHorizontal: 10 }}
          onPress={() => {
            setFilter('all');
            setPriorityFilter('all');
          }}
        />

        {/* Filtrar por estado */}
        <Pressable
          onPress={() => setStatusSheetVisible(true)}
          accessibilityRole="button"
          accessibilityLabel={t('my_list.filter_status')}
          style={[
            styles.tagFilterBtn,
            {
              flexGrow: 1,
              flexShrink: 0,
              justifyContent: 'center',
              paddingHorizontal: 10,
              backgroundColor: filter !== 'all'
                ? (theme.dark ? 'transparent' : 'rgba(212, 175, 55, 0.12)')
                : theme.colors.surface,
              borderColor: filter !== 'all' ? gold[400] : theme.colors.border,
            },
          ]}
        >
          <Text
            numberOfLines={1}
            style={[styles.tagFilterText, { color: filter !== 'all' ? gold[400] : theme.colors.foregroundMuted }]}
          >
            {statusShortLabel[filter]}
          </Text>
          <ChevronDown size={14} color={filter !== 'all' ? gold[400] : theme.colors.foregroundMuted} />
        </Pressable>

        {/* Filtrar por prioridad */}
        <Pressable
          onPress={() => setPrioritySheetVisible(true)}
          accessibilityRole="button"
          accessibilityLabel={t('my_list.filter_priority')}
          style={[
            styles.tagFilterBtn,
            {
              flexGrow: 1,
              flexShrink: 0,
              justifyContent: 'center',
              paddingHorizontal: 10,
              backgroundColor: priorityFilter !== 'all'
                ? (theme.dark ? 'transparent' : 'rgba(212, 175, 55, 0.12)')
                : theme.colors.surface,
              borderColor: priorityFilter !== 'all' ? gold[400] : theme.colors.border,
            },
          ]}
        >
          <Text
            numberOfLines={1}
            style={[styles.tagFilterText, { color: priorityFilter !== 'all' ? gold[400] : theme.colors.foregroundMuted }]}
          >
            {priorityShortLabel[priorityFilter]}
          </Text>
          <ChevronDown size={14} color={priorityFilter !== 'all' ? gold[400] : theme.colors.foregroundMuted} />
        </Pressable>

        {/* Etiquetas */}
        <Pressable
          onPress={onOpenTagFilterSheet}
          accessibilityRole="button"
          accessibilityLabel={t('my_list.filter_tags')}
          style={[
            styles.tagFilterBtn,
            {
              flexGrow: 1,
              flexShrink: 0,
              justifyContent: 'center',
              paddingHorizontal: 10,
              backgroundColor: selectedTagIds.length > 0
                ? (theme.dark ? 'transparent' : 'rgba(212, 175, 55, 0.12)')
                : theme.colors.surface,
              borderColor: selectedTagIds.length > 0 ? gold[400] : theme.colors.border,
            },
          ]}
        >
          <TagIcon size={14} color={selectedTagIds.length > 0 ? gold[400] : theme.colors.foregroundMuted} strokeWidth={2} />
          <Text
            numberOfLines={1}
            style={[styles.tagFilterText, { color: selectedTagIds.length > 0 ? gold[400] : theme.colors.foregroundMuted }]}
          >
            {selectedTagIds.length === 0
              ? t('my_list.filter_tags_short')
              : selectedTagIds.length === 1
              ? t('my_list.tags_count_single')
              : t('my_list.tags_count_plural', { count: selectedTagIds.length })}
          </Text>
        </Pressable>

        {/* Chips de etiquetas seleccionadas */}
        {selectedTags.map((tItem) => (
          <Pressable
            key={tItem.id}
            onPress={() => onRemoveTagFilter(tItem.id)}
            accessibilityRole="button"
            accessibilityLabel={t('my_list.remove_tag_label', { name: tItem.name })}
            style={[styles.activeTagChip, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, flexShrink: 0 }]}
          >
            {tItem.emoji ? (
              <View style={[styles.activeTagEmoji, { backgroundColor: hexToRgba(tItem.color, 0.3) }]}>
                <Text style={styles.activeTagEmojiText}>{tItem.emoji}</Text>
              </View>
            ) : (
              <View style={[styles.activeTagDot, { backgroundColor: tItem.color }]} />
            )}
            <Text style={[styles.activeTagText, { color: theme.colors.foreground }]} numberOfLines={1}>
              {tItem.name}
            </Text>
            <X size={15} color={theme.colors.foregroundMuted} strokeWidth={2} />
          </Pressable>
        ))}
      </ScrollView>

      {/* Fila de controles: Modos de vista, Ordenar, Personalizar, Selección */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          marginBottom: 12,
          width: '100%',
        }}
      >
        {/* Modos de vista */}
        <View
          style={[
            styles.viewModeToggle,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
              flexShrink: 0,
            },
          ]}
        >
          <Pressable
            onPress={() => setTaskViewMode('list')}
            style={[styles.viewModeBtn, taskViewMode === 'list' && styles.viewModeBtnActive]}
            hitSlop={4}
            accessibilityRole="button"
            accessibilityLabel={t('my_list.view_detailed')}
          >
            <LayoutList size={15} color={taskViewMode === 'list' ? '#0E0E0E' : theme.colors.foregroundMuted} />
          </Pressable>
          <Pressable
            onPress={() => setTaskViewMode('gallery')}
            style={[styles.viewModeBtn, taskViewMode === 'gallery' && styles.viewModeBtnActive]}
            hitSlop={4}
            accessibilityRole="button"
            accessibilityLabel={t('my_list.view_gallery')}
          >
            <LayoutGrid size={15} color={taskViewMode === 'gallery' ? '#0E0E0E' : theme.colors.foregroundMuted} />
          </Pressable>
          <Pressable
            onPress={() => setTaskViewMode('compact')}
            style={[styles.viewModeBtn, taskViewMode === 'compact' && styles.viewModeBtnActive]}
            hitSlop={4}
            accessibilityRole="button"
            accessibilityLabel={t('my_list.view_compact')}
          >
            <AlignJustify size={15} color={taskViewMode === 'compact' ? '#0E0E0E' : theme.colors.foregroundMuted} />
          </Pressable>
        </View>

        {/* Ordenar (Estado / Manual / etc.) */}
        <View style={[styles.sortTriggerContainer, { flex: 1, minWidth: 0, flexShrink: 1 }]}>
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
                flex: 1,
                minWidth: 0,
                justifyContent: 'center',
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel={t('my_list.sort_tasks')}
          >
            <Typography
              variant="caption"
              color={gold[400]}
              style={{ fontWeight: '600' }}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {sortField === 'manual'
                ? t('my_list.sort_manual')
                : sortField === 'status'
                ? isReordering
                  ? t('my_list.sort_status_manual')
                  : t('my_list.sort_status')
                : sortField === 'priority'
                ? t('my_list.sort_priority')
                : sortField === 'alphabetical'
                ? t('my_list.sort_alphabetical')
                : sortField === 'completed_at'
                ? t('my_list.sort_completed_at_short')
                : t('my_list.sort_date')}
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

        {/* Botón Personalizar */}
        {onOpenCustomize && (
          <Pressable
            onPress={onOpenCustomize}
            hitSlop={8}
            style={[
              styles.sortTriggerBtn,
              {
                height: 32,
                width: 32,
                borderRadius: 8,
                backgroundColor: theme.colors.surface,
                borderWidth: 1,
                borderColor: theme.colors.border,
                justifyContent: 'center',
                alignItems: 'center',
                flexShrink: 0,
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel={t('my_list.customize_view')}
          >
            <SlidersHorizontal size={14} color={gold[400]} />
          </Pressable>
        )}

        {/* Botón Selección múltiple */}
        {onToggleSelectionMode && (
          <Pressable
            onPress={onToggleSelectionMode}
            hitSlop={8}
            style={[
              styles.sortTriggerBtn,
              {
                height: 32,
                width: 32,
                borderRadius: 8,
                backgroundColor: isSelectionMode ? gold[400] : theme.colors.surface,
                borderWidth: 1,
                borderColor: isSelectionMode ? gold[400] : theme.colors.border,
                justifyContent: 'center',
                alignItems: 'center',
                flexShrink: 0,
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel={isSelectionMode ? 'Salir de selección múltiple' : 'Seleccionar tareas'}
          >
            <ListChecks size={15} color={isSelectionMode ? '#0E0E0E' : gold[400]} />
          </Pressable>
        )}

        {!isSearching && isReordering && (
          <Pressable
            onPress={() => setIsReordering(false)}
            style={{
              backgroundColor: gold[400],
              height: 32,
              paddingHorizontal: 10,
              borderRadius: 8,
              justifyContent: 'center',
              alignItems: 'center',
              flexShrink: 0,
            }}
            hitSlop={8}
          >
            <Text style={{ fontSize: 11, fontWeight: '700', color: '#0E0E0E' }}>OK</Text>
          </Pressable>
        )}
      </View>

      {/* Contador de tareas abajo */}
      <View style={{ marginBottom: 10, marginTop: 2 }}>
        <Typography variant="caption" color={theme.colors.foregroundMuted} style={styles.tasksCountLabel}>
          {tasksCount === 1 ? t('my_list.tasks_count_single', { count: tasksCount }) : t('my_list.tasks_count_plural', { count: tasksCount })}
        </Typography>
      </View>

      {/* Bottom Sheet: Filtrar por Estado */}
      <TagSheetShell visible={statusSheetVisible} onClose={() => setStatusSheetVisible(false)}>
        <View style={[localStyles.sheetContent, { paddingBottom: Math.max(insets.bottom, 24) }]}>
          <View style={localStyles.sheetHeader}>
            <Text style={[localStyles.sheetTitle, { color: theme.colors.foreground }]}>{t('my_list.filter_status')}</Text>
            <Pressable
              onPress={() => setStatusSheetVisible(false)}
              hitSlop={8}
              style={[localStyles.sheetCloseBtn, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
              accessibilityRole="button"
              accessibilityLabel={t('common.close')}
            >
              <X size={16} color={theme.colors.foregroundMuted} />
            </Pressable>
          </View>

          <View style={localStyles.sheetOptionList}>
            {statusOptions.map((opt) => {
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
                  accessibilityLabel={opt.label}
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
            <Text style={[localStyles.sheetTitle, { color: theme.colors.foreground }]}>{t('my_list.filter_priority')}</Text>
            <Pressable
              onPress={() => setPrioritySheetVisible(false)}
              hitSlop={8}
              style={[localStyles.sheetCloseBtn, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
              accessibilityRole="button"
              accessibilityLabel={t('common.close')}
            >
              <X size={16} color={theme.colors.foregroundMuted} />
            </Pressable>
          </View>

          <View style={localStyles.sheetOptionList}>
            {priorityOptions.map((opt) => {
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
                  accessibilityLabel={opt.label}
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

const localStyles = themedStyleSheet({
  sheetContent: {
    paddingHorizontal: 16,
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

