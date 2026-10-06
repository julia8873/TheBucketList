import React from 'react';
import { View, StyleSheet, ActivityIndicator, FlatList } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Typography, useTheme, spacing, Avatar, Button, Icon } from '@bucketlist/ui';
import { ArrowLeft } from 'lucide-react-native';
import { supabase } from '../../src/services/supabase';
import { useAuthStore } from '../../src/stores/auth.store';
import { useUserFollows, useFollowUser, useUnfollowUser } from '../../src/hooks/useSocial';
import { BucketCard } from '../../src/components/BucketCard';

export default function PublicProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { theme } = useTheme();
  const router = useRouter();
  const { user } = useAuthStore();
  
  const followUser = useFollowUser();
  const unfollowUser = useUnfollowUser();
  
  const { data: followsData } = useUserFollows(user?.id);
  const isFollowingObj = followsData?.find(f => f.following_id === id);
  const isFollowing = !!isFollowingObj;
  const isPending = isFollowingObj?.status === 'pending';

  // Fetch Profile
  const { data: profile, isLoading: isProfileLoading } = useQuery({
    queryKey: ['profile', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', id).single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Fetch Public Buckets
  const { data: buckets, isLoading: isBucketsLoading } = useQuery({
    queryKey: ['buckets', 'public', id],
    queryFn: async () => {
      // If we are following and accepted, we can see 'followers' visibility too
      const visibilities = ['public'];
      if (isFollowing && !isPending) visibilities.push('followers');
      
      const { data, error } = await supabase
        .from('buckets')
        .select(`
          *,
          item_subtasks(*)
        `)
        .eq('user_id', id)
        .in('visibility', visibilities)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      return data;
    },
    enabled: !!id && (isFollowing !== undefined),
  });

  const handleFollowToggle = () => {
    if (!user || !id) return;
    if (isFollowing) {
      unfollowUser.mutate({ followerId: user.id, followingId: id });
    } else {
      followUser.mutate({ followerId: user.id, followingId: id });
    }
  };

  if (isProfileLoading) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: theme.colors.background }]}>
        <Typography variant="body" color="error">User not found.</Typography>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <Button variant="ghost" size="sm" onPress={() => router.back()} style={{ padding: 0, width: 40 }}>
          <Icon icon={ArrowLeft} size={24} color={theme.colors.foreground} />
        </Button>
      </View>

      <FlatList
        data={buckets || []}
        ListHeaderComponent={
          <View style={styles.profileInfo}>
            <Avatar 
              source={profile.avatar_url ? { uri: profile.avatar_url } : undefined} 
              fallback={profile.display_name?.charAt(0) || profile.username?.charAt(0) || '?'} 
              size="xl" 
            />
            <Typography variant="h2" style={{ marginTop: spacing[3] }}>
              {profile.display_name || profile.username}
            </Typography>
            <Typography variant="body" color="textSecondary">@{profile.username}</Typography>
            
            {profile.bio && (
              <Typography variant="body" style={{ marginTop: spacing[3], textAlign: 'center' }}>
                {profile.bio}
              </Typography>
            )}

            {user?.id !== id && (
              <Button 
                variant={isFollowing ? 'secondary' : 'primary'} 
                style={{ marginTop: spacing[4], minWidth: 120 }}
                onPress={handleFollowToggle}
                loading={followUser.isPending || unfollowUser.isPending}
              >
                {isPending ? 'Requested' : isFollowing ? 'Following' : 'Follow'}
              </Button>
            )}
            
            <View style={styles.stats}>
              <View style={styles.statBox}>
                <Typography variant="h3">{buckets?.length || 0}</Typography>
                <Typography variant="caption" color="textSecondary">Goals</Typography>
              </View>
            </View>
            
            <Typography variant="h3" style={styles.sectionTitle}>Goals</Typography>
          </View>
        }
        renderItem={({ item, index }) => (
          <BucketCard 
            bucket={item} 
            index={index} 
            onPress={() => router.push(`/bucket/${item.id}` as any)} 
          />
        )}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          !isBucketsLoading ? (
            <Typography variant="body" color="textSecondary" style={{ textAlign: 'center', marginTop: spacing[4] }}>
              No visible goals.
            </Typography>
          ) : (
            <ActivityIndicator style={{ marginTop: spacing[4] }} color={theme.colors.primary} />
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[6],
    paddingBottom: spacing[2],
  },
  profileInfo: {
    alignItems: 'center',
    padding: spacing[6],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#eee',
    marginBottom: spacing[2],
  },
  stats: {
    flexDirection: 'row',
    marginTop: spacing[6],
    width: '100%',
    justifyContent: 'space-around',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#eee',
    paddingTop: spacing[4],
  },
  statBox: {
    alignItems: 'center',
  },
  sectionTitle: {
    alignSelf: 'flex-start',
    marginTop: spacing[6],
  }
});
