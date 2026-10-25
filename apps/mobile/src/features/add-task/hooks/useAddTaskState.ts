import { Alert, confirm } from '@bucketlist/ui';
import { useState, useMemo, useEffect, useRef } from 'react';
import { ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from '@bucketlist/shared';
import { supabase } from '../../../services/supabase';
import {
  useUnassignedTasks,
  useAssignTasks,
  useCreateTasksFromDefaults,
  defaultTasks,
  type UnassignedTask,
} from '../../../services/api/tasksService';
import { useTags, useTagUsage, type Tag } from '../../../hooks/useTags';

export function useAddTaskState(albumId?: string) {
  const { t } = useTranslation();
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: userTasksData, isLoading, isError } = useUnassignedTasks(
    albumId && albumId !== 'new' ? albumId : undefined
  );
  const { data: albumData } = useQuery({
    queryKey: ['album', albumId],
    queryFn: async () => {
      if (!albumId || albumId === 'new') return null;
      const { data } = await supabase
        .from('albums')
        .select('id, title, visibility')
        .eq('id', albumId)
        .maybeSingle();
      return data;
    },
    enabled: !!albumId && albumId !== 'new',
  });
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

    const userSelectedTasks = userTasks.filter((t) => selectedIds.has(t.id));
    const userSelectedIds = userSelectedTasks.map((t) => t.id);
    const defaultSelected = availableDefaultTasks
      .filter((t) => selectedIds.has(t.id))
      .map((t) => t.id);

    const executeAdd = async (syncVisibility?: 'public' | 'followers' | 'private') => {
      try {
        let newIds: string[] = [];
        if (defaultSelected.length > 0) {
          newIds = await createMutation.mutateAsync({
            ids: defaultSelected,
            visibility: syncVisibility || (albumVisibility || 'public'),
          });
        }

        await queryClient.invalidateQueries({ queryKey: ['buckets'] });
        await queryClient.invalidateQueries({ queryKey: ['unassigned_tasks'] });

        if (!albumId || albumId === 'new') {
          handleBack();
          return;
        }

        await assignMutation.mutateAsync({
          albumId,
          taskIds: [...userSelectedIds, ...newIds],
          updateVisibility: syncVisibility,
        });
        handleBack();
      } catch (err: any) {
        Alert.alert('Error', err?.message || 'No se pudieron añadir las tareas');
      }
    };

    const albumVisibility = albumData?.visibility as 'public' | 'followers' | 'private' | undefined;

    // Si hay álbum con visibilidad definida, comprobamos si alguna tarea difiere de la privacidad del álbum
    if (albumId && albumId !== 'new' && albumVisibility) {
      const tasksWithDifferentVis = userSelectedTasks.filter(
        (t) => t.visibility && t.visibility !== albumVisibility
      );

      // Si hay tareas existentes o por defecto con distinta privacidad que el álbum
      if (tasksWithDifferentVis.length > 0 || (defaultSelected.length > 0 && albumVisibility !== 'public')) {
        const visLabels: Record<string, string> = {
          private: t('albums.visibility_private').toLowerCase(),
          followers: t('albums.visibility_followers').toLowerCase(),
          public: t('albums.visibility_public').toLowerCase(),
        };
        const visLabel = visLabels[albumVisibility] || albumVisibility;
        const count = tasksWithDifferentVis.length + (albumVisibility !== 'public' ? defaultSelected.length : 0);
        const isPlural = count > 1;

        const title = isPlural
          ? t('add_task.change_vis_title_plural')
          : t('add_task.change_vis_title_single');
        const message = isPlural
          ? t('add_task.change_vis_msg_plural', { count, visLabel })
          : t('add_task.change_vis_msg_single', { visLabel });

        confirm.show({
          title,
          message,
          actions: [
            {
              label: t('add_task.set_to_vis', { visLabel }),
              onPress: () => void executeAdd(albumVisibility),
            },
            {
              label: t('add_task.keep_current'),
              style: 'cancel',
              onPress: () => void executeAdd(undefined),
            },
          ],
        });
        return;
      }
    }

    await executeAdd(undefined);
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
