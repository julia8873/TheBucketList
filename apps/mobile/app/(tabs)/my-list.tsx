import React, { useCallback } from 'react';
import { View, Text, Pressable, ScrollView, RefreshControl, BackHandler } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  useTheme,
  SegmentedControl,
  AlbumCard,
  NoAlbumRow,
  NoAlbumCard,
  FAB,
  Input,
  PageTitle,
} from '@bucketlist/ui';
import { gold } from '@bucketlist/ui/src/tokens/colors';
import { FlashList } from '@shopify/flash-list';
import { useRouter, useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Search, X, Plus, ChevronLeft, Sparkles, ChevronRight } from 'lucide-react-native';
import { DraggableTaskList } from '@/components/DraggableTaskList';
import { BulkTaskActionBar } from '@/components/BulkTaskActionBar';
import { CalendarTab } from '@/components/CalendarTab';
import { TagFilterSheet } from '@/components/TagFilterSheet';
import {
  TaskRowSkeleton,
  TaskCompactSkeleton,
  TaskGallerySkeleton,
  AlbumCardSkeleton,
} from '@/components/TaskSkeletons';

import { useMyListState } from '@/features/my-list/hooks/useMyListState';
import { styles } from '@/features/my-list/styles/my-list.styles';
import { TaskListHeaderControls } from '@/features/my-list/components/TaskListHeaderControls';
import { AlbumListHeaderControls } from '@/features/my-list/components/AlbumListHeaderControls';
import { TaskItemRow } from '@/features/my-list/components/TaskItemRow';
import { TaskCompactItemRow } from '@/features/my-list/components/TaskCompactItemRow';
import { TaskGalleryItemCard } from '@/features/my-list/components/TaskGalleryItemCard';
import {
  AlbumCompactItemRow,
  AlbumListItemRow,
} from '@/features/my-list/components/AlbumItemComponents';
import { MyListSortModal } from '@/features/my-list/components/MyListSortModal';
import { MyListCustomizeModal } from '@/features/my-list/components/MyListCustomizeModal';
import { useMyListCustomizationStore } from '@/stores/myListCustomization.store';

const TaskSeparator = () => <View style={{ height: 10 }} />;

export default function MyListScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { t } = useTranslation();
  const state = useMyListState();
  const [goldTitle, ...restTitle] = t('nav.my_list', { defaultValue: 'Mi lista' }).split(' ');
  const [customizeModalVisible, setCustomizeModalVisible] = React.useState(false);
  const { taskViews, albumViews } = useMyListCustomizationStore();

  const renderTaskItem = useCallback(
    ({ item, drag, index }: { item: any; drag?: any; index?: number }) => {
      if (item.isHeader) {
        const isFirst = index === 0 || item.id === state.listData[0]?.id;
        return (
          <View key={item.id} style={{ marginTop: isFirst ? 0 : 20, marginBottom: 0 }}>
            <Text style={[styles.sectionHeader, { marginTop: 8, marginBottom: 4 }]}>{item.title}</Text>
          </View>
        );
      }
      const isOwner = !item.user_id || item.user_id === state.user?.id;
      const isExpired = item.status === 'expired';
      const isFav = state.isBucketFavorite(item.id);
      const isSel = state.selectedTaskIds.includes(item.id);
      const tagIds = state.tagUsage?.byItem[item.id] ?? (Array.isArray(item.tags) ? item.tags : []);
      const itemTagObjs = tagIds.map((tid: string) => state.tagsById.get(tid)).filter(Boolean);

      return (
        <TaskItemRow
          key={item.id}
          item={item}
          drag={drag}
          isItemOwner={isOwner}
          isItemExpired={isExpired}
          daysAgo={0}
          itemTags={itemTagObjs}
          isFav={isFav}
          isSelected={isSel}
          isSelectionMode={state.isSelectionMode}
          customization={taskViews.list}
          onDelete={(id) => state.deleteBucket.mutate(id)}
          onComplete={(id) => {
            const next = item.status === 'completed' ? 'in_progress' : 'completed';
            state.updateBucket.mutate({ id, data: { status: next } });
          }}
          onPress={() => {
            if (state.isSelectionMode) state.toggleSelectTask(item.id);
            else router.push(`/bucket/${item.id}` as any);
          }}
          onLongPress={() => {
            if (!state.isSelectionMode) {
              state.setIsSelectionMode(true);
              state.setSelectedTaskIds([item.id]);
            }
          }}
          onToggleSelect={() => state.toggleSelectTask(item.id)}
          swipeableRefSetter={(ref) => {
            if (ref) state.swipeableRefs.current.set(item.id, ref);
            else state.swipeableRefs.current.delete(item.id);
          }}
          theme={theme}
        />
      );
    },
    [
      state.listData,
      state.user?.id,
      state.isBucketFavorite,
      state.selectedTaskIds,
      state.tagsById,
      state.tagUsage,
      state.isSelectionMode,
      state.deleteBucket,
      state.updateBucket,
      state.toggleSelectTask,
      state.setIsSelectionMode,
      state.setSelectedTaskIds,
      state.swipeableRefs,
      router,
      theme,
      taskViews.list,
    ]
  );

  const renderCompactTask = useCallback(
    ({ item, drag }: { item: any; drag?: any }) => {
      if (item.isHeader) {
        return (
          <View key={item.id} style={{ marginTop: 24, marginBottom: 12 }}>
            <Text style={styles.sectionHeader}>{item.title}</Text>
          </View>
        );
      }
      const tagIds = state.tagUsage?.byItem[item.id] ?? (Array.isArray(item.tags) ? item.tags : []);
      const itemTagObjs = tagIds.map((tid: string) => state.tagsById.get(tid)).filter(Boolean);

      return (
        <TaskCompactItemRow
          key={item.id}
          item={item}
          drag={drag}
          isSelected={state.selectedTaskIds.includes(item.id)}
          isSelectionMode={state.isSelectionMode}
          isFav={state.isBucketFavorite(item.id)}
          itemTags={itemTagObjs}
          customization={taskViews.compact}
          onPress={() => {
            if (state.isSelectionMode) state.toggleSelectTask(item.id);
            else router.push(`/bucket/${item.id}` as any);
          }}
          onLongPress={() => {
            if (!state.isSelectionMode) {
              state.setIsSelectionMode(true);
              state.setSelectedTaskIds([item.id]);
            }
          }}
          onToggleSelect={() => state.toggleSelectTask(item.id)}
          onToggleComplete={() => {
            const next = item.status === 'completed' ? 'in_progress' : 'completed';
            state.updateBucket.mutate({ id: item.id, data: { status: next } });
          }}
        />
      );
    },
    [
      state.selectedTaskIds,
      state.tagsById,
      state.tagUsage,
      state.isSelectionMode,
      state.isBucketFavorite,
      state.toggleSelectTask,
      state.setIsSelectionMode,
      state.setSelectedTaskIds,
      state.updateBucket,
      router,
      taskViews.compact,
    ]
  );

  const renderCompactAlbum = useCallback(
    ({ item, drag }: { item: any; drag?: any }) => (
      <AlbumCompactItemRow
        key={item.id}
        item={item}
        drag={drag}
        isFav={state.isAlbumFavorite(item.id)}
        customization={albumViews.compact}
        onPress={() => router.push(`/album/${item.id}` as any)}
      />
    ),
    [state.isAlbumFavorite, router, albumViews.compact]
  );

  const renderListAlbum = useCallback(
    ({ item, drag, index = 0 }: { item: any; drag?: any; index?: number }) => (
      <AlbumListItemRow
        key={item.id}
        item={item}
        drag={drag}
        index={index}
        isFav={state.isAlbumFavorite(item.id)}
        customization={albumViews.list}
        onPress={() => router.push(`/album/${item.id}` as any)}
        onToggleFavorite={() =>
          state.toggleFavoriteAlbum.mutate({
            albumId: item.id,
            currentlyFavorite: state.isAlbumFavorite(item.id),
          })
        }
      />
    ),
    [state.isAlbumFavorite, state.toggleFavoriteAlbum, router, albumViews.list]
  );

  const renderGalleryAlbum = useCallback(
    ({ item, index = 0 }: { item: any; index?: number }) => (
      <AlbumCard
        key={item.id}
        title={item.title}
        totalTasks={item.total_tasks ?? 0}
        completedTasks={item.completed_tasks ?? 0}
        coverUri={item.cover_path}
        isShared={item.is_shared}
        isFavorite={state.isAlbumFavorite(item.id)}
        onToggleFavorite={() =>
          state.toggleFavoriteAlbum.mutate({
            albumId: item.id,
            currentlyFavorite: state.isAlbumFavorite(item.id),
          })
        }
        priority={item.priority}
        isClosed={item.is_closed}
        colorIndex={index}
        showPriority={albumViews.gallery.showPriority}
        showTaskCount={albumViews.gallery.showTaskCount}
        showProgress={albumViews.gallery.showProgress}
        showBadges={albumViews.gallery.showBadges}
        showDate={albumViews.gallery.showDate}
        showDescription={albumViews.gallery.showDescription}
        createdAt={item.created_at}
        description={item.description}
        onPress={() => router.push(`/album/${item.id}` as any)}
      />
    ),
    [state.isAlbumFavorite, state.toggleFavoriteAlbum, albumViews.gallery, router]
  );

  const isFromProfile = state.from === 'profile';
  const handleGoBackToProfile = useCallback(() => {
    router.navigate('/(tabs)/profile');
  }, [router]);

  useFocusEffect(
    useCallback(() => {
      if (!isFromProfile) return;
      const onBackPress = () => {
        handleGoBackToProfile();
        return true;
      };
      const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => sub.remove();
    }, [isFromProfile, handleGoBackToProfile])
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: 10 }}>
          {isFromProfile && (
            <Pressable
              onPress={handleGoBackToProfile}
              hitSlop={12}
              style={{
                width: 38,
                height: 38,
                borderRadius: 19,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: theme.colors.surface,
                borderWidth: 1,
                borderColor: theme.colors.border,
              }}
              accessibilityRole="button"
              accessibilityLabel="Volver al perfil"
            >
              <ChevronLeft size={22} color={theme.colors.foreground} strokeWidth={2} />
            </Pressable>
          )}
          <PageTitle gold={goldTitle} rest={restTitle.join(' ')} />
        </View>
        <Pressable
          onPress={state.toggleSearch}
          hitSlop={12}
          style={[styles.searchIconButton, state.isSearching && styles.searchIconButtonActive]}
        >
          {state.isSearching ? (
            <X size={20} color={gold[400]} />
          ) : (
            <Search size={20} color={theme.colors.foregroundMuted} />
          )}
        </Pressable>
      </View>

      {/* Barra de búsqueda */}
      {state.isSearching && (
        <View style={styles.searchBarContainer}>
          <Input
            placeholder="Buscar por título o descripción..."
            value={state.searchQuery}
            onChangeText={state.setSearchQuery}
            autoFocus
            leftIcon={<Search size={16} color={theme.colors.foregroundMuted} />}
            rightIcon={
              state.searchQuery.length > 0 ? (
                <Pressable onPress={() => state.setSearchQuery('')} hitSlop={8}>
                  <X size={16} color={theme.colors.foregroundMuted} />
                </Pressable>
              ) : undefined
            }
          />
        </View>
      )}

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <SegmentedControl
          options={[
            { key: 'list', label: 'Tareas' },
            { key: 'albums', label: 'Álbumes' },
            { key: 'calendar', label: 'Calendario' },
          ]}
          selected={state.activeTab}
          onChange={state.setActiveTab}
        />
      </View>

      {/* Tab: Tareas */}
      {state.activeTab === 'list' && (
        <View style={{ flex: 1 }}>
          <View style={{ paddingHorizontal: 20 }}>
            <TaskListHeaderControls
              filter={state.filter}
              setFilter={state.setFilter}
              priorityFilter={state.priorityFilter}
              setPriorityFilter={state.setPriorityFilter}
              onOpenTagFilterSheet={() => state.setTagSheetOpen(true)}
              selectedTagIds={state.selectedTagIds}
              selectedTags={state.selectedTags}
              onRemoveTagFilter={(id) =>
                state.setSelectedTagIds(state.selectedTagIds.filter((tid) => tid !== id))
              }
              isSelectionMode={state.isSelectionMode}
              onToggleSelectionMode={() => {
                if (state.isSelectionMode) state.handleExitSelection();
                else state.setIsSelectionMode(true);
              }}
              taskViewMode={state.taskViewMode}
              setTaskViewMode={state.setTaskViewMode}
              tasksCount={state.filteredBuckets.length}
              sortField={state.sortField}
              sortDir={state.sortDir}
              isReordering={state.isReordering}
              setIsReordering={state.setIsReordering}
              isSearching={state.isSearching}
              sortTriggerRef={state.sortTriggerRef}
              openSortMenu={state.openSortMenu}
              onOpenCustomize={() => setCustomizeModalVisible(true)}
              theme={theme}
            />
          </View>

          {state.isLoading ? (
            <View style={{ paddingHorizontal: 20, paddingTop: 10 }}>
              {state.taskViewMode === 'gallery' ? (
                <View style={styles.galleryGrid}>
                  <TaskGallerySkeleton />
                  <TaskGallerySkeleton />
                </View>
              ) : state.taskViewMode === 'compact' ? (
                <View style={{ gap: 8 }}>
                  <TaskCompactSkeleton />
                  <TaskCompactSkeleton />
                  <TaskCompactSkeleton />
                </View>
              ) : (
                <View style={{ gap: 12 }}>
                  <TaskRowSkeleton />
                  <TaskRowSkeleton />
                </View>
              )}
            </View>
          ) : state.filteredBuckets.length === 0 ? (
            <View style={styles.empty}>
              <Text style={{ color: theme.colors.foregroundMuted, fontSize: 14 }}>
                {state.searchQuery ? 'No se encontraron tareas' : 'No tienes tareas en esta vista'}
              </Text>
            </View>
          ) : state.isReordering ? (
            <ScrollView
              contentContainerStyle={styles.listContent}
              scrollEnabled={!state.dragging}
            >
              {state.sortField === 'status' ? (
                state.taskSections.map((sec) => {
                  if (sec.items.length === 0) return null;
                  return (
                    <View key={sec.key} style={styles.sectionBlock}>
                      <Text style={styles.sectionHeader}>{sec.title}</Text>
                      <DraggableTaskList
                        items={sec.items}
                        gap={10}
                        renderItem={(item, drag) =>
                          state.taskViewMode === 'compact'
                            ? renderCompactTask({ item, drag })
                            : renderTaskItem({ item, drag })
                        }
                        onReorder={(ids) => state.handleReorderSection(sec.key, ids)}
                        onDraggingChange={state.setDragging}
                      />
                    </View>
                  );
                })
              ) : (
                <DraggableTaskList
                  items={state.sortedFlatBuckets}
                  gap={10}
                  renderItem={(item, drag) =>
                    state.taskViewMode === 'compact'
                      ? renderCompactTask({ item, drag })
                      : renderTaskItem({ item, drag })
                  }
                  onReorder={(ids) => void state.persistTaskOrder(ids)}
                  onDraggingChange={state.setDragging}
                />
              )}
            </ScrollView>
          ) : state.taskViewMode === 'gallery' ? (
            <ScrollView
              contentContainerStyle={styles.listContent}
              refreshControl={
                <RefreshControl refreshing={state.refreshing} onRefresh={state.onRefresh} tintColor={gold[400]} />
              }
            >
              {state.sortField === 'status' ? (
                state.taskSections.map((sec) => {
                  if (sec.items.length === 0) return null;
                  return (
                    <View key={sec.key} style={styles.sectionBlock}>
                      <Text style={styles.sectionHeader}>{sec.title}</Text>
                      <View style={styles.galleryGrid}>
                        {sec.items.map((item: any) => {
                          const tagIds = state.tagUsage?.byItem[item.id] ?? (Array.isArray(item.tags) ? item.tags : []);
                          const itemTagObjs = tagIds.map((tid: string) => state.tagsById.get(tid)).filter(Boolean);
                          return (
                            <TaskGalleryItemCard
                              key={item.id}
                              item={item}
                              isSingle={sec.items.length === 1}
                              isSelected={state.selectedTaskIds.includes(item.id)}
                              isSelectionMode={state.isSelectionMode}
                              isFav={state.isBucketFavorite(item.id)}
                              itemTags={itemTagObjs}
                              customization={taskViews.gallery}
                              onPress={() => {
                                if (state.isSelectionMode) state.toggleSelectTask(item.id);
                                else router.push(`/bucket/${item.id}` as any);
                              }}
                              onLongPress={() => {
                                if (!state.isSelectionMode) {
                                  state.setIsSelectionMode(true);
                                  state.setSelectedTaskIds([item.id]);
                                }
                              }}
                            />
                          );
                        })}
                      </View>
                    </View>
                  );
                })
              ) : (
                <View style={styles.galleryGrid}>
                  {state.sortedFlatBuckets.map((item: any) => {
                    const tagIds = state.tagUsage?.byItem[item.id] ?? (Array.isArray(item.tags) ? item.tags : []);
                    const itemTagObjs = tagIds.map((tid: string) => state.tagsById.get(tid)).filter(Boolean);
                    return (
                      <TaskGalleryItemCard
                        key={item.id}
                        item={item}
                        isSingle={state.sortedFlatBuckets.length === 1}
                        isSelected={state.selectedTaskIds.includes(item.id)}
                        isSelectionMode={state.isSelectionMode}
                        isFav={state.isBucketFavorite(item.id)}
                        itemTags={itemTagObjs}
                        customization={taskViews.gallery}
                        onPress={() => {
                          if (state.isSelectionMode) state.toggleSelectTask(item.id);
                          else router.push(`/bucket/${item.id}` as any);
                        }}
                        onLongPress={() => {
                          if (!state.isSelectionMode) {
                            state.setIsSelectionMode(true);
                            state.setSelectedTaskIds([item.id]);
                          }
                        }}
                      />
                    );
                  })}
                </View>
              )}
            </ScrollView>
          ) : state.taskViewMode === 'compact' ? (
            <ScrollView
              contentContainerStyle={styles.listContent}
              refreshControl={
                <RefreshControl refreshing={state.refreshing} onRefresh={state.onRefresh} tintColor={gold[400]} />
              }
            >
              {state.sortField === 'status' ? (
                state.taskSections.map((sec) => {
                  if (sec.items.length === 0) return null;
                  return (
                    <View key={sec.key} style={styles.sectionBlock}>
                      <Text style={styles.sectionHeader}>{sec.title}</Text>
                      <View style={styles.compactList}>
                        {sec.items.map((item: any) => renderCompactTask({ item }))}
                      </View>
                    </View>
                  );
                })
              ) : (
                <View style={styles.compactList}>
                  {state.sortedFlatBuckets.map((item: any) => renderCompactTask({ item }))}
                </View>
              )}
            </ScrollView>
          ) : (
            <FlashList
              data={state.listData}
              renderItem={renderTaskItem}
              keyExtractor={(item) => item.id}
              estimatedItemSize={89}
              ItemSeparatorComponent={TaskSeparator}
              contentContainerStyle={styles.listContent}
              refreshControl={
                <RefreshControl refreshing={state.refreshing} onRefresh={state.onRefresh} tintColor={gold[400]} />
              }
            />
          )}

          {!state.isSelectionMode && (
            <FAB onPress={() => router.push('/(modals)/create-bucket')} bottomOffset={24} />
          )}

          {state.isSelectionMode && (
            <BulkTaskActionBar
              selectedIds={state.selectedTaskIds}
              totalTasksCount={state.filteredBuckets.length}
              onClearSelection={state.handleExitSelection}
              onSelectAll={() => {
                if (state.selectedTaskIds.length === state.filteredBuckets.length) {
                  state.setSelectedTaskIds([]);
                } else {
                  state.setSelectedTaskIds(state.filteredBuckets.map((b: any) => b.id));
                }
              }}
              isAllSelected={
                state.selectedTaskIds.length > 0 &&
                state.selectedTaskIds.length === state.filteredBuckets.length
              }
            />
          )}
        </View>
      )}

      {/* Tab: Álbumes */}
      {state.activeTab === 'albums' && (
        <View style={{ flex: 1 }}>
          <ScrollView
            contentContainerStyle={styles.albumsContent}
            refreshControl={
              <RefreshControl refreshing={state.refreshing} onRefresh={state.onRefresh} tintColor={gold[400]} />
            }
          >
            <AlbumListHeaderControls
              albumFilter={state.albumFilter}
              setAlbumFilter={state.setAlbumFilter}
              albumPriorityFilter={state.albumPriorityFilter}
              setAlbumPriorityFilter={state.setAlbumPriorityFilter}
              onOpenTagFilterSheet={() => state.setTagSheetOpen(true)}
              selectedTagIds={state.selectedTagIds}
              selectedTags={state.selectedTags}
              onRemoveTagFilter={(id) =>
                state.setSelectedTagIds((prev) => prev.filter((x) => x !== id))
              }
              albumViewMode={state.albumViewMode}
              setAlbumViewMode={state.setAlbumViewMode}
              albumsCount={state.filteredAlbums.length}
              albumSortField={state.albumSortField}
              albumSortDir={state.albumSortDir}
              isAlbumReordering={state.isAlbumReordering}
              setIsAlbumReordering={state.setIsAlbumReordering}
              isSearching={state.isSearching}
              albumSortTriggerRef={state.albumSortTriggerRef}
              openSortMenu={state.openSortMenu}
              onOpenCustomize={() => setCustomizeModalVisible(true)}
              theme={theme}
            />

            {state.isLoadingAlbums ? (
              <View style={styles.albumGrid}>
                <AlbumCardSkeleton />
                <AlbumCardSkeleton />
                <AlbumCardSkeleton />
                <AlbumCardSkeleton />
              </View>
            ) : state.filteredAlbums.length === 0 ? (
              state.albumViewMode === 'gallery' ? (
                <View style={styles.albumGrid}>
                  <NoAlbumCard
                    count={state.unassignedCount}
                    onPress={() => router.push('/album/unassigned')}
                  />
                </View>
              ) : (
                <View style={[styles.empty, { gap: 14 }]}>
                  <Text style={{ color: theme.colors.foregroundMuted, fontSize: 14 }}>
                    {state.searchQuery ? 'No se encontraron álbumes' : 'No tienes álbumes'}
                  </Text>
                  <NoAlbumRow
                    count={state.unassignedCount}
                    onPress={() => router.push('/album/unassigned')}
                  />
                </View>
              )
            ) : state.isAlbumReordering ? (
              <View>
                {state.albumSortField === 'status' ? (
                  state.albumSections.map((sec) => {
                    if (sec.items.length === 0) return null;
                    return (
                      <View key={sec.key} style={styles.sectionBlock}>
                        <Text style={styles.sectionHeader}>{sec.title}</Text>
                        <DraggableTaskList
                          items={sec.items}
                          gap={10}
                          renderItem={(item, drag) =>
                            state.albumViewMode === 'compact'
                              ? renderCompactAlbum({ item, drag })
                              : renderListAlbum({ item, drag })
                          }
                          onReorder={(ids) => state.handleReorderAlbumSection(sec.key, ids)}
                          onDraggingChange={state.setAlbumDragging}
                        />
                      </View>
                    );
                  })
                ) : (
                  <DraggableTaskList
                    items={state.sortedAlbumsList}
                    gap={10}
                    renderItem={(item, drag) =>
                      state.albumViewMode === 'compact'
                        ? renderCompactAlbum({ item, drag })
                        : renderListAlbum({ item, drag })
                    }
                    onReorder={(ids) => void state.persistAlbumOrder(ids)}
                    onDraggingChange={state.setAlbumDragging}
                  />
                )}
              </View>
            ) : state.albumViewMode === 'compact' ? (
              <>
                {state.albumSortField === 'status' ? (
                  state.albumSections.map((sec) => {
                    if (sec.items.length === 0) return null;
                    return (
                      <View key={sec.key} style={styles.sectionBlock}>
                        <Text style={styles.sectionHeader}>{sec.title}</Text>
                        <View style={styles.compactList}>
                          {sec.items.map((item: any) => renderCompactAlbum({ item }))}
                        </View>
                      </View>
                    );
                  })
                ) : (
                  <View style={[styles.compactList, { marginBottom: 16 }]}>
                    {state.sortedAlbumsList.map((item: any) => renderCompactAlbum({ item }))}
                  </View>
                )}
                <NoAlbumRow
                  count={state.unassignedCount}
                  onPress={() => router.push('/album/unassigned')}
                />
              </>
            ) : state.albumViewMode === 'list' ? (
              <>
                {state.albumSortField === 'status' ? (
                  state.albumSections.map((sec) => {
                    if (sec.items.length === 0) return null;
                    return (
                      <View key={sec.key} style={styles.sectionBlock}>
                        <Text style={styles.sectionHeader}>{sec.title}</Text>
                        {sec.items.map((item: any, idx: number) =>
                          renderListAlbum({ item, index: idx })
                        )}
                      </View>
                    );
                  })
                ) : (
                  state.sortedAlbumsList.map((item: any, idx: number) =>
                    renderListAlbum({ item, index: idx })
                  )
                )}
                <NoAlbumRow
                  count={state.unassignedCount}
                  onPress={() => router.push('/album/unassigned')}
                />
              </>
            ) : (
              <>
                {state.albumSortField === 'status' ? (
                  <>
                    {state.albumSections.map((sec) => {
                      if (sec.items.length === 0) return null;
                      return (
                        <View key={sec.key} style={styles.sectionBlock}>
                          <Text style={styles.sectionHeader}>{sec.title}</Text>
                          <View style={styles.albumGrid}>
                            {sec.items.map((item: any, index: number) =>
                              renderGalleryAlbum({ item, index })
                            )}
                          </View>
                        </View>
                      );
                    })}
                    <View style={styles.albumGrid}>
                      <NoAlbumCard
                        count={state.unassignedCount}
                        onPress={() => router.push('/album/unassigned')}
                      />
                    </View>
                  </>
                ) : (
                  <View style={styles.albumGrid}>
                    {state.sortedAlbumsList.map((item: any, index: number) =>
                      renderGalleryAlbum({ item, index })
                    )}
                    <NoAlbumCard
                      count={state.unassignedCount}
                      onPress={() => router.push('/album/unassigned')}
                    />
                  </View>
                )}
              </>
            )}

            {/* Botón para descubrir colecciones prediseñadas en Explorar */}
            <Pressable
              style={({ pressed }) => [
                styles.exploreCollectionsBanner,
                {
                  backgroundColor: theme.dark ? '#181818' : '#FAF6EE',
                  borderColor: theme.dark ? 'rgba(212,177,58,0.25)' : 'rgba(212,177,58,0.35)',
                },
                pressed && { opacity: 0.85, transform: [{ scale: 0.99 }] },
              ]}
              onPress={() => {
                router.push({
                  pathname: '/(tabs)/feed',
                  params: { tab: 'explore', filter: 'colecciones' },
                } as any);
              }}
              accessibilityRole="button"
              accessibilityLabel="Explorar colecciones prediseñadas"
            >
              <View
                style={[
                  styles.exploreCollectionsIconWrap,
                  { backgroundColor: theme.dark ? 'rgba(212,177,58,0.15)' : 'rgba(212,177,58,0.18)' },
                ]}
              >
                <Sparkles size={20} color={gold[400]} />
              </View>
              <View style={styles.exploreCollectionsTextWrap}>
                <Text
                  style={[
                    styles.exploreCollectionsTitle,
                    { color: theme.colors.foreground },
                  ]}
                >
                  Colecciones prediseñadas
                </Text>
                <Text
                  style={[
                    styles.exploreCollectionsSubtitle,
                    { color: theme.colors.foregroundMuted },
                  ]}
                >
                  Descubre ideas y clona álbumes temáticos
                </Text>
              </View>
              <ChevronRight size={18} color={gold[400]} />
            </Pressable>
          </ScrollView>

          <FAB onPress={() => router.push('/(modals)/create-album')} bottomOffset={24} />
        </View>
      )}

      {/* Tab: Calendario */}
      {state.activeTab === 'calendar' && <CalendarTab />}

      {/* Sheets & Modales */}
      <TagFilterSheet
        visible={state.tagSheetOpen}
        selectedIds={state.selectedTagIds}
        onChange={state.setSelectedTagIds}
        matchCount={state.activeTab === 'albums' ? state.filteredAlbums.length : state.filteredBuckets.length}
        totalCount={state.activeTab === 'albums' ? (state.albums?.length || 0) : state.totalCount}
        itemType={state.activeTab === 'albums' ? 'album' : 'task'}
        onClose={() => state.setTagSheetOpen(false)}
        onManage={() => {
          state.setTagSheetOpen(false);
          router.push('/tags' as any);
        }}
      />

      <MyListSortModal
        visible={state.sortMenuOpen}
        onClose={() => state.setSortMenuOpen(false)}
        position={state.sortMenuPos}
        activeTab={state.activeTab}
        sortField={state.sortField}
        sortDir={state.sortDir}
        isReordering={state.isReordering}
        albumSortField={state.albumSortField}
        albumSortDir={state.albumSortDir}
        isAlbumReordering={state.isAlbumReordering}
        theme={theme}
        onSelectOption={state.handleSortOption}
      />

      <MyListCustomizeModal
        visible={customizeModalVisible}
        onClose={() => setCustomizeModalVisible(false)}
        initialTab={state.activeTab === 'albums' ? 'albums' : 'tasks'}
        initialMode={state.activeTab === 'albums' ? state.albumViewMode : state.taskViewMode}
      />
    </SafeAreaView>
  );
}
