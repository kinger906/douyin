import { Redirect, Tabs } from 'expo-router';

import { useSessionStore } from '@/store/session';

export default function TabsLayout() {
  const hydrated = useSessionStore((state) => state.hydrated);
  const accessToken = useSessionStore((state) => state.accessToken);

  if (!hydrated) {
    return null;
  }

  if (!accessToken) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <Tabs
      initialRouteName="feed"
      screenOptions={{
        headerStyle: { backgroundColor: '#111' },
        headerTintColor: '#fff',
        tabBarStyle: { backgroundColor: '#111' },
        tabBarActiveTintColor: '#fe2c55',
        tabBarInactiveTintColor: '#8f8f8f',
      }}
    >
      <Tabs.Screen name="feed" options={{ title: 'Feed' }} />
      <Tabs.Screen name="upload" options={{ title: 'Upload' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
    </Tabs>
  );
}
