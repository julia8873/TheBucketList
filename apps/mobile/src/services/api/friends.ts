import { supabase } from '../supabase';

export type FollowStatus = 'none' | 'pending' | 'accepted';

export interface PersonResult {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  visibility: 'public' | 'followers' | 'private' | string;
  public_count: number;
  follow_status: FollowStatus;
}

export interface ProfileStats {
  completed_count: number;
  public_count: number;
  followers_count: number;
  following_count: number;
  follow_status: FollowStatus;
  is_locked: boolean;
}

export interface PersonLite {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
}

export interface FollowRequest {
  created_at: string | null;
  person: PersonLite;
}

const PERSON_FIELDS = 'id, username, display_name, avatar_url';

/** PostgREST puede devolver el embed como objeto o como array de 1 elemento. */
function one<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export const friendsApi = {
  searchPeople: async (query: string): Promise<PersonResult[]> => {
    const term = query.trim().replace(/^@/, '');
    if (term.length < 2) return [];
    const { data, error } = await supabase.rpc('search_people', { p_query: term, p_limit: 20 });
    if (error) throw error;
    return (data ?? []) as PersonResult[];
  },

  getProfileStats: async (userId: string): Promise<ProfileStats> => {
    const { data, error } = await supabase.rpc('get_profile_stats', { p_user: userId });
    if (error) throw error;
    const row = one(data as ProfileStats | ProfileStats[] | null);
    return (
      row ?? {
        completed_count: 0,
        public_count: 0,
        followers_count: 0,
        following_count: 0,
        follow_status: 'none',
        is_locked: false,
      }
    );
  },

  /** Solicitudes que me han enviado (pendientes de aceptar). */
  getIncomingRequests: async (userId: string): Promise<FollowRequest[]> => {
    const { data, error } = await supabase
      .from('follows')
      .select(`created_at, person:profiles!follower_id(${PERSON_FIELDS})`)
      .eq('following_id', userId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []).flatMap((row: any) => {
      const person = one<PersonLite>(row.person);
      return person ? [{ created_at: row.created_at, person }] : [];
    });
  },

  /** Solicitudes que he enviado y siguen sin respuesta. */
  getOutgoingRequests: async (userId: string): Promise<FollowRequest[]> => {
    const { data, error } = await supabase
      .from('follows')
      .select(`created_at, person:profiles!following_id(${PERSON_FIELDS})`)
      .eq('follower_id', userId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []).flatMap((row: any) => {
      const person = one<PersonLite>(row.person);
      return person ? [{ created_at: row.created_at, person }] : [];
    });
  },

  getIncomingCount: async (userId: string): Promise<number> => {
    const { count, error } = await supabase
      .from('follows')
      .select('follower_id', { count: 'exact', head: true })
      .eq('following_id', userId)
      .eq('status', 'pending');
    if (error) throw error;
    return count ?? 0;
  },

  acceptRequest: async (followerId: string, myId: string) => {
    const { data, error } = await supabase
      .from('follows')
      .update({ status: 'accepted' })
      .match({ follower_id: followerId, following_id: myId, status: 'pending' })
      .select('follower_id');
    if (error) throw error;
    if (!data || data.length === 0) throw new Error('La solicitud ya no existe');
    return true;
  },

  rejectRequest: async (followerId: string, myId: string) => {
    const { error } = await supabase
      .from('follows')
      .delete()
      .match({ follower_id: followerId, following_id: myId, status: 'pending' });
    if (error) throw error;
    return true;
  },
};
