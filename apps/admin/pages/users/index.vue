<script setup lang="ts">
type AdminUserRow = {
  id: string;
  email: string | null;
  phone: string | null;
  displayName: string;
  role: 'user' | 'admin';
  status: 'active' | 'disabled';
  createdAt: string;
  updatedAt: string;
};

type UsersResponse = {
  items: AdminUserRow[];
  page: number;
  pageSize: number;
  total: number;
};

const { request } = useAdminApi();
const toast = useToast();

const page = ref(1);
const pageSize = 10;
const users = ref<AdminUserRow[]>([]);
const total = ref(0);
const isLoading = ref(false);
const errorMessage = ref('');

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize)));

async function loadUsers() {
  isLoading.value = true;
  errorMessage.value = '';
  try {
    const response = await request<UsersResponse>(`/api/v1/admin/users?page=${page.value}&limit=${pageSize}`);
    users.value = response.items;
    total.value = response.total;
  } catch (error) {
    errorMessage.value =
      (error as { data?: { error?: { message?: string } } }).data?.error?.message ?? '加载用户失败';
  } finally {
    isLoading.value = false;
  }
}

async function updateUser(userId: string, body: { role?: 'user' | 'admin'; status?: 'active' | 'disabled' }) {
  try {
    await request(`/api/v1/admin/users/${userId}`, { method: 'PATCH', body });
    toast.add({ title: '已更新', color: 'success' });
    await loadUsers();
  } catch (error) {
    errorMessage.value =
      (error as { data?: { error?: { message?: string } } }).data?.error?.message ?? '更新用户失败';
  }
}

onMounted(loadUsers);
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 class="text-xl font-semibold text-slate-900">用户管理</h2>
        <p class="text-sm text-slate-500 mt-1">调整角色与启用状态，禁用后将无法登录。</p>
      </div>
      <UButton color="neutral" variant="soft" icon="i-lucide-refresh-cw" :loading="isLoading" @click="loadUsers">
        刷新
      </UButton>
    </div>

    <UAlert v-if="errorMessage" color="error" variant="subtle" :title="errorMessage" />

    <UCard class="ring-1 ring-slate-200 overflow-hidden">
      <div v-if="isLoading" class="py-16 flex justify-center">
        <UIcon name="i-lucide-loader-circle" class="size-8 animate-spin text-primary-500" />
      </div>

      <div v-else class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-slate-200 bg-slate-50 text-left text-slate-500">
              <th class="px-4 py-3 font-medium">昵称</th>
              <th class="px-4 py-3 font-medium">联系方式</th>
              <th class="px-4 py-3 font-medium">角色</th>
              <th class="px-4 py-3 font-medium">状态</th>
              <th class="px-4 py-3 font-medium">注册时间</th>
              <th class="px-4 py-3 font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in users" :key="item.id" class="border-b border-slate-100 hover:bg-slate-50/80">
              <td class="px-4 py-3">
                <div class="font-medium text-slate-900">{{ item.displayName }}</div>
                <div class="text-xs text-slate-400 font-mono">{{ item.id.slice(0, 8) }}…</div>
              </td>
              <td class="px-4 py-3">
                <div>{{ item.email || '—' }}</div>
                <div class="text-xs text-slate-400">{{ item.phone || '无手机号' }}</div>
              </td>
              <td class="px-4 py-3">
                <USelect
                  :model-value="item.role"
                  :items="[
                    { label: '普通用户', value: 'user' },
                    { label: '管理员', value: 'admin' },
                  ]"
                  class="w-32"
                  @update:model-value="(v: string) => updateUser(item.id, { role: v as 'user' | 'admin' })"
                />
              </td>
              <td class="px-4 py-3">
                <UBadge :color="item.status === 'active' ? 'success' : 'neutral'" variant="subtle">
                  {{ item.status === 'active' ? '正常' : '已禁用' }}
                </UBadge>
              </td>
              <td class="px-4 py-3 text-slate-500 whitespace-nowrap">
                {{ new Date(item.createdAt).toLocaleString('zh-CN') }}
              </td>
              <td class="px-4 py-3">
                <UButton
                  size="sm"
                  :color="item.status === 'active' ? 'error' : 'success'"
                  variant="soft"
                  @click="
                    updateUser(item.id, {
                      status: item.status === 'active' ? 'disabled' : 'active',
                    })
                  "
                >
                  {{ item.status === 'active' ? '禁用' : '启用' }}
                </UButton>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="flex items-center justify-between px-4 py-3 border-t border-slate-100">
        <div class="text-sm text-slate-500">共 {{ total }} 人</div>
        <div class="flex items-center gap-2">
          <UButton
            size="sm"
            color="neutral"
            variant="soft"
            :disabled="page <= 1"
            @click="page--; loadUsers()"
          >
            上一页
          </UButton>
          <span class="text-sm text-slate-600">{{ page }} / {{ totalPages }}</span>
          <UButton
            size="sm"
            color="neutral"
            variant="soft"
            :disabled="page >= totalPages"
            @click="page++; loadUsers()"
          >
            下一页
          </UButton>
        </div>
      </div>
    </UCard>
  </div>
</template>
