export type FeedCursor = {
  createdAt: Date;
  id: string;
};

type EncodedFeedCursor = {
  createdAt: string;
  id: string;
};

export function encodeCursor(createdAt: Date, id: string): string {
  const payload: EncodedFeedCursor = {
    createdAt: createdAt.toISOString(),
    id,
  };

  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
}

export function decodeCursor(cursor: string): FeedCursor {
  try {
    const parsed = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')) as Partial<EncodedFeedCursor>;
    const createdAt = new Date(parsed.createdAt ?? '');

    if (typeof parsed.id !== 'string' || !parsed.id || Number.isNaN(createdAt.getTime())) {
      throw new Error('Invalid cursor');
    }

    return {
      createdAt,
      id: parsed.id,
    };
  } catch {
    throw new Error('Invalid cursor');
  }
}
