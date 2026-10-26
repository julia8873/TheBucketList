import type { DefaultCollectionId } from '../collectionsBase';

export type TaskPriority = 'h' | 'm' | 'l';

/** [title, description, priority] — h = high, m = medium, l = low */
export type CollectionTaskText = [title: string, description: string, priority: TaskPriority];

export interface CollectionText {
  title: string;
  description: string;
  badge: string;
  tags: string[];
  tasks: CollectionTaskText[];
}

/** One entry per default collection. A missing id is a compile error. */
export type CollectionTexts = Record<DefaultCollectionId, CollectionText>;
