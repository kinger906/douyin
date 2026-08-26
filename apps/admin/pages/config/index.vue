<script setup lang="ts">
type ConfigResponse = {
  key: string;
  value: unknown;
  updatedAt: string | null;
};

const { request } = useAdminApi();

const configKey = 'featureFlags';
const valueText = ref('');
const updatedAt = ref<string | null>(null);
const isLoading = ref(false);
const isSaving = ref(false);
const errorMessage = ref('');
const successMessage = ref('');

async function loadConfig() {
  isLoading.value = true;
  errorMessage.value = '';
  successMessage.value = '';

  try {
    const response = await request<ConfigResponse>(`/api/v1/admin/config/${configKey}`);
    valueText.value = JSON.stringify(response.value ?? {}, null, 2);
    updatedAt.value = response.updatedAt;
  } catch (error) {
    errorMessage.value =
      (error as { data?: { error?: { message?: string } } }).data?.error?.message ??
      'Failed to load config';
  } finally {
    isLoading.value = false;
  }
}

async function saveConfig() {
  errorMessage.value = '';
  successMessage.value = '';
  isSaving.value = true;

  try {
    const parsedValue = JSON.parse(valueText.value);
    const response = await request<ConfigResponse>(`/api/v1/admin/config/${configKey}`, {
      method: 'PUT',
      body: { value: parsedValue },
    });

    valueText.value = JSON.stringify(response.value ?? {}, null, 2);
    updatedAt.value = response.updatedAt;
    successMessage.value = 'Config saved';
  } catch (error) {
    if (error instanceof SyntaxError) {
      errorMessage.value = 'Config must be valid JSON';
    } else {
      errorMessage.value =
        (error as { data?: { error?: { message?: string } } }).data?.error?.message ??
        'Failed to save config';
    }
  } finally {
    isSaving.value = false;
  }
}

onMounted(loadConfig);
</script>

<template>
  <section>
    <h1 style="margin: 0 0 8px">Config</h1>
    <p style="margin: 0; color: #4b5563">
      Edit the `featureFlags` system config as raw JSON.
    </p>

    <p v-if="updatedAt" style="margin-top: 12px; color: #6b7280">
      Updated at {{ new Date(updatedAt).toLocaleString() }}
    </p>
    <p v-if="errorMessage" style="margin-top: 12px; color: #b91c1c">
      {{ errorMessage }}
    </p>
    <p v-if="successMessage" style="margin-top: 12px; color: #15803d">
      {{ successMessage }}
    </p>
    <p v-if="isLoading" style="margin-top: 12px">Loading config...</p>

    <div v-else style="margin-top: 16px">
      <textarea
        v-model="valueText"
        rows="14"
        style="
          width: 100%;
          padding: 12px;
          border: 1px solid #d1d5db;
          border-radius: 12px;
          font-family: Consolas, monospace;
          background: white;
        "
      />

      <div style="display: flex; gap: 12px; margin-top: 16px">
        <button
          type="button"
          :disabled="isSaving"
          style="
            padding: 10px 14px;
            border: none;
            border-radius: 8px;
            background: #111827;
            color: white;
            cursor: pointer;
          "
          @click="saveConfig"
        >
          {{ isSaving ? 'Saving...' : 'Save config' }}
        </button>
        <button
          type="button"
          style="padding: 10px 14px; border: 1px solid #d1d5db; border-radius: 8px; background: white"
          @click="loadConfig"
        >
          Reload
        </button>
      </div>
    </div>
  </section>
</template>
