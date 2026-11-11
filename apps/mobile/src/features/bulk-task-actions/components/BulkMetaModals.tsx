import React from 'react';
import { View, Text, Pressable, Modal } from 'react-native';
import { Flag, Lock, Globe, Users } from 'lucide-react-native';
import { gold } from '@bucketlist/ui/src/tokens/colors';
import { VISIBILITY_COLORS } from '@bucketlist/ui';
import { styles } from '../styles/bulk-actions.styles';
import { useTranslation } from '@bucketlist/shared';

interface BulkPriorityModalProps {
  visible: boolean;
  count: number;
  onClose: () => void;
  onSelectPriority: (priority: 'high' | 'medium' | 'low') => void;
  title?: string;
}

export function BulkPriorityModal({
  visible,
  count,
  onClose,
  onSelectPriority,
  title,
}: BulkPriorityModalProps) {
  const { t } = useTranslation();
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
            <Text style={styles.modalTitle}>{title || t('bulk_actions.priority_modal_title', { count })}</Text>
          </View>

          {(['high', 'medium', 'low'] as const).map((p) => {
            const label = p === 'high' ? t('common.high') : p === 'medium' ? t('common.medium') : t('common.low');
            const col = p === 'high' ? '#EF4444' : p === 'medium' ? '#D4B13A' : '#10B981';
            return (
              <Pressable
                key={p}
                style={styles.albumOptionRow}
                onPress={() => onSelectPriority(p)}
              >
                <View style={styles.albumOptionLeft}>
                  <Flag size={18} color={col} />
                  <Text style={styles.albumOptionTitle}>{t('bulk_actions.change_priority')}: {label}</Text>
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
  title?: string;
}

export function BulkVisibilityModal({
  visible,
  count,
  onClose,
  onSelectVisibility,
  title,
}: BulkVisibilityModalProps) {
  const { t } = useTranslation();
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
            <Text style={styles.modalTitle}>{title || t('bulk_actions.visibility_modal_title', { count })}</Text>
          </View>

          {([
            { value: 'public' as const, label: t('albums.visibility_public'), icon: Globe, color: VISIBILITY_COLORS.public },
            { value: 'followers' as const, label: t('albums.visibility_followers'), icon: Users, color: VISIBILITY_COLORS.followers },
            { value: 'private' as const, label: t('albums.visibility_private'), icon: Lock, color: VISIBILITY_COLORS.private },
          ]).map((item) => {
            const Icon = item.icon;
            return (
              <Pressable
                key={item.value}
                style={styles.albumOptionRow}
                onPress={() => onSelectVisibility(item.value)}
              >
                <View style={styles.albumOptionLeft}>
                  <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: `${item.color}20`, alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
                    <Icon size={16} color={item.color} />
                  </View>
                  <Text style={[styles.albumOptionTitle, { color: item.color, fontWeight: '600' }]}>{item.label}</Text>
                </View>
              </Pressable>
            );
          })}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
