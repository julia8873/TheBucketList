import { z } from 'zod';

export const subtaskSchema = z.object({
  id: z.string().uuid().optional(),
  title: z
    .string()
    .min(1, 'El título del paso es obligatorio')
    .max(200, 'El paso no puede superar los 200 caracteres'),
  done: z.boolean().default(false),
  position: z.number().default(0),
});

export const createBucketSchema = z.object({
  title: z
    .string()
    .min(1, 'El título de la tarea es obligatorio')
    .max(200, 'El título no puede superar los 200 caracteres'),
  description: z.string().max(1000, 'La descripción no puede superar los 1000 caracteres').optional(),
  category_id: z.string().uuid().optional().nullable(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  visibility: z.enum(['public', 'followers', 'private']).default('public'),
  deadline: z.date().optional().nullable(),
  location_text: z.string().optional().nullable(),
  location_lat: z.number().optional().nullable(),
  location_lng: z.number().optional().nullable(),
  subtasks: z.array(subtaskSchema).max(10).optional(),
  drive_url: z.string().optional().nullable(),
});

export const updateBucketSchema = createBucketSchema.partial().extend({
  status: z.enum(['pending', 'in_progress', 'completed', 'expired', 'archived']).optional(),
  completed_at: z.date().optional().nullable(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
});

export type SubtaskForm = z.infer<typeof subtaskSchema>;
export type CreateBucketForm = z.infer<typeof createBucketSchema>;
export type UpdateBucketForm = z.infer<typeof updateBucketSchema>;
