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
const toast = useToast();

const title = ref('');
const description = ref('');
const durationSec = ref(15);
const file = ref<File | null>(null);
const submitting = ref(false);
const errorMessage = ref('');
const created = ref<VideoRecord | null>(null);

function onFileChange(event: Event) {
  const input = event.target as HTMLInputElement;
  file.value = input.files?.[0] ?? null;
}

async function submitUpload() {
  errorMessage.value = '';
  created.value = null;

  if (!title.value.trim()) {
    errorMessage.value = '请填写标题';
    return;
  }
  if (!file.value) {
    errorMessage.value = '请选择视频文件';
    return;
  }

  submitting.value = true;
  try {
    const ticket = await request<UploadTicket>('/api/v1/uploads/blob', { method: 'POST' });

    let blobUrl: string;
    if (ticket.mock) {
      blobUrl = 'https://example.com/demo.mp4';
      toast.add({ title: 'Mock 模式', description: '未配置 Blob，已使用占位地址', color: 'warning' });
    } else {
      const form = new FormData();
      form.append('pathname', ticket.pathname);
      form.append('file', file.value);
      const uploaded = await request<BlobPutResult>('/api/v1/uploads/blob/proxy', {
        method: 'POST',
        body: form,
      });
      blobUrl = uploaded.url;
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

    toast.add({ title: '上传成功', description: '视频已进入待审核队列', color: 'success' });
    title.value = '';
    description.value = '';
    file.value = null;
  } catch (error) {
    errorMessage.value =
      (error as { data?: { error?: { message?: string } } }).data?.error?.message ??
      (error as Error).message ??
      '上传失败';
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <div class="space-y-4 max-w-2xl">
    <div>
      <h2 class="text-xl font-semibold text-slate-900">视频上传</h2>
      <p class="text-sm text-slate-500 mt-1">上传后状态为「待审核」，需在内容审核中通过才会进入 Feed。</p>
    </div>

    <UAlert v-if="errorMessage" color="error" variant="subtle" :title="errorMessage" />
    <UAlert
      v-if="created"
      color="success"
      variant="subtle"
      title="已创建待审视频"
      :description="`ID：${created.id}`"
    >
      <template #actions>
        <UButton size="xs" to="/moderation">去审核</UButton>
      </template>
    </UAlert>

    <UCard class="ring-1 ring-slate-200">
      <form class="space-y-4" @submit.prevent="submitUpload">
        <UFormField label="标题" required>
          <UInput v-model="title" maxlength="120" placeholder="请输入视频标题" class="w-full" />
        </UFormField>

        <UFormField label="简介">
          <UTextarea v-model="description" :rows="3" maxlength="2000" placeholder="可选" class="w-full" />
        </UFormField>

        <UFormField label="时长（秒）">
          <UInput v-model.number="durationSec" type="number" :min="1" :max="600" class="w-40" />
        </UFormField>

        <UFormField label="视频文件" required>
          <input
            type="file"
            accept="video/*"
            class="block w-full text-sm text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-primary-50 file:px-3 file:py-2 file:text-primary-700"
            @change="onFileChange"
          />
          <p v-if="file" class="text-xs text-slate-400 mt-1">
            {{ file.name }} · {{ Math.round(file.size / 1024) }} KB
          </p>
        </UFormField>

        <UButton type="submit" icon="i-lucide-upload" :loading="submitting">
          提交上传
        </UButton>
      </form>
    </UCard>
  </div>
</template>
