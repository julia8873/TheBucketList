import React, { useState, useMemo } from 'react';
import { View, StyleSheet, Pressable, ScrollView, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme, Typography, SectionLabel, SegmentedControl, FilterChip, TaskRow, AlbumCard, NewAlbumCard, NoAlbumRow, FAB, spacing } from '@bucketlist/ui';
import { gold } from '@bucketlist/ui/src/tokens/colors';
import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import { Swipeable } from 'react-native-gesture-handler';

import { useBuckets, useDeleteBucket } from '../../src/hooks/useBuckets';
import { useAlbums } from '../../src/hooks/useAlbums';
import { useAuthStore } from '../../src/stores/auth.store';
import { CalendarTab } from '../../src/components/CalendarTab';
import { categoryColors } from '@bucketlist/ui/src/tokens/colors';
import { isPast, differenceInDays } from 'date-fns';

type FilterType = 'all' | 'active' | 'completed' | 'expired';

const SCREEN_WIDTH = Dimensions.get('window').width;

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
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [buckets, filter]);

  const handleCreate = () => {
    router.push('/(modals)/create-bucket');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      
      {/* ── Header (always visible, full width) ─────────── */}
      <View style={styles.header}>
        <SectionLabel highlight="MI" rest="LISTA" />
        <Typography variant="h1" color={theme.colors.foreground} style={styles.title}>
          Organiza tus sueños
        </Typography>
        <Typography variant="body" color={theme.colors.foregroundMuted}>
          {totalCount} tareas · {sharedCount} compartidas
        </Typography>
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

      {/* ── Filters (only for list tab) ─────────────────── */}
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

      {/* ── Content ────────────────────────────────────── */}
      <View style={styles.content}>
        {activeTab === 'list' && (
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
          <ScrollView contentContainerStyle={styles.albumsContent}>
            {/* Label */}
            <View style={styles.albumsLabelRow}>
              <Typography variant="caption" color={gold[400]} style={styles.albumsLabelHighlight}>TUS </Typography>
              <Typography variant="caption" color="#FFF" style={styles.albumsLabel}>ÁLBUMES</Typography>
            </View>

            {/* Grid */}
            <View style={styles.albumGrid}>
              {(albums || []).map((item: any, index: number) => (
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
              <NewAlbumCard onPress={() => console.log('Create album')} />
            </View>

            {/* Sin álbum row */}
            <NoAlbumRow
              count={(buckets || []).filter((b: any) => !b.album_id).length}
              onPress={() => {}}
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
