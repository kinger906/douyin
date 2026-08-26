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

const items = ref<ModerationVideo[]>([]);
const isLoading = ref(false);
const errorMessage = ref('');

async function loadVideos() {
  isLoading.value = true;
  errorMessage.value = '';

  try {
    const response = await request<ModerationResponse>('/api/v1/admin/moderation/videos');
    items.value = response.items;
  } catch (error) {
    errorMessage.value =
      (error as { data?: { error?: { message?: string } } }).data?.error?.message ??
      'Failed to load pending videos';
  } finally {
    isLoading.value = false;
  }
}

async function moderateVideo(id: string, action: 'approve' | 'reject') {
  const reason =
    action === 'reject' && import.meta.client
      ? window.prompt('Optional rejection reason:', '') ?? ''
      : '';

  try {
    await request(`/api/v1/admin/moderation/videos/${id}/${action}`, {
      method: 'POST',
      body: reason ? { reason } : {},
    });
    await loadVideos();
  } catch (error) {
    errorMessage.value =
      (error as { data?: { error?: { message?: string } } }).data?.error?.message ??
      `Failed to ${action} video`;
  }
}

onMounted(loadVideos);
</script>

<template>
  <section>
    <div
      style="display: flex; justify-content: space-between; gap: 16px; align-items: center; flex-wrap: wrap"
    >
      <div>
        <h1 style="margin: 0 0 8px">Moderation</h1>
        <p style="margin: 0; color: #4b5563">Only pending videos appear here.</p>
      </div>
      <button
        type="button"
        style="padding: 10px 14px; border: 1px solid #d1d5db; border-radius: 8px; background: white"
        @click="loadVideos"
      >
        Refresh
      </button>
    </div>

    <p v-if="errorMessage" style="margin-top: 16px; color: #b91c1c">
      {{ errorMessage }}
    </p>
    <p v-else-if="isLoading" style="margin-top: 16px">Loading pending videos...</p>
    <p v-else-if="items.length === 0" style="margin-top: 16px">No pending videos.</p>

    <div v-else style="display: grid; gap: 16px; margin-top: 20px">
      <article
        v-for="video in items"
        :key="video.id"
        style="background: white; border-radius: 12px; padding: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.08)"
      >
        <div style="display: flex; justify-content: space-between; gap: 16px; flex-wrap: wrap">
          <div>
            <h2 style="margin: 0 0 8px; font-size: 20px">{{ video.title }}</h2>
            <p style="margin: 0 0 8px; color: #4b5563">{{ video.description || 'No description' }}</p>
            <p style="margin: 0; font-size: 14px; color: #6b7280">
              By {{ video.author.displayName }} • {{ new Date(video.createdAt).toLocaleString() }}
            </p>
          </div>

          <div style="display: flex; gap: 8px; align-items: flex-start">
            <button
              type="button"
              style="
                padding: 10px 14px;
                border: none;
                border-radius: 8px;
                background: #15803d;
                color: white;
                cursor: pointer;
              "
              @click="moderateVideo(video.id, 'approve')"
            >
              Approve
            </button>
            <button
              type="button"
              style="
                padding: 10px 14px;
                border: none;
                border-radius: 8px;
                background: #b91c1c;
                color: white;
                cursor: pointer;
              "
              @click="moderateVideo(video.id, 'reject')"
            >
              Reject
            </button>
          </div>
        </div>
      </article>
    </div>
  </section>
</template>
