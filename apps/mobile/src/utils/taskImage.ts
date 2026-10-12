/**
 * Qué imagen representa a una tarea (feed, explorar, álbumes, añadir tareas,
 * Mi lista, calendario y perfiles).
 *
 * Regla por defecto (`thumbnail_mode = 'auto'`):
 *   1. la foto subida más reciente,
 *   2. si no hay fotos, la portada (`cover_image`),
 *   3. si tampoco hay portada → `null`, y `BucketCover` dibuja un degradado propio por tarea.
 *
 * El usuario puede forzar la portada (`'cover'`) o fijar una foto concreta (`'photo'`).
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
 * `null` significa "degradado automático".
 */
export function resolveTaskImage(
  task: TaskImageSource | null | undefined,
  options: ResolveTaskImageOptions = {},
): string | null {
  if (!task) return null;
  const photos = task.bucket_photos ?? [];
  const cover = task.cover_image || null;

  if (task.thumbnail_mode === 'cover' && cover) return cover;

  if (task.thumbnail_mode === 'photo' && task.thumbnail_photo_id) {
    const chosen = photos.find((p) => p.id === task.thumbnail_photo_id && !!p.storage_path);
    if (chosen) return photoValue(chosen, options.preferThumb);
    // La foto elegida ya no existe → vuelve a automático.
  }

  const latest = latestPhoto(photos);
  if (latest) return photoValue(latest, options.preferThumb);
  return cover;
}
