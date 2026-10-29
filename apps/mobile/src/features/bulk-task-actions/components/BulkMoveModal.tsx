import React from 'react';
import { View, Text, Pressable, Modal, ScrollView } from 'react-native';
import { FolderOpen, FolderInput } from 'lucide-react-native';
import { gold } from '@bucketlist/ui/src/tokens/colors';
import { styles } from '../styles/bulk-actions.styles';
import { useTranslation } from '@bucketlist/shared';

interface AlbumItem {
  id: string;
  title: string;
}

interface BulkMoveModalProps {
  visible: boolean;
  count: number;
  albums: AlbumItem[];
  onClose: () => void;
  onSelectAlbum: (albumId: string | null) => void;
}

export function BulkMoveModal({
  visible,
  count,
  albums,
  onClose,
  onSelectAlbum,
}: BulkMoveModalProps) {
  const { t } = useTranslation();
  if (!visible) return null;

  return (
    <Modal
      transparent
      animationType="slide"
      visible={visible}
      onRequestClose={onClose}
    >
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{t('bulk_actions.move_modal_title', { count })}</Text>
          </View>

          <ScrollView style={{ maxHeight: 340 }}>
            {/* Option: Sin álbum */}
            <Pressable
              style={styles.albumOptionRow}
              onPress={() => onSelectAlbum(null)}
            >
              <View style={styles.albumOptionLeft}>
                <FolderOpen size={18} color="#888" />
                <Text style={styles.albumOptionTitle}>{t('bulk_actions.no_album')}</Text>
              </View>
            </Pressable>

            {/* List of user albums */}
            {albums.map((alb) => (
              <Pressable
                key={alb.id}
                style={styles.albumOptionRow}
                onPress={() => onSelectAlbum(alb.id)}
              >
                <View style={styles.albumOptionLeft}>
                  <FolderInput size={18} color={gold[400]} />
                  <Text style={styles.albumOptionTitle}>{alb.title}</Text>
                </View>
              </Pressable>
            ))}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
