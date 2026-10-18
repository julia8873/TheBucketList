export type FilterType = 'all' | 'active' | 'in_progress' | 'completed' | 'expired' | 'public';
export type AlbumFilterType = 'all' | 'active' | 'completed' | 'closed';
export type PriorityFilter = 'all' | 'high' | 'medium' | 'low';
export type SortField = 'manual' | 'status' | 'priority' | 'alphabetical' | 'created_at';
export type SortDir = 'asc' | 'desc';
export type TaskViewMode = 'list' | 'gallery' | 'compact';
export type AlbumViewMode = 'gallery' | 'list' | 'compact';

export interface SortOptionItem {
  field: SortField;
  label: string;
}
