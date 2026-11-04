import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Check, ListChecks } from 'lucide-react-native';
import { Typography, useTheme } from '@bucketlist/ui';
import { gold } from '@bucketlist/ui/src/tokens/colors';
import { useTranslation } from '@bucketlist/shared';
import { supabase } from '../services/supabase';
import { useAuthStore } from '../stores/auth.store';
import { MENTION_TASK_COLUMNS, MentionThumb, type MentionTask } from './TaskMentionPickerSheet';
import { styles as sheetStyles } from '@/features/bucket-detail/styles/bucket-detail.styles';

export type AlbumPickableTask = MentionTask;

interface AlbumTaskPickerSheetProps {
  visible: boolean;
  /** Tareas ya elegidas (llevan check). */
  selected: AlbumPickableTask[];
  /** Ids que no deben aparecer (p. ej. tareas que ya están en el álbum). */
  excludeIds?: string[];
  onToggle: (task: AlbumPickableTask) => void;
  onClose: () => void;
}

/**
 * Hoja inferior para elegir las tareas que se añaden a un álbum desde su formulario:
 * las propias, las de colaboraciones aceptadas y las de álbumes compartidos (dueño o miembro).
 * Se puede marcar varias; tocar una tarea la añade o la quita sin cerrar la hoja.
 */
export function AlbumTaskPickerSheet({ visible, selected, excludeIds = [], onToggle, onClose }: AlbumTaskPickerSheetProps) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const [query, setQuery] = useState('');
  const [tasks, setTasks] = useState<AlbumPickableTask[]>([]);
  const [loading, setLoading] = useState(false);
  const excludeKey = excludeIds.join(',');

  useEffect(() => {
    if (visible) setQuery('');
  }, [visible]);

  useEffect(() => {
    if (!visible || !user?.id) return;
    let mounted = true;
    setLoading(true);
    const timer = setTimeout(
      async () => {
        try {
          const trimmed = query.trim().replace(/[%,()]/g, ' ');
          const userId = user.id;

          // 1) Tareas propias.
          let ownQuery = supabase
            .from('buckets')
            .select(MENTION_TASK_COLUMNS)
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(80);
          if (trimmed) ownQuery = ownQuery.ilike('title', `%${trimmed}%`);

          // 2) En paralelo: colaboraciones aceptadas y álbumes compartidos (como miembro o dueño).
          //    Solo 'accepted': con una invitación pendiente RLS no deja enlazar la tarea a un álbum.
          const safe = <T,>(p: PromiseLike<T>, fallback: T): Promise<T> =>
            Promise.resolve(p).then(
              (r) => r,
              () => fallback,
            );
          const empty = { data: [] as any[], error: null };
          const [ownRes, collabRes, memberRes, ownedAlbumsRes] = await Promise.all([
            ownQuery,
            safe(
              supabase.from('bucket_collaborators').select('bucket_id').eq('user_id', userId).eq('status', 'accepted'),
              empty as any,
            ),
            safe(
              supabase.from('album_members').select('album_id').eq('user_id', userId).eq('status', 'accepted'),
              empty as any,
            ),
            safe(supabase.from('albums').select('id').eq('owner_id', userId), empty as any),
          ]);
          if (ownRes.error || !mounted) return;

          const ownList = (ownRes.data ?? []) as unknown as AlbumPickableTask[];
          const ownIdSet = new Set(ownList.map((x) => x.id));
          const extraIds = new Set<string>();
          ((collabRes.data ?? []) as any[]).forEach((c) => {
            if (c.bucket_id && !ownIdSet.has(c.bucket_id)) extraIds.add(c.bucket_id);
          });

          // 3) Tareas contenidas en esos álbumes compartidos.
          const sharedAlbumIds = Array.from(
            new Set([
              ...((memberRes.data ?? []) as any[]).map((m) => m.album_id),
              ...((ownedAlbumsRes.data ?? []) as any[]).map((a) => a.id),
            ]),
          );
          if (sharedAlbumIds.length > 0) {
            const { data: albumItems } = await safe(
              supabase.from('album_items').select('bucket_id').in('album_id', sharedAlbumIds),
              empty as any,
            );
            ((albumItems ?? []) as any[]).forEach((ai) => {
              if (ai.bucket_id && !ownIdSet.has(ai.bucket_id)) extraIds.add(ai.bucket_id);
            });
          }

          // 4) Datos completos de las tareas ajenas (con el mismo filtro de búsqueda).
          let extraList: AlbumPickableTask[] = [];
          if (extraIds.size > 0) {
            let extraQuery = supabase
              .from('buckets')
              .select(MENTION_TASK_COLUMNS)
              .in('id', Array.from(extraIds))
              .order('created_at', { ascending: false })
              .limit(80);
            if (trimmed) extraQuery = extraQuery.ilike('title', `%${trimmed}%`);
            const { data: extraData, error: extraErr } = await extraQuery;
            if (!extraErr && extraData) extraList = extraData as unknown as AlbumPickableTask[];
          }

          if (!mounted) return;
          const excluded = new Set(excludeIds);
          const seen = new Set<string>();
          const merged = [...ownList, ...extraList]
            .filter((x) => {
              if (!x?.id || seen.has(x.id) || excluded.has(x.id)) return false;
              seen.add(x.id);
              return true;
            })
            .sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''));
          setTasks(merged);
        } catch (err) {
          console.warn('Error cargando tareas para el álbum:', err);
        } finally {
          if (mounted) setLoading(false);
        }
      },
      query ? 200 : 0,
    );
    return () => {
      mounted = false;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, query, user?.id, excludeKey]);

  if (!visible) return null;

  const selectedIds = new Set(selected.map((x) => x.id));

  return (
    <Modal visible transparent animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={sheetStyles.sheetBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel={t('collab_picker.close')} />
          <View
            style={[
              sheetStyles.bottomSheet,
              { backgroundColor: theme.colors.background, height: '78%', maxHeight: '78%', maxWidth: 620 },
            ]}
          >
            <View style={sheetStyles.sheetHandle} />
            <View style={sheetStyles.sheetHeader}>
              <Typography variant="h3" color={theme.colors.foreground}>
                {t('album_form.picker_title')}
              </Typography>
            </View>

            <View style={{ paddingBottom: 10 }}>
              <TextInput
                style={{
                  backgroundColor: theme.colors.surface,
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                  color: theme.colors.foreground,
                  padding: 12,
                  borderRadius: 12,
                  fontSize: 16,
                }}
                placeholder={t('tasks.search_task_placeholder')}
                placeholderTextColor={theme.colors.foregroundMuted}
                value={query}
                onChangeText={setQuery}
                autoCorrect={false}
              />
            </View>

            {loading && tasks.length === 0 ? (
              <View style={sheetStyles.sheetLoading}>
                <ActivityIndicator color={gold[400]} />
              </View>
            ) : tasks.length === 0 ? (
              <View style={{ alignItems: 'center', paddingVertical: 40, gap: 12, flex: 1 }}>
                <ListChecks color={theme.colors.foregroundMuted} size={36} />
                <Typography variant="body" color={theme.colors.foregroundMuted} style={{ textAlign: 'center' }}>
                  {query.trim() ? t('tasks.no_tasks_found') : t('album_form.picker_empty')}
                </Typography>
              </View>
            ) : (
              <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                {tasks.map((task) => {
                  const isSelected = selectedIds.has(task.id);
                  return (
                    <Pressable
                      key={task.id}
                      style={[sheetStyles.sheetOption, { minHeight: 68 }]}
                      onPress={() => onToggle(task)}
                    >
                      <View style={{ marginRight: 13 }}>
                        <MentionThumb task={task} size={48} />
                      </View>
                      <View style={sheetStyles.sheetOptionText}>
                        <Typography
                          variant="bodySemibold"
                          numberOfLines={2}
                          color={task.status === 'completed' ? theme.colors.foregroundMuted : theme.colors.foreground}
                        >
                          {task.title}
                        </Typography>
                      </View>
                      {isSelected && <Check color={gold[400]} size={21} />}
                    </Pressable>
                  );
                })}
                <View style={{ height: 12 }} />
              </ScrollView>
            )}

            <Pressable
              style={{
                backgroundColor: '#D4B13A',
                borderRadius: 26,
                height: 50,
                alignItems: 'center',
                justifyContent: 'center',
                marginTop: 10,
              }}
              onPress={onClose}
              accessibilityRole="button"
            >
              <Text style={{ color: '#111', fontSize: 16, fontFamily: 'Inter_700Bold' }}>
                {selected.length === 0
                  ? t('common.done')
                  : selected.length === 1
                    ? t('album_form.picker_confirm_single')
                    : t('album_form.picker_confirm_plural', { count: selected.length })}
              </Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
