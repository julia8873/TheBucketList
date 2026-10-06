import React, { useState, useMemo } from 'react';
import { View, StyleSheet, Platform, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme, Typography, SectionLabel, SegmentedControl, FilterChip, TaskRow, AlbumCard, NewAlbumCard, FAB, spacing } from '@bucketlist/ui';
import { FlashList, MasonryFlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import { Swipeable } from 'react-native-gesture-handler';

import { useBuckets, useDeleteBucket } from '../../src/hooks/useBuckets';
import { useAlbums } from '../../src/hooks/useAlbums';
import { useAuthStore } from '../../src/stores/auth.store';
import { CalendarTab } from '../../src/components/CalendarTab';
import { categoryColors } from '@bucketlist/ui/src/tokens/colors';
import { isPast, differenceInDays } from 'date-fns';

type FilterType = 'all' | 'active' | 'completed' | 'expired';

export default function MyListScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { user } = useAuthStore();
  
  const [activeTab, setActiveTab] = useState('list');
  const [filter, setFilter] = useState<FilterType>('all');
  
  const { data: buckets, isLoading } = useBuckets(user?.id);
  const deleteBucket = useDeleteBucket();
  const { data: albums, isLoading: isLoadingAlbums } = useAlbums(user?.id);

  // Compute stats
  const totalCount = buckets?.length || 0;
  const sharedCount = buckets?.filter((b) => b.visibility === 'public' || b.visibility === 'followers').length || 0;

  // Filter items
  const filteredBuckets = useMemo(() => {
    if (!buckets) return [];
    
    return buckets.filter((b) => {
      if (filter === 'all') return true;
      if (filter === 'completed') return b.status === 'completed';
      
      const deadline = b.deadline ? new Date(b.deadline) : null;
      const expired = deadline ? (isPast(deadline) && differenceInDays(deadline, new Date()) < 0) : false;
      
      if (filter === 'expired') return expired && b.status !== 'completed';
      if (filter === 'active') return b.status !== 'completed' && !expired;
      
      return true;
    }).sort((a, b) => {
      // Sort by created_at desc (newest first)
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [buckets, filter]);

  const handleCreate = () => {
    router.push('/(modals)/create-bucket');
  };

  const renderHeader = () => (
    <View>
      {/* ── Header ─────────────────────────────────────── */}
      <View style={styles.header}>
        <SectionLabel highlight="MI" rest="LISTA" />
        <Typography variant="h1" color={theme.colors.foreground} style={styles.title}>
          Organiza tus sueños
        </Typography>
        <Typography variant="body" color={theme.colors.foregroundMuted}>
          {totalCount} tareas · {sharedCount} compartidas
        </Typography>
      </View>

      {/* ── Tabs ───────────────────────────────────────── */}
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

      {/* ── Filters ────────────────────────────────────── */}
      {activeTab === 'list' && (
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersContainer}
          style={{ flexGrow: 0, marginBottom: 16 }}
        >
          <FilterChip label="Todos" active={filter === 'all'} onPress={() => setFilter('all')} />
          <FilterChip label="Activos" active={filter === 'active'} onPress={() => setFilter('active')} />
          <FilterChip label="Completados" active={filter === 'completed'} onPress={() => setFilter('completed')} />
          <FilterChip label="Caducados" active={filter === 'expired'} onPress={() => setFilter('expired')} />
        </ScrollView>
      )}
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      
      {/* ── Content ────────────────────────────────────── */}
      <View style={styles.content}>
        {activeTab === 'list' && (
          <FlashList
            data={filteredBuckets}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            estimatedItemSize={80}
            ListHeaderComponent={renderHeader}
            ItemSeparatorComponent={() => <View style={{ height: spacing[3] }} />}
            renderItem={({ item }) => {
              const categoryColor = item.category?.color || categoryColors.other;
              // Extract subtasks progress (assuming API returns item_subtasks, if not it will just skip progress bar)
              const subtasksTotal = item.item_subtasks?.length || 0;
              const subtasksDone = item.item_subtasks?.filter((s: any) => s.done).length || 0;
              
              // Find thumbnail photo if any
              // (In real app, we need to join bucket_photos or use cover_url. Assuming no cover_url for now).
              
              const meta = item.category?.name_es 
                ? `${item.category.name_es}${subtasksTotal > 0 ? ` · ${subtasksDone} de ${subtasksTotal} pasos` : ''}`
                : undefined;

              const renderRightActions = (progress: any, dragX: any) => {
                const scale = dragX.interpolate({
                  inputRange: [-80, 0],
                  outputRange: [1, 0.5],
                  extrapolate: 'clamp',
                });
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
                      marginLeft: -20, // To hide behind the item
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
                    onPress={() => router.push(`/bucket/${item.id}`)}
                  />
                </Swipeable>
              );
            }}
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
          <MasonryFlashList
            data={[{ isNewCard: true, id: 'new-album' }, ...(albums || [])]}
            keyExtractor={(item: any) => item.id}
            numColumns={2}
            contentContainerStyle={styles.listContent}
            estimatedItemSize={200}
            ListHeaderComponent={renderHeader}
            renderItem={({ item, index }) => {
              const isRightColumn = index % 2 !== 0;
              const marginStyle = isRightColumn ? { marginLeft: 8 } : { marginRight: 8 };

              if (item.isNewCard) {
                return (
                  <View style={[{ marginBottom: 16 }, marginStyle]}>
                    <NewAlbumCard onPress={() => console.log('Create album')} />
                  </View>
                );
              }

              return (
                <View style={[{ marginBottom: 16 }, marginStyle]}>
                  <AlbumCard
                    title={item.title}
                    totalTasks={item.total_tasks}
                    completedTasks={item.completed_tasks}
                    coverUri={item.cover_path}
                    isShared={item.is_shared}
                    onPress={() => router.push(`/album/${item.id}` as any)}
                  />
                </View>
              );
            }}
          />
        )}
        
        {activeTab === 'calendar' && (
          <CalendarTab ListHeaderComponent={renderHeader()} />
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
    paddingBottom: 24,
    gap: 4,
  },
  title: {
    marginTop: 4,
    marginBottom: 4,
  },
  tabsContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
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
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 120, // space for FAB + TabBar
  },
  empty: {
    paddingTop: 60,
    alignItems: 'center',
  },
});
