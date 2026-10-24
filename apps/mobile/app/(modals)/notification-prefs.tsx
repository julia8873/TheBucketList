import React from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
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

type Prefs = Partial<Record<PrefKey, boolean | null>> & {
  quiet_start?: string | null;
  quiet_end?: string | null;
};

// Horario por defecto al activar las horas de silencio
const DEFAULT_QUIET_START = '22:00:00';
const DEFAULT_QUIET_END = '08:00:00';

export default function NotificationPrefsScreen() {
  const { theme } = useTheme();
  const router = useRouter();
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
  const quietOn = !!prefs?.quiet_start && !!prefs?.quiet_end;

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/(tabs)/profile' as any));

  return (
    <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Misma cabecera que Ajustes para que el título quede a la misma altura */}
      <View style={styles.header}>
        <Pressable
          onPress={goBack}
          accessibilityRole="button"
          accessibilityLabel="Volver"
          style={[styles.back, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
        >
          <ChevronLeft size={22} color={theme.colors.foreground} />
        </Pressable>
        <PageTitle>Notificaciones</PageTitle>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <SectionTitle gold="NOTIFICACIONES PUSH" />
          <Card>
            <ToggleRow
              title="Reacciones"
              subtitle="Cuando alguien reacciona a tus tareas o álbumes"
              value={isOn('reaction_push')}
              onChange={(v) => updatePrefs.mutate({ reaction_push: v })}
            />
            <ToggleRow
              title="Comentarios"
              subtitle="Comentarios y menciones en tus tareas o álbumes"
              value={isOn('comment_push')}
              onChange={(v) => updatePrefs.mutate({ comment_push: v })}
            />
            <ToggleRow
              title="Seguidores y solicitudes"
              subtitle="Nuevos seguidores y solicitudes de seguimiento"
              value={isOn('follow_push')}
              onChange={(v) => updatePrefs.mutate({ follow_push: v })}
            />
            <ToggleRow
              title="Tareas completadas por amigos"
              value={isOn('friend_completed_push')}
              onChange={(v) => updatePrefs.mutate({ friend_completed_push: v })}
            />
            <ToggleRow
              title="Fechas límite de tareas"
              value={isOn('deadline_push')}
              onChange={(v) => updatePrefs.mutate({ deadline_push: v })}
              last
            />
          </Card>

          <SectionTitle gold="HORAS DE SILENCIO" />
          <Card>
            <ToggleRow
              title="Activar horas de silencio"
              subtitle="Pausar notificaciones de 22:00 a 08:00"
              value={quietOn}
              onChange={(v) =>
                updatePrefs.mutate(
                  v
                    ? { quiet_start: DEFAULT_QUIET_START, quiet_end: DEFAULT_QUIET_END }
                    : { quiet_start: null, quiet_end: null },
                )
              }
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
  header: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20, paddingTop: 12 },
  back: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: 20, paddingBottom: 48 },
});
