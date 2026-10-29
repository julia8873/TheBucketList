/** "Marta Ruiz" → "MR", "martaruiz" → "MA". */
export function initialsOf(person?: { display_name?: string | null; username?: string | null } | null): string {
  const source = (person?.display_name || person?.username || '?').trim();
  const words = source.split(/\s+/).filter(Boolean);
  if (words.length >= 2) return `${words[0]!.charAt(0)}${words[1]!.charAt(0)}`.toUpperCase();
  const subParts = source.split(/[._-]+/).filter(Boolean);
  if (subParts.length >= 2) return `${subParts[0]!.charAt(0)}${subParts[1]!.charAt(0)}`.toUpperCase();
  return source.slice(0, 2).toUpperCase();
}

export function displayNameOf(person?: { display_name?: string | null; username?: string | null } | null): string {
  return person?.display_name || person?.username || '';
}
