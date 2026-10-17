import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../../services/supabase';
import { useAuthStore } from '../../../stores/auth.store';
import type { MapTaskItem, MapFilterType } from '../types';

export function useMapTasks({
  filter = 'all',
  searchQuery = '',
}: {
  filter?: MapFilterType;
  searchQuery?: string;
} = {}) {
  const { user } = useAuthStore();
  const currentUserId = user?.id;

  const {
    data: rawTasks = [],
    isLoading,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ['map-tasks', currentUserId],
    queryFn: async (): Promise<MapTaskItem[]> => {
      // 1. Fetch friend IDs (both accounts I follow and accounts that follow me with accepted status)
      let friendIds: string[] = [];
      if (currentUserId) {
        const [followingRes, followersRes] = await Promise.all([
          supabase
            .from('follows')
            .select('following_id')
            .eq('follower_id', currentUserId)
            .eq('status', 'accepted'),
          supabase
            .from('follows')
            .select('follower_id')
            .eq('following_id', currentUserId)
            .eq('status', 'accepted'),
        ]);
        const set = new Set<string>();
        (followingRes.data || []).forEach((f: any) => set.add(f.following_id));
        (followersRes.data || []).forEach((f: any) => set.add(f.follower_id));
        friendIds = Array.from(set);
      }

      // 2. Query bucket items with location
      let query = supabase
        .from('buckets')
        .select(`
          id,
          title,
          description,
          location_text,
          location_lat,
          location_lng,
          status,
          visibility,
          cover_image,
          thumbnail_mode,
          thumbnail_photo_id,
          user_id,
          created_at,
          completed_at,
          user:profiles!buckets_user_id_fkey(id, username, display_name, avatar_url),
          category:categories(slug, name_es, name_en),
          bucket_photos(id, thumb_path, storage_path, created_at)
        `)
        .not('location_lat', 'is', null)
        .not('location_lng', 'is', null);

      const { data, error } = await query;
      if (error) {
        console.warn('Error fetching map tasks from Supabase:', error);
        return [];
      }

      const accessible = (data || []).filter((item: any) => {
        // Tareas propias siempre visibles
        if (item.user_id === currentUserId) return true;
        // Tareas públicas de cualquier usuario
        if (item.visibility === 'public' || !item.visibility) return true;
        // Tareas de amigos para visibilidad 'followers'
        if (item.visibility === 'followers' && friendIds.includes(item.user_id)) return true;
        return false;
      });

      const tasksWithCoords: MapTaskItem[] = [];
      for (const item of accessible) {
        const lat =
          item.location_lat != null && !isNaN(Number(item.location_lat))
            ? Number(item.location_lat)
            : null;
        const lng =
          item.location_lng != null && !isNaN(Number(item.location_lng))
            ? Number(item.location_lng)
            : null;

        if (lat === null || lng === null) continue;

        const catData = Array.isArray(item.category) ? item.category[0] : item.category;
        const category = catData
          ? {
              slug: String(catData.slug || ''),
              name: String((catData as any).name || catData.name_es || catData.name_en || ''),
            }
          : null;

        tasksWithCoords.push({
          ...item,
          category,
          location_lat: lat,
          location_lng: lng,
          is_mine: item.user_id === currentUserId,
          is_friend: friendIds.includes(item.user_id),
        } as unknown as MapTaskItem);
      }

      return tasksWithCoords;
    },
    staleTime: 1000 * 30, // 30 seconds
  });

  // Filter tasks in memory according to filter & search query
  const filteredTasks = rawTasks.filter((task) => {
    // Filter by type
    if (filter === 'mine' && !task.is_mine) return false;
    if (filter === 'friends' && (!task.is_friend || task.is_mine)) return false;
    if (filter === 'completed' && task.status !== 'completed') return false;
    if (filter === 'pending' && task.status === 'completed') return false;

    // Filter by search query
    if (searchQuery.trim().length > 0) {
      const q = searchQuery.toLowerCase().trim();
      const matchTitle = task.title?.toLowerCase().includes(q);
      const matchLocation = task.location_text?.toLowerCase().includes(q);
      const matchDesc = task.description?.toLowerCase().includes(q);
      const matchAuthor =
        task.user?.display_name?.toLowerCase().includes(q) ||
        task.user?.username?.toLowerCase().includes(q);
      if (!matchTitle && !matchLocation && !matchDesc && !matchAuthor) {
        return false;
      }
    }

    return true;
  });

  return {
    tasks: filteredTasks,
    allTasksCount: rawTasks.length,
    isLoading,
    isRefetching,
    refetch,
  };
}
