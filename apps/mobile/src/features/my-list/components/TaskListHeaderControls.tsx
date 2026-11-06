import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { FilterType, PriorityFilter, SortField, SortDir, TaskViewMode } from '../types';
import type { Tag } from '@/hooks/useTags';
import type { ItemParticipant } from '@/hooks/useItemParticipants';
import { ActiveFilterChips, ListControlsBar, ListFiltersSheet } from './ListControls';

interface TaskListHeaderControlsProps {
  filter: FilterType;
  setFilter: (f: FilterType) => void;
  priorityFilter: PriorityFilter;
  setPriorityFilter: React.Dispatch<React.SetStateAction<PriorityFilter>>;
  onOpenTagFilterSheet: () => void;
  selectedTagIds: string[];
  selectedTags: Tag[];
  onRemoveTagFilter: (id: string) => void;
  selectedCollaboratorIds?: string[];
  availableCollaborators?: ItemParticipant[];
  selectedCollaborators?: ItemParticipant[];
  onToggleCollaboratorId?: (id: string) => void;
  onRemoveCollaboratorFilter?: (id: string) => void;
  isSelectionMode: boolean;
  onToggleSelectionMode: () => void;
  taskViewMode: TaskViewMode;
  setTaskViewMode: (mode: TaskViewMode) => void;
  tasksCount: number;
  totalTasksCount?: number;
  sortField: SortField;
  sortDir: SortDir;
  isReordering: boolean;
  setIsReordering: (r: boolean) => void;
  isSearching: boolean;
  sortTriggerRef: any;
  openSortMenu: () => void;
  /** Nuevo diseño: búsqueda plegable y secciones plegables */
  searchOpen: boolean;
  onToggleSearch: () => void;
  allCollapsed: boolean;
  onToggleAllCollapsed: () => void;
  /** Se mantiene por compatibilidad: la personalización se abre desde el engranaje de la cabecera. */
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
  selectedCollaboratorIds = [],
  availableCollaborators = [],
  selectedCollaborators = [],
  onToggleCollaboratorId,
  onRemoveCollaboratorFilter,
  isSelectionMode,
  onToggleSelectionMode,
  taskViewMode,
  setTaskViewMode,
  tasksCount,
  totalTasksCount,
  sortField,
  sortDir,
  isReordering,
  setIsReordering,
  isSearching,
  sortTriggerRef,
  openSortMenu,
  searchOpen,
  onToggleSearch,
  allCollapsed,
  onToggleAllCollapsed,
  theme,
}: TaskListHeaderControlsProps) {
  const { t } = useTranslation();
  const [filtersOpen, setFiltersOpen] = useState(false);

  const statusOptions = useMemo(
    () => [
      { key: 'all' as FilterType, label: t('my_list.status_filter_all') },
      { key: 'active' as FilterType, label: t('my_list.status_filter_active') },
      { key: 'in_progress' as FilterType, label: t('my_list.status_filter_in_progress') },
      { key: 'completed' as FilterType, label: t('my_list.status_filter_completed') },
      { key: 'expired' as FilterType, label: t('my_list.status_filter_expired') },
      { key: 'public' as FilterType, label: t('my_list.status_filter_public') },
    ],
    [t],
  );
  const priorityLabels: Record<PriorityFilter, string> = {
    all: t('my_list.filter_all'),
    high: t('my_list.priority_filter_high'),
    medium: t('my_list.priority_filter_medium'),
    low: t('my_list.priority_filter_low'),
  };

  const filtersCount =
    (filter !== 'all' ? 1 : 0) +
    (priorityFilter !== 'all' ? 1 : 0) +
    selectedTagIds.length +
    selectedCollaboratorIds.length;

  const reset = () => {
    setFilter('all');
    setPriorityFilter('all');
    selectedTags.forEach((tg) => onRemoveTagFilter(tg.id));
    selectedCollaboratorIds.forEach((id) => onRemoveCollaboratorFilter?.(id));
  };

  return (
    <View>
      <ListControlsBar
        theme={theme}
        countLabel=""
        viewMode={taskViewMode}
        setViewMode={setTaskViewMode}
        isSelectionMode={isSelectionMode}
        onToggleSelectionMode={onToggleSelectionMode}
        searchActive={searchOpen || isSearching}
        onToggleSearch={onToggleSearch}
        filtersCount={filtersCount}
        onOpenFilters={() => setFiltersOpen(true)}
        onOpenSort={openSortMenu}
        sortTriggerRef={sortTriggerRef}
        sortDir={sortDir}
        showSortDir={sortField !== 'manual' && !isReordering}
        allCollapsed={allCollapsed}
        onToggleAllCollapsed={onToggleAllCollapsed}
        isReordering={isReordering}
        onFinishReordering={() => setIsReordering(false)}
        isSearching={isSearching}
      />

      <ActiveFilterChips
        theme={theme}
        statusLabel={filter !== 'all' ? statusOptions.find((o) => o.key === filter)?.label : null}
        onClearStatus={() => setFilter('all')}
        priorityLabel={priorityFilter !== 'all' ? priorityLabels[priorityFilter] : null}
        onClearPriority={() => setPriorityFilter('all')}
        tags={selectedTags}
        onRemoveTag={onRemoveTagFilter}
        collaborators={selectedCollaborators}
        onRemoveCollaborator={onRemoveCollaboratorFilter}
      />

      <ListFiltersSheet<FilterType>
        theme={theme}
        visible={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        title={t('my_list.filters')}
        statusOptions={statusOptions}
        status={filter}
        setStatus={setFilter}
        priority={priorityFilter}
        setPriority={setPriorityFilter}
        selectedTagIds={selectedTagIds}
        onOpenTags={() => {
          setFiltersOpen(false);
          setTimeout(onOpenTagFilterSheet, 260);
        }}
        collaborators={availableCollaborators}
        selectedCollaboratorIds={selectedCollaboratorIds}
        onToggleCollaborator={onToggleCollaboratorId}
        onReset={reset}
        resultLabel={t('my_list.apply_filters_tasks', {
          count: tasksCount,
        })}
      />
    </View>
  );
}
