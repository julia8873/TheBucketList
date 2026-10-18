import { supabase } from '../supabase';

export interface BlockedUserItem {
  id: string;
  blocked_id: string;
  created_at: string;
  profile: {
    id: string;
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  } | null;
}

export interface UserReportItem {
  id: string;
  reason: string;
  details: string | null;
  status: string | null;
  resolved: boolean | null;
  created_at: string | null;
  reporter: {
    id: string;
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  } | null;
  reported: {
    id: string;
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  } | null;
}

function one<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export const blockReportApi = {
  /**
   * Bloquea a un usuario y elimina cualquier relación de seguimiento mutuo
   */
  blockUser: async (targetUserId: string): Promise<boolean> => {
    const { error } = await (supabase.rpc as any)('block_user', {
      p_target_user_id: targetUserId,
    });
    if (error) throw new Error(error.message || 'Error al bloquear usuario');
    return true;
  },

  /**
   * Desbloquea a un usuario
   */
  unblockUser: async (targetUserId: string): Promise<boolean> => {
    const { error } = await (supabase.rpc as any)('unblock_user', {
      p_target_user_id: targetUserId,
    });
    if (error) throw new Error(error.message || 'Error al desbloquear usuario');
    return true;
  },

  /**
   * Comprueba si el usuario actual ha bloqueado a targetUserId
   */
  checkIsBlocked: async (currentUserId: string, targetUserId: string): Promise<boolean> => {
    if (!currentUserId || !targetUserId) return false;
    const { data, error } = await supabase
      .from('blocked_users')
      .select('id')
      .eq('blocker_id', currentUserId)
      .eq('blocked_id', targetUserId)
      .maybeSingle();

    if (error) return false;
    return !!data;
  },

  /**
   * Obtiene la lista de usuarios bloqueados por el usuario actual
   */
  getBlockedUsers: async (currentUserId: string): Promise<BlockedUserItem[]> => {
    if (!currentUserId) return [];

    const { data, error } = await supabase
      .from('blocked_users')
      .select(`
        id,
        blocked_id,
        created_at,
        profiles:blocked_id (
          id,
          username,
          display_name,
          avatar_url
        )
      `)
      .eq('blocker_id', currentUserId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message || 'Error al obtener usuarios bloqueados');

    return (data ?? []).map((row: any) => ({
      id: row.id,
      blocked_id: row.blocked_id,
      created_at: row.created_at,
      profile: one(row.profiles),
    }));
  },

  /**
   * Envía un reporte sobre un usuario por motivo de infracción
   */
  reportUser: async (params: {
    reporterId: string;
    reportedUserId: string;
    reason: string;
    details?: string;
  }): Promise<void> => {
    const { error } = await supabase.from('reports').insert({
      reporter_id: params.reporterId,
      reported_user_id: params.reportedUserId,
      reason: params.reason,
      details: params.details?.trim() || null,
      status: 'pending',
      resolved: false,
    });

    if (error) throw new Error(error.message || 'Error al enviar reporte');
  },

  /**
   * Obtiene la lista de reportes para el panel de administración
   */
  getAdminReports: async (): Promise<UserReportItem[]> => {
    const { data, error } = await supabase
      .from('reports')
      .select(`
        id,
        reason,
        details,
        status,
        resolved,
        created_at,
        reporter:reporter_id (
          id,
          username,
          display_name,
          avatar_url
        ),
        reported:reported_user_id (
          id,
          username,
          display_name,
          avatar_url
        )
      `)
      .not('reported_user_id', 'is', null)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message || 'Error al obtener reportes');

    return (data ?? []).map((row: any) => ({
      id: row.id,
      reason: row.reason,
      details: row.details,
      status: row.status,
      resolved: row.resolved,
      created_at: row.created_at,
      reporter: one(row.reporter),
      reported: one(row.reported),
    }));
  },

  /**
   * Desestima un reporte
   */
  dismissReport: async (reportId: string): Promise<void> => {
    const { error } = await supabase
      .from('reports')
      .update({ status: 'dismissed', resolved: true })
      .eq('id', reportId);

    if (error) throw new Error(error.message || 'Error al desestimar reporte');
  },

  /**
   * Elimina la cuenta del usuario reportado (Acción de administrador)
   */
  adminDeleteUser: async (targetUserId: string): Promise<void> => {
    const { error } = await (supabase.rpc as any)('admin_delete_user', {
      target_user_id: targetUserId,
    });

    if (error) throw new Error(error.message || 'Error al eliminar cuenta de usuario');
  },
};
