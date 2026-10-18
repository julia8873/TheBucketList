export type CoverAspectRatio = '1:1' | '16:9' | '3:4';

export type Cover = {
  id: string;
  type: 'gradient' | 'solid' | 'image';
  colors?: readonly [string, string, ...string[]];
  diagonal?: boolean;
  uri?: string;
  aspectRatio?: CoverAspectRatio;
};

export const COVERS: Cover[] = [
  { id: 'aurora', type: 'gradient', colors: ['#0E4B43', '#1F8560'] },
  { id: 'atardecer', type: 'gradient', colors: ['#F4A460', '#C8602F'] },
  { id: 'cielo', type: 'gradient', colors: ['#3A78C4', '#8CC8F4'] },
  { id: 'violeta', type: 'gradient', colors: ['#5B2F98', '#2E1A5E'] },
  { id: 'dorado', type: 'gradient', colors: ['#3A2F18', '#5E4E1F'], diagonal: true },
];

export const SOLID_COVERS: Cover[] = [
  { id: 'rojo', type: 'solid', colors: ['#E53935', '#E53935'] },
  { id: 'azul', type: 'solid', colors: ['#1E88E5', '#1E88E5'] },
  { id: 'verde', type: 'solid', colors: ['#43A047', '#43A047'] },
  { id: 'amarillo', type: 'solid', colors: ['#FDD835', '#FDD835'] },
  { id: 'morado', type: 'solid', colors: ['#8E24AA', '#8E24AA'] },
];

export type AlbumPriority = 'low' | 'medium' | 'high';
export type AlbumVisibility = 'public' | 'followers' | 'private';
