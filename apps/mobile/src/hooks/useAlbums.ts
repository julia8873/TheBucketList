import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../services/supabase';
import { useAuthStore } from '../stores/auth.store';

export const ALBUMS_QUERY_KEY = ['albums'];

export interface AlbumWithProgress {
  id: string;
  title: string;
  description: string | null;
  cover_path: string | null;
  visibility: string;
  is_shared: boolean;
  total_tasks: number;
  completed_tasks: number;
}

export function useAlbums(userId?: string) {
  return useQuery({
    queryKey: [...ALBUMS_QUERY_KEY, userId],
    queryFn: async (): Promise<AlbumWithProgress[]> => {
      if (!userId) return [];

      const { data: albumsData, error } = await supabase
        .from('albums')
        .select('*')
        .eq('owner_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      if (!albumsData || albumsData.length === 0) return [];

      const { data: progressData } = await supabase
        .from('album_progress')
        .select('*')
        .in('album_id', albumsData.map(a => a.id));

      return albumsData.map(album => {
        const prog = progressData?.find(p => p.album_id === album.id);

        return {
          id: album.id,
          title: album.title,
          description: album.description,
          cover_path: album.cover_path,
          visibility: album.visibility,
          is_shared: album.is_shared,
          total_tasks: prog?.total_tasks || 0,
          completed_tasks: prog?.completed_tasks || 0,
        };
      });
    },
    enabled: !!userId,
  });
}

export function useCreateAlbum() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  return useMutation({
    mutationFn: async (data: { title: string; description?: string; visibility: string; cover_path?: string; is_shared?: boolean }) => {
      const { data: newAlbum, error } = await supabase
        .from('albums')
        .insert({
          title: data.title,
          description: data.description || '',
          visibility: data.visibility,
          owner_id: user?.id,
          cover_path: data.cover_path || null,
          is_shared: data.is_shared || false,
        })
        .select()
        .single();

      if (error) throw error;
      return newAlbum;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ALBUMS_QUERY_KEY });
    },
  });
}

export function useDeleteAlbum() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('albums')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ALBUMS_QUERY_KEY });
    },
  });
}

