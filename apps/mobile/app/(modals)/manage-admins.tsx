import { Alert } from '@bucketlist/ui';
import { themedStyleSheet } from '@bucketlist/ui';
import React, { useState } from 'react';
import { View, Text, FlatList, TextInput, Pressable, ActivityIndicator, StyleSheet, KeyboardAvoidingView, Platform, Keyboard } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ChevronLeft,
  ShieldCheck,
  UserPlus,
  Trash2,
  Crown,
  ShieldAlert,
} from 'lucide-react-native';
import { Avatar, PageTitle, fontFamily, gold, useTheme } from '@bucketlist/ui';
import { useIsAdmin } from '../../src/hooks/useCurrentUserProfile';
import {
  useAdminsList,
  useAddAdmin,
  useRemoveAdmin,
} from '../../src/hooks/useAdmins';
import type { AdminUser } from '../../src/services/api/admins';
import { useAuthStore } from '../../src/stores/auth.store';
import { useTranslation } from '@bucketlist/shared';

export default function ManageAdminsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { t } = useTranslation();
  const isAdmin = useIsAdmin();
  const { user } = useAuthStore();

  const [usernameInput, setUsernameInput] = useState('');
  const { data: admins = [], isLoading } = useAdminsList();
  const addAdminMutation = useAddAdmin();
  const removeAdminMutation = useRemoveAdmin();

  const handleAddAdmin = () => {
    // Cerramos el teclado antes de abrir el diálogo para que no lo tape ni lo desplace.
    Keyboard.dismiss();
    const trimmed = usernameInput.trim().replace(/^@/, '');
    if (!trimmed) {
      Alert.alert(t('admin_admins.attention'), t('admin_admins.enter_username'));
      return;
    }

    Alert.alert(
      t('admin_admins.confirm_add_title', { username: trimmed }),
      t('admin_admins.confirm_add_msg'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('admin_admins.confirm'),
          onPress: async () => {
            try {
              await addAdminMutation.mutateAsync(trimmed);
              setUsernameInput('');
            } catch {}
          },
        },
      ]
    );
  };

  const handleRemoveAdmin = (targetAdmin: AdminUser) => {
    if (targetAdmin.username?.toLowerCase() === 'juliamiralles8873') {
      Alert.alert(t('admin_admins.not_allowed'), t('admin_admins.cannot_revoke_primary'));
      return;
    }

    if (targetAdmin.id === user?.id) {
      Alert.alert(t('admin_admins.not_allowed'), t('admin_admins.cannot_revoke_self'));
      return;
    }

    Alert.alert(
      t('admin_admins.confirm_revoke_title', { username: targetAdmin.username }),
      t('admin_admins.confirm_revoke_msg'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('admin_admins.revoke'),
          style: 'destructive',
          onPress: () => removeAdminMutation.mutate(targetAdmin.id),
        },
      ]
    );
  };

  if (!isAdmin) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background, paddingTop: insets.top + 20, justifyContent: 'center', alignItems: 'center', padding: 24 }]}>
        <ShieldAlert color="#EF4444" size={56} />
        <Text style={[styles.restrictedTitle, { color: theme.colors.foreground }]}>{t('admin_admins.restricted_title')}</Text>
        <Text style={[styles.restrictedText, { color: theme.colors.foregroundMuted }]}>
          {t('admin_admins.restricted_text')}
        </Text>
        <Pressable
          style={[styles.backBtnModal, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderWidth: 1 }]}
          onPress={() => router.back()}
        >
          <Text style={[styles.backBtnText, { color: theme.colors.foreground }]}>{t('common.back')}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background, paddingTop: insets.top }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable
            style={[styles.backBtn, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
            onPress={() => router.back()}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={t('common.back')}
          >
            <ChevronLeft color={theme.colors.foreground} size={24} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <PageTitle gold={t('admin_admins.title_gold')} rest={t('admin_admins.title_rest')} />
              <View style={styles.adminBadge}>
                <ShieldCheck size={12} color="#D4AF37" />
                <Text style={styles.adminBadgeText}>{t('admin_admins.badge')}</Text>
              </View>
            </View>
          </View>
        </View>

        <Text style={[styles.description, { color: theme.colors.foregroundMuted }]}>
          {t('admin_admins.description')}
        </Text>

        {/* Formulario añadir admin */}
        <View style={[styles.addCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <Text style={[styles.sectionLabel, { color: theme.colors.foregroundMuted }]}>{t('admin_admins.add_section')}</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.dark ? '#1F1F1F' : (theme.colors.surfaceElevated ?? '#F0ECE1'),
                  borderColor: theme.colors.border,
                  color: theme.colors.foreground,
                },
              ]}
              placeholder={t('admin_admins.input_placeholder')}
              placeholderTextColor={theme.colors.foregroundMuted}
              value={usernameInput}
              onChangeText={setUsernameInput}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={handleAddAdmin}
            />
            <Pressable
              style={[styles.addBtn, (!usernameInput.trim() || addAdminMutation.isPending) && { opacity: 0.6 }]}
              onPress={handleAddAdmin}
              disabled={!usernameInput.trim() || addAdminMutation.isPending}
            >
              {addAdminMutation.isPending ? (
                <ActivityIndicator size="small" color="#0D0D0D" />
              ) : (
                <>
                  <UserPlus size={16} color="#0D0D0D" />
                  <Text style={styles.addBtnText}>{t('admin_admins.add_button')}</Text>
                </>
              )}
            </Pressable>
          </View>
        </View>

        {/* Lista de administradores */}
        <View style={{ flex: 1, paddingHorizontal: 12 }}>
          <Text style={[styles.sectionLabel, { color: theme.colors.foregroundMuted, marginTop: 12, marginBottom: 10 }]}>
            {t('admin_admins.current_section', { count: admins.length })}
          </Text>

          {isLoading ? (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color="#D4AF37" />
            </View>
          ) : (
            <FlatList
              data={admins}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => {
                const isPrimary = item.username?.toLowerCase() === 'juliamiralles8873';
                const isMe = item.id === user?.id;

                return (
                  <View style={[styles.adminCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                    <Avatar
                      source={item.avatar_url ? { uri: item.avatar_url } : undefined}
                      fallback={item.display_name?.charAt(0) || item.username?.charAt(0) || '?'}
                      size="md"
                    />
                    <View style={styles.adminInfo}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={[styles.displayName, { color: theme.colors.foreground }]} numberOfLines={1}>
                          {item.display_name || item.username}
                        </Text>
                        {isPrimary && (
                          <View style={styles.primaryPill}>
                            <Crown size={10} color="#D4AF37" />
                            <Text style={styles.primaryPillText}>{t('admin_admins.primary')}</Text>
                          </View>
                        )}
                        {isMe && !isPrimary && (
                          <View style={[styles.mePill, { backgroundColor: theme.dark ? '#262626' : '#E2DDD4' }]}>
                            <Text style={[styles.mePillText, { color: theme.colors.foreground }]}>{t('admin_admins.me')}</Text>
                          </View>
                        )}
                      </View>
                      <Text style={[styles.username, { color: theme.colors.foregroundMuted }]} numberOfLines={1}>
                        @{item.username}
                      </Text>
                    </View>

                    {!isPrimary && !isMe && (
                      <Pressable
                        style={styles.removeBtn}
                        onPress={() => handleRemoveAdmin(item)}
                        disabled={removeAdminMutation.isPending}
                        hitSlop={8}
                      >
                        <Trash2 size={16} color="#EF4444" />
                      </Pressable>
                    )}
                  </View>
                );
              }}
            />
          )}
        </View>
      </KeyboardAvoidingView>
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
  adminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(212, 175, 55, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.4)',
  },
  adminBadgeText: {
    color: '#D4AF37',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  description: {
    color: '#8F8F8F',
    fontSize: 13,
    paddingHorizontal: 12,
    marginTop: 6,
    marginBottom: 16,
    lineHeight: 18,
  },
  addCard: {
    backgroundColor: '#161616',
    borderWidth: 1,
    borderColor: '#262626',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 12,
    marginBottom: 8,
  },
  sectionLabel: {
    color: '#8F8F8F',
    fontSize: 11,
    fontFamily: fontFamily.semibold,
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  input: {
    flex: 1,
    backgroundColor: '#1F1F1F',
    borderWidth: 1,
    borderColor: '#2E2E2E',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    color: '#F3EEE3',
    fontSize: 14,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#D4AF37',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 12,
  },
  addBtnText: {
    color: '#0D0D0D',
    fontSize: 14,
    fontFamily: fontFamily.bold,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingBottom: 40,
    gap: 10,
  },
  adminCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#161616',
    borderWidth: 1,
    borderColor: '#262626',
    borderRadius: 14,
    padding: 12,
  },
  adminInfo: {
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
  primaryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(212, 175, 55, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.35)',
  },
  primaryPillText: {
    color: '#D4AF37',
    fontSize: 9,
    fontFamily: fontFamily.bold,
  },
  mePill: {
    backgroundColor: '#262626',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  mePillText: {
    color: '#AAA',
    fontSize: 10,
    fontFamily: fontFamily.medium,
  },
  removeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  restrictedTitle: {
    color: '#F3EEE3',
    fontSize: 20,
    fontFamily: fontFamily.bold,
    marginTop: 16,
  },
  restrictedText: {
    color: '#8F8F8F',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  backBtnModal: {
    backgroundColor: '#222',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  backBtnText: {
    color: '#FFF',
    fontFamily: fontFamily.semibold,
  },
});
