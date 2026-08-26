<script setup lang="ts">
type UploadTicket = {
  mock: boolean;
  pathname: string;
  clientToken: string | null;
  uploadUrl: string | null;
  note?: string;
};

type BlobPutResult = {
  url: string;
  pathname: string;
};

type VideoRecord = {
  id: string;
  title: string;
  status: string;
  blobUrl: string;
};

const { request } = useAdminApi();

const title = ref('');
const description = ref('');
const durationSec = ref(15);
const file = ref<File | null>(null);
const submitting = ref(false);
const message = ref('');
const errorMessage = ref('');
const created = ref<VideoRecord | null>(null);

function onFileChange(event: Event) {
  const input = event.target as HTMLInputElement;
  file.value = input.files?.[0] ?? null;
}

async function submitUpload() {
  errorMessage.value = '';
  message.value = '';
  created.value = null;

  if (!title.value.trim()) {
    errorMessage.value = 'Title is required';
    return;
  }

  if (!file.value) {
    errorMessage.value = 'Please choose a video file';
    return;
  }

  submitting.value = true;
  try {
    const ticket = await request<UploadTicket>('/api/v1/uploads/blob', { method: 'POST' });

    let blobUrl: string;
    if (ticket.mock) {
      blobUrl = 'https://example.com/demo.mp4';
      message.value = 'Blob token missing — created with placeholder URL (mock mode).';
    } else {
      const form = new FormData();
      form.append('pathname', ticket.pathname);
      form.append('file', file.value);

      const uploaded = await request<BlobPutResult>('/api/v1/uploads/blob/proxy', {
        method: 'POST',
        body: form,
      });
      blobUrl = uploaded.url;
      message.value = 'Uploaded to Vercel Blob.';
    }

    created.value = await request<VideoRecord>('/api/v1/videos', {
      method: 'POST',
      body: {
        title: title.value.trim(),
        description: description.value.trim(),
        blobUrl,
        durationMs: Math.max(Math.round(durationSec.value * 1000), 1),
      },
    });

    message.value += ` Video is pending moderation (id: ${created.value.id}).`;
    title.value = '';
    description.value = '';
    file.value = null;
  } catch (error) {
    errorMessage.value =
      (error as { data?: { error?: { message?: string } } }).data?.error?.message ??
      (error as Error).message ??
      'Upload failed';
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <section style="max-width: 640px">
    <h1 style="margin-top: 0">Upload Video</h1>
    <p style="color: #4b5563">
      Upload a short video as the current admin account. New videos start as
      <strong>pending</strong> — approve them in Moderation before they appear in the feed.
    </p>

    <form
      style="
        margin-top: 24px;
        display: grid;
        gap: 16px;
        background: white;
        padding: 20px;
        border-radius: 12px;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
      "
      @submit.prevent="submitUpload"
    >
      <label style="display: grid; gap: 6px">
        <span>Title</span>
        <input v-model="title" required maxlength="120" style="padding: 10px; border: 1px solid #d1d5db; border-radius: 8px" />
      </label>

      <label style="display: grid; gap: 6px">
        <span>Description</span>
        <textarea
          v-model="description"
          rows="3"
          maxlength="2000"
          style="padding: 10px; border: 1px solid #d1d5db; border-radius: 8px"
        />
      </label>

      <label style="display: grid; gap: 6px">
        <span>Duration (seconds)</span>
        <input
          v-model.number="durationSec"
          type="number"
          min="1"
          max="600"
          style="padding: 10px; border: 1px solid #d1d5db; border-radius: 8px"
        />
      </label>

      <label style="display: grid; gap: 6px">
        <span>Video file</span>
        <input type="file" accept="video/*" @change="onFileChange" />
        <span v-if="file" style="font-size: 13px; color: #6b7280">{{ file.name }} ({{ Math.round(file.size / 1024) }} KB)</span>
      </label>

      <button
        type="submit"
        :disabled="submitting"
        style="
          justify-self: start;
          background: #fe2c55;
          color: white;
          border: none;
          border-radius: 8px;
          padding: 10px 16px;
          cursor: pointer;
          opacity: submitting ? 0.7 : 1;
        "
      >
        {{ submitting ? 'Uploading…' : 'Upload' }}
      </button>
    </form>

    <p v-if="message" style="color: #047857; margin-top: 16px">{{ message }}</p>
    <p v-if="errorMessage" style="color: #b91c1c; margin-top: 16px">{{ errorMessage }}</p>

    <p v-if="created" style="margin-top: 12px">
      Next:
      <NuxtLink to="/moderation">Open Moderation</NuxtLink>
      to approve this video.
    </p>
  </section>
</template>
