import React, { useState, useMemo, useRef, useEffect } from 'react';
import { View, StyleSheet, Pressable, ScrollView, Dimensions, Alert, Animated, Modal, Text, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme, Typography, SegmentedControl, FilterChip, TaskRow, AlbumCard, NewAlbumCard, NoAlbumRow, FAB, spacing, useToast, Input, TagChip, PageTitle } from '@bucketlist/ui';
import { gold, dark } from '@bucketlist/ui/src/tokens/colors';
import { FlashList } from '@shopify/flash-list';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Swipeable } from 'react-native-gesture-handler';
import { Image as ExpoImage } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Search, Trash2, CheckCircle2, X, Tag as TagIcon, ArrowDown, ArrowUp, Star, LayoutList, LayoutGrid, AlignJustify, GripVertical, Check, Lock, Users, Plus, CheckSquare } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DraggableTaskList, type DragHandle } from '../../src/components/DraggableTaskList';
import { BulkTaskActionBar } from '../../src/components/BulkTaskActionBar';

import { useBuckets, useDeleteBucket, useUpdateBucket } from '../../src/hooks/useBuckets';
import { useAlbums } from '../../src/hooks/useAlbums';
import { useUserFavorites, useToggleFavoriteAlbum } from '../../src/hooks/useFavorites';
import { useAuthStore } from '../../src/stores/auth.store';
import { usePullToRefresh } from '../../src/hooks/useAutoRefresh';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../src/services/supabase';
import { CalendarTab } from '../../src/components/CalendarTab';
import { BucketCover } from '../../src/components/BucketCover';
import { resolveTaskImage } from '../../src/utils/taskImage';
import { TagFilterSheet } from '../../src/components/TagFilterSheet';
import { TaskRowSkeleton, TaskCompactSkeleton, TaskGallerySkeleton, AlbumCardSkeleton } from '../../src/components/TaskSkeletons';
import { useTags, useTagUsage, type Tag } from '../../src/hooks/useTags';
import { hexToRgba } from '../../src/constants/tagPresets';
import { categoryColors } from '@bucketlist/ui/src/tokens/colors';
import { isPast, differenceInCalendarDays } from 'date-fns';

type FilterType = 'all' | 'active' | 'in_progress' | 'completed' | 'expired';
type AlbumFilterType = 'all' | 'active' | 'completed' | 'closed';
type PriorityFilter = 'all' | 'high' | 'medium' | 'low';
type SortField = 'manual' | 'status' | 'priority' | 'alphabetical' | 'created_at';
type SortDir = 'asc' | 'desc';
type TaskViewMode = 'list' | 'gallery' | 'compact';

const SCREEN_WIDTH = Dimensions.get('window').width;

export default function MyListScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { user } = useAuthStore();

  const [activeTab, setActiveTab] = useState('list');
  const params = useLocalSearchParams<{ filter?: string }>();
  const [filter, setFilter] = useState<FilterType>(
    params.filter === 'completed' || params.filter === 'active' || params.filter === 'in_progress' || params.filter === 'expired' ? params.filter : 'all',
  );
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('all');
  React.useEffect(() => {
    if (params.filter === 'completed' || params.filter === 'active' || params.filter === 'in_progress' || params.filter === 'expired') setFilter(params.filter);
  }, [params.filter]);

  // ── Vista de tareas (lista, galería, compacta) ───────────────────────────
  const [taskViewMode, setTaskViewModeState] = useState<TaskViewMode>('list');

  useEffect(() => {
    AsyncStorage.getItem('@my_list_view_mode')
      .then((saved) => {
        if (saved === 'list' || saved === 'gallery' || saved === 'compact') {
          setTaskViewModeState(saved as TaskViewMode);
        }
      })
      .catch(() => undefined);
  }, []);

  const setTaskViewMode = (mode: TaskViewMode) => {
    setTaskViewModeState(mode);
    AsyncStorage.setItem('@my_list_view_mode', mode).catch(() => undefined);
  };

  // ── Selección múltiple de tareas ──────────────────────────────────────────
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);

  const toggleSelectTask = (id: string) => {
    setSelectedTaskIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleExitSelection = () => {
    setIsSelectionMode(false);
    setSelectedTaskIds([]);
  };

  // ── Filtros y orden de álbumes ───────────────────────────────────────────
  type AlbumViewMode = 'gallery' | 'list' | 'compact';
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

  const [albumFilter, setAlbumFilter] = useState<AlbumFilterType>('all');
  const [albumPriorityFilter, setAlbumPriorityFilter] = useState<PriorityFilter>('all');
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
          } catch {
            // ignore
          }
        }
      })
      .catch(() => undefined);
  }, [user?.id]);

  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [tagSheetOpen, setTagSheetOpen] = useState(false);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);

  // ── Orden de tareas ──────────────────────────────────────────────────────
  const [sortField, setSortField] = useState<SortField>('status');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const [sortMenuPos, setSortMenuPos] = useState({ top: 0, right: 20 });
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
          } catch {
            // ignore
          }
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
        setAlbumSortDir((prev) => (prev === 'desc' ? 'asc' : 'desc'));
      } else {
        setAlbumSortField(field as SortField);
        setAlbumSortDir(field === 'alphabetical' ? 'asc' : 'desc');
        setSortMenuOpen(false);
      }
    } else {
      if (field === 'reorder_status') {
        setSortField('status');
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
        setIsReordering(true);
        setSortMenuOpen(false);
        return;
      }
      setIsReordering(false);
      if (sortField === field) {
        setSortDir((prev) => (prev === 'desc' ? 'asc' : 'desc'));
      } else {
        setSortField(field as SortField);
        setSortDir(field === 'alphabetical' ? 'asc' : 'desc');
        setSortMenuOpen(false);
      }
    }
  };

  const { refreshing, onRefresh } = usePullToRefresh();
  const { data: buckets, isLoading } = useBuckets(user?.id);
  const { isBucketFavorite, isAlbumFavorite, bucketIds: favBucketIds } = useUserFavorites(user?.id);
  const toggleFavoriteAlbum = useToggleFavoriteAlbum();
  const { data: allTags } = useTags();
  const { data: tagUsage } = useTagUsage();
  const deleteBucket = useDeleteBucket();
  const updateBucket = useUpdateBucket();
  const { data: albums, isLoading: isLoadingAlbums } = useAlbums(user?.id);
  const toast = useToast();
  const swipeableRefs = useRef(new Map<string, Swipeable>());

  const handleReorderSection = (sectionKey: string, orderedIds: string[]) => {
    const baseOrder = manualOrder.length > 0
      ? manualOrder
      : (buckets || []).map((b: any) => b.id);

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
    const baseOrder = albumManualOrder.length > 0
      ? albumManualOrder
      : (albums || []).map((a: any) => a.id);

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

  // Consulta de relación tareas ↔ álbumes para contar correctamente
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
  });

  const unassignedCount = useMemo(() => {
    if (!buckets) return 0;
    if (!albumItems) return buckets.length;
    const inAnyAlbum = new Set(albumItems.map((i) => i.bucket_id));
    return buckets.filter((b) => !inAnyAlbum.has(b.id)).length;
  }, [buckets, albumItems]);

  const totalCount = buckets?.length || 0;

  // ── Etiquetas ──────────────────────────────────────────────────────────────
  const tagsById = useMemo(() => {
    const map = new Map<string, Tag>();
    (allTags ?? []).forEach((t) => map.set(t.id, t));
    return map;
  }, [allTags]);

  // Si se elimina una etiqueta que estaba en el filtro, se quita del filtro.
  React.useEffect(() => {
    if (!allTags) return;
    setSelectedTagIds((prev) => {
      const next = prev.filter((id) => tagsById.has(id));
      return next.length === prev.length ? prev : next;
    });
  }, [allTags, tagsById]);

  const selectedTags = useMemo(
    () => selectedTagIds.map((id) => tagsById.get(id)).filter(Boolean) as Tag[],
    [selectedTagIds, tagsById],
  );

  const listExtra = useMemo(
    () => ({ tagsById, byItem: tagUsage?.byItem, selectedTagIds, priorityFilter, sortField, sortDir, favBucketIds, taskViewMode, isSelectionMode, selectedTaskIds }),
    [tagsById, tagUsage, selectedTagIds, priorityFilter, sortField, sortDir, favBucketIds, taskViewMode, isSelectionMode, selectedTaskIds],
  );

  const toggleSearch = () => {
    if (isSearching) setSearchQuery('');
    setIsSearching((v) => !v);
  };

  // Filter items
  const filteredBuckets = useMemo(() => {
    if (!buckets) return [];

    let result = buckets.filter((b: any) => {
      if (filter === 'all') return true;
      if (filter === 'completed') return b.status === 'completed';

      const deadline = b.deadline ? new Date(b.deadline) : null;
      const expired = deadline ? (isPast(deadline) && differenceInCalendarDays(deadline, new Date()) < 0) : false;

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

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((b: any) =>
        b.title?.toLowerCase().includes(q) ||
        b.location?.toLowerCase().includes(q) ||
        b.category?.name_es?.toLowerCase().includes(q) ||
        b.category?.name_en?.toLowerCase().includes(q) ||
        (b.priority && ('prioridad ' + b.priority).includes(q))
      );
    }

    return result;
  }, [buckets, filter, priorityFilter, searchQuery, selectedTagIds, tagUsage]);

  const byManual = (a: any, b: any) => {
    const idxA = manualOrder.indexOf(a.id);
    const idxB = manualOrder.indexOf(b.id);
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
  };

  const taskSections = useMemo(() => {
    if (!filteredBuckets || filteredBuckets.length === 0) return [];
    if (sortField !== 'status') return [];

    const isExpired = (b: any) => {
      const deadline = b.deadline ? new Date(b.deadline) : null;
      return deadline ? (isPast(deadline) && differenceInCalendarDays(deadline, new Date()) < 0) && b.status !== 'completed' : false;
    };
    const isCompleted = (b: any) => b.status === 'completed';
    const isInProgress = (b: any) => b.status === 'in_progress' && !isCompleted(b) && !isExpired(b);
    const isPending = (b: any) => !isCompleted(b) && !isExpired(b) && !isInProgress(b);

    const favorites = filteredBuckets
      .filter((b: any) => isBucketFavorite(b.id))
      .sort(byManual);

    const nonFavorites = filteredBuckets.filter((b: any) => !isBucketFavorite(b.id));

    const inProgress = nonFavorites
      .filter(isInProgress)
      .sort(byManual);

    const pending = nonFavorites
      .filter(isPending)
      .sort(byManual);

    const completed = nonFavorites
      .filter(isCompleted)
      .sort(byManual);

    const expired = nonFavorites
      .filter(isExpired)
      .sort(byManual);

    let otherSections = [
      { key: 'in_progress', title: 'EN PROGRESO', items: inProgress },
      { key: 'pending', title: 'PENDIENTES', items: pending },
      { key: 'completed', title: 'COMPLETADAS', items: completed },
      { key: 'expired', title: 'VENCIDAS', items: expired },
    ];

    if (sortDir === 'asc') {
      otherSections.reverse();
    }

    return [
      { key: 'favorites', title: 'FAVORITAS ⭐', items: favorites },
      ...otherSections,
    ];
  }, [filteredBuckets, sortField, sortDir, isBucketFavorite, manualOrder]);

  const sortedFlatBuckets = useMemo(() => {
    if (!filteredBuckets || filteredBuckets.length === 0) return [];

    if (sortField === 'manual') {
      return [...filteredBuckets].sort(byManual);
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

      return [...filteredBuckets].sort((a: any, b: any) => {
        const wa = priorityWeight(a.priority);
        const wb = priorityWeight(b.priority);
        if (wa !== wb) {
          return sortDir === 'asc' ? wa - wb : wb - wa;
        }
        return byManual(a, b);
      });
    }

    if (sortField === 'alphabetical') {
      return [...filteredBuckets].sort((a: any, b: any) => {
        const cmp = (a.title || '').localeCompare(b.title || '', 'es', { sensitivity: 'base' });
        return sortDir === 'asc' ? cmp : -cmp;
      });
    }

    if (sortField === 'created_at') {
      return [...filteredBuckets].sort((a: any, b: any) => {
        const da = new Date(a.created_at || 0).getTime();
        const db = new Date(b.created_at || 0).getTime();
        return sortDir === 'asc' ? da - db : db - da;
      });
    }

    return [...filteredBuckets].sort(byManual);
  }, [filteredBuckets, sortField, sortDir, manualOrder]);

  const manualDragEnabled = !isSearching && isReordering;

  const listData = useMemo(() => {
    if (!filteredBuckets || filteredBuckets.length === 0) return [];

    if (sortField === 'status') {
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
  }, [filteredBuckets, sortField, taskSections, sortedFlatBuckets]);

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
  }, [albums, albumFilter, albumPriorityFilter, searchQuery]);

  const byAlbumManual = (a: any, b: any) => {
    const idxA = albumManualOrder.indexOf(a.id);
    const idxB = albumManualOrder.indexOf(b.id);
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
  };

  const albumSections = useMemo(() => {
    if (!filteredAlbums || filteredAlbums.length === 0) return [];

    const favorites = filteredAlbums
      .filter((a: any) => isAlbumFavorite(a.id))
      .sort(byAlbumManual);

    const nonFavorites = filteredAlbums.filter((a: any) => !isAlbumFavorite(a.id));

    const inProgress = nonFavorites
      .filter((a: any) => getAlbumStatus(a) === 'active')
      .sort(byAlbumManual);

    const completed = nonFavorites
      .filter((a: any) => getAlbumStatus(a) === 'completed')
      .sort(byAlbumManual);

    const closed = nonFavorites
      .filter((a: any) => getAlbumStatus(a) === 'closed')
      .sort(byAlbumManual);

    let otherSections = [
      { key: 'in_progress', title: 'EN PROGRESO', items: inProgress },
      { key: 'completed', title: 'COMPLETADOS', items: completed },
      { key: 'closed', title: 'CERRADOS', items: closed },
    ];

    if (albumSortDir === 'asc') {
      otherSections.reverse();
    }

    return [
      { key: 'favorites', title: 'FAVORITOS ⭐', items: favorites },
      ...otherSections,
    ];
  }, [filteredAlbums, albumSortDir, isAlbumFavorite, albumManualOrder]);

  const sortedAlbumsList = useMemo(() => {
    if (!filteredAlbums || filteredAlbums.length === 0) return [];

    if (albumSortField === 'manual') {
      return [...filteredAlbums].sort(byAlbumManual);
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

      return [...filteredAlbums].sort((a: any, b: any) => {
        const wa = priorityWeight(a.priority);
        const wb = priorityWeight(b.priority);
        if (wa !== wb) {
          return albumSortDir === 'asc' ? wa - wb : wb - wa;
        }
        return byAlbumManual(a, b);
      });
    }

    if (albumSortField === 'alphabetical') {
      return [...filteredAlbums].sort((a: any, b: any) => {
        const cmp = (a.title || '').localeCompare(b.title || '', 'es', { sensitivity: 'base' });
        return albumSortDir === 'asc' ? cmp : -cmp;
      });
    }

    if (albumSortField === 'created_at') {
      return [...filteredAlbums].sort((a: any, b: any) => {
        const da = new Date(a.created_at || 0).getTime();
        const db = new Date(b.created_at || 0).getTime();
        return albumSortDir === 'asc' ? da - db : db - da;
      });
    }

    return [...filteredAlbums].sort(byAlbumManual);
  }, [filteredAlbums, albumSortField, albumSortDir, albumManualOrder]);

  const handleCreate = () => {
    router.push('/(modals)/create-bucket');
  };

  const renderTaskItem = ({ item, drag }: { item: any; drag?: DragHandle }) => {
    if (item.isHeader) {
      const isFirst = listData.length > 0 && listData[0].id === item.id;
      return (
        <View style={{ marginTop: isFirst ? 6 : 22, marginBottom: 4 }}>
          <Text style={styles.sectionHeader}>{item.title}</Text>
        </View>
      );
    }

    const categoryColor = item.category?.color || categoryColors.other;
    const subtasksTotal = item.item_subtasks?.length || 0;
    const subtasksDone = item.item_subtasks?.filter((s: any) => s.done).length || 0;
    const isItemOwner = item.user_id === user?.id;

    const deadlineDate = item.deadline ? new Date(item.deadline) : null;
    const isItemExpired = deadlineDate ? (isPast(deadlineDate) && differenceInCalendarDays(deadlineDate, new Date()) < 0) : false;
    const daysAgo = deadlineDate ? Math.abs(differenceInCalendarDays(deadlineDate, new Date())) : 0;

    let meta = '';
    if (!isItemOwner) {
      meta = 'Colaboración';
    } else if (isItemExpired && item.status !== 'completed') {
      meta = `Caducó hace ${daysAgo} días`;
    } else if (subtasksTotal > 0) {
      meta = `${subtasksDone} de ${subtasksTotal} pasos`;
    } else if (item.location) {
      meta = item.location;
    }

    // Etiquetas de la tarea: máximo 2 chips + "+N"
    const itemTags = ((tagUsage?.byItem[item.id] ?? [])
      .map((id: string) => tagsById.get(id))
      .filter(Boolean) as Tag[]).sort(
      (a, b) =>
        Number(selectedTagIds.includes(b.id)) - Number(selectedTagIds.includes(a.id)) ||
        a.name.localeCompare(b.name),
    );
    const itemPriority = item.priority || 'medium';
    const itemPriorityColor = itemPriority === 'high' ? '#EF4444' : itemPriority === 'low' ? '#10B981' : '#D4B13A';
    const itemPriorityLabel = itemPriority === 'high' ? 'Alta' : itemPriority === 'low' ? 'Baja' : 'Media';

    const priorityBadge = (
      <View
        key="priority-badge"
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 4,
          paddingHorizontal: 7,
          paddingVertical: 2,
          borderRadius: 8,
          backgroundColor: itemPriority === 'high' ? 'rgba(239, 68, 68, 0.16)' : itemPriority === 'low' ? 'rgba(16, 185, 129, 0.16)' : 'rgba(212, 177, 58, 0.16)',
          borderWidth: 1,
          borderColor: itemPriorityColor,
        }}
      >
        <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: itemPriorityColor }} />
        <Text style={{ fontSize: 11, fontWeight: '700', color: itemPriorityColor }}>
          {itemPriorityLabel}
        </Text>
      </View>
    );

    const isFav = isBucketFavorite(item.id);
    const favoriteBadge = isFav ? (
      <View
        key="favorite-badge"
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 3,
          paddingHorizontal: 6,
          paddingVertical: 2,
          borderRadius: 8,
          backgroundColor: 'rgba(212, 177, 58, 0.18)',
          borderWidth: 1,
          borderColor: gold[400],
        }}
      >
        <Star size={11} color={gold[400]} fill={gold[400]} />
        <Text style={{ fontSize: 11, fontWeight: '700', color: gold[400] }}>
          Favorita
        </Text>
      </View>
    ) : null;

    const tagsElement = (
      <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
        {favoriteBadge}
        {priorityBadge}
        {itemTags.slice(0, 2).map((t) => (
          <TagChip key={t.id} label={t.name} variant="colored" color={t.color} emoji={t.emoji} size="sm" />
        ))}
        {itemTags.length > 2 && (
          <TagChip label={`+${itemTags.length - 2}`} variant="colored" color="#8A8A8A" size="sm" />
        )}
      </View>
    );

    const renderRightActions = (progress: any, dragX: any) => {
      if (!isItemOwner) return null;
      const opacity = progress.interpolate({
        inputRange: [0, 0.15, 1],
        outputRange: [0, 1, 1],
        extrapolate: 'clamp',
      });
      return (
        <Animated.View style={{ opacity, width: 90, justifyContent: 'center', alignItems: 'flex-end' }}>
          <Pressable
            style={{
              width: 90,
              height: '100%',
              backgroundColor: theme.colors.error,
              borderTopRightRadius: 14,
              borderBottomRightRadius: 14,
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onPress={() => deleteBucket.mutate(item.id)}
          >
            <Trash2 color={theme.colors.errorForeground} size={24} />
          </Pressable>
        </Animated.View>
      );
    };

    const handleConfirmComplete = () => {
      Alert.alert(
        '¿Marcar como completada?',
        `¿Quieres marcar "${item.title}" como completada?`,
        [
          {
            text: 'Cancelar',
            style: 'cancel',
            onPress: () => {
              swipeableRefs.current.get(item.id)?.close();
            },
          },
          {
            text: 'Completar',
            style: 'default',
            onPress: () => {
              updateBucket.mutate(
                { id: item.id, data: { status: 'completed', completed_at: new Date() } as any },
                {
                  onSuccess: () => {
                    toast.show({ message: 'Tarea completada 🎉' });
                  },
                }
              );
              swipeableRefs.current.get(item.id)?.close();
            },
          },
        ]
      );
    };

    const renderLeftActions = (progress: any, dragX: any) => {
      if (item.status === 'completed') return null;
      const opacity = progress.interpolate({
        inputRange: [0, 0.15, 1],
        outputRange: [0, 1, 1],
        extrapolate: 'clamp',
      });
      return (
        <Animated.View style={{ opacity, width: 90, justifyContent: 'center', alignItems: 'flex-start' }}>
          <Pressable
            style={{
              width: 90,
              height: '100%',
              backgroundColor: '#34C759',
              borderTopLeftRadius: 14,
              borderBottomLeftRadius: 14,
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onPress={handleConfirmComplete}
          >
            <CheckCircle2 color="#FFFFFF" size={24} />
          </Pressable>
        </Animated.View>
      );
    };

    const isSelected = selectedTaskIds.includes(item.id);

    const swipeableContent = (
      <Swipeable
        ref={(ref) => {
          if (ref) swipeableRefs.current.set(item.id, ref);
          else swipeableRefs.current.delete(item.id);
        }}
        enabled={!drag && !isSelectionMode}
        containerStyle={{ backgroundColor: '#0E0E0E', borderRadius: 14 }}
        childrenContainerStyle={{ backgroundColor: '#0E0E0E', borderRadius: 14 }}
        renderRightActions={renderRightActions}
        renderLeftActions={renderLeftActions}
        overshootRight={false}
        overshootLeft={false}
        onSwipeableOpen={(direction) => {
          if (direction === 'left' && item.status !== 'completed') {
            handleConfirmComplete();
          } else if (direction === 'right') {
            if (isItemOwner) {
              Alert.alert(
                'Eliminar tarea',
                '¿Estás seguro de que quieres eliminar esta tarea?',
                [
                  { text: 'Cancelar', style: 'cancel', onPress: () => swipeableRefs.current.get(item.id)?.close() },
                  { text: 'Eliminar', style: 'destructive', onPress: () => deleteBucket.mutate(item.id) }
                ]
              );
            } else {
              swipeableRefs.current.get(item.id)?.close();
            }
          }
        }}
      >
        <TaskRow
          title={item.title}
          meta={meta}
          deadline={item.deadline}
          expiredAction={isItemExpired && item.status !== 'completed'}
          thumbnailElement={
            isItemExpired && item.status !== 'completed' ? (
              <View style={{ flex: 1, backgroundColor: '#202020', borderRadius: 12 }} />
            ) : (
              <BucketCover
                value={resolveTaskImage(item, { preferThumb: true })}
                title={item.title}
                categorySlug={item.category?.slug}
                seed={item.id}
                iconSize={56}
                style={StyleSheet.absoluteFill}
              />
            )
          }
          tagsElement={tagsElement}
          subtasksDone={subtasksDone}
          subtasksTotal={subtasksTotal}
          counterCount={(item as any).counter_count}
          counterTarget={(item as any).counter_target}
          completed={item.status === 'completed'}
          onPress={() => {
            if (isSelectionMode) {
              toggleSelectTask(item.id);
            } else {
              router.push(`/bucket/${item.id}`);
            }
          }}
          onLongPress={() => {
            if (!isSelectionMode) {
              setIsSelectionMode(true);
            }
            toggleSelectTask(item.id);
          }}
        />
      </Swipeable>
    );

    const contentWithSelection = isSelectionMode ? (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Pressable
          hitSlop={8}
          onPress={() => toggleSelectTask(item.id)}
          style={{ paddingLeft: 2, paddingRight: 2 }}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: isSelected }}
        >
          {isSelected ? (
            <CheckCircle2 size={24} color={gold[400]} fill={gold[400]} />
          ) : (
            <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: '#555555' }} />
          )}
        </Pressable>
        <View style={{ flex: 1 }}>{swipeableContent}</View>
      </View>
    ) : swipeableContent;

    if (drag) {
      return (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View
            {...drag.panHandlers}
            hitSlop={{ top: 14, bottom: 14, left: 10, right: 10 }}
            style={{ width: 28, height: 56, alignItems: 'center', justifyContent: 'center' }}
            accessibilityLabel="Arrastrar para reordenar"
          >
            <GripVertical size={20} color={drag.isActive ? gold[400] : '#8F8F8F'} strokeWidth={2} />
          </View>
          <View style={{ flex: 1 }}>{contentWithSelection}</View>
        </View>
      );
    }

    return contentWithSelection;
  };

  const renderCompactItem = ({ item, drag }: { item: any; drag?: DragHandle }) => {
    if (item.isHeader) {
      const isFirst = listData.length > 0 && listData[0].id === item.id;
      return (
        <View style={{ marginTop: isFirst ? 6 : 18, marginBottom: 4 }}>
          <Text style={styles.sectionHeader}>{item.title}</Text>
        </View>
      );
    }

    const isCompleted = item.status === 'completed';
    const isFav = isBucketFavorite(item.id);
    const isSelected = selectedTaskIds.includes(item.id);

    return (
      <Pressable
        onPress={() => {
          if (isSelectionMode) {
            toggleSelectTask(item.id);
          } else {
            router.push(`/bucket/${item.id}`);
          }
        }}
        onLongPress={() => {
          if (!isSelectionMode) {
            setIsSelectionMode(true);
          }
          toggleSelectTask(item.id);
        }}
        style={[
          styles.compactRow,
          isCompleted && styles.compactRowCompleted,
          isSelected && { borderColor: gold[400], backgroundColor: 'rgba(212, 177, 58, 0.08)' },
          drag?.isActive && { borderColor: gold[400] },
        ]}
        accessibilityRole="button"
        accessibilityLabel={item.title}
      >
        {drag && (
          <View
            {...drag.panHandlers}
            hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
            style={{ marginRight: 8, justifyContent: 'center', alignItems: 'center' }}
            accessibilityLabel="Arrastrar para reordenar"
          >
            <GripVertical size={18} color={drag.isActive ? gold[400] : '#8F8F8F'} strokeWidth={2} />
          </View>
        )}
        {isSelectionMode ? (
          <Pressable
            hitSlop={8}
            onPress={() => toggleSelectTask(item.id)}
            style={styles.compactCheckBtn}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: isSelected }}
          >
            {isSelected ? (
              <CheckCircle2 size={19} color={gold[400]} fill={gold[400]} />
            ) : (
              <View style={[styles.compactUncheckedCircle, { borderColor: '#555555' }]} />
            )}
          </Pressable>
        ) : (
          <Pressable
            hitSlop={10}
            onPress={() => {
              const newStatus = isCompleted ? 'in_progress' : 'completed';
              updateBucket.mutate(
                {
                  id: item.id,
                  data: {
                    status: newStatus,
                    completed_at: newStatus === 'completed' ? new Date() : null,
                  } as any,
                },
                {
                  onSuccess: () => {
                    toast.show({
                      message: newStatus === 'completed' ? 'Tarea completada 🎉' : 'Tarea reactivada',
                    });
                  },
                }
              );
            }}
            style={styles.compactCheckBtn}
            accessibilityRole="button"
            accessibilityLabel={isCompleted ? 'Desmarcar tarea' : 'Completar tarea'}
          >
            {isCompleted ? (
              <CheckCircle2 size={19} color="#34C759" />
            ) : (
              <View style={styles.compactUncheckedCircle} />
            )}
          </Pressable>
        )}

        <Text
          numberOfLines={1}
          style={[
            styles.compactTitle,
            isCompleted && styles.compactTitleCompleted,
          ]}
        >
          {item.title}
        </Text>

        {isFav && (
          <Star size={13} color={gold[400]} fill={gold[400]} style={{ marginLeft: 8 }} />
        )}
      </Pressable>
    );
  };

  const renderGalleryCard = (item: any, isSingle: boolean) => {
    const isCompleted = item.status === 'completed';
    const isFav = isBucketFavorite(item.id);
    const subtasksTotal = item.item_subtasks?.length || 0;
    const subtasksDone = item.item_subtasks?.filter((s: any) => s.done).length || 0;
    const itemPriority = item.priority || 'medium';
    const isSelected = selectedTaskIds.includes(item.id);

    return (
      <Pressable
        key={item.id}
        onPress={() => {
          if (isSelectionMode) {
            toggleSelectTask(item.id);
          } else {
            router.push(`/bucket/${item.id}`);
          }
        }}
        onLongPress={() => {
          if (!isSelectionMode) {
            setIsSelectionMode(true);
          }
          toggleSelectTask(item.id);
        }}
        style={[
          styles.galleryCard,
          isSingle && styles.galleryCardSingle,
          isSelected && { borderColor: gold[400], borderWidth: 2 },
        ]}
        accessibilityRole="button"
        accessibilityLabel={item.title}
      >
        <BucketCover
          value={resolveTaskImage(item, { preferThumb: !isSingle })}
          title={item.title}
          categorySlug={item.category?.slug}
          seed={item.id}
          iconSize={isSingle ? 64 : 44}
          style={StyleSheet.absoluteFill}
        />

        {/* Badges superiores */}
        <View style={styles.galleryTopBadges}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            {isSelectionMode ? (
              <View
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 12,
                  backgroundColor: isSelected ? gold[400] : 'rgba(0,0,0,0.6)',
                  borderWidth: isSelected ? 0 : 1.5,
                  borderColor: '#FFFFFF',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {isSelected && <Check size={14} color="#0E0E0E" strokeWidth={3} />}
              </View>
            ) : (
              <>
                {isFav && (
                  <View style={styles.galleryFavBadge}>
                    <Star size={11} color={gold[400]} fill={gold[400]} />
                  </View>
                )}
                {isCompleted && (
                  <View style={styles.galleryCompletedBadge}>
                    <CheckCircle2 size={12} color="#FFFFFF" />
                  </View>
                )}
              </>
            )}
          </View>
          {itemPriority === 'high' && (
            <View style={styles.galleryPriorityBadge}>
              <View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: '#EF4444' }} />
              <Text style={styles.galleryPriorityText}>Alta</Text>
            </View>
          )}
        </View>

        {/* Overlay inferior */}
        <View style={styles.galleryBottomOverlay}>
          <Text style={[styles.galleryCardTitle, isSingle && { fontSize: 16 }]} numberOfLines={2}>
            {item.title}
          </Text>
          {(item.category?.name_es || item.category?.name || subtasksTotal > 0 || item.location) && (
            <Text style={styles.galleryCardMeta} numberOfLines={1}>
              {subtasksTotal > 0
                ? `${subtasksDone} de ${subtasksTotal} pasos`
                : (item.category?.name_es || item.category?.name || item.location)}
            </Text>
          )}
        </View>
      </Pressable>
    );
  };

  const COVER_GRADIENTS: Array<[string, string]> = [
    ['#1B4D3E', '#0A2E25'],
    ['#C87A2B', '#7A3D00'],
    ['#2B5BA8', '#0D2F6E'],
    ['#6B2FA0', '#3A0070'],
  ];

  const renderAlbumCoverThumb = (coverUri: string | null | undefined, colorIndex: number, size = 40) => {
    const [g1, g2] = COVER_GRADIENTS[colorIndex % COVER_GRADIENTS.length] || ['#1B4D3E', '#0A2E25'];
    let parsedCover: any = null;
    if (coverUri && coverUri.startsWith('{')) {
      try {
        parsedCover = JSON.parse(coverUri);
      } catch {}
    }
    let inner;
    if (parsedCover?.type === 'image' && parsedCover.uri) {
      inner = <ExpoImage source={{ uri: parsedCover.uri }} style={StyleSheet.absoluteFill} contentFit="cover" />;
    } else if ((parsedCover?.type === 'gradient' || parsedCover?.type === 'solid') && parsedCover.colors) {
      inner = <LinearGradient colors={parsedCover.colors} style={StyleSheet.absoluteFill} />;
    } else if (coverUri && !parsedCover) {
      inner = <ExpoImage source={{ uri: coverUri }} style={StyleSheet.absoluteFill} contentFit="cover" />;
    } else {
      inner = <LinearGradient colors={[g1, g2]} style={StyleSheet.absoluteFill} />;
    }
    return (
      <View style={{ width: size, height: size, borderRadius: size > 40 ? 10 : 8, overflow: 'hidden' }}>
        {inner}
      </View>
    );
  };

  const renderCompactAlbumItem = ({ item, drag }: { item: any; drag?: DragHandle }) => {
    const isFav = isAlbumFavorite(item.id);
    const total = item.total_tasks ?? 0;
    const completed = item.completed_tasks ?? 0;
    const isCompleted = total > 0 && completed === total;

    return (
      <Pressable
        key={item.id}
        onPress={() => router.push(`/album/${item.id}` as any)}
        style={[
          styles.compactRow,
          isCompleted && styles.compactRowCompleted,
          drag?.isActive && { borderColor: gold[400] },
          { marginBottom: drag ? 8 : 0 },
        ]}
        accessibilityRole="button"
        accessibilityLabel={item.title}
      >
        {drag && (
          <View
            {...drag.panHandlers}
            hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
            style={{ marginRight: 8, justifyContent: 'center', alignItems: 'center' }}
            accessibilityLabel="Arrastrar para reordenar"
          >
            <GripVertical size={18} color={drag.isActive ? gold[400] : '#8F8F8F'} strokeWidth={2} />
          </View>
        )}

        <View style={{ marginRight: 10 }}>
          {renderAlbumCoverThumb(item.cover_path, 0, 32)}
        </View>

        <Text
          numberOfLines={1}
          style={[styles.compactTitle, isCompleted && { color: '#888' }]}
        >
          {item.title}
        </Text>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginLeft: 8 }}>
          {item.is_closed ? (
            <Lock size={12} color="#888" />
          ) : null}
          {item.is_shared ? (
            <Users size={12} color={gold[400]} />
          ) : null}
          <View
            style={{
              paddingHorizontal: 7,
              paddingVertical: 2,
              borderRadius: 6,
              backgroundColor: isCompleted ? 'rgba(52, 199, 89, 0.15)' : '#222',
            }}
          >
            <Text
              style={{
                fontSize: 11,
                fontWeight: '600',
                color: isCompleted ? '#34C759' : '#AAA',
              }}
            >
              {completed}/{total}
            </Text>
          </View>
          {isFav && (
            <Star size={13} color={gold[400]} fill={gold[400]} />
          )}
        </View>
      </Pressable>
    );
  };

  const renderListAlbumItem = ({ item, drag, index = 0 }: { item: any; drag?: DragHandle; index?: number }) => {
    const isFav = isAlbumFavorite(item.id);
    const total = item.total_tasks ?? 0;
    const completed = item.completed_tasks ?? 0;
    const progress = total > 0 ? completed / total : 0;
    const priority = item.priority;
    const priorityColor =
      priority === 'high' || priority === 'urgent'
        ? '#EF4444'
        : priority === 'low'
        ? '#10B981'
        : '#D4B13A';
    const priorityLabel =
      priority === 'high' || priority === 'urgent'
        ? 'Alta'
        : priority === 'low'
        ? 'Baja'
        : 'Media';

    return (
      <View
        key={item.id}
        style={[
          drag ? { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 } : { marginBottom: 10 },
        ]}
      >
        {drag && (
          <View
            {...drag.panHandlers}
            hitSlop={{ top: 14, bottom: 14, left: 10, right: 10 }}
            style={{ width: 28, height: 68, alignItems: 'center', justifyContent: 'center' }}
            accessibilityLabel="Arrastrar para reordenar"
          >
            <GripVertical size={20} color={drag.isActive ? gold[400] : '#8F8F8F'} strokeWidth={2} />
          </View>
        )}
        <Pressable
          onPress={() => router.push(`/album/${item.id}` as any)}
          style={[
            styles.listAlbumCard,
            drag && { flex: 1 },
            drag?.isActive && { borderColor: gold[400] },
          ]}
          accessibilityRole="button"
          accessibilityLabel={item.title}
        >
          <View style={{ marginRight: 12 }}>
            {renderAlbumCoverThumb(item.cover_path, index, 54)}
          </View>

          <View style={{ flex: 1, justifyContent: 'center' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={styles.listAlbumTitle} numberOfLines={1}>
                {item.title}
              </Text>
              <Pressable
                hitSlop={8}
                onPress={() =>
                  toggleFavoriteAlbum.mutate({
                    albumId: item.id,
                    currentlyFavorite: isFav,
                  })
                }
              >
                <Star
                  size={16}
                  color={isFav ? gold[400] : '#666'}
                  fill={isFav ? gold[400] : 'transparent'}
                />
              </Pressable>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
              <Text style={styles.listAlbumMeta}>
                {total} {total === 1 ? 'tarea' : 'tareas'} · {completed} {completed === 1 ? 'hecha' : 'hechas'}
              </Text>

              {item.is_shared && (
                <View style={styles.listAlbumBadge}>
                  <Users size={10} color="#AAA" />
                  <Text style={styles.listAlbumBadgeText}>Compartido</Text>
                </View>
              )}

              {item.is_closed && (
                <View style={styles.listAlbumBadge}>
                  <Lock size={10} color="#EF4444" />
                  <Text style={[styles.listAlbumBadgeText, { color: '#EF4444' }]}>Cerrado</Text>
                </View>
              )}

              {priority && (
                <View style={[styles.listAlbumBadge, { borderColor: priorityColor }]}>
                  <View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: priorityColor }} />
                  <Text style={[styles.listAlbumBadgeText, { color: priorityColor }]}>{priorityLabel}</Text>
                </View>
              )}
            </View>

            <View style={styles.listAlbumProgressTrack}>
              <View style={[styles.listAlbumProgressFill, { width: `${Math.round(progress * 100)}%` as any }]} />
            </View>
          </View>
        </Pressable>
      </View>
    );
  };

  const taskListHeader = (
    <View>
      {/* Filtros */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filtersContainer}
        style={{ flexGrow: 0, marginBottom: 8, marginHorizontal: -20 }}
      >
        <FilterChip label="Todas" active={filter === 'all'} onPress={() => setFilter('all')} />
        <FilterChip label="En curso" active={filter === 'active'} onPress={() => setFilter('active')} />
        <FilterChip label="En progreso" active={filter === 'in_progress'} onPress={() => setFilter('in_progress')} />
        <FilterChip label="Completadas" active={filter === 'completed'} onPress={() => setFilter('completed')} />
        <FilterChip label="Vencidas" active={filter === 'expired'} onPress={() => setFilter('expired')} />
      </ScrollView>

      {/* Filtro por prioridad */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filtersContainer}
        style={{ flexGrow: 0, marginBottom: 10, marginHorizontal: -20 }}
      >
        <FilterChip label="Prioridad: Todas" active={priorityFilter === 'all'} onPress={() => setPriorityFilter('all')} />
        <FilterChip label="🔴 Alta" active={priorityFilter === 'high'} onPress={() => setPriorityFilter(priorityFilter === 'high' ? 'all' : 'high')} />
        <FilterChip label="🟡 Media" active={priorityFilter === 'medium'} onPress={() => setPriorityFilter(priorityFilter === 'medium' ? 'all' : 'medium')} />
        <FilterChip label="🟢 Baja" active={priorityFilter === 'low'} onPress={() => setPriorityFilter(priorityFilter === 'low' ? 'all' : 'low')} />
      </ScrollView>

      {/* Filtro por etiquetas + Toggle de modos (al mismo nivel que etiquetas) */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingRight: 8 }}
          style={{ flex: 1, marginRight: 8 }}
        >
          <Pressable
            onPress={() => setTagSheetOpen(true)}
            accessibilityRole="button"
            accessibilityLabel="Filtrar por etiquetas"
            style={[styles.tagFilterBtn, selectedTags.length > 0 && styles.tagFilterBtnActive]}
          >
            <TagIcon size={16} color={selectedTags.length > 0 ? gold[400] : '#E5E5E5'} strokeWidth={1.9} />
            <Text style={[styles.tagFilterText, selectedTags.length > 0 && { color: gold[400] }]}>
              {selectedTags.length > 0 ? `Etiquetas · ${selectedTags.length}` : 'Etiquetas'}
            </Text>
          </Pressable>

          {selectedTags.map((t) => (
            <Pressable
              key={t.id}
              onPress={() => setSelectedTagIds((ids) => ids.filter((id) => id !== t.id))}
              accessibilityRole="button"
              accessibilityLabel={`Quitar etiqueta ${t.name}`}
              style={styles.activeTagChip}
            >
              {t.emoji ? (
                <View style={[styles.activeTagEmoji, { backgroundColor: hexToRgba(t.color, 0.3) }]}>
                  <Text style={styles.activeTagEmojiText}>{t.emoji}</Text>
                </View>
              ) : (
                <View style={[styles.activeTagDot, { backgroundColor: t.color }]} />
              )}
              <Text style={styles.activeTagText} numberOfLines={1}>{t.name}</Text>
              <X size={15} color="#E5E5E5" strokeWidth={2} />
            </Pressable>
          ))}
        </ScrollView>

        {/* Toggle de selección múltiple + Toggle de vistas */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Pressable
            onPress={() => {
              if (isSelectionMode) {
                handleExitSelection();
              } else {
                setIsSelectionMode(true);
              }
            }}
            style={[styles.selectionBtn, isSelectionMode && styles.selectionBtnActive]}
            hitSlop={4}
            accessibilityRole="button"
            accessibilityLabel={isSelectionMode ? 'Cancelar selección' : 'Seleccionar tareas'}
          >
            <CheckSquare size={13} color={isSelectionMode ? '#0E0E0E' : gold[400]} />
            <Text style={[styles.selectionBtnText, isSelectionMode && { color: '#0E0E0E' }]}>
              {isSelectionMode ? 'Listo' : 'Elegir'}
            </Text>
          </Pressable>

          <View style={styles.viewModeToggle}>
            <Pressable
              onPress={() => setTaskViewMode('list')}
              style={[styles.viewModeBtn, taskViewMode === 'list' && styles.viewModeBtnActive]}
              hitSlop={4}
              accessibilityRole="button"
              accessibilityLabel="Vista detallada"
            >
              <LayoutList size={15} color={taskViewMode === 'list' ? '#0E0E0E' : '#A0A0A0'} />
            </Pressable>
            <Pressable
              onPress={() => setTaskViewMode('gallery')}
              style={[styles.viewModeBtn, taskViewMode === 'gallery' && styles.viewModeBtnActive]}
              hitSlop={4}
              accessibilityRole="button"
              accessibilityLabel="Vista galería"
            >
              <LayoutGrid size={15} color={taskViewMode === 'gallery' ? '#0E0E0E' : '#A0A0A0'} />
            </Pressable>
            <Pressable
              onPress={() => setTaskViewMode('compact')}
              style={[styles.viewModeBtn, taskViewMode === 'compact' && styles.viewModeBtnActive]}
              hitSlop={4}
              accessibilityRole="button"
              accessibilityLabel="Vista compacta"
            >
              <AlignJustify size={15} color={taskViewMode === 'compact' ? '#0E0E0E' : '#A0A0A0'} />
            </Pressable>
          </View>
        </View>
      </View>

      {/* Fila de Ordenar por */}
      <View style={styles.sortRow}>
        <Typography variant="caption" color={theme.colors.foregroundMuted} style={styles.tasksCountLabel}>
          {filteredBuckets.length} {filteredBuckets.length === 1 ? 'TAREA' : 'TAREAS'}
        </Typography>

        <View style={styles.sortTriggerContainer}>
          <Typography variant="caption" color={theme.colors.foregroundMuted}>
            Ordenar por:
          </Typography>
          <Pressable
            ref={sortTriggerRef}
            collapsable={false}
            onPress={openSortMenu}
            hitSlop={8}
            style={styles.sortTriggerBtn}
            accessibilityRole="button"
            accessibilityLabel="Ordenar tareas"
          >
            <Typography variant="caption" color={gold[400]} style={{ fontWeight: '600' }}>
              {sortField === 'manual'
                ? 'Manual'
                : sortField === 'status'
                ? (isReordering ? 'Estado (manual)' : 'Estado')
                : sortField === 'priority'
                ? 'Prioridad'
                : sortField === 'alphabetical'
                ? 'Alfabético'
                : 'Fecha'}
            </Typography>
            {sortField !== 'manual' && !isReordering &&
              (sortDir === 'desc' ? (
                <ArrowDown color={gold[400]} size={14} />
              ) : (
                <ArrowUp color={gold[400]} size={14} />
              ))}
          </Pressable>

          {!isSearching && isReordering && (
            <Pressable
              onPress={() => setIsReordering(false)}
              style={{
                backgroundColor: gold[400],
                paddingHorizontal: 12,
                paddingVertical: 4,
                borderRadius: 6,
                marginLeft: 8,
              }}
              hitSlop={8}
            >
              <Text style={{ fontSize: 11, fontWeight: '700', color: '#0E0E0E' }}>OK</Text>
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: '#0E0E0E' }]} edges={['top']}>

      {/* ── Header: exact title hierarchy from the reference ── */}
      <View style={styles.header}>
        <PageTitle gold="Mi" rest="Lista" />
        {(activeTab === 'list' || activeTab === 'albums') && (
          <Pressable
            onPress={toggleSearch}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={isSearching ? 'Cerrar búsqueda' : 'Buscar'}
            style={styles.searchBtn}
          >
            {isSearching ? <X size={26} color="#FFF" strokeWidth={1.8} /> : <Search size={26} color="#FFF" strokeWidth={1.8} />}
          </Pressable>
        )}
      </View>

      {/* ── Tabs (always visible, full width) ───────────── */}
      <View style={styles.tabsContainer}>
        <SegmentedControl
          options={[
            { key: 'list', label: 'Lista' },
            { key: 'albums', label: 'Álbumes' },
            { key: 'calendar', label: 'Calendario' },
          ]}
          selected={activeTab}
          onChange={(tab) => {
            setActiveTab(tab);
            if (tab !== 'list') {
              setIsReordering(false);
              handleExitSelection();
            }
            if (tab !== 'albums') setIsAlbumReordering(false);
          }}
        />
      </View>

      {/* ── Search Bar ──────────────────────────────────── */}
      {isSearching && (activeTab === 'list' || activeTab === 'albums') && (
        <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
          <Input
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder={activeTab === 'list' ? 'Buscar tareas...' : 'Buscar álbumes...'}
            autoFocus
            leftIcon={<Search size={18} color="#9A9A9A" />}
            rightIcon={
              searchQuery.trim() ? (
                <Pressable onPress={() => setSearchQuery('')} hitSlop={10}>
                  <X size={18} color="#9A9A9A" />
                </Pressable>
              ) : undefined
            }
          />
        </View>
      )}

      {/* ── Content ────────────────────────────────────── */}
      <View style={styles.content}>
        {activeTab === 'list' && (
          isLoading ? (
            <ScrollView
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
            >
              {taskListHeader}
              {taskViewMode === 'gallery' ? (
                <View style={styles.galleryGrid}>
                  <TaskGallerySkeleton />
                  <TaskGallerySkeleton />
                  <TaskGallerySkeleton />
                  <TaskGallerySkeleton />
                </View>
              ) : taskViewMode === 'compact' ? (
                <View style={{ gap: 8 }}>
                  <TaskCompactSkeleton />
                  <TaskCompactSkeleton />
                  <TaskCompactSkeleton />
                  <TaskCompactSkeleton />
                  <TaskCompactSkeleton />
                  <TaskCompactSkeleton />
                </View>
              ) : (
                <View style={{ gap: spacing[3] }}>
                  <TaskRowSkeleton />
                  <TaskRowSkeleton />
                  <TaskRowSkeleton />
                  <TaskRowSkeleton />
                  <TaskRowSkeleton />
                </View>
              )}
            </ScrollView>
          ) : manualDragEnabled ? (
            <ScrollView
              contentContainerStyle={styles.listContent}
              scrollEnabled={!dragging}
              keyboardShouldPersistTaps="handled"
            >
              {taskListHeader}
              {filteredBuckets.length === 0 ? (
                <View style={styles.empty}>
                  <Typography variant="body" color={theme.colors.foregroundMuted}>
                    {selectedTagIds.length > 0 ? 'No hay tareas con esas etiquetas.' : 'No hay tareas aquí.'}
                  </Typography>
                </View>
              ) : sortField === 'status' ? (
                <View style={{ marginTop: 2 }}>
                  {taskSections.map((sec) => {
                    if (sec.items.length === 0) return null;
                    return (
                      <View key={sec.key} style={{ marginBottom: 20 }}>
                        <View style={{ marginBottom: 10 }}>
                          <Text style={styles.sectionHeader}>{sec.title}</Text>
                        </View>
                        <DraggableTaskList
                          items={sec.items}
                          renderItem={(item, drag) => (
                            <View style={{ marginBottom: taskViewMode === 'compact' ? 8 : spacing[3] }}>
                              {taskViewMode === 'compact'
                                ? renderCompactItem({ item, drag })
                                : renderTaskItem({ item, drag })}
                            </View>
                          )}
                          onReorder={(ids) => handleReorderSection(sec.key, ids)}
                          onDraggingChange={setDragging}
                        />
                      </View>
                    );
                  })}
                </View>
              ) : (
                <View style={{ marginTop: 2 }}>
                  <DraggableTaskList
                    items={sortedFlatBuckets}
                    renderItem={(item, drag) => (
                      <View style={{ marginBottom: taskViewMode === 'compact' ? 8 : spacing[3] }}>
                        {taskViewMode === 'compact'
                          ? renderCompactItem({ item, drag })
                          : renderTaskItem({ item, drag })}
                      </View>
                    )}
                    onReorder={(ids) => void persistTaskOrder(ids)}
                    onDraggingChange={setDragging}
                  />
                </View>
              )}
            </ScrollView>
          ) : taskViewMode === 'gallery' ? (
            <ScrollView
              contentContainerStyle={styles.listContent}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} tintColor={gold[400]} />}
            >
              {taskListHeader}
              {filteredBuckets.length === 0 ? (
                <View style={styles.empty}>
                  <Typography variant="body" color={theme.colors.foregroundMuted}>
                    {selectedTagIds.length > 0 ? 'No hay tareas con esas etiquetas.' : 'No hay tareas aquí.'}
                  </Typography>
                </View>
              ) : sortField === 'status' ? (
                taskSections.map((sec) => {
                  if (sec.items.length === 0) return null;
                  const isSingle = sec.items.length === 1;
                  return (
                    <View key={sec.key} style={{ marginBottom: 20 }}>
                      <View style={{ marginBottom: 10 }}>
                        <Text style={styles.sectionHeader}>{sec.title}</Text>
                      </View>
                      <View style={styles.galleryGrid}>
                        {sec.items.map((item: any) => renderGalleryCard(item, isSingle))}
                      </View>
                    </View>
                  );
                })
              ) : (
                (() => {
                  const isSingle = sortedFlatBuckets.length === 1;
                  return (
                    <View style={styles.galleryGrid}>
                      {sortedFlatBuckets.map((item: any) => renderGalleryCard(item, isSingle))}
                    </View>
                  );
                })()
              )}
            </ScrollView>
          ) : (
            <FlashList
              data={listData}
              keyExtractor={(item: any) => item.id || item.title}
              contentContainerStyle={styles.listContent}
              estimatedItemSize={taskViewMode === 'compact' ? 52 : 80}
              refreshing={refreshing}
              onRefresh={() => void onRefresh()}
              extraData={listExtra}
              getItemType={(item: any) => (item.isHeader ? 'header' : 'task')}
              ItemSeparatorComponent={() => <View style={{ height: taskViewMode === 'compact' ? 8 : spacing[3] }} />}
              renderItem={taskViewMode === 'compact' ? renderCompactItem : renderTaskItem}
              ListHeaderComponent={taskListHeader}
              ListEmptyComponent={() => (
                <View style={styles.empty}>
                  <Typography variant="body" color={theme.colors.foregroundMuted}>
                    {selectedTagIds.length > 0 ? 'No hay tareas con esas etiquetas.' : 'No hay tareas aquí.'}
                  </Typography>
                </View>
              )}
            />
          )
        )}

        {activeTab === 'albums' && (
          <ScrollView
            contentContainerStyle={styles.albumsContent}
            scrollEnabled={!albumDragging}
            keyboardShouldPersistTaps="handled"
            refreshControl={
              !(!isSearching && isAlbumReordering) ? (
                <RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} tintColor={gold[400]} />
              ) : undefined
            }
          >
            {/* Filtros de estado de álbum */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filtersContainer}
              style={{ flexGrow: 0, marginBottom: 8, marginHorizontal: -20 }}
            >
              <FilterChip label="Todos" active={albumFilter === 'all'} onPress={() => setAlbumFilter('all')} />
              <FilterChip label="En curso" active={albumFilter === 'active'} onPress={() => setAlbumFilter('active')} />
              <FilterChip label="Completados" active={albumFilter === 'completed'} onPress={() => setAlbumFilter('completed')} />
              <FilterChip label="Cerrados" active={albumFilter === 'closed'} onPress={() => setAlbumFilter('closed')} />
            </ScrollView>

            {/* Filtro por prioridad de álbum + Toggle de modos de vista */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingRight: 8 }}
                style={{ flex: 1, marginRight: 8 }}
              >
                <FilterChip label="Prioridad: Todas" active={albumPriorityFilter === 'all'} onPress={() => setAlbumPriorityFilter('all')} />
                <FilterChip label="🔴 Alta" active={albumPriorityFilter === 'high'} onPress={() => setAlbumPriorityFilter(albumPriorityFilter === 'high' ? 'all' : 'high')} />
                <FilterChip label="🟡 Media" active={albumPriorityFilter === 'medium'} onPress={() => setAlbumPriorityFilter(albumPriorityFilter === 'medium' ? 'all' : 'medium')} />
                <FilterChip label="🟢 Baja" active={albumPriorityFilter === 'low'} onPress={() => setAlbumPriorityFilter(albumPriorityFilter === 'low' ? 'all' : 'low')} />
              </ScrollView>

              {/* Toggle de vistas: Lista | Galería | Compacta */}
              <View style={styles.viewModeToggle}>
                <Pressable
                  onPress={() => setAlbumViewMode('list')}
                  style={[styles.viewModeBtn, albumViewMode === 'list' && styles.viewModeBtnActive]}
                  hitSlop={4}
                  accessibilityRole="button"
                  accessibilityLabel="Vista detallada"
                >
                  <LayoutList size={15} color={albumViewMode === 'list' ? '#0E0E0E' : '#A0A0A0'} />
                </Pressable>
                <Pressable
                  onPress={() => setAlbumViewMode('gallery')}
                  style={[styles.viewModeBtn, albumViewMode === 'gallery' && styles.viewModeBtnActive]}
                  hitSlop={4}
                  accessibilityRole="button"
                  accessibilityLabel="Vista galería"
                >
                  <LayoutGrid size={15} color={albumViewMode === 'gallery' ? '#0E0E0E' : '#A0A0A0'} />
                </Pressable>
                <Pressable
                  onPress={() => setAlbumViewMode('compact')}
                  style={[styles.viewModeBtn, albumViewMode === 'compact' && styles.viewModeBtnActive]}
                  hitSlop={4}
                  accessibilityRole="button"
                  accessibilityLabel="Vista compacta"
                >
                  <AlignJustify size={15} color={albumViewMode === 'compact' ? '#0E0E0E' : '#A0A0A0'} />
                </Pressable>
              </View>
            </View>

            {/* Fila de Ordenar por álbumes */}
            <View style={styles.sortRow}>
              <Typography variant="caption" color={theme.colors.foregroundMuted} style={styles.tasksCountLabel}>
                {filteredAlbums.length} {filteredAlbums.length === 1 ? 'ÁLBUM' : 'ÁLBUMES'}
              </Typography>
              <View style={styles.sortTriggerContainer}>
                <Typography variant="caption" color={theme.colors.foregroundMuted}>
                  Ordenar por:
                </Typography>
                <Pressable
                  ref={albumSortTriggerRef}
                  collapsable={false}
                  onPress={openSortMenu}
                  hitSlop={8}
                  style={styles.sortTriggerBtn}
                  accessibilityRole="button"
                  accessibilityLabel="Ordenar álbumes"
                >
                  <Typography variant="caption" color={gold[400]} style={{ fontWeight: '600' }}>
                    {albumSortField === 'manual'
                      ? 'Manual'
                      : albumSortField === 'status'
                      ? (isAlbumReordering ? 'Estado (manual)' : 'Estado')
                      : albumSortField === 'priority'
                      ? 'Prioridad'
                      : albumSortField === 'alphabetical'
                      ? 'Alfabético'
                      : 'Fecha'}
                  </Typography>
                  {albumSortField !== 'manual' && !isAlbumReordering &&
                    (albumSortDir === 'desc' ? (
                      <ArrowDown color={gold[400]} size={14} />
                    ) : (
                      <ArrowUp color={gold[400]} size={14} />
                    ))}
                </Pressable>

                {!isSearching && isAlbumReordering && (
                  <Pressable
                    onPress={() => setIsAlbumReordering(false)}
                    style={{
                      backgroundColor: gold[400],
                      paddingHorizontal: 12,
                      paddingVertical: 4,
                      borderRadius: 6,
                      marginLeft: 8,
                    }}
                    hitSlop={8}
                  >
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#0E0E0E' }}>OK</Text>
                  </Pressable>
                )}
              </View>
            </View>

            {/* Contenido de Álbumes */}
            {isLoadingAlbums ? (
              <View style={[styles.albumGrid, { marginTop: 12 }]}>
                <AlbumCardSkeleton />
                <AlbumCardSkeleton />
                <AlbumCardSkeleton />
                <AlbumCardSkeleton />
              </View>
            ) : filteredAlbums.length === 0 ? (
              <View style={styles.empty}>
                <Typography variant="body" color={theme.colors.foregroundMuted}>
                  No hay álbumes que coincidan con estos filtros.
                </Typography>
                <View style={[styles.albumGrid, { marginTop: 24 }]}>
                  <NewAlbumCard onPress={() => router.push('/(modals)/create-album')} />
                </View>
                <NoAlbumRow
                  count={unassignedCount}
                  onPress={() => router.push('/album/unassigned')}
                />
              </View>
            ) : !isSearching && isAlbumReordering ? (
              <View style={{ marginTop: 2 }}>
                {albumSortField === 'status' ? (
                  albumSections.map((sec) => {
                    if (sec.items.length === 0) return null;
                    return (
                      <View key={sec.key} style={{ marginBottom: 20 }}>
                        <View style={{ marginBottom: 10 }}>
                          <Text style={styles.sectionHeader}>{sec.title}</Text>
                        </View>
                        <DraggableTaskList
                          items={sec.items}
                          renderItem={(item, drag) =>
                            albumViewMode === 'compact'
                              ? renderCompactAlbumItem({ item, drag })
                              : renderListAlbumItem({ item, drag })
                          }
                          onReorder={(ids) => handleReorderAlbumSection(sec.key, ids)}
                          onDraggingChange={setAlbumDragging}
                        />
                      </View>
                    );
                  })
                ) : (
                  <DraggableTaskList
                    items={sortedAlbumsList}
                    renderItem={(item, drag) =>
                      albumViewMode === 'compact'
                        ? renderCompactAlbumItem({ item, drag })
                        : renderListAlbumItem({ item, drag })
                    }
                    onReorder={(ids) => void persistAlbumOrder(ids)}
                    onDraggingChange={setAlbumDragging}
                  />
                )}
              </View>
            ) : albumViewMode === 'compact' ? (
              <>
                {albumSortField === 'status' ? (
                  albumSections.map((sec) => {
                    if (sec.items.length === 0) return null;
                    return (
                      <View key={sec.key} style={{ marginBottom: 20 }}>
                        <View style={{ marginBottom: 10 }}>
                          <Text style={styles.sectionHeader}>{sec.title}</Text>
                        </View>
                        <View style={{ gap: 8 }}>
                          {sec.items.map((item: any) => renderCompactAlbumItem({ item }))}
                        </View>
                      </View>
                    );
                  })
                ) : (
                  <View style={{ gap: 8, marginBottom: 16 }}>
                    {sortedAlbumsList.map((item: any) => renderCompactAlbumItem({ item }))}
                  </View>
                )}
                <Pressable
                  onPress={() => router.push('/(modals)/create-album')}
                  style={styles.compactNewAlbumBtn}
                >
                  <Plus size={18} color={gold[400]} strokeWidth={2.2} />
                  <Text style={styles.compactNewAlbumText}>Nuevo álbum</Text>
                </Pressable>
                <NoAlbumRow count={unassignedCount} onPress={() => router.push('/album/unassigned')} />
              </>
            ) : albumViewMode === 'list' ? (
              <>
                {albumSortField === 'status' ? (
                  albumSections.map((sec) => {
                    if (sec.items.length === 0) return null;
                    return (
                      <View key={sec.key} style={{ marginBottom: 20 }}>
                        <View style={{ marginBottom: 10 }}>
                          <Text style={styles.sectionHeader}>{sec.title}</Text>
                        </View>
                        {sec.items.map((item: any, idx: number) => renderListAlbumItem({ item, index: idx }))}
                      </View>
                    );
                  })
                ) : (
                  sortedAlbumsList.map((item: any, idx: number) => renderListAlbumItem({ item, index: idx }))
                )}
                <Pressable
                  onPress={() => router.push('/(modals)/create-album')}
                  style={styles.compactNewAlbumBtn}
                >
                  <Plus size={18} color={gold[400]} strokeWidth={2.2} />
                  <Text style={styles.compactNewAlbumText}>Nuevo álbum</Text>
                </Pressable>
                <NoAlbumRow count={unassignedCount} onPress={() => router.push('/album/unassigned')} />
              </>
            ) : (
              albumSortField === 'status' ? (
                (() => {
                  let renderedNewAlbum = false;
                  const hasInProgress = albumSections.some((s) => s.key === 'in_progress' && s.items.length > 0);
                  return (
                    <>
                      {albumSections.map((sec) => {
                        if (sec.items.length === 0) return null;
                        const isTargetForNewCard = !renderedNewAlbum && (sec.key === 'in_progress' || !hasInProgress);
                        if (isTargetForNewCard) {
                          renderedNewAlbum = true;
                        }
                        return (
                          <View key={sec.key} style={{ marginBottom: 20 }}>
                            <View style={{ marginBottom: 10 }}>
                              <Text style={styles.sectionHeader}>{sec.title}</Text>
                            </View>
                            <View style={styles.albumGrid}>
                              {sec.items.map((item: any, idx: number) => (
                                <AlbumCard
                                  key={item.id}
                                  title={item.title}
                                  totalTasks={item.total_tasks ?? 0}
                                  completedTasks={item.completed_tasks ?? 0}
                                  coverUri={item.cover_path}
                                  isShared={item.is_shared}
                                  isFavorite={isAlbumFavorite(item.id)}
                                  onToggleFavorite={() =>
                                    toggleFavoriteAlbum.mutate({
                                      albumId: item.id,
                                      currentlyFavorite: isAlbumFavorite(item.id),
                                    })
                                  }
                                  priority={item.priority}
                                  isClosed={item.is_closed}
                                  colorIndex={idx}
                                  onPress={() => router.push(`/album/${item.id}` as any)}
                                />
                              ))}
                              {isTargetForNewCard && (
                                <NewAlbumCard onPress={() => router.push('/(modals)/create-album')} />
                              )}
                            </View>
                          </View>
                        );
                      })}
                      {!renderedNewAlbum && (
                        <View style={[styles.albumGrid, { marginBottom: 12 }]}>
                          <NewAlbumCard onPress={() => router.push('/(modals)/create-album')} />
                        </View>
                      )}
                      <NoAlbumRow
                        count={unassignedCount}
                        onPress={() => router.push('/album/unassigned')}
                      />
                    </>
                  );
                })()
              ) : (
                <>
                  <View style={styles.albumGrid}>
                    {sortedAlbumsList.map((item: any, index: number) => (
                      <AlbumCard
                        key={item.id}
                        title={item.title}
                        totalTasks={item.total_tasks ?? 0}
                        completedTasks={item.completed_tasks ?? 0}
                        coverUri={item.cover_path}
                        isShared={item.is_shared}
                        isFavorite={isAlbumFavorite(item.id)}
                        onToggleFavorite={() =>
                          toggleFavoriteAlbum.mutate({
                            albumId: item.id,
                            currentlyFavorite: isAlbumFavorite(item.id),
                          })
                        }
                        priority={item.priority}
                        isClosed={item.is_closed}
                        colorIndex={index}
                        onPress={() => router.push(`/album/${item.id}` as any)}
                      />
                    ))}
                    <NewAlbumCard onPress={() => router.push('/(modals)/create-album')} />
                  </View>
                  <NoAlbumRow
                    count={unassignedCount}
                    onPress={() => router.push('/album/unassigned')}
                  />
                </>
              )
            )}
          </ScrollView>
        )}

        {activeTab === 'calendar' && (
          <CalendarTab />
        )}
      </View>

      <TagFilterSheet
        visible={tagSheetOpen}
        selectedIds={selectedTagIds}
        onChange={setSelectedTagIds}
        matchCount={filteredBuckets.length}
        totalCount={totalCount}
        onClose={() => setTagSheetOpen(false)}
        onManage={() => {
          setTagSheetOpen(false);
          router.push('/tags' as any);
        }}
      />

      {/* ── Sort Menu Modal ────────────────────────────── */}
      <Modal
        visible={sortMenuOpen}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setSortMenuOpen(false)}
      >
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={() => setSortMenuOpen(false)}
        >
          <View
            style={{
              position: 'absolute',
              top: sortMenuPos.top,
              right: sortMenuPos.right,
              minWidth: 160,
              backgroundColor: dark[300],
              borderRadius: 12,
              borderWidth: 1,
              borderColor: dark[400],
              overflow: 'hidden',
              elevation: 8,
              shadowColor: '#000',
              shadowOpacity: 0.35,
              shadowRadius: 10,
              shadowOffset: { width: 0, height: 4 },
            }}
          >
            {(
              activeTab === 'albums'
                ? albumSortField === 'status'
                  ? [
                      { field: 'reorder_status' as const, label: 'Reordenar manualmente' },
                      { field: 'status' as const, label: 'Estado' },
                      { field: 'manual' as const, label: 'Manual (sin categorías)' },
                      { field: 'priority' as const, label: 'Prioridad' },
                      { field: 'alphabetical' as const, label: 'Alfabético' },
                      { field: 'created_at' as const, label: 'Fecha de creación' },
                    ]
                  : [
                      { field: 'manual' as const, label: 'Manual' },
                      { field: 'status' as const, label: 'Estado' },
                      { field: 'priority' as const, label: 'Prioridad' },
                      { field: 'alphabetical' as const, label: 'Alfabético' },
                      { field: 'created_at' as const, label: 'Fecha de creación' },
                    ]
                : sortField === 'status'
                ? [
                    { field: 'reorder_status' as const, label: 'Reordenar manualmente' },
                    { field: 'status' as const, label: 'Estado' },
                    { field: 'manual' as const, label: 'Manual (sin categorías)' },
                    { field: 'priority' as const, label: 'Prioridad' },
                    { field: 'alphabetical' as const, label: 'Alfabético' },
                    { field: 'created_at' as const, label: 'Fecha de creación' },
                  ]
                : [
                    { field: 'manual' as const, label: 'Manual' },
                    { field: 'status' as const, label: 'Estado' },
                    { field: 'priority' as const, label: 'Prioridad' },
                    { field: 'alphabetical' as const, label: 'Alfabético' },
                    { field: 'created_at' as const, label: 'Fecha de creación' },
                  ]
            ).map((option, i) => {
              const currentField = activeTab === 'albums' ? albumSortField : sortField;
              const currentDir = activeTab === 'albums' ? albumSortDir : sortDir;
              const isCurrentlyReordering = activeTab === 'albums' ? isAlbumReordering : isReordering;
              const selected =
                option.field === 'reorder_status'
                  ? isCurrentlyReordering
                  : currentField === option.field;
              return (
                <Pressable
                  key={option.field}
                  onPress={() => handleSortOption(option.field)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                    paddingHorizontal: 14,
                    paddingVertical: 12,
                    borderTopWidth: i === 0 ? 0 : StyleSheet.hairlineWidth,
                    borderTopColor: 'rgba(255,255,255,0.1)',
                  }}
                >
                  <Typography
                    variant={selected ? 'bodySemibold' : 'body'}
                    color={selected ? gold[400] : theme.colors.foreground}
                  >
                    {option.label}
                  </Typography>
                  {selected && option.field !== 'manual' && option.field !== 'reorder_status' &&
                    (currentDir === 'desc' ? (
                      <ArrowDown color={gold[400]} size={16} />
                    ) : (
                      <ArrowUp color={gold[400]} size={16} />
                    ))}
                  {option.field === 'reorder_status' &&
                    (isCurrentlyReordering ? (
                      <Check color={gold[400]} size={16} strokeWidth={2.5} />
                    ) : (
                      <GripVertical color={gold[400]} size={16} />
                    ))}
                  {selected && option.field === 'manual' && (
                    <Check color={gold[400]} size={16} strokeWidth={2.5} />
                  )}
                </Pressable>
              );
            })}
          </View>
        </Pressable>
      </Modal>

      {/* ── FAB ────────────────────────────────────────── */}
      {activeTab === 'list' && !isSelectionMode && (
        <FAB onPress={handleCreate} bottomOffset={24} />
      )}

      {/* ── Barra flotante de acciones en lote ──────────── */}
      {isSelectionMode && activeTab === 'list' && (
        <BulkTaskActionBar
          selectedIds={selectedTaskIds}
          totalTasksCount={filteredBuckets.length}
          onClearSelection={handleExitSelection}
          onSelectAll={() => {
            if (selectedTaskIds.length === filteredBuckets.length) {
              setSelectedTaskIds([]);
            } else {
              setSelectedTaskIds(filteredBuckets.map((b: any) => b.id));
            }
          }}
          isAllSelected={selectedTaskIds.length > 0 && selectedTaskIds.length === filteredBuckets.length}
        />
      )}

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontFamily: 'PlayfairDisplay_700Bold',
    fontSize: 32,
    color: '#FFF',
  },
  searchBtn: {
    width: 44,
    height: 44,
    marginRight: -10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tagFilterBtn: {
    height: 34,
    paddingHorizontal: 14,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: '#333333',
    backgroundColor: '#1A1A1A',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tagFilterBtnActive: {
    borderColor: gold[400],
    backgroundColor: 'transparent',
  },
  tagFilterText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    color: '#E5E5E5',
  },
  activeTagChip: {
    height: 34,
    paddingHorizontal: 14,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    backgroundColor: '#1A1A1A',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  activeTagDot: { width: 8, height: 8, borderRadius: 4 },
  activeTagEmoji: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginLeft: -6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeTagEmojiText: { fontSize: 11, lineHeight: 14, textAlign: 'center' },
  activeTagText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    color: '#F5F5F5',
    maxWidth: 140,
  },
  tabsContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  filtersContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingRight: 40,
    gap: 8,
  },
  content: {
    flex: 1,
  },
  sectionHeader: {
    fontFamily: 'PlayfairDisplay_700Bold',
    fontSize: 13,
    color: '#8A8A80',
    letterSpacing: 1.5,
  },
  expiredHeader: {
    fontFamily: 'PlayfairDisplay_700Bold',
    fontSize: 13,
    color: '#8A8A80',
    letterSpacing: 1.5,
  },
  sortRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    marginTop: -4,
  },
  tasksCountLabel: {
    letterSpacing: 1,
    fontSize: 12,
    fontWeight: '600',
  },
  sortRightControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  selectionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 32,
    paddingHorizontal: 9,
    borderRadius: 8,
    backgroundColor: '#181818',
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  selectionBtnActive: {
    backgroundColor: gold[400],
    borderColor: gold[400],
  },
  selectionBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: gold[400],
  },
  viewModeToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#181818',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    padding: 2,
    gap: 2,
  },
  viewModeBtn: {
    width: 28,
    height: 26,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewModeBtnActive: {
    backgroundColor: gold[400],
  },
  sortTriggerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sortTriggerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  galleryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 12,
  },
  galleryCard: {
    width: (SCREEN_WIDTH - 40 - 10) / 2,
    height: ((SCREEN_WIDTH - 40 - 10) / 2) * 1.3,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#1E1E1E',
  },
  galleryCardSingle: {
    width: '100%',
    height: (SCREEN_WIDTH - 40) * 0.85,
    marginBottom: 10,
  },
  galleryTopBadges: {
    position: 'absolute',
    top: 8,
    left: 8,
    right: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  galleryFavBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.65)',
    borderWidth: 1,
    borderColor: gold[400],
    alignItems: 'center',
    justifyContent: 'center',
  },
  galleryCompletedBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(52, 199, 89, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  galleryPriorityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.65)',
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  galleryPriorityText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#EF4444',
  },
  galleryBottomOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.72)',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
  },
  galleryCardTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    color: '#FFFFFF',
    lineHeight: 18,
  },
  galleryCardMeta: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  compactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    paddingHorizontal: 14,
    backgroundColor: '#161616',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#242424',
  },
  compactRowCompleted: {
    backgroundColor: '#121212',
    borderColor: '#1C1C1C',
    opacity: 0.8,
  },
  compactCheckBtn: {
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactUncheckedCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.8,
    borderColor: '#555',
  },
  compactTitle: {
    flex: 1,
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    color: '#F5F5F5',
  },
  compactTitleCompleted: {
    color: '#707070',
    textDecorationLine: 'line-through',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 120,
  },
  albumsContent: {
    paddingHorizontal: 20,
    paddingBottom: 120,
  },
  albumsLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  albumsLabelHighlight: {
    fontWeight: '800',
    letterSpacing: 1.2,
    fontSize: 14,
  },
  albumsLabel: {
    fontWeight: '700',
    letterSpacing: 1.2,
    fontSize: 14,
  },
  albumGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 12,
  },
  compactNewAlbumBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: gold[400],
    backgroundColor: 'rgba(212, 177, 58, 0.06)',
    marginBottom: 12,
  },
  compactNewAlbumText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    color: gold[400],
  },
  listAlbumCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#161616',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#242424',
    padding: 10,
  },
  listAlbumTitle: {
    fontFamily: 'PlayfairDisplay_700Bold',
    fontSize: 16,
    color: '#FFF',
    flex: 1,
    marginRight: 8,
  },
  listAlbumMeta: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: '#9A9A9A',
  },
  listAlbumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  listAlbumBadgeText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 10,
    color: '#BBB',
  },
  listAlbumProgressTrack: {
    height: 3,
    borderRadius: 1.5,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginTop: 8,
    overflow: 'hidden',
  },
  listAlbumProgressFill: {
    height: '100%',
    backgroundColor: gold[400],
    borderRadius: 1.5,
  },
  empty: {
    paddingTop: 60,
    alignItems: 'center',
  },
});
