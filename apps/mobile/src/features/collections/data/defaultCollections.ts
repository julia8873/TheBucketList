import type { CollectionItem } from '../types';
import { COLLECTION_BASES, DEFAULT_COLLECTION_IDS } from './collectionsBase';
import { en } from './locales/en';
import { es } from './locales/es';
import type { CollectionTexts } from './locales/types';

/**
 * Registry of languages with default collections.
 * To add a language: create ./locales/<lang>.ts (type CollectionTexts) and register it here.
 */
const LOCALES = new Map<string, CollectionTexts>([
  ['es', es],
  ['en', en],
]);

/** Used when the app language has no collections translated (same as the i18n fallback). */
export const FALLBACK_COLLECTIONS_LANG = 'en';

const PRIORITY = { h: 'high', m: 'medium', l: 'low' } as const;

/** 'es-ES' -> 'es'. Returns the fallback language when there is no translation. */
export function resolveCollectionsLang(lang?: string): string {
  const base = (lang ?? '').toLowerCase().split('-')[0] ?? '';
  return LOCALES.has(base) ? base : FALLBACK_COLLECTIONS_LANG;
}

function build(texts: CollectionTexts): CollectionItem[] {
  return DEFAULT_COLLECTION_IDS.map((id) => {
    const base = COLLECTION_BASES[id];
    const text = texts[id];
    return {
      id,
      title: text.title,
      description: text.description,
      category: base.category,
      badge: text.badge,
      emoji: base.emoji,
      gradientColors: base.gradientColors,
      cover_path: JSON.stringify({ type: 'gradient', colors: base.cover, diagonal: true }),
      author: { name: 'TheBucketList', isOfficial: true },
      clonesCount: 0,
      likesCount: 0,
      tags: text.tags,
      tasks: text.tasks.map(([title, description, priority]) => ({
        title,
        description,
        priority: PRIORITY[priority],
      })),
    };
  });
}

const cache = new Map<string, CollectionItem[]>();

export function getDefaultCollections(lang?: string): CollectionItem[] {
  const resolved = resolveCollectionsLang(lang);
  let list = cache.get(resolved);
  if (!list) {
    list = build(LOCALES.get(resolved) ?? es);
    cache.set(resolved, list);
  }
  return list;
}
