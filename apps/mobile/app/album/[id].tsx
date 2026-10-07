import React, { useMemo } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Typography, useTheme, TaskRow, spacing } from '@bucketlist/ui';
import { FlashList } from '@shopify/flash-list';
import { Swipeable } from 'react-native-gesture-handler';
import { ArrowLeft } from 'lucide-react-native';
import { useBuckets, useDeleteBucket } from '../../src/hooks/useBuckets';
import { useAlbums } from '../../src/hooks/useAlbums';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../src/services/supabase';
import { useAuthStore } from '../../src/stores/auth.store';
import { categoryColors } from '@bucketlist/ui/src/tokens/colors';

export default function AlbumScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { theme } = useTheme();
  const router = useRouter();
  const { user } = useAuthStore();
  
  const { data: buckets } = useBuckets(user?.id);
  const deleteBucket = useDeleteBucket();
  const { data: albums } = useAlbums(user?.id);

  // La relación tarea ↔ álbum vive en album_items, no en buckets
  const { data: albumItems } = useQuery({
    queryKey: ['albums', 'items', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('album_items')
        .select('album_id, bucket_id');
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  const albumInfo = useMemo(() => {
    if (id === 'unassigned') {
      return { title: 'Sin álbum' };
    }
    return albums?.find(a => a.id === id) || { title: 'Cargando...' };
  }, [id, albums]);

  const filteredBuckets = useMemo(() => {
    if (!buckets || !albumItems) return [];

    const inThisAlbum = new Set(
      albumItems.filter((i) => i.album_id === id).map((i) => i.bucket_id),
    );
    const inAnyAlbum = new Set(albumItems.map((i) => i.bucket_id));

    return buckets
      .filter((b) => (id === 'unassigned' ? !inAnyAlbum.has(b.id) : inThisAlbum.has(b.id)))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [buckets, albumItems, id]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft color={theme.colors.foreground} size={24} />
        </Pressable>
        <Typography variant="h1" color={theme.colors.foreground} style={styles.title}>
          {albumInfo.title}
        </Typography>
      </View>

      <View style={styles.content}>
        <FlashList
          data={filteredBuckets}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          estimatedItemSize={80}
          ItemSeparatorComponent={() => <View style={{ height: spacing[3] }} />}
          renderItem={({ item }) => {
            const categoryColor = item.category?.color || categoryColors.other;
            const subtasksTotal = item.item_subtasks?.length || 0;
            const subtasksDone = item.item_subtasks?.filter((s: any) => s.done).length || 0;

            const meta = item.category?.name_es
              ? `${item.category.name_es}${subtasksTotal > 0 ? ` · ${subtasksDone} de ${subtasksTotal} pasos` : ''}`
              : undefined;

            const renderRightActions = (progress: any, dragX: any) => {
              return (
                <Pressable
                  style={{
                    backgroundColor: theme.colors.error,
                    justifyContent: 'center',
                    alignItems: 'flex-end',
                    paddingRight: 20,
                    borderRadius: 16,
                    height: '100%',
                    width: 100,
                    marginLeft: -20,
                  }}
                  onPress={() => {
                    deleteBucket.mutate(item.id);
                  }}
                >
                  <Typography variant="bodySemibold" color={theme.colors.errorForeground}>
                    Eliminar
                  </Typography>
                </Pressable>
              );
            };

            return (
              <Swipeable
                renderRightActions={renderRightActions}
                overshootRight={false}
              >
                <TaskRow
                  title={item.title}
                  meta={meta}
                  deadline={item.deadline}
                  thumbnailColor={categoryColor}
                  subtasksDone={subtasksDone}
                  subtasksTotal={subtasksTotal}
                  counterCount={(item as any).counter_count}
                  counterTarget={(item as any).counter_target}
                  onPress={() => router.push(`/bucket/${item.id}`)}
                />
              </Swipeable>
            );
          }}
          ListEmptyComponent={
            albumItems ? (
              <View style={styles.empty}>
                <Typography variant="body" color={theme.colors.foregroundMuted}>
                  No hay tareas en este álbum.
                </Typography>
              </View>
            ) : null
          }
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 24,
    gap: 16,
  },
  backButton: {
    padding: 4,
    marginLeft: -4,
  },
  title: {
    marginBottom: 0,
    flex: 1,
  },
  content: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 120,
  },
  empty: {
    paddingTop: 60,
    alignItems: 'center',
  },
});
