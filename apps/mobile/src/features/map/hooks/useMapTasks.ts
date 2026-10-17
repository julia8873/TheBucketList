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
        .or('location_lat.not.is.null,location_text.not.is.null');

      const { data, error } = await query;
      if (error) {
        console.warn('Error fetching map tasks from Supabase:', error);
        return [];
      }

      const accessible = (data || []).filter((item: any) => {
        // Keep if public, or owned by me, or followers-only and owned by a friend
        if (item.user_id === currentUserId) return true;
        if (item.visibility === 'public' || !item.visibility) return true;
        if (item.visibility === 'followers' && friendIds.includes(item.user_id)) return true;
        return false;
      });

      // Si alguna tarea tiene texto de ubicación pero le faltaban coordenadas, la geocodificamos al vuelo
      const tasksWithCoords = await Promise.all(
        accessible.map(async (item: any) => {
          let lat = typeof item.location_lat === 'number' ? item.location_lat : null;
          let lng = typeof item.location_lng === 'number' ? item.location_lng : null;

          if ((lat === null || lng === null) && item.location_text?.trim()) {
            try {
              const res = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(item.location_text.trim())}&limit=1`,
                { headers: { 'User-Agent': 'TheBucketListApp/1.0' } }
              );
              const geo = await res.json();
              if (geo && geo[0]) {
                lat = parseFloat(geo[0].lat);
                lng = parseFloat(geo[0].lon);
                // Guardar en BD para futuras consultas si es mía
                if (item.user_id === currentUserId) {
                  void supabase.from('buckets').update({ location_lat: lat, location_lng: lng }).eq('id', item.id);
                }
              }
            } catch {
              // Si falla la red, continuar
            }
          }

          if (lat === null || lng === null) return null;

          return {
            ...item,
            location_lat: lat,
            location_lng: lng,
            is_mine: item.user_id === currentUserId,
            is_friend: friendIds.includes(item.user_id),
          } as MapTaskItem;
        })
      );

      return tasksWithCoords.filter(Boolean) as MapTaskItem[];
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
  });

  // Filter tasks in memory according to filter & search query
  const filteredTasks = rawTasks.filter((task) => {
    // Filter by type
    if (filter === 'mine' && !task.is_mine) return false;
    if (filter === 'friends' && !task.is_friend && !task.is_mine) return false;
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
