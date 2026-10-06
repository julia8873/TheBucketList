import { z } from 'zod';

export const updateProfileSchema = z.object({
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username must be under 30 characters')
    .regex(/^[a-z0-9_]+$/, 'Only lowercase letters, numbers and underscores')
    .trim(),
  display_name: z.string().max(60).trim().optional(),
  bio: z.string().max(200).trim().optional(),
  visibility: z.enum(['public', 'followers', 'private']).default('public'),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
