import React, { useState, useMemo, useRef } from 'react';
import { View, StyleSheet, Pressable, ScrollView, Dimensions, Alert, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme, Typography, SegmentedControl, FilterChip, TaskRow, AlbumCard, NewAlbumCard, NoAlbumRow, FAB, spacing, useToast, Input } from '@bucketlist/ui';
import { gold } from '@bucketlist/ui/src/tokens/colors';
import { FlashList } from '@shopify/flash-list';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Swipeable } from 'react-native-gesture-handler';
import { Search, Trash2, CheckCircle2, X } from 'lucide-react-native';
import { Text, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { useBuckets, useDeleteBucket, useUpdateBucket } from '../../src/hooks/useBuckets';
import { useAlbums } from '../../src/hooks/useAlbums';
import { useAuthStore } from '../../src/stores/auth.store';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../src/services/supabase';
import { storageApi } from '../../src/services/api/storage';
import { CalendarTab } from '../../src/components/CalendarTab';
import { BucketCover } from '../../src/components/BucketCover';
import { categoryColors } from '@bucketlist/ui/src/tokens/colors';
import { isPast, differenceInCalendarDays } from 'date-fns';

type FilterType = 'all' | 'active' | 'completed' | 'expired';

const SCREEN_WIDTH = Dimensions.get('window').width;

export default function MyListScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { user } = useAuthStore();

  const [activeTab, setActiveTab] = useState('list');
  const params = useLocalSearchParams<{ filter?: string }>();
  const [filter, setFilter] = useState<FilterType>(
    params.filter === 'completed' || params.filter === 'active' || params.filter === 'expired' ? params.filter : 'all',
  );
  React.useEffect(() => {
    if (params.filter === 'completed' || params.filter === 'active' || params.filter === 'expired') setFilter(params.filter);
  }, [params.filter]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const { data: buckets, isLoading } = useBuckets(user?.id);
  const deleteBucket = useDeleteBucket();
  const updateBucket = useUpdateBucket();
  const { data: albums, isLoading: isLoadingAlbums } = useAlbums(user?.id);
  const toast = useToast();
  const swipeableRefs = useRef(new Map<string, Swipeable>());

  // Consulta de relación tareas ↔ álbumes para contar correctamente
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

  const unassignedCount = useMemo(() => {
    if (!buckets) return 0;
    if (!albumItems) return buckets.length;
    const inAnyAlbum = new Set(albumItems.map((i) => i.bucket_id));
    return buckets.filter((b) => !inAnyAlbum.has(b.id)).length;
  }, [buckets, albumItems]);

  // Compute stats
  const totalCount = buckets?.length || 0;
  const completedCount = buckets?.filter(b => b.status === 'completed').length || 0;

  // Filter items
  const filteredBuckets = useMemo(() => {
    if (!buckets) return [];

    let result = buckets.filter((b: any) => {
      if (filter === 'all') return true;
      if (filter === 'completed') return b.status === 'completed';

      const deadline = b.deadline ? new Date(b.deadline) : null;
      const expired = deadline ? (isPast(deadline) && differenceInCalendarDays(deadline, new Date()) < 0) : false;

      if (filter === 'expired') return expired && b.status !== 'completed';
      if (filter === 'active') return b.status !== 'completed' && !expired;

      return true;
    });

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((b: any) =>
        b.title?.toLowerCase().includes(q) ||
        b.location?.toLowerCase().includes(q) ||
        b.category?.name_es?.toLowerCase().includes(q) ||
        b.category?.name_en?.toLowerCase().includes(q)
      );
    }

    return result.sort((a: any, b: any) => {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [buckets, filter, searchQuery]);

  const listData = useMemo(() => {
    if (!filteredBuckets) return [];
    if (filter !== 'all') return filteredBuckets;

    const activeOrCompleted = filteredBuckets.filter(b => {
      const deadline = b.deadline ? new Date(b.deadline) : null;
      const expired = deadline ? (isPast(deadline) && differenceInCalendarDays(deadline, new Date()) < 0) : false;
      return !expired || b.status === 'completed';
    });

    const expired = filteredBuckets.filter(b => {
      const deadline = b.deadline ? new Date(b.deadline) : null;
      return deadline ? (isPast(deadline) && differenceInCalendarDays(deadline, new Date()) < 0) && b.status !== 'completed' : false;
    });

    if (expired.length > 0) {
      return [...activeOrCompleted, { isHeader: true, title: 'SE ME ESCAPÓ' }, ...expired];
    }
    return activeOrCompleted;
  }, [filteredBuckets, filter]);

  const filteredAlbums = useMemo(() => {
    if (!albums) return [];
    if (!searchQuery.trim()) return albums;
    const q = searchQuery.toLowerCase();
    return albums.filter((a: any) => a.title?.toLowerCase().includes(q) || a.description?.toLowerCase().includes(q));
  }, [albums, searchQuery]);

  const handleCreate = () => {
    router.push('/(modals)/create-bucket');
  };



  const renderTaskItem = ({ item }: { item: any }) => {
    if (item.isHeader) {
      return (
        <View style={{ marginTop: 28, marginBottom: 4 }}>
          <Text style={styles.expiredHeader}>{item.title}</Text>
        </View>
      );
    }

    const categoryColor = item.category?.color || categoryColors.other;
    const subtasksTotal = item.item_subtasks?.length || 0;
    const subtasksDone = item.item_subtasks?.filter((s: any) => s.done).length || 0;

    const deadlineDate = item.deadline ? new Date(item.deadline) : null;
    const isItemExpired = deadlineDate ? (isPast(deadlineDate) && differenceInCalendarDays(deadlineDate, new Date()) < 0) : false;
    const daysAgo = deadlineDate ? Math.abs(differenceInCalendarDays(deadlineDate, new Date())) : 0;

    let meta = item.category?.name_es || 'Sin categoría';
    if (isItemExpired && item.status !== 'completed') {
      meta = `Caducó hace ${daysAgo} días`;
    } else if (subtasksTotal > 0) {
      meta += ` · ${subtasksDone} de ${subtasksTotal} pasos`;
    } else if (item.location) {
      meta += ` · ${item.location}`;
    }

    const coverPath = item.cover_image || (item.bucket_photos?.[0]?.thumb_path || item.bucket_photos?.[0]?.storage_path);
    const isPreset = coverPath?.startsWith('preset:');
    const hasActualImage = !!coverPath && !isPreset;
    const imageUri = hasActualImage ? (coverPath.startsWith('http') ? coverPath : storageApi.getPublicUrl(coverPath)) : null;

    let gradientColors: readonly [string, string, ...string[]] = ['#2A2A2A', '#3A3A3A'];
    const catName = item.category?.name_es?.toLowerCase() || item.category?.slug?.toLowerCase() || '';
    if (catName.includes('viaj') || catName === 'travel') {
      gradientColors = ['#0F5C4A', '#1E8A5E'];
    } else if (catName.includes('aventura') || catName === 'adventure') {
      gradientColors = ['#2F6DB5', '#8EC5F2'];
    } else if (catName.includes('deporte') || catName === 'sport') {
      gradientColors = ['#F29A5C', '#D2562B'];
    } else {
      gradientColors = ['#5C4A0F', '#8A7A1E']; // coherent gold-ish fallback
    }

    const renderRightActions = (progress: any, dragX: any) => {
      return (
        <Pressable
          style={{
            width: 130,
            backgroundColor: theme.colors.error,
            borderTopRightRadius: 14,
            borderBottomRightRadius: 14,
            alignItems: 'flex-end',
            justifyContent: 'center',
            paddingRight: 25,
          }}
          onPress={() => deleteBucket.mutate(item.id)}
        >
          <View style={{ position: 'absolute', left: -100, top: 0, bottom: 0, width: 100, backgroundColor: theme.colors.error }} />
          <Trash2 color={theme.colors.errorForeground} size={24} />
        </Pressable>
      );
    };

    const renderLeftActions = (progress: any, dragX: any) => {
      if (item.status === 'completed') return null;
      return (
        <Pressable
          style={{
            width: 130,
            backgroundColor: '#34C759',
            borderTopLeftRadius: 14,
            borderBottomLeftRadius: 14,
            alignItems: 'flex-start',
            justifyContent: 'center',
            paddingLeft: 25,
          }}
          onPress={() => updateBucket.mutate({ id: item.id, data: { status: 'completed', completed_at: new Date() } as any })}
        >
          <View style={{ position: 'absolute', right: -100, top: 0, bottom: 0, width: 100, backgroundColor: '#34C759' }} />
          <CheckCircle2 color="#FFFFFF" size={24} />
        </Pressable>
      );
    };

    return (
      <Swipeable
        ref={(ref) => {
          if (ref) swipeableRefs.current.set(item.id, ref);
          else swipeableRefs.current.delete(item.id);
        }}
        renderRightActions={renderRightActions}
        renderLeftActions={renderLeftActions}
        overshootRight={false}
        overshootLeft={false}
        onSwipeableOpen={(direction) => {
          if (direction === 'left' && item.status !== 'completed') {
            updateBucket.mutate({ id: item.id, data: { status: 'completed', completed_at: new Date() } as any });
            toast.show({ message: 'Tarea completada 🎉' });
            swipeableRefs.current.get(item.id)?.close();
          } else if (direction === 'right') {
            Alert.alert(
              'Eliminar tarea',
              '¿Estás seguro de que quieres eliminar esta tarea?',
              [
                { text: 'Cancelar', style: 'cancel', onPress: () => swipeableRefs.current.get(item.id)?.close() },
                { text: 'Eliminar', style: 'destructive', onPress: () => deleteBucket.mutate(item.id) }
              ]
            );
          }
        }}
      >
        <TaskRow
          title={item.title}
          meta={meta}
          deadline={item.deadline}
          expiredAction={isItemExpired && item.status !== 'completed'}
          thumbnailElement={
            isItemExpired && item.status !== 'completed' ? (
              <View style={{ flex: 1, backgroundColor: '#202020', borderRadius: 12 }} />
            ) : imageUri ? (
              <Image source={{ uri: imageUri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
            ) : (
              <LinearGradient
                colors={gradientColors}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
            )
          }
          subtasksDone={subtasksDone}
          subtasksTotal={subtasksTotal}
          counterCount={(item as any).counter_count}
          counterTarget={(item as any).counter_target}
          onPress={() => router.push(`/bucket/${item.id}`)}
        />
      </Swipeable>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: '#0E0E0E' }]} edges={['top']}>

      {/* ── Header: exact title hierarchy from the reference ── */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mi Lista</Text>
      </View>

      {/* ── Tabs (always visible, full width) ───────────── */}
      <View style={styles.tabsContainer}>
        <SegmentedControl
          options={[
            { key: 'list', label: 'Lista' },
            { key: 'albums', label: 'Álbumes' },
            { key: 'calendar', label: 'Calendario' },
          ]}
          selected={activeTab}
          onChange={setActiveTab}
        />
      </View>

      {/* ── Search Bar ──────────────────────────────────── */}
      {(activeTab === 'list' || activeTab === 'albums') && (
        <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
          <Input
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder={activeTab === 'list' ? 'Buscar tareas...' : 'Buscar álbumes...'}
            leftIcon={<Search size={18} color="#9A9A9A" />}
            rightIcon={
              searchQuery.trim() ? (
                <Pressable onPress={() => setSearchQuery('')} hitSlop={10}>
                  <X size={18} color="#9A9A9A" />
                </Pressable>
              ) : undefined
            }
          />
        </View>
      )}



      {/* ── Content ────────────────────────────────────── */}
      <View style={styles.content}>
        {activeTab === 'list' && (
          <FlashList
            data={listData}
            keyExtractor={(item: any) => item.id || item.title}
            contentContainerStyle={styles.listContent}
            estimatedItemSize={80}
            ItemSeparatorComponent={() => <View style={{ height: spacing[3] }} />}
            renderItem={renderTaskItem}
            ListHeaderComponent={
              <View>
                {/* Stats */}
                <View style={[styles.statsContainer, { marginHorizontal: 0 }]}>
                  <View style={styles.statColumn}>
                    <Text style={styles.statNumber}>{completedCount}</Text>
                    <Text style={styles.statLabel}>Completadas</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.statColumn}>
                    <Text style={styles.statNumber}>{totalCount}</Text>
                    <Text style={styles.statLabel}>En la lista</Text>
                  </View>
                </View>

                {/* Filtros */}
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.filtersContainer}
                  style={{ flexGrow: 0, marginBottom: 16, marginHorizontal: -20 }}
                >
                  <FilterChip label="Todas" active={filter === 'all'} onPress={() => setFilter('all')} />
                  <FilterChip label="En curso" active={filter === 'active'} onPress={() => setFilter('active')} />
                  <FilterChip label="Completadas" active={filter === 'completed'} onPress={() => setFilter('completed')} />
                  <FilterChip label="Se me escapó" active={filter === 'expired'} onPress={() => setFilter('expired')} />
                </ScrollView>
              </View>
            }
            ListEmptyComponent={() => (
              <View style={styles.empty}>
                <Typography variant="body" color={theme.colors.foregroundMuted}>
                  No hay tareas aquí.
                </Typography>
              </View>
            )}
          />
        )}

        {activeTab === 'albums' && (
          <ScrollView contentContainerStyle={styles.albumsContent}>
            {/* Label */}
            <View style={styles.albumsLabelRow}>
              <Typography variant="caption" color={gold[400]} style={styles.albumsLabelHighlight}>TUS </Typography>
              <Typography variant="caption" color="#FFF" style={styles.albumsLabel}>ÁLBUMES</Typography>
            </View>

            {/* Grid */}
            <View style={styles.albumGrid}>
              {(filteredAlbums || []).map((item: any, index: number) => (
                <AlbumCard
                  key={item.id}
                  title={item.title}
                  totalTasks={item.total_tasks ?? 0}
                  completedTasks={item.completed_tasks ?? 0}
                  coverUri={item.cover_path}
                  isShared={item.is_shared}
                  colorIndex={index}
                  onPress={() => router.push(`/album/${item.id}` as any)}
                />
              ))}
              <NewAlbumCard onPress={() => router.push('/(modals)/create-album')} />
            </View>

            {/* Sin álbum row */}
            <NoAlbumRow
              count={unassignedCount}
              onPress={() => router.push('/album/unassigned')}
            />
          </ScrollView>
        )}

        {activeTab === 'calendar' && (
          <CalendarTab />
        )}
      </View>

      {/* ── FAB ────────────────────────────────────────── */}
      {activeTab === 'list' && (
        <FAB onPress={handleCreate} bottomOffset={24} />
      )}

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontFamily: 'PlayfairDisplay_700Bold',
    fontSize: 26,
    color: '#FFF',
  },
  tabsContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#2A2A2A',
    marginBottom: 16,
    marginHorizontal: 20,
  },
  statColumn: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    height: '100%',
    backgroundColor: '#2A2A2A',
  },
  statNumber: {
    fontFamily: 'PlayfairDisplay_700Bold',
    fontSize: 18,
    color: '#FFF',
  },
  statLabel: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: '#9A9A9A',
    marginTop: 2,
  },
  filtersContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingRight: 40,
    gap: 8,
  },
  content: {
    flex: 1,
  },
  expiredHeader: {
    fontFamily: 'PlayfairDisplay_700Bold',
    fontSize: 13,
    color: '#8A8A80',
    letterSpacing: 1.5,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 120,
  },
  albumsContent: {
    paddingHorizontal: 20,
    paddingBottom: 120,
  },
  albumsLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  albumsLabelHighlight: {
    fontWeight: '800',
    letterSpacing: 1.2,
    fontSize: 14,
  },
  albumsLabel: {
    fontWeight: '700',
    letterSpacing: 1.2,
    fontSize: 14,
  },
  albumGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 12,
  },
  empty: {
    paddingTop: 60,
    alignItems: 'center',
  },
});
