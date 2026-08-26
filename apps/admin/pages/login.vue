<script setup lang="ts">
definePageMeta({
  layout: false,
});

const { login } = useAdminSession();

const form = reactive({
  email: '',
  password: '',
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
      'Login failed';
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <main
    style="
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #f3f4f6;
      font-family: Arial, sans-serif;
    "
  >
    <form
      style="
        width: 100%;
        max-width: 360px;
        background: white;
        padding: 24px;
        border-radius: 12px;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08);
      "
      @submit.prevent="handleSubmit"
    >
      <h1 style="margin: 0 0 8px">Admin Login</h1>
      <p style="margin: 0 0 20px; color: #4b5563">Sign in with an admin account.</p>

      <label style="display: block; margin-bottom: 12px">
        <span style="display: block; margin-bottom: 6px">Email</span>
        <input
          v-model="form.email"
          type="email"
          required
          style="width: 100%; padding: 10px; border: 1px solid #d1d5db; border-radius: 8px"
        />
      </label>

      <label style="display: block; margin-bottom: 16px">
        <span style="display: block; margin-bottom: 6px">Password</span>
        <input
          v-model="form.password"
          type="password"
          required
          style="width: 100%; padding: 10px; border: 1px solid #d1d5db; border-radius: 8px"
        />
      </label>

      <p v-if="errorMessage" style="margin: 0 0 12px; color: #b91c1c">
        {{ errorMessage }}
      </p>

      <button
        type="submit"
        :disabled="isSubmitting"
        style="
          width: 100%;
          padding: 10px 14px;
          border: none;
          border-radius: 8px;
          background: #111827;
          color: white;
          cursor: pointer;
        "
      >
        {{ isSubmitting ? 'Signing in...' : 'Sign in' }}
      </button>
    </form>
  </main>
</template>
