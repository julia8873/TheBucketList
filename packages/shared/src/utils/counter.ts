/**
 * Devuelve la etiqueta a mostrar para el contador de una tarea.
 * Si el usuario no especificó etiqueta, o dejó el valor por defecto "counts" / "count" / "veces":
 *  - En español: "vez" (1) o "veces" (≠ 1).
 *  - En inglés: "count" (1) o "counts" (≠ 1).
 * Si el usuario escribió una etiqueta personalizada (ej. "km", "libros"), se respeta tal cual.
 */
export function resolveCounterLabel(
  rawLabel?: string | null,
  count: number = 0,
  lang: string = 'es'
): string {
  const trimmed = rawLabel?.trim();
  const isEn = typeof lang === 'string' && lang.startsWith('en');
  if (
    !trimmed ||
    trimmed.toLowerCase() === 'counts' ||
    trimmed.toLowerCase() === 'count' ||
    trimmed.toLowerCase() === 'veces' ||
    trimmed.toLowerCase() === 'vez'
  ) {
    if (isEn) {
      return count === 1 ? 'count' : 'counts';
    }
    return count === 1 ? 'vez' : 'veces';
  }
  return trimmed;
}

