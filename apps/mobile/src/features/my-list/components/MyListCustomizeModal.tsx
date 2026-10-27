import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Dimensions,
  Platform,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  X,
  SlidersHorizontal,
  Flag,
  Tag as TagIcon,
  Calendar,
  MapPin,
  CheckSquare,
  AlignLeft,
  BarChart2,
  Shield,
  RotateCcw,
  LayoutList,
  LayoutGrid,
  AlignJustify,
} from 'lucide-react-native';
import { useTheme, gold } from '@bucketlist/ui';
import { AppSwitch } from '@/components/AppSwitch';
import {
  useMyListCustomizationStore,
  type ViewModeType,
  type TaskViewCustomization,
  type AlbumViewCustomization,
} from '@/stores/myListCustomization.store';

interface MyListCustomizeModalProps {
  visible: boolean;
  onClose: () => void;
  initialTab?: 'tasks' | 'albums';
  initialMode?: ViewModeType;
}

export function MyListCustomizeModal({
  visible,
  onClose,
  initialTab = 'tasks',
  initialMode = 'list',
}: MyListCustomizeModalProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();

  const [activeTab, setActiveTab] = useState<'tasks' | 'albums'>(initialTab);
  const [selectedMode, setSelectedMode] = useState<ViewModeType>(initialMode);

  const {
    taskViews,
    albumViews,
    setTaskOption,
    setAlbumOption,
    resetTaskOptions,
    resetAlbumOptions,
  } = useMyListCustomizationStore();

  // Keep state synced when opened with a specific tab or mode
  React.useEffect(() => {
    if (visible) {
      setActiveTab(initialTab);
      setSelectedMode(initialMode);
    }
  }, [visible, initialTab, initialMode]);

  if (!visible) return null;

  const currentTaskCustomization = taskViews[selectedMode] ?? taskViews.list;
  const currentAlbumCustomization = albumViews[selectedMode] ?? albumViews.list;

  const handleReset = () => {
    if (activeTab === 'tasks') {
      resetTaskOptions(selectedMode);
    } else {
      resetAlbumOptions(selectedMode);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: theme.dark ? '#181818' : '#FAF8F4',
              borderColor: theme.dark ? '#2B2B2B' : '#E8E2D6',
              paddingBottom: Math.max(insets.bottom, 20),
            },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
              <View
                style={[
                  styles.headerIconWrap,
                  { backgroundColor: theme.dark ? 'rgba(212,177,58,0.15)' : 'rgba(212,177,58,0.2)' },
                ]}
              >
                <SlidersHorizontal size={18} color={gold[400]} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.headerTitle, { color: theme.colors.foreground }]}>
                  {t('my_list.customize_view')}
                </Text>
                <Text style={[styles.headerSub, { color: theme.colors.foregroundMuted }]} numberOfLines={1}>
                  {t('my_list.customize_view_desc')}
                </Text>
              </View>
            </View>
            <Pressable
              onPress={onClose}
              hitSlop={10}
              style={[
                styles.closeBtn,
                { backgroundColor: theme.dark ? '#222222' : '#EDE8DF', borderColor: theme.colors.border },
              ]}
              accessibilityRole="button"
              accessibilityLabel={t('common.close')}
            >
              <X size={18} color={theme.colors.foregroundMuted} />
            </Pressable>
          </View>

          {/* Switcher Tareas / Álbumes */}
          <View
            style={[
              styles.entitySwitcher,
              { backgroundColor: theme.dark ? '#121212' : '#EDE8DF', borderColor: theme.colors.border },
            ]}
          >
            <Pressable
              onPress={() => setActiveTab('tasks')}
              style={[
                styles.entityBtn,
                activeTab === 'tasks' && [
                  styles.entityBtnActive,
                  { backgroundColor: theme.dark ? '#242424' : '#FFFFFF' },
                ],
              ]}
            >
              <Text
                style={[
                  styles.entityBtnText,
                  { color: activeTab === 'tasks' ? gold[400] : theme.colors.foregroundMuted },
                  activeTab === 'tasks' && styles.entityBtnTextActive,
                ]}
              >
                {t('my_list.customize_tasks')}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setActiveTab('albums')}
              style={[
                styles.entityBtn,
                activeTab === 'albums' && [
                  styles.entityBtnActive,
                  { backgroundColor: theme.dark ? '#242424' : '#FFFFFF' },
                ],
              ]}
            >
              <Text
                style={[
                  styles.entityBtnText,
                  { color: activeTab === 'albums' ? gold[400] : theme.colors.foregroundMuted },
                  activeTab === 'albums' && styles.entityBtnTextActive,
                ]}
              >
                {t('my_list.customize_albums')}
              </Text>
            </Pressable>
          </View>

          {/* Selector de modo de vista: Lista, Galería, Compacta */}
          <View style={styles.modeSection}>
            <Text style={[styles.modeSectionLabel, { color: theme.colors.foregroundMuted }]}>
              {t('my_list.customize_view_mode')}
            </Text>
            <View
              style={[
                styles.modeToggle,
                { backgroundColor: theme.dark ? '#121212' : '#EDE8DF', borderColor: theme.colors.border },
              ]}
            >
              <Pressable
                onPress={() => setSelectedMode('list')}
                style={[
                  styles.modeBtn,
                  selectedMode === 'list' && [
                    styles.modeBtnActive,
                    { backgroundColor: theme.dark ? '#242424' : '#FFFFFF' },
                  ],
                ]}
              >
                <LayoutList size={14} color={selectedMode === 'list' ? gold[400] : theme.colors.foregroundMuted} />
                <Text
                  style={[
                    styles.modeBtnText,
                    { color: selectedMode === 'list' ? theme.colors.foreground : theme.colors.foregroundMuted },
                    selectedMode === 'list' && styles.modeBtnTextActive,
                  ]}
                >
                  {t('my_list.customize_mode_list')}
                </Text>
              </Pressable>

              <Pressable
                onPress={() => setSelectedMode('gallery')}
                style={[
                  styles.modeBtn,
                  selectedMode === 'gallery' && [
                    styles.modeBtnActive,
                    { backgroundColor: theme.dark ? '#242424' : '#FFFFFF' },
                  ],
                ]}
              >
                <LayoutGrid size={14} color={selectedMode === 'gallery' ? gold[400] : theme.colors.foregroundMuted} />
                <Text
                  style={[
                    styles.modeBtnText,
                    { color: selectedMode === 'gallery' ? theme.colors.foreground : theme.colors.foregroundMuted },
                    selectedMode === 'gallery' && styles.modeBtnTextActive,
                  ]}
                >
                  {t('my_list.customize_mode_gallery')}
                </Text>
              </Pressable>

              <Pressable
                onPress={() => setSelectedMode('compact')}
                style={[
                  styles.modeBtn,
                  selectedMode === 'compact' && [
                    styles.modeBtnActive,
                    { backgroundColor: theme.dark ? '#242424' : '#FFFFFF' },
                  ],
                ]}
              >
                <AlignJustify size={14} color={selectedMode === 'compact' ? gold[400] : theme.colors.foregroundMuted} />
                <Text
                  style={[
                    styles.modeBtnText,
                    { color: selectedMode === 'compact' ? theme.colors.foreground : theme.colors.foregroundMuted },
                    selectedMode === 'compact' && styles.modeBtnTextActive,
                  ]}
                >
                  {t('my_list.customize_mode_compact')}
                </Text>
              </Pressable>
            </View>
          </View>

          {/* Opciones de personalización */}
          <ScrollView
            style={styles.optionsScroll}
            contentContainerStyle={styles.optionsContent}
            showsVerticalScrollIndicator={false}
          >
            {activeTab === 'tasks' ? (
              <>
                <CustomizeRow
                  icon={<Flag size={16} color={gold[400]} />}
                  title={t('my_list.customize_opt_priority')}
                  subtitle={t('my_list.customize_opt_priority_sub')}
                  value={currentTaskCustomization.showPriority}
                  onChange={(v) => setTaskOption(selectedMode, 'showPriority', v)}
                  theme={theme}
                />
                <CustomizeRow
                  icon={<TagIcon size={16} color={gold[400]} />}
                  title={t('my_list.customize_opt_tags')}
                  subtitle={t('my_list.customize_opt_tags_sub')}
                  value={currentTaskCustomization.showTags}
                  onChange={(v) => setTaskOption(selectedMode, 'showTags', v)}
                  theme={theme}
                />
                <CustomizeRow
                  icon={<Calendar size={16} color={gold[400]} />}
                  title={t('my_list.customize_opt_dates')}
                  subtitle={t('my_list.customize_opt_dates_sub')}
                  value={currentTaskCustomization.showDates}
                  onChange={(v) => setTaskOption(selectedMode, 'showDates', v)}
                  theme={theme}
                />
                <CustomizeRow
                  icon={<MapPin size={16} color={gold[400]} />}
                  title={t('my_list.customize_opt_cat_loc')}
                  subtitle={t('my_list.customize_opt_cat_loc_sub')}
                  value={currentTaskCustomization.showCategoryLocation}
                  onChange={(v) => setTaskOption(selectedMode, 'showCategoryLocation', v)}
                  theme={theme}
                />
                <CustomizeRow
                  icon={<CheckSquare size={16} color={gold[400]} />}
                  title={t('my_list.customize_opt_subtasks')}
                  subtitle={t('my_list.customize_opt_subtasks_sub')}
                  value={currentTaskCustomization.showSubtasksProgress}
                  onChange={(v) => setTaskOption(selectedMode, 'showSubtasksProgress', v)}
                  theme={theme}
                />
                <CustomizeRow
                  icon={<AlignLeft size={16} color={gold[400]} />}
                  title={t('my_list.customize_opt_desc')}
                  subtitle={t('my_list.customize_opt_desc_sub')}
                  value={currentTaskCustomization.showDescription}
                  onChange={(v) => setTaskOption(selectedMode, 'showDescription', v)}
                  theme={theme}
                  last
                />
              </>
            ) : (
              <>
                <CustomizeRow
                  icon={<Flag size={16} color={gold[400]} />}
                  title={t('my_list.customize_opt_album_priority')}
                  subtitle={t('my_list.customize_opt_album_priority_sub')}
                  value={currentAlbumCustomization.showPriority}
                  onChange={(v) => setAlbumOption(selectedMode, 'showPriority', v)}
                  theme={theme}
                />
                <CustomizeRow
                  icon={<CheckSquare size={16} color={gold[400]} />}
                  title={t('my_list.customize_opt_album_task_count')}
                  subtitle={t('my_list.customize_opt_album_task_count_sub')}
                  value={currentAlbumCustomization.showTaskCount}
                  onChange={(v) => setAlbumOption(selectedMode, 'showTaskCount', v)}
                  theme={theme}
                />
                <CustomizeRow
                  icon={<BarChart2 size={16} color={gold[400]} />}
                  title={t('my_list.customize_opt_album_progress')}
                  subtitle={t('my_list.customize_opt_album_progress_sub')}
                  value={currentAlbumCustomization.showProgress}
                  onChange={(v) => setAlbumOption(selectedMode, 'showProgress', v)}
                  theme={theme}
                />
                <CustomizeRow
                  icon={<Shield size={16} color={gold[400]} />}
                  title={t('my_list.customize_opt_album_badges')}
                  subtitle={t('my_list.customize_opt_album_badges_sub')}
                  value={currentAlbumCustomization.showBadges}
                  onChange={(v) => setAlbumOption(selectedMode, 'showBadges', v)}
                  theme={theme}
                />
                <CustomizeRow
                  icon={<Calendar size={16} color={gold[400]} />}
                  title={t('my_list.customize_opt_album_date')}
                  subtitle={t('my_list.customize_opt_album_date_sub')}
                  value={currentAlbumCustomization.showDate}
                  onChange={(v) => setAlbumOption(selectedMode, 'showDate', v)}
                  theme={theme}
                />
                <CustomizeRow
                  icon={<AlignLeft size={16} color={gold[400]} />}
                  title={t('my_list.customize_opt_album_desc')}
                  subtitle={t('my_list.customize_opt_album_desc_sub')}
                  value={currentAlbumCustomization.showDescription}
                  onChange={(v) => setAlbumOption(selectedMode, 'showDescription', v)}
                  theme={theme}
                  last
                />
              </>
            )}
          </ScrollView>

          {/* Footer con restablecer y listo */}
          <View style={[styles.footer, { borderTopColor: theme.colors.border }]}>
            <Pressable
              onPress={handleReset}
              hitSlop={8}
              style={[
                styles.resetBtn,
                { borderColor: theme.colors.border, backgroundColor: theme.colors.surface },
              ]}
              accessibilityRole="button"
              accessibilityLabel={t('my_list.customize_default')}
            >
              <RotateCcw size={14} color={theme.colors.foregroundMuted} />
              <Text style={[styles.resetBtnText, { color: theme.colors.foregroundMuted }]}>
                {t('my_list.customize_default')}
              </Text>
            </Pressable>

            <Pressable
              onPress={onClose}
              style={[styles.doneBtn, { backgroundColor: gold[400] }]}
              accessibilityRole="button"
              accessibilityLabel={t('my_list.customize_done')}
            >
              <Text style={styles.doneBtnText}>{t('my_list.customize_done')}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function CustomizeRow({
  icon,
  title,
  subtitle,
  value,
  onChange,
  theme,
  last = false,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  value: boolean;
  onChange: (v: boolean) => void;
  theme: any;
  last?: boolean;
}) {
  return (
    <View
      style={[
        styles.row,
        !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.border },
      ]}
    >
      <View
        style={[
          styles.rowIconBox,
          {
            backgroundColor: theme.dark ? '#222222' : '#EDE8DE',
            borderColor: theme.dark ? '#333333' : '#DDD7CB',
          },
        ]}
      >
        {icon}
      </View>
      <View style={styles.rowTexts}>
        <Text style={[styles.rowTitle, { color: theme.colors.foreground }]}>{title}</Text>
        <Text style={[styles.rowSubtitle, { color: theme.colors.foregroundMuted }]}>{subtitle}</Text>
      </View>
      <AppSwitch
        value={value}
        onValueChange={onChange}
        trackColor={{
          false: theme.dark ? '#333333' : '#D5CFC3',
          true: gold[400],
        }}
        thumbColor={value ? '#FFFFFF' : '#9E9E9E'}
        accessibilityLabel={title}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
    ...Platform.select({
      web: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      },
    }),
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    maxHeight: Dimensions.get('window').height * 0.88,
    paddingTop: 16,
    ...Platform.select({
      web: {
        width: '100%',
        maxWidth: 480,
        borderRadius: 24,
        borderBottomWidth: 1,
        maxHeight: '90vh' as any,
      },
    }),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  headerIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
  },
  headerSub: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    marginTop: 1,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  entitySwitcher: {
    flexDirection: 'row',
    marginHorizontal: 16,
    padding: 3,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  entityBtn: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9,
  },
  entityBtnActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  entityBtnText: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
  },
  entityBtnTextActive: {
    fontWeight: '700',
  },
  modeSection: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  modeSectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
    fontFamily: 'Inter_600SemiBold',
  },
  modeToggle: {
    flexDirection: 'row',
    padding: 3,
    borderRadius: 10,
    borderWidth: 1,
    gap: 4,
  },
  modeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 6,
    borderRadius: 8,
  },
  modeBtnActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  modeBtnText: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
  },
  modeBtnTextActive: {
    fontWeight: '700',
  },
  optionsScroll: {
    maxHeight: Dimensions.get('window').height * 0.45,
  },
  optionsContent: {
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  rowIconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTexts: {
    flex: 1,
  },
  rowTitle: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
  },
  rowSubtitle: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    marginTop: 2,
    lineHeight: 16,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    gap: 12,
  },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  resetBtnText: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
  },
  doneBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    borderRadius: 12,
  },
  doneBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0E0E0E',
    fontFamily: 'Inter_700Bold',
  },
});
