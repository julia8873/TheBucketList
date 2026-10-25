import { themedStyleSheet } from '@bucketlist/ui';
import React, { useState, useMemo } from 'react';
import { View, Text, ActivityIndicator, Pressable, Modal, StyleSheet, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SlidersHorizontal, ChevronDown, Check, X } from 'lucide-react-native';
import { useTranslation } from '@bucketlist/shared';
import { SectionLabel, AlbumCard, gold, useTheme, fontFamily } from '@bucketlist/ui';
import { AlbumCardSkeleton } from '../../../components/TaskSkeletons';
import type { AlbumWithProgress } from '../../../hooks/useAlbums';
import { AlbumCompactItemRow, AlbumListItemRow } from '../../my-list/components/AlbumItemComponents';
import { ViewModeSelector, type TaskViewMode } from '../../../components/ViewModeSelector';
import { styles } from '../styles/profile.styles';

export type AlbumFilter = 'all' | 'active' | 'completed' | 'closed';

interface ProfileAlbumsTabProps {
  totalCount: number;
  albumFilter: AlbumFilter;
  onChangeFilter: (f: AlbumFilter) => void;
  albumViewMode?: TaskViewMode;
  onChangeViewMode?: (mode: TaskViewMode) => void;
  albumsLoading: boolean;
  filteredAlbums: AlbumWithProgress[];
  isAlbumFavorite?: (id: string) => boolean;
  onToggleFavoriteAlbum?: (id: string, isFav: boolean) => void;
  isAlbumSaved?: (id: string) => boolean;
  onToggleSaveAlbum?: (id: string, isSaved: boolean) => void;
  hasUser: boolean;
}

export function ProfileAlbumsTab({
  totalCount,
  albumFilter,
  onChangeFilter,
  albumViewMode = 'gallery',
  onChangeViewMode,
  albumsLoading,
  filteredAlbums,
  isAlbumFavorite,
  onToggleFavoriteAlbum,
  isAlbumSaved,
  onToggleSaveAlbum,
  hasUser,
}: ProfileAlbumsTabProps) {
  const router = useRouter();
  const { theme } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [filterModalVisible, setFilterModalVisible] = useState(false);

  const filterOptions: Array<{ key: AlbumFilter; label: string; description: string }> = useMemo(
    () => [
      { key: 'all', label: t('common.all_m'), description: t('profile.all_public_albums') },
      { key: 'active', label: t('common.active'), description: t('profile.active_albums_desc') },
      { key: 'completed', label: t('common.completed'), description: t('profile.completed_albums_desc') },
      { key: 'closed', label: t('common.closed'), description: t('profile.closed_albums_desc') },
    ],
    [t]
  );

  const activeOption = filterOptions.find((o) => o.key === albumFilter) || filterOptions[0]!;

  return (
    <>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <SectionLabel
          highlight={t('common.albums')}
          rest={` ${t('common.public').toLowerCase()} · ${totalCount}`}
          style={styles.sectionLabel}
        />
        {onChangeViewMode && (
          <ViewModeSelector mode={albumViewMode} onChange={onChangeViewMode} />
        )}
      </View>

      {/* Botón único de filtro con bottom view */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 14, marginBottom: 16 }}>
        <Pressable
          onPress={() => setFilterModalVisible(true)}
          style={[
            tabStyles.filterButton,
            {
              backgroundColor: theme.dark ? '#1B1B1B' : '#EAE5DB',
              borderColor: albumFilter !== 'all' ? theme.colors.primary : (theme.dark ? '#2B2B2B' : '#D9D3C7'),
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel={t('profile.filter_albums_btn_label', { label: activeOption.label })}
        >
          <SlidersHorizontal
            size={14}
            color={albumFilter !== 'all' ? theme.colors.primary : theme.colors.foreground}
            strokeWidth={2}
          />
          <Text
            style={[
              tabStyles.filterButtonText,
              {
                color: albumFilter !== 'all' ? theme.colors.primary : theme.colors.foreground,
              },
            ]}
          >
            {activeOption.label}
          </Text>
          <ChevronDown
            size={14}
            color={albumFilter !== 'all' ? theme.colors.primary : theme.colors.foregroundMuted}
            strokeWidth={2}
          />
        </Pressable>
      </View>

      {/* Modal / Bottom Sheet de Filtro */}
      <Modal
        visible={filterModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <View style={tabStyles.modalOverlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setFilterModalVisible(false)}
            accessibilityLabel={t('profile.filter_albums_close_label')}
          />
          <View
            style={[
              tabStyles.bottomSheet,
              {
                backgroundColor: theme.dark ? '#161616' : '#FFFFFF',
                borderColor: theme.dark ? '#282828' : '#E5E0D5',
                paddingBottom: Math.max(insets.bottom, 16) + 12,
              },
            ]}
          >
            {/* Tirador */}
            <View
              style={[
                tabStyles.dragHandle,
                { backgroundColor: theme.dark ? '#3A3A3A' : '#D0C9BD' },
              ]}
            />

            {/* Cabecera del Bottom Sheet */}
            <View style={tabStyles.sheetHeader}>
              <Text style={[tabStyles.sheetTitle, { color: theme.colors.foreground }]}>
                {t('profile.filter_albums_title')}
              </Text>
              <Pressable
                onPress={() => setFilterModalVisible(false)}
                hitSlop={8}
                style={[
                  tabStyles.closeButton,
                  { backgroundColor: theme.dark ? '#242424' : '#EFEAE1' },
                ]}
                accessibilityRole="button"
                accessibilityLabel={t('common.close')}
              >
                <X size={16} color={theme.colors.foregroundMuted} />
              </Pressable>
            </View>

            {/* Opciones */}
            <View style={tabStyles.optionsContainer}>
              {filterOptions.map((option) => {
                const isSelected = option.key === albumFilter;
                return (
                  <Pressable
                    key={option.key}
                    onPress={() => {
                      onChangeFilter(option.key);
                      setFilterModalVisible(false);
                    }}
                    style={({ pressed }) => [
                      tabStyles.optionRow,
                      {
                        backgroundColor: isSelected
                          ? (theme.dark ? 'rgba(212,175,55,0.08)' : 'rgba(184,134,11,0.08)')
                          : pressed
                          ? (theme.dark ? '#202020' : '#F5F0E6')
                          : 'transparent',
                        borderColor: isSelected
                          ? (theme.dark ? 'rgba(212,175,55,0.35)' : 'rgba(184,134,11,0.35)')
                          : 'transparent',
                      },
                    ]}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                  >
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text
                        style={[
                          tabStyles.optionLabel,
                          {
                            color: isSelected ? theme.colors.primary : theme.colors.foreground,
                            fontFamily: isSelected ? fontFamily.bold : fontFamily.medium,
                          },
                        ]}
                      >
                        {option.label}
                      </Text>
                      <Text
                        style={[
                          tabStyles.optionDescription,
                          { color: theme.colors.foregroundMuted },
                        ]}
                      >
                        {option.description}
                      </Text>
                    </View>
                    {isSelected ? (
                      <View
                        style={[
                          tabStyles.checkCircle,
                          { backgroundColor: theme.colors.primary },
                        ]}
                      >
                        <Check size={14} color={theme.colors.primaryForeground} strokeWidth={2.5} />
                      </View>
                    ) : (
                      <View
                        style={[
                          tabStyles.unselectedCircle,
                          { borderColor: theme.dark ? '#333' : '#D5CFC3' },
                        ]}
                      />
                    )}
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>

      {albumsLoading ? (
        albumViewMode === 'gallery' ? (
          <View style={styles.albumGrid}>
            <AlbumCardSkeleton />
            <AlbumCardSkeleton />
            <AlbumCardSkeleton />
            <AlbumCardSkeleton />
          </View>
        ) : (
          <ActivityIndicator style={{ marginTop: 24 }} color={gold[400]} />
        )
      ) : filteredAlbums.length === 0 ? (
        <Text style={styles.empty}>
          {albumFilter === 'all'
            ? t('profile.albums_empty_title')
            : t('profile.albums_filter_empty')}
        </Text>
      ) : albumViewMode === 'gallery' ? (
        <View style={styles.albumGrid}>
          {filteredAlbums.map((item, idx) => (
            <AlbumCard
              key={item.id}
              title={item.title}
              totalTasks={item.total_tasks ?? 0}
              completedTasks={item.completed_tasks ?? 0}
              coverUri={item.cover_path}
              isShared={item.is_shared}
              isSaved={isAlbumSaved ? isAlbumSaved(item.id) : undefined}
              onToggleSave={
                hasUser && onToggleSaveAlbum
                  ? () => onToggleSaveAlbum(item.id, isAlbumSaved ? isAlbumSaved(item.id) : false)
                  : undefined
              }
              isFavorite={isAlbumFavorite ? isAlbumFavorite(item.id) : undefined}
              onToggleFavorite={
                hasUser && onToggleFavoriteAlbum
                  ? () => onToggleFavoriteAlbum(item.id, isAlbumFavorite ? isAlbumFavorite(item.id) : false)
                  : undefined
              }
              priority={item.priority}
              isClosed={item.is_closed}
              colorIndex={idx}
              onPress={() => router.push(`/album/${item.id}` as any)}
            />
          ))}
        </View>
      ) : albumViewMode === 'compact' ? (
        <View style={{ gap: 6, marginTop: 4, marginBottom: 20 }}>
          {filteredAlbums.map((item) => (
            <AlbumCompactItemRow
              key={item.id}
              item={item}
              isSaved={isAlbumSaved ? isAlbumSaved(item.id) : undefined}
              onToggleSave={
                hasUser && onToggleSaveAlbum
                  ? () => onToggleSaveAlbum(item.id, isAlbumSaved ? isAlbumSaved(item.id) : false)
                  : undefined
              }
              isFav={isAlbumFavorite ? isAlbumFavorite(item.id) : false}
              onPress={() => router.push(`/album/${item.id}` as any)}
            />
          ))}
        </View>
      ) : (
        <View style={{ marginTop: 4, marginBottom: 20 }}>
          {filteredAlbums.map((item, idx) => (
            <AlbumListItemRow
              key={item.id}
              item={item}
              index={idx}
              isSaved={isAlbumSaved ? isAlbumSaved(item.id) : undefined}
              onToggleSave={
                hasUser && onToggleSaveAlbum
                  ? () => onToggleSaveAlbum(item.id, isAlbumSaved ? isAlbumSaved(item.id) : false)
                  : undefined
              }
              isFav={isAlbumFavorite ? isAlbumFavorite(item.id) : false}
              onPress={() => router.push(`/album/${item.id}` as any)}
              onToggleFavorite={
                hasUser && onToggleFavoriteAlbum
                  ? () => onToggleFavoriteAlbum(item.id, isAlbumFavorite ? isAlbumFavorite(item.id) : false)
                  : undefined
              }
            />
          ))}
        </View>
      )}
    </>
  );
}

const tabStyles = themedStyleSheet({
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterButtonText: {
    fontFamily: fontFamily.medium,
    fontSize: 13,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.65)',
    ...Platform.select({
      web: {
        alignItems: 'center',
      },
    }),
  },
  bottomSheet: {
    width: '100%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 10,
    ...Platform.select({
      web: {
        maxWidth: 620,
        alignSelf: 'center',
        borderLeftWidth: 1,
        borderRightWidth: 1,
      },
    }),
  },
  dragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 14,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sheetTitle: {
    fontFamily: fontFamily.serifBold,
    fontSize: 18,
    letterSpacing: -0.2,
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionsContainer: {
    gap: 8,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  optionLabel: {
    fontSize: 15,
  },
  optionDescription: {
    fontFamily: fontFamily.regular,
    fontSize: 12,
  },
  checkCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  unselectedCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    marginLeft: 12,
  },
});
