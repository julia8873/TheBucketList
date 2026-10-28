import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { QueryClient } from '@tanstack/react-query';
import { settleTaskCaches } from '../utils/optimisticCache';
import { AddTaskSyncSheet } from '../features/add-task/components/AddTaskSyncSheet';
import type { AddTaskSyncPrompt } from '../features/add-task/hooks/useAddTaskState';

export type SyncVisibility = 'public' | 'followers' | 'private';
export type SyncPriority = 'low' | 'medium' | 'high' | 'urgent';

const VISIBILITIES: SyncVisibility[] = ['public', 'followers', 'private'];
const PRIORITIES: SyncPriority[] = ['low', 'medium', 'high', 'urgent'];

export interface AlbumSyncAlbum {
  title: string;
  visibility?: string | null;
  priority?: string | null;
}

export interface AlbumSyncTask {
  visibility?: string | null;
  priority?: string | null;
}

/** Propiedades que el usuario ha decidido igualar a las del álbum (vacío = mantener todo). */
export interface AlbumSyncChanges {
  visibility?: SyncVisibility;
  priority?: SyncPriority;
}

export function toSyncVisibility(value?: string | null): SyncVisibility | undefined {
  return VISIBILITIES.includes(value as SyncVisibility) ? (value as SyncVisibility) : undefined;
}

export function toSyncPriority(value?: string | null): SyncPriority | undefined {
  return PRIORITIES.includes(value as SyncPriority) ? (value as SyncPriority) : undefined;
}

/**
 * Compara las tareas con el álbum y devuelve los datos del menú de ajuste, o `null` si la
 * visibilidad y la prioridad ya coinciden (en ese caso no hay nada que preguntar).
 */
export function buildAlbumSyncPrompt(
  album: AlbumSyncAlbum,
  tasks: AlbumSyncTask[],
): AddTaskSyncPrompt | null {
  const albumVisibility = toSyncVisibility(album.visibility);
  const albumPriority = toSyncPriority(album.priority) ?? 'medium';

  const visibilityCount = albumVisibility
    ? tasks.filter((t) => (toSyncVisibility(t.visibility) ?? 'public') !== albumVisibility).length
    : 0;
  const priorityCount = tasks.filter(
    (t) => (toSyncPriority(t.priority) ?? 'medium') !== albumPriority,
  ).length;

  if (visibilityCount === 0 && priorityCount === 0) return null;

  return {
    albumName: album.title,
    albumVisibility: albumVisibility ?? 'public',
    albumPriority,
    visibilityCount,
    priorityCount,
  };
}

/** Columnas de `buckets` que hay que actualizar para aplicar los cambios elegidos. */
export function albumSyncToBucketPatch(changes: AlbumSyncChanges): Record<string, string> {
  const patch: Record<string, string> = {};
  if (changes.visibility) patch.visibility = changes.visibility;
  if (changes.priority) patch.priority = changes.priority;
  return patch;
}

/**
 * Revalida en segundo plano lo que cambia al igualar visibilidad/prioridad: listas, álbumes,
 * el detalle de cada tarea afectada y el feed (la visibilidad decide quién la ve).
 */
export function settleAlbumSyncCaches(qc: QueryClient, taskIds: string[]) {
  settleTaskCaches(qc);
  taskIds.forEach((id) => void qc.invalidateQueries({ queryKey: ['bucketDetail', id] }));
  void qc.invalidateQueries({ queryKey: ['feed'] });
}

interface SheetState {
  prompt: AddTaskSyncPrompt;
  single: boolean;
}

/**
 * Pregunta (con el menú inferior) si, al añadir una o varias tareas a un álbum, se cambia su
 * visibilidad y/o prioridad por las del álbum.
 *
 *   const { askAlbumSync, albumSyncSheet } = useAlbumSync();
 *   const changes = await askAlbumSync(album, [{ visibility, priority }]);
 *   if (changes === null) return;      // el usuario ha cancelado: no se añade al álbum
 *   // changes = { visibility?, priority? } → lo que hay que igualar (vacío = mantener)
 *   ...
 *   return <>{...}{albumSyncSheet}</>;
 *
 * Si todo coincide con el álbum no se muestra nada y se resuelve enseguida con `{}`.
 * `delayMs` retrasa la apertura del menú (útil justo después de cerrar otro `Modal` en iOS).
 */
export function useAlbumSync() {
  const [state, setState] = useState<SheetState | null>(null);
  const resolver = useRef<((value: AlbumSyncChanges | null) => void) | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
      resolver.current?.(null);
      resolver.current = null;
    },
    [],
  );

  const askAlbumSync = useCallback(
    (album: AlbumSyncAlbum, tasks: AlbumSyncTask[], opts?: { delayMs?: number }) =>
      new Promise<AlbumSyncChanges | null>((resolve) => {
        const prompt = buildAlbumSyncPrompt(album, tasks);
        if (!prompt) {
          resolve({});
          return;
        }
        // Una pregunta pendiente anterior se da por cancelada.
        resolver.current?.(null);
        resolver.current = resolve;

        const open = () => setState({ prompt, single: tasks.length === 1 });
        if (timer.current) clearTimeout(timer.current);
        if (opts?.delayMs && opts.delayMs > 0) {
          timer.current = setTimeout(open, opts.delayMs);
        } else {
          open();
        }
      }),
    [],
  );

  const finish = (value: AlbumSyncChanges | null) => {
    if (timer.current) clearTimeout(timer.current);
    const resolve = resolver.current;
    resolver.current = null;
    setState(null);
    resolve?.(value);
  };

  const albumSyncSheet = (
    <AddTaskSyncSheet
      prompt={state?.prompt ?? null}
      single={state?.single ?? true}
      onClose={() => finish(null)}
      onConfirm={(apply) => {
        const prompt = state?.prompt;
        if (!prompt) {
          finish(null);
          return;
        }
        finish({
          visibility:
            apply.visibility && prompt.visibilityCount > 0 ? prompt.albumVisibility : undefined,
          priority: apply.priority && prompt.priorityCount > 0 ? prompt.albumPriority : undefined,
        });
      }}
    />
  );

  return { askAlbumSync, albumSyncSheet };
}
