<script setup lang="ts">
type ModerationVideo = {
  id: string;
  title: string;
  description: string;
  status: string;
  createdAt: string;
  author: {
    id: string;
    displayName: string;
  };
};

type ModerationResponse = {
  items: ModerationVideo[];
};

const { request } = useAdminApi();
const toast = useToast();

const items = ref<ModerationVideo[]>([]);
const isLoading = ref(false);
const errorMessage = ref('');
const rejectOpen = ref(false);
const rejectReason = ref('');
const activeVideoId = ref<string | null>(null);
const actionLoading = ref(false);

const columns = [
  { accessorKey: 'title', header: '标题' },
  { accessorKey: 'author', header: '作者' },
  { accessorKey: 'createdAt', header: '提交时间' },
  { accessorKey: 'actions', header: '操作' },
];

async function loadVideos() {
  isLoading.value = true;
  errorMessage.value = '';
  try {
    const response = await request<ModerationResponse>('/api/v1/admin/moderation/videos');
    items.value = response.items;
  } catch (error) {
    errorMessage.value =
      (error as { data?: { error?: { message?: string } } }).data?.error?.message ?? '加载待审视频失败';
  } finally {
    isLoading.value = false;
  }
}

async function approveVideo(id: string) {
  actionLoading.value = true;
  try {
    await request(`/api/v1/admin/moderation/videos/${id}/approve`, { method: 'POST', body: {} });
    toast.add({ title: '已通过', description: '视频已进入推荐流', color: 'success' });
    await loadVideos();
  } catch (error) {
    errorMessage.value =
      (error as { data?: { error?: { message?: string } } }).data?.error?.message ?? '审核通过失败';
  } finally {
    actionLoading.value = false;
  }
}

function openReject(id: string) {
  activeVideoId.value = id;
  rejectReason.value = '';
  rejectOpen.value = true;
}

async function confirmReject() {
  if (!activeVideoId.value) return;
  actionLoading.value = true;
  try {
    await request(`/api/v1/admin/moderation/videos/${activeVideoId.value}/reject`, {
      method: 'POST',
      body: rejectReason.value ? { reason: rejectReason.value } : {},
    });
    toast.add({ title: '已拒绝', color: 'warning' });
    rejectOpen.value = false;
    await loadVideos();
  } catch (error) {
    errorMessage.value =
      (error as { data?: { error?: { message?: string } } }).data?.error?.message ?? '拒绝失败';
  } finally {
    actionLoading.value = false;
  }
}

onMounted(loadVideos);
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 class="text-xl font-semibold text-slate-900">内容审核</h2>
        <p class="text-sm text-slate-500 mt-1">仅展示待审核视频，通过后才会出现在 App Feed。</p>
      </div>
      <UButton color="neutral" variant="soft" icon="i-lucide-refresh-cw" :loading="isLoading" @click="loadVideos">
        刷新
      </UButton>
    </div>

    <UAlert v-if="errorMessage" color="error" variant="subtle" :title="errorMessage" />

    <UCard class="ring-1 ring-slate-200 overflow-hidden">
      <div v-if="isLoading" class="py-16 flex justify-center">
        <UIcon name="i-lucide-loader-circle" class="size-8 animate-spin text-primary-500" />
      </div>

      <div v-else-if="items.length === 0" class="py-16 text-center text-slate-500">
        暂无待审核视频
      </div>

      <div v-else class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-slate-200 bg-slate-50 text-left text-slate-500">
              <th v-for="col in columns" :key="col.accessorKey" class="px-4 py-3 font-medium">
                {{ col.header }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="video in items" :key="video.id" class="border-b border-slate-100 hover:bg-slate-50/80">
              <td class="px-4 py-3 align-top">
                <div class="font-medium text-slate-900">{{ video.title }}</div>
                <div class="text-xs text-slate-400 mt-1 line-clamp-2">{{ video.description || '无简介' }}</div>
              </td>
              <td class="px-4 py-3 align-top text-slate-700">{{ video.author.displayName }}</td>
              <td class="px-4 py-3 align-top text-slate-500 whitespace-nowrap">
                {{ new Date(video.createdAt).toLocaleString('zh-CN') }}
              </td>
              <td class="px-4 py-3 align-top">
                <div class="flex flex-wrap gap-2">
                  <UButton size="sm" color="success" :loading="actionLoading" @click="approveVideo(video.id)">
                    通过
                  </UButton>
                  <UButton size="sm" color="error" variant="soft" @click="openReject(video.id)">拒绝</UButton>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </UCard>

    <UModal v-model:open="rejectOpen" title="拒绝视频" description="可选填写拒绝原因，便于作者理解。">
      <template #body>
        <UTextarea v-model="rejectReason" placeholder="例如：内容不合规、画质过低…" :rows="4" class="w-full" />
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton color="neutral" variant="soft" @click="() => { rejectOpen = false }">取消</UButton>
          <UButton color="error" :loading="actionLoading" @click="confirmReject">确认拒绝</UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>
