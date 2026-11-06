import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { AlbumFilterType, PriorityFilter, SortField, SortDir, AlbumViewMode } from '../types';
import type { Tag } from '@/hooks/useTags';
import { ActiveFilterChips, ListControlsBar, ListFiltersSheet } from './ListControls';

interface AlbumListHeaderControlsProps {
  albumFilter: AlbumFilterType;
  setAlbumFilter: (f: AlbumFilterType) => void;
  albumPriorityFilter: PriorityFilter;
  setAlbumPriorityFilter: React.Dispatch<React.SetStateAction<PriorityFilter>>;
  onOpenTagFilterSheet: () => void;
  selectedTagIds: string[];
  selectedTags: Tag[];
  onRemoveTagFilter: (id: string) => void;
  isSelectionMode?: boolean;
  onToggleSelectionMode?: () => void;
  albumViewMode: AlbumViewMode;
  setAlbumViewMode: (mode: AlbumViewMode) => void;
  albumsCount: number;
  albumSortField: SortField;
  albumSortDir: SortDir;
  isAlbumReordering: boolean;
  setIsAlbumReordering: (r: boolean) => void;
  isSearching: boolean;
  albumSortTriggerRef: any;
  openSortMenu: () => void;
  /** Nuevo diseño: búsqueda plegable y secciones plegables */
  searchOpen: boolean;
  onToggleSearch: () => void;
  allCollapsed: boolean;
  onToggleAllCollapsed: () => void;
  galleryColumns?: 2 | 3 | 4;
  onCycleGalleryColumns?: () => void;
  /** Se mantiene por compatibilidad: la personalización se abre desde el engranaje de la cabecera. */
  onOpenCustomize?: () => void;
  theme: any;
}

export function AlbumListHeaderControls({
  albumFilter,
  setAlbumFilter,
  albumPriorityFilter,
  setAlbumPriorityFilter,
  onOpenTagFilterSheet,
  selectedTagIds,
  selectedTags,
  onRemoveTagFilter,
  isSelectionMode,
  onToggleSelectionMode,
  albumViewMode,
  setAlbumViewMode,
  albumsCount,
  albumSortField,
  albumSortDir,
  isAlbumReordering,
  setIsAlbumReordering,
  isSearching,
  albumSortTriggerRef,
  openSortMenu,
  searchOpen,
  onToggleSearch,
  allCollapsed,
  onToggleAllCollapsed,
  galleryColumns,
  onCycleGalleryColumns,
  theme,
}: AlbumListHeaderControlsProps) {
  const { t } = useTranslation();
  const [filtersOpen, setFiltersOpen] = useState(false);

  const statusOptions = useMemo(
    () => [
      { key: 'all' as AlbumFilterType, label: t('my_list.album_filter_all') },
      { key: 'active' as AlbumFilterType, label: t('my_list.album_filter_active') },
      { key: 'completed' as AlbumFilterType, label: t('my_list.album_filter_completed') },
      { key: 'closed' as AlbumFilterType, label: t('my_list.album_filter_closed') },
    ],
    [t],
  );
  const priorityLabels: Record<PriorityFilter, string> = {
    all: t('my_list.filter_all'),
    high: t('my_list.priority_filter_high'),
    medium: t('my_list.priority_filter_medium'),
    low: t('my_list.priority_filter_low'),
  };

  const filtersCount = (albumFilter !== 'all' ? 1 : 0) + (albumPriorityFilter !== 'all' ? 1 : 0) + selectedTagIds.length;

  const reset = () => {
    setAlbumFilter('all');
    setAlbumPriorityFilter('all');
    selectedTags.forEach((tg) => onRemoveTagFilter(tg.id));
  };

  return (
    <View>
      <ListControlsBar
        theme={theme}
        countLabel=""
        viewMode={albumViewMode}
        setViewMode={setAlbumViewMode}
        isSelectionMode={isSelectionMode}
        onToggleSelectionMode={onToggleSelectionMode}
        searchActive={searchOpen || isSearching}
        onToggleSearch={onToggleSearch}
        filtersCount={filtersCount}
        onOpenFilters={() => setFiltersOpen(true)}
        onOpenSort={openSortMenu}
        sortTriggerRef={albumSortTriggerRef}
        sortDir={albumSortDir}
        showSortDir={albumSortField !== 'manual' && !isAlbumReordering}
        allCollapsed={allCollapsed}
        onToggleAllCollapsed={onToggleAllCollapsed}
        galleryColumns={galleryColumns}
        onCycleGalleryColumns={onCycleGalleryColumns}
        isReordering={isAlbumReordering}
        onFinishReordering={() => setIsAlbumReordering(false)}
        isSearching={isSearching}
      />

      <ActiveFilterChips
        theme={theme}
        statusLabel={albumFilter !== 'all' ? statusOptions.find((o) => o.key === albumFilter)?.label : null}
        onClearStatus={() => setAlbumFilter('all')}
        priorityLabel={albumPriorityFilter !== 'all' ? priorityLabels[albumPriorityFilter] : null}
        onClearPriority={() => setAlbumPriorityFilter('all')}
        tags={selectedTags}
        onRemoveTag={onRemoveTagFilter}
      />

      <ListFiltersSheet<AlbumFilterType>
        theme={theme}
        visible={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        title={t('my_list.filters')}
        statusOptions={statusOptions}
        status={albumFilter}
        setStatus={setAlbumFilter}
        priority={albumPriorityFilter}
        setPriority={setAlbumPriorityFilter}
        selectedTagIds={selectedTagIds}
        onOpenTags={() => {
          setFiltersOpen(false);
          setTimeout(onOpenTagFilterSheet, 260);
        }}
        onReset={reset}
        resultLabel={t('my_list.apply_filters_albums', {
          count: albumsCount,
        })}
      />
    </View>
  );
}
