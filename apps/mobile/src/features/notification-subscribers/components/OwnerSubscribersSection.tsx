import React from 'react';
import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { Avatar } from '@bucketlist/ui';
import { Clock, Check, Trash2, Users } from 'lucide-react-native';
import { gold } from '@bucketlist/ui/src/tokens/colors';
import { styles } from '../styles/notification-subscribers.styles';

interface SubscriberItem {
  id: string;
  subscriber_id: string;
  status: string;
  profile?: {
    display_name?: string | null;
    username?: string | null;
    avatar_url?: string | null;
  } | null;
}

interface OwnerSubscribersSectionProps {
  loadingSubscribers: boolean;
  subscribers: SubscriberItem[];
  isRemovePending: boolean;
  onRemoveSubscriber: (subscriberId: string, name: string) => void;
}

export function OwnerSubscribersSection({
  loadingSubscribers,
  subscribers,
  isRemovePending,
  onRemoveSubscriber,
}: OwnerSubscribersSectionProps) {
  return (
    <View style={styles.subscribersSection}>
      <View style={styles.subscribersSectionHeader}>
        <Text style={styles.sectionHeaderTitle}>Usuarios suscritos</Text>
        <Text style={styles.subscribersCountSubtitle}>
          {subscribers.length === 0
            ? 'Nadie suscrito todavía'
            : `${subscribers.length} ${subscribers.length === 1 ? 'usuario recibe' : 'usuarios reciben'} avisos`}
        </Text>
      </View>

      {loadingSubscribers ? (
        <ActivityIndicator color={gold[400]} style={{ marginVertical: 20 }} />
      ) : subscribers.length === 0 ? (
        <View style={styles.emptySubscribers}>
          <Users size={32} color="#555" strokeWidth={1.5} />
          <Text style={styles.emptySubscribersTitle}>Nadie suscrito todavía</Text>
          <Text style={styles.emptySubscribersSubtitle}>
            Los usuarios que lo deseen solicitarán activar las notificaciones.
          </Text>
        </View>
      ) : (
        <View style={styles.subscribersList}>
          {subscribers.map((item) => {
            const name = item.profile?.display_name || item.profile?.username || 'Usuario';
            const isPending = item.status === 'pending';

            return (
              <View key={item.id} style={styles.subscriberRow}>
                <Avatar
                  source={item.profile?.avatar_url ? { uri: item.profile.avatar_url } : undefined}
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

                <Pressable
                  style={styles.removeBtn}
                  hitSlop={8}
                  onPress={() => onRemoveSubscriber(item.subscriber_id, name)}
                  disabled={isRemovePending}
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
  );
}
