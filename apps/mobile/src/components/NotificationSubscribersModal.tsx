import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Avatar, useTheme } from '@bucketlist/ui';
import { gold } from '@bucketlist/ui/src/tokens/colors';
import {
  Bell,
  BellRing,
  BellPlus,
  BellOff,
  Trash2,
  X,
  Check,
  Clock,
  Users,
} from 'lucide-react-native';
import {
  useEntitySubscription,
  useEntitySubscribers,
  useRequestEntityNotification,
  useRemoveEntitySubscriber,
} from '../hooks/useEntityNotifications';
import { useAuthStore } from '../stores/auth.store';

interface NotificationSubscribersModalProps {
  visible: boolean;
  onClose: () => void;
  targetType: 'bucket' | 'album';
  targetId: string;
  targetTitle: string;
  ownerId?: string;
  currentUserId?: string;
}

export function NotificationSubscribersModal({
  visible,
  onClose,
  targetType,
  targetId,
  targetTitle,
  ownerId,
  currentUserId,
}: NotificationSubscribersModalProps) {
  const { theme } = useTheme();
  const { user: authUser } = useAuthStore();
  const effectiveUserId = currentUserId || authUser?.id;
  const effectiveOwnerId = ownerId || effectiveUserId || '';
  const isOwner = !!effectiveUserId && (effectiveUserId === effectiveOwnerId || !ownerId);

  const { data: subscription, isLoading: loadingSub } = useEntitySubscription(
    targetType,
    targetId,
    effectiveUserId
  );
  const { data: subscribers = [], isLoading: loadingSubscribers } = useEntitySubscribers(
    targetType,
    targetId
  );

  const requestMutation = useRequestEntityNotification();
  const removeMutation = useRemoveEntitySubscriber();

  // Personal notification actions: Activate or Deactivate
  const handleRequestSubscription = () => {
    if (!effectiveUserId) return;
    requestMutation.mutate(
      {
        targetType,
        targetId,
        ownerId: effectiveOwnerId,
        subscriberId: effectiveUserId,
        requesterId: effectiveUserId,
      },
      {
        onError: (err: any) => {
          console.error('Error activating notifications:', err);
          Alert.alert('Error', err?.message || 'No se pudieron activar las notificaciones.');
        },
      }
    );
  };

  const handleCancelSubscription = () => {
    if (!effectiveUserId) return;
    Alert.alert(
      'Desactivar notificaciones',
      '¿Deseas dejar de recibir notificaciones de este ' + (targetType === 'bucket' ? 'tarea' : 'álbum') + '?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Desactivar',
          style: 'destructive',
          onPress: () => {
            removeMutation.mutate(
              {
                targetType,
                targetId,
                subscriberId: effectiveUserId,
              },
              {
                onError: (err: any) => {
                  console.error('Error deactivating notifications:', err);
                  Alert.alert('Error', err?.message || 'No se pudieron desactivar las notificaciones.');
                },
              }
            );
          },
        },
      ]
    );
  };

  // Owner action: Remove a subscriber
  const handleRemoveSubscriber = (subscriberId: string, name: string) => {
    Alert.alert(
      'Eliminar suscriptor',
      `¿Deseas eliminar a ${name} de las notificaciones de este ${targetType === 'bucket' ? 'tarea' : 'álbum'}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => {
            removeMutation.mutate(
              {
                targetType,
                targetId,
                subscriberId,
              },
              {
                onError: (err: any) => {
                  console.error('Error removing subscriber:', err);
                  Alert.alert('Error', err?.message || 'No se pudo eliminar al suscriptor.');
                },
              }
            );
          },
        },
      ]
    );
  };

  const otherSubscribers = subscribers.filter((s) => s.subscriber_id !== effectiveUserId);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheetContent} onPress={(e) => e.stopPropagation()}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.headerIconCircle}>
                <Bell size={20} color={gold[400]} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.headerTitle} numberOfLines={1}>
                  Notificaciones de {targetType === 'bucket' ? 'la tarea' : 'el álbum'}
                </Text>
                <Text style={styles.headerSubtitle} numberOfLines={1}>
                  {targetTitle}
                </Text>
              </View>
            </View>
            <Pressable onPress={onClose} hitSlop={10} style={styles.closeBtn}>
              <X size={20} color="#888" />
            </Pressable>
          </View>

          <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>
            {/* 1. SECCIÓN: TUS NOTIFICACIONES */}
            <View style={[styles.notificationToggleSection, isOwner && { marginBottom: 22 }]}>
              <Text style={styles.sectionHeaderTitle}>Tus notificaciones</Text>
              <Text style={styles.sectionDesc}>
                Recibe avisos al instante en tu móvil y en la app cuando se añadan, editen o borren tareas, o haya cambios en este {targetType === 'bucket' ? 'tarea' : 'álbum'}.
              </Text>

              {loadingSub ? (
                <ActivityIndicator color={gold[400]} style={{ marginVertical: 14 }} />
              ) : subscription?.status === 'accepted' ? (
                <View style={styles.activeCard}>
                  <View style={styles.activeCardLeft}>
                    <BellRing size={20} color="#34C759" />
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={styles.activeTitle}>Notificaciones activadas</Text>
                      <Text style={styles.activeSubtitle}>
                        Recibirás avisos de cualquier cambio.
                      </Text>
                    </View>
                  </View>
                  <Pressable
                    style={styles.deactivateBtn}
                    onPress={handleCancelSubscription}
                    disabled={removeMutation.isPending}
                  >
                    <BellOff size={15} color="#FF453A" />
                    <Text style={styles.deactivateText}>Desactivar</Text>
                  </Pressable>
                </View>
              ) : subscription?.status === 'pending' ? (
                <View style={styles.pendingCard}>
                  <View style={styles.pendingCardLeft}>
                    <Clock size={18} color={gold[400]} />
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={styles.pendingTitle}>Solicitud pendiente</Text>
                      <Text style={styles.pendingSubtitle}>
                        Esperando a que el creador acepte tu solicitud.
                      </Text>
                    </View>
                  </View>
                  <Pressable
                    style={styles.cancelRequestBtn}
                    onPress={handleCancelSubscription}
                    disabled={removeMutation.isPending}
                  >
                    <Text style={styles.cancelRequestText}>Cancelar</Text>
                  </Pressable>
                </View>
              ) : (
                <Pressable
                  style={styles.requestBtn}
                  onPress={handleRequestSubscription}
                  disabled={requestMutation.isPending}
                >
                  {requestMutation.isPending ? (
                    <ActivityIndicator size="small" color="#0E0E0E" />
                  ) : (
                    <BellPlus size={18} color="#0E0E0E" strokeWidth={2.4} />
                  )}
                  <Text style={styles.requestBtnText}>
                    {requestMutation.isPending ? 'Activando...' : 'Activar notificaciones'}
                  </Text>
                </Pressable>
              )}
            </View>

            {/* 2. SECCIÓN: USUARIOS SUSCRITOS (Solo para el creador) */}
            {isOwner && (
              <View style={styles.subscribersSection}>
                <View style={styles.subscribersSectionHeader}>
                  <Text style={styles.sectionHeaderTitle}>Usuarios suscritos</Text>
                  <Text style={styles.subscribersCountSubtitle}>
                    {otherSubscribers.length === 0
                      ? 'Nadie suscrito todavía'
                      : `${otherSubscribers.length} ${otherSubscribers.length === 1 ? 'usuario recibe' : 'usuarios reciben'} avisos`}
                  </Text>
                </View>

                {loadingSubscribers ? (
                  <ActivityIndicator color={gold[400]} style={{ marginVertical: 20 }} />
                ) : otherSubscribers.length === 0 ? (
                  <View style={styles.emptySubscribers}>
                    <Users size={32} color="#555" strokeWidth={1.5} />
                    <Text style={styles.emptySubscribersTitle}>Nadie suscrito todavía</Text>
                    <Text style={styles.emptySubscribersSubtitle}>
                      Los usuarios que lo deseen solicitarán activar las notificaciones.
                    </Text>
                  </View>
                ) : (
                  <View style={styles.subscribersList}>
                    {otherSubscribers.map((item) => {
                      const name =
                        item.profile?.display_name || item.profile?.username || 'Usuario';
                      const isPending = item.status === 'pending';

                      return (
                        <View key={item.id} style={styles.subscriberRow}>
                          <Avatar
                            source={
                              item.profile?.avatar_url
                                ? { uri: item.profile.avatar_url }
                                : undefined
                            }
                            fallback={name.charAt(0)}
                            size="sm"
                          />
                          <View style={styles.subscriberInfo}>
                            <Text style={styles.subscriberName} numberOfLines={1}>
                              {name}
                            </Text>
                            <View style={styles.statusBadge}>
                              {isPending ? (
                                <>
                                  <Clock size={11} color={gold[400]} />
                                  <Text style={styles.statusBadgePending}>Pendiente</Text>
                                </>
                              ) : (
                                <>
                                  <Check size={11} color="#34C759" />
                                  <Text style={styles.statusBadgeActive}>Activo</Text>
                                </>
                              )}
                            </View>
                          </View>

                          {/* Delete button: Owner can remove any subscriber */}
                          <Pressable
                            style={styles.removeBtn}
                            hitSlop={8}
                            onPress={() => handleRemoveSubscriber(item.subscriber_id, name)}
                            disabled={removeMutation.isPending}
                            accessibilityLabel={`Borrar a ${name} de las notificaciones`}
                          >
                            <Trash2 size={16} color="#FF453A" strokeWidth={1.8} />
                          </Pressable>
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>
            )}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  sheetContent: {
    backgroundColor: '#161616',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingTop: 16,
    paddingBottom: 32,
    paddingHorizontal: 20,
    maxHeight: '80%',
    borderWidth: 1,
    borderColor: '#262626',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#262626',
    marginBottom: 14,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  headerIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#262010',
    borderWidth: 1,
    borderColor: '#3D3310',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
    color: '#FFF',
  },
  headerSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12.5,
    color: '#8E8E93',
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
  },
  scrollArea: {
    maxHeight: 420,
  },
  notificationToggleSection: {
    paddingVertical: 6,
  },
  sectionHeaderTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14.5,
    color: '#FFF',
    marginBottom: 4,
  },
  sectionDesc: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: '#AAA',
    lineHeight: 18,
    marginBottom: 14,
  },
  requestBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: gold[400],
    paddingVertical: 13,
    borderRadius: 12,
    gap: 8,
  },
  requestBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: '#0E0E0E',
  },
  pendingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1E1B12',
    borderWidth: 1,
    borderColor: '#3D3310',
    borderRadius: 12,
    padding: 14,
  },
  pendingCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  pendingTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13.5,
    color: gold[400],
  },
  pendingSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  cancelRequestBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#28241A',
  },
  cancelRequestText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: '#AAA',
  },
  activeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0F2416',
    borderWidth: 1,
    borderColor: '#184726',
    borderRadius: 12,
    padding: 14,
  },
  activeCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  activeTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13.5,
    color: '#34C759',
  },
  activeSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: '#A0C4A9',
    marginTop: 2,
  },
  deactivateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#261212',
    borderWidth: 1,
    borderColor: '#4A1D1D',
  },
  deactivateText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11.5,
    color: '#FF453A',
  },
  subscribersSection: {
    paddingVertical: 6,
  },
  subscribersSectionHeader: {
    marginBottom: 12,
  },
  subscribersCountSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  emptySubscribers: {
    alignItems: 'center',
    paddingVertical: 26,
    paddingHorizontal: 16,
    backgroundColor: '#131313',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#202020',
  },
  emptySubscribersTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13.5,
    color: '#CCC',
    marginTop: 8,
  },
  emptySubscribersSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: '#777',
    textAlign: 'center',
    marginTop: 3,
  },
  subscribersList: {
    gap: 8,
  },
  subscriberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  subscriberInfo: {
    flex: 1,
    marginLeft: 10,
  },
  subscriberName: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    color: '#EEE',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
  },
  statusBadgeActive: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    color: '#34C759',
  },
  statusBadgePending: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    color: gold[400],
  },
  removeBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#261414',
    borderWidth: 1,
    borderColor: '#3D1E1E',
  },
});
