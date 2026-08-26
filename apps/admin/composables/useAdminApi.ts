export function useAdminApi() {
  const { accessToken, clearSession, refresh } = useAdminSession();

  async function request<T>(path: string, options: Record<string, unknown> = {}) {
    const execute = () =>
      $fetch<T>(path, {
        ...options,
        headers: {
          ...(options.headers as Record<string, string> | undefined),
          ...(accessToken.value ? { authorization: `Bearer ${accessToken.value}` } : {}),
        },
      });

    try {
      return await execute();
    } catch (error) {
      const statusCode =
        (error as { statusCode?: number }).statusCode ??
        (error as { response?: { status?: number } }).response?.status;

      if ((statusCode === 401 || statusCode === 403) && (await refresh())) {
        return execute();
      }

      if (statusCode === 401 || statusCode === 403) {
        clearSession();
        if (import.meta.client) {
          await navigateTo('/login');
        }
      }

      throw error;
    }
  }

  return { request };
}
