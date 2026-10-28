import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../services/supabase';

export type ParticipantsKind = 'task' | 'album';

export interface ItemParticipant {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  /** Creador / propietario de la tarea o álbum. */
  isOwner: boolean;
}

export interface ParticipantsSource {
  id: string;
  /** Id del propietario (buckets.user_id / albums.owner_id). */
  ownerId?: string | null;
}

export type ParticipantsMap = Record<string, ItemParticipant[]>;

/** Tamaño de los lotes para no pasar de la longitud máxima de la URL en los `in (...)`. */
const CHUNK = 80;

function chunked<T>(items: T[], size = CHUNK): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

/**
 * Para cada tarea que esté en algún álbum, devuelve el dueño del álbum y los miembros aceptados
 * de ese álbum: todos ellos son colaboradores de la tarea aunque no se les haya añadido a mano.
 */
async function fetchAlbumParticipantsByTask(taskIds: string[]): Promise<Map<string, string[]>> {
  const result = new Map<string, string[]>();
  if (taskIds.length === 0) return result;

  // 1. Tarea → álbumes que la contienen
  const albumsByTask = new Map<string, string[]>();
  await Promise.all(
    chunked(taskIds).map(async (part) => {
      const { data, error } = await (supabase as any)
        .from('album_items')
        .select('album_id, bucket_id')
        .in('bucket_id', part);
      if (error) {
        console.warn('No se pudieron cargar los álbumes de las tareas:', error.message);
        return;
      }
      (data ?? []).forEach((row: any) => {
        const list = albumsByTask.get(row.bucket_id) ?? [];
        list.push(row.album_id);
        albumsByTask.set(row.bucket_id, list);
      });
    }),
  );
  if (albumsByTask.size === 0) return result;

  // 2. Álbum → dueño + miembros aceptados
  const albumIds = Array.from(new Set(Array.from(albumsByTask.values()).flat()));
  const peopleByAlbum = new Map<string, string[]>();
  await Promise.all(
    chunked(albumIds).map(async (part) => {
      const [ownersRes, membersRes] = await Promise.all([
        (supabase as any).from('albums').select('id, owner_id').in('id', part),
        (supabase as any).from('album_members').select('album_id, user_id').in('album_id', part).eq('status', 'accepted'),
      ]);
      if (ownersRes.error) console.warn('No se pudieron cargar los dueños de álbum:', ownersRes.error.message);
      if (membersRes.error) console.warn('No se pudieron cargar los miembros de álbum:', membersRes.error.message);
      (ownersRes.data ?? []).forEach((row: any) => {
        if (!row.owner_id) return;
        const list = peopleByAlbum.get(row.id) ?? [];
        list.push(row.owner_id);
        peopleByAlbum.set(row.id, list);
      });
      (membersRes.data ?? []).forEach((row: any) => {
        const list = peopleByAlbum.get(row.album_id) ?? [];
        list.push(row.user_id);
        peopleByAlbum.set(row.album_id, list);
      });
    }),
  );

  // 3. Tarea → personas (sin repetidos)
  albumsByTask.forEach((albums, taskId) => {
    const people = new Set<string>();
    albums.forEach((albumId) => (peopleByAlbum.get(albumId) ?? []).forEach((u) => people.add(u)));
    if (people.size > 0) result.set(taskId, Array.from(people));
  });
  return result;
}

/**
 * Devuelve, por cada tarea/álbum que tenga al menos un colaborador aceptado (en las tareas,
 * también los del álbum compartido que las contiene), la lista de participantes: primero el
 * propietario y después los colaboradores.
 * Los elementos sin colaboradores no aparecen en el resultado.
 */
export async function fetchParticipants(
  kind: ParticipantsKind,
  sources: ParticipantsSource[],
): Promise<ParticipantsMap> {
  if (sources.length === 0) return {};

  const table = kind === 'task' ? 'bucket_collaborators' : 'album_members';
  const itemCol = kind === 'task' ? 'bucket_id' : 'album_id';

  const collabsByItem = new Map<string, string[]>();
  await Promise.all(
    chunked(sources.map((s) => s.id)).map(async (part) => {
      const { data, error } = await (supabase as any)
        .from(table)
        .select(`${itemCol}, user_id`)
        .in(itemCol, part)
        .eq('status', 'accepted');
      if (error) {
        console.warn('No se pudieron cargar los colaboradores:', error.message);
        return;
      }
      (data ?? []).forEach((row: any) => {
        const list = collabsByItem.get(row[itemCol]) ?? [];
        list.push(row.user_id);
        collabsByItem.set(row[itemCol], list);
      });
    }),
  );

  const ownerByItem = new Map(sources.map((s) => [s.id, s.ownerId ?? null] as const));

  // Las tareas de un álbum compartido también tienen como colaboradores al dueño del álbum
  // y a sus miembros aceptados (igual que `bucket_participant_ids` en la base de datos).
  if (kind === 'task') {
    const albumExtras = await fetchAlbumParticipantsByTask(sources.map((s) => s.id));
    albumExtras.forEach((users, taskId) => {
      const taskOwner = ownerByItem.get(taskId);
      const list = collabsByItem.get(taskId) ?? [];
      users.forEach((uid) => {
        if (uid === taskOwner || list.includes(uid)) return;
        list.push(uid);
      });
      if (list.length > 0) collabsByItem.set(taskId, list);
    });
  }

  if (collabsByItem.size === 0) return {};

  const userIds = new Set<string>();
  collabsByItem.forEach((users, itemId) => {
    users.forEach((u) => userIds.add(u));
    const owner = ownerByItem.get(itemId);
    if (owner) userIds.add(owner);
  });

  const profiles = new Map<string, Omit<ItemParticipant, 'isOwner'>>();
  await Promise.all(
    chunked(Array.from(userIds)).map(async (part) => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url')
        .in('id', part);
      if (error) {
        console.warn('No se pudieron cargar los perfiles de colaboradores:', error.message);
        return;
      }
      (data ?? []).forEach((p: any) =>
        profiles.set(p.id, {
          id: p.id,
          username: p.username ?? '',
          display_name: p.display_name ?? null,
          avatar_url: p.avatar_url ?? null,
        }),
      );
    }),
  );

  const result: ParticipantsMap = {};
  collabsByItem.forEach((users, itemId) => {
    const owner = ownerByItem.get(itemId);
    const ordered: ItemParticipant[] = [];
    const seen = new Set<string>();

    if (owner && profiles.has(owner)) {
      ordered.push({ ...profiles.get(owner)!, isOwner: true });
      seen.add(owner);
    }
    users.forEach((uid) => {
      if (seen.has(uid)) return;
      const profile = profiles.get(uid);
      if (!profile) return;
      seen.add(uid);
      ordered.push({ ...profile, isOwner: false });
    });

    if (ordered.length > 0) result[itemId] = ordered;
  });
  return result;
}

function hashIds(ids: string[]): string {
  let h = 5381;
  const joined = ids.slice().sort().join(',');
  for (let i = 0; i < joined.length; i++) h = ((h << 5) + h + joined.charCodeAt(i)) | 0;
  return `${ids.length}:${h}`;
}

export function useItemParticipants(kind: ParticipantsKind, sources: ParticipantsSource[], enabled: boolean) {
  const key = useMemo(() => hashIds(sources.map((s) => s.id)), [sources]);
  return useQuery({
    queryKey: ['item_participants', kind, key],
    queryFn: () => fetchParticipants(kind, sources),
    enabled: enabled && sources.length > 0,
    staleTime: 1000 * 60,
    gcTime: 1000 * 60 * 10,
    placeholderData: (prev) => prev,
  });
}
