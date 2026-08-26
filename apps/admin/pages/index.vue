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

onMounted(async () => {
  try {
    summary.value = await request<AnalyticsSummary>('/api/v1/admin/analytics/summary');
  } catch (error) {
    errorMessage.value =
      (error as { data?: { error?: { message?: string } } }).data?.error?.message ??
      'Failed to load analytics summary';
  }
});
</script>

<template>
  <section>
    <h1 style="margin-top: 0">Admin Home</h1>
    <p style="color: #4b5563">
      Use <NuxtLink to="/upload">Upload</NuxtLink> to add videos, then
      <NuxtLink to="/moderation">Moderation</NuxtLink> to approve them for the feed. Also manage
      users, analytics, and feature flags.
    </p>

    <p v-if="errorMessage" style="color: #b91c1c">
      {{ errorMessage }}
    </p>

    <div
      v-if="summary"
      style="
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
        gap: 16px;
        margin-top: 24px;
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
