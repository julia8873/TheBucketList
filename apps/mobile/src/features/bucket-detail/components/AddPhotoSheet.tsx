import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Camera, Image as ImageIcon, Globe, X } from 'lucide-react-native';
import { gold, useTheme } from '@bucketlist/ui';
import { useTranslation } from '@bucketlist/shared';
import { TagSheetShell } from '@/components/TagSheetShell';

interface AddPhotoSheetProps {
  visible: boolean;
  onClose: () => void;
  onPickCamera: () => void;
  onPickGallery: () => void;
  onPickGooglePhotos: () => void;
}

export function AddPhotoSheet({
  visible,
  onClose,
  onPickCamera,
  onPickGallery,
  onPickGooglePhotos,
}: AddPhotoSheetProps) {
  const { theme } = useTheme();
  const { t } = useTranslation();

  return (
    <TagSheetShell visible={visible} onClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <View>
            <Text style={[styles.title, { color: theme.colors.foreground }]}>{t('bucket.add_photo_sheet_title')}</Text>
            <Text style={[styles.subtitle, { color: theme.colors.foregroundMuted }]}>
              {t('bucket.add_photo_sheet_subtitle')}
            </Text>
          </View>
          <Pressable
            onPress={onClose}
            hitSlop={8}
            style={[
              styles.closeBtn,
              {
                backgroundColor: theme.colors.surfaceElevated ?? theme.colors.surface,
                borderColor: theme.colors.border,
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel={t('common.close')}
          >
            <X size={16} color={theme.colors.foregroundMuted} />
          </Pressable>
        </View>

        <View style={styles.optionsList}>
          {/* Opción Cámara */}
          <Pressable
            style={({ pressed }) => [
              styles.optionCard,
              {
                backgroundColor: theme.colors.surfaceElevated ?? (theme.dark ? '#1A1A1A' : '#F5F5F5'),
                borderColor: theme.colors.border,
              },
              pressed && { opacity: 0.8, transform: [{ scale: 0.99 }] },
            ]}
            onPress={() => {
              onClose();
              setTimeout(() => onPickCamera(), 200);
            }}
            accessibilityRole="button"
            accessibilityLabel={t('bucket.camera_desc')}
          >
            <View style={[styles.iconCircle, { backgroundColor: 'rgba(212, 177, 58, 0.12)' }]}>
              <Camera size={22} color={gold[400]} strokeWidth={2} />
            </View>
            <View style={styles.textWrap}>
              <Text style={[styles.optionTitle, { color: theme.colors.foreground }]}>
                {t('bucket.camera_option')}
              </Text>
              <Text style={[styles.optionDesc, { color: theme.colors.foregroundMuted }]}>
                {t('bucket.camera_desc')}
              </Text>
            </View>
          </Pressable>

          {/* Opción Galería */}
          <Pressable
            style={({ pressed }) => [
              styles.optionCard,
              {
                backgroundColor: theme.colors.surfaceElevated ?? (theme.dark ? '#1A1A1A' : '#F5F5F5'),
                borderColor: theme.colors.border,
              },
              pressed && { opacity: 0.8, transform: [{ scale: 0.99 }] },
            ]}
            onPress={() => {
              onClose();
              setTimeout(() => onPickGallery(), 200);
            }}
            accessibilityRole="button"
            accessibilityLabel={t('bucket.gallery_desc')}
          >
            <View style={[styles.iconCircle, { backgroundColor: 'rgba(212, 177, 58, 0.12)' }]}>
              <ImageIcon size={22} color={gold[400]} strokeWidth={2} />
            </View>
            <View style={styles.textWrap}>
              <Text style={[styles.optionTitle, { color: theme.colors.foreground }]}>
                {t('bucket.gallery_option')}
              </Text>
              <Text style={[styles.optionDesc, { color: theme.colors.foregroundMuted }]}>
                {t('bucket.gallery_desc')}
              </Text>
            </View>
          </Pressable>

          {/* Opción Google Fotos / Web */}
          <Pressable
            style={({ pressed }) => [
              styles.optionCard,
              {
                backgroundColor: theme.colors.surfaceElevated ?? (theme.dark ? '#1A1A1A' : '#F5F5F5'),
                borderColor: theme.colors.border,
              },
              pressed && { opacity: 0.8, transform: [{ scale: 0.99 }] },
            ]}
            onPress={() => {
              onClose();
              setTimeout(() => onPickGooglePhotos(), 200);
            }}
            accessibilityRole="button"
            accessibilityLabel={t('bucket.web_link_desc')}
          >
            <View style={[styles.iconCircle, { backgroundColor: 'rgba(212, 177, 58, 0.12)' }]}>
              <Globe size={22} color={gold[400]} strokeWidth={2} />
            </View>
            <View style={styles.textWrap}>
              <Text style={[styles.optionTitle, { color: theme.colors.foreground }]}>
                {t('bucket.web_link_option')}
              </Text>
              <Text style={[styles.optionDesc, { color: theme.colors.foregroundMuted }]}>
                {t('bucket.web_link_desc')}
              </Text>
            </View>
          </Pressable>
        </View>
      </View>
    </TagSheetShell>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingBottom: 36,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  title: {
    fontFamily: 'PlayfairDisplay_700Bold',
    fontSize: 20,
    letterSpacing: 0.3,
  },
  subtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  optionsList: {
    marginTop: 16,
    gap: 12,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  textWrap: {
    flex: 1,
  },
  optionTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
    marginBottom: 2,
  },
  optionDesc: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
  },
});
