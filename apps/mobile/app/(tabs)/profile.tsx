import React, { useMemo, useState, useEffect } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Settings, Users, MoreHorizontal } from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';
import { useTranslation } from 'react-i18next';
import { Avatar, fontFamily, useTheme, PageTitle, toast } from '@bucketlist/ui';
import { supabase } from '../../src/services/supabase';
import { useAuthStore } from '../../src/stores/auth.store';
import { useAlbums } from '../../src/hooks/useAlbums';
import { useIncomingRequestCount } from '../../src/hooks/useFriends';
import { ProfileSkeleton } from '../../src/components/TaskSkeletons';
import { initialsOf, displayNameOf } from '../../src/utils/initials';
import { useBuckets } from '../../src/hooks/useBuckets';

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

  const bucketsQuery = useBuckets(user?.id);
  const albums = useAlbums(user?.id);
  const requests = useIncomingRequestCount(user?.id);

  const profile = profileQuery.data;
  const buckets = bucketsQuery.data ?? [];

  const completed = useMemo(() => buckets.filter((b) => b.status === 'completed'), [buckets]);
  const publicBuckets = useMemo(() => buckets.filter((b) => b.visibility === 'public'), [buckets]);

  const [manualRefreshing, setManualRefreshing] = useState(false);
  const onRefresh = async () => {
    setManualRefreshing(true);
    try {
      await Promise.all([profileQuery.refetch(), bucketsQuery.refetch(), albums.refetch(), requests.refetch()]);
    } finally {
      setManualRefreshing(false);
    }
  };

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
                toast.show({ type: 'info', title: name || 'Mi perfil', message: 'Enlace a tu perfil copiado al portapapeles' });
              }
            }}
            accessibilityRole="button"
            accessibilityLabel="Compartir perfil"
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
      <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`${label}: ${value}`}
        style={({ pressed }) => [styles.stat, pressed && { opacity: 0.65 }]}>
        {content}
      </Pressable>
    );
  }
  return <View style={styles.stat}>{content}</View>;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 20, paddingBottom: 40 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 12, paddingHorizontal: 20 },
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
});