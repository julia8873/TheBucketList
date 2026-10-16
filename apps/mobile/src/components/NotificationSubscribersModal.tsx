import React from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  ScrollView,
  Alert,
} from 'react-native';
import { gold } from '@bucketlist/ui/src/tokens/colors';
import { Bell, X } from 'lucide-react-native';
import {
  useEntitySubscription,
  useEntitySubscribers,
  useRequestEntityNotification,
  useRemoveEntitySubscriber,
} from '../hooks/useEntityNotifications';
import { useAuthStore } from '../stores/auth.store';

import { styles } from '../features/notification-subscribers/styles/notification-subscribers.styles';
import { MySubscriptionSection } from '../features/notification-subscribers/components/MySubscriptionSection';
import { OwnerSubscribersSection } from '../features/notification-subscribers/components/OwnerSubscribersSection';

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
            <MySubscriptionSection
              targetType={targetType}
              isOwner={isOwner}
              loadingSub={loadingSub}
              subscription={subscription}
              isRequestPending={requestMutation.isPending}
              isRemovePending={removeMutation.isPending}
              onRequestSubscription={handleRequestSubscription}
              onCancelSubscription={handleCancelSubscription}
            />

            {/* 2. SECCIÓN: USUARIOS SUSCRITOS (Solo para el creador) */}
            {isOwner && (
              <OwnerSubscribersSection
                loadingSubscribers={loadingSubscribers}
                subscribers={otherSubscribers}
                isRemovePending={removeMutation.isPending}
                onRemoveSubscriber={handleRemoveSubscriber}
              />
            )}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
