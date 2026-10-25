import React from 'react';
import { View, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Typography } from '@bucketlist/ui';
import { useTranslation } from '@bucketlist/shared';
import { gold } from '@bucketlist/ui/src/tokens/colors';
import { MapPin, CheckCircle2, Calendar, X, Map, HardDrive, ExternalLink, HelpCircle } from 'lucide-react-native';
import { format } from 'date-fns';
import { getDateFnsLocale } from '@/utils/dateLocale';
import { styles } from '../styles/bucket-detail.styles';

interface BucketMetaSectionProps {
  bucket: any;
  canEdit: boolean;
  theme: any;
  onOpenLocationModal: () => void;
  onRemoveLocation: () => void;
  onOpenDatePicker: (config: { visible: boolean; type: 'deadline' | 'completed_at'; date: Date }) => void;
  onRemoveCompletedAt: () => void;
  onRemoveDeadline: () => void;
  onOpenDriveModal?: () => void;
  onOpenDriveLink?: () => void;
  onRemoveDriveUrl?: () => void;
}

export function BucketMetaSection({
  bucket,
  canEdit,
  theme,
  onOpenLocationModal,
  onRemoveLocation,
  onOpenDatePicker,
  onRemoveCompletedAt,
  onRemoveDeadline,
  onOpenDriveModal,
  onOpenDriveLink,
  onRemoveDriveUrl,
}: BucketMetaSectionProps) {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const dateFnsLocale = getDateFnsLocale(i18n.language);

  return (
    <View style={styles.meta}>
      {/* Ubicación */}
      {bucket.location_text ? (
        <View style={styles.metaRowBetween}>
          <Pressable
            style={styles.metaRowClickable}
            onPress={() => (canEdit ? onOpenLocationModal() : router.push(`/map?initialTaskId=${bucket.id}` as any))}
          >
            <MapPin color={gold[400]} size={16} strokeWidth={1.8} />
            <Typography variant="body" color={theme.colors.foregroundMuted} style={styles.metaText} numberOfLines={1}>
              {bucket.location_text}
            </Typography>
          </Pressable>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Pressable
              onPress={() => router.push(`/map?initialTaskId=${bucket.id}` as any)}
              hitSlop={8}
              style={{ padding: 4, marginRight: canEdit ? 6 : 0 }}
              accessibilityLabel={t('bucket.view_on_map')}
            >
              <Map color={gold[400]} size={16} strokeWidth={1.8} />
            </Pressable>
            {canEdit && (
              <Pressable
                onPress={onRemoveLocation}
                hitSlop={8}
                style={styles.metaRemoveBtn}
              >
                <X color={theme.colors.foregroundMuted} size={14} />
              </Pressable>
            )}
          </View>
        </View>
      ) : canEdit ? (
        <Pressable
          style={styles.metaRowClickable}
          onPress={onOpenLocationModal}
        >
          <MapPin color={gold[400]} size={16} strokeWidth={1.8} />
          <Typography variant="body" color={gold[400]} style={styles.metaText}>
            {t('bucket.add_location')}
          </Typography>
        </Pressable>
      ) : null}

      {/* Fecha completada */}
      {bucket.completed_at || bucket.status === 'completed' ? (
        <View style={styles.metaRowBetween}>
          <Pressable
            style={styles.metaRowClickable}
            onPress={() =>
              canEdit &&
              onOpenDatePicker({
                visible: true,
                type: 'completed_at',
                date: new Date(bucket.completed_at || bucket.updated_at || new Date()),
              })
            }
            disabled={!canEdit}
          >
            <CheckCircle2 color={gold[400]} size={16} strokeWidth={1.8} />
            <Typography variant="body" color={theme.colors.foregroundMuted} style={styles.metaText}>
              {t('bucket.completed_on', {
                date: format(new Date(bucket.completed_at || bucket.updated_at || new Date()), t('bucket.date_format_long'), { locale: dateFnsLocale }),
              })}
            </Typography>
          </Pressable>
          {canEdit && (
            <Pressable
              onPress={onRemoveCompletedAt}
              hitSlop={8}
              style={styles.metaRemoveBtn}
            >
              <X color={theme.colors.foregroundMuted} size={14} />
            </Pressable>
          )}
        </View>
      ) : canEdit ? (
        <Pressable
          style={styles.metaRowClickable}
          onPress={() =>
            onOpenDatePicker({
              visible: true,
              type: 'completed_at',
              date: new Date(),
            })
          }
        >
          <CheckCircle2 color={gold[400]} size={16} strokeWidth={1.8} />
          <Typography variant="body" color={gold[400]} style={styles.metaText}>
            {t('bucket.add_completed_date')}
          </Typography>
        </Pressable>
      ) : null}

      {/* Fecha límite */}
      {bucket.deadline ? (
        <View style={styles.metaRowBetween}>
          <Pressable
            style={styles.metaRowClickable}
            onPress={() =>
              canEdit &&
              onOpenDatePicker({
                visible: true,
                type: 'deadline',
                date: new Date(bucket.deadline!),
              })
            }
            disabled={!canEdit}
          >
            <Calendar color={gold[400]} size={16} strokeWidth={1.8} />
            <Typography variant="body" color={theme.colors.foregroundMuted} style={styles.metaText}>
              {bucket.status === 'completed'
                ? t('bucket.scheduled_for', {
                    date: format(new Date(bucket.deadline), t('bucket.date_format_long'), { locale: dateFnsLocale }),
                  })
                : t('bucket.due_on', {
                    date: format(new Date(bucket.deadline), t('bucket.date_format_long'), { locale: dateFnsLocale }),
                  })
              }
            </Typography>
          </Pressable>
          {canEdit && (
            <Pressable
              onPress={onRemoveDeadline}
              hitSlop={8}
              style={styles.metaRemoveBtn}
            >
              <X color={theme.colors.foregroundMuted} size={14} />
            </Pressable>
          )}
        </View>
      ) : canEdit ? (
        <Pressable
          style={styles.metaRowClickable}
          onPress={() =>
            onOpenDatePicker({
              visible: true,
              type: 'deadline',
              date: new Date(),
            })
          }
        >
          <Calendar color={gold[400]} size={16} strokeWidth={1.8} />
          <Typography variant="body" color={gold[400]} style={styles.metaText}>
            {t('bucket.add_deadline')}
          </Typography>
        </Pressable>
      ) : null}

      {/* Google Drive */}
      {bucket.drive_url ? (
        <View style={styles.metaRowBetween}>
          <Pressable
            style={styles.metaRowClickable}
            onPress={onOpenDriveLink}
          >
            <HardDrive color={gold[400]} size={16} strokeWidth={1.8} />
            <Typography variant="body" color={theme.colors.foregroundMuted} style={styles.metaText} numberOfLines={1}>
              {t('bucket.open_drive_folder')}
            </Typography>
            <ExternalLink color={gold[400]} size={14} style={{ marginLeft: 4 }} />
          </Pressable>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {canEdit && onOpenDriveModal && (
              <Pressable
                onPress={onOpenDriveModal}
                hitSlop={8}
                style={{ padding: 4, marginRight: 6 }}
                accessibilityLabel={t('bucket.edit_drive_link')}
              >
                <HelpCircle color={gold[400]} size={16} strokeWidth={1.8} />
              </Pressable>
            )}
            {canEdit && onRemoveDriveUrl && (
              <Pressable
                onPress={onRemoveDriveUrl}
                hitSlop={8}
                style={styles.metaRemoveBtn}
                accessibilityLabel={t('bucket.remove_drive_link')}
              >
                <X color={theme.colors.foregroundMuted} size={14} />
              </Pressable>
            )}
          </View>
        </View>
      ) : canEdit && onOpenDriveModal ? (
        <Pressable
          style={styles.metaRowClickable}
          onPress={onOpenDriveModal}
        >
          <HardDrive color={gold[400]} size={16} strokeWidth={1.8} />
          <Typography variant="body" color={gold[400]} style={styles.metaText}>
            {t('bucket.add_drive_folder')}
          </Typography>
        </Pressable>
      ) : null}
    </View>
  );
}
