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
import { Avatar, PageTitle, fontFamily, gold } from '@bucketlist/ui';
import { useBlockedUsers, useUnblockUser } from '../../src/hooks/useBlockReport';
import { BlockedUserItem } from '../../src/services/api/blockReport';

export default function BlockedUsersScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data: blockedUsers = [], isLoading } = useBlockedUsers();
  const unblockMutation = useUnblockUser();

  const handleUnblock = (item: BlockedUserItem) => {
    const username = item.profile?.username || 'este usuario';
    Alert.alert(
      `¿Desbloquear a @${username}?`,
      'Podrá volver a ver tus publicaciones públicas, buscarte y seguirte.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Desbloquear',
          onPress: () => unblockMutation.mutate(item.blocked_id),
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          style={styles.backBtn}
          onPress={() => router.back()}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Volver"
        >
          <ChevronLeft color="#F3EEE3" size={24} />
        </Pressable>
        <PageTitle gold="Usuarios" rest=" bloqueados" />
      </View>

      <Text style={styles.description}>
        Los usuarios de esta lista no pueden ver tus objetivos, seguirte ni interactuar contigo.
      </Text>

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
          renderItem={({ item }) => {
            const profile = item.profile;
            return (
              <View style={styles.userCard}>
                <Avatar
                  source={profile?.avatar_url ? { uri: profile.avatar_url } : undefined}
                  fallback={profile?.display_name?.charAt(0) || profile?.username?.charAt(0) || '?'}
                  size="md"
                />
                <View style={styles.userInfo}>
                  <Text style={styles.displayName} numberOfLines={1}>
                    {profile?.display_name || profile?.username || 'Usuario'}
                  </Text>
                  <Text style={styles.username} numberOfLines={1}>
                    @{profile?.username || 'usuario'}
                  </Text>
                </View>
                <Pressable
                  style={styles.unblockBtn}
                  onPress={() => handleUnblock(item)}
                  disabled={unblockMutation.isPending}
                >
                  <UserCheck size={14} color="#F3EEE3" />
                  <Text style={styles.unblockBtnText}>Desbloquear</Text>
                </Pressable>
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconBox}>
                <UserX size={32} color="#8F8F8F" />
              </View>
              <Text style={styles.emptyTitle}>Sin usuarios bloqueados</Text>
              <Text style={styles.emptySubtitle}>
                No tienes a ningún usuario en tu lista de bloqueo.
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D0D0D',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 20,
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
    paddingHorizontal: 20,
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
    paddingHorizontal: 20,
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
