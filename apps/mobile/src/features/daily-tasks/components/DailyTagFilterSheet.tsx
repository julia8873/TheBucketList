import React from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { Tag as TagIcon, Plus, Check, Pencil } from 'lucide-react-native';
import { useTheme } from '@bucketlist/ui';
import { gold } from '@bucketlist/ui/src/tokens/colors';
import { useTranslation } from '@bucketlist/shared';
import { TagSheetShell } from '@/components/TagSheetShell';
import { styles } from '../styles/explore.styles';
import type { DailyTag, DailyTask } from '../types';

interface DailyTagFilterSheetProps {
  visible: boolean;
  onClose: () => void;
  userTags: DailyTag[];
  selectedTagFilters: string[];
  setSelectedTagFilters: React.Dispatch<React.SetStateAction<string[]>>;
  tasks: DailyTask[];
  openCreateTag: () => void;
  openEditTag: (tag: DailyTag) => void;
  renderTagModal?: React.ReactNode;
}

export const DailyTagFilterSheet: React.FC<DailyTagFilterSheetProps> = ({
  visible,
  onClose,
  userTags,
  selectedTagFilters,
  setSelectedTagFilters,
  tasks,
  openCreateTag,
  openEditTag,
  renderTagModal,
}) => {
  const { theme } = useTheme();
  const { t } = useTranslation();
  if (!visible) return null;

  return (
    <TagSheetShell visible={visible} onClose={onClose}>
      <View style={{ flexShrink: 1, paddingBottom: 16 }}>
        {/* Header */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 16,
            paddingBottom: 10,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <TagIcon size={18} color={gold[400]} />
            <Text style={{ color: theme.colors.foreground, fontSize: 15, fontFamily: 'Inter_700Bold' }}>
              {t('tags.filter_by_tags', { defaultValue: 'Filtrar por etiquetas' })}
            </Text>
            {selectedTagFilters.length > 0 && (
              <View style={styles.sheetCountBadge}>
                <Text style={styles.sheetCountBadgeText}>{selectedTagFilters.length}</Text>
              </View>
            )}
          </View>

          <Pressable
            style={[
              styles.sheetCreatePill,
              {
                backgroundColor: theme.dark ? '#231E10' : '#FDF6E2',
                borderColor: theme.dark ? '#423712' : '#F3DE9A',
              },
            ]}
            onPress={openCreateTag}
          >
            <Plus size={13} color={gold[400]} strokeWidth={2.4} />
            <Text style={styles.sheetCreatePillText}>{t('tags.create_tag', { defaultValue: 'Crear etiqueta' })}</Text>
          </Pressable>
        </View>

        {/* Quick actions: Todas (sin filtrar) */}
        <View style={[styles.sheetQuickActions, { paddingHorizontal: 16, marginBottom: 8 }]}>
          <Pressable
            style={[
              styles.sheetActionPill,
              { backgroundColor: theme.colors.surfaceElevated ?? theme.colors.surface, borderColor: theme.colors.border },
              selectedTagFilters.length === 0 && {
                backgroundColor: theme.dark ? '#2A2210' : '#FDF4DC',
                borderColor: gold[400],
              },
            ]}
            onPress={() => setSelectedTagFilters([])}
          >
            <Text
              style={[
                styles.sheetActionPillText,
                { color: theme.colors.foregroundMuted },
                selectedTagFilters.length === 0 && styles.sheetActionPillTextActive,
              ]}
            >
              {t('tags.all_unfiltered', { defaultValue: 'Todas (sin filtrar)' })}
            </Text>
          </Pressable>
        </View>

        {/* Tags list */}
        <ScrollView style={[styles.sheetTagsList, { maxHeight: 360, paddingHorizontal: 16 }]} showsVerticalScrollIndicator={false}>
          {userTags.length === 0 ? (
            <View style={styles.sheetEmptyTags}>
              <Text style={[styles.sheetEmptyTagsText, { color: theme.colors.foregroundMuted }]}>
                {t('tags.empty_tags', { defaultValue: 'No tienes etiquetas creadas' })}
              </Text>
              <Pressable
                style={styles.sheetCreateFirstBtn}
                onPress={openCreateTag}
              >
                <Plus size={14} color="#FFFFFF" strokeWidth={2.4} />
                <Text style={styles.sheetCreateFirstBtnText}>{t('tags.create_first_tag', { defaultValue: 'Crear primera etiqueta' })}</Text>
              </Pressable>
            </View>
          ) : (
            userTags.map((tag) => {
              const isSelected = selectedTagFilters.includes(tag.id);
              const taskCount = tasks.filter((t) => t.tag_ids?.includes(tag.id)).length;

              return (
                <View key={tag.id} style={[styles.sheetTagRow, { borderBottomColor: theme.colors.border }]}>
                  {/* Checkable selection box */}
                  <Pressable
                    style={styles.sheetTagCheckArea}
                    onPress={() => {
                      setSelectedTagFilters((prev) =>
                        isSelected ? prev.filter((id) => id !== tag.id) : [...prev, tag.id]
                      );
                    }}
                  >
                    <View
                      style={[
                        styles.sheetCheckbox,
                        { borderColor: theme.colors.border, backgroundColor: theme.colors.surfaceElevated ?? theme.colors.surface },
                        isSelected && {
                          backgroundColor: tag.color || gold[400],
                          borderColor: tag.color || gold[400],
                        },
                      ]}
                    >
                      {isSelected && <Check size={13} color="#FFFFFF" strokeWidth={3} />}
                    </View>

                    <View
                      style={[
                        styles.sheetTagBadge,
                        {
                          backgroundColor: tag.color
                            ? (theme.dark ? `${tag.color}22` : `${tag.color}15`)
                            : (theme.dark ? '#1E1E1E' : '#F3EFE6'),
                          borderColor: tag.color ? `${tag.color}66` : theme.colors.border,
                        },
                      ]}
                    >
                      {tag.emoji && <Text style={{ fontSize: 13, marginRight: 4 }}>{tag.emoji}</Text>}
                      <Text
                        style={[
                          styles.sheetTagBadgeText,
                          { color: tag.color || theme.colors.foreground },
                        ]}
                      >
                        {tag.name}
                      </Text>
                    </View>

                    <Text style={[styles.sheetTaskCountText, { color: theme.colors.foregroundMuted }]}>
                      {taskCount} {taskCount === 1 ? t('albums.task_single', { defaultValue: 'tarea' }) : t('albums.task_plural', { defaultValue: 'tareas' })}
                    </Text>
                  </Pressable>

                  {/* Edit Button */}
                  <Pressable
                    style={[
                      styles.sheetTagEditBtn,
                      {
                        backgroundColor: theme.colors.surfaceElevated ?? (theme.dark ? '#202020' : '#ECE7DC'),
                        borderWidth: 1,
                        borderColor: theme.colors.border,
                      },
                    ]}
                    onPress={() => openEditTag(tag)}
                    hitSlop={8}
                    accessibilityLabel={`${t('tags.edit_tag', { defaultValue: 'Editar etiqueta' })} ${tag.name}`}
                  >
                    <Pencil size={15} color={theme.colors.foregroundMuted} />
                  </Pressable>
                </View>
              );
            })
          )}
        </ScrollView>

        {/* Bottom Apply Button */}
        <View style={{ paddingHorizontal: 16, paddingTop: 10 }}>
          <Pressable
            style={({ pressed }) => ({
              height: 46,
              borderRadius: 14,
              backgroundColor: theme.colors.primary,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: pressed ? 0.85 : 1,
            })}
            onPress={onClose}
          >
            <Text style={{ color: theme.colors.primaryForeground, fontSize: 14, fontFamily: 'Inter_700Bold' }}>
              {selectedTagFilters.length === 0
                ? t('tags.show_all_tasks', { defaultValue: 'Ver todas las tareas' })
                : selectedTagFilters.length === 1
                ? t('tags.apply_filter_single', { defaultValue: 'Aplicar filtro (1 etiqueta)' })
                : t('tags.apply_filter', { count: selectedTagFilters.length, defaultValue: `Aplicar filtros (${selectedTagFilters.length})` })}
            </Text>
          </Pressable>
        </View>

        {/* Nested Tag Form Modal when editing/creating from sheet */}
        {renderTagModal}
      </View>
    </TagSheetShell>
  );
};
