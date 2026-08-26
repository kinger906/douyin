import { z } from 'zod';

export const createVideoBodySchema = z.object({
  title: z.string().min(1).max(120),
  description: z.string().max(2000).default(''),
  blobUrl: z.string().url(),
  coverUrl: z.string().url().optional(),
  durationMs: z.number().int().positive().max(600_000),
});

export type CreateVideoBody = z.infer<typeof createVideoBodySchema>;
