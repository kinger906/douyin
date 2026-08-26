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
      (error as { data?: { error?: { message?: string } } }).data?.error?.message ??
      'Failed to load users';
  } finally {
    isLoading.value = false;
  }
}

async function updateUser(userId: string, body: { role?: 'user' | 'admin'; status?: 'active' | 'disabled' }) {
  try {
    await request(`/api/v1/admin/users/${userId}`, {
      method: 'PATCH',
      body,
    });
    await loadUsers();
  } catch (error) {
    errorMessage.value =
      (error as { data?: { error?: { message?: string } } }).data?.error?.message ??
      'Failed to update user';
  }
}

function nextPage() {
  if (page.value < totalPages.value) {
    page.value += 1;
    void loadUsers();
  }
}

function previousPage() {
  if (page.value > 1) {
    page.value -= 1;
    void loadUsers();
  }
}

onMounted(loadUsers);
</script>

<template>
  <section>
    <div
      style="display: flex; justify-content: space-between; gap: 16px; align-items: center; flex-wrap: wrap"
    >
      <div>
        <h1 style="margin: 0 0 8px">Users</h1>
        <p style="margin: 0; color: #4b5563">Update account role and active status.</p>
      </div>
      <button
        type="button"
        style="padding: 10px 14px; border: 1px solid #d1d5db; border-radius: 8px; background: white"
        @click="loadUsers"
      >
        Refresh
      </button>
    </div>

    <p v-if="errorMessage" style="margin-top: 16px; color: #b91c1c">
      {{ errorMessage }}
    </p>
    <p v-else-if="isLoading" style="margin-top: 16px">Loading users...</p>

    <div v-else style="margin-top: 20px; overflow-x: auto">
      <table style="width: 100%; border-collapse: collapse; background: white">
        <thead>
          <tr style="text-align: left; border-bottom: 1px solid #e5e7eb">
            <th style="padding: 12px">Display name</th>
            <th style="padding: 12px">Contact</th>
            <th style="padding: 12px">Role</th>
            <th style="padding: 12px">Status</th>
            <th style="padding: 12px">Created</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in users" :key="item.id" style="border-bottom: 1px solid #f3f4f6">
            <td style="padding: 12px">
              <strong>{{ item.displayName }}</strong>
              <div style="font-size: 12px; color: #6b7280">{{ item.id }}</div>
            </td>
            <td style="padding: 12px">
              <div>{{ item.email || 'No email' }}</div>
              <div style="font-size: 12px; color: #6b7280">{{ item.phone || 'No phone' }}</div>
            </td>
            <td style="padding: 12px">
              <select
                :value="item.role"
                style="padding: 8px; border: 1px solid #d1d5db; border-radius: 8px"
                @change="
                  updateUser(item.id, {
                    role: ($event.target as HTMLSelectElement).value as 'user' | 'admin',
                  })
                "
              >
                <option value="user">user</option>
                <option value="admin">admin</option>
              </select>
            </td>
            <td style="padding: 12px">
              <button
                type="button"
                style="
                  padding: 8px 12px;
                  border: none;
                  border-radius: 8px;
                  color: white;
                  cursor: pointer;
                "
                :style="{ background: item.status === 'active' ? '#b91c1c' : '#15803d' }"
                @click="updateUser(item.id, { status: item.status === 'active' ? 'disabled' : 'active' })"
              >
                {{ item.status === 'active' ? 'Disable' : 'Enable' }}
              </button>
            </td>
            <td style="padding: 12px">{{ new Date(item.createdAt).toLocaleString() }}</td>
          </tr>
        </tbody>
      </table>

      <div style="display: flex; justify-content: space-between; gap: 16px; margin-top: 16px">
        <button
          type="button"
          :disabled="page === 1"
          style="padding: 10px 14px; border: 1px solid #d1d5db; border-radius: 8px; background: white"
          @click="previousPage"
        >
          Previous
        </button>
        <span>Page {{ page }} of {{ totalPages }}</span>
        <button
          type="button"
          :disabled="page >= totalPages"
          style="padding: 10px 14px; border: 1px solid #d1d5db; border-radius: 8px; background: white"
          @click="nextPage"
        >
          Next
        </button>
      </div>
    </div>
  </section>
</template>
