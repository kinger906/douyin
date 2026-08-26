import { z } from 'zod';

export const moderationActionBodySchema = z.object({
  reason: z.string().max(500).optional(),
});

export const updateUserBodySchema = z.object({
  status: z.enum(['active', 'disabled']).optional(),
  role: z.enum(['user', 'admin']).optional(),
});
