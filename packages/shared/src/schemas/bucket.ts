import { z } from 'zod';

export const subtaskSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().min(1, 'Title is required').max(100),
  done: z.boolean().default(false),
  position: z.number().default(0),
});

export const createBucketSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100),
  description: z.string().max(500).optional(),
  category_id: z.string().uuid('Category is required'),
  visibility: z.enum(['public', 'followers', 'private']).default('public'),
  deadline: z.date().optional().nullable(),
  location_text: z.string().max(100).optional().nullable(),
  location_lat: z.number().optional().nullable(),
  location_lng: z.number().optional().nullable(),
  subtasks: z.array(subtaskSchema).max(10).optional(),
});

export const updateBucketSchema = createBucketSchema.partial().extend({
  status: z.enum(['pending', 'in_progress', 'completed', 'expired', 'archived']).optional(),
});

export type SubtaskForm = z.infer<typeof subtaskSchema>;
export type CreateBucketForm = z.infer<typeof createBucketSchema>;
export type UpdateBucketForm = z.infer<typeof updateBucketSchema>;
