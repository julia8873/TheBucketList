import React from 'react';
import { View, Text, Pressable, Modal } from 'react-native';
import { X, Flag, Lock } from 'lucide-react-native';
import { gold } from '@bucketlist/ui/src/tokens/colors';
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
            <Pressable onPress={onClose} hitSlop={10}>
              <X size={20} color="#888" />
            </Pressable>
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
            <Pressable onPress={onClose} hitSlop={10}>
              <X size={20} color="#888" />
            </Pressable>
          </View>

          {(['public', 'followers', 'private'] as const).map((v) => {
            const label =
              v === 'public'
                ? t('albums.visibility_public')
                : v === 'followers'
                ? t('albums.visibility_followers')
                : t('albums.visibility_private');
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
