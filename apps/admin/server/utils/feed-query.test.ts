import { describe, expect, it } from 'vitest';
import { decodeCursor, encodeCursor } from './feed-query';

describe('feed cursor', () => {
  it('roundtrips', () => {
    const d = new Date('2026-01-01T00:00:00.000Z');
    const id = '11111111-1111-1111-1111-111111111111';

    expect(decodeCursor(encodeCursor(d, id))).toEqual({ createdAt: d, id });
  });
});
