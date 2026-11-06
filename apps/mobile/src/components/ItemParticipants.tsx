import React, { createContext, useContext, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { useRouter } from 'expo-router';
import { Avatar, useTheme } from '@bucketlist/ui';
import { useTranslation } from '@bucketlist/shared';
import { TagSheetShell } from './TagSheetShell';
import { PersonRow } from './PersonRow';
import { useAuthStore } from '../stores/auth.store';
import { initialsOf } from '../utils/initials';
import {
  useItemParticipants,
  type ItemParticipant,
  type ParticipantsKind,
  type ParticipantsMap,
  type ParticipantsSource,
} from '../hooks/useItemParticipants';

// ── Contexto: un único fetch por lista, las filas solo leen ─────────────────────────────

export interface ParticipantsContextValue {
  task: ParticipantsMap;
  album: ParticipantsMap;
}

const EMPTY: ParticipantsContextValue = { task: {}, album: {} };
const ParticipantsContext = createContext<ParticipantsContextValue>(EMPTY);

interface ParticipantsSourcesArgs {
  taskSources: ParticipantsSource[];
  albumSources: ParticipantsSource[];
  tasksEnabled: boolean;
  albumsEnabled: boolean;
}

/** Carga (un solo fetch por lista) los participantes de las tareas y álbumes visibles. */
export function useParticipantsValue({
  taskSources,
  albumSources,
  tasksEnabled,
  albumsEnabled,
}: ParticipantsSourcesArgs): ParticipantsContextValue {
  const tasks = useItemParticipants('task', taskSources, tasksEnabled);
  const albums = useItemParticipants('album', albumSources, albumsEnabled);

  return useMemo<ParticipantsContextValue>(
    () => ({
      task: tasksEnabled ? tasks.data ?? EMPTY.task : EMPTY.task,
      album: albumsEnabled ? albums.data ?? EMPTY.album : EMPTY.album,
    }),
    [tasks.data, albums.data, tasksEnabled, albumsEnabled],
  );
}

export function ItemParticipantsProvider({
  value,
  children,
}: {
  value: ParticipantsContextValue;
  children: React.ReactNode;
}) {
  return <ParticipantsContext.Provider value={value}>{children}</ParticipantsContext.Provider>;
}

/** Participantes (propietario + colaboradores aceptados) de una tarea/álbum, si los hay. */
export function useParticipantsOf(kind: ParticipantsKind, id: string | undefined): ItemParticipant[] | undefined {
  const ctx = useContext(ParticipantsContext);
  return id ? ctx[kind][id] : undefined;
}

// ── Pila de fotos de perfil solapadas ───────────────────────────────────────────────────

const AVATAR = 24; // Avatar size="xs"
const RING = 2;
const OVERLAP = 9;

interface StackProps {
  participants: ItemParticipant[] | undefined;
  /** Máximo de fotos visibles; el resto se resume en «+N». */
  max?: number;
  /** Color del aro que separa las fotos (el del fondo donde se pinta). */
  ringColor?: string;
  /** Sin interacción (p. ej. en modo selección). */
  disabled?: boolean;
  size?: 'xs' | 'sm' | 'md';
  /** Tamaño exacto de la burbuja en píxeles (para coincidir con badges de estado) */
  bubbleSize?: number;
  style?: ViewStyle;
}

/**
 * Fotos de perfil una junto a otra, cada una solapada un poco con la anterior.
 * Al tocarla se abre un menú inferior con todos los participantes.
 */
export function ParticipantsStack({ participants, max = 4, ringColor, disabled, size = 'xs', bubbleSize, style }: StackProps) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const myId = useAuthStore((s) => s.user?.id);
  const [open, setOpen] = useState(false);

  // Asegurar que el creador (isOwner === true) esté siempre primero
  const sorted: ItemParticipant[] = React.useMemo(() => {
    if (!participants || participants.length <= 1) return participants ?? [];
    const ownerIdx = participants.findIndex((p) => p.isOwner);
    if (ownerIdx <= 0) return participants;
    const owner = participants[ownerIdx];
    if (!owner) return participants;
    return [owner, ...participants.slice(0, ownerIdx), ...participants.slice(ownerIdx + 1)];
  }, [participants]);

  if (!sorted || sorted.length === 0) return null;

  const ring = ringColor ?? theme.colors.surface;
  const visible = sorted.slice(0, max);
  const extra = sorted.length - visible.length;

  const bubble = bubbleSize ?? (size === 'sm' ? 36 : size === 'md' ? 44 : 28);
  const ringPx = bubbleSize ? (bubbleSize <= 20 ? 1 : 1.5) : 2;
  const avatarPx = Math.max(12, bubble - ringPx * 2);
  const overlapPx = bubbleSize ? Math.round(bubble * 0.35) : (size === 'sm' ? 11 : size === 'md' ? 14 : 9);

  const openProfile = (id: string) => {
    if (disabled) return;
    if (id === myId) router.push('/(tabs)/profile' as any);
    else router.push(`/profile/${id}` as any);
  };

  return (
    <>
      <View style={[styles.stack, style]}>
        {visible.map((p, i) => (
          <Pressable
            key={p.id}
            disabled={disabled}
            hitSlop={4}
            onPress={(e) => {
              (e as any)?.stopPropagation?.();
              openProfile(p.id);
            }}
            accessibilityRole="button"
            accessibilityLabel={p.display_name || p.username || t('profile.title_rest', { defaultValue: 'Perfil' })}
            style={({ pressed }) => [
              styles.ring,
              { width: bubble, height: bubble, borderRadius: bubble / 2, borderColor: ring, borderWidth: ringPx },
              i > 0 && { marginLeft: -overlapPx },
              pressed && { opacity: 0.7 },
            ]}
          >
            <Avatar uri={p.avatar_url} initials={initialsOf(p)} size={size} customSize={avatarPx} goldRing={p.isOwner} />
          </Pressable>
        ))}
        {extra > 0 && (
          <Pressable
            disabled={disabled}
            hitSlop={4}
            onPress={(e) => {
              (e as any)?.stopPropagation?.();
              setOpen(true);
            }}
            accessibilityRole="button"
            accessibilityLabel={t('participants.open', { count: sorted.length })}
            style={({ pressed }) => [
              styles.ring,
              styles.more,
              {
                width: bubble,
                height: bubble,
                borderRadius: bubble / 2,
                borderColor: ring,
                borderWidth: ringPx,
                marginLeft: -overlapPx,
                backgroundColor: theme.dark ? '#2B2B2B' : '#E8E3D8',
                alignItems: 'center',
                justifyContent: 'center',
              },
              pressed && { opacity: 0.7 },
            ]}
          >
            <Text
              style={[
                styles.moreText,
                {
                  color: theme.colors.foreground,
                  fontSize: bubble <= 18 ? 8 : bubble <= 20 ? 9 : (size === 'sm' ? 12 : 11),
                  lineHeight: bubble <= 18 ? 10 : bubble <= 20 ? 11 : undefined,
                },
              ]}
            >
              +{extra}
            </Text>
          </Pressable>
        )}
      </View>

      <ParticipantsSheet visible={open} participants={sorted} onClose={() => setOpen(false)} />
    </>
  );
}

/** Igual que `ParticipantsStack`, leyendo los participantes del contexto. */
export function ItemParticipantsStack({
  kind,
  itemId,
  ...rest
}: { kind: ParticipantsKind; itemId: string } & Omit<StackProps, 'participants'>) {
  const participants = useParticipantsOf(kind, itemId);
  return <ParticipantsStack participants={participants} {...rest} />;
}

// ── Menú inferior con todos los colaboradores ───────────────────────────────────────────

interface SheetProps {
  visible: boolean;
  participants: ItemParticipant[];
  onClose: () => void;
}

export function ParticipantsSheet({ visible, participants, onClose }: SheetProps) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const myId = useAuthStore((s) => s.user?.id);

  const openProfile = (id: string) => {
    onClose();
    if (id === myId) router.push('/(tabs)/profile' as any);
    else router.push(`/profile/${id}` as any);
  };

  return (
    <TagSheetShell visible={visible} onClose={onClose}>
      <View style={styles.sheetHeader}>
        <Text style={[styles.sheetTitle, { color: theme.colors.foreground }]}>
          {t('participants.title')}
        </Text>
        <Text style={[styles.sheetCount, { color: theme.colors.foregroundMuted }]}>{participants.length}</Text>
      </View>

      <ScrollView
        style={styles.sheetList}
        contentContainerStyle={styles.sheetListContent}
        showsVerticalScrollIndicator={false}
      >
        {participants.map((p) => {
          const isMe = p.id === myId;
          const role = p.isOwner ? t('participants.owner') : t('participants.collaborator');
          const handle = p.username ? `@${p.username}` : '';
          const subtitle = [handle, isMe ? `${role} · ${t('participants.you')}` : role].filter(Boolean).join(' · ');
          return (
            <PersonRow
              key={p.id}
              person={p}
              subtitle={subtitle}
              onPress={() => openProfile(p.id)}
            />
          );
        })}
      </ScrollView>
    </TagSheetShell>
  );
}

const styles = StyleSheet.create({
  stack: { flexDirection: 'row', alignItems: 'center' },
  ring: { borderWidth: RING, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  more: { overflow: 'hidden' },
  moreText: { fontSize: 10, fontWeight: '700' },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 20,
    marginTop: 2,
    paddingBottom: 6,
  },
  sheetTitle: { fontFamily: 'PlayfairDisplay_700Bold', fontSize: 24 },
  sheetCount: { fontFamily: 'Inter_600SemiBold', fontSize: 16 },
  sheetList: { flexGrow: 0 },
  sheetListContent: { paddingHorizontal: 20, paddingBottom: 32 },
});
