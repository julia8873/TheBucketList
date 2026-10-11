import { supabase } from '../supabase';

export interface UserFavoritesData {
  bucketIds: string[];
  albumIds: string[];
}

export const favoritesApi = {
  getUserFavorites: async (userId: string): Promise<UserFavoritesData> => {
    if (!userId) {
      return { bucketIds: [], albumIds: [] };
    }

    const { data, error } = await (supabase as any)
      .from('user_favorites')
      .select('bucket_id, album_id')
      .eq('user_id', userId);

    if (error) {
      console.error('Error fetching user favorites:', error);
      throw error;
    }

    const bucketIds: string[] = [];
    const albumIds: string[] = [];

    (data || []).forEach((row: { bucket_id: string | null; album_id: string | null }) => {
      if (row.bucket_id) bucketIds.push(row.bucket_id);
      if (row.album_id) albumIds.push(row.album_id);
    });

    return { bucketIds, albumIds };
  },

  toggleBucketFavorite: async (userId: string, bucketId: string, currentlyFavorite: boolean) => {
    if (!userId || !bucketId) return;

    if (currentlyFavorite) {
      const { error } = await (supabase as any)
        .from('user_favorites')
        .delete()
        .eq('user_id', userId)
        .eq('bucket_id', bucketId);

      if (error) throw error;
    } else {
      const { error } = await (supabase as any)
        .from('user_favorites')
        .insert({
          user_id: userId,
          bucket_id: bucketId,
        });

      if (error) throw error;
    }
  },

  toggleAlbumFavorite: async (userId: string, albumId: string, currentlyFavorite: boolean) => {
    if (!userId || !albumId) return;

    if (currentlyFavorite) {
      const { error } = await (supabase as any)
        .from('user_favorites')
        .delete()
        .eq('user_id', userId)
        .eq('album_id', albumId);

      if (error) throw error;
    } else {
      const { error } = await (supabase as any)
        .from('user_favorites')
        .insert({
          user_id: userId,
          album_id: albumId,
        });

      if (error) throw error;
    }
  },
};
