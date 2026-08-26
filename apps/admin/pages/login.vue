<script setup lang="ts">
definePageMeta({
  layout: false,
});

const { login } = useAdminSession();

const form = reactive({
  email: 'admin@example.com',
  password: 'Admin123!',
});
const isSubmitting = ref(false);
const errorMessage = ref('');

async function handleSubmit() {
  errorMessage.value = '';
  isSubmitting.value = true;

  try {
    await login(form.email, form.password);
    await navigateTo('/');
  } catch (error) {
    errorMessage.value =
      (error as { data?: { error?: { message?: string } } }).data?.error?.message ??
      (error as Error).message ??
      '登录失败，请检查账号密码';
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 via-slate-50 to-blue-50 px-4">
    <UCard class="w-full max-w-md shadow-lg ring-1 ring-slate-200">
      <template #header>
        <div class="flex items-center gap-3">
          <div class="size-10 rounded-lg bg-primary-500 text-white flex items-center justify-center font-bold">
            抖
          </div>
          <div>
            <div class="font-semibold text-slate-900">抖音管理后台</div>
            <div class="text-xs text-slate-500">请使用管理员账号登录</div>
          </div>
        </div>
      </template>

      <form class="space-y-4" @submit.prevent="handleSubmit">
        <UFormField label="邮箱">
          <UInput v-model="form.email" type="email" required icon="i-lucide-mail" placeholder="admin@example.com" class="w-full" />
        </UFormField>

        <UFormField label="密码">
          <UInput
            v-model="form.password"
            type="password"
            required
            icon="i-lucide-lock"
            placeholder="请输入密码"
            class="w-full"
          />
        </UFormField>

        <UAlert
          v-if="errorMessage"
          color="error"
          variant="subtle"
          icon="i-lucide-circle-alert"
          :title="errorMessage"
        />

        <UButton type="submit" block size="lg" :loading="isSubmitting">
          登录
        </UButton>
      </form>
    </UCard>
  </div>
</template>
