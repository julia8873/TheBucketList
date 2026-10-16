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
  onPressCompleted?: () => void;
  onPressPublic?: () => void;
  onPressFollowers?: () => void;
}

function Stat({
  value,
  label,
  divider,
  onPress,
  disabled,
}: {
  value: number | string;
  label: string;
  divider?: boolean;
  onPress?: () => void;
  disabled?: boolean;
}) {
  const content = (
    <>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </>
  );

  if (onPress && !disabled) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${value}`}
        style={({ pressed }) => [
          styles.stat,
          divider && styles.statDivider,
          pressed && { opacity: 0.65 },
        ]}
      >
        {content}
      </Pressable>
    );
  }

  return (
    <View style={[styles.stat, divider && styles.statDivider]}>
      {content}
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
  onPressCompleted,
  onPressPublic,
  onPressFollowers,
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
        <Stat
          value={isLocked ? '—' : completedCount}
          label="Completadas"
          onPress={onPressCompleted}
          disabled={isLocked}
        />
        <Stat
          value={isLocked ? '—' : taskCount}
          label="Públicas"
          divider
          onPress={onPressPublic}
          disabled={isLocked}
        />
        <Stat
          value={isLocked ? '—' : followersCount}
          label="Seguidores"
          divider
          onPress={onPressFollowers}
          disabled={isLocked}
        />
      </View>
    </>
  );
}
