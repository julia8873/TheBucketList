import React, { useMemo } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  Alert,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Heart, X } from 'lucide-react-native';
import { useTranslation } from '@bucketlist/shared';
import { Avatar, fontFamily, gold, useTheme, HEART_COLOR } from '@bucketlist/ui';
import { useAuthStore } from '../stores/auth.store';
import { useItemLikes, useUserFollows, useFollowUser, useUnfollowUser } from '../hooks/useSocial';
import { displayNameOf, initialsOf } from '../utils/initials';
import { OfficialBadge, isUserAdmin } from './OfficialBadge';
import { FollowButton } from './FollowButton';
import type { FollowStatus } from '../services/api/friends';

interface ItemLikesModalProps {
  visible: boolean;
  onClose: () => void;
  targetId: string;
  targetType?: 'bucket' | 'album';
  title?: string;
}

export function ItemLikesModal({
  visible,
  onClose,
  targetId,
  targetType = 'bucket',
  title,
}: ItemLikesModalProps) {
  if (!visible) return null;
  return (
    <ItemLikesModalContent
      visible={visible}
      onClose={onClose}
      targetId={targetId}
      targetType={targetType}
      title={title}
    />
  );
}

function ItemLikesModalContent({
  visible,
  onClose,
  targetId,
  targetType = 'bucket',
  title,
}: ItemLikesModalProps) {
  const router = useRouter();
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { user: currentUser } = useAuthStore();

  const { data: likes = [], isLoading } = useItemLikes(targetId, targetType);
  const { data: userFollows = [] } = useUserFollows(currentUser?.id);

  const follow = useFollowUser();
  const unfollow = useUnfollowUser();

  const followsMap = useMemo(() => {
    const map = new Map<string, FollowStatus>();
    for (const f of userFollows as any[]) {
      if (f.following_id) {
        map.set(f.following_id, f.status as FollowStatus);
      }
    }
    return map;
  }, [userFollows]);

  const handleOpenProfile = (userId: string) => {
    onClose();
    if (currentUser && userId === currentUser.id) {
      router.push('/(tabs)/profile' as any);
    } else {
      router.push(`/profile/${userId}` as any);
    }
  };

  const handleFollowPress = (person: any) => {
    if (!currentUser || person.id === currentUser.id) return;
    const currentStatus = followsMap.get(person.id) || 'none';
    const vars = {
      followerId: currentUser.id,
      followingId: person.id,
      targetIsPrivate: person.is_private === true || person.visibility === 'private',
    };
    const fail = (error: any) => Alert.alert('Error', error?.message ?? 'Inténtalo de nuevo.');

    if (currentStatus === 'accepted') {
      Alert.alert(
        `¿Dejar de seguir a ${displayNameOf(person)}?`,
        undefined,
        [
          { text: t('comments.cancel', { defaultValue: 'Cancelar' }), style: 'cancel' },
          {
            text: 'Dejar de seguir',
            style: 'destructive',
            onPress: () => unfollow.mutate(vars, { onError: fail }),
          },
        ]
      );
    } else if (currentStatus === 'pending') {
      unfollow.mutate(vars, { onError: fail });
    } else {
      follow.mutate(vars, { onError: fail });
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View
          style={[
            styles.sheetContent,
            {
              backgroundColor: theme.dark ? '#121214' : '#FBF9F5',
              borderColor: theme.dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
            },
          ]}
        >
          {/* Header */}
          <View
            style={[
              styles.header,
              { borderBottomColor: theme.dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' },
            ]}
          >
            <View style={styles.headerLeft}>
              <View style={styles.headerIconCircle}>
                <Heart size={18} color={HEART_COLOR} fill={HEART_COLOR} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text
                    style={[
                      styles.headerTitle,
                      { color: theme.dark ? '#FFF' : theme.colors.foreground },
                    ]}
                  >
                    {t('likes.modal_title', { defaultValue: 'Me gusta' })}
                  </Text>
                  {likes.length > 0 && (
                    <View style={styles.countBadge}>
                      <Text style={styles.countBadgeText}>{likes.length}</Text>
                    </View>
                  )}
                </View>
                {title ? (
                  <Text
                    style={[
                      styles.headerSubtitle,
                      { color: theme.dark ? 'rgba(255,255,255,0.5)' : theme.colors.foregroundMuted },
                    ]}
                    numberOfLines={1}
                  >
                    {title}
                  </Text>
                ) : null}
              </View>
            </View>
            <Pressable
              onPress={onClose}
              hitSlop={10}
              style={[
                styles.closeBtn,
                { backgroundColor: theme.dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' },
              ]}
              accessibilityLabel={t('likes.close', { defaultValue: 'Cerrar' })}
            >
              <X size={20} color={theme.dark ? '#888' : '#666'} />
            </Pressable>
          </View>

          {/* List or States */}
          {isLoading ? (
            <View style={styles.centerContainer}>
              <ActivityIndicator color={gold[400]} size="small" />
            </View>
          ) : likes.length === 0 ? (
            <View style={styles.emptyContainer}>
              <View
                style={[
                  styles.emptyIconCircle,
                  { backgroundColor: theme.dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)' },
                ]}
              >
                <Heart
                  size={28}
                  color={theme.dark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)'}
                />
              </View>
              <Text
                style={[
                  styles.emptyTitle,
                  { color: theme.dark ? '#FFF' : theme.colors.foreground },
                ]}
              >
                {t('likes.empty_title', { defaultValue: 'Aún no hay me gusta' })}
              </Text>
              <Text
                style={[
                  styles.emptySubtitle,
                  { color: theme.dark ? 'rgba(255,255,255,0.5)' : theme.colors.foregroundMuted },
                ]}
              >
                {t('likes.empty_subtitle', {
                  defaultValue: 'Sé el primero en darle me gusta a esta publicación.',
                })}
              </Text>
            </View>
          ) : (
            <FlatList
              style={{ flex: 1 }}
              data={likes}
              nestedScrollEnabled
              keyboardShouldPersistTaps="handled"
              keyExtractor={(item) => item.id || item.user_id}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => {
                const person = item.user;
                if (!person) return null;
                const isSelf = currentUser?.id === person.id;
                const followStatus = followsMap.get(person.id) || 'none';

                return (
                  <Pressable
                    style={({ pressed }) => [
                      styles.userRow,
                      {
                        borderBottomColor: theme.dark
                          ? 'rgba(255,255,255,0.06)'
                          : 'rgba(0,0,0,0.06)',
                      },
                      pressed && { opacity: 0.8 },
                    ]}
                    onPress={() => handleOpenProfile(person.id)}
                    accessibilityRole="button"
                    accessibilityLabel={displayNameOf(person)}
                  >
                    <Avatar
                      uri={person.avatar_url}
                      initials={initialsOf(person)}
                      size="md"
                      goldRing
                    />
                    <View style={styles.userTextCol}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                        <Text
                          style={[
                            styles.userName,
                            { color: theme.dark ? '#FFF' : theme.colors.foreground },
                          ]}
                          numberOfLines={1}
                        >
                          {displayNameOf(person)}
                        </Text>
                        {isUserAdmin(person) && <OfficialBadge size="xs" />}
                      </View>
                      {person.username && (
                        <Text
                          style={[
                            styles.userHandle,
                            {
                              color: theme.dark
                                ? 'rgba(255,255,255,0.5)'
                                : theme.colors.foregroundMuted,
                            },
                          ]}
                          numberOfLines={1}
                        >
                          @{person.username}
                        </Text>
                      )}
                    </View>

                    {/* Botón de seguir a la derecha si no es el usuario actual */}
                    {!isSelf && currentUser && (
                      <View style={styles.followBtnCol}>
                        <FollowButton
                          status={followStatus}
                          isPrivate={person.is_private === true || person.visibility === 'private'}
                          onPress={() => handleFollowPress(person)}
                        />
                      </View>
                    )}
                  </Pressable>
                );
              }}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    ...Platform.select({
      web: {
        alignItems: 'center',
      },
    }),
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.65)',
  },
  sheetContent: {
    // Alto definido para que la lista (flex: 1) pueda hacer scroll
    height: '75%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
    width: '100%',
    ...Platform.select({
      web: {
        maxWidth: 620,
        alignSelf: 'center',
        borderLeftWidth: 1,
        borderRightWidth: 1,
      },
    }),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  headerIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(244, 63, 94, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(244, 63, 94, 0.25)',
  },
  headerTitle: {
    fontSize: 16,
    fontFamily: fontFamily.semibold,
    letterSpacing: 0.2,
  },
  headerSubtitle: {
    fontSize: 12,
    fontFamily: fontFamily.regular,
    marginTop: 1,
  },
  countBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
    backgroundColor: 'rgba(250, 204, 21, 0.16)',
  },
  countBadgeText: {
    color: HEART_COLOR,
    fontSize: 11,
    fontFamily: fontFamily.semibold,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 180,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 44,
  },
  emptyIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 15,
    fontFamily: fontFamily.semibold,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 13,
    fontFamily: fontFamily.regular,
    textAlign: 'center',
    lineHeight: 18,
  },
  listContent: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 28,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  userTextCol: {
    flex: 1,
  },
  userName: {
    fontSize: 14,
    fontFamily: fontFamily.semibold,
  },
  userHandle: {
    fontSize: 12,
    fontFamily: fontFamily.regular,
    marginTop: 2,
  },
  followBtnCol: {
    marginLeft: 8,
  },
});
