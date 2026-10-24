import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Lock } from 'lucide-react-native';
import { Avatar, useTheme } from '@bucketlist/ui';
import { useTranslation } from '@bucketlist/shared';
import { FollowButton } from '../../../components/FollowButton';
import { displayNameOf, initialsOf } from '../../../utils/initials';
import { OfficialBadge, isUserAdmin } from '../../../components/OfficialBadge';
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
  isBlocked?: boolean;
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
  isBlocked = false,
  onPressCompleted,
  onPressPublic,
  onPressFollowers,
}: ProfileBioAndStatsProps) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const hideStats = isLocked || isBlocked;

  return (
    <>
      <View style={styles.identity}>
        <Avatar uri={profile.avatar_url} initials={initialsOf(profile)} size="xl" goldRing />
        <View style={styles.identityText}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <Text style={[styles.name, { color: theme.colors.foreground }]} numberOfLines={2} ellipsizeMode="tail">
              {displayNameOf(profile)}
            </Text>
            {isUserAdmin(profile) && <OfficialBadge size="sm" />}
          </View>
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
            <Text style={[styles.editText, { color: theme.colors.foreground }]}>{t('profile.edit_profile')}</Text>
          </Pressable>
        ) : (
          <FollowButton
            size="block"
            status={followStatus}
            isPrivate={isPrivate}
            loading={isFollowPending}
            onPress={onFollow}
            isBlocked={isBlocked}
          />
        )}
      </View>

      <View style={[styles.stats, { borderColor: theme.colors.border }]}>
        <Stat
          value={hideStats ? '—' : completedCount}
          label={t('profile.stat_completed')}
          onPress={onPressCompleted}
          disabled={hideStats}
        />
        <Stat
          value={hideStats ? '—' : taskCount}
          label={t('profile.stat_public')}
          divider
          onPress={onPressPublic}
          disabled={hideStats}
        />
        <Stat
          value={hideStats ? '—' : followersCount}
          label={t('profile.stat_followers')}
          divider
          onPress={onPressFollowers}
          disabled={hideStats}
        />
      </View>
    </>
  );
}
