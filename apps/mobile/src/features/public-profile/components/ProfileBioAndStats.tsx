import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Lock } from 'lucide-react-native';
import { Avatar, useTheme } from '@bucketlist/ui';
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
  const { theme } = useTheme();
  const content = (
    <>
      <Text style={[styles.statValue, { color: theme.colors.foreground }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: theme.colors.foregroundMuted }]}>{label}</Text>
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
          divider && [styles.statDivider, { borderLeftColor: theme.colors.border }],
          pressed && { opacity: 0.65 },
        ]}
      >
        {content}
      </Pressable>
    );
  }

  return (
    <View style={[styles.stat, divider && [styles.statDivider, { borderLeftColor: theme.colors.border }]]}>
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
  const { theme } = useTheme();

  return (
    <>
      <View style={styles.identity}>
        <Avatar uri={profile.avatar_url} initials={initialsOf(profile)} size="xl" goldRing />
        <View style={styles.identityText}>
          <Text style={[styles.name, { color: theme.colors.foreground }]} numberOfLines={2} ellipsizeMode="tail">
            {displayNameOf(profile)}
          </Text>
          <View style={styles.handleRow}>
            <Text style={[styles.handle, { color: theme.colors.foregroundMuted }]} numberOfLines={1} ellipsizeMode="tail">
              @{profile.username}
            </Text>
            {isPrivate ? <Lock size={13} color={theme.colors.foregroundMuted} strokeWidth={1.8} /> : null}
          </View>
        </View>
      </View>

      {profile.bio ? <Text style={[styles.bio, { color: theme.colors.foreground }]}>{profile.bio}</Text> : null}

      <View style={styles.followWrap}>
        {isOwnProfile ? (
          <Pressable
            onPress={onEditProfile}
            style={[styles.editButton, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
            accessibilityRole="button"
          >
            <Text style={[styles.editText, { color: theme.colors.foreground }]}>Editar perfil</Text>
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

      <View style={[styles.stats, { borderColor: theme.colors.border }]}>
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
