export interface CollectionTask {
  title: string;
  description?: string;
  category_slug?: string;
  priority?: 'low' | 'medium' | 'high';
}

export interface CollectionAuthor {
  name: string;
  isOfficial?: boolean;
  avatar_url?: string;
  user_id?: string;
}

export interface CollectionItem {
  id: string;
  title: string;
  description: string;
  category: string; // 'seasonal' | 'gaming' | 'travel' | 'lifestyle' | 'culture' | 'food' | 'general'
  badge: string;
  emoji: string;
  cover_path: string; // JSON gradient string or image URI
  gradientColors: [string, string, ...string[]];
  author: CollectionAuthor;
  tasks: CollectionTask[];
  tags?: string[];
  clonesCount?: number;
  likesCount?: number;
  isLiked?: boolean;
}
