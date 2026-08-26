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
  return '注册失败，请稍后重试';
}

export default function RegisterScreen() {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const registerMutation = useMutation({
    mutationFn: () => mobileApi.register({ displayName, email, password }),
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
        <Text style={styles.logo}>注册</Text>
        <Text style={styles.subtitle}>创建账号后即可发视频、点赞和评论</Text>

        <TextInput
          onChangeText={setDisplayName}
          placeholder="昵称"
          placeholderTextColor="#7a7a7a"
          style={styles.input}
          value={displayName}
        />
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
          placeholder="密码（至少 8 位）"
          placeholderTextColor="#7a7a7a"
          secureTextEntry
          style={styles.input}
          value={password}
        />

        {registerMutation.isError ? (
          <Text style={styles.errorText}>{getErrorMessage(registerMutation.error)}</Text>
        ) : null}

        <Pressable
          disabled={registerMutation.isPending}
          onPress={() => registerMutation.mutate()}
          style={[styles.button, registerMutation.isPending && styles.buttonDisabled]}
        >
          {registerMutation.isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>注册</Text>
          )}
        </Pressable>

        <Link href="/(auth)/login" style={styles.link}>
          已有账号？去登录
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
    color: '#fff',
    fontSize: 32,
    fontWeight: '800',
  },
  subtitle: {
    color: '#b7b7b7',
    fontSize: 14,
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
