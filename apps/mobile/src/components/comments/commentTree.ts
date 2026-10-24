/**
 * Árbol de comentarios de una tarea o un álbum.
 *
 * En base de datos cada respuesta apunta a su comentario padre (`parent_id`), y ese padre puede ser
 * a su vez otra respuesta. Para que los hilos no se salgan por la derecha, en pantalla todas las
 * respuestas de un hilo se muestran en UN solo nivel debajo del comentario raíz (ordenadas por
 * fecha). Antes solo se pintaban las respuestas directas al comentario raíz, así que las
 * respuestas a respuestas desaparecían aunque el contador sí las contara.
 */

export interface CommentThread {
  /** Comentario principal (sin padre, o cuyo padre ya no existe). */
  root: any;
  /** Todas las respuestas del hilo (directas e indirectas), de la más antigua a la más reciente. */
  replies: any[];
  /** Marca de tiempo del último mensaje del hilo (para mostrar los hilos más recientes). */
  lastActivity: number;
}

const time = (c: any): number => {
  const t = c?.created_at ? new Date(c.created_at).getTime() : 0;
  return Number.isNaN(t) ? 0 : t;
};

/** Devuelve el id del comentario raíz del hilo al que pertenece `commentId`. */
export function findRootId(comments: any[], commentId: string): string {
  const byId = new Map<string, any>();
  comments.forEach((c) => byId.set(c.id, c));

  let current = byId.get(commentId);
  if (!current) return commentId;
  const visited = new Set<string>([current.id]);
  while (current.parent_id && byId.has(current.parent_id)) {
    if (visited.has(current.parent_id)) break; // protección frente a ciclos
    visited.add(current.parent_id);
    current = byId.get(current.parent_id);
  }
  return current.id;
}

/** Agrupa los comentarios en hilos: raíz + respuestas aplanadas a un único nivel. */
export function buildCommentThreads(comments: any[]): CommentThread[] {
  const byId = new Map<string, any>();
  comments.forEach((c) => byId.set(c.id, c));

  const rootIdOf = (c: any): string => {
    let current = c;
    const visited = new Set<string>([current.id]);
    while (current.parent_id && byId.has(current.parent_id)) {
      if (visited.has(current.parent_id)) break;
      visited.add(current.parent_id);
      current = byId.get(current.parent_id);
    }
    return current.id;
  };

  const threads = new Map<string, CommentThread>();
  // Primero las raíces (en el orden recibido, que ya es cronológico)
  comments.forEach((c) => {
    if (rootIdOf(c) === c.id) {
      threads.set(c.id, { root: c, replies: [], lastActivity: time(c) });
    }
  });
  // Después todas las respuestas, colgadas de su raíz
  comments.forEach((c) => {
    const rootId = rootIdOf(c);
    if (rootId === c.id) return;
    const thread = threads.get(rootId);
    if (!thread) return;
    thread.replies.push(c);
    thread.lastActivity = Math.max(thread.lastActivity, time(c));
  });

  const list = Array.from(threads.values());
  list.forEach((t) => t.replies.sort((a, b) => time(a) - time(b)));
  list.sort((a, b) => time(a.root) - time(b.root));
  return list;
}
