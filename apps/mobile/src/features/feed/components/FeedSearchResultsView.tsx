import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from '@bucketlist/shared';
import { useTheme, Typography, Avatar, EmptyState, SectionLabel, gold } from '@bucketlist/ui';
import { FeedCard } from '../../../components/FeedCard';
import { AlbumFeedCard } from '../../../components/AlbumFeedCard';
import { FeedCardSkeleton } from '../../../components/FeedCardSkeleton';
import { UserRowSkeleton } from '../../../components/TaskSkeletons';
import type { TaskViewMode } from '../../../components/ViewModeSelector';
import { styles } from '../styles/feed.styles';
import {
  useUserLikedAlbumIds,
  useToggleAlbumLike,
  useSavedAlbumIds,
  useToggleSaveAlbum,
  useBatchAlbumSaveCounts,
  useBatchAlbumLikeCounts,
} from '../../../hooks/useSocial';
import { useAuthStore } from '../../../stores/auth.store';

export type SearchTabFilter = 'todo' | 'ideas' | 'albumes' | 'personas';

interface FeedSearchResultsViewProps {
  query: string;
  isLoading: boolean;
  tasks?: any[];
  albums?: any[];
  users?: any[];
  viewMode?: TaskViewMode;
}

export function FeedSearchResultsView({
  query,
  isLoading,
  tasks = [],
  albums = [],
  users = [],
  viewMode = 'list',
}: FeedSearchResultsViewProps) {
  const router = useRouter();
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { user, session } = useAuthStore();
  const currentUserId = user?.id || session?.user?.id;

  const [activeTab, setActiveTab] = useState<SearchTabFilter>('todo');

  const albumIds = React.useMemo(() => albums.map((a) => a.id), [albums]);
  const { data: likedAlbumIds } = useUserLikedAlbumIds(currentUserId);
  const toggleAlbumLike = useToggleAlbumLike();
  const { data: savedAlbumIds } = useSavedAlbumIds(currentUserId);
  const toggleSaveAlbum = useToggleSaveAlbum();
  const { data: albumSaveCounts } = useBatchAlbumSaveCounts(albumIds);
  const { data: albumLikeCounts } = useBatchAlbumLikeCounts(albumIds);

  const totalResults = tasks.length + albums.length + users.length;

  if (isLoading) {
    return (
      <View style={{ paddingHorizontal: 12, paddingTop: 16 }}>
        <FeedCardSkeleton />
        <UserRowSkeleton />
        <UserRowSkeleton />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      {/* Pills de filtrado de resultados */}
      <View style={{ paddingHorizontal: 12, paddingBottom: 10 }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, paddingVertical: 4 }}
        >
          {([
            { key: 'todo', label: t('feed.search_tab_all'), count: totalResults },
            { key: 'ideas', label: t('feed.search_tab_ideas'), count: tasks.length },
            { key: 'albumes', label: t('feed.search_tab_albums'), count: albums.length },
            { key: 'personas', label: t('feed.search_tab_people'), count: users.length },
          ] as const).map(({ key, label, count }) => {
            const isSelected = activeTab === key;
            return (
              <Pressable
                key={key}
                onPress={() => setActiveTab(key as SearchTabFilter)}
                style={[
                  styles.contentFilterPill,
                  isSelected && {
                    backgroundColor: theme.dark ? 'rgba(212,177,58,0.18)' : 'rgba(212,177,58,0.22)',
                    borderColor: gold[400],
                  },
                  !isSelected && {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.contentFilterText,
                    { color: isSelected ? gold[400] : theme.colors.foregroundMuted },
                  ]}
                >
                  {label} · {count}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {totalResults === 0 ? (
        <View style={{ paddingHorizontal: 12, paddingTop: 40, alignItems: 'center' }}>
          <EmptyState
            title={t('feed.search_empty_title')}
            message={t('feed.search_empty_desc', { query })}
          />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 80 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* SECCIÓN IDEAS / TAREAS */}
          {(activeTab === 'todo' || activeTab === 'ideas') && (
            <View style={{ marginBottom: 20 }}>
              {activeTab === 'todo' && tasks.length > 0 && (
                <SectionLabel
                  highlight={t('feed.search_section_ideas')}
                  rest={` (${tasks.length})`}
                  style={{ marginBottom: 12 }}
                />
              )}
              {tasks.length === 0 && activeTab === 'ideas' ? (
                <Typography variant="body" color="textSecondary" style={{ textAlign: 'center', marginTop: 20 }}>
                  {t('feed.search_no_ideas', { query })}
                </Typography>
              ) : (
                <View
                  style={
                    viewMode === 'gallery'
                      ? { flexDirection: 'row', flexWrap: 'wrap', gap: 10 }
                      : undefined
                  }
                >
                  {tasks.map((item, index) => (
                    <FeedCard
                      key={`task-${item.id}-${index}`}
                      event={{
                        id: item.id,
                        actor: item.actor || item.user,
                        bucket: item.bucket || item,
                        type: item.type || (item.bucket?.status === 'completed' ? 'completed' : 'new_bucket'),
                        created_at: item.created_at,
                      }}
                      index={index}
                      mode={viewMode}
                      onPress={() => router.push(`/bucket/${item.id}` as any)}
                    />
                  ))}
                </View>
              )}
            </View>
          )}

          {/* SECCIÓN ÁLBUMES */}
          {(activeTab === 'todo' || activeTab === 'albumes') && (
            <View style={{ marginBottom: 20 }}>
              {activeTab === 'todo' && albums.length > 0 && (
                <SectionLabel
                  highlight={t('feed.search_section_albums')}
                  rest={` (${albums.length})`}
                  style={{ marginBottom: 12 }}
                />
              )}
              {albums.length === 0 && activeTab === 'albumes' ? (
                <Typography variant="body" color="textSecondary" style={{ textAlign: 'center', marginTop: 20 }}>
                  {t('feed.search_no_albums', { query })}
                </Typography>
              ) : (
                albums.map((album, index) => {
                  const isLiked = !!currentUserId && !!likedAlbumIds?.includes(album.id);
                  const isSaved = !!currentUserId && !!savedAlbumIds?.includes(album.id);
                  const isOwn = !!currentUserId && album.owner?.id === currentUserId;
                  const saveCount = albumSaveCounts?.[album.id] ?? 0;
                  const likeCount = albumLikeCounts?.[album.id] ?? 0;

                  return (
                    <AlbumFeedCard
                      key={`album-${album.id}-${index}`}
                      album={album}
                      colorIndex={index}
                      index={index}
                      mode={viewMode}
                      isLiked={isLiked}
                      likeCount={likeCount}
                      onToggleLike={
                        currentUserId
                          ? () => toggleAlbumLike.mutate({ albumId: album.id, userId: currentUserId })
                          : undefined
                      }
                      isSaved={isSaved}
                      onToggleSave={
                        currentUserId && !isOwn
                          ? () =>
                              toggleSaveAlbum.mutate({
                                albumId: album.id,
                                userId: currentUserId,
                                currentlySaved: isSaved,
                              })
                          : undefined
                      }
                      saveCount={saveCount}
                      isOwn={isOwn}
                      onPress={() => router.push(`/album/${album.id}` as any)}
                    />
                  );
                })
              )}
            </View>
          )}

          {/* SECCIÓN PERSONAS */}
          {(activeTab === 'todo' || activeTab === 'personas') && (
            <View style={{ marginBottom: 20 }}>
              {activeTab === 'todo' && users.length > 0 && (
                <SectionLabel
                  highlight={t('feed.search_section_people')}
                  rest={` (${users.length})`}
                  style={{ marginBottom: 12 }}
                />
              )}
              {users.length === 0 && activeTab === 'personas' ? (
                <Typography variant="body" color="textSecondary" style={{ textAlign: 'center', marginTop: 20 }}>
                  {t('feed.search_no_people', { query })}
                </Typography>
              ) : (
                users.map((person) => (
                  <Pressable
                    key={`user-${person.id}`}
                    style={styles.userRow}
                    onPress={() => router.push(`/profile/${person.id}` as any)}
                  >
                    <Avatar
                      source={person.avatar_url ? { uri: person.avatar_url } : undefined}
                      fallback={person.display_name?.charAt(0) || person.username?.charAt(0) || '?'}
                      size="md"
                    />
                    <View style={styles.userInfo}>
                      <Typography variant="body" style={{ fontWeight: 'bold' }}>
                        {person.display_name || person.username}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        @{person.username}
                      </Typography>
                    </View>
                  </Pressable>
                ))
              )}
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}
