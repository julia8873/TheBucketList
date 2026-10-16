import React from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { FilterChip, SectionLabel, AlbumCard, gold } from '@bucketlist/ui';
import type { AlbumWithProgress } from '../../../hooks/useAlbums';
import { styles } from '../styles/profile.styles';

export type AlbumFilter = 'all' | 'active' | 'completed' | 'closed';

interface ProfileAlbumsTabProps {
  totalCount: number;
  albumFilter: AlbumFilter;
  onChangeFilter: (f: AlbumFilter) => void;
  albumsLoading: boolean;
  filteredAlbums: AlbumWithProgress[];
  isAlbumFavorite: (id: string) => boolean;
  onToggleFavoriteAlbum?: (id: string, isFav: boolean) => void;
  hasUser: boolean;
}

export function ProfileAlbumsTab({
  totalCount,
  albumFilter,
  onChangeFilter,
  albumsLoading,
  filteredAlbums,
  isAlbumFavorite,
  onToggleFavoriteAlbum,
  hasUser,
}: ProfileAlbumsTabProps) {
  const router = useRouter();

  return (
    <>
      <SectionLabel
        highlight="Álbumes"
        rest={`públicos · ${totalCount}`}
        style={styles.sectionLabel}
      />
      <View style={styles.filters}>
        <FilterChip label="Todos" active={albumFilter === 'all'} onPress={() => onChangeFilter('all')} />
        <FilterChip label="En curso" active={albumFilter === 'active'} onPress={() => onChangeFilter('active')} />
        <FilterChip label="Completados" active={albumFilter === 'completed'} onPress={() => onChangeFilter('completed')} />
        <FilterChip label="Cerrados" active={albumFilter === 'closed'} onPress={() => onChangeFilter('closed')} />
      </View>
      {albumsLoading ? (
        <ActivityIndicator style={{ marginTop: 24 }} color={gold[400]} />
      ) : filteredAlbums.length === 0 ? (
        <Text style={styles.empty}>
          {albumFilter === 'all'
            ? 'Todavía no hay álbumes públicos que mostrar.'
            : 'No hay álbumes en este filtro.'}
        </Text>
      ) : (
        <View style={styles.albumGrid}>
          {filteredAlbums.map((item, idx) => (
            <AlbumCard
              key={item.id}
              title={item.title}
              totalTasks={item.total_tasks ?? 0}
              completedTasks={item.completed_tasks ?? 0}
              coverUri={item.cover_path}
              isShared={item.is_shared}
              isFavorite={isAlbumFavorite(item.id)}
              onToggleFavorite={
                hasUser && onToggleFavoriteAlbum
                  ? () => onToggleFavoriteAlbum(item.id, isAlbumFavorite(item.id))
                  : undefined
              }
              priority={item.priority}
              isClosed={item.is_closed}
              colorIndex={idx}
              onPress={() => router.push(`/album/${item.id}` as any)}
            />
          ))}
        </View>
      )}
    </>
  );
}
