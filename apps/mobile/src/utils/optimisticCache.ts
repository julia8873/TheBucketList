import type { QueryClient } from '@tanstack/react-query';

/**
 * Utilidades para actualizar la caché de React Query de forma OPTIMISTA:
 * la UI cambia al instante y el servidor se sincroniza en segundo plano.
 * Si el servidor falla, se restaura la copia (snapshot) previa.
 */

const TASK_KEYS: ReadonlyArray<readonly string[]> = [
  ['album'],
  ['albums'],
  ['buckets'],
  ['bucketDetail'],
  ['bucketAlbum'],
];

export type CacheSnapshot = Array<[readonly unknown[], unknown]>;

/**
 * Marca de tiempo del último cambio hecho POR ESTE dispositivo. El tiempo real (Supabase)
 * devuelve el «eco» de nuestros propios cambios; como la caché ya está actualizada, recargar
 * por ese eco solo gasta red. `useRealtimeSync` lo consulta para ignorarlo.
 */
let lastLocalChangeAt = 0;
export function markLocalChange() {
  lastLocalChangeAt = Date.now();
}
export function isLocalEcho(windowMs = 4000) {
  return Date.now() - lastLocalChangeAt < windowMs;
}

/** Cancela refetches en vuelo (para que no pisen el cambio optimista) y guarda un snapshot. */
export async function beginOptimistic(qc: QueryClient): Promise<CacheSnapshot> {
  markLocalChange();
  await Promise.all(TASK_KEYS.map((k) => qc.cancelQueries({ queryKey: k as unknown[] })));
  const snap: CacheSnapshot = [];
  TASK_KEYS.forEach((k) => {
    qc.getQueriesData({ queryKey: k as unknown[] }).forEach(([key, data]) => {
      snap.push([key, data]);
    });
  });
  return snap;
}

export function rollbackOptimistic(qc: QueryClient, snap?: CacheSnapshot) {
  snap?.forEach(([key, data]) => qc.setQueryData(key as unknown[], data));
}

/**
 * Revalida en segundo plano (sin bloquear la UI). Solo se recargan las consultas activas;
 * el resto queda marcado como obsoleto y se recarga al abrirse.
 */
export function settleTaskCaches(qc: QueryClient) {
  markLocalChange();
  void qc.invalidateQueries({ queryKey: ['album'] });
  void qc.invalidateQueries({ queryKey: ['albums'] });
  void qc.invalidateQueries({ queryKey: ['buckets'] });
  void qc.invalidateQueries({ queryKey: ['bucketAlbum'] });
  void qc.invalidateQueries({ queryKey: ['calendar_month'] });
  void qc.invalidateQueries({ queryKey: ['unassigned_tasks'] });
}

const UNASSIGNED = 'unassigned';

const normalizeAlbumId = (albumId: string | null | undefined) =>
  albumId && albumId !== UNASSIGNED ? albumId : UNASSIGNED;

function adjustAlbumCounts(qc: QueryClient, albumId: string, dTotal: number, dCompleted: number) {
  if (albumId === UNASSIGNED || (dTotal === 0 && dCompleted === 0)) return;
  qc.setQueriesData<any>({ queryKey: ['albums'] }, (old: any) => {
    if (!Array.isArray(old)) return old;
    return old.map((a: any) =>
      a && a.id === albumId && 'total_tasks' in a
        ? {
            ...a,
            total_tasks: Math.max(0, (a.total_tasks ?? 0) + dTotal),
            completed_tasks: Math.max(0, (a.completed_tasks ?? 0) + dCompleted),
          }
        : a,
    );
  });
}

/** Tabla plana album_items (álbum ↔ tarea) usada por «Mi lista» para el contador de «Sin álbum». */
function patchAlbumItemRows(qc: QueryClient, fn: (rows: any[]) => any[]) {
  qc.setQueriesData<any>({ queryKey: ['albums', 'items'] }, (old: any) => (Array.isArray(old) ? fn(old) : old));
}

function patchBucketLists(qc: QueryClient, ids: Set<string>, fn: (b: any) => any) {
  qc.setQueriesData<any>({ queryKey: ['buckets'] }, (old: any) => {
    if (!Array.isArray(old)) return old;
    let changed = false;
    const next = old.map((b: any) => {
      if (b && typeof b === 'object' && ids.has(b.id)) {
        changed = true;
        return fn(b);
      }
      return b;
    });
    return changed ? next : old;
  });
}

/** Cambia campos de tareas ya cargadas (estado, prioridad, visibilidad…) en todas las cachés. */
export function patchTasks(
  qc: QueryClient,
  taskIds: string[],
  opts: { bucket?: Record<string, any>; task?: Record<string, any> },
) {
  const ids = new Set(taskIds);
  const { bucket, task } = opts;

  // Detalle de álbum (+ contadores de progreso del listado de álbumes)
  qc.getQueriesData<any>({ queryKey: ['album'] }).forEach(([key, data]) => {
    if (!data || !Array.isArray(data.tasks)) return;
    let dCompleted = 0;
    let touched = false;
    const tasks = data.tasks.map((t: any) => {
      if (!ids.has(t.id)) return t;
      touched = true;
      const merged = { ...t, ...(task ?? {}) };
      if (task && 'isCompleted' in task && !!t.isCompleted !== !!merged.isCompleted) {
        dCompleted += merged.isCompleted ? 1 : -1;
      }
      return merged;
    });
    if (!touched) return;
    qc.setQueryData(key as unknown[], { ...data, tasks });
    adjustAlbumCounts(qc, String(key[1]), 0, dCompleted);
  });

  if (bucket) {
    patchBucketLists(qc, ids, (b) => ({ ...b, ...bucket }));
    taskIds.forEach((id) => {
      qc.setQueryData(['bucketDetail', id], (old: any) => (old ? { ...old, ...bucket } : old));
    });
  }
}

/** Mover tareas a un álbum (o a «Sin álbum» si albumId es null/'unassigned'). */
export function applyMoveTasks(qc: QueryClient, taskIds: string[], targetAlbumId: string | null) {
  const target = normalizeAlbumId(targetAlbumId);
  const ids = new Set(taskIds);

  // Pool con los datos de las tareas, tomados de cualquier álbum ya cargado.
  const pool = new Map<string, any>();
  qc.getQueriesData<any>({ queryKey: ['album'] }).forEach(([, data]) => {
    data?.tasks?.forEach?.((t: any) => {
      if (ids.has(t.id) && !pool.has(t.id)) pool.set(t.id, t);
    });
  });

  qc.getQueriesData<any>({ queryKey: ['album'] }).forEach(([key, data]) => {
    if (!data || !Array.isArray(data.tasks)) return;
    const cacheAlbumId = String(key[1]);
    const present = new Set<string>(data.tasks.map((t: any) => t.id));

    if (cacheAlbumId === target) {
      const toAdd = taskIds.filter((id) => !present.has(id) && pool.has(id));
      if (!toAdd.length) return;
      const maxPos = data.tasks.reduce((m: number, t: any) => Math.max(m, t.position ?? -1), -1);
      const added = toAdd.map((id, i) => ({ ...pool.get(id), position: maxPos + 1 + i }));
      qc.setQueryData(key as unknown[], { ...data, tasks: [...data.tasks, ...added] });
      adjustAlbumCounts(qc, cacheAlbumId, added.length, added.filter((t: any) => t.isCompleted).length);
      return;
    }

    const removed = data.tasks.filter((t: any) => ids.has(t.id));
    if (!removed.length) return;
    qc.setQueryData(key as unknown[], { ...data, tasks: data.tasks.filter((t: any) => !ids.has(t.id)) });
    adjustAlbumCounts(qc, cacheAlbumId, -removed.length, -removed.filter((t: any) => t.isCompleted).length);
  });

  patchAlbumItemRows(qc, (rows) => [
    ...rows.filter((r) => !ids.has(r.bucket_id)),
    ...(target === UNASSIGNED ? [] : taskIds.map((id) => ({ album_id: target, bucket_id: id }))),
  ]);

  patchBucketLists(qc, ids, (b) => ({
    ...b,
    album_items: target === UNASSIGNED ? [] : [{ album_id: target }],
    album_id: target === UNASSIGNED ? null : target,
  }));

  taskIds.forEach((id) => {
    qc.setQueryData(['bucketAlbum', id], target === UNASSIGNED ? [] : [{ album_id: target }]);
    qc.setQueryData(['bucketDetail', id], (old: any) =>
      old ? { ...old, album_items: target === UNASSIGNED ? [] : [{ album_id: target }] } : old,
    );
  });
}

/** Quitar tareas de UN álbum concreto (la tarea puede seguir en otros álbumes). */
export function applyRemoveFromAlbum(qc: QueryClient, taskIds: string[], albumId: string) {
  const ids = new Set(taskIds);

  const removedAll = new Map<string, any>();
  qc.getQueriesData<any>({ queryKey: ['album'] }).forEach(([key, data]) => {
    if (!data || !Array.isArray(data.tasks) || String(key[1]) !== albumId) return;
    const removed = data.tasks.filter((t: any) => ids.has(t.id));
    if (!removed.length) return;
    removed.forEach((t: any) => removedAll.set(t.id, t));
    qc.setQueryData(key as unknown[], { ...data, tasks: data.tasks.filter((t: any) => !ids.has(t.id)) });
    adjustAlbumCounts(qc, albumId, -removed.length, -removed.filter((t: any) => t.isCompleted).length);
  });

  const orphaned: string[] = [];
  taskIds.forEach((id) => {
    const result: { remaining?: any[] } = {};
    qc.setQueryData(['bucketAlbum', id], (old: any) => {
      if (!Array.isArray(old)) return old;
      result.remaining = old.filter((a: any) => a.album_id !== albumId);
      return result.remaining;
    });
    if (result.remaining && result.remaining.length === 0) orphaned.push(id);
    qc.setQueryData(['bucketDetail', id], (old: any) =>
      old
        ? { ...old, album_items: (old.album_items ?? []).filter((a: any) => a.album_id !== albumId) }
        : old,
    );
  });

  patchAlbumItemRows(qc, (rows) => rows.filter((r) => !(ids.has(r.bucket_id) && r.album_id === albumId)));

  patchBucketLists(qc, ids, (b) => {
    const album_items = (b.album_items ?? []).filter((a: any) => a.album_id !== albumId);
    return { ...b, album_items, album_id: album_items[0]?.album_id ?? null };
  });

  // Las que se quedan sin álbum aparecen en «Sin álbum» si esa vista está cargada.
  if (orphaned.length) {
    qc.getQueriesData<any>({ queryKey: ['album', UNASSIGNED] }).forEach(([key, data]) => {
      if (!data || !Array.isArray(data.tasks)) return;
      const present = new Set<string>(data.tasks.map((t: any) => t.id));
      const add = orphaned.filter((id) => !present.has(id) && removedAll.has(id)).map((id) => ({
        ...removedAll.get(id),
        position: null,
      }));
      if (add.length) qc.setQueryData(key as unknown[], { ...data, tasks: [...data.tasks, ...add] });
    });
  }
}

/** Borrar tareas por completo de todas las cachés. */
export function applyDeleteTasks(qc: QueryClient, taskIds: string[]) {
  const ids = new Set(taskIds);

  qc.getQueriesData<any>({ queryKey: ['album'] }).forEach(([key, data]) => {
    if (!data || !Array.isArray(data.tasks)) return;
    const removed = data.tasks.filter((t: any) => ids.has(t.id));
    if (!removed.length) return;
    qc.setQueryData(key as unknown[], { ...data, tasks: data.tasks.filter((t: any) => !ids.has(t.id)) });
    adjustAlbumCounts(
      qc,
      String(key[1]),
      -removed.length,
      -removed.filter((t: any) => t.isCompleted).length,
    );
  });

  patchAlbumItemRows(qc, (rows) => rows.filter((r) => !ids.has(r.bucket_id)));

  qc.setQueriesData<any>({ queryKey: ['buckets'] }, (old: any) => {
    if (!Array.isArray(old)) return old;
    const next = old.filter((b: any) => !(b && typeof b === 'object' && ids.has(b.id)));
    return next.length === old.length ? old : next;
  });
}

/** Añadir tareas a un álbum, reutilizando los datos que ya tenemos en caché (lista de tareas). */
export function applyAddToAlbum(qc: QueryClient, taskIds: string[], albumId: string) {
  const known = new Map<string, any>();
  qc.getQueriesData<any>({ queryKey: ['buckets'] }).forEach(([, data]) => {
    if (!Array.isArray(data)) return;
    data.forEach((b: any) => {
      if (b && typeof b === 'object' && b.id) known.set(b.id, b);
    });
  });
  const pool = new Map<string, any>();
  qc.getQueriesData<any>({ queryKey: ['album'] }).forEach(([, data]) => {
    data?.tasks?.forEach?.((t: any) => {
      if (!pool.has(t.id)) pool.set(t.id, t);
    });
  });

  qc.getQueriesData<any>({ queryKey: ['album', albumId] }).forEach(([key, data]) => {
    if (!data || !Array.isArray(data.tasks)) return;
    const present = new Set<string>(data.tasks.map((t: any) => t.id));
    const maxPos = data.tasks.reduce((m: number, t: any) => Math.max(m, t.position ?? -1), -1);
    const added: any[] = [];
    taskIds.forEach((id) => {
      if (present.has(id)) return;
      const t = pool.get(id);
      if (t) {
        added.push({ ...t, position: maxPos + 1 + added.length });
        return;
      }
      const b = known.get(id);
      if (!b) return; // sin datos suficientes: lo traerá la revalidación
      const subtasks: any[] = b.item_subtasks ?? [];
      added.push({
        id: b.id,
        title: b.title,
        categoryName: b.category?.name_es || '',
        coverKey: data.coverKey ?? 'aurora',
        imageValue: b.imageValue ?? null,
        categorySlug: b.category?.slug ?? null,
        isCompleted: b.status === 'completed',
        dueDate: b.deadline || undefined,
        completedAt: b.completed_at ?? null,
        position: maxPos + 1 + added.length,
        priority: b.priority || 'medium',
        stepsTotal: subtasks.length,
        stepsCompleted: subtasks.filter((s: any) => s.done).length,
        tags: [],
      });
    });
    if (!added.length) return;
    qc.setQueryData(key as unknown[], { ...data, tasks: [...data.tasks, ...added] });
    adjustAlbumCounts(qc, albumId, added.length, added.filter((t) => t.isCompleted).length);
  });

  patchAlbumItemRows(qc, (rows) => {
    const have = new Set(rows.filter((r) => r.album_id === albumId).map((r) => r.bucket_id));
    return [...rows, ...taskIds.filter((id) => !have.has(id)).map((id) => ({ album_id: albumId, bucket_id: id }))];
  });

  patchBucketLists(qc, new Set(taskIds), (b) => ({
    ...b,
    album_items: (b.album_items ?? []).some((a: any) => a.album_id === albumId)
      ? b.album_items
      : [...(b.album_items ?? []), { album_id: albumId }],
    album_id: b.album_id ?? albumId,
  }));
}

/** Añade etiquetas a tareas ya cargadas en los álbumes (las etiquetas se toman de la caché de etiquetas). */
export function applyAddTagsToTasks(qc: QueryClient, taskIds: string[], tagIds: string[]) {
  const catalog = new Map<string, any>();
  qc.getQueriesData<any>({ queryKey: ['tags'] }).forEach(([, data]) => {
    if (Array.isArray(data)) data.forEach((t: any) => t?.id && catalog.set(t.id, t));
  });
  const tags = tagIds
    .map((id) => catalog.get(id))
    .filter(Boolean)
    .map((t: any) => ({ id: t.id, name: t.name, color: t.color, emoji: t.emoji ?? null }));
  if (!tags.length) return;

  const ids = new Set(taskIds);
  qc.getQueriesData<any>({ queryKey: ['album'] }).forEach(([key, data]) => {
    if (!data || !Array.isArray(data.tasks)) return;
    let touched = false;
    const next = data.tasks.map((t: any) => {
      if (!ids.has(t.id)) return t;
      const have = new Set((t.tags ?? []).map((x: any) => x.id));
      const add = tags.filter((x) => !have.has(x.id));
      if (!add.length) return t;
      touched = true;
      return { ...t, tags: [...(t.tags ?? []), ...add] };
    });
    if (touched) qc.setQueryData(key as unknown[], { ...data, tasks: next });
  });
}
