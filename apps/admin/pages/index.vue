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
const errorMessage = ref('');
const pending = ref(false);

const cards = computed(() => {
  if (!summary.value) return [];
  return [
    { label: '用户总数', value: summary.value.users, icon: 'i-lucide-users', color: 'primary' as const },
    { label: '待审核', value: summary.value.videosPending, icon: 'i-lucide-clock-3', color: 'warning' as const },
    { label: '已通过', value: summary.value.videosApproved, icon: 'i-lucide-circle-check', color: 'success' as const },
    { label: '已拒绝', value: summary.value.videosRejected, icon: 'i-lucide-circle-x', color: 'error' as const },
    { label: '点赞数', value: summary.value.likes, icon: 'i-lucide-heart', color: 'neutral' as const },
    { label: '评论数', value: summary.value.comments, icon: 'i-lucide-message-circle', color: 'neutral' as const },
  ];
});

onMounted(async () => {
  pending.value = true;
  try {
    summary.value = await request<AnalyticsSummary>('/api/v1/admin/analytics/summary');
  } catch (error) {
    errorMessage.value =
      (error as { data?: { error?: { message?: string } } }).data?.error?.message ?? '加载概览失败';
  } finally {
    pending.value = false;
  }
});
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 class="text-xl font-semibold text-slate-900">工作台</h2>
        <p class="text-sm text-slate-500 mt-1">平台核心数据一览，快捷进入常用功能。</p>
      </div>
      <div class="flex gap-2">
        <UButton to="/upload" icon="i-lucide-upload">上传视频</UButton>
        <UButton to="/moderation" color="neutral" variant="soft" icon="i-lucide-shield-check">去审核</UButton>
      </div>
    </div>

    <UAlert v-if="errorMessage" color="error" variant="subtle" :title="errorMessage" />

    <div v-if="pending" class="flex justify-center py-16">
      <UIcon name="i-lucide-loader-circle" class="size-8 animate-spin text-primary-500" />
    </div>

    <div v-else class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
      <UCard v-for="card in cards" :key="card.label" class="ring-1 ring-slate-200">
        <div class="flex items-start justify-between">
          <div>
            <div class="text-sm text-slate-500">{{ card.label }}</div>
            <div class="text-3xl font-semibold text-slate-900 mt-2">{{ card.value }}</div>
          </div>
          <div
            class="size-10 rounded-lg flex items-center justify-center"
            :class="{
              'bg-primary-50 text-primary-600': card.color === 'primary',
              'bg-amber-50 text-amber-600': card.color === 'warning',
              'bg-emerald-50 text-emerald-600': card.color === 'success',
              'bg-rose-50 text-rose-600': card.color === 'error',
              'bg-slate-100 text-slate-600': card.color === 'neutral',
            }"
          >
            <UIcon :name="card.icon" class="size-5" />
          </div>
        </div>
      </UCard>
    </div>
  </div>
</template>
