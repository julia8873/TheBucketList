import { i18n } from '@bucketlist/shared';
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
    if (error) throw new Error(error.message || i18n.t('admin_admins.err_load'));
    return (data ?? []) as AdminUser[];
  },

  addAdmin: async (username: string): Promise<boolean> => {
    const cleanUsername = username.trim().replace(/^@/, '');
    if (!cleanUsername) throw new Error(i18n.t('admin_admins.err_username_required'));

    const { error } = await (supabase.rpc as any)('add_admin', {
      p_username: cleanUsername,
    });
    if (error) throw new Error(error.message || i18n.t('admin_admins.toast_add_error_title'));
    return true;
  },

  removeAdmin: async (targetUserId: string): Promise<boolean> => {
    const { error } = await (supabase.rpc as any)('remove_admin', {
      p_target_id: targetUserId,
    });
    if (error) throw new Error(error.message || i18n.t('admin_admins.toast_revoke_error_title'));
    return true;
  },
};
