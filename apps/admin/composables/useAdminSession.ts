type AdminUser = {
  id: string;
  email: string | null;
  displayName: string;
  role: string;
};

type AuthResponse = {
  user: AdminUser;
  accessToken: string;
  expiresIn: number;
};

export function useAdminSession() {
  const accessToken = useState<string | null>('admin-access-token', () => null);
  const user = useState<AdminUser | null>('admin-user', () => null);

  function clearSession() {
    accessToken.value = null;
    user.value = null;
  }

  function setSession(session: AuthResponse) {
    if (session.user.role !== 'admin') {
      clearSession();
      throw new Error('Admin access is required');
    }

    accessToken.value = session.accessToken;
    user.value = session.user;
  }

  async function login(email: string, password: string) {
    const response = await $fetch<AuthResponse>('/api/v1/auth/login', {
      method: 'POST',
      body: { email, password },
    });

    setSession(response);
    return response;
  }

  async function refresh() {
    try {
      const response = await $fetch<AuthResponse>('/api/v1/auth/refresh', {
        method: 'POST',
      });

      setSession(response);
      return true;
    } catch {
      clearSession();
      return false;
    }
  }

  async function logout() {
    try {
      await $fetch('/api/v1/auth/logout', {
        method: 'POST',
      });
    } finally {
      clearSession();
    }
  }

  return {
    accessToken,
    user,
    clearSession,
    setSession,
    login,
    refresh,
    logout,
  };
}
