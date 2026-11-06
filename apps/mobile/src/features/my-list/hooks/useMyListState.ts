import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import type { View} from 'react-native';
import { Dimensions } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery } from '@tanstack/react-query';
import { isPast, differenceInCalendarDays } from 'date-fns';
import { useLocalSearchParams } from 'expo-router';
import type { Swipeable } from 'react-native-gesture-handler';

import { useBuckets, useDeleteBucket, useUpdateBucket } from '@/hooks/useBuckets';
import { useAlbums } from '@/hooks/useAlbums';
import { useUserFavorites, useToggleFavoriteAlbum, useToggleFavoriteBucket } from '@/hooks/useFavorites';
import { useAuthStore } from '@/stores/auth.store';
import { useMyListCustomizationStore } from '@/stores/myListCustomization.store';
import { usePullToRefresh } from '@/hooks/useAutoRefresh';
import { supabase } from '@/services/supabase';
import type { Tag } from '@/hooks/useTags';
import { useTags, useTagUsage } from '@/hooks/useTags';
import { useItemParticipants, type ItemParticipant } from '@/hooks/useItemParticipants';
import { useToast } from '@bucketlist/ui';
import { useTranslation } from 'react-i18next';

import type {
  FilterType,
  AlbumFilterType,
  PriorityFilter,
  SortField,
  SortDir,
  TaskViewMode,
  AlbumViewMode,
} from '../types';

export function useMyListState() {
  const { user } = useAuthStore();
  const { t } = useTranslation();
  const toast = useToast();
  const { taskGroupByStatus, albumGroupByStatus } = useMyListCustomizationStore();
  const params = useLocalSearchParams<{ filter?: string; tab?: string; from?: string }>();

  const [activeTab, setActiveTabState] = useState(
    params.tab === 'albums' || params.tab === 'calendar' || params.tab === 'list'
      ? params.tab
      : 'list'
  );
  const setActiveTab = (tab: any) => {
    setActiveTabState(tab);
    void AsyncStorage.setItem('@my_list_active_tab', tab).catch(() => undefined);
    if (tab !== 'list') {
      setIsSelectionMode(false);
      setSelectedTaskIds([]);
    }
    if (tab !== 'albums') {
      setIsAlbumSelectionMode(false);
      setSelectedAlbumIds([]);
    }
  };

  const [filter, setFilterState] = useState<FilterType>(
    params.filter === 'completed' ||
    params.filter === 'active' ||
    params.filter === 'in_progress' ||
    params.filter === 'expired' ||
    params.filter === 'public'
      ? (params.filter as FilterType)
      : 'all'
  );
  const setFilter = (f: FilterType) => {
    setFilterState(f);
    void AsyncStorage.setItem('@my_list_filter', f).catch(() => undefined);
  };

  const [priorityFilter, setPriorityFilterState] = useState<PriorityFilter>('all');
  const setPriorityFilter = (action: React.SetStateAction<PriorityFilter>) => {
    setPriorityFilterState((prev) => {
      const next = typeof action === 'function' ? action(prev) : action;
      void AsyncStorage.setItem('@my_list_priority_filter', next).catch(() => undefined);
      return next;
    });
  };

  // Cargar preferencias iniciales si no vienen por parámetros de navegación
  useEffect(() => {
    if (!params.tab) {
      AsyncStorage.getItem('@my_list_active_tab')
        .then((saved) => {
          if (saved === 'list' || saved === 'albums' || saved === 'calendar') {
            setActiveTabState(saved);
          }
        })
        .catch(() => undefined);
    }
    if (!params.filter) {
      AsyncStorage.getItem('@my_list_filter')
        .then((saved) => {
          if (saved && ['all', 'completed', 'active', 'in_progress', 'expired', 'public'].includes(saved)) {
            setFilterState(saved as FilterType);
          }
        })
        .catch(() => undefined);
    }
    AsyncStorage.getItem('@my_list_priority_filter')
      .then((saved) => {
        if (saved && ['all', 'high', 'medium', 'low'].includes(saved)) {
          setPriorityFilterState(saved as PriorityFilter);
        }
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (params.tab && (params.tab === 'list' || params.tab === 'albums' || params.tab === 'calendar')) {
      setActiveTabState(params.tab);
    }
  }, [params.tab]);

  useEffect(() => {
    if (
      params.filter === 'completed' ||
      params.filter === 'active' ||
      params.filter === 'in_progress' ||
      params.filter === 'expired' ||
      params.filter === 'public' ||
      params.filter === 'all'
    ) {
      setFilterState(params.filter as FilterType);
    }
  }, [params.filter]);

  // Task view mode (por defecto galería en v3)
  const VIEW_MODE_V3_KEY = '@my_list_default_v3_view_mode_migrated';
  const [taskViewMode, setTaskViewModeState] = useState<TaskViewMode>('gallery');
  useEffect(() => {
    (async () => {
      try {
        const migrated = await AsyncStorage.getItem(VIEW_MODE_V3_KEY);
        if (!migrated) {
          setTaskViewModeState('gallery');
          await AsyncStorage.setItem('@my_list_view_mode', 'gallery');
          await AsyncStorage.setItem('@my_list_album_view_mode', 'gallery');
          await AsyncStorage.setItem(VIEW_MODE_V3_KEY, 'true');
          return;
        }
        const saved = await AsyncStorage.getItem('@my_list_view_mode');
        if (saved === 'list' || saved === 'gallery' || saved === 'compact') {
          setTaskViewModeState(saved as TaskViewMode);
        }
      } catch {}
    })();
  }, []);

  const setTaskViewMode = (mode: TaskViewMode) => {
    setTaskViewModeState(mode);
    AsyncStorage.setItem('@my_list_view_mode', mode).catch(() => undefined);
  };

  // Selection mode
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);

  const toggleSelectTask = (id: string) => {
    setSelectedTaskIds((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      if (next.length === 0) {
        setIsSelectionMode(false);
      }
      return next;
    });
  };

  const lastExitTaskSelectionTimeRef = useRef(0);
  const handleExitSelection = () => {
    lastExitTaskSelectionTimeRef.current = Date.now();
    setIsSelectionMode(false);
    setSelectedTaskIds([]);
  };

  // Album Selection mode
  const [isAlbumSelectionMode, setIsAlbumSelectionMode] = useState(false);
  const [selectedAlbumIds, setSelectedAlbumIds] = useState<string[]>([]);
  const lastExitAlbumSelectionTimeRef = useRef(0);

  const toggleSelectAlbum = (id: string) => {
    setSelectedAlbumIds((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      if (next.length === 0) {
        setIsAlbumSelectionMode(false);
      }
      return next;
    });
  };

  const handleExitAlbumSelection = () => {
    lastExitAlbumSelectionTimeRef.current = Date.now();
    setIsAlbumSelectionMode(false);
    setSelectedAlbumIds([]);
  };

  // Album view mode
  const [albumViewMode, setAlbumViewModeState] = useState<AlbumViewMode>('gallery');
  useEffect(() => {
    AsyncStorage.getItem('@my_list_album_view_mode')
      .then((saved) => {
        if (saved === 'list' || saved === 'gallery' || saved === 'compact') {
          setAlbumViewModeState(saved as AlbumViewMode);
        }
      })
      .catch(() => undefined);
  }, []);

  const setAlbumViewMode = (mode: AlbumViewMode) => {
    setAlbumViewModeState(mode);
    AsyncStorage.setItem('@my_list_album_view_mode', mode).catch(() => undefined);
  };

  const [albumFilter, setAlbumFilterState] = useState<AlbumFilterType>('all');
  const setAlbumFilter = (af: AlbumFilterType) => {
    setAlbumFilterState(af);
    void AsyncStorage.setItem('@my_list_album_filter', af).catch(() => undefined);
  };

  const [albumPriorityFilter, setAlbumPriorityFilterState] = useState<PriorityFilter>('all');
  const setAlbumPriorityFilter = (action: React.SetStateAction<PriorityFilter>) => {
    setAlbumPriorityFilterState((prev) => {
      const next = typeof action === 'function' ? action(prev) : action;
      void AsyncStorage.setItem('@my_list_album_priority_filter', next).catch(() => undefined);
      return next;
    });
  };

  const [albumSortField, setAlbumSortField] = useState<SortField>('status');
  const [albumSortDir, setAlbumSortDir] = useState<SortDir>('desc');
  const albumSortTriggerRef = useRef<View>(null);
  const [albumManualOrder, setAlbumManualOrder] = useState<string[]>([]);
  const [isAlbumReordering, setIsAlbumReordering] = useState(false);
  const [albumDragging, setAlbumDragging] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    AsyncStorage.getItem(`@my_list_album_order_${user.id}`)
      .then((stored) => {
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed)) setAlbumManualOrder(parsed);
          } catch {}
        }
      })
      .catch(() => undefined);
  }, [user?.id]);

  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [tagSheetOpen, setTagSheetOpen] = useState(false);
  const [selectedTagIds, setSelectedTagIdsState] = useState<string[]>([]);
  const setSelectedTagIds = (action: React.SetStateAction<string[]>) => {
    setSelectedTagIdsState((prev) => {
      const next = typeof action === 'function' ? action(prev) : action;
      void AsyncStorage.setItem('@my_list_selected_tags', JSON.stringify(next)).catch(() => undefined);
      return next;
    });
  };

  const [selectedCollaboratorIds, setSelectedCollaboratorIdsState] = useState<string[]>([]);
  const setSelectedCollaboratorIds = (action: React.SetStateAction<string[]>) => {
    setSelectedCollaboratorIdsState((prev) => {
      const next = typeof action === 'function' ? action(prev) : action;
      void AsyncStorage.setItem('@my_list_selected_collaborators', JSON.stringify(next)).catch(() => undefined);
      return next;
    });
  };

  // Cargar filtros y ordenaciones guardadas de álbumes y tareas
  useEffect(() => {
    AsyncStorage.getItem('@my_list_album_filter')
      .then((saved) => {
        if (saved) setAlbumFilterState(saved as AlbumFilterType);
      })
      .catch(() => undefined);
    AsyncStorage.getItem('@my_list_album_priority_filter')
      .then((saved) => {
        if (saved) setAlbumPriorityFilterState(saved as PriorityFilter);
      })
      .catch(() => undefined);
    AsyncStorage.getItem('@my_list_selected_tags')
      .then((saved) => {
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed)) setSelectedTagIdsState(parsed);
          } catch {}
        }
      })
      .catch(() => undefined);
    AsyncStorage.getItem('@my_list_selected_collaborators')
      .then((saved) => {
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed)) setSelectedCollaboratorIdsState(parsed);
          } catch {}
        }
      })
      .catch(() => undefined);
    AsyncStorage.getItem('@my_list_sort_field')
      .then((saved) => {
        if (saved) setSortField(saved as SortField);
      })
      .catch(() => undefined);
    AsyncStorage.getItem('@my_list_sort_dir')
      .then((saved) => {
        if (saved) setSortDir(saved as SortDir);
      })
      .catch(() => undefined);
    AsyncStorage.getItem('@my_list_album_sort_field')
      .then((saved) => {
        if (saved) setAlbumSortField(saved as SortField);
      })
      .catch(() => undefined);
    AsyncStorage.getItem('@my_list_album_sort_dir')
      .then((saved) => {
        if (saved) setAlbumSortDir(saved as SortDir);
      })
      .catch(() => undefined);
  }, []);

  // Task sort
  const [sortField, setSortField] = useState<SortField>('status');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const [sortMenuPos, setSortMenuPos] = useState({ top: 0, right: 20, centerX: 0 });
  const sortTriggerRef = useRef<View>(null);
  const [dragging, setDragging] = useState(false);
  const [isReordering, setIsReordering] = useState(false);
  const [manualOrder, setManualOrder] = useState<string[]>([]);

  useEffect(() => {
    if (!user?.id) return;
    AsyncStorage.getItem(`@my_list_task_order_${user.id}`)
      .then((stored) => {
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed)) setManualOrder(parsed);
          } catch {}
        }
      })
      .catch(() => undefined);
  }, [user?.id]);

  const persistTaskOrder = async (orderedIds: string[], keepSortField = false) => {
    const currentSet = new Set(orderedIds);
    const remaining = manualOrder.filter((id) => !currentSet.has(id));
    const newOrder = [...orderedIds, ...remaining];
    setManualOrder(newOrder);
    if (!keepSortField && sortField !== 'manual' && sortField !== 'status') {
      setSortField('manual');
    }
    if (user?.id) {
      await AsyncStorage.setItem(`@my_list_task_order_${user.id}`, JSON.stringify(newOrder)).catch(() => undefined);
    }
  };

  const openSortMenu = () => {
    const triggerRef = activeTab === 'albums' ? albumSortTriggerRef : sortTriggerRef;
    triggerRef.current?.measureInWindow((x, y, w, h) => {
      setSortMenuPos({
        top: y + h + 6,
        right: Math.max(16, Dimensions.get('window').width - (x + w)),
        centerX: x + w / 2,
      });
      setSortMenuOpen(true);
    });
  };

  const handleSortOption = (field: SortField | 'reorder_status') => {
    if (activeTab === 'albums') {
      if (field === 'reorder_status') {
        setAlbumSortField('status');
        setIsAlbumReordering(true);
        setSortMenuOpen(false);
        return;
      }
      if (field === 'manual') {
        if (albumSortField === 'status') {
          setIsAlbumReordering(true);
          setSortMenuOpen(false);
          return;
        }
        setAlbumSortField('manual');
        setIsAlbumReordering(true);
        setSortMenuOpen(false);
        return;
      }
      setIsAlbumReordering(false);
      if (albumSortField === field) {
        const nextDir = albumSortDir === 'desc' ? 'asc' : 'desc';
        setAlbumSortDir(nextDir);
        void AsyncStorage.setItem('@my_list_album_sort_dir', nextDir).catch(() => undefined);
      } else {
        const nextDir = field === 'alphabetical' ? 'asc' : 'desc';
        setAlbumSortField(field as SortField);
        setAlbumSortDir(nextDir);
        void AsyncStorage.setItem('@my_list_album_sort_field', field).catch(() => undefined);
        void AsyncStorage.setItem('@my_list_album_sort_dir', nextDir).catch(() => undefined);
        setSortMenuOpen(false);
      }
    } else {
      if (field === 'reorder_status') {
        setSortField('status');
        void AsyncStorage.setItem('@my_list_sort_field', 'status').catch(() => undefined);
        setIsReordering(true);
        setSortMenuOpen(false);
        return;
      }
      if (field === 'manual') {
        if (sortField === 'status') {
          setIsReordering(true);
          setSortMenuOpen(false);
          return;
        }
        setSortField('manual');
        void AsyncStorage.setItem('@my_list_sort_field', 'manual').catch(() => undefined);
        setIsReordering(true);
        setSortMenuOpen(false);
        return;
      }
      setIsReordering(false);
      if (sortField === field) {
        const nextDir = sortDir === 'desc' ? 'asc' : 'desc';
        setSortDir(nextDir);
        void AsyncStorage.setItem('@my_list_sort_dir', nextDir).catch(() => undefined);
      } else {
        const nextDir = field === 'alphabetical' || field === 'deadline' ? 'asc' : 'desc';
        setSortField(field as SortField);
        setSortDir(nextDir);
        void AsyncStorage.setItem('@my_list_sort_field', field).catch(() => undefined);
        void AsyncStorage.setItem('@my_list_sort_dir', nextDir).catch(() => undefined);
        setSortMenuOpen(false);
      }
    }
  };

  const { refreshing, onRefresh } = usePullToRefresh();
  const { data: buckets, isLoading } = useBuckets(user?.id);
  const { isBucketFavorite, isAlbumFavorite, bucketIds: favBucketIds } = useUserFavorites(user?.id);
  const toggleFavoriteAlbum = useToggleFavoriteAlbum();
  const toggleFavoriteBucket = useToggleFavoriteBucket();
  const { data: allTags } = useTags();
  const { data: tagUsage } = useTagUsage();
  const deleteBucket = useDeleteBucket();
  const updateBucket = useUpdateBucket();
  const { data: albums, isLoading: isLoadingAlbums } = useAlbums(user?.id);
  const swipeableRefs = useRef(new Map<string, Swipeable>());

  const handleReorderSection = (sectionKey: string, orderedIds: string[]) => {
    const baseOrder = manualOrder.length > 0 ? manualOrder : (buckets || []).map((b: any) => b.id);
    const sectionSet = new Set(orderedIds);
    let replaceIdx = 0;
    const newOrder = baseOrder.map((id) => {
      if (sectionSet.has(id) && replaceIdx < orderedIds.length) {
        return orderedIds[replaceIdx++];
      }
      return id;
    });

    while (replaceIdx < orderedIds.length) {
      newOrder.push(orderedIds[replaceIdx++]);
    }

    const newOrderSet = new Set(newOrder);
    for (const id of orderedIds) {
      if (!newOrderSet.has(id)) {
        newOrder.push(id);
      }
    }

    void persistTaskOrder(newOrder, true);
  };

  const persistAlbumOrder = async (orderedIds: string[], keepSortField = false) => {
    const currentSet = new Set(orderedIds);
    const remaining = albumManualOrder.filter((id) => !currentSet.has(id));
    const newOrder = [...orderedIds, ...remaining];
    setAlbumManualOrder(newOrder);
    if (!keepSortField && albumSortField !== 'manual' && albumSortField !== 'status') {
      setAlbumSortField('manual');
    }
    if (user?.id) {
      await AsyncStorage.setItem(`@my_list_album_order_${user.id}`, JSON.stringify(newOrder)).catch(() => undefined);
    }
  };

  const handleReorderAlbumSection = (sectionKey: string, orderedIds: string[]) => {
    const baseOrder = albumManualOrder.length > 0 ? albumManualOrder : (albums || []).map((a: any) => a.id);
    const sectionSet = new Set(orderedIds);
    let replaceIdx = 0;
    const newOrder = baseOrder.map((id) => {
      if (sectionSet.has(id) && replaceIdx < orderedIds.length) {
        return orderedIds[replaceIdx++];
      }
      return id;
    });

    while (replaceIdx < orderedIds.length) {
      newOrder.push(orderedIds[replaceIdx++]);
    }

    const newOrderSet = new Set(newOrder);
    for (const id of orderedIds) {
      if (!newOrderSet.has(id)) {
        newOrder.push(id);
      }
    }

    void persistAlbumOrder(newOrder, true);
  };

  // Album items lookup
  const { data: albumItems } = useQuery({
    queryKey: ['albums', 'items', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('album_items')
        .select('album_id, bucket_id');
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
    placeholderData: (prev) => prev,
  });

  const unassignedCount = useMemo(() => {
    if (!buckets) return 0;
    const userAlbumIdSet = new Set((albums ?? []).map((a: any) => a.id));
    return buckets.filter((b: any) => {
      if (b.album_id && userAlbumIdSet.has(b.album_id)) return false;
      if (Array.isArray(b.album_items) && b.album_items.some((ai: any) => userAlbumIdSet.has(ai.album_id))) {
        return false;
      }
      if (albumItems && albumItems.length > 0) {
        const inUserAlbum = albumItems.some((ai: any) => ai.bucket_id === b.id && userAlbumIdSet.has(ai.album_id));
        if (inUserAlbum) return false;
      }
      return true;
    }).length;
  }, [buckets, albums, albumItems]);

  const totalCount = buckets?.length || 0;

  // Tags lookup
  const tagsById = useMemo(() => {
    const map = new Map<string, Tag>();
    (allTags ?? []).forEach((t) => map.set(t.id, t));
    return map;
  }, [allTags]);

  useEffect(() => {
    if (!allTags) return;
    setSelectedTagIds((prev) => {
      const next = prev.filter((id) => tagsById.has(id));
      return next.length === prev.length ? prev : next;
    });
  }, [allTags, tagsById]);

  const selectedTags = useMemo(
    () => selectedTagIds.map((id) => tagsById.get(id)).filter(Boolean) as Tag[],
    [selectedTagIds, tagsById]
  );

  // Participantes / colaboradores de las tareas de Mi lista
  const participantTaskSources = useMemo(
    () => (buckets ?? []).map((b: any) => ({ id: b.id as string, ownerId: (b.user_id as string | undefined) ?? null })),
    [buckets],
  );
  const taskParticipantsQuery = useItemParticipants('task', participantTaskSources, true);
  const taskParticipants = taskParticipantsQuery.data ?? {};

  const availableCollaborators = useMemo(() => {
    const map = new Map<string, ItemParticipant>();
    Object.values(taskParticipants).forEach((list) => {
      list.forEach((p) => {
        if (p.id !== user?.id && !map.has(p.id)) {
          map.set(p.id, p);
        }
      });
    });
    return Array.from(map.values()).sort((a, b) =>
      (a.display_name || a.username || '').localeCompare(b.display_name || b.username || '')
    );
  }, [taskParticipants, user?.id]);

  const selectedCollaborators = useMemo(() => {
    const map = new Map(availableCollaborators.map((c) => [c.id, c]));
    return selectedCollaboratorIds.map((id) => map.get(id)).filter(Boolean) as ItemParticipant[];
  }, [availableCollaborators, selectedCollaboratorIds]);

  const toggleCollaboratorFilter = useCallback((collabId: string) => {
    setSelectedCollaboratorIds((prev) =>
      prev.includes(collabId) ? prev.filter((id) => id !== collabId) : [...prev, collabId]
    );
  }, []);

  const removeCollaboratorFilter = useCallback((collabId: string) => {
    setSelectedCollaboratorIds((prev) => prev.filter((id) => id !== collabId));
  }, []);

  const toggleSearch = () => {
    if (isSearching) setSearchQuery('');
    setIsSearching((v) => !v);
  };

  // Filter items
  const filteredBuckets = useMemo(() => {
    if (!buckets) return [];

    let result = buckets.filter((b: any) => {
      if (filter === 'public') return b.visibility === 'public';
      if (filter === 'all') return true;
      if (filter === 'completed') return b.status === 'completed';

      const deadline = b.deadline ? new Date(b.deadline) : null;
      const expired = deadline ? isPast(deadline) && differenceInCalendarDays(deadline, new Date()) < 0 : false;

      if (filter === 'expired') return expired && b.status !== 'completed';
      if (filter === 'active') return b.status !== 'completed' && !expired;
      if (filter === 'in_progress') return b.status === 'in_progress' && !expired;

      return true;
    });

    if (priorityFilter !== 'all') {
      result = result.filter((b: any) => (b.priority || 'medium') === priorityFilter);
    }

    if (selectedTagIds.length > 0) {
      const wanted = new Set(selectedTagIds);
      result = result.filter((b: any) => (tagUsage?.byItem[b.id] ?? []).some((id) => wanted.has(id)));
    }

    if (selectedCollaboratorIds.length > 0) {
      const wantedCollabs = new Set(selectedCollaboratorIds);
      result = result.filter((b: any) => {
        const parts = taskParticipants[b.id] ?? [];
        return parts.some((p) => wantedCollabs.has(p.id));
      });
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (b: any) =>
          b.title?.toLowerCase().includes(q) ||
          b.location?.toLowerCase().includes(q) ||
          b.category?.name_es?.toLowerCase().includes(q) ||
          b.category?.name_en?.toLowerCase().includes(q) ||
          (b.priority && ('prioridad ' + b.priority).includes(q))
      );
    }

    return result;
  }, [buckets, filter, priorityFilter, searchQuery, selectedTagIds, tagUsage, selectedCollaboratorIds, taskParticipants]);

  const byManual = (a: any, b: any) => {
    const idxA = manualOrder.indexOf(a.id);
    const idxB = manualOrder.indexOf(b.id);
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
  };

  const sortComparator = useCallback((a: any, b: any) => {
    if (sortField === 'manual') {
      return byManual(a, b);
    }

    if (sortField === 'priority') {
      const priorityWeight = (p?: string) => {
        switch (p) {
          case 'urgent': return 4;
          case 'high': return 3;
          case 'medium': return 2;
          case 'low': return 1;
          default: return 2;
        }
      };

      const wa = priorityWeight(a.priority);
      const wb = priorityWeight(b.priority);
      if (wa !== wb) {
        return sortDir === 'asc' ? wa - wb : wb - wa;
      }
      return byManual(a, b);
    }

    if (sortField === 'alphabetical') {
      const cmp = (a.title || '').localeCompare(b.title || '', 'es', { sensitivity: 'base' });
      return sortDir === 'asc' ? cmp : -cmp;
    }

    if (sortField === 'created_at') {
      const da = new Date(a.created_at || 0).getTime();
      const db = new Date(b.created_at || 0).getTime();
      if (da !== db) return sortDir === 'asc' ? da - db : db - da;
      return byManual(a, b);
    }

    if (sortField === 'deadline') {
      // Sin fecha límite siempre al final, sea cual sea la dirección.
      const da = a.deadline ? new Date(a.deadline).getTime() : null;
      const db = b.deadline ? new Date(b.deadline).getTime() : null;
      if (da === null && db === null) return byManual(a, b);
      if (da === null) return 1;
      if (db === null) return -1;
      if (da !== db) return sortDir === 'asc' ? da - db : db - da;
      return byManual(a, b);
    }

    if (sortField === 'completed_at') {
      const da = a.completed_at ? new Date(a.completed_at).getTime() : (a.status === 'completed' ? new Date(a.created_at || 0).getTime() : 0);
      const db = b.completed_at ? new Date(b.completed_at).getTime() : (b.status === 'completed' ? new Date(b.created_at || 0).getTime() : 0);
      if (da !== db) {
        return sortDir === 'asc' ? da - db : db - da;
      }
      return byManual(a, b);
    }

    return byManual(a, b);
  }, [sortField, sortDir, manualOrder]);

  const shouldGroupTasks = taskGroupByStatus || sortField === 'status';

  const taskSections = useMemo(() => {
    if (!filteredBuckets || filteredBuckets.length === 0 || !shouldGroupTasks) return [];

    const isExpired = (b: any) => {
      const deadline = b.deadline ? new Date(b.deadline) : null;
      return deadline ? isPast(deadline) && differenceInCalendarDays(deadline, new Date()) < 0 && b.status !== 'completed' : false;
    };
    const isCompleted = (b: any) => b.status === 'completed';
    const isInProgress = (b: any) => b.status === 'in_progress' && !isCompleted(b) && !isExpired(b);
    const isPending = (b: any) => !isCompleted(b) && !isExpired(b) && !isInProgress(b);

    const comparator = sortField === 'status' ? byManual : sortComparator;

    const favorites = filteredBuckets.filter((b: any) => isBucketFavorite(b.id)).sort(comparator);
    const nonFavorites = filteredBuckets.filter((b: any) => !isBucketFavorite(b.id));

    const inProgress = nonFavorites.filter(isInProgress).sort(comparator);
    const pending = nonFavorites.filter(isPending).sort(comparator);
    const completed = nonFavorites.filter(isCompleted).sort(comparator);
    const expired = nonFavorites.filter(isExpired).sort(comparator);

    const otherSections = [
      { key: 'in_progress', title: t('my_list.section_in_progress'), items: inProgress },
      { key: 'pending', title: t('my_list.section_pending'), items: pending },
      { key: 'completed', title: t('my_list.section_completed_tasks'), items: completed },
      { key: 'expired', title: t('my_list.section_expired'), items: expired },
    ];

    if (sortField === 'status' && sortDir === 'asc') {
      otherSections.reverse();
    }

    return [{ key: 'favorites', title: t('my_list.section_favorites_tasks'), items: favorites }, ...otherSections];
  }, [filteredBuckets, shouldGroupTasks, sortField, sortDir, isBucketFavorite, byManual, sortComparator, t]);

  const sortedFlatBuckets = useMemo(() => {
    if (!filteredBuckets || filteredBuckets.length === 0) return [];
    return [...filteredBuckets].sort(sortComparator);
  }, [filteredBuckets, sortComparator]);

  const manualDragEnabled = !isSearching && isReordering;

  const listData = useMemo(() => {
    if (!filteredBuckets || filteredBuckets.length === 0) return [];

    if (taskSections.length > 0) {
      const result: any[] = [];
      for (const sec of taskSections) {
        if (sec.items.length > 0) {
          result.push({ isHeader: true, id: `header-${sec.key}`, title: sec.title });
          result.push(...sec.items);
        }
      }
      return result;
    }

    return sortedFlatBuckets;
  }, [filteredBuckets, taskSections, sortedFlatBuckets]);

  const getAlbumStatus = (a: any): 'closed' | 'completed' | 'active' => {
    if (a.is_closed) return 'closed';
    const total = a.total_tasks ?? 0;
    const completed = a.completed_tasks ?? 0;
    if (total > 0 && completed === total) return 'completed';
    return 'active';
  };

  const filteredAlbums = useMemo(() => {
    if (!albums) return [];
    let result = albums.filter((a: any) => {
      const status = getAlbumStatus(a);
      if (albumFilter === 'all') return true;
      if (albumFilter === 'active') return status === 'active';
      if (albumFilter === 'completed') return status === 'completed';
      if (albumFilter === 'closed') return status === 'closed';
      return true;
    });

    if (albumPriorityFilter !== 'all') {
      result = result.filter((a: any) => (a.priority || 'medium') === albumPriorityFilter);
    }

    if (selectedTagIds.length > 0) {
      const wanted = new Set(selectedTagIds);
      result = result.filter((a: any) => (a.tags ?? []).some((id: string) => wanted.has(id)));
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (a: any) =>
          a.title?.toLowerCase().includes(q) ||
          a.description?.toLowerCase().includes(q) ||
          (a.priority && ('prioridad ' + a.priority).includes(q))
      );
    }

    return result;
  }, [albums, albumFilter, albumPriorityFilter, searchQuery, selectedTagIds]);

  const byAlbumManual = (a: any, b: any) => {
    const idxA = albumManualOrder.indexOf(a.id);
    const idxB = albumManualOrder.indexOf(b.id);
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
  };

  const albumSortComparator = useCallback((a: any, b: any) => {
    if (albumSortField === 'manual') {
      return byAlbumManual(a, b);
    }

    if (albumSortField === 'priority') {
      const priorityWeight = (p?: string) => {
        switch (p) {
          case 'urgent': return 4;
          case 'high': return 3;
          case 'medium': return 2;
          case 'low': return 1;
          default: return 2;
        }
      };

      const wa = priorityWeight(a.priority);
      const wb = priorityWeight(b.priority);
      if (wa !== wb) {
        return albumSortDir === 'asc' ? wa - wb : wb - wa;
      }
      return byAlbumManual(a, b);
    }

    if (albumSortField === 'alphabetical') {
      const cmp = (a.title || '').localeCompare(b.title || '', 'es', { sensitivity: 'base' });
      return albumSortDir === 'asc' ? cmp : -cmp;
    }

    if (albumSortField === 'created_at') {
      const da = new Date(a.created_at || 0).getTime();
      const db = new Date(b.created_at || 0).getTime();
      if (da !== db) return albumSortDir === 'asc' ? da - db : db - da;
      return byAlbumManual(a, b);
    }

    if (albumSortField === 'completed_at') {
      const da = a.closed_at
        ? new Date(a.closed_at).getTime()
        : a.completed_at
        ? new Date(a.completed_at).getTime()
        : getAlbumStatus(a) === 'completed'
        ? new Date(a.created_at || 0).getTime()
        : 0;
      const db = b.closed_at
        ? new Date(b.closed_at).getTime()
        : b.completed_at
        ? new Date(b.completed_at).getTime()
        : getAlbumStatus(b) === 'completed'
        ? new Date(b.created_at || 0).getTime()
        : 0;
      if (da !== db) {
        return albumSortDir === 'asc' ? da - db : db - da;
      }
      return byAlbumManual(a, b);
    }

    return byAlbumManual(a, b);
  }, [albumSortField, albumSortDir, albumManualOrder]);

  const shouldGroupAlbums = albumGroupByStatus || albumSortField === 'status';

  const albumSections = useMemo(() => {
    if (!filteredAlbums || filteredAlbums.length === 0 || !shouldGroupAlbums) return [];

    const comparator = albumSortField === 'status' ? byAlbumManual : albumSortComparator;

    const favorites = filteredAlbums.filter((a: any) => isAlbumFavorite(a.id)).sort(comparator);
    const nonFavorites = filteredAlbums.filter((a: any) => !isAlbumFavorite(a.id));

    const inProgress = nonFavorites
      .filter((a: any) => {
        if (getAlbumStatus(a) !== 'active') return false;
        const total = a.total_tasks ?? 0;
        const completed = a.completed_tasks ?? 0;
        return total > 0 && completed > 0 && completed < total;
      })
      .sort(comparator);

    const pending = nonFavorites
      .filter((a: any) => {
        if (getAlbumStatus(a) !== 'active') return false;
        const completed = a.completed_tasks ?? 0;
        return completed === 0;
      })
      .sort(comparator);

    const completed = nonFavorites.filter((a: any) => getAlbumStatus(a) === 'completed').sort(comparator);
    const closed = nonFavorites.filter((a: any) => getAlbumStatus(a) === 'closed').sort(comparator);

    const otherSections = [
      { key: 'in_progress', title: t('my_list.section_in_progress'), items: inProgress },
      { key: 'pending', title: t('my_list.section_pending'), items: pending },
      { key: 'completed', title: t('my_list.section_completed_albums'), items: completed },
      { key: 'closed', title: t('my_list.section_closed'), items: closed },
    ];

    if (albumSortField === 'status' && albumSortDir === 'asc') {
      otherSections.reverse();
    }

    return [{ key: 'favorites', title: t('my_list.section_favorites_albums'), items: favorites }, ...otherSections];
  }, [filteredAlbums, shouldGroupAlbums, albumSortField, albumSortDir, isAlbumFavorite, byAlbumManual, albumSortComparator, t]);

  const sortedAlbumsList = useMemo(() => {
    if (!filteredAlbums || filteredAlbums.length === 0) return [];
    return [...filteredAlbums].sort(albumSortComparator);
  }, [filteredAlbums, albumSortComparator]);

  return {
    user,
    activeTab,
    setActiveTab,
    filter,
    setFilter,
    priorityFilter,
    setPriorityFilter,
    taskViewMode,
    setTaskViewMode,
    isSelectionMode,
    setIsSelectionMode,
    selectedTaskIds,
    setSelectedTaskIds,
    toggleSelectTask,
    handleExitSelection,
    lastExitTaskSelectionTimeRef,
    isAlbumSelectionMode,
    setIsAlbumSelectionMode,
    selectedAlbumIds,
    setSelectedAlbumIds,
    toggleSelectAlbum,
    handleExitAlbumSelection,
    lastExitAlbumSelectionTimeRef,
    albumViewMode,
    setAlbumViewMode,
    albumFilter,
    setAlbumFilter,
    albumPriorityFilter,
    setAlbumPriorityFilter,
    albumSortField,
    albumSortDir,
    albumSortTriggerRef,
    albumManualOrder,
    isAlbumReordering,
    setIsAlbumReordering,
    albumDragging,
    setAlbumDragging,
    isSearching: isSearching || searchQuery.trim().length > 0,
    setIsSearching,
    searchQuery,
    setSearchQuery,
    tagSheetOpen,
    setTagSheetOpen,
    selectedTagIds,
    setSelectedTagIds,
    selectedCollaboratorIds,
    setSelectedCollaboratorIds,
    availableCollaborators,
    selectedCollaborators,
    toggleCollaboratorFilter,
    removeCollaboratorFilter,
    sortField,
    sortDir,
    sortMenuOpen,
    setSortMenuOpen,
    sortMenuPos,
    sortTriggerRef,
    dragging,
    setDragging,
    isReordering,
    setIsReordering,
    openSortMenu,
    handleSortOption,
    refreshing,
    onRefresh,
    buckets,
    isLoading,
    isBucketFavorite,
    isAlbumFavorite,
    favBucketIds,
    toggleFavoriteAlbum,
    toggleFavoriteBucket,
    allTags,
    tagUsage,
    deleteBucket,
    updateBucket,
    albums,
    isLoadingAlbums,
    swipeableRefs,
    handleReorderSection,
    persistTaskOrder,
    handleReorderAlbumSection,
    persistAlbumOrder,
    unassignedCount,
    totalCount,
    tagsById,
    selectedTags,
    toggleSearch,
    filteredBuckets,
    taskSections,
    shouldGroupTasks,
    sortedFlatBuckets,
    manualDragEnabled,
    listData,
    filteredAlbums,
    albumSections,
    shouldGroupAlbums,
    sortedAlbumsList,
    toast,
    from: params.from,
  };
}
