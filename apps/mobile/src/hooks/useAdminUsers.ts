import { useQuery } from '@tanstack/react-query';
import { supabase } from '../services/supabase';

export interface AdminUserProfile {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  role: string | null;
  visibility: string | null;
  suspended_at: string | null;
  created_at: string;
}

export const ADMIN_USERS_QUERY_KEY = ['admin_all_users'];

export function useAdminUsers() {
  return useQuery({
    queryKey: ADMIN_USERS_QUERY_KEY,
    queryFn: async (): Promise<AdminUserProfile[]> => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url, bio, role, visibility, suspended_at, created_at')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching admin users:', error);
        throw new Error(error.message);
      }
      return (data ?? []) as AdminUserProfile[];
    },
    staleTime: 1000 * 30, // 30s
  });
}

