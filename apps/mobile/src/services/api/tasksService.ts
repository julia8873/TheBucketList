import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export interface UnassignedTask {
  id: string;
  title: string;
  categoryName: string;
  coverKey: string;
  location?: string;
}

const MOCK_TASKS: UnassignedTask[] = [
  { id: '1', title: 'Aprender a surfear', categoryName: 'Deporte', coverKey: 'atardecer' },
  { id: '2', title: 'Senderismo en Dolomitas', categoryName: 'Aventura', location: 'Italia', coverKey: 'aurora' },
  { id: '3', title: 'Amanecer en Machu Picchu', categoryName: 'Viajes', location: 'Perú', coverKey: 'cielo' },
  { id: '4', title: 'Probar sushi en Tokio', categoryName: 'Comida', location: 'Japón', coverKey: 'dorado' },
  { id: '5', title: 'Aprender a tocar la guitarra', categoryName: 'Aprender', coverKey: 'violeta' },
  { id: '6', title: 'Dormir en un iglú', categoryName: 'Aventura', location: 'Finlandia', coverKey: 'cielo' },
  // 6 more to make it 12 total
  { id: '7', title: 'Bucear en la Gran Barrera', categoryName: 'Deporte', coverKey: 'cielo' },
  { id: '8', title: 'Ver los cerezos en flor', categoryName: 'Viajes', location: 'Japón', coverKey: 'violeta' },
  { id: '9', title: 'Aprender fotografía', categoryName: 'Aprender', coverKey: 'aurora' },
  { id: '10', title: 'Correr una maratón', categoryName: 'Deporte', coverKey: 'dorado' },
  { id: '11', title: 'Visitar el Coliseo', categoryName: 'Viajes', location: 'Italia', coverKey: 'atardecer' },
  { id: '12', title: 'Cocinar pasta fresca', categoryName: 'Comida', coverKey: 'atardecer' },
];

const DEFAULT_TASKS: UnassignedTask[] = [
  { id: 'd1', title: 'Ver una aurora boreal', categoryName: 'Viajes', location: 'Noruega', coverKey: 'aurora' },
  { id: 'd2', title: 'Volar en globo al amanecer', categoryName: 'Viajes', location: 'Capadocia', coverKey: 'atardecer' },
  { id: 'd3', title: 'Dormir en un iglú', categoryName: 'Aventura', location: 'Finlandia', coverKey: 'cielo' },
  { id: 'd4', title: 'Nadar con delfines', categoryName: 'Aventura', location: 'Azores', coverKey: 'cielo' },
  { id: 'd5', title: 'Cenar en un faro', categoryName: 'Comida', location: 'Bretaña', coverKey: 'dorado' },
];

export const defaultTasks = DEFAULT_TASKS;

import { supabase } from '../supabase';

export const tasksService = {
  async getUnassignedTasks(): Promise<UnassignedTask[]> {
    const { data: userAuth, error: userError } = await supabase.auth.getUser();
    if (userError || !userAuth.user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('buckets')
      .select('id, title, location_text, categories(name_es)')
      .eq('user_id', userAuth.user.id);

    if (error) throw error;

    return data.map(b => ({
      id: b.id,
      title: b.title,
      categoryName: (b.categories as any)?.name_es || 'Sin categoría',
      location: b.location_text || undefined,
      coverKey: 'aurora',
    }));
  },

  async assignTasksToAlbum(albumId: string, taskIds: string[]): Promise<void> {
    if (!taskIds.length) return;
    
    const itemsToUpsert = taskIds.map(id => ({
      album_id: albumId,
      bucket_id: id,
    }));

    const { error } = await supabase
      .from('album_items')
      .upsert(itemsToUpsert);

    if (error) throw error;
  },

  async createTasksFromDefaults(ids: string[]): Promise<string[]> {
    const { data: userAuth, error: userError } = await supabase.auth.getUser();
    if (userError || !userAuth.user) throw new Error('Not authenticated');

    const defaultItems = DEFAULT_TASKS.filter(dt => ids.includes(dt.id));
    if (!defaultItems.length) return [];
    
    const inserts = defaultItems.map(dt => ({
      user_id: userAuth.user.id,
      title: dt.title,
      location_text: dt.location || null,
      status: 'pending' as const,
    }));

    const { data, error } = await supabase
      .from('buckets')
      .insert(inserts)
      .select('id');

    if (error) throw error;

    return data.map(b => b.id);
  }
};

export function useUnassignedTasks() {
  return useQuery({
    queryKey: ['unassigned_tasks'],
    queryFn: () => tasksService.getUnassignedTasks(),
  });
}

export function useAssignTasks() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ albumId, taskIds }: { albumId: string, taskIds: string[] }) => tasksService.assignTasksToAlbum(albumId, taskIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unassigned_tasks'] });
      queryClient.invalidateQueries({ queryKey: ['album'] });
      queryClient.invalidateQueries({ queryKey: ['albums'] });
      queryClient.invalidateQueries({ queryKey: ['buckets'] });
    }
  });
}

export function useCreateTasksFromDefaults() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) => tasksService.createTasksFromDefaults(ids),
  });
}
