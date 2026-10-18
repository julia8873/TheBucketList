import React, { useMemo, useState, useEffect } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { LayoutGrid, List, Moon, Settings, Sun, Users } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Avatar, fontFamily, useTheme, PageTitle, Skeleton } from '@bucketlist/ui';
import { supabase } from '../../src/services/supabase';
import { useAuthStore } from '../../src/stores/auth.store';
import { useThemeStore } from '../../src/stores/theme.store';
import { useAlbums } from '../../src/hooks/useAlbums';
import { useIncomingRequestCount } from '../../src/hooks/useFriends';
import { BucketCover } from '../../src/components/BucketCover';
import { ProfileSkeleton } from '../../src/components/TaskSkeletons';
import { ViewModeSelector, TaskViewMode } from '../../src/components/ViewModeSelector';
import { resolveTaskImage } from '../../src/utils/taskImage';
import { initialsOf, displayNameOf } from '../../src/utils/initials';

import { useBuckets } from '../../src/hooks/useBuckets';

const RECENT_LIMIT = 4;

export default function CurrentUserProfileScreen() {
  const { theme } = useTheme();
  const { toggleTheme } = useThemeStore();
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { user } = useAuthStore();

  const profileQuery = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', user!.id).single();
      if (error) throw error;
      return data as any;
    },
    enabled: !!user?.id,
  });

  const bucketsQuery = useBuckets(user?.id);

  const { width: winWidth } = useWindowDimensions();
  const [gridWidth, setGridWidth] = useState(0);
  const containerWidth = gridWidth > 0 ? gridWidth : winWidth - 40;
  const tileWidth = Math.floor((containerWidth - 10) / 2);
  const tileHeight = Math.round(tileWidth * 1.3);

  const [viewMode, setViewModeState] = useState<TaskViewMode>('gallery');
  const setViewMode = (mode: TaskViewMode) => {
    setViewModeState(mode);
    void AsyncStorage.setItem('@profile_view_mode', mode).catch(() => undefined);
  };

  useEffect(() => {
    AsyncStorage.getItem('@profile_view_mode')
      .then((saved) => {
        if (saved === 'gallery' || saved === 'list' || saved === 'compact') {
          setViewModeState(saved as TaskViewMode);
        }
      })
      .catch(() => undefined);
  }, []);
  const albums = useAlbums(user?.id);
  const requests = useIncomingRequestCount(user?.id);

  const profile = profileQuery.data;
  const buckets = bucketsQuery.data ?? [];

  const completed = useMemo(
    () => buckets.filter((b) => b.status === 'completed'),
    [buckets],
  );
  const publicBuckets = useMemo(
    () => buckets.filter((b) => b.visibility === 'public'),
    [buckets],
  );
  const recent = useMemo(
    () =>
      [...completed]
        .sort((a, b) => new Date(b.completed_at ?? b.created_at).getTime() - new Date(a.completed_at ?? a.created_at).getTime())
        .slice(0, RECENT_LIMIT),
    [completed],
  );

  const [manualRefreshing, setManualRefreshing] = useState(false);
  const onRefresh = async () => {
    setManualRefreshing(true);
    try {
      await Promise.all([
        profileQuery.refetch(),
        bucketsQuery.refetch(),
        albums.refetch(),
        requests.refetch(),
      ]);
    } finally {
      setManualRefreshing(false);
    }
  };

  const formatDate = (iso?: string | null) =>
    iso ? new Date(iso).toLocaleDateString(i18n.language === 'en' ? 'en-GB' : 'es-ES', { day: 'numeric', month: 'short', year: 'numeric' }) : '';

  const requestCount = requests.data ?? 0;
  const name = displayNameOf(profile);

  return (
    <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Cabecera */}
      <View style={styles.header}>
        <PageTitle gold={t('profile.title_gold', { defaultValue: 'Mi' })} rest={t('profile.title_rest', { defaultValue: 'perfil' })} />
        <Pressable
          onPress={() => router.push('/(modals)/settings' as any)}
          accessibilityRole="button"
          accessibilityLabel={t('settings.title')}
          style={[styles.roundBtn, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
        >
          <Settings size={22} color={theme.colors.foreground} />
        </Pressable>
      </View>

      {profileQuery.isLoading ? (
        <ProfileSkeleton />
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={manualRefreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
        >
          {/* Identidad */}
          <View style={styles.identity}>
          <Avatar uri={profile?.avatar_url} initials={initialsOf(profile)} size="xl" goldRing />
          <View style={{ flex: 1, gap: 3 }}>
            <Text style={[styles.name, { color: theme.colors.foreground }]} numberOfLines={2} ellipsizeMode="tail">{name}</Text>
            <Text style={[styles.handle, { color: theme.colors.foregroundMuted }]} numberOfLines={1} ellipsizeMode="tail">@{profile?.username}</Text>
          </View>
        </View>

        {profile?.bio ? (
          <Text style={[styles.bio, { color: theme.colors.foreground }]}>{profile.bio}</Text>
        ) : null}

        {/* Acciones */}
        <View style={styles.actions}>
          <Pressable
            onPress={() => router.push('/(modals)/edit-profile' as any)}
            accessibilityRole="button"
            style={[styles.btn, { borderColor: theme.colors.primary, borderWidth: 1 }]}
          >
            <Text style={[styles.btnText, { color: theme.colors.primary }]}>{t('profile.edit')}</Text>
          </Pressable>
          <Pressable
            onPress={() => router.push((requestCount > 0 ? '/friends?tab=requests' : '/friends') as any)}
            accessibilityRole="button"
            style={[styles.btn, { backgroundColor: theme.colors.primary, flexDirection: 'row', gap: 8 }]}
          >
            <Users size={18} color={theme.colors.primaryForeground} />
            <Text style={[styles.btnText, { color: theme.colors.primaryForeground }]}>
              {requestCount > 0 ? `${t('profile.friends')} · ${requestCount}` : t('profile.friends')}
            </Text>
          </Pressable>
        </View>

        {/* Estadísticas */}
        <View style={[styles.stats, { borderColor: theme.colors.border }]}>
          <Stat
            value={completed.length}
            label={t('profile.completed_items')}
            onPress={() => router.push('/(tabs)/my-list?tab=list&filter=completed&from=profile' as any)}
          />
          <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
          <Stat
            value={publicBuckets.length}
            label="Públicas"
            onPress={() => router.push('/(tabs)/my-list?tab=list&filter=public&from=profile' as any)}
          />
          <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
          <Stat
            value={albums.data?.length ?? 0}
            label={t('profile.albums')}
            onPress={() => router.push('/(tabs)/my-list?tab=albums&from=profile' as any)}
          />
        </View>

        {/* Últimas completadas */}
        <Text style={[styles.sectionTitle, { color: theme.colors.foreground, marginTop: 24 }]}>
          <Text style={{ color: theme.colors.primary }}>{t('profile.recent_a')}</Text> {t('profile.recent_b')}
        </Text>

        <View style={styles.toolbar}>
          {completed.length > 0 ? (
            <Pressable
              onPress={() => router.push('/(tabs)/my-list?tab=list&filter=completed&from=profile' as any)}
              accessibilityRole="button"
              hitSlop={8}
            >
              <Text style={[styles.seeAll, { color: theme.colors.primary }]}>{t('profile.see_all')}</Text>
            </Pressable>
          ) : (
            <View />
          )}
          <ViewModeSelector mode={viewMode} onChange={setViewMode} />
        </View>

        {bucketsQuery.isLoading ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 12 }}>
            <Skeleton width={tileWidth} height={tileHeight} borderRadius={16} />
            <Skeleton width={tileWidth} height={tileHeight} borderRadius={16} />
          </View>
        ) : recent.length === 0 ? (
          <View style={[styles.empty, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.emptyText, { color: theme.colors.foregroundMuted }]}>{t('profile.empty_completed')}</Text>
          </View>
        ) : viewMode === 'gallery' ? (
          <View style={styles.grid} onLayout={(e) => setGridWidth(e.nativeEvent.layout.width)}>
            {recent.map((item) => {
              return (
                <Pressable
                  key={item.id}
                  onPress={() => router.push(`/bucket/${item.id}` as any)}
                  accessibilityRole="button"
                  accessibilityLabel={item.title}
                  style={[styles.tile, { width: tileWidth, height: tileHeight }]}
                >
                  <BucketCover
                    value={resolveTaskImage(item)}
                    title={item.title}
                    seed={item.id}
                    style={{ width: tileWidth, height: tileHeight }}
                  />
                  <View style={styles.caption}>
                    <Text style={styles.captionTitle} numberOfLines={1}>{item.title}</Text>
                    <Text style={styles.captionSub} numberOfLines={1}>
                      {formatDate(item.completed_at ?? item.created_at)}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        ) : viewMode === 'compact' ? (
          <View style={{ gap: 8 }}>
            {recent.map((item) => {
              return (
                <Pressable
                  key={item.id}
                  onPress={() => router.push(`/bucket/${item.id}` as any)}
                  accessibilityRole="button"
                  style={[styles.compactRow, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
                >
                  <View style={styles.compactThumb}>
                    <BucketCover
                      value={resolveTaskImage(item, { preferThumb: true })}
                      title={item.title}
                      seed={item.id}
                      style={StyleSheet.absoluteFill}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.compactTitle, { color: theme.colors.foreground }]} numberOfLines={1}>
                      {item.title}
                    </Text>
                    <Text style={[styles.compactSub, { color: theme.colors.foregroundMuted }]} numberOfLines={1}>
                      {[item.location_text, formatDate(item.completed_at)].filter(Boolean).join(' · ')}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        ) : (
          <View style={{ gap: 10 }}>
            {recent.map((item) => {
              return (
                <Pressable
                  key={item.id}
                  onPress={() => router.push(`/bucket/${item.id}` as any)}
                  accessibilityRole="button"
                  style={[styles.listRow, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
                >
                  <View style={styles.listThumb}>
                    <BucketCover
                      value={resolveTaskImage(item, { preferThumb: true })}
                      title={item.title}
                      seed={item.id}
                      style={StyleSheet.absoluteFill}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.listTitle, { color: theme.colors.foreground }]} numberOfLines={2}>{item.title}</Text>
                    <Text style={[styles.listSub, { color: theme.colors.foregroundMuted }]} numberOfLines={1}>
                      {[item.location_text, formatDate(item.completed_at)].filter(Boolean).join(' · ')}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>
      )}
    </SafeAreaView>
  );
}

function Stat({ value, label, onPress }: { value: number; label: string; onPress?: () => void }) {
  const { theme } = useTheme();
  const content = (
    <>
      <Text style={[styles.statValue, { color: theme.colors.foreground }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: theme.colors.foregroundMuted }]}>{label}</Text>
    </>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${value}`}
        style={({ pressed }) => [styles.stat, pressed && { opacity: 0.65 }]}
      >
        {content}
      </Pressable>
    );
  }

  return (
    <View style={styles.stat}>
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: 20, paddingBottom: 40 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 12, paddingHorizontal: 20 },
  title: { fontFamily: fontFamily.serifBold, fontSize: 32 },
  roundBtn: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  identity: { flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 20 },
  name: { fontFamily: fontFamily.serifBold, fontSize: 19, lineHeight: 24 },
  handle: { fontFamily: fontFamily.regular, fontSize: 13, marginTop: 2 },
  bio: { fontFamily: fontFamily.regular, fontSize: 14, lineHeight: 20, marginTop: 14 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 18 },
  btn: { flex: 1, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  btnText: { fontFamily: fontFamily.semibold, fontSize: 15 },
  stats: { flexDirection: 'row', alignItems: 'center', marginTop: 22, paddingVertical: 14, borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { fontFamily: fontFamily.serifBold, fontSize: 24 },
  statLabel: { fontFamily: fontFamily.regular, fontSize: 13, marginTop: 2 },
  divider: { width: 1, height: 38 },
  sectionTitle: { fontFamily: fontFamily.serifBold, fontSize: 16, letterSpacing: 0.6, textTransform: 'uppercase' },
  toolbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, marginBottom: 12 },
  seeAll: { fontFamily: fontFamily.semibold, fontSize: 14, paddingVertical: 8 },
  viewToggle: { flexDirection: 'row', padding: 3, borderWidth: 1, borderRadius: 20, gap: 2 },
  toggleBtn: { width: 38, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tile: { borderRadius: 12, overflow: 'hidden', backgroundColor: '#2A2A2A' },
  tileImage: { width: '100%', height: '100%' },
  caption: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', padding: 6 },
  captionTitle: { fontFamily: fontFamily.medium, fontSize: 12, color: '#fff' },
  captionSub: { fontFamily: fontFamily.regular, fontSize: 12, color: 'rgba(255,255,255,0.7)' },
  listRow: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 12, borderWidth: 1, borderRadius: 20 },
  listThumb: { width: 56, height: 56, borderRadius: 12, overflow: 'hidden', backgroundColor: '#2A2A2A' },
  listTitle: { fontFamily: fontFamily.serifBold, fontSize: 17, lineHeight: 21 },
  listSub: { fontFamily: fontFamily.regular, fontSize: 13, marginTop: 3 },
  compactRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8, paddingHorizontal: 12, borderWidth: 1, borderRadius: 14 },
  compactThumb: { width: 40, height: 40, borderRadius: 8, overflow: 'hidden', backgroundColor: '#2A2A2A' },
  compactTitle: { fontFamily: fontFamily.semibold, fontSize: 14 },
  compactSub: { fontFamily: fontFamily.regular, fontSize: 12, marginTop: 2 },
  empty: { borderWidth: 1, borderRadius: 20, padding: 24, alignItems: 'center' },
  emptyText: { fontFamily: fontFamily.regular, fontSize: 14, textAlign: 'center' },
});