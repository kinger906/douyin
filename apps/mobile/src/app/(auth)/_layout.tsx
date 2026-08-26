import { Redirect, Stack } from 'expo-router';

import { useSessionStore } from '@/store/session';

export default function AuthLayout() {
  const accessToken = useSessionStore((state) => state.accessToken);

  if (accessToken) {
    return <Redirect href="/(tabs)/feed" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
