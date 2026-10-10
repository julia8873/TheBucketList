import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import Constants from 'expo-constants';
import { ChevronLeft } from 'lucide-react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fontFamily, useTheme } from '@bucketlist/ui';
import { supabase } from '../../src/services/supabase';
import { useAuthStore } from '../../src/stores/auth.store';
import { useThemeStore } from '../../src/stores/theme.store';
import { useLanguageStore, type AppLanguage } from '../../src/stores/language.store';
import {
  Card, ConfirmDialog, OptionDialog, PillToggle, Row, SectionTitle, ToggleRow,
} from '../../src/components/SettingsParts';

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

  const [langOpen, setLangOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const isGoogle = user?.app_metadata?.provider === 'google';

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
    router.replace('/(auth)/welcome');
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
      router.replace('/(auth)/welcome');
    },
    onError: (e: any) => setDeleteError(e?.message ?? t('errors.network')),
  });

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/(tabs)/profile' as any));

  return (
    <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <Pressable
          onPress={goBack}
          accessibilityRole="button"
          accessibilityLabel={t('common.back', { defaultValue: 'Volver' })}
          style={[styles.back, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
        >
          <ChevronLeft size={22} color={theme.colors.foreground} />
        </Pressable>
        <Text style={[styles.title, { color: theme.colors.foreground }]}>{t('settings.title')}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <SectionTitle gold={t('settings.account')} />
        <Card>
          <Row
            title={t('settings.email')}
            subtitle={user?.email ?? ''}
            onPress={() => router.push('/(modals)/change-credential?type=email' as any)}
            last={isGoogle}
          />
          {!isGoogle ? (
            <Row
              title={t('settings.password')}
              subtitle={t('settings.change_password')}
              onPress={() => router.push('/(modals)/change-credential?type=password' as any)}
              last
            />
          ) : null}
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
            last
          />
        </Card>

        <SectionTitle gold={t('settings.notifications')} />
        <Card>
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

        <SectionTitle gold={t('settings.appearance')} />
        <Card>
          <Row
            title={t('settings.language')}
            value={language === 'es' ? t('settings.language_es') : t('settings.language_en')}
            onPress={() => setLangOpen(true)}
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
  header: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20, paddingTop: 12 },
  back: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: fontFamily.serifBold, fontSize: 30 },
  content: { paddingHorizontal: 20, paddingBottom: 48 },
  version: { textAlign: 'center', fontFamily: fontFamily.regular, fontSize: 12, marginTop: 18 },
});
