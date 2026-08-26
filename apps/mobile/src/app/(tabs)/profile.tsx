import { useMutation } from '@tanstack/react-query';
import { router } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { mobileApi } from '@/lib/api';
import { useSessionStore } from '@/store/session';

export default function ProfileScreen() {
  const user = useSessionStore((state) => state.user);

  const logoutMutation = useMutation({
    mutationFn: () => mobileApi.logout(),
    onSuccess: () => {
      router.replace('/(auth)/login');
    },
  });

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Profile</Text>
      <View style={styles.card}>
        <Text style={styles.label}>Display name</Text>
        <Text style={styles.value}>{user?.displayName ?? 'Unknown user'}</Text>

        <Text style={styles.label}>Email</Text>
        <Text style={styles.value}>{user?.email ?? 'No email on file'}</Text>

        <Text style={styles.label}>Role</Text>
        <Text style={styles.value}>{user?.role ?? 'user'}</Text>

        <Text style={styles.caption}>Own uploads will be filtered into this screen in a later slice.</Text>
      </View>

      <Pressable
        disabled={logoutMutation.isPending}
        onPress={() => logoutMutation.mutate()}
        style={[styles.button, logoutMutation.isPending && styles.buttonDisabled]}
      >
        {logoutMutation.isPending ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Sign out</Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    gap: 16,
    padding: 20,
    backgroundColor: '#000',
  },
  title: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '700',
  },
  card: {
    gap: 10,
    borderRadius: 18,
    padding: 18,
    backgroundColor: '#151515',
  },
  label: {
    color: '#fe2c55',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  value: {
    color: '#fff',
    fontSize: 17,
  },
  caption: {
    color: '#b7b7b7',
    lineHeight: 20,
  },
  button: {
    alignItems: 'center',
    borderRadius: 14,
    paddingVertical: 14,
    backgroundColor: '#272727',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700',
  },
});
