import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  blockReportApi,
  type BlockedUserItem,
  type UserReportItem,
  type ReportTargetType,
} from '../services/api/blockReport';
import { useAuthStore } from '../stores/auth.store';
import { useToast } from '@bucketlist/ui';

export const BLOCKED_USERS_KEY = ['blocked_users'];
export const ADMIN_REPORTS_KEY = ['admin_reports'];

export function useBlockedUsers() {
  const { user } = useAuthStore();
  return useQuery({
    queryKey: [...BLOCKED_USERS_KEY, user?.id],
    queryFn: () => blockReportApi.getBlockedUsers(user?.id || ''),
    enabled: !!user?.id,
    staleTime: 1000 * 60, // 1 min
  });
}

export function useIsUserBlocked(targetUserId?: string) {
  const { user } = useAuthStore();
  return useQuery({
    queryKey: [...BLOCKED_USERS_KEY, user?.id, 'is_blocked', targetUserId],
    queryFn: () => blockReportApi.checkIsBlocked(user?.id || '', targetUserId || ''),
    enabled: !!user?.id && !!targetUserId && user.id !== targetUserId,
    staleTime: 1000 * 30,
  });
}

export function useIsUserBlockedBy(targetUserId?: string) {
  const { user } = useAuthStore();
  return useQuery({
    queryKey: [...BLOCKED_USERS_KEY, user?.id, 'is_blocked_by', targetUserId],
    queryFn: () => blockReportApi.checkIsBlockedBy(user?.id || '', targetUserId || ''),
    enabled: !!user?.id && !!targetUserId && user.id !== targetUserId,
    staleTime: 1000 * 30,
  });
}

/** Identidad mínima de quien te ha bloqueado (null si no te ha bloqueado o eres administrador). */
export function useBlockerProfile(targetUserId?: string, enabled = true) {
  const { user } = useAuthStore();
  return useQuery({
    queryKey: [...BLOCKED_USERS_KEY, user?.id, 'blocker_profile', targetUserId],
    queryFn: () => blockReportApi.getBlockerProfile(targetUserId || ''),
    enabled: enabled && !!user?.id && !!targetUserId && user.id !== targetUserId,
    staleTime: 1000 * 30,
  });
}

export function useBlockUser() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const toast = useToast();

  return useMutation({
    mutationFn: async (targetUserId: string) => {
      return blockReportApi.blockUser(targetUserId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: BLOCKED_USERS_KEY });
      queryClient.invalidateQueries({ queryKey: ['friends'] });
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      queryClient.invalidateQueries({ queryKey: ['explore'] });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      queryClient.invalidateQueries({ queryKey: ['buckets'] });
      queryClient.invalidateQueries({ queryKey: ['albums'] });
      toast.success(
        'Has bloqueado a este usuario. Ya no verás su contenido ni podréis interactuar.',
        'Usuario bloqueado'
      );
    },
    onError: (err: any) => {
      toast.error(
        err.message || 'No se pudo bloquear al usuario',
        'Error al bloquear'
      );
    },
  });
}

export function useUnblockUser() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async (targetUserId: string) => {
      return blockReportApi.unblockUser(targetUserId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: BLOCKED_USERS_KEY });
      queryClient.invalidateQueries({ queryKey: ['friends'] });
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      queryClient.invalidateQueries({ queryKey: ['explore'] });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      queryClient.invalidateQueries({ queryKey: ['buckets'] });
      queryClient.invalidateQueries({ queryKey: ['albums'] });
      toast.success(
        'Has desbloqueado a este usuario correctamente.',
        'Usuario desbloqueado'
      );
    },
    onError: (err: any) => {
      toast.error(
        err.message || 'No se pudo desbloquear al usuario',
        'Error al desbloquear'
      );
    },
  });
}

export function useReportUser() {
  const toast = useToast();
  const { user } = useAuthStore();

  return useMutation({
    mutationFn: async ({
      reportedUserId,
      reason,
      details,
    }: {
      reportedUserId: string;
      reason: string;
      details?: string;
    }) => {
      if (!user?.id) throw new Error('Debes iniciar sesión para reportar');
      return blockReportApi.reportUser({
        reporterId: user.id,
        reportedUserId,
        reason,
        details,
      });
    },
    onSuccess: () => {
      toast.show({
        title: 'Reporte enviado',
        message: 'Gracias por avisarnos. El equipo de administración revisará el caso.',
        type: 'success',
      });
    },
    onError: (err: any) => {
      toast.show({
        title: 'Error al reportar',
        message: err.message || 'No se pudo enviar el reporte',
        type: 'error',
      });
    },
  });
}

export function useAdminReports() {
  return useQuery({
    queryKey: ADMIN_REPORTS_KEY,
    queryFn: () => blockReportApi.getAdminReports(),
    staleTime: 1000 * 30,
  });
}

export function useDismissReport() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async (reportId: string) => {
      return blockReportApi.dismissReport(reportId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADMIN_REPORTS_KEY });
      toast.show({
        title: 'Reporte desestimado',
        message: 'El reporte ha sido marcado como revisado.',
        type: 'info',
      });
    },
    onError: (err: any) => {
      toast.show({
        title: 'Error',
        message: err.message || 'No se pudo desestimar el reporte',
        type: 'error',
      });
    },
  });
}

export function useAdminDeleteUser() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async (targetUserId: string) => {
      return blockReportApi.adminDeleteUser(targetUserId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADMIN_REPORTS_KEY });
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      queryClient.invalidateQueries({ queryKey: ['friends'] });
      toast.show({
        title: 'Cuenta eliminada',
        message: 'La cuenta del usuario infractor y sus datos han sido eliminados por completo.',
        type: 'success',
      });
    },
    onError: (err: any) => {
      toast.show({
        title: 'Error al eliminar cuenta',
        message: err.message || 'No se pudo eliminar la cuenta del usuario',
        type: 'error',
      });
    },
  });
}

/** Reporta una tarea, un álbum o un comentario al administrador. */
export function useReportContent() {
  const toast = useToast();
  const { user } = useAuthStore();

  return useMutation({
    mutationFn: async ({
      targetType,
      targetId,
      reason,
      details,
    }: {
      targetType: Exclude<ReportTargetType, 'user'>;
      targetId: string;
      reason: string;
      details?: string;
    }) => {
      if (!user?.id) throw new Error('Debes iniciar sesión para reportar');
      return blockReportApi.reportContent({
        reporterId: user.id,
        targetType,
        targetId,
        reason,
        details,
      });
    },
    onSuccess: () => {
      toast.show({
        title: 'Reporte enviado',
        message: 'Gracias por avisarnos. El equipo de administración revisará el caso.',
        type: 'success',
      });
    },
    onError: (err: any) => {
      toast.show({
        title: 'Error al reportar',
        message: err.message || 'No se pudo enviar el reporte',
        type: 'error',
      });
    },
  });
}

/** Admin: elimina la tarea, álbum o comentario reportado. */
export function useAdminRemoveReportedContent() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async (reportId: string) => blockReportApi.adminRemoveReportedContent(reportId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADMIN_REPORTS_KEY });
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      queryClient.invalidateQueries({ queryKey: ['explore'] });
      queryClient.invalidateQueries({ queryKey: ['buckets'] });
      queryClient.invalidateQueries({ queryKey: ['albums'] });
      toast.show({
        title: 'Contenido eliminado',
        message: 'El contenido reportado se ha eliminado y el reporte queda cerrado.',
        type: 'success',
      });
    },
    onError: (err: any) => {
      toast.show({
        title: 'Error al eliminar',
        message: err.message || 'No se pudo eliminar el contenido reportado',
        type: 'error',
      });
    },
  });
}

/** Admin: bloquea (suspende) la cuenta del usuario infractor. */
export function useAdminSuspendUser() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async ({ userId, reason }: { userId: string; reason?: string }) =>
      blockReportApi.adminSuspendUser(userId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADMIN_REPORTS_KEY });
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      queryClient.invalidateQueries({ queryKey: ['friends'] });
      toast.show({
        title: 'Cuenta bloqueada',
        message: 'El usuario ya no puede iniciar sesión y su contenido deja de ser visible.',
        type: 'success',
      });
    },
    onError: (err: any) => {
      toast.show({
        title: 'Error al bloquear la cuenta',
        message: err.message || 'No se pudo bloquear la cuenta del usuario',
        type: 'error',
      });
    },
  });
}

/** Admin: reactiva una cuenta suspendida. */
export function useAdminUnsuspendUser() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async (userId: string) => blockReportApi.adminUnsuspendUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADMIN_REPORTS_KEY });
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      toast.show({
        title: 'Cuenta reactivada',
        message: 'El usuario puede volver a iniciar sesión.',
        type: 'success',
      });
    },
    onError: (err: any) => {
      toast.show({
        title: 'Error al reactivar',
        message: err.message || 'No se pudo reactivar la cuenta del usuario',
        type: 'error',
      });
    },
  });
}
