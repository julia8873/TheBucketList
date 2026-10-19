import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { blockReportApi, BlockedUserItem, UserReportItem } from '../services/api/blockReport';
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
