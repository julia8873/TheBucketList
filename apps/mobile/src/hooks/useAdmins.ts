import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminsApi, AdminUser } from '../services/api/admins';
import { useToast } from '@bucketlist/ui';
import { useTranslation } from '@bucketlist/shared';

export const ADMINS_QUERY_KEY = ['admins_list'];

export function useAdminsList() {
  return useQuery({
    queryKey: ADMINS_QUERY_KEY,
    queryFn: () => adminsApi.getAdmins(),
    staleTime: 1000 * 30,
  });
}

export function useAddAdmin() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (username: string) => {
      return adminsApi.addAdmin(username);
    },
    onSuccess: (_, username) => {
      queryClient.invalidateQueries({ queryKey: ADMINS_QUERY_KEY });
      toast.show({
        title: t('admin_admins.toast_added_title'),
        message: t('admin_admins.toast_added_msg', { username: username.replace(/^@/, '') }),
        type: 'success',
      });
    },
    onError: (err: any) => {
      toast.show({
        title: t('admin_admins.toast_add_error_title'),
        message: err.message || t('admin_admins.toast_add_error_msg'),
        type: 'error',
      });
    },
  });
}

export function useRemoveAdmin() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (targetUserId: string) => {
      return adminsApi.removeAdmin(targetUserId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADMINS_QUERY_KEY });
      toast.show({
        title: t('admin_admins.toast_revoked_title'),
        message: t('admin_admins.toast_revoked_msg'),
        type: 'info',
      });
    },
    onError: (err: any) => {
      toast.show({
        title: t('admin_admins.toast_revoke_error_title'),
        message: err.message || t('admin_admins.toast_revoke_error_msg'),
        type: 'error',
      });
    },
  });
}
