import React from 'react';
import { Pressable, Text, View, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, UserX, Trash2 } from 'lucide-react-native';
import { Avatar, fontFamily, useTheme } from '@bucketlist/ui';
import { useTranslation } from '@bucketlist/shared';
import { displayNameOf, initialsOf } from '../../../utils/initials';

interface BlockedByStateProps {
  /** Identidad mínima de quien te ha bloqueado (puede no estar disponible). */
  profile?: { username?: string | null; display_name?: string | null; avatar_url?: string | null } | null;
  onBack: () => void;
  /** Cuando es true (admin), se muestra el aviso pero también las acciones de moderación. */
  isAdmin?: boolean;
  onAdminDeleteUser?: () => void;
  isDeleting?: boolean;
}

/**
 * Pantalla que se muestra al entrar en el perfil de alguien que te ha bloqueado:
 * - Usuario normal: ve quién es, pero no puede seguirlo ni ver su contenido.
 * - Admin: ve el mismo aviso pero además tiene acciones de moderación (eliminar cuenta).
 */
export function BlockedByState({ profile, onBack, isAdmin, onAdminDeleteUser, isDeleting }: BlockedByStateProps) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const c = theme.colors;

  return (
    <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: c.background }]}>
      <View style={styles.topBar}>
        <Pressable
          onPress={onBack}
          style={[styles.circleButton, { backgroundColor: c.surface, borderColor: c.border }]}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
        >
          <ChevronLeft size={22} color={c.foreground} strokeWidth={2} />
        </Pressable>
      </View>

      <View style={styles.content}>
        <View style={styles.identity}>
          <Avatar
            uri={profile?.avatar_url ?? null}
            initials={initialsOf(profile)}
            size="xl"
            goldRing
          />
          <View style={styles.identityText}>
            <Text style={[styles.name, { color: c.foreground }]} numberOfLines={2}>
              {displayNameOf(profile)}
            </Text>
            {profile?.username ? (
              <Text style={[styles.handle, { color: c.foregroundMuted }]} numberOfLines={1}>
                @{profile.username}
              </Text>
            ) : null}
          </View>
        </View>

        {/* Botón de seguir deshabilitado */}
        <View
          style={[
            styles.blockedButton,
            { backgroundColor: c.errorBackground, borderColor: c.error },
          ]}
          accessibilityRole="button"
          accessibilityState={{ disabled: true }}
          accessibilityLabel={t('blocked.blocked_by_accessibility')}
        >
          <UserX size={16} color={c.error} strokeWidth={2} />
          <Text style={[styles.blockedButtonText, { color: c.error }]}>{t('blocked.blocked_by_button')}</Text>
        </View>

        <View style={[styles.notice, { backgroundColor: c.surface, borderColor: c.border }]}>
          <View style={[styles.noticeIcon, { backgroundColor: c.errorBackground }]}>
            <UserX size={26} color={c.error} strokeWidth={2} />
          </View>
          <Text style={[styles.noticeTitle, { color: c.foreground }]}>{t('blocked.blocked_by_title')}</Text>
          <Text style={[styles.noticeText, { color: c.foregroundMuted }]}>
            {isAdmin
              ? t('blocked.blocked_by_admin_desc')
              : t('blocked.blocked_by_desc')}
          </Text>
        </View>

        {/* Acciones de administrador */}
        {isAdmin && onAdminDeleteUser ? (
          <View style={styles.adminActions}>
            <Text style={[styles.adminLabel, { color: c.foregroundMuted }]}>
              {t('blocked.moderation_actions')}
            </Text>
            <Pressable
              onPress={onAdminDeleteUser}
              disabled={isDeleting}
              style={({ pressed }) => [
                styles.adminDeleteButton,
                { backgroundColor: c.errorBackground, borderColor: c.error, opacity: pressed || isDeleting ? 0.6 : 1 },
              ]}
              accessibilityRole="button"
              accessibilityLabel={t('blocked.delete_account_accessibility')}
            >
              {isDeleting ? (
                <ActivityIndicator size="small" color={c.error} />
              ) : (
                <Trash2 size={16} color={c.error} strokeWidth={2} />
              )}
              <Text style={[styles.adminDeleteText, { color: c.error }]}>
                {isDeleting ? t('blocked.deleting_account') : t('blocked.delete_account')}
              </Text>
            </Pressable>
          </View>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 6,
  },
  circleButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  content: { paddingHorizontal: 16 },
  identity: { flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 14 },
  identityText: { flex: 1, gap: 3 },
  name: { fontFamily: fontFamily.serifBold, fontSize: 19, lineHeight: 24, letterSpacing: -0.2 },
  handle: { fontFamily: fontFamily.regular, fontSize: 13 },
  blockedButton: {
    marginTop: 18,
    height: 46,
    borderRadius: 23,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    opacity: 0.9,
  },
  blockedButtonText: { fontFamily: fontFamily.semibold, fontSize: 14 },
  notice: {
    alignItems: 'center',
    gap: 10,
    marginTop: 28,
    padding: 24,
    borderRadius: 20,
    borderWidth: 1,
  },
  noticeIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  noticeTitle: { fontFamily: fontFamily.serifBold, fontSize: 18, textAlign: 'center' },
  noticeText: { fontFamily: fontFamily.regular, fontSize: 13.5, lineHeight: 19, textAlign: 'center' },
  adminActions: {
    marginTop: 28,
    gap: 10,
  },
  adminLabel: {
    fontFamily: fontFamily.semibold,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  adminDeleteButton: {
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  adminDeleteText: { fontFamily: fontFamily.semibold, fontSize: 14 },
});
