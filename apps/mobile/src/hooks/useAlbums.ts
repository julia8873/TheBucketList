import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../services/supabase';

export const ALBUMS_QUERY_KEY = ['albums'];

export interface AlbumWithProgress {
  id: string;
  title: string;
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
      
      const { data, error } = await supabase
        .from('albums')
        .select(`
          id, title, cover_path, visibility, is_shared,
          album_progress ( total_tasks, completed_tasks )
        `)
        .eq('owner_id', userId)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      
      // Map the nested view response to a flat object
      return (data || []).map(album => {
        // Handle array wrap from left join if needed, or single object
        const progress = Array.isArray(album.album_progress) 
          ? album.album_progress[0] 
          : album.album_progress;
          
        return {
          id: album.id,
          title: album.title,
          cover_path: album.cover_path,
          visibility: album.visibility,
          is_shared: album.is_shared,
          total_tasks: progress?.total_tasks || 0,
          completed_tasks: progress?.completed_tasks || 0,
        };
      });
    },
    enabled: !!userId,
  });
}
