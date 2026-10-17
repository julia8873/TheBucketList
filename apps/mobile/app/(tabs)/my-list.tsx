import React from 'react';
import { View, Text, Pressable, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  useTheme,
  SegmentedControl,
  AlbumCard,
  NewAlbumCard,
  NoAlbumRow,
  NoAlbumCard,
  NewAlbumRow,
  FAB,
  Input,
  PageTitle,
} from '@bucketlist/ui';
import { gold } from '@bucketlist/ui/src/tokens/colors';
import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Search, X, Plus } from 'lucide-react-native';
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

export default function MyListScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { t } = useTranslation();
  const state = useMyListState();
  const [goldTitle, ...restTitle] = t('nav.my_list', { defaultValue: 'Mi lista' }).split(' ');

  const renderTaskItem = ({ item, drag, index }: { item: any; drag?: any; index?: number }) => {
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
    const itemTagObjs = (item.tags || []).map((tid: string) => state.tagsById.get(tid)).filter(Boolean);

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
  };

  const renderCompactTask = ({ item, drag }: { item: any; drag?: any }) => {
    if (item.isHeader) {
      return (
        <View key={item.id} style={{ marginTop: 24, marginBottom: 12 }}>
          <Text style={styles.sectionHeader}>{item.title}</Text>
        </View>
      );
    }
    return (
      <TaskCompactItemRow
        key={item.id}
        item={item}
        drag={drag}
        isSelected={state.selectedTaskIds.includes(item.id)}
        isSelectionMode={state.isSelectionMode}
        isFav={state.isBucketFavorite(item.id)}
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
  };

  const renderCompactAlbum = ({ item, drag }: { item: any; drag?: any }) => (
    <AlbumCompactItemRow
      key={item.id}
      item={item}
      drag={drag}
      isFav={state.isAlbumFavorite(item.id)}
      onPress={() => router.push(`/album/${item.id}` as any)}
    />
  );

  const renderListAlbum = ({ item, drag, index = 0 }: { item: any; drag?: any; index?: number }) => (
    <AlbumListItemRow
      key={item.id}
      item={item}
      drag={drag}
      index={index}
      isFav={state.isAlbumFavorite(item.id)}
      onPress={() => router.push(`/album/${item.id}` as any)}
      onToggleFavorite={() =>
        state.toggleFavoriteAlbum.mutate({
          albumId: item.id,
          currentlyFavorite: state.isAlbumFavorite(item.id),
        })
      }
    />
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <PageTitle gold={goldTitle} rest={restTitle.join(' ')} />
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
                        {sec.items.map((item: any) => (
                          <TaskGalleryItemCard
                            key={item.id}
                            item={item}
                            isSingle={sec.items.length === 1}
                            isSelected={state.selectedTaskIds.includes(item.id)}
                            isSelectionMode={state.isSelectionMode}
                            isFav={state.isBucketFavorite(item.id)}
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
                        ))}
                      </View>
                    </View>
                  );
                })
              ) : (
                <View style={styles.galleryGrid}>
                  {state.sortedFlatBuckets.map((item: any) => (
                    <TaskGalleryItemCard
                      key={item.id}
                      item={item}
                      isSingle={state.sortedFlatBuckets.length === 1}
                      isSelected={state.selectedTaskIds.includes(item.id)}
                      isSelectionMode={state.isSelectionMode}
                      isFav={state.isBucketFavorite(item.id)}
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
                  ))}
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
              renderItem={({ item, index }) => renderTaskItem({ item, index })}
              keyExtractor={(item) => (item.isHeader ? item.id : item.id)}
              estimatedItemSize={89}
              ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
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
              albumPriorityFilter={state.albumPriorityFilter}
              setAlbumPriorityFilter={state.setAlbumPriorityFilter}
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
              theme={theme}
            />

            {state.isLoadingAlbums ? (
              <View style={styles.albumGrid}>
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
                  <NewAlbumCard onPress={() => router.push('/(modals)/create-album')} />
                </View>
              ) : (
                <View style={[styles.empty, { gap: 14 }]}>
                  <Text style={{ color: theme.colors.foregroundMuted, fontSize: 14 }}>
                    {state.searchQuery ? 'No se encontraron álbumes' : 'No tienes álbumes'}
                  </Text>
                  <NewAlbumRow onPress={() => router.push('/(modals)/create-album')} />
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
                <NewAlbumRow onPress={() => router.push('/(modals)/create-album')} />
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
                <NewAlbumRow onPress={() => router.push('/(modals)/create-album')} />
                <NoAlbumRow
                  count={state.unassignedCount}
                  onPress={() => router.push('/album/unassigned')}
                />
              </>
            ) : (
              <View style={styles.albumGrid}>
                {state.sortedAlbumsList.map((item: any, index: number) => (
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
                    onPress={() => router.push(`/album/${item.id}` as any)}
                  />
                ))}
                <NoAlbumCard
                  count={state.unassignedCount}
                  onPress={() => router.push('/album/unassigned')}
                />
                <NewAlbumCard onPress={() => router.push('/(modals)/create-album')} />
              </View>
            )}
          </ScrollView>
        </View>
      )}

      {/* Tab: Calendario */}
      {state.activeTab === 'calendar' && <CalendarTab />}

      {/* Sheets & Modales */}
      <TagFilterSheet
        visible={state.tagSheetOpen}
        selectedIds={state.selectedTagIds}
        onChange={state.setSelectedTagIds}
        matchCount={state.filteredBuckets.length}
        totalCount={state.totalCount}
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
    </SafeAreaView>
  );
}
