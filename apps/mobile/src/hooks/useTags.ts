import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../services/supabase';
import { useAuthStore } from '../stores/auth.store';

export const useTags = () => {
  const { user } = useAuthStore();
  
  return useQuery({
    queryKey: ['tags', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('tags')
        .select('*')
        .order('created_at', { ascending: false });
      
      // If table doesn't exist yet (migration unapplied), fail gracefully returning empty
      if (error && error.code === '42P01') return [];
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });
};

export const useItemTags = (bucketId: string) => {
  return useQuery({
    queryKey: ['item_tags', bucketId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('item_tags')
        .select('*, tag:tags(*)')
        .eq('item_id', bucketId);
        
      if (error && error.code === '42P01') return [];
      if (error) throw error;
      return data || [];
    },
    enabled: !!bucketId,
  });
};

export const useCreateTag = () => {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  return useMutation({
    mutationFn: async ({ name, color }: { name: string, color: string }) => {
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from('tags')
        .insert({ user_id: user.id, name, color })
        .select()
        .single();
        
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] });
    },
  });
};

export const useSyncItemTags = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ bucketId, selectedTagIds }: { bucketId: string, selectedTagIds: string[] }) => {
      // 1. Get current tags
      const { data: current, error: fetchError } = await supabase
        .from('item_tags')
        .select('tag_id')
        .eq('item_id', bucketId);
        
      if (fetchError && fetchError.code === '42P01') return; // Migration not applied
      if (fetchError) throw fetchError;
      
      const currentIds = (current || []).map(r => r.tag_id);
      
      // 2. Diff
      const toAdd = selectedTagIds.filter(id => !currentIds.includes(id));
      const toRemove = currentIds.filter(id => !selectedTagIds.includes(id));
      
      // 3. Delete removed
      if (toRemove.length > 0) {
        await supabase
          .from('item_tags')
          .delete()
          .eq('item_id', bucketId)
          .in('tag_id', toRemove);
      }
      
      // 4. Insert new
      if (toAdd.length > 0) {
        await supabase
          .from('item_tags')
          .insert(toAdd.map(id => ({ item_id: bucketId, tag_id: id })));
      }
    },
    onSuccess: (_, { bucketId }) => {
      queryClient.invalidateQueries({ queryKey: ['item_tags', bucketId] });
      queryClient.invalidateQueries({ queryKey: ['bucketDetail', bucketId] });
      queryClient.invalidateQueries({ queryKey: ['buckets'] });
    }
  });
};
