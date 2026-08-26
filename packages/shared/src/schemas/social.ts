import { z } from 'zod';

export const createCommentBodySchema = z.object({
  body: z.string().min(1).max(1000),
  parentId: z.string().uuid().optional(),
});

export type CreateCommentBody = z.infer<typeof createCommentBodySchema>;
