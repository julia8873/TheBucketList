import type { CollectionItem } from '../types';

/**
 * Language-independent part of the default collections (ids, category, emoji and colors).
 * The texts live in ./locales/<lang>.ts. To add a collection: add its id here, its base
 * below and a text entry in EVERY locale file (TypeScript will complain if one is missing).
 */
export const DEFAULT_COLLECTION_IDS = [
  'collection-halloween',
  'collection-navidad',
  'collection-switch',
  'collection-indies-switch',
  'collection-viajes',
  'collection-espana',
  'collection-libros',
  'collection-cine',
  'collection-series',
  'collection-cultura',
  'collection-cocina',
  'collection-aire-libre',
  'collection-deporte',
  'collection-dinero',
  'collection-habilidades',
  'collection-amigos',
  'collection-pareja',
  'collection-verano',
] as const;

export type DefaultCollectionId = (typeof DEFAULT_COLLECTION_IDS)[number];

export interface CollectionBase {
  category: string;
  emoji: string;
  /** Colors used by the card gradient. */
  gradientColors: CollectionItem['gradientColors'];
  /** Colors used by the cover (stored as JSON in cover_path). */
  cover: string[];
}

export const COLLECTION_BASES: Record<DefaultCollectionId, CollectionBase> = {
  'collection-halloween': {
    category: 'seasonal',
    emoji: '🎃',
    gradientColors: ['#2E0854', '#8A2BE2', '#E65C00'],
    cover: ['#1A002C', '#3A0C53', '#E65C00'],
  },
  'collection-navidad': {
    category: 'seasonal',
    emoji: '🎄',
    gradientColors: ['#0A2E1C', '#1E5E3A', '#9B1B1B'],
    cover: ['#0A2E1C', '#1B4D3E', '#8B1E1E'],
  },
  'collection-switch': {
    category: 'gaming',
    emoji: '🎮',
    gradientColors: ['#E60012', '#99000D', '#009AC7'],
    cover: ['#E60012', '#222222', '#009AC7'],
  },
  'collection-indies-switch': {
    category: 'gaming',
    emoji: '🕹️',
    gradientColors: ['#1B1F3B', '#3F3C8F', '#46C2CB'],
    cover: ['#12142B', '#2D2B6B', '#2A8F9A'],
  },
  'collection-viajes': {
    category: 'travel',
    emoji: '✈️',
    gradientColors: ['#0B2545', '#134074', '#D4AF37'],
    cover: ['#0B2545', '#134074', '#3E78B2'],
  },
  'collection-espana': {
    category: 'travel',
    emoji: '🇪🇸',
    gradientColors: ['#7A1F1F', '#C0392B', '#F1C40F'],
    cover: ['#4A0F0F', '#9C2B22', '#D9A21B'],
  },
  'collection-libros': {
    category: 'culture',
    emoji: '📚',
    gradientColors: ['#3A1C0A', '#6B3E26', '#D4B13A'],
    cover: ['#2B1408', '#4E2B16', '#A3683A'],
  },
  'collection-cine': {
    category: 'culture',
    emoji: '🎬',
    gradientColors: ['#1A1A1A', '#5C1A1A', '#C9A227'],
    cover: ['#0D0D0D', '#3A1010', '#8C6D12'],
  },
  'collection-series': {
    category: 'culture',
    emoji: '📺',
    gradientColors: ['#0F2027', '#203A43', '#2C5364'],
    cover: ['#0B1519', '#17303A', '#244C5E'],
  },
  'collection-cultura': {
    category: 'culture',
    emoji: '🎭',
    gradientColors: ['#2B2D42', '#8D5A97', '#EDC7B7'],
    cover: ['#1B1C2B', '#5F3D66', '#B58F82'],
  },
  'collection-cocina': {
    category: 'food',
    emoji: '🍳',
    gradientColors: ['#3D1E0B', '#8C4318', '#E69500'],
    cover: ['#2E1508', '#632B0F', '#B36224'],
  },
  'collection-aire-libre': {
    category: 'lifestyle',
    emoji: '🥾',
    gradientColors: ['#0F3D2E', '#2E7D4F', '#A8D08D'],
    cover: ['#0A2A20', '#1E5A38', '#6FA36A'],
  },
  'collection-deporte': {
    category: 'lifestyle',
    emoji: '🏃',
    gradientColors: ['#7A1E00', '#E4572E', '#FFB400'],
    cover: ['#4F1300', '#B53D1B', '#D98F00'],
  },
  'collection-dinero': {
    category: 'lifestyle',
    emoji: '💶',
    gradientColors: ['#0B3B2E', '#16795B', '#D4AF37'],
    cover: ['#08291F', '#0F5640', '#A38A2B'],
  },
  'collection-habilidades': {
    category: 'lifestyle',
    emoji: '🛠️',
    gradientColors: ['#1F2A44', '#3D5A99', '#F2A541'],
    cover: ['#141C30', '#2B4170', '#C47F20'],
  },
  'collection-amigos': {
    category: 'general',
    emoji: '👯',
    gradientColors: ['#3B1C5A', '#A23B72', '#F18F01'],
    cover: ['#26113C', '#7A2B55', '#C26E00'],
  },
  'collection-pareja': {
    category: 'general',
    emoji: '❤️',
    gradientColors: ['#4A0E2E', '#B83B5E', '#F6A5B8'],
    cover: ['#2F081D', '#8A2A45', '#D17B8C'],
  },
  'collection-verano': {
    category: 'seasonal',
    emoji: '☀️',
    gradientColors: ['#0077B6', '#00B4D8', '#FFD166'],
    cover: ['#014F7A', '#0090B0', '#E0A82E'],
  },
};
