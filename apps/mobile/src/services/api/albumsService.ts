import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabase';
import { useAuthStore } from '../../stores/auth.store';

export interface TaskItem {
  id: string;
  title: string;
  categoryName: string;
  coverKey: string;
  isCompleted: boolean;
  dueDate?: string;
  stepsTotal?: number;
  stepsCompleted?: number;
  location?: string;
}

export interface AlbumDetail {
  id: string;
  title: string;
  coverKey: string;
  isShared: boolean;
  tasks: TaskItem[];
}

export const albumsService = {
  async getAlbum(id: string, userId?: string): Promise<AlbumDetail> {
    if (!userId) throw new Error('Not authenticated');

    // Fetch album details
    const { data: album, error: albumError } = await supabase
      .from('albums')
      .select('*')
      .eq('id', id)
      .single();

    if (albumError) throw albumError;

    let coverKey = 'aurora';
    if (album.cover_path) {
      try {
        const parsed = JSON.parse(album.cover_path);
        coverKey = parsed.id || 'aurora';
      } catch {
        // Ignored
      }
    }

    // Fetch album items
    const { data: albumItems, error: itemsError } = await supabase
      .from('album_items')
      .select('bucket_id')
      .eq('album_id', id);

    if (itemsError) throw itemsError;

    let tasks: TaskItem[] = [];

    if (albumItems && albumItems.length > 0) {
      const bucketIds = albumItems.map(ai => ai.bucket_id);
      const { data: buckets, error: bucketsError } = await supabase
        .from('buckets')
        .select(`
          id, title, deadline, cover_image, is_completed, 
          category_id, counter_count, counter_target,
          categories ( name_es, color, slug ),
          item_subtasks ( id, done )
        `)
        .in('id', bucketIds);

      if (bucketsError) throw bucketsError;

      tasks = (buckets || []).map(b => {
        const cat = b.categories as any;
        const subtasks = b.item_subtasks as any[];
        
        let stepsTotal = subtasks ? subtasks.length : 0;
        let stepsCompleted = subtasks ? subtasks.filter(s => s.done).length : 0;
        
        // Use counter if it's not a list of subtasks and has a target
        if (stepsTotal === 0 && b.counter_target && b.counter_target > 0) {
           stepsTotal = b.counter_target;
           stepsCompleted = b.counter_count || 0;
        }

        return {
          id: b.id,
          title: b.title,
          categoryName: cat?.name_es || 'Sin categoría',
          coverKey: coverKey, // we just use album's cover for task gradient if no task cover, but let's use album's coverKey
          isCompleted: b.is_completed || false,
          dueDate: b.deadline || undefined,
          stepsTotal,
          stepsCompleted,
        };
      });
    }

    return {
      id: album.id,
      title: album.title,
      coverKey: coverKey,
      isShared: album.is_shared || false,
      tasks,
    };
  },

  async deleteAlbum(id: string): Promise<void> {
    const { error } = await supabase
      .from('albums')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },
};

export function useAlbumDetail(albumId: string) {
  const { user } = useAuthStore();
  
  return useQuery({
    queryKey: ['album', albumId, user?.id],
    queryFn: () => albumsService.getAlbum(albumId, user?.id),
    enabled: !!user?.id && !!albumId,
  });
}

export function useDeleteAlbumDetail() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (albumId: string) => albumsService.deleteAlbum(albumId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['album'] });
      queryClient.invalidateQueries({ queryKey: ['albums'] });
      queryClient.invalidateQueries({ queryKey: ['buckets'] });
    },
  });
}
