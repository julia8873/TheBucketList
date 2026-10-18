import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminsApi, AdminUser } from '../services/api/admins';
import { useToast } from '@bucketlist/ui';

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

  return useMutation({
    mutationFn: async (username: string) => {
      return adminsApi.addAdmin(username);
    },
    onSuccess: (_, username) => {
      queryClient.invalidateQueries({ queryKey: ADMINS_QUERY_KEY });
      toast.show({
        title: 'Administrador añadido',
        message: `@${username.replace(/^@/, '')} ahora tiene permisos de administrador.`,
        type: 'success',
      });
    },
    onError: (err: any) => {
      toast.show({
        title: 'Error al añadir administrador',
        message: err.message || 'No se pudo añadir al usuario como administrador',
        type: 'error',
      });
    },
  });
}

export function useRemoveAdmin() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async (targetUserId: string) => {
      return adminsApi.removeAdmin(targetUserId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADMINS_QUERY_KEY });
      toast.show({
        title: 'Permisos revocados',
        message: 'El usuario ya no tiene permisos de administrador.',
        type: 'info',
      });
    },
    onError: (err: any) => {
      toast.show({
        title: 'Error al revocar',
        message: err.message || 'No se pudo revocar el rol de administrador',
        type: 'error',
      });
    },
  });
}
