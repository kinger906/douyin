<script setup lang="ts">
type ConfigResponse = {
  key: string;
  value: unknown;
  updatedAt: string | null;
};

const { request } = useAdminApi();
const toast = useToast();

const configKey = 'featureFlags';
const valueText = ref('');
const updatedAt = ref<string | null>(null);
const isLoading = ref(false);
const isSaving = ref(false);
const errorMessage = ref('');

async function loadConfig() {
  isLoading.value = true;
  errorMessage.value = '';
  try {
    const response = await request<ConfigResponse>(`/api/v1/admin/config/${configKey}`);
    valueText.value = JSON.stringify(response.value ?? {}, null, 2);
    updatedAt.value = response.updatedAt;
  } catch (error) {
    errorMessage.value =
      (error as { data?: { error?: { message?: string } } }).data?.error?.message ?? '加载配置失败';
  } finally {
    isLoading.value = false;
  }
}

async function saveConfig() {
  errorMessage.value = '';
  isSaving.value = true;
  try {
    const parsedValue = JSON.parse(valueText.value);
    const response = await request<ConfigResponse>(`/api/v1/admin/config/${configKey}`, {
      method: 'PUT',
      body: { value: parsedValue },
    });
    valueText.value = JSON.stringify(response.value ?? {}, null, 2);
    updatedAt.value = response.updatedAt;
    toast.add({ title: '保存成功', color: 'success' });
  } catch (error) {
    if (error instanceof SyntaxError) {
      errorMessage.value = '请输入合法 JSON';
    } else {
      errorMessage.value =
        (error as { data?: { error?: { message?: string } } }).data?.error?.message ?? '保存失败';
    }
  } finally {
    isSaving.value = false;
  }
}

onMounted(loadConfig);
</script>

<template>
  <div class="space-y-4 max-w-3xl">
    <div>
      <h2 class="text-xl font-semibold text-slate-900">系统配置</h2>
      <p class="text-sm text-slate-500 mt-1">
        编辑功能开关 <code class="text-xs bg-slate-200 px-1 rounded">featureFlags</code>（直播 / 电商 / 推送等）。
      </p>
    </div>

    <UAlert v-if="errorMessage" color="error" variant="subtle" :title="errorMessage" />
    <p v-if="updatedAt" class="text-xs text-slate-400">
      最近更新：{{ new Date(updatedAt).toLocaleString('zh-CN') }}
    </p>

    <UCard class="ring-1 ring-slate-200">
      <div v-if="isLoading" class="py-12 flex justify-center">
        <UIcon name="i-lucide-loader-circle" class="size-8 animate-spin text-primary-500" />
      </div>
      <template v-else>
        <UTextarea v-model="valueText" :rows="14" class="w-full font-mono text-sm" />
        <div class="flex gap-2 mt-4">
          <UButton :loading="isSaving" icon="i-lucide-save" @click="saveConfig">保存配置</UButton>
          <UButton color="neutral" variant="soft" @click="loadConfig">重新加载</UButton>
        </div>
      </template>
    </UCard>
  </div>
</template>
