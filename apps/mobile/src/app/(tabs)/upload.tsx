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

import { mobileApi } from '@/lib/api';

const PLACEHOLDER_VIDEO_URL = 'https://example.com/demo.mp4';

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return 'Unable to submit the upload.';
}

export default function UploadScreen() {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [asset, setAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [uploadNote, setUploadNote] = useState<string | null>(null);

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!asset) {
        throw new Error('Pick a video first.');
      }

      if (!title.trim()) {
        throw new Error('Enter a title.');
      }

      const uploadTicket = await mobileApi.requestUpload();
      const blobUrl = PLACEHOLDER_VIDEO_URL;
      const nextNote = uploadTicket.mock
        ? 'Mock blob mode detected. The video record was created with the placeholder URL.'
        : 'Blob token exists, but this MVP confirms the video with a placeholder URL in native mode.';

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
      Alert.alert('Upload queued', 'Your video is pending moderation before it appears in the feed.');
    },
  });

  async function pickVideo() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission required', 'Allow media library access to choose a video.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      quality: 1,
      allowsEditing: false,
    });

    if (!result.canceled) {
      setAsset(result.assets[0] ?? null);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.content} style={styles.screen}>
      <Text style={styles.title}>Upload</Text>
      <Text style={styles.subtitle}>
        Pick a short video, then create the pending record that admin can approve.
      </Text>

      <Pressable onPress={() => void pickVideo()} style={styles.secondaryButton}>
        <Text style={styles.secondaryButtonText}>{asset ? 'Pick another video' : 'Choose video'}</Text>
      </Pressable>

      <View style={styles.assetCard}>
        <Text style={styles.assetLabel}>Selected file</Text>
        <Text style={styles.assetValue}>{asset?.fileName ?? asset?.uri ?? 'Nothing selected yet'}</Text>
        {asset?.duration ? <Text style={styles.assetMeta}>Duration: {Math.round(asset.duration / 1000)}s</Text> : null}
      </View>

      <TextInput
        onChangeText={setTitle}
        placeholder="Title"
        placeholderTextColor="#787878"
        style={styles.input}
        value={title}
      />
      <TextInput
        multiline
        numberOfLines={4}
        onChangeText={setDescription}
        placeholder="Description"
        placeholderTextColor="#787878"
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
          <Text style={styles.primaryButtonText}>Create pending upload</Text>
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
  screen: {
    flex: 1,
    backgroundColor: '#000',
  },
  content: {
    gap: 16,
    padding: 20,
  },
  title: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '700',
  },
  subtitle: {
    color: '#b5b5b5',
    lineHeight: 20,
  },
  assetCard: {
    gap: 6,
    borderRadius: 16,
    padding: 16,
    backgroundColor: '#151515',
  },
  assetLabel: {
    color: '#fe2c55',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  assetValue: {
    color: '#fff',
    fontSize: 15,
  },
  assetMeta: {
    color: '#9f9f9f',
    fontSize: 13,
  },
  input: {
    borderWidth: 1,
    borderColor: '#2d2d2d',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#fff',
    backgroundColor: '#0f0f0f',
  },
  textarea: {
    minHeight: 110,
    textAlignVertical: 'top',
  },
  primaryButton: {
    alignItems: 'center',
    borderRadius: 14,
    paddingVertical: 14,
    backgroundColor: '#fe2c55',
  },
  secondaryButton: {
    alignItems: 'center',
    borderRadius: 14,
    paddingVertical: 14,
    backgroundColor: '#232323',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButtonText: {
    color: '#fff',
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  errorText: {
    color: '#ff8f8f',
  },
  noteText: {
    color: '#b5b5b5',
    lineHeight: 20,
  },
});
