<script setup lang="ts">
const route = useRoute();
const { logout, user } = useAdminSession();

const menuItems = [
  { label: '工作台', to: '/', icon: 'i-lucide-layout-dashboard' },
  { label: '视频上传', to: '/upload', icon: 'i-lucide-upload' },
  { label: '内容审核', to: '/moderation', icon: 'i-lucide-shield-check' },
  { label: '用户管理', to: '/users', icon: 'i-lucide-users' },
  { label: '数据分析', to: '/analytics', icon: 'i-lucide-chart-column' },
  { label: '系统配置', to: '/config', icon: 'i-lucide-settings' },
];

const pageTitle = computed(() => {
  const hit = menuItems.find((item) =>
    item.to === '/' ? route.path === '/' : route.path.startsWith(item.to),
  );
  return hit?.label ?? '管理后台';
});

async function handleLogout() {
  await logout();
  await navigateTo('/login');
}
</script>

<template>
  <div class="min-h-screen flex bg-slate-100">
    <!-- 深蓝侧栏 -->
    <aside class="w-60 shrink-0 bg-[#001529] text-white flex flex-col">
      <div class="h-14 px-5 flex items-center gap-2 border-b border-white/10">
        <div class="size-8 rounded-md bg-primary-500 flex items-center justify-center font-bold text-sm">
          抖
        </div>
        <div>
          <div class="font-semibold tracking-wide">抖音管理后台</div>
          <div class="text-[11px] text-white/50">Douyin Admin</div>
        </div>
      </div>

      <nav class="flex-1 py-3 px-2 space-y-1">
        <NuxtLink
          v-for="item in menuItems"
          :key="item.to"
          :to="item.to"
          class="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors"
          :class="
            (item.to === '/' ? route.path === '/' : route.path.startsWith(item.to))
              ? 'bg-primary-500 text-white'
              : 'text-white/75 hover:bg-white/10 hover:text-white'
          "
        >
          <UIcon :name="item.icon" class="size-4" />
          <span>{{ item.label }}</span>
        </NuxtLink>
      </nav>

      <div class="px-4 py-3 text-[11px] text-white/40 border-t border-white/10">
        MVP · Nuxt UI
      </div>
    </aside>

    <!-- 主区 -->
    <div class="flex-1 min-w-0 flex flex-col">
      <header class="h-14 bg-white border-b border-slate-200 px-6 flex items-center justify-between gap-4">
        <div>
          <div class="text-xs text-slate-400">管理后台 / {{ pageTitle }}</div>
          <h1 class="text-base font-semibold text-slate-800 leading-tight">{{ pageTitle }}</h1>
        </div>

        <div class="flex items-center gap-3">
          <div class="text-right hidden sm:block">
            <div class="text-sm font-medium text-slate-800">{{ user?.displayName ?? '管理员' }}</div>
            <div class="text-xs text-slate-400">{{ user?.email }}</div>
          </div>
          <UButton color="neutral" variant="soft" icon="i-lucide-log-out" @click="handleLogout">
            退出
          </UButton>
        </div>
      </header>

      <main class="flex-1 p-6">
        <slot />
      </main>
    </div>
  </div>
</template>
