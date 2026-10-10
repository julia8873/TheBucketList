import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { LayoutGrid, List, Settings, Users } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Avatar, fontFamily, useTheme } from '@bucketlist/ui';
import { supabase } from '../../src/services/supabase';
import { useAuthStore } from '../../src/stores/auth.store';
import { useAlbums } from '../../src/hooks/useAlbums';
import { useIncomingRequestCount } from '../../src/hooks/useFriends';
import { storageApi } from '../../src/services/api/storage';
import { BucketCover } from '../../src/components/BucketCover';
import { initialsOf, displayNameOf } from '../../src/utils/initials';

const RECENT_LIMIT = 4;

export default function CurrentUserProfileScreen() {
  const { theme } = useTheme();
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

  const bucketsQuery = useQuery({
    queryKey: ['buckets', 'profile', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('buckets')
        .select('id, title, status, cover_image, location_text, completed_at, created_at, bucket_photos(storage_path, thumb_path, created_at)')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as any[];
    },
    enabled: !!user?.id,
  });

  const { width: winWidth } = useWindowDimensions();
  const [gridWidth, setGridWidth] = useState(0);
  const containerWidth = gridWidth > 0 ? gridWidth : winWidth - 40;
  const tileWidth = Math.floor((containerWidth - 10) / 2);
  const tileHeight = Math.round(tileWidth * 1.3);

  /** Misma foto que se ve primero dentro de la tarea (la más reciente). */
  const firstPhoto = (item: any) =>
    [...(item.bucket_photos ?? [])].sort(
      (a: any, b: any) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime(),
    )[0];

  const [viewMode, setViewMode] = useState<'gallery' | 'list'>('gallery');
  const albums = useAlbums(user?.id);
  const requests = useIncomingRequestCount(user?.id);

  const profile = profileQuery.data;
  const buckets = bucketsQuery.data ?? [];

  const completed = useMemo(
    () => buckets.filter((b) => b.status === 'completed'),
    [buckets],
  );
  const recent = useMemo(
    () =>
      [...completed]
        .sort((a, b) => new Date(b.completed_at ?? b.created_at).getTime() - new Date(a.completed_at ?? a.created_at).getTime())
        .slice(0, RECENT_LIMIT),
    [completed],
  );

  const refreshing = profileQuery.isRefetching || bucketsQuery.isRefetching;
  const onRefresh = () => {
    void profileQuery.refetch();
    void bucketsQuery.refetch();
    void albums.refetch();
    void requests.refetch();
  };

  const formatDate = (iso?: string | null) =>
    iso ? new Date(iso).toLocaleDateString(i18n.language === 'en' ? 'en-GB' : 'es-ES', { day: 'numeric', month: 'short', year: 'numeric' }) : '';

  if (profileQuery.isLoading) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  const requestCount = requests.data ?? 0;
  const name = displayNameOf(profile);

  return (
    <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
      >
        {/* Cabecera */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.colors.foreground }]}>{t('nav.profile')}</Text>
          <Pressable
            onPress={() => router.push('/(modals)/settings' as any)}
            accessibilityRole="button"
            accessibilityLabel={t('settings.title')}
            style={[styles.roundBtn, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
          >
            <Settings size={22} color={theme.colors.foreground} />
          </Pressable>
        </View>

        {/* Identidad */}
        <View style={styles.identity}>
          <Avatar uri={profile?.avatar_url} initials={initialsOf(profile)} size="xl" goldRing />
          <View style={{ flex: 1 }}>
            <Text style={[styles.name, { color: theme.colors.foreground }]} numberOfLines={2}>{name}</Text>
            <Text style={[styles.handle, { color: theme.colors.foregroundMuted }]}>@{profile?.username}</Text>
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
          <Stat value={completed.length} label={t('profile.completed_items')} />
          <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
          <Stat value={buckets.length} label={t('profile.in_list')} />
          <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
          <Stat value={albums.data?.length ?? 0} label={t('profile.albums')} />
        </View>

        {/* Últimas completadas */}
        <Text style={[styles.sectionTitle, { color: theme.colors.foreground, marginTop: 24 }]}>
          <Text style={{ color: theme.colors.primary }}>{t('profile.recent_a')}</Text> {t('profile.recent_b')}
        </Text>

        <View style={styles.toolbar}>
          {completed.length > 0 ? (
            <Pressable
              onPress={() => router.push('/(tabs)/my-list?filter=completed' as any)}
              accessibilityRole="button"
              hitSlop={8}
            >
              <Text style={[styles.seeAll, { color: theme.colors.primary }]}>{t('profile.see_all')}</Text>
            </Pressable>
          ) : (
            <View />
          )}
          <View style={[styles.viewToggle, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            {([
              ['gallery', LayoutGrid, t('profile.view_gallery')],
              ['list', List, t('profile.view_list')],
            ] as const).map(([mode, IconCmp, label]) => {
              const on = viewMode === mode;
              return (
                <Pressable
                  key={mode}
                  onPress={() => setViewMode(mode)}
                  accessibilityRole="button"
                  accessibilityLabel={label}
                  accessibilityState={{ selected: on }}
                  style={[styles.toggleBtn, on && { backgroundColor: theme.colors.primary }]}
                >
                  <IconCmp size={18} color={on ? theme.colors.primaryForeground : theme.colors.foregroundMuted} />
                </Pressable>
              );
            })}
          </View>
        </View>

        {bucketsQuery.isLoading ? (
          <ActivityIndicator style={{ marginTop: 24 }} color={theme.colors.primary} />
        ) : recent.length === 0 ? (
          <View style={[styles.empty, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.emptyText, { color: theme.colors.foregroundMuted }]}>{t('profile.empty_completed')}</Text>
          </View>
        ) : viewMode === 'gallery' ? (
          <View style={styles.grid} onLayout={(e) => setGridWidth(e.nativeEvent.layout.width)}>
            {recent.map((item) => {
              const photo = firstPhoto(item);
              return (
                <Pressable
                  key={item.id}
                  onPress={() => router.push(`/bucket/${item.id}` as any)}
                  accessibilityRole="button"
                  accessibilityLabel={item.title}
                  style={[styles.tile, { width: tileWidth, height: tileHeight }]}
                >
                  {photo ? (
                    <Image
                      source={{ uri: storageApi.getPublicUrl(photo.storage_path) }}
                      style={styles.tileImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <BucketCover
                      value={item.cover_image}
                      title={item.title}
                      seed={item.id}
                      style={{ width: tileWidth, height: tileHeight }}
                    />
                  )}
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
        ) : (
          <View style={{ gap: 10 }}>
            {recent.map((item) => {
              const photo = firstPhoto(item);
              return (
                <Pressable
                  key={item.id}
                  onPress={() => router.push(`/bucket/${item.id}` as any)}
                  accessibilityRole="button"
                  style={[styles.listRow, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
                >
                  <View style={styles.listThumb}>
                    {photo ? (
                      <Image
                        source={{ uri: storageApi.getPublicUrl(photo.thumb_path || photo.storage_path) }}
                        style={StyleSheet.absoluteFill}
                        resizeMode="cover"
                      />
                    ) : (
                      <BucketCover value={item.cover_image} title={item.title} seed={item.id} style={StyleSheet.absoluteFill} />
                    )}
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
    </SafeAreaView>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  const { theme } = useTheme();
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, { color: theme.colors.foreground }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: theme.colors.foregroundMuted }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: 20, paddingBottom: 40 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 12 },
  title: { fontFamily: fontFamily.serifBold, fontSize: 32 },
  roundBtn: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  identity: { flexDirection: 'row', alignItems: 'center', gap: 18, marginTop: 24 },
  name: { fontFamily: fontFamily.serifBold, fontSize: 26, lineHeight: 30 },
  handle: { fontFamily: fontFamily.regular, fontSize: 15, marginTop: 4 },
  bio: { fontFamily: fontFamily.regular, fontSize: 16, lineHeight: 23, marginTop: 16 },
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
  empty: { borderWidth: 1, borderRadius: 20, padding: 24, alignItems: 'center' },
  emptyText: { fontFamily: fontFamily.regular, fontSize: 14, textAlign: 'center' },
});