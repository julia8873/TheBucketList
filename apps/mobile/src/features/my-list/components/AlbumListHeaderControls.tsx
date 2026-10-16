import React from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { LayoutList, LayoutGrid, AlignJustify, ArrowDown, ArrowUp } from 'lucide-react-native';
import { Typography, FilterChip } from '@bucketlist/ui';
import { gold } from '@bucketlist/ui/src/tokens/colors';
import { styles } from '../styles/my-list.styles';
import { PriorityFilter, SortField, SortDir, AlbumViewMode } from '../types';

interface AlbumListHeaderControlsProps {
  albumPriorityFilter: PriorityFilter;
  setAlbumPriorityFilter: React.Dispatch<React.SetStateAction<PriorityFilter>>;
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
  theme: any;
}

export function AlbumListHeaderControls({
  albumPriorityFilter,
  setAlbumPriorityFilter,
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
  theme,
}: AlbumListHeaderControlsProps) {
  return (
    <View>
      {/* Filtro por prioridad de álbum + Toggle de modos de vista */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingRight: 8 }}
          style={{ flex: 1, marginRight: 8 }}
        >
          <FilterChip
            label="Prioridad: Todas"
            active={albumPriorityFilter === 'all'}
            onPress={() => setAlbumPriorityFilter('all')}
          />
          <FilterChip
            label="🔴 Alta"
            active={albumPriorityFilter === 'high'}
            onPress={() => setAlbumPriorityFilter(albumPriorityFilter === 'high' ? 'all' : 'high')}
          />
          <FilterChip
            label="🟡 Media"
            active={albumPriorityFilter === 'medium'}
            onPress={() => setAlbumPriorityFilter(albumPriorityFilter === 'medium' ? 'all' : 'medium')}
          />
          <FilterChip
            label="🟢 Baja"
            active={albumPriorityFilter === 'low'}
            onPress={() => setAlbumPriorityFilter(albumPriorityFilter === 'low' ? 'all' : 'low')}
          />
        </ScrollView>

        {/* Toggle de vistas: Lista | Galería | Compacta */}
        <View style={styles.viewModeToggle}>
          <Pressable
            onPress={() => setAlbumViewMode('list')}
            style={[styles.viewModeBtn, albumViewMode === 'list' && styles.viewModeBtnActive]}
            hitSlop={4}
            accessibilityRole="button"
            accessibilityLabel="Vista detallada"
          >
            <LayoutList size={15} color={albumViewMode === 'list' ? '#0E0E0E' : '#A0A0A0'} />
          </Pressable>
          <Pressable
            onPress={() => setAlbumViewMode('gallery')}
            style={[styles.viewModeBtn, albumViewMode === 'gallery' && styles.viewModeBtnActive]}
            hitSlop={4}
            accessibilityRole="button"
            accessibilityLabel="Vista galería"
          >
            <LayoutGrid size={15} color={albumViewMode === 'gallery' ? '#0E0E0E' : '#A0A0A0'} />
          </Pressable>
          <Pressable
            onPress={() => setAlbumViewMode('compact')}
            style={[styles.viewModeBtn, albumViewMode === 'compact' && styles.viewModeBtnActive]}
            hitSlop={4}
            accessibilityRole="button"
            accessibilityLabel="Vista compacta"
          >
            <AlignJustify size={15} color={albumViewMode === 'compact' ? '#0E0E0E' : '#A0A0A0'} />
          </Pressable>
        </View>
      </View>

      {/* Fila de Ordenar por álbumes */}
      <View style={styles.sortRow}>
        <Typography variant="caption" color={theme.colors.foregroundMuted} style={styles.tasksCountLabel}>
          {albumsCount} {albumsCount === 1 ? 'ÁLBUM' : 'ÁLBUMES'}
        </Typography>
        <View style={styles.sortTriggerContainer}>
          <Typography variant="caption" color={theme.colors.foregroundMuted}>
            Ordenar por:
          </Typography>
          <Pressable
            ref={albumSortTriggerRef}
            collapsable={false}
            onPress={openSortMenu}
            hitSlop={8}
            style={styles.sortTriggerBtn}
            accessibilityRole="button"
            accessibilityLabel="Ordenar álbumes"
          >
            <Typography variant="caption" color={gold[400]} style={{ fontWeight: '600' }}>
              {albumSortField === 'manual'
                ? 'Manual'
                : albumSortField === 'status'
                ? (isAlbumReordering ? 'Estado (manual)' : 'Estado')
                : albumSortField === 'priority'
                ? 'Prioridad'
                : albumSortField === 'alphabetical'
                ? 'Alfabético'
                : 'Fecha'}
            </Typography>
            {albumSortField !== 'manual' && !isAlbumReordering &&
              (albumSortDir === 'desc' ? (
                <ArrowDown color={gold[400]} size={14} />
              ) : (
                <ArrowUp color={gold[400]} size={14} />
              ))}
          </Pressable>

          {!isSearching && isAlbumReordering && (
            <Pressable
              onPress={() => setIsAlbumReordering(false)}
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
