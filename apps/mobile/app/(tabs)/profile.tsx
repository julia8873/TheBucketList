import React, { useMemo, useState, useEffect } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { LayoutGrid, List, Moon, Settings, Sun, Users, MoreHorizontal, Heart, Images } from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';
import { useTranslation } from 'react-i18next';
import { Avatar, fontFamily, useTheme, PageTitle, Skeleton, toast, gold } from '@bucketlist/ui';
import { supabase } from '../../src/services/supabase';
import { useAuthStore } from '../../src/stores/auth.store';
import { useThemeStore } from '../../src/stores/theme.store';
import { useAlbums } from '../../src/hooks/useAlbums';
import { useIncomingRequestCount } from '../../src/hooks/useFriends';
import { useSavedAlbums } from '../../src/hooks/useFavorites';
import { BucketCover } from '../../src/components/BucketCover';
import { ProfileSkeleton } from '../../src/components/TaskSkeletons';
import { ViewModeSelector, TaskViewMode } from '../../src/components/ViewModeSelector';
import { resolveTaskImage } from '../../src/utils/taskImage';
import { initialsOf, displayNameOf } from '../../src/utils/initials';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';

import { useBuckets } from '../../src/hooks/useBuckets';

const RECENT_LIMIT = 4;

// Gradient fallbacks for saved album cards
const ALBUM_GRADIENTS: Array<[string, string]> = [
  ['#1B4D3E', '#0A2E25'],
  ['#C87A2B', '#7A3D00'],
  ['#2B5BA8', '#0D2F6E'],
  ['#6B2FA0', '#3A0070'],
];

type ProfileSection = 'recientes' | 'guardados';

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

  const [profileSection, setProfileSectionState] = useState<ProfileSection>('recientes');
  const setProfileSection = (s: ProfileSection) => {
    setProfileSectionState(s);
    void AsyncStorage.setItem('@profile_section', s).catch(() => undefined);
  };

  useEffect(() => {
    AsyncStorage.getItem('@profile_view_mode')
      .then((saved) => {
        if (saved === 'gallery' || saved === 'list' || saved === 'compact') {
          setViewModeState(saved as TaskViewMode);
        }
      })
      .catch(() => undefined);
    AsyncStorage.getItem('@profile_section')
      .then((saved) => {
        if (saved === 'recientes' || saved === 'guardados') setProfileSectionState(saved as ProfileSection);
      })
      .catch(() => undefined);
  }, []);

  const albums = useAlbums(user?.id);
  const requests = useIncomingRequestCount(user?.id);
  const savedAlbumsQuery = useSavedAlbums(user?.id);

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

  const savedAlbums = savedAlbumsQuery.data ?? [];

  const [manualRefreshing, setManualRefreshing] = useState(false);
  const onRefresh = async () => {
    setManualRefreshing(true);
    try {
      await Promise.all([
        profileQuery.refetch(),
        bucketsQuery.refetch(),
        albums.refetch(),
        requests.refetch(),
        savedAlbumsQuery.refetch(),
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
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Pressable
            onPress={async () => {
              if (profile) {
                const shareUrl = `https://thebucketlist.app/profile/${profile.username || user?.id || ''}`;
                await Clipboard.setStringAsync(shareUrl);
                toast.show({
                  type: 'info',
                  title: name || 'Mi perfil',
                  message: 'Enlace a tu perfil copiado al portapapeles',
                });
              }
            }}
            accessibilityRole="button"
            accessibilityLabel="Opciones de perfil"
            style={[styles.roundBtn, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
          >
            <MoreHorizontal size={22} color={theme.colors.foreground} strokeWidth={2} />
          </Pressable>
          <Pressable
            onPress={() => router.push('/(modals)/settings' as any)}
            accessibilityRole="button"
            accessibilityLabel={t('settings.title')}
            style={[styles.roundBtn, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
          >
            <Settings size={22} color={theme.colors.foreground} />
          </Pressable>
        </View>
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

        {/* ── Sección privada: solo visible para el propio usuario ── */}
        {/* Toggle: Recientes / Guardados */}
        <View style={[styles.sectionToggle, { backgroundColor: theme.dark ? '#161616' : '#EDE8DE', borderColor: theme.colors.border }]}>
          <Pressable
            style={[styles.sectionToggleBtn, profileSection === 'recientes' && { backgroundColor: theme.colors.primary }]}
            onPress={() => setProfileSection('recientes')}
            accessibilityRole="tab"
          >
            <Text style={[styles.sectionToggleText, { color: profileSection === 'recientes' ? theme.colors.primaryForeground : theme.colors.foregroundMuted }]}>
              Recientes
            </Text>
          </Pressable>
          <Pressable
            style={[
              styles.sectionToggleBtn,
              profileSection === 'guardados' && { backgroundColor: theme.colors.primary },
            ]}
            onPress={() => setProfileSection('guardados')}
            accessibilityRole="tab"
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <Heart
                size={13}
                color={profileSection === 'guardados' ? theme.colors.primaryForeground : theme.colors.foregroundMuted}
                fill={profileSection === 'guardados' ? theme.colors.primaryForeground : 'transparent'}
                strokeWidth={2}
              />
              <Text style={[styles.sectionToggleText, { color: profileSection === 'guardados' ? theme.colors.primaryForeground : theme.colors.foregroundMuted }]}>
                Guardados{savedAlbums.length > 0 ? ` (${savedAlbums.length})` : ''}
              </Text>
            </View>
          </Pressable>
        </View>

        {/* ── Recientes ── */}
        {profileSection === 'recientes' && (
          <>
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
                {recent.map((item) => (
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
                ))}
              </View>
            ) : viewMode === 'compact' ? (
              <View style={{ gap: 8 }}>
                {recent.map((item) => (
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
                ))}
              </View>
            ) : (
              <View style={{ gap: 10 }}>
                {recent.map((item) => (
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
                ))}
              </View>
            )}
          </>
        )}

        {/* ── Álbumes Guardados ── */}
        {profileSection === 'guardados' && (
          <>
            {savedAlbumsQuery.isLoading ? (
              <ActivityIndicator style={{ marginTop: 32 }} color={gold[400]} />
            ) : savedAlbums.length === 0 ? (
              <View style={[styles.empty, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface, marginTop: 16 }]}>
                <Images size={28} color={theme.colors.foregroundMuted} strokeWidth={1.5} style={{ marginBottom: 10 }} />
                <Text style={[styles.emptyText, { color: theme.colors.foregroundMuted }]}>
                  Aún no has guardado ningún álbum.{'\n'}Dale ❤️ a los álbumes de otros para verlos aquí.
                </Text>
              </View>
            ) : (
              <View style={styles.savedAlbumsGrid} onLayout={(e) => setGridWidth(e.nativeEvent.layout.width)}>
                {savedAlbums.map((album, idx) => {
                  const [g1, g2] = ALBUM_GRADIENTS[idx % ALBUM_GRADIENTS.length] ?? ['#1B4D3E', '#0A2E25'];
                  const progress = album.total_tasks > 0 ? album.completed_tasks / album.total_tasks : 0;

                  let backgroundContent: React.ReactElement;
                  const coverPath = album.cover_path;
                  let parsedCover: any = null;
                  if (coverPath?.startsWith('{')) {
                    try { parsedCover = JSON.parse(coverPath); } catch { /* noop */ }
                  }
                  if (parsedCover?.type === 'image' && parsedCover.uri) {
                    backgroundContent = <Image source={{ uri: parsedCover.uri }} style={StyleSheet.absoluteFill} contentFit="cover" />;
                  } else if ((parsedCover?.type === 'gradient' || parsedCover?.type === 'solid') && parsedCover.colors) {
                    backgroundContent = <LinearGradient colors={parsedCover.colors} start={{ x: 0.3, y: 0 }} end={{ x: 0.7, y: 1 }} style={StyleSheet.absoluteFill} />;
                  } else if (coverPath) {
                    backgroundContent = <Image source={{ uri: coverPath }} style={StyleSheet.absoluteFill} contentFit="cover" />;
                  } else {
                    backgroundContent = <LinearGradient colors={[g1, g2]} start={{ x: 0.3, y: 0 }} end={{ x: 0.7, y: 1 }} style={StyleSheet.absoluteFill} />;
                  }

                  return (
                    <Pressable
                      key={album.id}
                      onPress={() => router.push(`/album/${album.id}` as any)}
                      style={({ pressed }) => [
                        styles.savedAlbumTile,
                        { width: tileWidth, height: tileHeight, opacity: pressed ? 0.88 : 1 },
                      ]}
                    >
                      {backgroundContent}
                      <LinearGradient
                        colors={['transparent', 'rgba(0,0,0,0.78)']}
                        start={{ x: 0.5, y: 0 }}
                        end={{ x: 0.5, y: 1 }}
                        style={[StyleSheet.absoluteFill, { top: '38%' }]}
                      />
                      {/* Heart badge */}
                      <View style={styles.savedHeartBadge}>
                        <Heart size={10} color="#EF4444" fill="#EF4444" />
                      </View>
                      {/* Bottom info */}
                      <View style={styles.savedAlbumBottom}>
                        <Text style={styles.savedAlbumTitle} numberOfLines={2}>{album.title}</Text>
                        {(album as any).owner_display_name || (album as any).owner_username ? (
                          <Text style={styles.savedAlbumOwner} numberOfLines={1}>
                            @{(album as any).owner_username}
                          </Text>
                        ) : null}
                        {/* Progress */}
                        <View style={styles.savedAlbumProgress}>
                          <View style={[styles.savedAlbumProgressFill, { width: `${Math.round(progress * 100)}%` as any }]} />
                        </View>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            )}
          </>
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
  // Section toggle
  sectionToggle: {
    flexDirection: 'row',
    borderRadius: 999,
    padding: 3,
    marginTop: 24,
    borderWidth: 1,
  },
  sectionToggleBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionToggleText: {
    fontFamily: fontFamily.semibold,
    fontSize: 14,
  },
  // Toolbar
  toolbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, marginBottom: 12 },
  seeAll: { fontFamily: fontFamily.semibold, fontSize: 14, paddingVertical: 8 },
  // Grid / tiles
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tile: { borderRadius: 12, overflow: 'hidden' },
  caption: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', padding: 6 },
  captionTitle: { fontFamily: fontFamily.medium, fontSize: 12, color: '#fff' },
  captionSub: { fontFamily: fontFamily.regular, fontSize: 12, color: 'rgba(255,255,255,0.7)' },
  // List rows
  listRow: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 12, borderWidth: 1, borderRadius: 20 },
  listThumb: { width: 56, height: 56, borderRadius: 12, overflow: 'hidden' },
  listTitle: { fontFamily: fontFamily.serifBold, fontSize: 17, lineHeight: 21 },
  listSub: { fontFamily: fontFamily.regular, fontSize: 13, marginTop: 3 },
  compactRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8, paddingHorizontal: 12, borderWidth: 1, borderRadius: 14 },
  compactThumb: { width: 40, height: 40, borderRadius: 8, overflow: 'hidden' },
  compactTitle: { fontFamily: fontFamily.semibold, fontSize: 14 },
  compactSub: { fontFamily: fontFamily.regular, fontSize: 12, marginTop: 2 },
  // Empty
  empty: { borderWidth: 1, borderRadius: 20, padding: 24, alignItems: 'center' },
  emptyText: { fontFamily: fontFamily.regular, fontSize: 14, textAlign: 'center', lineHeight: 21 },
  // Saved albums grid
  savedAlbumsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 14 },
  savedAlbumTile: { borderRadius: 14, overflow: 'hidden', position: 'relative' },
  savedHeartBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.55)',
    padding: 5,
    borderRadius: 16,
    zIndex: 2,
  },
  savedAlbumBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 10,
  },
  savedAlbumTitle: {
    fontFamily: fontFamily.semibold,
    fontSize: 13,
    color: '#FFF',
    marginBottom: 2,
  },
  savedAlbumOwner: {
    fontFamily: fontFamily.regular,
    fontSize: 11,
    color: 'rgba(255,255,255,0.65)',
    marginBottom: 6,
  },
  savedAlbumProgress: {
    height: 2,
    borderRadius: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
    overflow: 'hidden',
  },
  savedAlbumProgressFill: {
    height: '100%',
    backgroundColor: gold[400],
    borderRadius: 1,
  },
  // Legacy
  viewToggle: { flexDirection: 'row', padding: 3, borderWidth: 1, borderRadius: 20, gap: 2 },
  toggleBtn: { width: 38, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { fontFamily: fontFamily.serifBold, fontSize: 16, letterSpacing: 0.6, textTransform: 'uppercase' },
  tileImage: { width: '100%', height: '100%' },
});