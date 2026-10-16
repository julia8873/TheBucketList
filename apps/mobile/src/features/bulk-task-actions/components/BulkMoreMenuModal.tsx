import React from 'react';
import { View, Text, Pressable, Modal } from 'react-native';
import { X, BellOff, Flag, Lock, Star, Check, Trash2 } from 'lucide-react-native';
import { gold } from '@bucketlist/ui/src/tokens/colors';
import { styles } from '../styles/bulk-actions.styles';

interface BulkMoreMenuModalProps {
  visible: boolean;
  count: number;
  onClose: () => void;
  onClearNotifications: () => void;
  onChangePriority: () => void;
  onChangeVisibility: () => void;
  onAddFavorites: () => void;
  onReopenTasks: () => void;
  onDeleteAll: () => void;
}

export function BulkMoreMenuModal({
  visible,
  count,
  onClose,
  onClearNotifications,
  onChangePriority,
  onChangeVisibility,
  onAddFavorites,
  onReopenTasks,
  onDeleteAll,
}: BulkMoreMenuModalProps) {
  if (!visible) return null;

  return (
    <Modal
      transparent
      animationType="fade"
      visible={visible}
      onRequestClose={onClose}
    >
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Opciones para {count} tareas</Text>
            <Pressable onPress={onClose} hitSlop={10}>
              <X size={20} color="#888" />
            </Pressable>
          </View>

          {/* Vaciar notificaciones */}
          <Pressable style={styles.menuItem} onPress={onClearNotifications}>
            <BellOff size={18} color="#E0A343" />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.menuItemTitle}>Vaciar notificaciones</Text>
              <Text style={styles.menuItemSubtitle}>
                Desactiva y limpia los avisos de las tareas seleccionadas
              </Text>
            </View>
          </Pressable>

          {/* Cambiar prioridad */}
          <Pressable style={styles.menuItem} onPress={onChangePriority}>
            <Flag size={18} color={gold[400]} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.menuItemTitle}>Cambiar prioridad</Text>
              <Text style={styles.menuItemSubtitle}>Asignar Alta, Media o Baja</Text>
            </View>
          </Pressable>

          {/* Cambiar visibilidad */}
          <Pressable style={styles.menuItem} onPress={onChangeVisibility}>
            <Lock size={18} color={gold[400]} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.menuItemTitle}>Cambiar visibilidad</Text>
              <Text style={styles.menuItemSubtitle}>Pública, Privada o Sólo seguidores</Text>
            </View>
          </Pressable>

          {/* Añadir a Favoritas */}
          <Pressable style={styles.menuItem} onPress={onAddFavorites}>
            <Star size={18} color={gold[400]} fill={gold[400]} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.menuItemTitle}>Añadir a favoritas</Text>
              <Text style={styles.menuItemSubtitle}>Marcar con estrella todas a la vez</Text>
            </View>
          </Pressable>

          {/* Reabrir como pendientes */}
          <Pressable style={styles.menuItem} onPress={onReopenTasks}>
            <Check size={18} color="#AAA" />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.menuItemTitle}>Reabrir como pendientes</Text>
              <Text style={styles.menuItemSubtitle}>Volver a ponerlas en estado activo</Text>
            </View>
          </Pressable>

          {/* Borrar todas */}
          <Pressable style={[styles.menuItem, styles.menuItemDelete]} onPress={onDeleteAll}>
            <Trash2 size={18} color="#FF453A" />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[styles.menuItemTitle, { color: '#FF453A' }]}>
                Eliminar todas ({count})
              </Text>
              <Text style={styles.menuItemSubtitle}>
                Borra definitivamente las tareas seleccionadas
              </Text>
            </View>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
