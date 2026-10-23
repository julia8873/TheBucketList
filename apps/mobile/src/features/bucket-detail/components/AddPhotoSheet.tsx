import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Camera, Image as ImageIcon, Globe, X } from 'lucide-react-native';
import { gold, useTheme } from '@bucketlist/ui';
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

  return (
    <TagSheetShell visible={visible} onClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <View>
            <Text style={[styles.title, { color: theme.colors.foreground }]}>Añadir foto</Text>
            <Text style={[styles.subtitle, { color: theme.colors.foregroundMuted }]}>
              Elige el origen de tu foto
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
            accessibilityLabel="Cerrar selector de foto"
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
            accessibilityLabel="Hacer foto con la cámara"
          >
            <View style={[styles.iconCircle, { backgroundColor: 'rgba(212, 177, 58, 0.12)' }]}>
              <Camera size={22} color={gold[400]} strokeWidth={2} />
            </View>
            <View style={styles.textWrap}>
              <Text style={[styles.optionTitle, { color: theme.colors.foreground }]}>
                Cámara
              </Text>
              <Text style={[styles.optionDesc, { color: theme.colors.foregroundMuted }]}>
                Hacer foto al instante
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
            accessibilityLabel="Elegir foto de la galería"
          >
            <View style={[styles.iconCircle, { backgroundColor: 'rgba(212, 177, 58, 0.12)' }]}>
              <ImageIcon size={22} color={gold[400]} strokeWidth={2} />
            </View>
            <View style={styles.textWrap}>
              <Text style={[styles.optionTitle, { color: theme.colors.foreground }]}>
                Galería de fotos
              </Text>
              <Text style={[styles.optionDesc, { color: theme.colors.foregroundMuted }]}>
                Elegir fotos desde tu dispositivo
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
            accessibilityLabel="Añadir desde Google Fotos o enlace web"
          >
            <View style={[styles.iconCircle, { backgroundColor: 'rgba(212, 177, 58, 0.12)' }]}>
              <Globe size={22} color={gold[400]} strokeWidth={2} />
            </View>
            <View style={styles.textWrap}>
              <Text style={[styles.optionTitle, { color: theme.colors.foreground }]}>
                Google Fotos / Enlace Web
              </Text>
              <Text style={[styles.optionDesc, { color: theme.colors.foregroundMuted }]}>
                Pega un enlace de Google Fotos, Imágenes o web
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
    paddingHorizontal: 20,
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
