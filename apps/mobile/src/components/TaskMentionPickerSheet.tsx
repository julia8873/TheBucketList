import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { Check, Link2, X } from 'lucide-react-native';
import { Typography, useTheme } from '@bucketlist/ui';
import { gold, dark } from '@bucketlist/ui/src/tokens/colors';
import { supabase } from '../services/supabase';
import { useAuthStore } from '../stores/auth.store';
import { BucketCover } from './BucketCover';
import { resolveTaskImage } from '../utils/taskImage';
import { styles as sheetStyles } from '@/features/bucket-detail/styles/bucket-detail.styles';

/**
 * Menú desplegable desde abajo para elegir las tareas que se mencionan desde otra tarea
 * (mismo patrón que "Seleccionar carpetas"): las tareas ya mencionadas llevan un check
 * y al tocar una se menciona / se quita, sin cerrar el menú.
 * Las tareas se muestran con su imagen y su título, igual que en Mi Lista.
 */

/** Campos que necesita una tarea para pintarse con su imagen (los mismos que usa Mi Lista). */
export const MENTION_TASK_COLUMNS =
  'id, title, status, user_id, created_at, cover_image, thumbnail_mode, thumbnail_photo_id, category:categories(slug), bucket_photos(id, storage_path, thumb_path, created_at)';

export type MentionTask = {
  id: string;
  title: string;
  status: string | null;
  user_id?: string;
  created_at?: string | null;
  cover_image?: string | null;
  thumbnail_mode?: string | null;
  thumbnail_photo_id?: string | null;
  category?: { slug?: string | null } | null;
  bucket_photos?: any[] | null;
};

/** Miniatura cuadrada de una tarea (foto elegida, última foto, portada o degradado automático). */
export function MentionThumb({ task, size = 48 }: { task: MentionTask; size?: number }) {
  const { theme } = useTheme();
  return (
    <View style={{ width: size, height: size, borderRadius: 12, overflow: 'hidden', backgroundColor: theme.colors.surface }}>
      <BucketCover
        value={resolveTaskImage(task as any, { preferThumb: true })}
        title={task.title}
        categorySlug={task.category?.slug}
        seed={task.id}
        iconSize={size}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}

type Props = {
  visible: boolean;
  /** Tarea desde la que se menciona (no aparece en la lista). */
  currentBucketId: string;
  /** Ids de las tareas ya mencionadas (llevan check). */
  mentionedIds: string[];
  /** Menciona o quita la mención de esa tarea. */
  onToggle: (task: MentionTask) => void;
  onClose: () => void;
};

const HIDDEN_Y = 700;

export function TaskMentionPickerSheet({ visible, currentBucketId, mentionedIds, onToggle, onClose }: Props) {
  const { theme } = useTheme();
  const { user } = useAuthStore();
  const [render, setRender] = useState(visible);
  const translateY = useRef(new Animated.Value(HIDDEN_Y)).current;
  const [query, setQuery] = useState('');
  const [tasks, setTasks] = useState<MentionTask[]>([]);
  const [loading, setLoading] = useState(false);

  // Entrada / salida animada.
  useEffect(() => {
    if (visible) {
      setRender(true);
      setQuery('');
      translateY.setValue(HIDDEN_Y);
      Animated.spring(translateY, {
        toValue: 0,
        damping: 24,
        stiffness: 220,
        mass: 0.8,
        useNativeDriver: true,
      }).start();
    } else if (render) {
      Animated.timing(translateY, { toValue: HIDDEN_Y, duration: 180, useNativeDriver: true }).start(() =>
        setRender(false),
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  // Carga de tareas (con buscador).
  useEffect(() => {
    if (!visible || !user?.id) return;
    let mounted = true;
    setLoading(true);

    const timer = setTimeout(
      async () => {
        try {
          const trimmed = query.trim().replace(/[%,()]/g, ' ');

          // Query de tareas propias
          let ownQuery = supabase
            .from('buckets')
            .select(MENTION_TASK_COLUMNS)
            .eq('user_id', user.id)
            .neq('id', currentBucketId)
            .order('created_at', { ascending: false })
            .limit(60);

          if (trimmed) ownQuery = ownQuery.ilike('title', `%${trimmed}%`);

          // En paralelo, obtener tareas propias, colaboraciones directas y álbumes compartidos
          const [ownRes, collabRes, albumMembersRes, ownedAlbumsRes] = await Promise.all([
            ownQuery,
            supabase
              .from('bucket_collaborators')
              .select('bucket_id')
              .eq('user_id', user.id)
              .in('status', ['accepted', 'pending'])
              .then(
                (res) => res,
                () => ({ data: [] as any[], error: null }),
              ),
            supabase
              .from('album_members')
              .select('album_id')
              .eq('user_id', user.id)
              .eq('status', 'accepted')
              .then(
                (res) => res,
                () => ({ data: [] as any[], error: null }),
              ),
            supabase
              .from('albums')
              .select('id')
              .eq('owner_id', user.id)
              .then(
                (res) => res,
                () => ({ data: [] as any[], error: null }),
              ),
          ]);

          const ownList = (ownRes.data ?? []) as unknown as MentionTask[];
          const ownIdSet = new Set(ownList.map((t) => t.id));

          // Recoger los IDs de colaboraciones y de álbumes que no estén ya en tareas propias
          const extraIds = new Set<string>();
          (collabRes.data ?? []).forEach((c: any) => {
            if (c.bucket_id && c.bucket_id !== currentBucketId && !ownIdSet.has(c.bucket_id)) {
              extraIds.add(c.bucket_id);
            }
          });

          const sharedAlbumIds = Array.from(
            new Set([
              ...(albumMembersRes.data ?? []).map((m: any) => m.album_id),
              ...(ownedAlbumsRes.data ?? []).map((a: any) => a.id),
            ]),
          );

          if (sharedAlbumIds.length > 0) {
            try {
              const { data: albumItemData } = await supabase
                .from('album_items')
                .select('bucket_id')
                .in('album_id', sharedAlbumIds);

              (albumItemData ?? []).forEach((ai: any) => {
                if (ai.bucket_id && ai.bucket_id !== currentBucketId && !ownIdSet.has(ai.bucket_id)) {
                  extraIds.add(ai.bucket_id);
                }
              });
            } catch (err) {
              console.warn('Error fetching shared album items for mentions:', err);
            }
          }

          const missingExtraIds = Array.from(extraIds);
          let extraList: MentionTask[] = [];

          if (missingExtraIds.length > 0) {
            let extraQuery = supabase
              .from('buckets')
              .select(MENTION_TASK_COLUMNS)
              .in('id', missingExtraIds)
              .neq('id', currentBucketId)
              .order('created_at', { ascending: false })
              .limit(60);

            if (trimmed) extraQuery = extraQuery.ilike('title', `%${trimmed}%`);

            const { data: extraData, error: extraErr } = await extraQuery;
            if (!extraErr && extraData) {
              extraList = extraData as unknown as MentionTask[];
            }
          }

          const combined = [...ownList, ...extraList];
          const seen = new Set<string>();
          const deduped: MentionTask[] = [];

          for (const item of combined) {
            if (item && item.id && !seen.has(item.id) && item.id !== currentBucketId) {
              seen.add(item.id);
              deduped.push(item);
            }
          }

          deduped.sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''));

          if (!ownRes.error && mounted) setTasks(deduped);
        } catch (err) {
          console.warn('Error cargando tareas para mencionar:', err);
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
  }, [visible, query, user?.id, currentBucketId]);

  if (!render) return null;

  const mentioned = new Set(mentionedIds);

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={sheetStyles.sheetBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
          <Animated.View
            style={[
              sheetStyles.bottomSheet,
              { backgroundColor: theme.colors.background, height: '78%', maxHeight: '78%', transform: [{ translateY }] },
            ]}
          >
            <View style={sheetStyles.sheetHandle} />

            <View style={sheetStyles.sheetHeader}>
              <Typography variant="h3" color={theme.colors.foreground}>
                Mencionar tareas
              </Typography>
              <Pressable style={sheetStyles.sheetClose} onPress={onClose}>
                <X color={theme.colors.foregroundMuted} size={20} />
              </Pressable>
            </View>

            <View style={{ paddingBottom: 10 }}>
              <TextInput
                style={{
                  backgroundColor: dark[400],
                  color: theme.colors.foreground,
                  padding: 12,
                  borderRadius: 12,
                  fontSize: 16,
                }}
                placeholder="Buscar tarea..."
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
              <View style={{ alignItems: 'center', paddingVertical: 40, gap: 12 }}>
                <Link2 color={theme.colors.foregroundMuted} size={36} />
                <Typography variant="body" color={theme.colors.foregroundMuted}>
                  {query.trim() ? 'No se encontraron tareas' : 'No tienes más tareas para mencionar'}
                </Typography>
              </View>
            ) : (
              <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                {tasks.map((task) => {
                  const isSelected = mentioned.has(task.id);
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
                <View style={{ height: 24 }} />
              </ScrollView>
            )}
          </Animated.View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
