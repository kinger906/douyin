import { Redirect } from 'expo-router';

import { useSessionStore } from '@/store/session';

export default function IndexScreen() {
  const accessToken = useSessionStore((state) => state.accessToken);

  if (accessToken) {
    return <Redirect href="/(tabs)/feed" />;
  }

  return <Redirect href="/(auth)/login" />;
}
