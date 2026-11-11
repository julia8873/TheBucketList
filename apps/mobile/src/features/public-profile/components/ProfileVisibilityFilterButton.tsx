import { themedStyleSheet } from '@bucketlist/ui';
import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  Pressable,
  Modal,
  StyleSheet,
  Platform,
} from 'react-native';
import { useTranslation } from '@bucketlist/shared';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Globe, Users, ChevronDown, Check, Eye } from 'lucide-react-native';
import { useTheme, fontFamily, VISIBILITY_COLORS } from '@bucketlist/ui';

export type VisibilityMode = 'all' | 'public' | 'followers';

interface ProfileVisibilityFilterButtonProps {
  showPublic: boolean;
  showFollowers: boolean;
  onChangeVisibility: (showPublic: boolean, showFollowers: boolean) => void;
  targetType?: 'tasks' | 'albums';
}

export function ProfileVisibilityFilterButton({
  showPublic,
  showFollowers,
  onChangeVisibility,
  targetType = 'tasks',
}: ProfileVisibilityFilterButtonProps) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [modalVisible, setModalVisible] = useState(false);

  const currentMode: VisibilityMode = useMemo(() => {
    if (showPublic && showFollowers) return 'all';
    if (showPublic && !showFollowers) return 'public';
    return 'followers';
  }, [showPublic, showFollowers]);

  const isFiltered = currentMode !== 'all';

  const isAlbums = targetType === 'albums';

  const options = useMemo(
    () => [
      {
        key: 'all' as VisibilityMode,
        label: isAlbums
          ? t('profile.filter_vis_all_albums', { defaultValue: 'Públicos y seguidores' })
          : t('profile.filter_vis_all_tasks', { defaultValue: 'Públicas y seguidores' }),
        description: isAlbums
          ? t('profile.filter_vis_all_albums_desc', { defaultValue: 'Mostrar álbumes públicos y para seguidores' })
          : t('profile.filter_vis_all_tasks_desc', { defaultValue: 'Mostrar tareas públicas y para seguidores' }),
        icon: Eye,
      },
      {
        key: 'public' as VisibilityMode,
        label: isAlbums
          ? t('profile.filter_vis_only_public_albums', { defaultValue: 'Solo públicos' })
          : t('profile.filter_vis_only_public_tasks', { defaultValue: 'Solo públicas' }),
        description: isAlbums
          ? t('profile.filter_vis_only_public_albums_desc', { defaultValue: 'Álbumes visibles para cualquier usuario' })
          : t('profile.filter_vis_only_public_tasks_desc', { defaultValue: 'Tareas visibles para cualquier usuario' }),
        icon: Globe,
      },
      {
        key: 'followers' as VisibilityMode,
        label: t('profile.filter_vis_only_followers', { defaultValue: 'Solo seguidores' }),
        description: isAlbums
          ? t('profile.filter_vis_only_followers_albums_desc', { defaultValue: 'Álbumes visibles solo para tus seguidores' })
          : t('profile.filter_vis_only_followers_tasks_desc', { defaultValue: 'Tareas visibles solo para tus seguidores' }),
        icon: Users,
      },
    ],
    [t, isAlbums]
  );

  const buttonLabel = useMemo(() => {
    if (currentMode === 'public') {
      return isAlbums
        ? t('profile.filter_visibility_albums_public', { defaultValue: 'Públicos' })
        : t('profile.filter_visibility_public', { defaultValue: 'Públicas' });
    }
    if (currentMode === 'followers') {
      return t('profile.filter_visibility_followers', { defaultValue: 'Seguidores' });
    }
    return t('profile.filter_visibility_title', { defaultValue: 'Visibilidad' });
  }, [currentMode, isAlbums, t]);

  const ButtonIcon = currentMode === 'followers' ? Users : Globe;

  const handleSelect = (mode: VisibilityMode) => {
    if (mode === 'all') {
      onChangeVisibility(true, true);
    } else if (mode === 'public') {
      onChangeVisibility(true, false);
    } else {
      onChangeVisibility(false, true);
    }
    setModalVisible(false);
  };

  const activeFilterColor =
    currentMode === 'public'
      ? VISIBILITY_COLORS.public
      : currentMode === 'followers'
      ? VISIBILITY_COLORS.followers
      : theme.colors.primary;

  return (
    <>
      <Pressable
        onPress={() => setModalVisible(true)}
        style={[
          styles.filterButton,
          {
            backgroundColor: isFiltered
              ? `${activeFilterColor}20`
              : theme.dark
              ? '#1B1B1B'
              : '#EAE5DB',
            borderColor: isFiltered
              ? activeFilterColor
              : theme.dark
              ? '#2B2B2B'
              : '#D9D3C7',
          },
        ]}
        accessibilityRole="button"
        accessibilityLabel={buttonLabel}
      >
        <ButtonIcon
          size={14}
          color={isFiltered ? activeFilterColor : theme.colors.foreground}
          strokeWidth={2}
        />
        <Text
          style={[
            styles.filterButtonText,
            {
              color: isFiltered ? activeFilterColor : theme.colors.foreground,
              fontFamily: isFiltered ? fontFamily.semibold : fontFamily.medium,
            },
          ]}
        >
          {buttonLabel}
        </Text>
        <ChevronDown
          size={14}
          color={isFiltered ? activeFilterColor : theme.colors.foregroundMuted}
          strokeWidth={2}
        />
      </Pressable>

      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setModalVisible(false)}
            accessibilityLabel={t('common.close', { defaultValue: 'Cerrar' })}
          />
          <View
            style={[
              styles.bottomSheet,
              {
                backgroundColor: theme.dark ? '#161616' : '#FFFFFF',
                borderColor: theme.dark ? '#282828' : '#E5E0D5',
                paddingBottom: Math.max(insets.bottom, 16) + 12,
              },
            ]}
          >
            {/* Handle */}
            <View
              style={[
                styles.dragHandle,
                { backgroundColor: theme.dark ? '#3A3A3A' : '#D0C9BD' },
              ]}
            />

            {/* Header */}
            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, { color: theme.colors.foreground }]}>
                {t('profile.filter_visibility_title', { defaultValue: 'Visibilidad' })}
              </Text>
            </View>

            {/* Options */}
            <View style={styles.optionsContainer}>
              {options.map((option) => {
                const isSelected = option.key === currentMode;
                const IconComp = option.icon;
                const optColor =
                  option.key === 'public'
                    ? VISIBILITY_COLORS.public
                    : option.key === 'followers'
                    ? VISIBILITY_COLORS.followers
                    : theme.colors.primary;
                return (
                  <Pressable
                    key={option.key}
                    onPress={() => handleSelect(option.key)}
                    style={({ pressed }) => [
                      styles.optionRow,
                      {
                        backgroundColor: isSelected
                          ? theme.dark
                            ? `${optColor}15`
                            : `${optColor}10`
                          : pressed
                          ? theme.dark
                            ? '#202020'
                            : '#F5F0E6'
                          : 'transparent',
                        borderColor: isSelected
                          ? theme.dark
                            ? `${optColor}40`
                            : `${optColor}35`
                          : 'transparent',
                      },
                    ]}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                  >
                    <View
                      style={[
                        styles.iconWrap,
                        {
                          backgroundColor: isSelected
                            ? `${optColor}25`
                            : theme.dark
                            ? '#222222'
                            : '#EDE8DF',
                        },
                      ]}
                    >
                      <IconComp
                        size={17}
                        color={isSelected ? optColor : theme.colors.foregroundMuted}
                        strokeWidth={2}
                      />
                    </View>

                    <View style={{ flex: 1, gap: 2 }}>
                      <Text
                        style={[
                          styles.optionLabel,
                          {
                            color: isSelected
                              ? optColor
                              : theme.colors.foreground,
                            fontFamily: isSelected
                              ? fontFamily.bold
                              : fontFamily.medium,
                          },
                        ]}
                      >
                        {option.label}
                      </Text>
                      <Text
                        style={[
                          styles.optionDescription,
                          { color: theme.colors.foregroundMuted },
                        ]}
                      >
                        {option.description}
                      </Text>
                    </View>

                    {isSelected && (
                      <Check
                        size={18}
                        color={optColor}
                        strokeWidth={2.5}
                      />
                    )}
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = themedStyleSheet({
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 14,
    borderWidth: 1,
  },
  filterButtonText: {
    fontFamily: fontFamily.medium,
    fontSize: 12,
    letterSpacing: 0.2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
    ...Platform.select({
      web: {
        backdropFilter: 'blur(2px)',
      } as any,
    }),
  },
  bottomSheet: {
    width: '100%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    paddingHorizontal: 12,
    paddingTop: 10,
    ...Platform.select({
      web: {
        maxWidth: 620,
        alignSelf: 'center',
        borderLeftWidth: 1,
        borderRightWidth: 1,
      },
    }),
  },
  dragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 14,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  sheetTitle: {
    fontFamily: fontFamily.serifBold,
    fontSize: 18,
    letterSpacing: -0.2,
    textAlign: 'center',
  },
  optionsContainer: {
    gap: 8,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionLabel: {
    fontSize: 15,
  },
  optionDescription: {
    fontFamily: fontFamily.regular,
    fontSize: 12,
  },
});

