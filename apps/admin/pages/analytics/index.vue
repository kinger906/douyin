<script setup lang="ts">
type AnalyticsSummary = {
  users: number;
  videosPending: number;
  videosApproved: number;
  videosRejected: number;
  likes: number;
  comments: number;
};

const { request } = useAdminApi();

const summary = ref<AnalyticsSummary | null>(null);
const isLoading = ref(false);
const errorMessage = ref('');

const cards = computed(() => {
  if (!summary.value) return [];
  return [
    { label: '用户总数', value: summary.value.users },
    { label: '待审核视频', value: summary.value.videosPending },
    { label: '已通过视频', value: summary.value.videosApproved },
    { label: '已拒绝视频', value: summary.value.videosRejected },
    { label: '点赞总量', value: summary.value.likes },
    { label: '评论总量', value: summary.value.comments },
  ];
});

async function loadSummary() {
  isLoading.value = true;
  errorMessage.value = '';
  try {
    summary.value = await request<AnalyticsSummary>('/api/v1/admin/analytics/summary');
  } catch (error) {
    errorMessage.value =
      (error as { data?: { error?: { message?: string } } }).data?.error?.message ?? '加载数据失败';
  } finally {
    isLoading.value = false;
  }
}

onMounted(loadSummary);
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 class="text-xl font-semibold text-slate-900">数据分析</h2>
        <p class="text-sm text-slate-500 mt-1">实时统计平台用户与内容互动规模。</p>
      </div>
      <UButton color="neutral" variant="soft" icon="i-lucide-refresh-cw" :loading="isLoading" @click="loadSummary">
        刷新
      </UButton>
    </div>

    <UAlert v-if="errorMessage" color="error" variant="subtle" :title="errorMessage" />

    <div v-if="isLoading" class="py-16 flex justify-center">
      <UIcon name="i-lucide-loader-circle" class="size-8 animate-spin text-primary-500" />
    </div>

    <div v-else class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
      <UCard v-for="card in cards" :key="card.label" class="ring-1 ring-slate-200">
        <div class="text-sm text-slate-500">{{ card.label }}</div>
        <div class="text-3xl font-semibold text-slate-900 mt-2 tabular-nums">{{ card.value }}</div>
      </UCard>
    </div>
  </div>
</template>
