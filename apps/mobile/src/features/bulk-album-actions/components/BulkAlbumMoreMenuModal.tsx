import React from 'react';
import { View, Text, Pressable, Modal, ScrollView } from 'react-native';
import { BellOff, Flag, Lock, Star, Check, Trash2, FolderArchive } from 'lucide-react-native';
import { gold } from '@bucketlist/ui/src/tokens/colors';
import { styles } from '../../bulk-task-actions/styles/bulk-actions.styles';
import { useTranslation } from '@bucketlist/shared';

interface BulkAlbumMoreMenuModalProps {
  visible: boolean;
  count: number;
  onClose: () => void;
  onClearNotifications: () => void;
  onChangePriority: () => void;
  onChangeVisibility: () => void;
  onAddFavorites: () => void;
  onReopenTasks: () => void;
  onCloseAlbums: () => void;
  onReopenAlbums: () => void;
  onDeleteAll: () => void;
}

export function BulkAlbumMoreMenuModal({
  visible,
  count,
  onClose,
  onClearNotifications,
  onChangePriority,
  onChangeVisibility,
  onAddFavorites,
  onReopenTasks,
  onCloseAlbums,
  onReopenAlbums,
  onDeleteAll,
}: BulkAlbumMoreMenuModalProps) {
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
            <Text style={styles.modalTitle}>{t('bulk_album_actions.options_title', { count })}</Text>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
            {/* Vaciar notificaciones */}
            <Pressable style={styles.menuItem} onPress={onClearNotifications}>
              <BellOff size={18} color="#E0A343" />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.menuItemTitle}>{t('bulk_album_actions.clear_notifications')}</Text>
                <Text style={styles.menuItemSubtitle}>
                  {t('bulk_album_actions.clear_notifications_desc')}
                </Text>
              </View>
            </Pressable>

            {/* Cambiar prioridad */}
            <Pressable style={styles.menuItem} onPress={onChangePriority}>
              <Flag size={18} color={gold[400]} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.menuItemTitle}>{t('bulk_album_actions.change_priority')}</Text>
                <Text style={styles.menuItemSubtitle}>{t('bulk_album_actions.change_priority_desc')}</Text>
              </View>
            </Pressable>

            {/* Cambiar visibilidad */}
            <Pressable style={styles.menuItem} onPress={onChangeVisibility}>
              <Lock size={18} color={gold[400]} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.menuItemTitle}>{t('bulk_album_actions.change_visibility')}</Text>
                <Text style={styles.menuItemSubtitle}>{t('bulk_album_actions.change_visibility_desc')}</Text>
              </View>
            </Pressable>

            {/* Añadir a Favoritos */}
            <Pressable style={styles.menuItem} onPress={onAddFavorites}>
              <Star size={18} color={gold[400]} fill={gold[400]} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.menuItemTitle}>{t('bulk_album_actions.add_favorites')}</Text>
                <Text style={styles.menuItemSubtitle}>{t('bulk_album_actions.add_favorites_desc')}</Text>
              </View>
            </Pressable>

            {/* Reabrir tareas de los álbumes */}
            <Pressable style={styles.menuItem} onPress={onReopenTasks}>
              <Check size={18} color="#AAA" />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.menuItemTitle}>{t('bulk_album_actions.reopen_tasks')}</Text>
                <Text style={styles.menuItemSubtitle}>{t('bulk_album_actions.reopen_tasks_desc')}</Text>
              </View>
            </Pressable>

            {/* Cerrar álbumes */}
            <Pressable style={styles.menuItem} onPress={onCloseAlbums}>
              <FolderArchive size={18} color="#AAA" />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.menuItemTitle}>{t('bulk_album_actions.close_albums')}</Text>
                <Text style={styles.menuItemSubtitle}>{t('bulk_album_actions.close_albums_desc')}</Text>
              </View>
            </Pressable>

            {/* Reabrir álbumes */}
            <Pressable style={styles.menuItem} onPress={onReopenAlbums}>
              <FolderArchive size={18} color={gold[400]} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.menuItemTitle}>{t('bulk_album_actions.reopen_albums')}</Text>
                <Text style={styles.menuItemSubtitle}>{t('bulk_album_actions.reopen_albums_desc')}</Text>
              </View>
            </Pressable>

            {/* Borrar todos */}
            <Pressable style={[styles.menuItem, styles.menuItemDelete]} onPress={onDeleteAll}>
              <Trash2 size={18} color="#FF453A" />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[styles.menuItemTitle, { color: '#FF453A' }]}>
                  {t('bulk_album_actions.delete_all', { count })}
                </Text>
                <Text style={styles.menuItemSubtitle}>
                  {t('bulk_album_actions.delete_all_desc')}
                </Text>
              </View>
            </Pressable>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
