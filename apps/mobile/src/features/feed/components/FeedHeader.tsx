import React from 'react';
import { View, Text, Pressable, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { Bell, Search, Users, X } from 'lucide-react-native';
import { PageTitle } from '@bucketlist/ui';
import { ViewModeSelector, TaskViewMode } from '../../../components/ViewModeSelector';
import { styles } from '../styles/feed.styles';

interface FeedHeaderProps {
  homeTab: 'friends' | 'explore';
  onChangeHomeTab: (tab: 'friends' | 'explore') => void;
  unreadCount: number;
  requestCount: number;
  onOpenNotifications: () => void;
  onOpenFriends: (tab?: 'requests') => void;
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
  exploreSearch,
  onChangeExploreSearch,
  viewMode,
  onChangeViewMode,
}: FeedHeaderProps) {
  return (
    <View style={styles.headerWrapper}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <PageTitle
          gold={homeTab === 'friends' ? 'Momentos' : 'Explorar'}
          rest={homeTab === 'friends' ? 'de amigos' : 'ideas'}
        />
        <View style={styles.topActions}>
          <Pressable
            onPress={onOpenNotifications}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Notificaciones"
          >
            <Bell size={24} color="#F2EFE8" strokeWidth={1.8} />
            {unreadCount > 0 ? <View style={styles.bellDot} /> : null}
          </Pressable>
          <Pressable
            onPress={() => onOpenFriends()}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Buscar personas"
          >
            <Users size={24} color="#F2EFE8" strokeWidth={1.8} />
          </Pressable>
        </View>
      </View>

      {/* Segmented Control: Amigos | Explorar */}
      <View style={styles.toggleContainer}>
        <Pressable
          style={[styles.toggleBtn, homeTab === 'friends' && styles.toggleBtnActive]}
          onPress={() => onChangeHomeTab('friends')}
          accessibilityRole="tab"
          accessibilityState={{ selected: homeTab === 'friends' }}
        >
          <Text style={[styles.toggleText, homeTab === 'friends' && styles.toggleTextActive]}>
            Amigos
          </Text>
        </Pressable>
        <Pressable
          style={[styles.toggleBtn, homeTab === 'explore' && styles.toggleBtnActive]}
          onPress={() => onChangeHomeTab('explore')}
          accessibilityRole="tab"
          accessibilityState={{ selected: homeTab === 'explore' }}
        >
          <Text style={[styles.toggleText, homeTab === 'explore' && styles.toggleTextActive]}>
            Explorar
          </Text>
        </Pressable>
      </View>

      {/* Search Bar según pestaña */}
      {homeTab === 'friends' ? (
        <View style={styles.searchBar}>
          <Pressable
            onPress={() => onOpenFriends()}
            style={styles.searchTouch}
            accessibilityRole="search"
            accessibilityLabel="Buscar personas"
          >
            <Search size={18} color="#9A9A9A" strokeWidth={1.8} />
            <Text style={styles.searchPlaceholder}>Buscar personas</Text>
          </Pressable>
          {requestCount > 0 ? (
            <Pressable onPress={() => onOpenFriends('requests')} hitSlop={8} accessibilityRole="button">
              <Text style={styles.requests}>
                {requestCount} {requestCount === 1 ? 'solicitud' : 'solicitudes'}
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : (
        <View style={styles.exploreSearchContainer}>
          <Search size={18} color="#9A9A9A" strokeWidth={1.8} />
          <TextInput
            placeholder="Buscar personas e ideas..."
            placeholderTextColor="#8F8F8F"
            value={exploreSearch}
            onChangeText={onChangeExploreSearch}
            style={styles.exploreSearchInput}
            returnKeyType="search"
          />
          {exploreSearch.length > 0 && (
            <Pressable onPress={() => onChangeExploreSearch('')} hitSlop={8}>
              <X size={18} color="#8F8F8F" strokeWidth={2} />
            </Pressable>
          )}
        </View>
      )}

      {!(homeTab === 'explore' && exploreSearch.length >= 2) && (
        <View style={styles.feedControlsRow}>
          <Text style={styles.feedSectionLabel}>
            {homeTab === 'friends' ? 'MOMENTOS DE AMIGOS' : 'EXPLORAR TAREAS'}
          </Text>
          <ViewModeSelector mode={viewMode} onChange={onChangeViewMode} />
        </View>
      )}
    </View>
  );
}
