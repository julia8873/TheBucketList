import type { DailyTask, DailyTag, DailySortField, DailySortDirection } from '../types';
import { PRIORITY_WEIGHT } from '../constants';

export function sortDailyTasks(
  items: DailyTask[],
  sortField: DailySortField,
  sortDirection: DailySortDirection
): DailyTask[] {
  if (sortField === 'manual') return items;

  return [...items].sort((a, b) => {
    if (sortField === 'priority') {
      const weightA = a.priority ? PRIORITY_WEIGHT[a.priority] : 2;
      const weightB = b.priority ? PRIORITY_WEIGHT[b.priority] : 2;
      const diff = sortDirection === 'desc' ? weightB - weightA : weightA - weightB;
      if (diff !== 0) return diff;
      return a.title.localeCompare(b.title, 'es', { sensitivity: 'base' });
    }

    if (sortField === 'name') {
      const comp = a.title.localeCompare(b.title, 'es', { sensitivity: 'base' });
      return sortDirection === 'asc' ? comp : -comp;
    }

    if (sortField === 'date') {
      const dateA = a.due_date || '9999-12-31';
      const dateB = b.due_date || '9999-12-31';
      const comp = dateA.localeCompare(dateB);
      return sortDirection === 'asc' ? comp : -comp;
    }

    if (sortField === 'created_at') {
      const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
      const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
      return sortDirection === 'asc' ? ta - tb : tb - ta;
    }

    return 0;
  });
}

export function groupDailyTasksByTag(
  items: DailyTask[],
  userTags: DailyTag[]
): { id: string; tag: DailyTag | null; tasks: DailyTask[] }[] {
  const groups: { id: string; tag: DailyTag | null; tasks: DailyTask[] }[] = [];
  const tagGroupsMap = new Map<string, DailyTask[]>();
  const untagged: DailyTask[] = [];

  userTags.forEach((tag) => {
    tagGroupsMap.set(tag.id, []);
  });

  items.forEach((task) => {
    const firstTagId = task.tag_ids && task.tag_ids.length > 0 ? task.tag_ids[0] : null;
    if (firstTagId && tagGroupsMap.has(firstTagId)) {
      tagGroupsMap.get(firstTagId)!.push(task);
    } else {
      untagged.push(task);
    }
  });

  userTags.forEach((tag) => {
    const groupTasks = tagGroupsMap.get(tag.id) || [];
    if (groupTasks.length > 0) {
      groups.push({ id: tag.id, tag, tasks: groupTasks });
    }
  });

  if (untagged.length > 0) {
    groups.push({ id: 'untagged', tag: null, tasks: untagged });
  }

  return groups;
}
