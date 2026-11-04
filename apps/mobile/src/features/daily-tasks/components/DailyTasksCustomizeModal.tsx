import React from 'react';
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
  SlidersHorizontal,
  Flag,
  Tag as TagIcon,
  Calendar,
  CheckSquare,
  RotateCw,
  AlignLeft,
  RotateCcw,
} from 'lucide-react-native';
import { useTheme, gold } from '@bucketlist/ui';
import { AppSwitch } from '@/components/AppSwitch';
import {
  useDailyTasksCustomizationStore,
  type DailyTaskCustomization,
} from '@/stores/dailyTasksCustomization.store';

interface DailyTasksCustomizeModalProps {
  visible: boolean;
  onClose: () => void;
}

export function DailyTasksCustomizeModal({
  visible,
  onClose,
}: DailyTasksCustomizeModalProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();

  const {
    customization,
    setOption,
    resetOptions,
  } = useDailyTasksCustomizationStore();

  if (!visible) return null;

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
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
              <View
                style={[
                  styles.headerIconWrap,
                  { backgroundColor: theme.dark ? 'rgba(212,177,58,0.15)' : 'rgba(212,177,58,0.2)' },
                ]}
              >
                <SlidersHorizontal size={18} color={gold[400]} />
              </View>
              <View style={{ flexShrink: 1, alignItems: 'center' }}>
                <Text style={[styles.headerTitle, { color: theme.colors.foreground, textAlign: 'center' }]}>
                  {t('daily.customize_view')}
                </Text>
                <Text style={[styles.headerSub, { color: theme.colors.foregroundMuted, textAlign: 'center' }]} numberOfLines={1}>
                  {t('daily.customize_view_desc')}
                </Text>
              </View>
            </View>
          </View>

          {/* Opciones de personalización */}
          <ScrollView
            style={styles.optionsScroll}
            contentContainerStyle={styles.optionsContent}
            showsVerticalScrollIndicator={false}
          >
            <CustomizeRow
              icon={<Flag size={16} color={gold[400]} />}
              title={t('daily.customize_opt_priority')}
              subtitle={t('daily.customize_opt_priority_sub')}
              value={customization.showPriority}
              onChange={(v) => setOption('showPriority', v)}
              theme={theme}
            />
            <CustomizeRow
              icon={<TagIcon size={16} color={gold[400]} />}
              title={t('daily.customize_opt_tags')}
              subtitle={t('daily.customize_opt_tags_sub')}
              value={customization.showTags}
              onChange={(v) => setOption('showTags', v)}
              theme={theme}
            />
            <CustomizeRow
              icon={<Calendar size={16} color={gold[400]} />}
              title={t('daily.customize_opt_dates')}
              subtitle={t('daily.customize_opt_dates_sub')}
              value={customization.showDates}
              onChange={(v) => setOption('showDates', v)}
              theme={theme}
            />
            <CustomizeRow
              icon={<CheckSquare size={16} color={gold[400]} />}
              title={t('daily.customize_opt_subtasks')}
              subtitle={t('daily.customize_opt_subtasks_sub')}
              value={customization.showSubtasksProgress}
              onChange={(v) => setOption('showSubtasksProgress', v)}
              theme={theme}
            />
            <CustomizeRow
              icon={<RotateCw size={16} color={gold[400]} />}
              title={t('daily.customize_opt_recurrence')}
              subtitle={t('daily.customize_opt_recurrence_sub')}
              value={customization.showRecurrence}
              onChange={(v) => setOption('showRecurrence', v)}
              theme={theme}
            />
            <CustomizeRow
              icon={<AlignLeft size={16} color={gold[400]} />}
              title={t('daily.customize_opt_desc')}
              subtitle={t('daily.customize_opt_desc_sub')}
              value={customization.showDescription}
              onChange={(v) => setOption('showDescription', v)}
              theme={theme}
              last
            />
          </ScrollView>

          {/* Footer con restablecer y listo */}
          <View style={[styles.footer, { borderTopColor: theme.colors.border }]}>
            <Pressable
              onPress={resetOptions}
              hitSlop={8}
              style={[
                styles.resetBtn,
                { borderColor: theme.colors.border, backgroundColor: theme.colors.surface },
              ]}
              accessibilityRole="button"
              accessibilityLabel={t('daily.customize_default')}
            >
              <RotateCcw size={14} color={theme.colors.foregroundMuted} />
              <Text style={[styles.resetBtnText, { color: theme.colors.foregroundMuted }]}>
                {t('daily.customize_default')}
              </Text>
            </Pressable>

            <Pressable
              onPress={onClose}
              style={[styles.doneBtn, { backgroundColor: gold[400] }]}
              accessibilityRole="button"
              accessibilityLabel={t('daily.customize_done')}
            >
              <Text style={styles.doneBtnText}>{t('daily.customize_done')}</Text>
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
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  headerIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: -0.2,
  },
  headerSub: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  optionsScroll: {
    maxHeight: Dimensions.get('window').height * 0.55,
  },
  optionsContent: {
    paddingHorizontal: 12,
    paddingTop: 4,
    paddingBottom: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 12,
  },
  rowIconBox: {
    width: 34,
    height: 34,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  rowTexts: {
    flex: 1,
    gap: 2,
  },
  rowTitle: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
  },
  rowSubtitle: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    lineHeight: 16,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
  },
  resetBtnText: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
  },
  doneBtn: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneBtnText: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: '#000000',
  },
});
