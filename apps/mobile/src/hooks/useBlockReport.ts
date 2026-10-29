import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  blockReportApi,
  type BlockedUserItem,
  type UserReportItem,
  type ReportTargetType,
} from '../services/api/blockReport';
import { useAuthStore } from '../stores/auth.store';
import { useToast } from '@bucketlist/ui';
import { useTranslation } from '@bucketlist/shared';

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
  const { t } = useTranslation();

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
      toast.success(t('admin_reports.toast_blocked_msg'), t('admin_reports.toast_blocked_title'));
    },
    onError: (err: any) => {
      toast.error(err.message || t('admin_reports.toast_block_error_msg'), t('admin_reports.toast_block_error_title'));
    },
  });
}

export function useUnblockUser() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const { t } = useTranslation();

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
      toast.success(t('admin_reports.toast_unblocked_msg'), t('admin_reports.toast_unblocked_title'));
    },
    onError: (err: any) => {
      toast.error(err.message || t('admin_reports.toast_unblock_error_msg'), t('admin_reports.toast_unblock_error_title'));
    },
  });
}

export function useReportUser() {
  const toast = useToast();
  const { t } = useTranslation();
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
      if (!user?.id) throw new Error(t('admin_reports.login_required'));
      return blockReportApi.reportUser({
        reporterId: user.id,
        reportedUserId,
        reason,
        details,
      });
    },
    onSuccess: () => {
      toast.show({
        title: t('admin_reports.toast_report_sent_title'),
        message: t('admin_reports.toast_report_sent_msg'),
        type: 'success',
      });
    },
    onError: (err: any) => {
      toast.show({
        title: t('admin_reports.toast_report_error_title'),
        message: err.message || t('admin_reports.toast_report_error_msg'),
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
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (reportId: string) => {
      return blockReportApi.dismissReport(reportId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADMIN_REPORTS_KEY });
      toast.show({
        title: t('admin_reports.toast_dismissed_title'),
        message: t('admin_reports.toast_dismissed_msg'),
        type: 'info',
      });
    },
    onError: (err: any) => {
      toast.show({
        title: t('common.error'),
        message: err.message || t('admin_reports.toast_dismiss_error_msg'),
        type: 'error',
      });
    },
  });
}

export function useAdminDeleteUser() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (targetUserId: string) => {
      return blockReportApi.adminDeleteUser(targetUserId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADMIN_REPORTS_KEY });
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      queryClient.invalidateQueries({ queryKey: ['friends'] });
      toast.show({
        title: t('admin_reports.toast_deleted_title'),
        message: t('admin_reports.toast_deleted_msg'),
        type: 'success',
      });
    },
    onError: (err: any) => {
      toast.show({
        title: t('admin_reports.toast_delete_error_title'),
        message: err.message || t('admin_reports.toast_delete_error_msg'),
        type: 'error',
      });
    },
  });
}

/** Reporta una tarea, un álbum o un comentario al administrador. */
export function useReportContent() {
  const toast = useToast();
  const { t } = useTranslation();
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
      if (!user?.id) throw new Error(t('admin_reports.login_required'));
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
        title: t('admin_reports.toast_report_sent_title'),
        message: t('admin_reports.toast_report_sent_msg'),
        type: 'success',
      });
    },
    onError: (err: any) => {
      toast.show({
        title: t('admin_reports.toast_report_error_title'),
        message: err.message || t('admin_reports.toast_report_error_msg'),
        type: 'error',
      });
    },
  });
}

/** Admin: elimina la tarea, álbum o comentario reportado. */
export function useAdminRemoveReportedContent() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (reportId: string) => blockReportApi.adminRemoveReportedContent(reportId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADMIN_REPORTS_KEY });
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      queryClient.invalidateQueries({ queryKey: ['explore'] });
      queryClient.invalidateQueries({ queryKey: ['buckets'] });
      queryClient.invalidateQueries({ queryKey: ['albums'] });
      toast.show({
        title: t('admin_reports.toast_removed_title'),
        message: t('admin_reports.toast_removed_msg'),
        type: 'success',
      });
    },
    onError: (err: any) => {
      toast.show({
        title: t('admin_reports.toast_remove_error_title'),
        message: err.message || t('admin_reports.toast_remove_error_msg'),
        type: 'error',
      });
    },
  });
}

/** Admin: bloquea (suspende) la cuenta del usuario infractor. */
export function useAdminSuspendUser() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async ({ userId, reason }: { userId: string; reason?: string }) =>
      blockReportApi.adminSuspendUser(userId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADMIN_REPORTS_KEY });
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      queryClient.invalidateQueries({ queryKey: ['friends'] });
      toast.show({
        title: t('admin_reports.toast_suspended_title'),
        message: t('admin_reports.toast_suspended_msg'),
        type: 'success',
      });
    },
    onError: (err: any) => {
      toast.show({
        title: t('admin_reports.toast_suspend_error_title'),
        message: err.message || t('admin_reports.toast_suspend_error_msg'),
        type: 'error',
      });
    },
  });
}

/** Admin: reactiva una cuenta suspendida. */
export function useAdminUnsuspendUser() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (userId: string) => blockReportApi.adminUnsuspendUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADMIN_REPORTS_KEY });
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      toast.show({
        title: t('admin_reports.toast_unsuspended_title'),
        message: t('admin_reports.toast_unsuspended_msg'),
        type: 'success',
      });
    },
    onError: (err: any) => {
      toast.show({
        title: t('admin_reports.toast_unsuspend_error_title'),
        message: err.message || t('admin_reports.toast_unsuspend_error_msg'),
        type: 'error',
      });
    },
  });
}
