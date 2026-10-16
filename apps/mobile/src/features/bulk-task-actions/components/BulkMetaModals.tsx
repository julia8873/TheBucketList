import React from 'react';
import { View, Text, Pressable, Modal } from 'react-native';
import { X, Flag, Lock } from 'lucide-react-native';
import { gold } from '@bucketlist/ui/src/tokens/colors';
import { styles } from '../styles/bulk-actions.styles';

interface BulkPriorityModalProps {
  visible: boolean;
  count: number;
  onClose: () => void;
  onSelectPriority: (priority: 'high' | 'medium' | 'low') => void;
}

export function BulkPriorityModal({
  visible,
  count,
  onClose,
  onSelectPriority,
}: BulkPriorityModalProps) {
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
            <Text style={styles.modalTitle}>Prioridad para {count} tareas</Text>
            <Pressable onPress={onClose} hitSlop={10}>
              <X size={20} color="#888" />
            </Pressable>
          </View>

          {(['high', 'medium', 'low'] as const).map((p) => {
            const label = p === 'high' ? 'Alta' : p === 'medium' ? 'Media' : 'Baja';
            const col = p === 'high' ? '#EF4444' : p === 'medium' ? '#D4B13A' : '#10B981';
            return (
              <Pressable
                key={p}
                style={styles.albumOptionRow}
                onPress={() => onSelectPriority(p)}
              >
                <View style={styles.albumOptionLeft}>
                  <Flag size={18} color={col} />
                  <Text style={styles.albumOptionTitle}>Prioridad {label}</Text>
                </View>
              </Pressable>
            );
          })}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

interface BulkVisibilityModalProps {
  visible: boolean;
  count: number;
  onClose: () => void;
  onSelectVisibility: (visibility: 'public' | 'followers' | 'private') => void;
}

export function BulkVisibilityModal({
  visible,
  count,
  onClose,
  onSelectVisibility,
}: BulkVisibilityModalProps) {
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
            <Text style={styles.modalTitle}>Visibilidad para {count} tareas</Text>
            <Pressable onPress={onClose} hitSlop={10}>
              <X size={20} color="#888" />
            </Pressable>
          </View>

          {(['public', 'followers', 'private'] as const).map((v) => {
            const label = v === 'public' ? 'Pública' : v === 'followers' ? 'Solo seguidores' : 'Privada';
            return (
              <Pressable
                key={v}
                style={styles.albumOptionRow}
                onPress={() => onSelectVisibility(v)}
              >
                <View style={styles.albumOptionLeft}>
                  <Lock size={18} color={gold[400]} />
                  <Text style={styles.albumOptionTitle}>{label}</Text>
                </View>
              </Pressable>
            );
          })}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
