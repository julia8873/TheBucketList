import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Lock } from 'lucide-react-native';
import { Avatar } from '@bucketlist/ui';
import { FollowButton } from '../../../components/FollowButton';
import { displayNameOf, initialsOf } from '../../../utils/initials';
import { styles } from '../styles/profile.styles';

interface ProfileBioAndStatsProps {
  profile: any;
  isOwnProfile: boolean;
  isPrivate: boolean;
  followStatus: 'none' | 'pending' | 'accepted';
  isFollowPending: boolean;
  onFollow: () => void;
  onEditProfile: () => void;
  completedCount: number;
  taskCount: number | string;
  followersCount: number;
  isLocked: boolean;
}

function Stat({ value, label, divider }: { value: number | string; label: string; divider?: boolean }) {
  return (
    <View style={[styles.stat, divider && styles.statDivider]}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export function ProfileBioAndStats({
  profile,
  isOwnProfile,
  isPrivate,
  followStatus,
  isFollowPending,
  onFollow,
  onEditProfile,
  completedCount,
  taskCount,
  followersCount,
  isLocked,
}: ProfileBioAndStatsProps) {
  return (
    <>
      <View style={styles.identity}>
        <Avatar uri={profile.avatar_url} initials={initialsOf(profile)} size="xl" goldRing />
        <View style={styles.identityText}>
          <Text style={styles.name} numberOfLines={2} ellipsizeMode="tail">
            {displayNameOf(profile)}
          </Text>
          <View style={styles.handleRow}>
            <Text style={styles.handle} numberOfLines={1} ellipsizeMode="tail">
              @{profile.username}
            </Text>
            {isPrivate ? <Lock size={13} color="#9A9A9A" strokeWidth={1.8} /> : null}
          </View>
        </View>
      </View>

      {profile.bio ? <Text style={styles.bio}>{profile.bio}</Text> : null}

      <View style={styles.followWrap}>
        {isOwnProfile ? (
          <Pressable
            onPress={onEditProfile}
            style={styles.editButton}
            accessibilityRole="button"
          >
            <Text style={styles.editText}>Editar perfil</Text>
          </Pressable>
        ) : (
          <FollowButton
            size="block"
            status={followStatus}
            isPrivate={isPrivate}
            loading={isFollowPending}
            onPress={onFollow}
          />
        )}
      </View>

      <View style={styles.stats}>
        <Stat value={completedCount} label="Completadas" />
        <Stat value={isLocked ? '—' : taskCount} label="Públicas" divider />
        <Stat value={followersCount} label="Seguidores" divider />
      </View>
    </>
  );
}
