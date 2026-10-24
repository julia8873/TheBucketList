import React from 'react';
import { View, Text, Pressable, TextInput } from 'react-native';
import { Bell, Search, Users, X, Map } from 'lucide-react-native';
import { useTranslation } from '@bucketlist/shared';
import { PageTitle, useTheme, gold, fontFamily } from '@bucketlist/ui';
import { ViewModeSelector, TaskViewMode } from '../../../components/ViewModeSelector';
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

  const isSearching =
    (homeTab === 'explore' && exploreSearch.trim().length >= 2) ||
    (homeTab === 'friends' && friendsSearch.trim().length >= 2);

  return (
    <View style={styles.headerWrapper}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <PageTitle
          gold={homeTab === 'friends' ? (t('feed.friends_moments_gold', { defaultValue: 'Momentos' }) as string) : (t('feed.explore_ideas_gold', { defaultValue: 'Explorar' }) as string)}
          rest={homeTab === 'friends' ? (t('feed.friends_moments_rest', { defaultValue: 'de amigos' }) as string) : (t('feed.explore_ideas_rest', { defaultValue: 'ideas' }) as string)}
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
      )}

      {!isSearching && (
        <View style={styles.feedControlsRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
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
                <Map size={14} color={gold[400]} />
                <Text style={[styles.mapTriggerBtnText, { color: theme.colors.foreground }]}>{t('feed.map_btn')}</Text>
              </Pressable>
            ) : null}
            <ViewModeSelector mode={viewMode} onChange={onChangeViewMode} />
          </View>
        </View>
      )}

      {/* Content filter: Todo / Tareas / Álbumes / Colecciones (Colecciones solo en Explorar) */}
      {!isSearching && (
        <View style={styles.contentFilterRow}>
          {((homeTab === 'explore'
            ? ['todo', 'tareas', 'albumes', 'colecciones']
            : ['todo', 'tareas', 'albumes']) as ContentFilter[]).map((f) => (
            <Pressable
              key={f}
              onPress={() => onChangeContentFilter(f)}
              style={[
                styles.contentFilterPill,
                contentFilter === f && {
                  backgroundColor: theme.dark ? 'rgba(212,177,58,0.18)' : 'rgba(212,177,58,0.22)',
                  borderColor: gold[400],
                },
                contentFilter !== f && {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.contentFilterText,
                  { color: contentFilter === f ? gold[400] : theme.colors.foregroundMuted },
                ]}
              >
                {f === 'todo'
                  ? t('feed.filter_all')
                  : f === 'tareas'
                  ? t('feed.filter_tasks')
                  : f === 'albumes'
                  ? t('feed.filter_albums')
                  : t('feed.filter_collections')}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}
