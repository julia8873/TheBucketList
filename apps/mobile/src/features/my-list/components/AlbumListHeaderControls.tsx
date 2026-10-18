import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { LayoutList, LayoutGrid, AlignJustify, ArrowDown, ArrowUp, ChevronDown, Check, X } from 'lucide-react-native';
import { Typography, FilterChip } from '@bucketlist/ui';
import { gold } from '@bucketlist/ui/src/tokens/colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { styles } from '../styles/my-list.styles';
import { PriorityFilter, SortField, SortDir, AlbumViewMode } from '../types';
import { TagSheetShell } from '@/components/TagSheetShell';

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

const PRIORITY_OPTIONS: Array<{ key: PriorityFilter; label: string; desc: string }> = [
  { key: 'all', label: 'Todas las prioridades', desc: 'Muestra álbumes de cualquier prioridad' },
  { key: 'high', label: '🔴 Alta', desc: 'Álbumes urgentes o de máxima prioridad' },
  { key: 'medium', label: '🟡 Media', desc: 'Álbumes de prioridad estándar' },
  { key: 'low', label: '🟢 Baja', desc: 'Álbumes sin prisa o de prioridad baja' },
];

const PRIORITY_SHORT_LABEL: Record<PriorityFilter, string> = {
  all: 'Filtrar por prioridad',
  high: 'Prioridad: 🔴 Alta',
  medium: 'Prioridad: 🟡 Media',
  low: 'Prioridad: 🟢 Baja',
};

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
  const insets = useSafeAreaInsets();
  const [prioritySheetVisible, setPrioritySheetVisible] = useState(false);

  return (
    <View>
      {/* Filtro por prioridad de álbum + Toggle de modos de vista */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, marginRight: 8 }}>
          <FilterChip
            label="Todas"
            active={albumPriorityFilter === 'all'}
            onPress={() => setAlbumPriorityFilter('all')}
          />
          <Pressable
            onPress={() => setPrioritySheetVisible(true)}
            accessibilityRole="button"
            accessibilityLabel="Filtrar por prioridad"
            style={[
              styles.tagFilterBtn,
              {
                backgroundColor: albumPriorityFilter !== 'all'
                  ? (theme.dark ? 'transparent' : 'rgba(212, 175, 55, 0.12)')
                  : theme.colors.surface,
                borderColor: albumPriorityFilter !== 'all' ? gold[400] : theme.colors.border,
              },
            ]}
          >
            <Text
              style={[
                styles.tagFilterText,
                { color: albumPriorityFilter !== 'all' ? gold[400] : theme.colors.foregroundMuted },
              ]}
              numberOfLines={1}
            >
              {PRIORITY_SHORT_LABEL[albumPriorityFilter]}
            </Text>
            <ChevronDown size={14} color={albumPriorityFilter !== 'all' ? gold[400] : theme.colors.foregroundMuted} />
          </Pressable>
        </View>

        {/* Toggle de vistas: Lista | Galería | Compacta */}
        <View style={[styles.viewModeToggle, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <Pressable
            onPress={() => setAlbumViewMode('list')}
            style={[styles.viewModeBtn, albumViewMode === 'list' && styles.viewModeBtnActive]}
            hitSlop={4}
            accessibilityRole="button"
            accessibilityLabel="Vista detallada"
          >
            <LayoutList size={15} color={albumViewMode === 'list' ? '#0E0E0E' : theme.colors.foregroundMuted} />
          </Pressable>
          <Pressable
            onPress={() => setAlbumViewMode('gallery')}
            style={[styles.viewModeBtn, albumViewMode === 'gallery' && styles.viewModeBtnActive]}
            hitSlop={4}
            accessibilityRole="button"
            accessibilityLabel="Vista galería"
          >
            <LayoutGrid size={15} color={albumViewMode === 'gallery' ? '#0E0E0E' : theme.colors.foregroundMuted} />
          </Pressable>
          <Pressable
            onPress={() => setAlbumViewMode('compact')}
            style={[styles.viewModeBtn, albumViewMode === 'compact' && styles.viewModeBtnActive]}
            hitSlop={4}
            accessibilityRole="button"
            accessibilityLabel="Vista compacta"
          >
            <AlignJustify size={15} color={albumViewMode === 'compact' ? '#0E0E0E' : theme.colors.foregroundMuted} />
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

      {/* Bottom Sheet: Filtrar por Prioridad de Álbumes */}
      <TagSheetShell visible={prioritySheetVisible} onClose={() => setPrioritySheetVisible(false)}>
        <View style={[localStyles.sheetContent, { paddingBottom: Math.max(insets.bottom, 24) }]}>
          <View style={localStyles.sheetHeader}>
            <Text style={[localStyles.sheetTitle, { color: theme.colors.foreground }]}>Filtrar álbumes por prioridad</Text>
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
              const isSelected = albumPriorityFilter === opt.key;
              return (
                <Pressable
                  key={opt.key}
                  onPress={() => {
                    setAlbumPriorityFilter(opt.key);
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
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Newsreader_700Bold',
  },
  sheetCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetOptionList: {
    gap: 8,
  },
  sheetOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  sheetOptionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  sheetOptionDesc: {
    fontSize: 12,
  },
});
