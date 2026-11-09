/**
 * Qué imagen representa a una tarea (feed, explorar, álbumes, añadir tareas,
 * Mi lista, calendario, perfiles y cabecera de la tarea).
 *
 * Regla:
 *   1. Si el usuario seleccionó una foto concreta como portada (`thumbnail_photo_id`).
 *   2. Si no, por defecto la foto subida más reciente (`latestPhoto`).
 *   3. Si no hay fotos: degradado por defecto (preset/color si existe o 'preset:aurora').
 */

export type ThumbnailMode = 'auto' | 'cover' | 'photo';

export interface TaskPhotoLike {
  id?: string | null;
  storage_path?: string | null;
  thumb_path?: string | null;
  created_at?: string | null;
}

export interface TaskImageSource {
  cover_image?: string | null;
  thumbnail_mode?: string | null;
  thumbnail_photo_id?: string | null;
  bucket_photos?: TaskPhotoLike[] | null;
}

export interface ResolveTaskImageOptions {
  /** Usa la miniatura (`thumb_path`) de las fotos cuando exista; ideal para filas pequeñas. */
  preferThumb?: boolean;
}

const time = (p: TaskPhotoLike) => new Date(p.created_at ?? 0).getTime();

/** Foto subida más reciente (la misma que se ve primero en el perfil). No modifica el array original. */
export function latestPhoto<T extends TaskPhotoLike>(photos?: T[] | null): T | undefined {
  const list = (photos ?? []).filter((p) => !!p?.storage_path);
  if (list.length === 0) return undefined;
  return [...list].sort((a, b) => time(b) - time(a))[0];
}

function photoValue(photo: TaskPhotoLike, preferThumb?: boolean): string | null {
  return (preferThumb ? photo.thumb_path || photo.storage_path : photo.storage_path) ?? null;
}

/**
 * Devuelve el valor que espera `BucketCover` (`preset:<clave>`, ruta de storage, URL o `null`).
 */
export function resolveTaskImage(
  task: TaskImageSource | null | undefined,
  options: ResolveTaskImageOptions = {},
): string | null {
  if (!task) return null;
  const photos = task.bucket_photos ?? [];
  const cover = task.cover_image || null;

  // 1. Si el usuario eligió una foto concreta como portada:
  if (task.thumbnail_photo_id) {
    const chosen = photos.find((p) => p.id === task.thumbnail_photo_id && !!p.storage_path);
    if (chosen) return photoValue(chosen, options.preferThumb);
  }

  // 2. Por defecto: última foto subida
  const latest = latestPhoto(photos);
  if (latest) return photoValue(latest, options.preferThumb);

  // 3. Si no hay fotos:
  // "Las tareas que tenían cover, ponles un gradiente por defecto y ya."
  if (cover && (cover.startsWith('preset:') || cover.startsWith('#'))) {
    return cover;
  }
  return 'preset:aurora';
}
