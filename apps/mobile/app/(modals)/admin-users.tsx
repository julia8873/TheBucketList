import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ChevronLeft,
  ChevronRight,
  Search,
  X,
  ShieldCheck,
  ShieldAlert,
  Users,
  Lock,
  Ban,
  Calendar,
} from 'lucide-react-native';
import { Avatar, PageTitle, fontFamily, gold, useTheme, themedStyleSheet } from '@bucketlist/ui';
import { useIsAdmin } from '../../src/hooks/useCurrentUserProfile';
import { useAdminUsers, type AdminUserProfile } from '../../src/hooks/useAdminUsers';
import { useAuthStore } from '../../src/stores/auth.store';
import { useTranslation } from '@bucketlist/shared';
import { initialsOf } from '../../src/utils/initials';
import { OfficialBadge, isUserAdmin } from '../../src/components/OfficialBadge';
import { timeAgo } from '../../src/utils/timeAgo';

type FilterType = 'all' | 'admins' | 'suspended' | 'private';

export default function AdminUsersScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { t } = useTranslation();
  const isAdmin = useIsAdmin();
  const { user: currentUser } = useAuthStore();

  const { data: users = [], isLoading, refetch, isRefetching } = useAdminUsers();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');

  const counts = useMemo(() => {
    let adminsCount = 0;
    let suspendedCount = 0;
    let privateCount = 0;

    users.forEach((u) => {
      if (u.role === 'admin' || isUserAdmin(u)) adminsCount++;
      if (u.suspended_at) suspendedCount++;
      if (u.visibility === 'private') privateCount++;
    });

    return {
      all: users.length,
      admins: adminsCount,
      suspended: suspendedCount,
      private: privateCount,
    };
  }, [users]);

  const filteredUsers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase().replace(/^@/, '');

    return users.filter((u) => {
      // 1. Filtrado por tipo
      if (activeFilter === 'admins' && u.role !== 'admin' && !isUserAdmin(u)) return false;
      if (activeFilter === 'suspended' && !u.suspended_at) return false;
      if (activeFilter === 'private' && u.visibility !== 'private') return false;

      // 2. Filtrado por búsqueda
      if (!q) return true;
      const usernameMatch = u.username?.toLowerCase().includes(q);
      const nameMatch = u.display_name?.toLowerCase().includes(q);
      const bioMatch = u.bio?.toLowerCase().includes(q);
      return usernameMatch || nameMatch || bioMatch;
    });
  }, [users, searchQuery, activeFilter]);

  const handleOpenProfile = (targetUser: AdminUserProfile) => {
    if (currentUser?.id === targetUser.id) {
      router.push('/(tabs)/profile' as any);
    } else {
      router.push(`/profile/${targetUser.id}` as any);
    }
  };

  if (!isAdmin) {
    return (
      <View
        style={[
          styles.container,
          {
            backgroundColor: theme.colors.background,
            paddingTop: insets.top + 40,
            alignItems: 'center',
            paddingHorizontal: 24,
          },
        ]}
      >
        <ShieldAlert color="#EF4444" size={56} />
        <Text style={[styles.title, { color: theme.colors.foreground, marginTop: 16 }]}>
          {t('admin_users.restricted_title', { defaultValue: 'Acceso restringido' })}
        </Text>
        <Text style={{ color: theme.colors.foregroundMuted, textAlign: 'center', marginTop: 8, marginBottom: 24 }}>
          {t('admin_users.restricted_text', {
            defaultValue: 'Esta sección es exclusiva para administradores de The Bucket List.',
          })}
        </Text>
        <Pressable style={styles.backBtnModal} onPress={() => router.back()}>
          <Text style={{ color: '#0D0D0D', fontWeight: 'bold' }}>{t('common.back', { defaultValue: 'Volver' })}</Text>
        </Pressable>
      </View>
    );
  }

  const renderItem = ({ item }: { item: AdminUserProfile }) => {
    const isSelf = currentUser?.id === item.id;
    const isItemAdmin = item.role === 'admin' || isUserAdmin(item);
    const isSuspended = !!item.suspended_at;
    const isPrivate = item.visibility === 'private';
    const joinedText = item.created_at ? timeAgo(item.created_at) : '';

    return (
      <Pressable
        style={({ pressed }) => [
          styles.userCard,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border,
            opacity: pressed ? 0.88 : 1,
          },
        ]}
        onPress={() => handleOpenProfile(item)}
        accessibilityRole="button"
        accessibilityLabel={`Perfil de ${item.display_name || item.username}`}
      >
        {/* Avatar */}
        <Avatar
          uri={item.avatar_url}
          initials={initialsOf(item)}
          size="md"
          goldRing={isItemAdmin}
        />

        {/* Info */}
        <View style={styles.userInfo}>
          <View style={styles.userNameRow}>
            <Text style={[styles.displayName, { color: theme.colors.foreground }]} numberOfLines={1}>
              {item.display_name || item.username}
            </Text>
            {isItemAdmin && <OfficialBadge size="xs" />}
            {isSelf && (
              <View style={styles.selfBadge}>
                <Text style={styles.selfBadgeText}>{t('common.you', { defaultValue: 'Tú' })}</Text>
              </View>
            )}
          </View>

          <Text style={[styles.username, { color: theme.colors.foregroundMuted }]} numberOfLines={1}>
            @{item.username}
          </Text>

          {joinedText ? (
            <View style={styles.joinedRow}>
              <Calendar size={11} color={theme.colors.foregroundSubtle} />
              <Text style={[styles.joinedText, { color: theme.colors.foregroundSubtle }]}>
                {t('admin_users.joined', { defaultValue: 'Miembro' })} {joinedText}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Badges / Estado */}
        <View style={styles.userStatus}>
          {isSuspended && (
            <View style={styles.suspendedPill}>
              <Ban size={10} color="#EF4444" />
              <Text style={styles.suspendedPillText}>
                {t('admin_users.status_suspended', { defaultValue: 'Suspendido' })}
              </Text>
            </View>
          )}

          {isPrivate && (
            <View style={[styles.privatePill, { borderColor: theme.colors.border }]}>
              <Lock size={10} color={theme.colors.foregroundMuted} />
              <Text style={[styles.privatePillText, { color: theme.colors.foregroundMuted }]}>
                {t('admin_users.visibility_private', { defaultValue: 'Privado' })}
              </Text>
            </View>
          )}

          {isItemAdmin && (
            <View style={styles.adminPill}>
              <ShieldCheck size={11} color={gold[400]} />
              <Text style={styles.adminPillText}>
                {t('admin_users.role_admin', { defaultValue: 'Admin' })}
              </Text>
            </View>
          )}

          <ChevronRight size={18} color={theme.colors.foregroundSubtle} />
        </View>
      </Pressable>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background, paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={[styles.circleBtn, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={t('common.back', { defaultValue: 'Volver' })}
        >
          <ChevronLeft size={22} color={theme.colors.foreground} />
        </Pressable>

        <View style={{ flex: 1, marginHorizontal: 12 }}>
          <PageTitle
            gold={t('admin_users.title_gold', { defaultValue: 'Usuarios' })}
            rest={t('admin_users.title_rest', { defaultValue: 'de la app' })}
          />
          <Text style={[styles.headerSub, { color: theme.colors.foregroundMuted }]}>
            {users.length === 1
              ? t('admin_users.count_single', { defaultValue: '1 usuario registrado' })
              : t('admin_users.count_plural', { count: users.length, defaultValue: `${users.length} usuarios registrados` })}
          </Text>
        </View>
      </View>

      {/* Buscador */}
      <View style={[styles.searchBar, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
        <Search size={16} color={theme.colors.foregroundMuted} />
        <TextInput
          style={[styles.searchInput, { color: theme.colors.foreground }]}
          placeholder={t('admin_users.search_placeholder', { defaultValue: 'Buscar por nombre o @usuario...' })}
          placeholderTextColor={theme.colors.foregroundMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
          returnKeyType="search"
          autoCapitalize="none"
          autoCorrect={false}
        />
        {searchQuery.length > 0 && (
          <Pressable onPress={() => setSearchQuery('')} hitSlop={8}>
            <X size={16} color={theme.colors.foregroundMuted} />
          </Pressable>
        )}
      </View>

      {/* Filtros rápidos */}
      <View style={styles.filterRow}>
        <Pressable
          style={[
            styles.filterChip,
            activeFilter === 'all'
              ? [styles.filterChipActive, { backgroundColor: gold[400], borderColor: gold[400] }]
              : [styles.filterChipInactive, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }],
          ]}
          onPress={() => setActiveFilter('all')}
        >
          <Text
            style={[
              styles.filterChipText,
              activeFilter === 'all' ? styles.filterChipTextActive : { color: theme.colors.foregroundMuted },
            ]}
          >
            {t('admin_users.filter_all', { defaultValue: 'Todos' })} ({counts.all})
          </Text>
        </Pressable>

        <Pressable
          style={[
            styles.filterChip,
            activeFilter === 'admins'
              ? [styles.filterChipActive, { backgroundColor: gold[400], borderColor: gold[400] }]
              : [styles.filterChipInactive, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }],
          ]}
          onPress={() => setActiveFilter('admins')}
        >
          <Text
            style={[
              styles.filterChipText,
              activeFilter === 'admins' ? styles.filterChipTextActive : { color: theme.colors.foregroundMuted },
            ]}
          >
            {t('admin_users.filter_admins', { defaultValue: 'Admins' })} ({counts.admins})
          </Text>
        </Pressable>

        {counts.suspended > 0 && (
          <Pressable
            style={[
              styles.filterChip,
              activeFilter === 'suspended'
                ? [styles.filterChipActive, { backgroundColor: '#EF4444', borderColor: '#EF4444' }]
                : [styles.filterChipInactive, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }],
            ]}
            onPress={() => setActiveFilter('suspended')}
          >
            <Text
              style={[
                styles.filterChipText,
                activeFilter === 'suspended' ? styles.filterChipTextActive : { color: theme.colors.foregroundMuted },
              ]}
            >
              {t('admin_users.filter_suspended', { defaultValue: 'Suspendidos' })} ({counts.suspended})
            </Text>
          </Pressable>
        )}

        {counts.private > 0 && (
          <Pressable
            style={[
              styles.filterChip,
              activeFilter === 'private'
                ? [styles.filterChipActive, { backgroundColor: gold[400], borderColor: gold[400] }]
                : [styles.filterChipInactive, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }],
            ]}
            onPress={() => setActiveFilter('private')}
          >
            <Text
              style={[
                styles.filterChipText,
                activeFilter === 'private' ? styles.filterChipTextActive : { color: theme.colors.foregroundMuted },
              ]}
            >
              {t('admin_users.visibility_private', { defaultValue: 'Privados' })} ({counts.private})
            </Text>
          </Pressable>
        )}
      </View>

      {/* Lista */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={gold[400]} size="large" />
          <Text style={[styles.loadingText, { color: theme.colors.foregroundMuted }]}>
            {t('admin_users.loading', { defaultValue: 'Cargando usuarios...' })}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredUsers}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 32 }]}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={gold[400]}
              colors={[gold[400]]}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Users size={44} color={theme.colors.foregroundMuted} />
              <Text style={[styles.emptyTitle, { color: theme.colors.foreground }]}>
                {t('admin_users.empty_title', { defaultValue: 'No se encontraron usuarios' })}
              </Text>
              <Text style={[styles.emptySub, { color: theme.colors.foregroundMuted }]}>
                {searchQuery
                  ? t('admin_users.empty_sub', { defaultValue: 'Prueba con otro término de búsqueda.' })
                  : t('admin_users.empty_sub_list', { defaultValue: 'No hay usuarios en esta categoría.' })}
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
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 14,
  },
  circleBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#262626',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerSub: {
    color: '#8F8F8F',
    fontSize: 12,
    marginTop: 2,
    fontFamily: fontFamily.regular,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#141414',
    marginHorizontal: 12,
    marginBottom: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#222',
  },
  searchInput: {
    flex: 1,
    color: '#F3EEE3',
    fontSize: 14,
    padding: 0,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    marginBottom: 14,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  filterChipActive: {
    backgroundColor: '#D4AF37',
  },
  filterChipInactive: {
    backgroundColor: '#1A1A1A',
  },
  filterChipText: {
    fontSize: 12,
    fontFamily: fontFamily.semibold,
  },
  filterChipTextActive: {
    color: '#000',
    fontFamily: fontFamily.bold,
  },
  listContent: {
    paddingHorizontal: 12,
    gap: 10,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  userInfo: {
    flex: 1,
    minWidth: 0,
  },
  userNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  displayName: {
    fontSize: 15,
    fontFamily: fontFamily.semibold,
    flexShrink: 1,
  },
  selfBadge: {
    backgroundColor: 'rgba(212, 175, 55, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  selfBadgeText: {
    color: '#D4AF37',
    fontSize: 10,
    fontFamily: fontFamily.bold,
  },
  username: {
    fontSize: 13,
    fontFamily: fontFamily.regular,
    marginTop: 1,
  },
  joinedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  joinedText: {
    fontSize: 11,
    fontFamily: fontFamily.regular,
  },
  userStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  adminPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(212, 175, 55, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.4)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  adminPillText: {
    color: '#D4AF37',
    fontSize: 11,
    fontFamily: fontFamily.bold,
  },
  suspendedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  suspendedPillText: {
    color: '#EF4444',
    fontSize: 11,
    fontFamily: fontFamily.bold,
  },
  privatePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 10,
  },
  privatePillText: {
    fontSize: 11,
    fontFamily: fontFamily.medium,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
    paddingHorizontal: 32,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: fontFamily.semibold,
    textAlign: 'center',
  },
  emptySub: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  backBtnModal: {
    backgroundColor: '#D4AF37',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
});

