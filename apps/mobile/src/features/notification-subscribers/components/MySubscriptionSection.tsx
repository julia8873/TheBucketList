import React from 'react';
import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { BellRing, BellPlus, BellOff, Clock } from 'lucide-react-native';
import { gold } from '@bucketlist/ui/src/tokens/colors';
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
  return (
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
            onPress={onCancelSubscription}
            disabled={isRemovePending}
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
            onPress={onCancelSubscription}
            disabled={isRemovePending}
          >
            <Text style={styles.cancelRequestText}>Cancelar</Text>
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
            {isRequestPending ? 'Activando...' : 'Activar notificaciones'}
          </Text>
        </Pressable>
      )}
    </View>
  );
}
