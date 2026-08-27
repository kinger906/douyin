import { z } from 'zod';

export const updateMeBodySchema = z
  .object({
    displayName: z.string().min(1).max(40).optional(),
    avatarUrl: z.string().url().nullable().optional(),
  })
  .refine((value) => value.displayName !== undefined || value.avatarUrl !== undefined, {
    message: 'At least one field is required',
  });

export type UpdateMeBody = z.infer<typeof updateMeBodySchema>;
