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

export type ReportTargetType = 'user' | 'bucket' | 'album' | 'comment';

export interface BlockerProfile {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
}

export interface UserReportItem {
  id: string;
  reason: string;
  details: string | null;
  status: string | null;
  resolved: boolean | null;
  created_at: string | null;
  target_type: ReportTargetType;
  target_title: string | null;
  target_excerpt: string | null;
  bucket_id: string | null;
  album_id: string | null;
  comment_id: string | null;
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
    suspended_at?: string | null;
  } | null;
}

function one<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function normalizeReport(item: any): UserReportItem {
  const unknownUser = (id: string | null | undefined) =>
    id ? { id, username: 'usuario', display_name: null, avatar_url: null } : null;
  return {
    id: item.id,
    reason: item.reason,
    details: item.details ?? null,
    status: item.status ?? null,
    resolved: item.resolved ?? null,
    created_at: item.created_at ?? null,
    target_type: (item.target_type as ReportTargetType) || 'user',
    target_title: item.target_title ?? null,
    target_excerpt: item.target_excerpt ?? null,
    bucket_id: item.bucket_id ?? null,
    album_id: item.album_id ?? null,
    comment_id: item.comment_id ?? null,
    reporter: one(item.reporter) ?? unknownUser(item.reporter_id),
    reported: one(item.reported) ?? unknownUser(item.reported_user_id),
  };
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
   * Comprueba si el usuario actual ha sido bloqueado por targetUserId.
   * Los administradores nunca son bloqueados para poder gestionar perfiles y reportes.
   */
  checkIsBlockedBy: async (currentUserId: string, targetUserId: string): Promise<boolean> => {
    if (!currentUserId || !targetUserId) return false;

    // Si el usuario actual es admin, nunca se le bloquea la visibilidad
    const { data: myProfile } = await supabase
      .from('profiles')
      .select('role, username')
      .eq('id', currentUserId)
      .maybeSingle();

    if (
      myProfile?.role === 'admin' ||
      myProfile?.username?.toLowerCase() === 'juliamiralles8873'
    ) {
      return false;
    }

    const { data, error } = await supabase
      .from('blocked_users')
      .select('id')
      .eq('blocker_id', targetUserId)
      .eq('blocked_id', currentUserId)
      .maybeSingle();

    if (error) return false;
    return !!data;
  },

  /**
   * Identidad mínima (nombre, usuario, foto) de alguien que te ha bloqueado.
   * Devuelve null si no te ha bloqueado o si eres administrador.
   * Permite mostrar "Este usuario te ha bloqueado" aunque su perfil completo no sea visible.
   */
  getBlockerProfile: async (targetUserId: string): Promise<BlockerProfile | null> => {
    if (!targetUserId) return null;
    const { data, error } = await (supabase.rpc as any)('get_blocker_profile', {
      p_user_id: targetUserId,
    });
    if (error || !data) return null;
    return data as BlockerProfile;
  },

  /**
   * Obtiene todos los IDs de usuarios con bloqueo mutuo (bloqueados o que te han bloqueado).
   * Para administradores, no se oculta a quienes hayan bloqueado al admin para poder moderar.
   */
  getMutualBlockedUserIds: async (currentUserId: string): Promise<string[]> => {
    if (!currentUserId) return [];

    const { data: myProfile } = await supabase
      .from('profiles')
      .select('role, username')
      .eq('id', currentUserId)
      .maybeSingle();

    const isAdmin =
      myProfile?.role === 'admin' ||
      myProfile?.username?.toLowerCase() === 'juliamiralles8873';

    const { data, error } = await supabase
      .from('blocked_users')
      .select('blocker_id, blocked_id')
      .or(`blocker_id.eq.${currentUserId},blocked_id.eq.${currentUserId}`);

    if (error || !data) return [];
    const ids = new Set<string>();
    for (const row of data) {
      if (row.blocker_id === currentUserId) ids.add(row.blocked_id);
      // Solo ocultamos a quienes nos bloquearon si NO somos admin
      if (!isAdmin && row.blocked_id === currentUserId) ids.add(row.blocker_id);
    }
    return Array.from(ids);
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
      target_type: 'user',
      reason: params.reason,
      details: params.details?.trim() || null,
      status: 'pending',
      resolved: false,
    });

    if (error) throw new Error(error.message || 'Error al enviar reporte');
  },

  /**
   * Reporta una tarea, un álbum o un comentario. El servidor deduce el autor
   * (usuario reportado) y guarda una copia del contenido para el administrador.
   */
  reportContent: async (params: {
    reporterId: string;
    targetType: Exclude<ReportTargetType, 'user'>;
    targetId: string;
    reason: string;
    details?: string;
  }): Promise<void> => {
    const target =
      params.targetType === 'bucket'
        ? { bucket_id: params.targetId }
        : params.targetType === 'album'
          ? { album_id: params.targetId }
          : { comment_id: params.targetId };

    const { error } = await supabase.from('reports').insert({
      reporter_id: params.reporterId,
      ...target,
      target_type: params.targetType,
      reason: params.reason,
      details: params.details?.trim() || null,
      status: 'pending',
      resolved: false,
    } as any);

    if (error) throw new Error(error.message || 'Error al enviar reporte');
  },

  /**
   * Obtiene la lista de reportes para el panel de administración
   */
  getAdminReports: async (): Promise<UserReportItem[]> => {
    // 1. Intentar mediante RPC security definer para evitar cualquier bloqueo RLS
    try {
      const { data, error } = await supabase.rpc('get_admin_reports');
      if (!error && Array.isArray(data)) {
        return data.map(normalizeReport);
      }
    } catch {
      // Continuar con fallback directo
    }

    // 2. Fallback directo a la tabla reports
    const { data, error } = await supabase
      .from('reports')
      .select(`
        id,
        reason,
        details,
        status,
        resolved,
        created_at,
        target_type,
        target_title,
        target_excerpt,
        bucket_id,
        album_id,
        comment_id,
        reported_user_id,
        reporter_id,
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
          avatar_url,
          suspended_at
        )
      `)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message || 'Error al obtener reportes');

    return (data ?? []).map(normalizeReport);
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

  /**
   * Elimina el contenido reportado (tarea, álbum o comentario) y cierra el reporte (administrador)
   */
  adminRemoveReportedContent: async (reportId: string): Promise<void> => {
    const { error } = await (supabase.rpc as any)('admin_remove_reported_content', {
      p_report_id: reportId,
    });
    if (error) throw new Error(error.message || 'Error al eliminar el contenido reportado');
  },

  /**
   * Bloquea (suspende) la cuenta de un usuario: no podrá iniciar sesión y su contenido deja de verse (administrador)
   */
  adminSuspendUser: async (targetUserId: string, reason?: string): Promise<void> => {
    const { error } = await (supabase.rpc as any)('admin_suspend_user', {
      p_user_id: targetUserId,
      p_reason: reason ?? null,
    });
    if (error) throw new Error(error.message || 'Error al bloquear la cuenta');
  },

  /**
   * Reactiva una cuenta suspendida (administrador)
   */
  adminUnsuspendUser: async (targetUserId: string): Promise<void> => {
    const { error } = await (supabase.rpc as any)('admin_unsuspend_user', {
      p_user_id: targetUserId,
    });
    if (error) throw new Error(error.message || 'Error al reactivar la cuenta');
  },
};
