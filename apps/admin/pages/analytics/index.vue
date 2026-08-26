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
  if (!summary.value) {
    return [];
  }

  return [
    { label: 'Users', value: summary.value.users },
    { label: 'Pending videos', value: summary.value.videosPending },
    { label: 'Approved videos', value: summary.value.videosApproved },
    { label: 'Rejected videos', value: summary.value.videosRejected },
    { label: 'Likes', value: summary.value.likes },
    { label: 'Comments', value: summary.value.comments },
  ];
});

async function loadSummary() {
  isLoading.value = true;
  errorMessage.value = '';

  try {
    summary.value = await request<AnalyticsSummary>('/api/v1/admin/analytics/summary');
  } catch (error) {
    errorMessage.value =
      (error as { data?: { error?: { message?: string } } }).data?.error?.message ??
      'Failed to load analytics';
  } finally {
    isLoading.value = false;
  }
}

onMounted(loadSummary);
</script>

<template>
  <section>
    <div
      style="display: flex; justify-content: space-between; gap: 16px; align-items: center; flex-wrap: wrap"
    >
      <div>
        <h1 style="margin: 0 0 8px">Analytics</h1>
        <p style="margin: 0; color: #4b5563">Current platform totals from the database.</p>
      </div>
      <button
        type="button"
        style="padding: 10px 14px; border: 1px solid #d1d5db; border-radius: 8px; background: white"
        @click="loadSummary"
      >
        Refresh
      </button>
    </div>

    <p v-if="errorMessage" style="margin-top: 16px; color: #b91c1c">
      {{ errorMessage }}
    </p>
    <p v-else-if="isLoading" style="margin-top: 16px">Loading analytics...</p>

    <div
      v-else-if="summary"
      style="
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
        gap: 16px;
        margin-top: 20px;
      "
    >
      <article
        v-for="card in cards"
        :key="card.label"
        style="background: white; border-radius: 12px; padding: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.08)"
      >
        <div style="font-size: 14px; color: #6b7280">{{ card.label }}</div>
        <div style="font-size: 32px; font-weight: 700; margin-top: 8px">{{ card.value }}</div>
      </article>
    </div>
  </section>
</template>
