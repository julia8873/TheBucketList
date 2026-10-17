import React from 'react';
import { View, Text, Pressable, TextInput } from 'react-native';
import { Bell, Search, Users, X, Map } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { PageTitle, useTheme, gold } from '@bucketlist/ui';
import { ViewModeSelector, TaskViewMode } from '../../../components/ViewModeSelector';
import { styles } from '../styles/feed.styles';

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
  viewMode: TaskViewMode;
  onChangeViewMode: (mode: TaskViewMode) => void;
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
  viewMode,
  onChangeViewMode,
}: FeedHeaderProps) {
  const { theme } = useTheme();
  const { t } = useTranslation();

  return (
    <View style={styles.headerWrapper}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <PageTitle
          gold={homeTab === 'friends' ? t('feed.friends_moments_gold', { defaultValue: 'Momentos' }) : t('feed.explore_ideas_gold', { defaultValue: 'Explorar' })}
          rest={homeTab === 'friends' ? t('feed.friends_moments_rest', { defaultValue: 'de amigos' }) : t('feed.explore_ideas_rest', { defaultValue: 'ideas' })}
        />
        <View style={styles.topActions}>
          <Pressable
            onPress={onOpenNotifications}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Notificaciones"
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
            accessibilityLabel="Buscar personas"
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
              { color: homeTab === 'friends' ? theme.colors.primaryForeground : theme.colors.foregroundMuted },
            ]}
          >
            Amigos
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
              { color: homeTab === 'explore' ? theme.colors.primaryForeground : theme.colors.foregroundMuted },
            ]}
          >
            Explorar
          </Text>
        </Pressable>
      </View>

      {/* Search Bar según pestaña */}
      {homeTab === 'friends' ? (
        <View
          style={[
            styles.searchBar,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
            },
          ]}
        >
          <Pressable
            onPress={() => onOpenFriends()}
            style={styles.searchTouch}
            accessibilityRole="search"
            accessibilityLabel="Buscar personas"
          >
            <Search size={18} color={theme.colors.foregroundMuted} strokeWidth={1.8} />
            <Text style={[styles.searchPlaceholder, { color: theme.colors.foregroundMuted }]}>
              Buscar personas
            </Text>
          </Pressable>
          {requestCount > 0 ? (
            <Pressable onPress={() => onOpenFriends('requests')} hitSlop={8} accessibilityRole="button">
              <Text style={[styles.requests, { color: theme.colors.primary }]}>
                {requestCount} {requestCount === 1 ? 'solicitud' : 'solicitudes'}
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
            placeholder="Buscar personas e ideas..."
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

      {!(homeTab === 'explore' && exploreSearch.length >= 2) && (
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
                <Text style={[styles.mapTriggerBtnText, { color: theme.colors.foreground }]}>Mapa</Text>
              </Pressable>
            ) : null}
            <ViewModeSelector mode={viewMode} onChange={onChangeViewMode} />
          </View>
        </View>
      )}
    </View>
  );
}
