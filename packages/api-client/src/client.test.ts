import { describe, expect, it, vi } from 'vitest';
import { createApiClient } from './client';

describe('createApiClient', () => {
  it('sends bearer token on feed', async () => {
    const fetchMock = vi.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>(
      async () => new Response(JSON.stringify({ items: [], nextCursor: null }), { status: 200 }),
    );
    vi.stubGlobal('fetch', fetchMock);
    const api = createApiClient({
      baseUrl: 'http://localhost:3000',
      getAccessToken: () => 'tok',
    });
    await api.getFeed();
    const [, init] = fetchMock.mock.calls[0]!;
    expect(init?.headers).toMatchObject({ Authorization: 'Bearer tok' });
  });
});
