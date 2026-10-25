import React from 'react';
import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { BellRing, BellPlus, BellOff, Clock } from 'lucide-react-native';
import { gold } from '@bucketlist/ui/src/tokens/colors';
import { useTranslation } from '@bucketlist/shared';
import { styles } from '../styles/notification-subscribers.styles';

interface MySubscriptionSectionProps {
  targetType: 'bucket' | 'album';
  isOwner: boolean;
  loadingSub: boolean;
  subscription: any;
  isRequestPending: boolean;
  isRemovePending: boolean;
  onRequestSubscription: () => void;
  onCancelSubscription: () => void;
}

export function MySubscriptionSection({
  targetType,
  isOwner,
  loadingSub,
  subscription,
  isRequestPending,
  isRemovePending,
  onRequestSubscription,
  onCancelSubscription,
}: MySubscriptionSectionProps) {
  const { t } = useTranslation();

  return (
    <View style={[styles.notificationToggleSection, isOwner && { marginBottom: 22 }]}>
      <Text style={styles.sectionHeaderTitle}>{t('notification_subscribers.my_section_title')}</Text>
      <Text style={styles.sectionDesc}>
        {targetType === 'bucket'
          ? t('notification_subscribers.my_section_desc_bucket')
          : t('notification_subscribers.my_section_desc_album')}
      </Text>

      {loadingSub ? (
        <ActivityIndicator color={gold[400]} style={{ marginVertical: 14 }} />
      ) : subscription?.status === 'accepted' ? (
        <View style={styles.activeCard}>
          <View style={styles.activeCardLeft}>
            <BellRing size={20} color="#34C759" />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.activeTitle}>{t('notification_subscribers.active_title')}</Text>
              <Text style={styles.activeSubtitle}>
                {t('notification_subscribers.active_sub')}
              </Text>
            </View>
          </View>
          <Pressable
            style={styles.deactivateBtn}
            onPress={onCancelSubscription}
            disabled={isRemovePending}
          >
            <BellOff size={15} color="#FF453A" />
            <Text style={styles.deactivateText}>{t('notification_subscribers.deactivate_btn')}</Text>
          </Pressable>
        </View>
      ) : subscription?.status === 'pending' ? (
        <View style={styles.pendingCard}>
          <View style={styles.pendingCardLeft}>
            <Clock size={18} color={gold[400]} />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.pendingTitle}>{t('notification_subscribers.pending_title')}</Text>
              <Text style={styles.pendingSubtitle}>
                {t('notification_subscribers.pending_sub')}
              </Text>
            </View>
          </View>
          <Pressable
            style={styles.cancelRequestBtn}
            onPress={onCancelSubscription}
            disabled={isRemovePending}
          >
            <Text style={styles.cancelRequestText}>{t('common.cancel')}</Text>
          </Pressable>
        </View>
      ) : (
        <Pressable
          style={styles.requestBtn}
          onPress={onRequestSubscription}
          disabled={isRequestPending}
        >
          {isRequestPending ? (
            <ActivityIndicator size="small" color="#0E0E0E" />
          ) : (
            <BellPlus size={18} color="#0E0E0E" strokeWidth={2.4} />
          )}
          <Text style={styles.requestBtnText}>
            {isRequestPending ? t('common.loading') : t('notification_subscribers.activate_title')}
          </Text>
        </Pressable>
      )}
    </View>
  );
}
