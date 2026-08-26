import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { mobileApi } from '@/lib/api';

const PLACEHOLDER_VIDEO_URL = 'https://example.com/demo.mp4';

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }
  return '发布失败，请稍后重试';
}

export default function UploadScreen() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [asset, setAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [uploadNote, setUploadNote] = useState<string | null>(null);

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!asset) {
        throw new Error('请先选择视频');
      }
      if (!title.trim()) {
        throw new Error('请填写标题');
      }

      const uploadTicket = await mobileApi.requestUpload();
      const nextNote = uploadTicket.mock
        ? '当前为 Mock Blob 模式，已用占位地址创建审核记录'
        : '视频已上传至 Blob，正在创建审核记录';
      const blobUrl = uploadTicket.mock
        ? PLACEHOLDER_VIDEO_URL
        : (await mobileApi.uploadVideo(uploadTicket, asset)).url;

      setUploadNote(nextNote);

      return mobileApi.createVideo({
        title: title.trim(),
        description: description.trim(),
        blobUrl,
        coverUrl: undefined,
        durationMs: Math.max(asset.duration ?? 15_000, 1),
      });
    },
    onSuccess: async () => {
      setTitle('');
      setDescription('');
      setAsset(null);
      await queryClient.invalidateQueries({ queryKey: ['feed'] });
      Alert.alert('已提交', '视频进入审核队列，通过后会出现在推荐页。', [
        { text: '去首页', onPress: () => router.replace('/(tabs)/feed') },
        { text: '继续发', style: 'cancel' },
      ]);
    },
  });

  async function pickVideo() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('需要权限', '请允许访问相册以选择视频');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['videos'],
      quality: 1,
      allowsEditing: false,
    });

    if (!result.canceled) {
      setAsset(result.assets[0] ?? null);
    }
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 12, paddingBottom: 40 }]}
    >
      <Text style={styles.title}>发布</Text>
      <Text style={styles.subtitle}>选择短视频并填写文案，提交后进入后台审核。</Text>

      <Pressable onPress={() => void pickVideo()} style={styles.pickBtn}>
        <Text style={styles.pickBtnText}>{asset ? '重新选择视频' : '选择视频'}</Text>
      </Pressable>

      <View style={styles.assetCard}>
        <Text style={styles.assetLabel}>已选文件</Text>
        <Text style={styles.assetValue}>{asset?.fileName ?? asset?.uri ?? '尚未选择'}</Text>
        {asset?.duration ? (
          <Text style={styles.assetMeta}>时长 {Math.round(asset.duration / 1000)} 秒</Text>
        ) : null}
      </View>

      <TextInput
        onChangeText={setTitle}
        placeholder="标题"
        placeholderTextColor="#999"
        style={styles.input}
        value={title}
      />
      <TextInput
        multiline
        numberOfLines={4}
        onChangeText={setDescription}
        placeholder="添加作品描述…"
        placeholderTextColor="#999"
        style={[styles.input, styles.textarea]}
        value={description}
      />

      <Pressable
        disabled={uploadMutation.isPending}
        onPress={() => uploadMutation.mutate()}
        style={[styles.primaryButton, uploadMutation.isPending && styles.buttonDisabled]}
      >
        {uploadMutation.isPending ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.primaryButtonText}>发布</Text>
        )}
      </Pressable>

      {uploadMutation.isError ? (
        <Text style={styles.errorText}>{getErrorMessage(uploadMutation.error)}</Text>
      ) : null}
      {uploadNote ? <Text style={styles.noteText}>{uploadNote}</Text> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#fff' },
  content: { gap: 14, paddingHorizontal: 20 },
  title: { color: '#161823', fontSize: 24, fontWeight: '700' },
  subtitle: { color: '#8a8a8a', lineHeight: 20, marginBottom: 4 },
  pickBtn: {
    alignItems: 'center',
    borderRadius: 8,
    paddingVertical: 14,
    backgroundColor: '#161823',
  },
  pickBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  assetCard: {
    gap: 6,
    borderRadius: 12,
    padding: 14,
    backgroundColor: '#f5f5f5',
  },
  assetLabel: { color: '#8a8a8a', fontSize: 12, fontWeight: '600' },
  assetValue: { color: '#161823', fontSize: 14 },
  assetMeta: { color: '#8a8a8a', fontSize: 13 },
  input: {
    borderWidth: 1,
    borderColor: '#e5e5e5',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#161823',
    backgroundColor: '#fafafa',
  },
  textarea: { minHeight: 110, textAlignVertical: 'top' },
  primaryButton: {
    alignItems: 'center',
    borderRadius: 24,
    paddingVertical: 14,
    backgroundColor: '#fe2c55',
    marginTop: 4,
  },
  primaryButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  buttonDisabled: { opacity: 0.7 },
  errorText: { color: '#fe2c55' },
  noteText: { color: '#8a8a8a', lineHeight: 20 },
});
