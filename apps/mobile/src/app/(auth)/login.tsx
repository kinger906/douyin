import { useMutation } from '@tanstack/react-query';
import { Link, router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { mobileApi } from '@/lib/api';

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }
  return '登录失败，请稍后重试';
}

export default function LoginScreen() {
  const [email, setEmail] = useState('admin@example.com');
  const [password, setPassword] = useState('Admin123!');

  const loginMutation = useMutation({
    mutationFn: () => mobileApi.login({ email, password }),
    onSuccess: () => {
      router.replace('/(tabs)/feed');
    },
  });

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.screen}
    >
      <View style={styles.card}>
        <Text style={styles.logo}>抖音</Text>
        <Text style={styles.subtitle}>登录后刷推荐、发视频、看个人主页</Text>
        <Text style={styles.debugText}>API: {mobileApi.apiBaseUrl}</Text>

        <TextInput
          autoCapitalize="none"
          keyboardType="email-address"
          onChangeText={setEmail}
          placeholder="邮箱"
          placeholderTextColor="#7a7a7a"
          style={styles.input}
          value={email}
        />
        <TextInput
          onChangeText={setPassword}
          placeholder="密码"
          placeholderTextColor="#7a7a7a"
          secureTextEntry
          style={styles.input}
          value={password}
        />

        {loginMutation.isError ? (
          <Text style={styles.errorText}>{getErrorMessage(loginMutation.error)}</Text>
        ) : null}

        <Pressable
          disabled={loginMutation.isPending}
          onPress={() => loginMutation.mutate()}
          style={[styles.button, loginMutation.isPending && styles.buttonDisabled]}
        >
          {loginMutation.isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>登录</Text>
          )}
        </Pressable>

        <Link href="/(auth)/register" style={styles.link}>
          没有账号？去注册
        </Link>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#000',
  },
  card: {
    gap: 14,
    borderRadius: 20,
    padding: 20,
    backgroundColor: '#161616',
  },
  logo: {
    color: '#fe2c55',
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: 4,
  },
  subtitle: {
    color: '#b7b7b7',
    fontSize: 14,
  },
  debugText: {
    color: '#6b7280',
    fontSize: 12,
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
  },
  input: {
    borderWidth: 1,
    borderColor: '#2d2d2d',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#fff',
    backgroundColor: '#0f0f0f',
  },
  button: {
    alignItems: 'center',
    borderRadius: 24,
    paddingVertical: 14,
    backgroundColor: '#fe2c55',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  link: {
    color: '#fff',
    textAlign: 'center',
  },
  errorText: {
    color: '#ff8f8f',
  },
});
