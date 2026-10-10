import React, { useState } from 'react';
import { View, StyleSheet, Image, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';
import { Typography, Button, spacing, useTheme, ProgressBar, Icon, radii } from '@bucketlist/ui';
import { Camera, Image as ImageIcon, CheckCircle } from 'lucide-react-native';
import { processBucketImage, type ImageProcessingResult } from '@bucketlist/shared';
import { supabase } from '../../src/services/supabase';
import { storageApi } from '../../src/services/api/storage';
import { useAuthStore } from '../../src/stores/auth.store';
import { useUpdateBucket } from '../../src/hooks/useBuckets';

export default function CompleteBucketModal() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { theme } = useTheme();
  const { user } = useAuthStore();
  const updateBucket = useUpdateBucket();

  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [processedImages, setProcessedImages] = useState<ImageProcessingResult | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [quota, setQuota] = useState<{ used: number; limit: number }>({ used: 0, limit: 52428800 });

  React.useEffect(() => {
    if (user) {
      supabase.from('profiles').select('storage_used_bytes').eq('id', user.id).single().then(({ data }) => {
        if (data) {
          setQuota({ used: data.storage_used_bytes || 0, limit: 52428800 });
        }
      });
    }
  }, [user]);

  const pickImage = async (useCamera: boolean) => {
    let result;
    if (useCamera) {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') return;
      result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: 1,
      });
    } else {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') return;
      result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 1,
      });
    }

    if (!result.canceled && result.assets[0]) {
      const uri = result.assets[0].uri;
      setSelectedImage(uri);
      
      // Process immediately
      try {
        const processed = await processBucketImage(uri);
        setProcessedImages(processed);
      } catch (err) {
        console.error('Failed to process image', err);
      }
    }
  };

  const handleComplete = async () => {
    if (!id || !user) return;
    setUploading(true);
    setProgress(0.1);

    try {
      let photoPath = null;
      let thumbPath = null;

      if (processedImages) {
        // Check quota first (optimistic check locally based on profile, or just try to upload)
        const { data: profile } = await supabase.from('profiles').select('storage_used_bytes').eq('id', user.id).single();
        const totalSize = processedImages.original.sizeBytes + processedImages.thumbnail.sizeBytes;
        
        if (profile && (profile.storage_used_bytes + totalSize) > 52428800) {
          throw new Error('Storage quota exceeded (50MB limit).');
        }

        const paths = await storageApi.uploadPhoto(
          user.id,
          id,
          processedImages.original.uri,
          processedImages.thumbnail.uri,
          (p) => setProgress(0.1 + p * 0.8) // Map 0-1 to 0.1-0.9
        );
        photoPath = paths.photoPath;
        thumbPath = paths.thumbPath;

        // Insert into bucket_photos
        const { error: photoError } = await supabase.from('bucket_photos').insert({
          bucket_id: id,
          user_id: user.id,
          storage_path: photoPath,
          thumb_path: thumbPath,
          width: processedImages.original.width,
          height: processedImages.original.height,
          size_bytes: processedImages.original.sizeBytes,
          thumb_size_bytes: processedImages.thumbnail.sizeBytes,
        });

        if (photoError) throw photoError;
      }

      setProgress(0.95);

      // Update bucket status
      updateBucket.mutate(
        { id, data: { status: 'completed' } },
        {
          onSuccess: () => {
            setProgress(1);
            setCompleted(true);
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setTimeout(() => {
              router.back();
            }, 2000);
          },
          onError: (err) => {
            throw err;
          }
        }
      );

    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Failed to complete bucket');
      setUploading(false);
    }
  };

  if (completed) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: theme.colors.background }]}>
        <Animated.View entering={ZoomIn.springify()} style={styles.center}>
          <Icon icon={CheckCircle} size={80} color={theme.colors.success} />
          <Typography variant="h2" style={{ marginTop: spacing[6] }}>Goal Achieved!</Typography>
          <Typography variant="body" color="textSecondary" style={{ marginTop: spacing[2] }}>
            You've successfully completed this item.
          </Typography>
        </Animated.View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <Typography variant="h3">Complete Goal</Typography>
        <Button variant="ghost" onPress={() => router.back()}>Cancel</Button>
      </View>

      <View style={styles.content}>
        <Typography variant="body" style={{ marginBottom: spacing[6] }}>
          Add a photo to capture the memory (optional).
        </Typography>

        {selectedImage ? (
          <View style={styles.imagePreviewContainer}>
            <Image source={{ uri: selectedImage }} style={styles.imagePreview} />
            <Button 
              variant="secondary" 
              size="sm" 
              style={styles.retakeButton}
              onPress={() => pickImage(false)}
            >
              Change Photo
            </Button>
          </View>
        ) : (
          <View style={styles.pickers}>
            <Button 
              variant="secondary" 
              leftIcon={<Icon icon={Camera} size={20} color={theme.colors.foreground} />}
              onPress={() => pickImage(true)}
              style={styles.pickerButton}
            >
              Take Photo
            </Button>
            <Button 
              variant="secondary" 
              leftIcon={<Icon icon={ImageIcon} size={20} color={theme.colors.foreground} />}
              onPress={() => pickImage(false)}
              style={styles.pickerButton}
            >
              Camera Roll
            </Button>
          </View>
        )}

        <View style={{ marginTop: spacing[6] }}>
          <Typography variant="caption" color="textSecondary" style={{ marginBottom: spacing[2] }}>
            Storage Used: {(quota.used / 1024 / 1024).toFixed(1)}MB / 50MB
          </Typography>
          <ProgressBar value={Math.round((quota.used / quota.limit) * 100)} colorOverride={quota.used / quota.limit > 0.8 ? '#E05252' : undefined} />
        </View>

        {uploading && (
          <View style={styles.progressContainer}>
            <Typography variant="caption" style={{ marginBottom: spacing[2] }}>
              Uploading... {Math.round(progress * 100)}%
            </Typography>
            <ProgressBar value={Math.round(progress * 100)} />
          </View>
        )}
      </View>

      <View style={styles.footer}>
        <Button 
          variant="primary" 
          size="lg" 
          fullWidth
          onPress={handleComplete}
          disabled={uploading || (!!selectedImage && !processedImages)}
          loading={uploading}
        >
          {selectedImage ? 'Upload & Complete' : 'Complete without photo'}
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing[4],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ccc', // fallback
  },
  content: {
    flex: 1,
    padding: spacing[6],
  },
  pickers: {
    flexDirection: 'row',
    gap: spacing[4],
  },
  pickerButton: {
    flex: 1,
    height: 120,
    flexDirection: 'column',
    justifyContent: 'center',
  },
  imagePreviewContainer: {
    width: '100%',
    aspectRatio: 4/3,
    position: 'relative',
    borderRadius: radii.lg,
    overflow: 'hidden',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
  },
  retakeButton: {
    position: 'absolute',
    bottom: spacing[4],
    right: spacing[4],
  },
  progressContainer: {
    marginTop: spacing[8],
  },
  footer: {
    padding: spacing[6],
  },
});
