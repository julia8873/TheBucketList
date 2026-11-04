import { themedStyleSheet } from '@bucketlist/ui';
import React from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, UserX, UserCheck } from 'lucide-react-native';
import { Avatar, PageTitle, fontFamily, gold, confirm, useTheme } from '@bucketlist/ui';
import { useTranslation } from '@bucketlist/shared';
import { useBlockedUsers, useUnblockUser } from '../../src/hooks/useBlockReport';
import type { BlockedUserItem } from '../../src/services/api/blockReport';

export default function BlockedUsersScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { data: blockedUsers = [], isLoading } = useBlockedUsers();
  const unblockMutation = useUnblockUser();

  const handleUnblock = async (item: BlockedUserItem) => {
    const username = item.profile?.username || 'usuario';
    const confirmed = await confirm.ask({
      title: `¿Desbloquear a @${username}?`,
      message: 'Podrá volver a ver tus publicaciones públicas, buscarte y seguirte.',
      confirmLabel: t('blocked.unblock_btn'),
      cancelLabel: t('common.cancel'),
    });
    if (confirmed) {
      unblockMutation.mutate(item.blocked_id);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background, paddingTop: insets.top }]}>
      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#D4AF37" />
        </View>
      ) : (
        <FlatList
          data={blockedUsers}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <>
              <View style={[styles.header, { paddingHorizontal: 0 }]}>
                <Pressable
                  style={[styles.backBtn, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
                  onPress={() => router.back()}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={t('common.back', { defaultValue: 'Volver' })}
                >
                  <ChevronLeft color={theme.colors.foreground} size={24} />
                </Pressable>
                <PageTitle gold={t('blocked.title_gold')} rest={t('blocked.title_rest')} />
              </View>

              <Text style={[styles.description, { color: theme.colors.foregroundMuted, paddingHorizontal: 0 }]}>
                {t('blocked.description')}
              </Text>
            </>
          }
          renderItem={({ item }) => {
            const profile = item.profile;
            return (
              <View style={[styles.userCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                <Avatar
                  source={profile?.avatar_url ? { uri: profile.avatar_url } : undefined}
                  fallback={profile?.display_name?.charAt(0) || profile?.username?.charAt(0) || '?'}
                  size="md"
                />
                <View style={styles.userInfo}>
                  <Text style={[styles.displayName, { color: theme.colors.foreground }]} numberOfLines={1}>
                    {profile?.display_name || profile?.username || 'Usuario'}
                  </Text>
                  <Text style={[styles.username, { color: theme.colors.foregroundMuted }]} numberOfLines={1}>
                    @{profile?.username || 'usuario'}
                  </Text>
                </View>
                <Pressable
                  style={[
                    styles.unblockBtn,
                    {
                      backgroundColor: theme.dark ? '#262626' : (theme.colors.surfaceElevated ?? '#ECE8DF'),
                      borderColor: theme.colors.border,
                    },
                  ]}
                  onPress={() => handleUnblock(item)}
                  disabled={unblockMutation.isPending}
                >
                  <UserCheck size={14} color={theme.colors.foreground} />
                  <Text style={[styles.unblockBtnText, { color: theme.colors.foreground }]}>{t('blocked.unblock_btn')}</Text>
                </Pressable>
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={[styles.emptyIconBox, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderWidth: 1 }]}>
                <UserX size={32} color={theme.colors.foregroundMuted} />
              </View>
              <Text style={[styles.emptyTitle, { color: theme.colors.foreground }]}>{t('blocked.empty_title')}</Text>
              <Text style={[styles.emptySubtitle, { color: theme.colors.foregroundMuted }]}>
                {t('blocked.empty_desc')}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = themedStyleSheet({
  container: {
    flex: 1,
    backgroundColor: '#0D0D0D',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 8,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#262626',
    justifyContent: 'center',
    alignItems: 'center',
  },
  description: {
    color: '#8F8F8F',
    fontSize: 13,
    paddingHorizontal: 12,
    marginTop: 6,
    marginBottom: 16,
    lineHeight: 18,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingHorizontal: 12,
    paddingBottom: 40,
    gap: 10,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#161616',
    borderWidth: 1,
    borderColor: '#262626',
    borderRadius: 14,
    padding: 12,
  },
  userInfo: {
    flex: 1,
    marginLeft: 12,
    marginRight: 10,
  },
  displayName: {
    color: '#F3EEE3',
    fontSize: 15,
    fontFamily: fontFamily.semibold,
  },
  username: {
    color: '#8F8F8F',
    fontSize: 12,
    marginTop: 2,
  },
  unblockBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#262626',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#383838',
  },
  unblockBtnText: {
    color: '#F3EEE3',
    fontSize: 12,
    fontFamily: fontFamily.medium,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
  },
  emptyIconBox: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#1A1A1A',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    color: '#F3EEE3',
    fontSize: 17,
    fontFamily: fontFamily.semibold,
  },
  emptySubtitle: {
    color: '#777',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 6,
    maxWidth: 240,
  },
});
