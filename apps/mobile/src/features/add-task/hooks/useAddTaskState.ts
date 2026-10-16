import { useState, useMemo, useEffect, useRef } from 'react';
import { ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import {
  useUnassignedTasks,
  useAssignTasks,
  useCreateTasksFromDefaults,
  defaultTasks,
  type UnassignedTask,
} from '../../../services/api/tasksService';
import { useTags, useTagUsage, type Tag } from '../../../hooks/useTags';

export function useAddTaskState(albumId?: string) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: userTasksData, isLoading, isError } = useUnassignedTasks(
    albumId && albumId !== 'new' ? albumId : undefined
  );
  const assignMutation = useAssignTasks();
  const createMutation = useCreateTasksFromDefaults();

  const [activeTab, setActiveTab] = useState<'user' | 'default'>('user');
  const [search, setSearch] = useState('');
  const [tagSheetOpen, setTagSheetOpen] = useState(false);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const { data: allTags = [] } = useTags();
  const { data: tagUsage } = useTagUsage();

  const tagsById = useMemo(() => {
    const map = new Map<string, Tag>();
    allTags.forEach((t) => map.set(t.id, t));
    return map;
  }, [allTags]);

  useEffect(() => {
    if (!allTags || allTags.length === 0) return;
    setSelectedTagIds((prev) => {
      const next = prev.filter((id) => tagsById.has(id));
      return next.length === prev.length ? prev : next;
    });
  }, [allTags, tagsById]);

  const selectedTags = useMemo(
    () => selectedTagIds.map((id) => tagsById.get(id)).filter(Boolean) as Tag[],
    [selectedTagIds, tagsById]
  );

  const scrollViewRef = useRef<ScrollView>(null);

  const availableDefaultTasks = useMemo(() => {
    if (!userTasksData) return defaultTasks;
    const userTitles = new Set(userTasksData.map((t) => t.title.toLowerCase().trim()));
    return defaultTasks.filter((dt) => !userTitles.has(dt.title.toLowerCase().trim()));
  }, [userTasksData]);

  const userTasks = useMemo(
    () => (userTasksData ?? []).filter((t) => !t.inAlbum),
    [userTasksData]
  );

  useEffect(() => {
    if (userTasksData && userTasks.length === 0) {
      setActiveTab('default');
    }
  }, [userTasksData, userTasks.length]);

  const handleTabChange = (tab: 'user' | 'default') => {
    if (activeTab === tab) return;
    setActiveTab(tab);
    scrollViewRef.current?.scrollTo({ y: 0, animated: false });
  };

  const getVisibleTasks = (tasks: UnassignedTask[]) => {
    return tasks.filter((t) => {
      const matchSearch = t.title
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .includes(
          search
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
        );
      if (!matchSearch) return false;

      if (selectedTagIds.length === 0) return true;

      if (t.isDefault) {
        return selectedTags.some(
          (tag) => tag.name.toLowerCase() === t.categoryName?.toLowerCase()
        );
      }

      const taskTagIds = tagUsage?.byItem[t.id] ?? [];
      return selectedTagIds.some((id) => taskTagIds.includes(id));
    });
  };

  const visibleUserTasks = useMemo(
    () => getVisibleTasks(userTasks),
    [userTasks, search, selectedTagIds, tagUsage, selectedTags]
  );
  const visibleDefaultTasks = useMemo(
    () => getVisibleTasks(availableDefaultTasks),
    [availableDefaultTasks, search, selectedTagIds, selectedTags]
  );

  const currentVisibleTasks = activeTab === 'user' ? visibleUserTasks : visibleDefaultTasks;
  const currentTotal = activeTab === 'user' ? userTasks.length : availableDefaultTasks.length;

  const userSelectedCount = userTasks.filter((t) => selectedIds.has(t.id)).length;
  const defaultSelectedCount = availableDefaultTasks.filter((t) => selectedIds.has(t.id)).length;

  const allVisibleSelected =
    currentVisibleTasks.length > 0 && currentVisibleTasks.every((t) => selectedIds.has(t.id));

  const toggleSelectAll = () => {
    const newSet = new Set(selectedIds);
    if (allVisibleSelected) {
      currentVisibleTasks.forEach((t) => newSet.delete(t.id));
    } else {
      currentVisibleTasks.forEach((t) => newSet.add(t.id));
    }
    setSelectedIds(newSet);
  };

  const toggleTask = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/my-list');
    }
  };

  const handleCreateTask = () => {
    const title = search.trim();
    const params = new URLSearchParams();
    if (albumId && albumId !== 'new') params.set('albumId', albumId);
    if (title) params.set('title', title);
    const qs = params.toString();
    const href = `/(modals)/create-bucket${qs ? `?${qs}` : ''}` as any;
    if (albumId && albumId !== 'new') router.replace(href);
    else router.push(href);
  };

  const handleAdd = async () => {
    if (selectedIds.size === 0) return;

    try {
      const userSelected = userTasks.filter((t) => selectedIds.has(t.id)).map((t) => t.id);
      const defaultSelected = availableDefaultTasks
        .filter((t) => selectedIds.has(t.id))
        .map((t) => t.id);

      let newIds: string[] = [];
      if (defaultSelected.length > 0) {
        newIds = await createMutation.mutateAsync(defaultSelected);
      }

      await queryClient.invalidateQueries({ queryKey: ['buckets'] });
      await queryClient.invalidateQueries({ queryKey: ['unassigned_tasks'] });

      if (!albumId || albumId === 'new') {
        handleBack();
        return;
      }

      await assignMutation.mutateAsync({ albumId, taskIds: [...userSelected, ...newIds] });
      handleBack();
    } catch (err) {
      Alert.alert('Error', 'No se pudieron añadir las tareas');
    }
  };

  const isPending = assignMutation.isPending || createMutation.isPending;

  return {
    activeTab,
    handleTabChange,
    search,
    setSearch,
    tagSheetOpen,
    setTagSheetOpen,
    selectedTagIds,
    setSelectedTagIds,
    selectedTags,
    selectedIds,
    isLoading,
    currentVisibleTasks,
    currentTotal,
    userSelectedCount,
    defaultSelectedCount,
    allVisibleSelected,
    toggleSelectAll,
    toggleTask,
    handleBack,
    handleCreateTask,
    handleAdd,
    isPending,
    scrollViewRef,
  };
}
