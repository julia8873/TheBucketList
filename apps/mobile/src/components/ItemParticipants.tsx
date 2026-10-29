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
  style?: ViewStyle;
}

/**
 * Fotos de perfil una junto a otra, cada una solapada un poco con la anterior.
 * Al tocarla se abre un menú inferior con todos los participantes.
 */
export function ParticipantsStack({ participants, max = 4, ringColor, disabled, style }: StackProps) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  if (!participants || participants.length === 0) return null;

  const ring = ringColor ?? theme.colors.surface;
  const visible = participants.slice(0, max);
  const extra = participants.length - visible.length;
  const bubble = AVATAR + RING * 2;

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        disabled={disabled}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={t('participants.open', { count: participants.length })}
        style={[styles.stack, style]}
      >
        {visible.map((p, i) => (
          <View
            key={p.id}
            style={[
              styles.ring,
              { width: bubble, height: bubble, borderRadius: bubble / 2, borderColor: ring },
              i > 0 && { marginLeft: -OVERLAP },
            ]}
          >
            <Avatar uri={p.avatar_url} initials={initialsOf(p)} size="xs" />
          </View>
        ))}
        {extra > 0 && (
          <View
            style={[
              styles.ring,
              styles.more,
              {
                width: bubble,
                height: bubble,
                borderRadius: bubble / 2,
                borderColor: ring,
                marginLeft: -OVERLAP,
                backgroundColor: theme.dark ? '#2B2B2B' : '#E8E3D8',
              },
            ]}
          >
            <Text style={[styles.moreText, { color: theme.colors.foreground }]}>+{extra}</Text>
          </View>
        )}
      </Pressable>

      <ParticipantsSheet visible={open} participants={participants} onClose={() => setOpen(false)} />
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
