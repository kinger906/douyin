import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';

import type { AuthSuccessResponse } from '@douyin/api-client';

const ACCESS_TOKEN_KEY = 'accessToken';
const REFRESH_TOKEN_KEY = 'refreshToken';
const USER_KEY = 'sessionUser';

export type SessionUser = AuthSuccessResponse['user'];

type SessionState = {
  hydrated: boolean;
  accessToken: string | null;
  refreshToken: string | null;
  user: SessionUser | null;
  hydrate: () => Promise<void>;
  setSession: (session: AuthSuccessResponse) => Promise<void>;
  clearSession: () => Promise<void>;
};

async function writeValue(key: string, value: string | null) {
  if (value === null) {
    await SecureStore.deleteItemAsync(key);
    return;
  }

  await SecureStore.setItemAsync(key, value);
}

export const useSessionStore = create<SessionState>((set) => ({
  hydrated: false,
  accessToken: null,
  refreshToken: null,
  user: null,
  async hydrate() {
    const [accessToken, refreshToken, rawUser] = await Promise.all([
      SecureStore.getItemAsync(ACCESS_TOKEN_KEY),
      SecureStore.getItemAsync(REFRESH_TOKEN_KEY),
      SecureStore.getItemAsync(USER_KEY),
    ]);

    let user: SessionUser | null = null;
    if (rawUser) {
      try {
        user = JSON.parse(rawUser) as SessionUser;
      } catch {
        user = null;
      }
    }

    set({
      hydrated: true,
      accessToken,
      refreshToken,
      user,
    });
  },
  async setSession(session) {
    await Promise.all([
      writeValue(ACCESS_TOKEN_KEY, session.accessToken),
      writeValue(REFRESH_TOKEN_KEY, session.refreshToken),
      writeValue(USER_KEY, JSON.stringify(session.user)),
    ]);

    set({
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
      user: session.user,
      hydrated: true,
    });
  },
  async clearSession() {
    await Promise.all([
      SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY),
      SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
      SecureStore.deleteItemAsync(USER_KEY),
    ]);

    set({
      accessToken: null,
      refreshToken: null,
      user: null,
      hydrated: true,
    });
  },
}));
