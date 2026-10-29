import { Alert } from '@bucketlist/ui';
import React from 'react';
import { View, Text, Modal, Pressable, ScrollView } from 'react-native';
import { gold } from '@bucketlist/ui/src/tokens/colors';
import { confirm, toast } from '@bucketlist/ui';
import { useTranslation } from '@bucketlist/shared';
import { Bell } from 'lucide-react-native';
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
  const { t } = useTranslation();
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
          Alert.alert(t('common.error'), err?.message || t('notification_subscribers.error_activate'));
        },
      }
    );
  };

  const handleCancelSubscription = () => {
    if (!effectiveUserId) return;
    Alert.alert(
      t('notification_subscribers.deactivate_confirm_title'),
      targetType === 'bucket'
        ? t('notification_subscribers.deactivate_confirm_msg_bucket')
        : t('notification_subscribers.deactivate_confirm_msg_album'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('notification_subscribers.deactivate_btn'),
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
                  Alert.alert(t('common.error'), err?.message || t('notification_subscribers.error_deactivate'));
                },
              }
            );
          },
        },
      ]
    );
  };

  const handleRemoveSubscriber = (subscriberId: string, name: string) => {
    confirm.show({
      title: t('notification_subscribers.remove_subscriber_title'),
      message:
        targetType === 'bucket'
          ? t('notification_subscribers.remove_subscriber_msg_bucket', { name })
          : t('notification_subscribers.remove_subscriber_msg_album', { name }),
      confirmLabel: t('common.delete'),
      cancelLabel: t('common.cancel'),
      destructive: true,
      onConfirm: () => {
        removeMutation.mutate(
          {
            targetType,
            targetId,
            subscriberId,
          },
          {
            onSuccess: () => {
              toast.success(t('notification_subscribers.remove_subscriber_success', { name }));
            },
            onError: (err: any) => {
              console.error('Error removing subscriber:', err);
              toast.error(err?.message || t('notification_subscribers.error_remove'));
            },
          }
        );
      },
    });
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
              <View style={{ alignItems: 'center', flexShrink: 1 }}>
                <Text style={[styles.headerTitle, { textAlign: 'center' }]} numberOfLines={1}>
                  {targetType === 'bucket'
                    ? t('notification_subscribers.modal_title_bucket')
                    : t('notification_subscribers.modal_title_album')}
                </Text>
                <Text style={[styles.headerSubtitle, { textAlign: 'center' }]} numberOfLines={1}>
                  {targetTitle}
                </Text>
              </View>
            </View>
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
