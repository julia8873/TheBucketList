import React, { useState } from 'react';
import { View, Text, Pressable, TextInput } from 'react-native';
import { Bell, Search, Users, X, Map, ChevronDown, SlidersHorizontal, Check, Sparkles } from 'lucide-react-native';
import { useTranslation } from '@bucketlist/shared';
import { PageTitle, useTheme, gold, fontFamily } from '@bucketlist/ui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { TaskViewMode } from '../../../components/ViewModeSelector';
import { ViewModeSelector } from '../../../components/ViewModeSelector';
import { TagSheetShell } from '../../../components/TagSheetShell';
import { styles } from '../styles/feed.styles';

export type ContentFilter = 'todo' | 'tareas' | 'albumes' | 'colecciones';

interface FeedHeaderProps {
  homeTab: 'friends' | 'explore';
  onChangeHomeTab: (tab: 'friends' | 'explore') => void;
  unreadCount: number;
  requestCount: number;
  onOpenNotifications: () => void;
  onOpenFriends: (tab?: 'requests') => void;
  onOpenMap?: () => void;
  exploreSearch: string;
  onChangeExploreSearch: (text: string) => void;
  friendsSearch?: string;
  onChangeFriendsSearch?: (text: string) => void;
  viewMode: TaskViewMode;
  onChangeViewMode: (mode: TaskViewMode) => void;
  contentFilter: ContentFilter;
  onChangeContentFilter: (f: ContentFilter) => void;
}

export function FeedHeader({
  homeTab,
  onChangeHomeTab,
  unreadCount,
  requestCount,
  onOpenNotifications,
  onOpenFriends,
  onOpenMap,
  exploreSearch,
  onChangeExploreSearch,
  friendsSearch = '',
  onChangeFriendsSearch,
  viewMode,
  onChangeViewMode,
  contentFilter,
  onChangeContentFilter,
}: FeedHeaderProps) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [filterSheetVisible, setFilterSheetVisible] = useState(false);

  const isSearching =
    (homeTab === 'explore' && exploreSearch.trim().length >= 2) ||
    (homeTab === 'friends' && friendsSearch.trim().length >= 2);

  return (
    <View style={styles.headerWrapper}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <PageTitle
          gold={homeTab === 'friends' ? (t('feed.friends_moments_gold', { defaultValue: 'Momentos' })) : (t('feed.explore_ideas_gold', { defaultValue: 'Explorar' }))}
          rest={homeTab === 'friends' ? '' : (t('feed.explore_ideas_rest', { defaultValue: 'ideas' }))}
        />
        <View style={styles.topActions}>
          <Pressable
            onPress={onOpenNotifications}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={t('notifications.title')}
          >
            <Bell size={24} color={theme.colors.foreground} strokeWidth={1.8} />
            {unreadCount > 0 ? (
              <View style={[styles.bellDot, { borderColor: theme.colors.background }]} />
            ) : null}
          </Pressable>
          <Pressable
            onPress={() => onOpenFriends()}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={t('feed.search_people')}
          >
            <Users size={24} color={theme.colors.foreground} strokeWidth={1.8} />
          </Pressable>
        </View>
      </View>

      {/* Segmented Control: Amigos | Explorar */}
      <View
        style={[
          styles.toggleContainer,
          {
            backgroundColor: theme.dark ? '#161616' : '#EDE8DE',
            borderColor: theme.colors.border,
          },
        ]}
      >
        <Pressable
          style={[
            styles.toggleBtn,
            homeTab === 'friends' && { backgroundColor: theme.colors.primary },
          ]}
          onPress={() => onChangeHomeTab('friends')}
          accessibilityRole="tab"
          accessibilityState={{ selected: homeTab === 'friends' }}
        >
          <Text
            style={[
              styles.toggleText,
              {
                color: homeTab === 'friends' ? theme.colors.primaryForeground : theme.colors.foregroundMuted,
                fontWeight: 'bold',
                fontFamily: fontFamily.bold,
              },
            ]}
          >
            {t('feed.tab_friends')}
          </Text>
        </Pressable>
        <Pressable
          style={[
            styles.toggleBtn,
            homeTab === 'explore' && { backgroundColor: theme.colors.primary },
          ]}
          onPress={() => onChangeHomeTab('explore')}
          accessibilityRole="tab"
          accessibilityState={{ selected: homeTab === 'explore' }}
        >
          <Text
            style={[
              styles.toggleText,
              {
                color: homeTab === 'explore' ? theme.colors.primaryForeground : theme.colors.foregroundMuted,
                fontWeight: 'bold',
                fontFamily: fontFamily.bold,
              },
            ]}
          >
            {t('feed.tab_explore')}
          </Text>
        </Pressable>
      </View>

      {/* Search Bar según pestaña */}
      {homeTab === 'friends' ? (
        <View
          style={[
            styles.exploreSearchContainer,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
            },
          ]}
        >
          <Search size={18} color={theme.colors.foregroundMuted} strokeWidth={1.8} />
          <TextInput
            placeholder={t('feed.search_placeholder')}
            placeholderTextColor={theme.colors.foregroundMuted}
            value={friendsSearch}
            onChangeText={onChangeFriendsSearch}
            style={[styles.exploreSearchInput, { color: theme.colors.foreground }]}
            returnKeyType="search"
          />
          {friendsSearch.length > 0 ? (
            <Pressable onPress={() => onChangeFriendsSearch?.('')} hitSlop={8}>
              <X size={18} color={theme.colors.foregroundMuted} strokeWidth={2} />
            </Pressable>
          ) : requestCount > 0 ? (
            <Pressable onPress={() => onOpenFriends('requests')} hitSlop={8} accessibilityRole="button">
              <Text style={[styles.requests, { color: theme.colors.primary }]}>
                {requestCount} {requestCount === 1 ? t('feed.friend_request_single') : t('feed.friend_request_plural')}
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : (
        <View
          style={[
            styles.exploreSearchContainer,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
            },
          ]}
        >
          <Search size={18} color={theme.colors.foregroundMuted} strokeWidth={1.8} />
          <TextInput
            placeholder={t('feed.search_placeholder')}
            placeholderTextColor={theme.colors.foregroundMuted}
            value={exploreSearch}
            onChangeText={onChangeExploreSearch}
            style={[styles.exploreSearchInput, { color: theme.colors.foreground }]}
            returnKeyType="search"
          />
          {exploreSearch.length > 0 && (
            <Pressable onPress={() => onChangeExploreSearch('')} hitSlop={8}>
              <X size={18} color={theme.colors.foregroundMuted} strokeWidth={2} />
            </Pressable>
          )}
        </View>
      )}      {!isSearching && (
        <View style={styles.feedControlsRow}>
          {/* Toggle desplegable a la izquierda (como los de mi lista) */}
          <Pressable
            onPress={() => setFilterSheetVisible(true)}
            accessibilityRole="button"
            accessibilityLabel={t('feed.filter_sheet_title')}
            style={[
              styles.filterDropdownBtn,
              {
                backgroundColor: contentFilter !== 'todo'
                  ? (theme.dark ? 'rgba(212, 175, 55, 0.12)' : 'rgba(212, 175, 55, 0.18)')
                  : theme.colors.surface,
                borderColor: contentFilter !== 'todo' ? gold[400] : theme.colors.border,
              },
            ]}
          >
            <SlidersHorizontal
              size={13}
              color={contentFilter !== 'todo' ? gold[400] : theme.colors.foregroundMuted}
              strokeWidth={2}
            />
            <Text
              numberOfLines={1}
              ellipsizeMode="tail"
              style={[
                styles.filterDropdownText,
                { color: contentFilter !== 'todo' ? gold[400] : theme.colors.foreground },
              ]}
            >
              {contentFilter === 'todo'
                ? t('feed.filter_all')
                : contentFilter === 'tareas'
                ? t('feed.filter_tasks')
                : contentFilter === 'albumes'
                ? t('feed.filter_albums')
                : t('feed.filter_collections')}
            </Text>
            <ChevronDown
              size={12}
              color={contentFilter !== 'todo' ? gold[400] : theme.colors.foregroundMuted}
              strokeWidth={2}
            />
          </Pressable>

          {/* Mapa */}
          {onOpenMap ? (
            <Pressable
              onPress={onOpenMap}
              style={[
                styles.mapTriggerBtn,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Ver en mapa"
            >
              <Map size={13} color={gold[400]} />
              <Text
                numberOfLines={1}
                ellipsizeMode="tail"
                style={[styles.mapTriggerBtnText, { color: theme.colors.foreground }]}
              >
                {t('feed.map_btn')}
              </Text>
            </Pressable>
          ) : null}

          {/* Selector de vista */}
          <ViewModeSelector mode={viewMode} onChange={onChangeViewMode} style={{ flexShrink: 0 }} />
        </View>
      )}
      {!isSearching && homeTab === 'explore' ? (
        <View style={styles.collectionsRow}>
            <Pressable
              onPress={() => onChangeContentFilter(contentFilter === 'colecciones' ? 'todo' : 'colecciones')}
              style={({ pressed }) => [
                styles.collectionsTriggerBtn,
                styles.collectionsTriggerBtnFull,
                {
                  backgroundColor: contentFilter === 'colecciones'
                    ? (theme.dark ? 'rgba(212, 175, 55, 0.16)' : 'rgba(212, 175, 55, 0.22)')
                    : theme.colors.surface,
                  borderColor: contentFilter === 'colecciones' ? gold[400] : theme.colors.border,
                },
                pressed && { opacity: 0.8 },
              ]}
              accessibilityRole="button"
              accessibilityLabel={t('feed.filter_collections')}
              accessibilityState={{ selected: contentFilter === 'colecciones' }}
            >
              <Sparkles size={13} color={gold[400]} />
              <Text
                style={[
                  styles.collectionsTriggerBtnText,
                  { color: contentFilter === 'colecciones' ? gold[400] : theme.colors.foreground },
                ]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {t('feed.filter_collections')}
              </Text>
            </Pressable>
        </View>
      ) : null}

      {/* Bottom Sheet de selección de filtro de contenido (estilo mi lista) */}
      <TagSheetShell visible={filterSheetVisible} onClose={() => setFilterSheetVisible(false)}>
        <View style={[styles.sheetContent, { paddingBottom: Math.max(insets.bottom, 24) }]}>
          <View style={styles.sheetHeader}>
            <Text style={[styles.sheetTitle, { color: theme.colors.foreground }]}>
              {t('feed.filter_sheet_title')}
            </Text>
            <Pressable
              onPress={() => setFilterSheetVisible(false)}
              hitSlop={8}
              style={[styles.sheetCloseBtn, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
              accessibilityRole="button"
              accessibilityLabel="Cerrar filtro"
            >
              <X size={16} color={theme.colors.foregroundMuted} />
            </Pressable>
          </View>

          <View style={styles.sheetOptionList}>
            {([
              { key: 'todo', label: t('feed.filter_all'), desc: t('feed.filter_all_desc') },
              { key: 'tareas', label: t('feed.filter_tasks'), desc: t('feed.filter_tasks_desc') },
              { key: 'albumes', label: t('feed.filter_albums'), desc: t('feed.filter_albums_desc') },
              ...(homeTab === 'explore'
                ? [{ key: 'colecciones' as ContentFilter, label: t('feed.filter_collections'), desc: t('feed.filter_collections_desc') }]
                : []),
            ] as Array<{ key: ContentFilter; label: string; desc: string }>).map((opt) => {
              const isSelected = contentFilter === opt.key;
              return (
                <Pressable
                  key={opt.key}
                  onPress={() => {
                    onChangeContentFilter(opt.key);
                    setFilterSheetVisible(false);
                  }}
                  style={({ pressed }) => [
                    styles.sheetOptionRow,
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
                        styles.sheetOptionTitle,
                        { color: isSelected ? gold[400] : theme.colors.foreground },
                      ]}
                    >
                      {opt.label}
                    </Text>
                    <Text style={[styles.sheetOptionDesc, { color: theme.colors.foregroundMuted }]}>
                      {opt.desc}
                    </Text>
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
