export default defineNuxtRouteMiddleware(async (to) => {
  if (import.meta.server) {
    return;
  }

  const { accessToken, user, refresh } = useAdminSession();
  const isLoginPage = to.path === '/login';

  if (user.value?.role === 'admin' && accessToken.value) {
    if (isLoginPage) {
      return navigateTo('/');
    }

    return;
  }

  const hasSession = await refresh();

  if (hasSession) {
    if (isLoginPage) {
      return navigateTo('/');
    }

    return;
  }

  if (!isLoginPage) {
    return navigateTo('/login');
  }
});
