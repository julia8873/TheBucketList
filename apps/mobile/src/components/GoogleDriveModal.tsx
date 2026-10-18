import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  TextInput,
  StyleSheet,
  Linking,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
  BackHandler,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import {
  X,
  ExternalLink,
  Clipboard as ClipboardIcon,
  Check,
  ShieldAlert,
  ShieldCheck,
  HelpCircle,
  HardDrive,
  Trash2,
  Lock,
  Eye,
  ChevronDown,
  ChevronUp,
} from 'lucide-react-native';
import { gold, useTheme, toast } from '@bucketlist/ui';

interface GoogleDriveModalProps {
  visible: boolean;
  onClose: () => void;
  currentUrl?: string | null;
  onSave: (url: string | null) => void;
  canEdit?: boolean;
}

export function GoogleDriveModal({
  visible,
  onClose,
  currentUrl = null,
  onSave,
  canEdit = true,
}: GoogleDriveModalProps) {
  const { theme } = useTheme();
  const [url, setUrl] = useState('');
  const [showSecurityGuide, setShowSecurityGuide] = useState(true);

  useEffect(() => {
    if (visible) {
      setUrl(currentUrl || '');
    }
  }, [visible, currentUrl]);

  useEffect(() => {
    if (!visible) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true;
    });
    return () => sub.remove();
  }, [visible, onClose]);

  const handlePasteClipboard = async () => {
    try {
      const text = await Clipboard.getStringAsync();
      if (text && text.trim().length > 0) {
        setUrl(text.trim());
        toast.success('Enlace pegado');
      } else {
        toast.info('El portapapeles está vacío');
      }
    } catch {
      toast.error('No se pudo leer el portapapeles');
    }
  };

  const handleClear = () => {
    setUrl('');
  };

  const handleOpenLink = async () => {
    const target = url.trim() || currentUrl?.trim();
    if (!target) return;
    try {
      let finalUrl = target;
      if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
        finalUrl = `https://${finalUrl}`;
      }
      const canOpen = await Linking.canOpenURL(finalUrl);
      if (canOpen) {
        await Linking.openURL(finalUrl);
      } else {
        toast.error('No se puede abrir este enlace');
      }
    } catch (e) {
      toast.error('Error al abrir Google Drive');
    }
  };

  const handleSave = () => {
    const trimmed = url.trim();
    if (!trimmed) {
      onSave(null);
      onClose();
      return;
    }

    let finalUrl = trimmed;
    if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
      finalUrl = `https://${finalUrl}`;
    }

    onSave(finalUrl);
    onClose();
  };

  const handleRemove = () => {
    onSave(null);
    onClose();
  };

  const isDriveLink = url.toLowerCase().includes('drive.google.com') || url.toLowerCase().includes('docs.google.com');

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardAvoid}
        >
          <View
            style={[
              styles.card,
              { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
            ]}
          >
            {/* Header */}
            <View style={styles.header}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                <View style={styles.iconCircle}>
                  <HardDrive size={20} color={gold[400]} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.title, { color: theme.colors.foreground }]}>
                    Google Drive
                  </Text>
                  <Text style={[styles.subtitle, { color: theme.colors.foregroundMuted }]}>
                    Carpeta o archivo vinculado a la tarea
                  </Text>
                </View>
              </View>
              <Pressable
                onPress={onClose}
                hitSlop={10}
                style={styles.closeBtn}
                accessibilityRole="button"
                accessibilityLabel="Cerrar modal"
              >
                <X size={20} color={theme.colors.foregroundMuted} />
              </Pressable>
            </View>

            <ScrollView
              contentContainerStyle={{ paddingBottom: 20 }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* Input y botón Pegar */}
              {canEdit ? (
                <>
                  <Text style={[styles.inputLabel, { color: theme.colors.foreground }]}>
                    Enlace de Google Drive
                  </Text>
                  <View style={styles.inputSection}>
                    <View
                      style={[
                        styles.inputWrapper,
                        {
                          borderColor: url ? gold[400] : theme.colors.border,
                          backgroundColor: theme.dark ? '#181818' : '#F4F2EC',
                        },
                      ]}
                    >
                      <TextInput
                        value={url}
                        onChangeText={setUrl}
                        placeholder="https://drive.google.com/drive/folders/..."
                        placeholderTextColor={theme.colors.foregroundMuted}
                        style={[styles.input, { color: theme.colors.foreground }]}
                        autoCapitalize="none"
                        autoCorrect={false}
                        keyboardType="url"
                        selectTextOnFocus
                      />
                      {url.length > 0 && (
                        <Pressable onPress={handleClear} hitSlop={8} style={styles.clearBtn}>
                          <X size={16} color={theme.colors.foregroundMuted} />
                        </Pressable>
                      )}
                    </View>

                    <Pressable
                      onPress={handlePasteClipboard}
                      style={styles.pasteBtn}
                      accessibilityRole="button"
                      accessibilityLabel="Pegar enlace"
                    >
                      <ClipboardIcon size={16} color="#0E0E0E" strokeWidth={2.2} />
                      <Text style={styles.pasteBtnText}>Pegar</Text>
                    </Pressable>
                  </View>

                  {url.length > 0 && !isDriveLink && (
                    <Text style={styles.warningNote}>
                      Nota: Este enlace no parece ser de Google Drive, pero puedes guardarlo igualmente.
                    </Text>
                  )}
                </>
              ) : (
                <View
                  style={[
                    styles.readOnlyBox,
                    {
                      backgroundColor: theme.dark ? '#181818' : '#F4F2EC',
                      borderColor: theme.colors.border,
                    },
                  ]}
                >
                  <Text
                    style={[styles.readOnlyUrl, { color: theme.colors.foreground }]}
                    numberOfLines={2}
                  >
                    {url || 'Sin enlace'}
                  </Text>
                </View>
              )}

              {/* Acciones principales: Abrir enlace */}
              {Boolean(url || currentUrl) && (
                <Pressable
                  onPress={handleOpenLink}
                  style={[styles.openLinkBtn, { borderColor: gold[400] }]}
                >
                  <HardDrive size={18} color={gold[400]} />
                  <Text style={[styles.openLinkText, { color: gold[400] }]}>
                    Abrir en Google Drive
                  </Text>
                  <ExternalLink size={16} color={gold[400]} />
                </Pressable>
              )}

              {/* Guía de cómo compartir y proteger el enlace */}
              <View
                style={[
                  styles.guideCard,
                  {
                    backgroundColor: theme.dark ? '#141414' : '#F9F8F5',
                    borderColor: theme.dark ? '#2A2A2A' : '#E5E2DA',
                  },
                ]}
              >
                <Pressable
                  style={styles.guideHeader}
                  onPress={() => setShowSecurityGuide(!showSecurityGuide)}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                    <ShieldCheck size={18} color={gold[400]} />
                    <Text style={[styles.guideTitle, { color: theme.colors.foreground }]}>
                      Cómo compartir y proteger tu carpeta
                    </Text>
                  </View>
                  {showSecurityGuide ? (
                    <ChevronUp size={18} color={theme.colors.foregroundMuted} />
                  ) : (
                    <ChevronDown size={18} color={theme.colors.foregroundMuted} />
                  )}
                </Pressable>

                {showSecurityGuide && (
                  <View style={styles.guideBody}>
                    {/* Paso a paso */}
                    <View style={styles.guideStep}>
                      <View style={styles.stepBadge}>
                        <Text style={styles.stepBadgeText}>1</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.stepTitle, { color: theme.colors.foreground }]}>
                          Obtener el enlace en Google Drive
                        </Text>
                        <Text style={[styles.stepDesc, { color: theme.colors.foregroundMuted }]}>
                          En Google Drive, haz clic derecho (o toca los tres puntos ⋮) en la carpeta o archivo y selecciona{' '}
                          <Text style={{ fontFamily: 'Inter_600SemiBold', color: theme.colors.foreground }}>
                            Compartir
                          </Text>
                          .
                        </Text>
                      </View>
                    </View>

                    {/* Paso 2: Visibilidad */}
                    <View style={styles.guideStep}>
                      <View style={styles.stepBadge}>
                        <Text style={styles.stepBadgeText}>2</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.stepTitle, { color: theme.colors.foreground }]}>
                          Configurar el acceso
                        </Text>
                        <Text style={[styles.stepDesc, { color: theme.colors.foregroundMuted }]}>
                          En <Text style={{ fontFamily: 'Inter_600SemiBold', color: theme.colors.foreground }}>Acceso general</Text>, cambia de «Restringido» a{' '}
                          <Text style={{ fontFamily: 'Inter_600SemiBold', color: theme.colors.foreground }}>
                            «Cualquier persona con el enlace»
                          </Text>{' '}
                          o añade directamente los correos de tus colaboradores.
                        </Text>
                      </View>
                    </View>

                    {/* Advertencia de visibilidad */}
                    <View style={styles.alertBox}>
                      <ShieldAlert size={18} color="#EAB308" style={{ marginTop: 2 }} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.alertTitle}>¡Atención con la visibilidad!</Text>
                        <Text style={styles.alertDesc}>
                          Si eliges «Cualquier persona con el enlace», cualquier usuario que reciba o tenga el enlace podrá ver los archivos sin necesidad de pedir permiso. Ten precaución si compartes información privada.
                        </Text>
                      </View>
                    </View>

                    {/* Cómo poner protección */}
                    <View style={styles.protectionBox}>
                      <Lock size={18} color={gold[400]} style={{ marginTop: 2 }} />
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.protectionTitle, { color: theme.colors.foreground }]}>
                          Cómo proteger tu contenido si el enlace circula
                        </Text>
                        <View style={{ gap: 6, marginTop: 4 }}>
                          <Text style={[styles.bulletItem, { color: theme.colors.foregroundMuted }]}>
                            • <Text style={{ fontFamily: 'Inter_600SemiBold', color: theme.colors.foreground }}>Rol Lector únicamente:</Text> Mantén siempre el permiso en «Lector» para que nadie pueda modificar ni borrar tus archivos.
                          </Text>
                          <Text style={[styles.bulletItem, { color: theme.colors.foregroundMuted }]}>
                            • <Text style={{ fontFamily: 'Inter_600SemiBold', color: theme.colors.foreground }}>Impedir descargas y copias:</Text> En Drive (versión web), toca el engranaje ⚙️ de la ventana de compartir y desmarca la opción «Los lectores pueden ver la opción de descargar, imprimir y copiar».
                          </Text>
                          <Text style={[styles.bulletItem, { color: theme.colors.foregroundMuted }]}>
                            • <Text style={{ fontFamily: 'Inter_600SemiBold', color: theme.colors.foreground }}>Acceso restringido selectivo:</Text> Para máxima seguridad, mantén «Restringido» e introduce solo los correos de Google específicos de las personas autorizadas.
                          </Text>
                        </View>
                      </View>
                    </View>

                    {/* Notificación de acceso */}
                    <View style={[styles.infoBanner, { backgroundColor: 'rgba(212, 177, 58, 0.08)' }]}>
                      <Eye size={16} color={gold[400]} />
                      <Text style={[styles.infoBannerText, { color: theme.colors.foreground }]}>
                        Recibirás una notificación en la app cada vez que alguien abra este enlace.
                      </Text>
                    </View>
                  </View>
                )}
              </View>

              {/* Botones inferiores al editar */}
              {canEdit && (
                <View style={styles.bottomButtons}>
                  {Boolean(currentUrl) && (
                    <Pressable
                      onPress={handleRemove}
                      style={[styles.removeBtn, { borderColor: theme.colors.border }]}
                      accessibilityRole="button"
                      accessibilityLabel="Eliminar enlace"
                    >
                      <Trash2 size={16} color="#EF4444" />
                      <Text style={styles.removeBtnText}>Quitar enlace</Text>
                    </Pressable>
                  )}

                  <Pressable
                    onPress={handleSave}
                    style={[styles.saveBtn, { backgroundColor: gold[400] }]}
                    accessibilityRole="button"
                    accessibilityLabel="Guardar enlace"
                  >
                    <Check size={18} color="#0E0E0E" strokeWidth={2.4} />
                    <Text style={styles.saveBtnText}>Guardar</Text>
                  </Pressable>
                </View>
              )}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  keyboardAvoid: {
    width: '100%',
  },
  card: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    maxHeight: '92%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(212, 177, 58, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    marginTop: 1,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputLabel: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 8,
  },
  inputSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
  },
  input: {
    flex: 1,
    height: 48,
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
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: gold[400],
  },
  pasteBtnText: {
    fontSize: 13,
    fontFamily: 'Inter_700Bold',
    color: '#0E0E0E',
  },
  warningNote: {
    color: '#EAB308',
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    marginBottom: 12,
    lineHeight: 15,
  },
  readOnlyBox: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 14,
  },
  readOnlyUrl: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
  },
  openLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    height: 46,
    borderRadius: 12,
    borderWidth: 1.5,
    backgroundColor: 'rgba(212, 177, 58, 0.08)',
    marginBottom: 16,
  },
  openLinkText: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
  },
  guideCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 16,
  },
  guideHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
  },
  guideTitle: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
  },
  guideBody: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    gap: 12,
  },
  guideStep: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  stepBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(212, 177, 58, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  stepBadgeText: {
    fontSize: 11,
    fontFamily: 'Inter_700Bold',
    color: gold[400],
  },
  stepTitle: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
  },
  stepDesc: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    marginTop: 2,
    lineHeight: 17,
  },
  alertBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: 'rgba(234, 179, 8, 0.1)',
    borderRadius: 12,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#EAB308',
  },
  alertTitle: {
    color: '#EAB308',
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
  },
  alertDesc: {
    color: '#D4D4D8',
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    marginTop: 2,
    lineHeight: 16,
  },
  protectionBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: 'rgba(212, 177, 58, 0.06)',
    borderRadius: 12,
    padding: 12,
  },
  protectionTitle: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
  },
  bulletItem: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    lineHeight: 16,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 10,
    padding: 10,
  },
  infoBannerText: {
    flex: 1,
    fontSize: 11,
    fontFamily: 'Inter_500Medium',
    lineHeight: 15,
  },
  bottomButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
  },
  removeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
  },
  removeBtnText: {
    color: '#EF4444',
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
  },
  saveBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 48,
    borderRadius: 12,
  },
  saveBtnText: {
    color: '#0E0E0E',
    fontSize: 14,
    fontFamily: 'Inter_700Bold',
  },
});
