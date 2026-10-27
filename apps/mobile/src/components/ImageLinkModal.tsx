import { themedStyleSheet } from '@bucketlist/ui';
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Linking,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
  BackHandler,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image as ExpoImage } from 'expo-image';
import * as Clipboard from 'expo-clipboard';
import { X, Globe, Clipboard as ClipboardIcon, ExternalLink, Check, AlertCircle } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { gold, useTheme, toast } from '@bucketlist/ui';
import { resolveImageUrl, resolveImageUrlAsync, isValidImageUrl } from '../utils/imageUrlResolver';

interface ImageLinkModalProps {
  visible: boolean;
  onClose: () => void;
  onApplyImage: (imageUrl: string) => void;
  initialQuery?: string;
}

export function ImageLinkModal({
  visible,
  onClose,
  onApplyImage,
  initialQuery = '',
}: ImageLinkModalProps) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { theme } = useTheme();
  const [inputUrl, setInputUrl] = useState('');
  const [resolvedUrl, setResolvedUrl] = useState('');
  const [imageLoading, setImageLoading] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const abortCounter = useRef(0);

  useEffect(() => {
    if (visible) {
      setInputUrl('');
      setResolvedUrl('');
      setImageError(false);
      setImageLoaded(false);
      setImageLoading(false);
    }
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true;
    });
    return () => sub.remove();
  }, [visible, onClose]);

  const processInputText = (text: string) => {
    setInputUrl(text);
    setImageError(false);
    setImageLoaded(false);

    const syncResolved = resolveImageUrl(text);
    setResolvedUrl(syncResolved);

    if (syncResolved && isValidImageUrl(syncResolved)) {
      setImageLoading(true);
    } else {
      setImageLoading(false);
    }

    // Resolver de forma asíncrona enlaces acortados / redirecciones de Google (images.app.goo.gl, etc.)
    const currentRun = ++abortCounter.current;
    void resolveImageUrlAsync(text).then((asyncResolved) => {
      if (currentRun === abortCounter.current && asyncResolved && asyncResolved !== syncResolved) {
        setResolvedUrl(asyncResolved);
        if (isValidImageUrl(asyncResolved)) {
          setImageLoading(true);
          setImageError(false);
        }
      }
    });
  };

  const handlePasteClipboard = async () => {
    try {
      // 1. Si el portapapeles contiene una imagen directa (ej. "Copiar imagen")
      const hasImage = await Clipboard.hasImageAsync().catch(() => false);
      if (hasImage) {
        const imgData = await Clipboard.getImageAsync({ format: 'jpeg' });
        if (imgData && imgData.data) {
          const base64Uri = imgData.data.startsWith('data:')
            ? imgData.data
            : `data:image/jpeg;base64,${imgData.data}`;
          setInputUrl(t('image_link_modal.pasted_from_clipboard'));
          setResolvedUrl(base64Uri);
          setImageLoading(false);
          setImageLoaded(true);
          setImageError(false);
          return;
        }
      }

      // 2. Si contiene texto o enlace copiado ("Copiar enlace", "Copiar vínculo a imagen", etc.)
      const text = await Clipboard.getStringAsync();
      if (text && text.trim().length > 0) {
        processInputText(text.trim());
      } else {
        toast.info(t('image_link_modal.toast_empty'));
      }
    } catch (e) {
      console.warn('Error reading clipboard:', e);
      toast.error(t('image_link_modal.toast_error'));
    }
  };

  const handleClear = () => {
    setInputUrl('');
    setResolvedUrl('');
    setImageError(false);
    setImageLoaded(false);
    setImageLoading(false);
  };

  const handleOpenGoogleSearch = async () => {
    const query = initialQuery.trim() || t('image_link_modal.default_query');
    const googleUrl = `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(query)}`;
    try {
      const canOpen = await Linking.canOpenURL(googleUrl);
      if (canOpen) {
        await Linking.openURL(googleUrl);
      }
    } catch (e) {
      console.warn('Error opening Google Images:', e);
    }
  };

  const handleConfirm = () => {
    if (resolvedUrl && isValidImageUrl(resolvedUrl)) {
      onApplyImage(resolvedUrl);
      onClose();
    }
  };

  const canConfirm = Boolean(resolvedUrl && isValidImageUrl(resolvedUrl) && !imageError);

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.backdrop}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={t('common.close')}
        />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardAvoid}
          keyboardVerticalOffset={0}
        >
          <View
            style={[
              styles.sheet,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
                paddingBottom: Math.max(insets.bottom, 16) + 8,
              },
            ]}
          >
            {/* Tirador superior / drag handle */}
            <View style={[styles.handle, { backgroundColor: theme.colors.border }]} />

            {/* Header */}
            <View style={styles.header}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.title, { color: theme.colors.foreground }]}>{t('image_link_modal.title')}</Text>
                <Text style={[styles.subtitle, { color: theme.colors.foregroundMuted }]}>
                  {t('image_link_modal.subtitle')}
                </Text>
              </View>
              <Pressable
                onPress={onClose}
                hitSlop={10}
                style={styles.closeBtn}
                accessibilityRole="button"
                accessibilityLabel={t('common.close')}
              >
                <X size={20} color={theme.colors.foregroundMuted} />
              </Pressable>
            </View>

            <ScrollView
              style={styles.sheetScroll}
              contentContainerStyle={styles.sheetScrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              bounces={false}
            >
              {/* Botón de acceso rápido a Google Imágenes */}
              <Pressable
                onPress={handleOpenGoogleSearch}
                style={[styles.googleSearchBtn, { borderColor: theme.colors.border }]}
                accessibilityRole="button"
                accessibilityLabel={t('image_link_modal.open_google_label')}
              >
                <Globe size={18} color={gold[400]} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.googleSearchText, { color: theme.colors.foreground }]}>
                    {t('image_link_modal.search_google')}
                  </Text>
                  <Text style={[styles.googleSearchHint, { color: theme.colors.foregroundMuted }]}>
                    {t('image_link_modal.search_google_hint')}
                  </Text>
                </View>
                <ExternalLink size={16} color={theme.colors.foregroundMuted} />
              </Pressable>

              {/* Input y botón de pegar */}
              <View style={styles.inputSection}>
                <Pressable
                  onPress={inputUrl ? undefined : handlePasteClipboard}
                  style={[
                    styles.inputWrapper,
                    {
                      borderColor: inputUrl ? gold[400] : theme.colors.border,
                      backgroundColor: theme.dark ? '#181818' : '#F4F2EC',
                    },
                  ]}
                  accessibilityRole={inputUrl ? 'none' : 'button'}
                  accessibilityLabel={inputUrl ? t('image_link_modal.title') : t('image_link_modal.paste_placeholder')}
                >
                  <View style={styles.displayContent}>
                    {inputUrl ? (
                      <Text
                        style={[styles.inputText, { color: theme.colors.foreground }]}
                        numberOfLines={1}
                        ellipsizeMode="middle"
                      >
                        {inputUrl}
                      </Text>
                    ) : (
                      <Text style={[styles.placeholderText, { color: theme.colors.foregroundMuted }]}>
                        {t('image_link_modal.paste_placeholder')}
                      </Text>
                    )}
                  </View>

                  {inputUrl.length > 0 && (
                    <Pressable
                      onPress={handleClear}
                      hitSlop={10}
                      style={styles.clearBtn}
                      accessibilityLabel={t('image_link_modal.clear_label')}
                    >
                      <X size={16} color={theme.colors.foregroundMuted} />
                    </Pressable>
                  )}
                </Pressable>

                <Pressable
                  onPress={handlePasteClipboard}
                  style={styles.pasteBtn}
                  accessibilityRole="button"
                  accessibilityLabel={t('image_link_modal.paste_label')}
                >
                  <ClipboardIcon size={16} color="#0E0E0E" strokeWidth={2.4} />
                  <Text style={styles.pasteBtnText}>{t('image_link_modal.paste_button')}</Text>
                </Pressable>
              </View>

              <Text style={[styles.pasteHintText, { color: theme.colors.foregroundMuted }]}>
                {t('image_link_modal.paste_hint')}
              </Text>

              {/* Vista previa de la imagen */}
              <View
                style={[
                  styles.previewContainer,
                  {
                    borderColor: theme.colors.border,
                    backgroundColor: theme.dark ? '#111' : '#EBE7DD',
                  },
                ]}
              >
                {resolvedUrl && isValidImageUrl(resolvedUrl) ? (
                  <>
                    <ExpoImage
                      source={{
                        uri: resolvedUrl,
                        headers: {
                          'User-Agent':
                            'Mozilla/5.0 (Mobile; rv:120.0) Gecko/120.0 Firefox/120.0',
                          Accept:
                            'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
                        },
                      }}
                      style={StyleSheet.absoluteFill}
                      contentFit="cover"
                      cachePolicy="memory-disk"
                      onLoad={() => {
                        setImageLoading(false);
                        setImageLoaded(true);
                        setImageError(false);
                      }}
                      onError={() => {
                        setImageLoading(false);
                        setImageError(true);
                        setImageLoaded(false);
                      }}
                    />
                    {imageLoading && (
                      <View style={styles.previewLoader}>
                        <ActivityIndicator color={gold[400]} size="small" />
                        <Text style={[styles.previewStatusText, { color: '#FFF' }]}>
                          {t('image_link_modal.loading')}
                        </Text>
                      </View>
                    )}
                    {imageError && (
                      <View style={styles.previewErrorWrap}>
                        <AlertCircle size={24} color="#EF4444" />
                        <Text style={styles.previewErrorTitle}>{t('image_link_modal.error_title')}</Text>
                        <Text style={styles.previewErrorDesc}>
                          {t('image_link_modal.error_desc')}
                        </Text>
                      </View>
                    )}
                    {imageLoaded && !imageError && (
                      <View style={styles.previewBadgeSuccess}>
                        <Check size={14} color="#FFF" strokeWidth={2.5} />
                        <Text style={styles.previewBadgeSuccessText}>{t('image_link_modal.valid_image')}</Text>
                      </View>
                    )}
                  </>
                ) : (
                  <View style={styles.previewEmpty}>
                    <Globe size={28} color={theme.colors.foregroundMuted} />
                    <Text style={[styles.previewEmptyText, { color: theme.colors.foregroundMuted }]}>
                      {t('image_link_modal.empty_preview')}
                    </Text>
                  </View>
                )}
              </View>
            </ScrollView>

            {/* Action Footer fija en la parte inferior para que Cancelar y Confirmar se vean sin scroll */}
            <View style={styles.footerRow}>
              <Pressable
                onPress={onClose}
                style={[
                  styles.cancelBtn,
                  {
                    backgroundColor: theme.colors.surfaceElevated ?? theme.colors.surface,
                    borderColor: theme.colors.border,
                  },
                ]}
                accessibilityRole="button"
                accessibilityLabel={t('common.cancel', { defaultValue: 'Cancelar' })}
              >
                <Text style={[styles.cancelBtnText, { color: theme.colors.foreground }]}>
                  {t('common.cancel', { defaultValue: 'Cancelar' })}
                </Text>
              </Pressable>

              <Pressable
                onPress={handleConfirm}
                disabled={!canConfirm}
                style={[
                  styles.confirmBtn,
                  canConfirm
                    ? { backgroundColor: gold[400] }
                    : { backgroundColor: theme.dark ? '#222' : '#DDD', opacity: 0.6 },
                ]}
                accessibilityRole="button"
                accessibilityLabel={t('image_link_modal.use_cover_label')}
              >
                <Check
                  size={18}
                  color={canConfirm ? '#0E0E0E' : theme.colors.foregroundMuted}
                  strokeWidth={2.5}
                />
                <Text
                  style={[
                    styles.confirmBtnText,
                    { color: canConfirm ? '#0E0E0E' : theme.colors.foregroundMuted },
                  ]}
                >
                  {t('image_link_modal.use_cover')}
                </Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = themedStyleSheet({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
    ...Platform.select({
      web: {
        alignItems: 'center',
      },
    }),
  },
  keyboardAvoid: {
    width: '100%',
    justifyContent: 'flex-end',
    ...Platform.select({
      web: {
        alignItems: 'center',
      },
    }),
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingTop: 10,
    paddingHorizontal: 16,
    minHeight: 520,
    maxHeight: '92%',
    width: '100%',
    overflow: 'hidden',
    ...Platform.select({
      web: {
        maxWidth: 620,
        alignSelf: 'center',
        borderLeftWidth: 1,
        borderRightWidth: 1,
      },
    }),
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 12,
  },
  sheetScroll: {
    flexGrow: 1,
    flexShrink: 1,
  },
  sheetScrollContent: {
    paddingBottom: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  googleSearchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    backgroundColor: 'rgba(212, 177, 58, 0.08)',
    marginBottom: 16,
  },
  googleSearchText: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
  },
  googleSearchHint: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    marginTop: 1,
  },
  inputSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 6,
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
  },
  displayContent: {
    flex: 1,
    justifyContent: 'center',
  },
  inputText: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
  },
  placeholderText: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
  },
  clearBtn: {
    padding: 4,
    marginLeft: 6,
  },
  pasteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 48,
    paddingHorizontal: 18,
    borderRadius: 12,
    backgroundColor: gold[400],
    shadowColor: gold[400],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  pasteBtnText: {
    fontSize: 14,
    fontFamily: 'Inter_700Bold',
    color: '#0E0E0E',
  },
  pasteHintText: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    marginBottom: 14,
    paddingHorizontal: 4,
  },
  previewContainer: {
    width: '100%',
    height: 160,
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    position: 'relative',
  },
  previewEmpty: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 16,
  },
  previewEmptyText: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
  },
  previewLoader: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  previewStatusText: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
  },
  previewErrorWrap: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    gap: 6,
  },
  previewErrorTitle: {
    color: '#EF4444',
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
  },
  previewErrorDesc: {
    color: '#A0A0A0',
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    lineHeight: 15,
  },
  previewBadgeSuccess: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(52, 199, 89, 0.9)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  previewBadgeSuccessText: {
    color: '#FFF',
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 10,
    paddingTop: 6,
  },
  cancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
  },
  confirmBtn: {
    flex: 1.4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    borderRadius: 14,
  },
  confirmBtnText: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
  },
});
