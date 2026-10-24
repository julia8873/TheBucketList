import React from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTheme, PageTitle } from '@bucketlist/ui';
import { supabase } from '../../src/services/supabase';
import { useAuthStore } from '../../src/stores/auth.store';
import { Card, SectionTitle, ToggleRow } from '../../src/components/SettingsParts';

type PrefKey =
  | 'reaction_push'
  | 'comment_push'
  | 'follow_push'
  | 'deadline_push'
  | 'friend_completed_push';

type Prefs = Partial<Record<PrefKey, boolean | null>>;

export default function NotificationPrefsScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const queryKey = ['notification_prefs', user?.id];

  // Misma clave de caché que Ajustes → ambas pantallas siempre muestran lo mismo
  const { data: prefs, isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      const { data } = await supabase
        .from('notification_prefs')
        .select('*')
        .eq('user_id', user!.id)
        .maybeSingle();
      return (data ?? {}) as Prefs;
    },
    enabled: !!user?.id,
  });

  const updatePrefs = useMutation({
    mutationFn: async (patch: Partial<Prefs>) => {
      // upsert: funciona aunque el usuario aún no tenga fila de preferencias
      const { error } = await supabase
        .from('notification_prefs')
        .upsert({ user_id: user!.id, ...patch }, { onConflict: 'user_id' });
      if (error) throw error;
    },
    onMutate: async (patch) => {
      await queryClient.cancelQueries({ queryKey });
      const prev = queryClient.getQueryData(queryKey);
      queryClient.setQueryData(queryKey, (old: any) => ({ ...(old ?? {}), ...patch }));
      return { prev };
    },
    onError: (_e, _v, ctx) => queryClient.setQueryData(queryKey, ctx?.prev),
    onSettled: () => void queryClient.invalidateQueries({ queryKey }),
  });

  // Por defecto todas las preferencias están activadas (null / undefined = activado)
  const isOn = (key: PrefKey) => prefs?.[key] !== false;

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/(tabs)/profile' as any));

  return (
    <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Pressable
              onPress={goBack}
              accessibilityRole="button"
              accessibilityLabel="Volver"
              style={[styles.back, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
            >
              <ChevronLeft size={22} color={theme.colors.foreground} />
            </Pressable>
            <PageTitle>{t('notifications.title')}</PageTitle>
          </View>
          <SectionTitle gold={t('settings.push')} />
          <Card>
            <ToggleRow
              title={t('notifications.reaction_title', { defaultValue: 'Reacciones' })}
              subtitle={t('notifications.reaction_desc', { defaultValue: 'Cuando alguien reacciona a tus tareas o álbumes' })}
              value={isOn('reaction_push')}
              onChange={(v) => updatePrefs.mutate({ reaction_push: v })}
            />
            <ToggleRow
              title={t('notifications.comment_title', { defaultValue: 'Comentarios' })}
              subtitle={t('notifications.comment_desc', { defaultValue: 'Comentarios y menciones en tus tareas o álbumes' })}
              value={isOn('comment_push')}
              onChange={(v) => updatePrefs.mutate({ comment_push: v })}
            />
            <ToggleRow
              title={t('notifications.follow_title', { defaultValue: 'Seguidores y solicitudes' })}
              subtitle={t('notifications.follow_desc', { defaultValue: 'Nuevos seguidores y solicitudes de seguimiento' })}
              value={isOn('follow_push')}
              onChange={(v) => updatePrefs.mutate({ follow_push: v })}
            />
            <ToggleRow
              title={t('notifications.friend_completed_title', { defaultValue: 'Tareas completadas por amigos' })}
              value={isOn('friend_completed_push')}
              onChange={(v) => updatePrefs.mutate({ friend_completed_push: v })}
            />
            <ToggleRow
              title={t('notifications.deadline_title', { defaultValue: 'Fechas límite de tareas' })}
              value={isOn('deadline_push')}
              onChange={(v) => updatePrefs.mutate({ deadline_push: v })}
              last
            />
          </Card>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingTop: 12, paddingBottom: 6 },
  back: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: 20, paddingBottom: 48 },
});
