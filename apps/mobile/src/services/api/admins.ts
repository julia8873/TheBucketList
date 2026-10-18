import { supabase } from '../supabase';

export interface AdminUser {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  role: string;
  created_at: string;
}

export const adminsApi = {
  getAdmins: async (): Promise<AdminUser[]> => {
    const { data, error } = await (supabase.rpc as any)('get_admins');
    if (error) throw new Error(error.message || 'Error al obtener administradores');
    return (data ?? []) as AdminUser[];
  },

  addAdmin: async (username: string): Promise<boolean> => {
    const cleanUsername = username.trim().replace(/^@/, '');
    if (!cleanUsername) throw new Error('Introduce un nombre de usuario');

    const { error } = await (supabase.rpc as any)('add_admin', {
      p_username: cleanUsername,
    });
    if (error) throw new Error(error.message || 'Error al añadir administrador');
    return true;
  },

  removeAdmin: async (targetUserId: string): Promise<boolean> => {
    const { error } = await (supabase.rpc as any)('remove_admin', {
      p_target_id: targetUserId,
    });
    if (error) throw new Error(error.message || 'Error al revocar permisos de administrador');
    return true;
  },
};
