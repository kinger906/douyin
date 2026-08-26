<script setup lang="ts">
const { logout, user } = useAdminSession();

const links = [
  { to: '/', label: 'Home' },
  { to: '/upload', label: 'Upload' },
  { to: '/moderation', label: 'Moderation' },
  { to: '/users', label: 'Users' },
  { to: '/analytics', label: 'Analytics' },
  { to: '/config', label: 'Config' },
];

async function handleLogout() {
  await logout();
  await navigateTo('/login');
}
</script>

<template>
  <div style="min-height: 100vh; font-family: Arial, sans-serif; background: #f7f7f7; color: #111">
    <header
      style="
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 16px;
        padding: 16px 24px;
        background: #111827;
        color: white;
      "
    >
      <div>
        <strong>Douyin Admin</strong>
        <div style="font-size: 12px; opacity: 0.8">{{ user?.displayName ?? 'Admin' }}</div>
      </div>
      <nav style="display: flex; gap: 12px; flex-wrap: wrap; align-items: center">
        <NuxtLink
          v-for="link in links"
          :key="link.to"
          :to="link.to"
          style="color: white; text-decoration: none"
        >
          {{ link.label }}
        </NuxtLink>
        <button
          type="button"
          style="
            border: 1px solid rgba(255, 255, 255, 0.3);
            background: transparent;
            color: white;
            padding: 6px 10px;
            border-radius: 6px;
            cursor: pointer;
          "
          @click="handleLogout"
        >
          Logout
        </button>
      </nav>
    </header>

    <main style="padding: 24px">
      <slot />
    </main>
  </div>
</template>
