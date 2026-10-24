import { Alert } from '@bucketlist/ui';
import React, { useState, useEffect } from 'react';
import { AppState, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import Constants from 'expo-constants';
import { Check, ChevronLeft, Heart, Bookmark } from 'lucide-react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fontFamily, useTheme, PageTitle } from '@bucketlist/ui';
import { supabase } from '../../src/services/supabase';
import { LEGAL_URLS } from '../../src/constants/urls';
import { useAuthStore } from '../../src/stores/auth.store';
import { useThemeStore } from '../../src/stores/theme.store';
import { useLanguageStore, type AppLanguage } from '../../src/stores/language.store';
import { useHapticsStore } from '../../src/stores/haptics.store';
import {
  checkNotificationPermissionsAsync,
  requestNotificationPermissionsAsync,
  openAppNotificationSettings,
  registerForPushNotificationsAsync,
  type NotificationPermissionStatus,
} from '../../src/services/notifications';
import {
  Card, ConfirmDialog, OptionDialog, PillToggle, Row, SectionTitle, ToggleRow,
} from '../../src/components/SettingsParts';
import { useIsAdmin } from '../../src/hooks/useCurrentUserProfile';
import { useAdminReports } from '../../src/hooks/useBlockReport';
import { OfficialBadge } from '../../src/components/OfficialBadge';

type Visibility = 'public' | 'followers' | 'private';
const PUSH_KEYS = ['reaction_push', 'comment_push', 'follow_push', 'friend_completed_push'] as const;

export default function SettingsScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const { user, signOut } = useAuthStore();
  const { override, setOverride } = useThemeStore();
  const { language, setLanguage } = useLanguageStore();
  const { hapticsEnabled, setHapticsEnabled } = useHapticsStore();
  const isAdmin = useIsAdmin();
  const { data: adminReports = [] } = useAdminReports();
  const pendingReportsCount = adminReports.filter((r) => !r.resolved && r.status === 'pending').length;

  const [langOpen, setLangOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [permStatus, setPermStatus] = useState<NotificationPermissionStatus | null>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchPerms = async () => {
      const res = await checkNotificationPermissionsAsync();
      if (isMounted) setPermStatus(res);
    };
    fetchPerms();

    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        fetchPerms();
      }
    });

    return () => {
      isMounted = false;
      sub.remove();
    };
  }, []);

  const handleEnablePermissions = async () => {
    if (!permStatus?.granted && !permStatus?.canAskAgain) {
      Alert.alert(
        'Permisos desactivados',
        'Las notificaciones están bloqueadas en los ajustes de tu teléfono. Pulsa "Abrir Ajustes" para activarlas.',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Abrir Ajustes', onPress: openAppNotificationSettings },
        ]
      );
      return;
    }

    const res = await requestNotificationPermissionsAsync();
    setPermStatus(res);
    if (res.granted && user?.id) {
      await registerForPushNotificationsAsync(user.id);
      void queryClient.invalidateQueries({ queryKey: ['notification_prefs', user.id] });
      Alert.alert('¡Notificaciones activadas!', 'Ahora recibirás avisos en tu móvil cuando haya novedades.');
    } else if (!res.granted && !res.canAskAgain) {
      Alert.alert(
        'Permisos necesarios',
        'Para recibir avisos, debes activar las notificaciones en los ajustes de tu dispositivo.',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Abrir Ajustes', onPress: openAppNotificationSettings },
        ]
      );
    }
  };

  // ── Perfil (privacidad) ────────────────────────────────────────────────────
  const { data: profile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', user!.id).single();
      if (error) throw error;
      return data as any;
    },
    enabled: !!user?.id,
  });

  const updateProfile = useMutation({
    mutationFn: async (patch: { visibility?: Visibility; default_task_visibility?: Visibility }) => {
      const { error } = await supabase.from('profiles').update(patch).eq('id', user!.id);
      if (error) throw error;
      return patch;
    },
    onMutate: async (patch) => {
      await queryClient.cancelQueries({ queryKey: ['profile', user?.id] });
      const prev = queryClient.getQueryData(['profile', user?.id]);
      queryClient.setQueryData(['profile', user?.id], (old: any) => ({ ...(old ?? {}), ...patch }));
      return { prev };
    },
    onError: (_e, _v, ctx) => queryClient.setQueryData(['profile', user?.id], ctx?.prev),
    onSettled: () => void queryClient.invalidateQueries({ queryKey: ['profile', user?.id] }),
  });

  const isPrivate = profile?.visibility === 'private';
  const publicByDefault = (profile?.default_task_visibility ?? 'public') === 'public';

  // ── Notificaciones ─────────────────────────────────────────────────────────
  const { data: prefs } = useQuery({
    queryKey: ['notification_prefs', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('notification_prefs').select('*').eq('user_id', user!.id).maybeSingle();
      return (data ?? {}) as Record<string, boolean>;
    },
    enabled: !!user?.id,
  });

  const updatePrefs = useMutation({
    mutationFn: async (patch: Record<string, boolean>) => {
      const { error } = await supabase.from('notification_prefs').upsert({ user_id: user!.id, ...patch }, { onConflict: 'user_id' });
      if (error) throw error;
    },
    onMutate: async (patch) => {
      const prev = queryClient.getQueryData(['notification_prefs', user?.id]);
      queryClient.setQueryData(['notification_prefs', user?.id], (old: any) => ({ ...(old ?? {}), ...patch }));
      return { prev };
    },
    onError: (_e, _v, ctx) => queryClient.setQueryData(['notification_prefs', user?.id], ctx?.prev),
    onSettled: () => void queryClient.invalidateQueries({ queryKey: ['notification_prefs', user?.id] }),
  });

  const pushOn = PUSH_KEYS.some((k) => prefs?.[k] !== false);
  const deadlineOn = prefs?.deadline_push !== false;

  // ── Tema ───────────────────────────────────────────────────────────────────
  const themeSelected: 'dark' | 'light' = override === 'system' ? (theme.dark ? 'dark' : 'light') : override;

  // ── Sesión ─────────────────────────────────────────────────────────────────
  const handleLogout = async () => {
    setLogoutOpen(false);
    await supabase.auth.signOut();
    signOut();
    queryClient.clear();
    // La redirección a /(auth)/welcome la hace RootNavigator (app/_layout.tsx) al detectar que no hay sesión.
  };

  const deleteAccount = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('delete_user');
      if (error) throw error;
    },
    onSuccess: async () => {
      setDeleteOpen(false);
      await supabase.auth.signOut().catch(() => undefined);
      signOut();
      queryClient.clear();
      // La redirección a /(auth)/welcome la hace RootNavigator (app/_layout.tsx).
    },
    onError: (e: any) => setDeleteError(e?.message ?? t('errors.network')),
  });

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/(tabs)/profile' as any));

  return (
    <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable
            onPress={goBack}
            accessibilityRole="button"
            accessibilityLabel={t('common.back', { defaultValue: 'Volver' })}
            style={[styles.back, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
          >
            <ChevronLeft size={22} color={theme.colors.foreground} />
          </Pressable>
          <PageTitle>{t('settings.title')}</PageTitle>
        </View>

        <SectionTitle gold={t('settings.account')} />
        <Card>
          <Row
            title={t('settings.email')}
            subtitle={user?.email ?? ''}
            onPress={() => router.push('/(modals)/change-credential?type=email' as any)}
          />
          <Row
            title={t('settings.password')}
            subtitle={t('settings.change_password')}
            onPress={() => router.push('/(modals)/change-credential?type=password' as any)}
            last
          />
        </Card>

        <SectionTitle gold={t('settings.privacy')} />
        <Card>
          <ToggleRow
            title={t('settings.private_account')}
            subtitle={t('settings.private_account_desc')}
            value={isPrivate}
            onChange={(v) => updateProfile.mutate({ visibility: v ? 'private' : 'public' })}
          />
          <ToggleRow
            title={t('settings.public_default')}
            subtitle={t('settings.public_default_desc')}
            value={publicByDefault}
            onChange={(v) => updateProfile.mutate({ default_task_visibility: v ? 'public' : 'private' })}
          />
          <Row
            title={t('settings.blocked_users')}
            subtitle={t('settings.blocked_users_desc')}
            onPress={() => router.push('/(modals)/blocked-users' as any)}
          />
          <Row
            title={t('settings.privacy_policy')}
            onPress={() => void Linking.openURL(LEGAL_URLS.privacy).catch(() => {})}
          />
          <Row
            title={t('settings.terms_conditions')}
            onPress={() => void Linking.openURL(LEGAL_URLS.terms).catch(() => {})}
            last
          />
        </Card>

        <SectionTitle gold={t('settings.notifications')} />
        <Card>
          <Row
            title={t('settings.device_permissions')}
            subtitle={
              permStatus?.granted
                ? t('settings.permissions_enabled')
                : t('settings.permissions_disabled')
            }
            onPress={permStatus?.granted ? undefined : handleEnablePermissions}
            right={
              permStatus?.granted ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Check size={16} color={theme.colors.success} strokeWidth={2.5} />
                  <Text style={{ fontFamily: fontFamily.semibold, fontSize: 13, color: theme.colors.success }}>
                    {t('settings.status_enabled')}
                  </Text>
                </View>
              ) : (
                <Pressable
                  onPress={handleEnablePermissions}
                  style={{
                    backgroundColor: theme.colors.primary,
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 8,
                  }}
                  accessibilityRole="button"
                >
                  <Text style={{ fontFamily: fontFamily.semibold, fontSize: 12, color: theme.colors.primaryForeground }}>
                    {permStatus?.canAskAgain ? t('common.activate') : t('common.open_settings')}
                  </Text>
                </Pressable>
              )
            }
          />
          <ToggleRow
            title={t('settings.push')}
            subtitle={t('settings.push_desc')}
            value={pushOn}
            onChange={(v) => updatePrefs.mutate(Object.fromEntries(PUSH_KEYS.map((k) => [k, v])))}
          />
          <ToggleRow
            title={t('settings.deadline_reminders')}
            subtitle={t('settings.deadline_reminders_desc')}
            value={deadlineOn}
            onChange={(v) => updatePrefs.mutate({ deadline_push: v })}
          />
          <Row
            title={t('settings.notifications_advanced')}
            onPress={() => router.push('/(modals)/notification-prefs' as any)}
            last
          />
        </Card>

        <SectionTitle gold={t('settings.preferences')} />
        <Card>
          <ToggleRow
            title={t('settings.vibration')}
            subtitle={t('settings.vibration_desc')}
            value={hapticsEnabled}
            onChange={setHapticsEnabled}
            last
          />
        </Card>

        <SectionTitle gold={t('settings.activity')} />
        <Card>
          <Row
            title={t('settings.liked_content')}
            subtitle={t('settings.liked_content_desc')}
            onPress={() => router.push('/(modals)/liked-content' as any)}
          />
          <Row
            title={t('settings.saved_content')}
            subtitle={t('settings.saved_content_desc')}
            onPress={() => router.push('/(modals)/saved-albums' as any)}
            last
          />
        </Card>

        <SectionTitle gold={t('settings.appearance')} />
        <Card>
          <Row
            title={t('settings.language')}
            subtitle={language === 'es' ? t('settings.language_es') : t('settings.language_en')}
            right={
              <PillToggle<AppLanguage>
                options={[
                  { key: 'es', label: '🇪🇸 ES' },
                  { key: 'en', label: '🇬🇧 EN' },
                ]}
                selected={language}
                onChange={(k) => setLanguage(k)}
              />
            }
          />
          <Row
            title={t('settings.theme')}
            subtitle={t('settings.theme_desc')}
            last
            right={
              <PillToggle
                options={[
                  { key: 'dark', label: t('settings.theme_dark') },
                  { key: 'light', label: t('settings.theme_light') },
                ]}
                selected={themeSelected}
                onChange={(k) => setOverride(k)}
              />
            }
          />
        </Card>

        {isAdmin && (
          <>
            <SectionTitle gold={t('settings.admin_section')} />
            <Card>
              <Row
                title={t('settings.manage_collections')}
                subtitle={t('settings.manage_collections_desc')}
                onPress={() => router.push('/(modals)/manage-collections' as any)}
              />
              <Row
                title={t('settings.user_reports')}
                subtitle={t('settings.user_reports_desc')}
                onPress={() => router.push('/(modals)/admin-reports' as any)}
                right={
                  pendingReportsCount > 0 ? (
                    <View
                      style={{
                        backgroundColor: '#EF4444',
                        paddingHorizontal: 8,
                        paddingVertical: 3,
                        borderRadius: 10,
                      }}
                    >
                      <Text style={{ color: '#FFF', fontSize: 11, fontFamily: fontFamily.bold }}>
                        {pendingReportsCount}
                      </Text>
                    </View>
                  ) : undefined
                }
              />
              <Row
                title={t('settings.manage_admins')}
                subtitle={t('settings.manage_admins_desc')}
                onPress={() => router.push('/(modals)/manage-admins' as any)}
                last
              />
            </Card>
          </>
        )}

        <View style={{ marginTop: 24 }}>
          <Card>
            <Row title={t('settings.sign_out')} danger onPress={() => setLogoutOpen(true)} />
            <Row
              title={t('profile.delete_account')}
              danger
              last
              onPress={() => { setDeleteError(null); setDeleteOpen(true); }}
            />
          </Card>
        </View>

        <Text style={[styles.version, { color: theme.colors.foregroundSubtle }]}>
          TheBucketList · {t('settings.version')} {Constants.expoConfig?.version ?? '1.0.0'}
        </Text>
      </ScrollView>

      <OptionDialog<AppLanguage>
        visible={langOpen}
        title={t('settings.choose_language')}
        options={[
          { key: 'es', label: t('settings.language_es') },
          { key: 'en', label: t('settings.language_en') },
        ]}
        selected={language}
        onSelect={setLanguage}
        onClose={() => setLangOpen(false)}
      />

      <ConfirmDialog
        visible={logoutOpen}
        title={t('settings.sign_out')}
        message={t('settings.sign_out_confirm')}
        confirmLabel={t('settings.sign_out')}
        cancelLabel={t('common.cancel')}
        onConfirm={() => void handleLogout()}
        onCancel={() => setLogoutOpen(false)}
      />

      <ConfirmDialog
        visible={deleteOpen}
        title={t('profile.delete_account')}
        message={deleteError ?? t('profile.delete_account_confirm')}
        confirmLabel={t('profile.delete_account')}
        cancelLabel={t('common.cancel')}
        destructive
        requireText={t('settings.delete_word')}
        loading={deleteAccount.isPending}
        onConfirm={() => deleteAccount.mutate()}
        onCancel={() => setDeleteOpen(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingTop: 12, paddingBottom: 6 },
  back: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: fontFamily.serifBold, fontSize: 30 },
  content: { paddingHorizontal: 20, paddingBottom: 48 },
  version: { textAlign: 'center', fontFamily: fontFamily.regular, fontSize: 12, marginTop: 18 },
});
