import React from 'react';
import { View, StyleSheet, ActivityIndicator, FlatList, Pressable, ImageBackground, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Typography, useTheme, spacing, Avatar, Icon } from '@bucketlist/ui';
import { Settings, Search, MapPin, Compass } from 'lucide-react-native';
import { supabase } from '../../src/services/supabase';
import { useAuthStore } from '../../src/stores/auth.store';
import { useUserFollows } from '../../src/hooks/useSocial';
import { storageApi } from '../../src/services/api/storage';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');
const COLUMN_COUNT = 3;
const GRID_SPACING = spacing[2];
const CARD_WIDTH = (width - spacing[4] * 2 - GRID_SPACING * 2) / COLUMN_COUNT;
const CARD_HEIGHT = CARD_WIDTH * 1.5;

export default function CurrentUserProfileScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { user } = useAuthStore();
  const { t } = useTranslation();

  const { data: followsData } = useUserFollows(user?.id);
  const followingCount = followsData?.length || 0;

  const { data: profile, isLoading: isProfileLoading } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', user?.id).single();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: buckets, isLoading: isBucketsLoading } = useQuery({
    queryKey: ['buckets', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('buckets')
        .select(`*, bucket_photos(*)`)
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  if (isProfileLoading) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color="#D4AF37" />
      </View>
    );
  }

  // Filter completed buckets with photos for the grid
  const completedMoments = buckets?.filter(b => b.status === 'completed' && b.bucket_photos?.length > 0) || [];

  return (
    <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Icon icon={Compass} size={24} color="#D4AF37" />
          <Typography variant="h2" style={{ marginLeft: spacing[2], color: '#fff' }}>TheBucketList</Typography>
        </View>
        <View style={styles.headerRight}>
          <Pressable onPress={() => router.push('/(modals)/settings')} style={styles.iconButton}>
            <Icon icon={Settings} size={24} color={theme.colors.foreground} />
          </Pressable>
          <Pressable style={styles.iconButton}>
            <Icon icon={Search} size={24} color={theme.colors.foreground} />
          </Pressable>
        </View>
      </View>

      <FlatList
        data={completedMoments}
        numColumns={3}
        contentContainerStyle={{ paddingHorizontal: spacing[4], paddingBottom: spacing[8] }}
        columnWrapperStyle={{ gap: GRID_SPACING, marginBottom: GRID_SPACING }}
        ListHeaderComponent={
          <View style={styles.profileInfo}>
            {/* Top Profile Area */}
            <View style={styles.profileTop}>
              <View style={styles.avatarContainer}>
                <Avatar
                  uri={profile?.avatar_url}
                  initials={profile?.display_name?.charAt(0) || profile?.username?.charAt(0) || '?'}
                  size="xl"
                />
              </View>
              <View style={styles.profileTextInfo}>
                <Typography variant="h2" style={{ color: '#fff' }}>
                  {profile?.display_name || profile?.username}
                </Typography>
                <Typography variant="body" color="textSecondary" style={{ marginTop: 2 }}>
                  @{profile?.username}
                </Typography>
                <View style={styles.locationRow}>
                  <Icon icon={MapPin} size={14} color={theme.colors.foregroundMuted} />
                  <Typography variant="caption" color="textSecondary" style={{ marginLeft: 4 }}>
                    San Francisco, CA {/* Defaulting to SF as in mockup, would be dynamic */}
                  </Typography>
                </View>
              </View>
            </View>

            <Typography variant="body" style={{ color: '#aaa', marginTop: spacing[4] }}>
              {profile?.bio || 'Exploring the world, one dream at a time.'}
            </Typography>

            {/* Stats Row */}
            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Typography variant="h3" style={{ color: '#fff' }}>{completedMoments.length} Completed</Typography>
                <Typography variant="caption" style={{ color: '#D4AF37', marginTop: 2 }}>12pt</Typography>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statBox}>
                <Typography variant="h3" style={{ color: '#fff' }}>{buckets?.length || 0} Bucket List</Typography>
                <Typography variant="caption" style={{ color: '#D4AF37', marginTop: 2 }}>12pt</Typography>
              </View>
            </View>

            <Typography variant="h3" style={styles.sectionTitle}>COMPLETED MOMENTS</Typography>
          </View>
        }
        renderItem={({ item }) => {
          const photo = item.bucket_photos[0];
          return (
            <Pressable
              style={styles.gridCard}
              onPress={() => router.push(`/bucket/${item.id}` as any)}
            >
              <ImageBackground
                source={{ uri: storageApi.getPublicUrl(photo.thumb_path || photo.storage_path) }}
                style={styles.gridImage}
                imageStyle={{ borderRadius: 12 }}
              >
                <LinearGradient
                  colors={['transparent', 'rgba(0,0,0,0.8)']}
                  style={styles.gradientOverlay}
                >
                  <Typography variant="caption" style={{ color: '#fff', fontWeight: 'bold' }}>
                    {item.title}
                  </Typography>
                </LinearGradient>
              </ImageBackground>
            </Pressable>
          );
        }}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          !isBucketsLoading ? (
            <Typography variant="body" color="textSecondary" style={{ textAlign: 'center', marginTop: spacing[4] }}>
              No completed moments yet.
            </Typography>
          ) : (
            <ActivityIndicator style={{ marginTop: spacing[4] }} color="#D4AF37" />
          )
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingTop: spacing[3],
    paddingBottom: spacing[4],
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  iconButton: { padding: spacing[2] },
  profileInfo: {
    paddingVertical: spacing[4],
  },
  profileTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    padding: 3,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: '#D4AF37', // Gold ring
  },
  profileTextInfo: {
    marginLeft: spacing[4],
    flex: 1,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing[2],
  },
  statsRow: {
    flexDirection: 'row',
    marginTop: spacing[6],
    width: '100%',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: spacing[4],
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: '#333',
  },
  statDivider: {
    width: 1,
    height: '100%',
    backgroundColor: '#333',
  },
  statBox: {
    alignItems: 'center',
    flex: 1,
  },
  sectionTitle: {
    alignSelf: 'flex-start',
    marginTop: spacing[8],
    marginBottom: spacing[4],
    color: '#D4AF37',
    fontFamily: 'serif',
    letterSpacing: 1,
  },
  gridCard: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
  },
  gridImage: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  gradientOverlay: {
    height: '50%',
    justifyContent: 'flex-end',
    padding: spacing[2],
    borderRadius: 12,
  }
});
