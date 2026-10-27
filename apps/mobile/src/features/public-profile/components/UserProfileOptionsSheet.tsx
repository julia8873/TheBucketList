import { themedStyleSheet } from '@bucketlist/ui';
import React from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  StyleSheet,
  Platform,
} from 'react-native';
import {
  UserX,
  UserCheck,
  Flag,
  X,
} from 'lucide-react-native';
import { Avatar, fontFamily } from '@bucketlist/ui';

import { useTranslation } from '@bucketlist/shared';

interface UserProfileOptionsSheetProps {
  visible: boolean;
  onClose: () => void;
  user: {
    id: string;
    username: string;
    display_name?: string | null;
    avatar_url?: string | null;
  };
  isBlocked?: boolean;
  onConfirmBlock: () => void;
  onConfirmUnblock: () => void;
  onOpenReport: () => void;
}

export function UserProfileOptionsSheet({
  visible,
  onClose,
  user,
  isBlocked = false,
  onConfirmBlock,
  onConfirmUnblock,
  onOpenReport,
}: UserProfileOptionsSheetProps) {
  const { t } = useTranslation();

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.sheetContainer}>
          {/* Handle */}
          <View style={styles.handle} />

          {/* Header con información del usuario */}
          <View style={styles.header}>
            <Avatar
              source={user.avatar_url ? { uri: user.avatar_url } : undefined}
              fallback={user.display_name?.charAt(0) || user.username.charAt(0)}
              size="md"
            />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.displayName} numberOfLines={1}>
                {user.display_name || user.username}
              </Text>
              <Text style={styles.username} numberOfLines={1}>
                @{user.username}
              </Text>
            </View>
            <Pressable style={styles.closeBtn} onPress={onClose} hitSlop={8}>
              <X color="#8F8F8F" size={20} />
            </Pressable>
          </View>

          <View style={styles.divider} />

          {/* Opciones */}
          <View style={styles.optionsList}>
            {/* Bloquear / Desbloquear */}
            <Pressable
              style={styles.optionRow}
              onPress={() => {
                onClose();
                if (isBlocked) onConfirmUnblock();
                else onConfirmBlock();
              }}
            >
              <View
                style={[
                  styles.iconBox,
                  {
                    backgroundColor: isBlocked
                      ? 'rgba(16, 185, 129, 0.12)'
                      : 'rgba(239, 68, 68, 0.12)',
                  },
                ]}
              >
                {isBlocked ? (
                  <UserCheck color="#10B981" size={20} />
                ) : (
                  <UserX color="#EF4444" size={20} />
                )}
              </View>
              <View style={styles.optionTexts}>
                <Text
                  style={[
                    styles.optionTitle,
                    { color: isBlocked ? '#10B981' : '#EF4444' },
                  ]}
                >
                  {isBlocked ? t('profile.unblock_user') : t('profile.block_username', { username: user.username })}
                </Text>
                <Text style={styles.optionSubtitle}>
                  {isBlocked
                    ? t('profile.unblock_desc')
                    : t('profile.block_desc')}
                </Text>
              </View>
            </Pressable>

            {/* Reportar usuario */}
            <Pressable
              style={[styles.optionRow, { borderBottomWidth: 0 }]}
              onPress={() => {
                onClose();
                onOpenReport();
              }}
            >
              <View
                style={[
                  styles.iconBox,
                  { backgroundColor: 'rgba(239, 68, 68, 0.12)' },
                ]}
              >
                <Flag color="#EF4444" size={20} />
              </View>
              <View style={styles.optionTexts}>
                <Text style={[styles.optionTitle, { color: '#EF4444' }]}>
                  {t('profile.report_user')}
                </Text>
                <Text style={styles.optionSubtitle}>
                  {t('profile.report_user_desc')}
                </Text>
              </View>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = themedStyleSheet({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
    ...Platform.select({
      web: {
        alignItems: 'center',
      },
    }),
  },
  sheetContainer: {
    backgroundColor: '#141414',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: '#262626',
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    width: '100%',
    ...Platform.select({
      web: {
        maxWidth: 620,
        alignSelf: 'center',
        borderLeftWidth: 1,
        borderRightWidth: 1,
      },
    }),
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#333',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  displayName: {
    color: '#F3EEE3',
    fontSize: 16,
    fontFamily: fontFamily.semibold,
  },
  username: {
    color: '#8F8F8F',
    fontSize: 13,
    marginTop: 2,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#1F1F1F',
    justifyContent: 'center',
    alignItems: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: '#202020',
    marginVertical: 8,
  },
  optionsList: {
    paddingHorizontal: 16,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1A1A1A',
  },
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#1E1E1E',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  optionTexts: {
    flex: 1,
  },
  optionTitle: {
    color: '#F3EEE3',
    fontSize: 15,
    fontFamily: fontFamily.medium,
  },
  optionSubtitle: {
    color: '#777',
    fontSize: 12,
    marginTop: 3,
    lineHeight: 16,
  },
});
