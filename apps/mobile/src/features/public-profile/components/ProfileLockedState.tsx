import React from 'react';
import { View, Text } from 'react-native';
import { Lock } from 'lucide-react-native';
import { gold, useTheme } from '@bucketlist/ui';
import { useTranslation } from '@bucketlist/shared';
import { displayNameOf } from '../../../utils/initials';
import { styles } from '../styles/profile.styles';

interface ProfileLockedStateProps {
  profile: any;
  followStatus: 'none' | 'pending' | 'accepted';
}

export function ProfileLockedState({
  profile,
  followStatus,
}: ProfileLockedStateProps) {
  const { theme } = useTheme();
  const { t } = useTranslation();

  return (
    <View style={[styles.locked, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
      <Lock size={28} color={gold[400]} strokeWidth={1.6} />
      <Text style={[styles.lockedTitle, { color: theme.colors.foreground }]}>{t('friends.locked_account_title')}</Text>
      <Text style={[styles.lockedText, { color: theme.colors.foregroundMuted }]}>
        {followStatus === 'pending'
          ? t('profile.pending_request_desc', { defaultValue: 'Your request is pending. You will see their tasks once they accept.' })
          : t('friends.private_note', { name: displayNameOf(profile) })}
      </Text>
    </View>
  );
}
