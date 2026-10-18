import React from 'react';
import { View, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Typography } from '@bucketlist/ui';
import { gold } from '@bucketlist/ui/src/tokens/colors';
import { MapPin, CheckCircle2, Calendar, X, Map, HardDrive, ExternalLink, HelpCircle } from 'lucide-react-native';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
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
              accessibilityLabel="Ver en el mapa"
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
            + Añadir ubicación
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
              Completada el {format(new Date(bucket.completed_at || bucket.updated_at || new Date()), "d 'de' MMMM 'de' yyyy", { locale: es })}
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
            + Añadir fecha de completado
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
                ? `Programada para el ${format(new Date(bucket.deadline), "d 'de' MMMM 'de' yyyy", { locale: es })}`
                : `Vence el ${format(new Date(bucket.deadline), "d 'de' MMMM 'de' yyyy", { locale: es })}`
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
            + Añadir fecha límite
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
              Abrir carpeta en Google Drive
            </Typography>
            <ExternalLink color={gold[400]} size={14} style={{ marginLeft: 4 }} />
          </Pressable>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {canEdit && onOpenDriveModal && (
              <Pressable
                onPress={onOpenDriveModal}
                hitSlop={8}
                style={{ padding: 4, marginRight: 6 }}
                accessibilityLabel="Editar enlace o ver ayuda de seguridad"
              >
                <HelpCircle color={gold[400]} size={16} strokeWidth={1.8} />
              </Pressable>
            )}
            {canEdit && onRemoveDriveUrl && (
              <Pressable
                onPress={onRemoveDriveUrl}
                hitSlop={8}
                style={styles.metaRemoveBtn}
                accessibilityLabel="Quitar enlace de Drive"
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
            + Añadir enlace a Google Drive
          </Typography>
        </Pressable>
      ) : null}
    </View>
  );
}
