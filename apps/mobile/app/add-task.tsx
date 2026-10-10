import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  View, Text, StyleSheet, Pressable, TextInput, ScrollView, 
  Alert, ActivityIndicator, KeyboardAvoidingView, Platform 
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronLeft, Folder, Search, Check } from 'lucide-react-native';
import { useUnassignedTasks, useAssignTasks, useCreateTasksFromDefaults, defaultTasks, UnassignedTask } from '../src/services/api/tasksService';

const GRADIENTS = {
  aurora: ['#0E4B43', '#1F8560'] as const,
  atardecer: ['#F4A460', '#C8602F'] as const,
  cielo: ['#3A78C4', '#8CC8F4'] as const,
  violeta: ['#5B2F98', '#2E1A5E'] as const,
  dorado: ['#3A2F18', '#5E4E1F'] as const,
};

const CATEGORIES = ['Todas', 'Viajes', 'Aventura', 'Deporte', 'Comida'];

export default function AddTaskScreen() {
  const { albumId, albumName } = useLocalSearchParams<{ albumId: string, albumName: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const { data: userTasksData, isLoading, isError } = useUnassignedTasks();
  const assignMutation = useAssignTasks();
  const createMutation = useCreateTasksFromDefaults();

  const [activeTab, setActiveTab] = useState<'user' | 'default'>('user');
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('Todas');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  const scrollViewRef = useRef<ScrollView>(null);

  // Filter defaultTasks to exclude those the user already has (by title matching)
  const availableDefaultTasks = useMemo(() => {
    if (!userTasksData) return defaultTasks;
    const userTitles = new Set(userTasksData.map(t => t.title.toLowerCase().trim()));
    return defaultTasks.filter(dt => !userTitles.has(dt.title.toLowerCase().trim()));
  }, [userTasksData]);

  const userTasks = userTasksData || [];

  // If user has no tasks, default to 'default' tab on initial load
  useEffect(() => {
    if (userTasksData && userTasksData.length === 0) {
      setActiveTab('default');
    }
  }, [userTasksData]);

  const handleTabChange = (tab: 'user' | 'default') => {
    if (activeTab === tab) return;
    setActiveTab(tab);
    scrollViewRef.current?.scrollTo({ y: 0, animated: false });
  };

  const getVisibleTasks = (tasks: UnassignedTask[]) => {
    return tasks.filter(t => {
      const matchSearch = t.title.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(search.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""));
      const matchCat = activeCategory === 'Todas' || t.categoryName === activeCategory;
      return matchSearch && matchCat;
    });
  };

  const visibleUserTasks = useMemo(() => getVisibleTasks(userTasks), [userTasks, search, activeCategory]);
  const visibleDefaultTasks = useMemo(() => getVisibleTasks(availableDefaultTasks), [availableDefaultTasks, search, activeCategory]);

  const currentVisibleTasks = activeTab === 'user' ? visibleUserTasks : visibleDefaultTasks;
  const currentTotal = activeTab === 'user' ? userTasks.length : availableDefaultTasks.length;

  const userSelectedCount = userTasks.filter(t => selectedIds.has(t.id)).length;
  const defaultSelectedCount = availableDefaultTasks.filter(t => selectedIds.has(t.id)).length;

  const allVisibleSelected = currentVisibleTasks.length > 0 && currentVisibleTasks.every(t => selectedIds.has(t.id));

  const toggleSelectAll = () => {
    const newSet = new Set(selectedIds);
    if (allVisibleSelected) {
      currentVisibleTasks.forEach(t => newSet.delete(t.id));
    } else {
      currentVisibleTasks.forEach(t => newSet.add(t.id));
    }
    setSelectedIds(newSet);
  };

  const toggleTask = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const handleAdd = async () => {
    if (selectedIds.size === 0) return;

    try {
      const userSelected = userTasks.filter(t => selectedIds.has(t.id)).map(t => t.id);
      const defaultSelected = availableDefaultTasks.filter(t => selectedIds.has(t.id)).map(t => t.id);

      let newIds: string[] = [];
      if (defaultSelected.length > 0) {
        newIds = await createMutation.mutateAsync(defaultSelected);
      }

      if (!albumId || albumId === 'new') {
        router.back();
        return;
      }

      await assignMutation.mutateAsync({ albumId, taskIds: [...userSelected, ...newIds] });
      router.back();
    } catch (err) {
      Alert.alert('Error', 'No se pudieron añadir las tareas');
    }
  };

  let btnText = 'Añadir tareas';
  if (selectedIds.size === 1) btnText = 'Añadir 1 tarea';
  else if (selectedIds.size > 1) btnText = `Añadir ${selectedIds.size} tareas`;

  const isPending = assignMutation.isPending || createMutation.isPending;

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: Math.max(52, insets.top + 10) }]}>
        <Pressable 
          accessibilityRole="button"
          style={styles.backBtn} 
          onPress={() => router.back()}
        >
          <ChevronLeft size={22} color="#F3EEE3" strokeWidth={1.8} />
        </Pressable>
        <Text style={styles.title}>Añadir tareas</Text>
      </View>

      {/* Target Album Pill */}
      {albumName && (
        <View style={styles.albumPillContainer}>
          <View style={styles.albumPill}>
            <Folder size={18} color="#D4B13A" strokeWidth={1.8} />
            <Text style={styles.albumPillText}>{albumName}</Text>
          </View>
        </View>
      )}

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Search size={22} color="#8F8F8F" strokeWidth={1.8} />
        <TextInput
          style={styles.searchInput}
          placeholder={activeTab === 'user' ? "Buscar en tus tareas" : "Buscar ideas por defecto"}
          placeholderTextColor="#8F8F8F"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* Segmented Control */}
      <View style={styles.segmentedControl}>
        <Pressable
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === 'user' }}
          style={[styles.segmentBtn, activeTab === 'user' && styles.segmentBtnActive]}
          onPress={() => handleTabChange('user')}
        >
          <Text style={[styles.segmentText, activeTab === 'user' && styles.segmentTextActive]}>
            Tus tareas
          </Text>
          {userSelectedCount > 0 && (
            <View style={[styles.badge, activeTab === 'user' ? styles.badgeActive : styles.badgeInactive]}>
              <Text style={[styles.badgeText, activeTab === 'user' ? styles.badgeTextActive : styles.badgeTextInactive]}>
                {userSelectedCount}
              </Text>
            </View>
          )}
        </Pressable>

        <Pressable
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === 'default' }}
          style={[styles.segmentBtn, activeTab === 'default' && styles.segmentBtnActive]}
          onPress={() => handleTabChange('default')}
        >
          <Text style={[styles.segmentText, activeTab === 'default' && styles.segmentTextActive]}>
            Por defecto
          </Text>
          {defaultSelectedCount > 0 && (
            <View style={[styles.badge, activeTab === 'default' ? styles.badgeActive : styles.badgeInactive]}>
              <Text style={[styles.badgeText, activeTab === 'default' ? styles.badgeTextActive : styles.badgeTextInactive]}>
                {defaultSelectedCount}
              </Text>
            </View>
          )}
        </Pressable>
      </View>

      {/* Category Chips */}
      <View style={styles.chipsWrapper}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsScroll}
        >
          {CATEGORIES.map(cat => {
            const isActive = activeCategory === cat;
            return (
              <Pressable
                key={cat}
                style={[styles.chip, isActive && styles.chipActive]}
                onPress={() => setActiveCategory(cat)}
              >
                <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                  {cat}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Count Row */}
      <View style={styles.countRow}>
        <Text style={styles.countText}>
          {activeTab === 'user' 
            ? `${currentTotal} tareas sin álbum`
            : `${currentTotal} ideas por defecto`}
        </Text>
        <Pressable onPress={toggleSelectAll}>
          <Text style={styles.selectAllText}>
            {allVisibleSelected ? 'Quitar selección' : 'Seleccionar todo'}
          </Text>
        </Pressable>
      </View>

      {/* Task List */}
      <ScrollView 
        ref={scrollViewRef}
        style={styles.list}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 120 }]}
      >
        {isLoading ? (
          <ActivityIndicator color="#D4B13A" style={{ marginTop: 40 }} />
        ) : currentVisibleTasks.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No hay tareas que coincidan</Text>
          </View>
        ) : (
          currentVisibleTasks.map(task => {
            const isSelected = selectedIds.has(task.id);
            const thumbGradient = GRADIENTS[task.coverKey as keyof typeof GRADIENTS] || GRADIENTS.aurora;
            const isDiagonal = task.coverKey === 'dorado';
            const subTitle = task.location ? `${task.categoryName} · ${task.location}` : task.categoryName;

            return (
              <Pressable
                key={task.id}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: isSelected }}
                style={[styles.taskCard, isSelected && styles.taskCardSelected]}
                onPress={() => toggleTask(task.id)}
              >
                <View style={styles.taskThumbContainer}>
                  <LinearGradient
                    colors={thumbGradient}
                    start={isDiagonal ? {x: 0, y: 0} : {x: 0.5, y: 0}}
                    end={isDiagonal ? {x: 1, y: 1} : {x: 0.5, y: 1}}
                    style={styles.taskThumb}
                  />
                </View>
                <View style={styles.taskContent}>
                  <Text style={styles.taskTitle} numberOfLines={2}>{task.title}</Text>
                  <Text style={styles.taskSub}>{subTitle}</Text>
                </View>
                <View style={[styles.circle, isSelected && styles.circleSelected]}>
                  {isSelected && <Check size={16} color="#0D0D0D" strokeWidth={3} />}
                </View>
              </Pressable>
            );
          })
        )}
      </ScrollView>

      {/* Bottom Bar */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(30, insets.bottom) }]}>
        <Pressable 
          style={[styles.btnAdd, selectedIds.size === 0 && styles.btnAddDisabled]}
          disabled={selectedIds.size === 0 || isPending}
          onPress={handleAdd}
        >
          {isPending ? (
            <ActivityIndicator color="#0D0D0D" />
          ) : (
            <Text style={styles.btnAddText}>{btnText}</Text>
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D0D0D',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    gap: 14,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#151515',
    borderWidth: 1,
    borderColor: '#262626',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontFamily: 'PlayfairDisplay_700Bold',
    fontSize: 30,
    color: '#F3EEE3',
  },
  albumPillContainer: {
    marginTop: 12,
    paddingHorizontal: 20,
    alignItems: 'flex-start',
  },
  albumPill: {
    height: 34,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: '#2C2512',
    borderWidth: 1,
    borderColor: '#6B5A22',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  albumPillText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: '#D4B13A',
  },
  searchContainer: {
    marginTop: 20,
    marginHorizontal: 20,
    height: 48,
    borderRadius: 999,
    backgroundColor: '#151515',
    borderWidth: 1,
    borderColor: '#262626',
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 16,
    color: '#F3EEE3',
  },
  segmentedControl: {
    marginTop: 16,
    marginHorizontal: 20,
    height: 46,
    borderRadius: 999,
    backgroundColor: '#151515',
    borderWidth: 1,
    borderColor: '#262626',
    padding: 4,
    flexDirection: 'row',
  },
  segmentBtn: {
    flex: 1,
    height: '100%',
    borderRadius: 999,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'transparent',
  },
  segmentBtnActive: {
    backgroundColor: '#D4B13A',
  },
  segmentText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 15,
    color: '#A0A0A0',
  },
  segmentTextActive: {
    fontFamily: 'Inter_600SemiBold',
    color: '#0D0D0D',
  },
  badge: {
    height: 22,
    minWidth: 22,
    borderRadius: 11,
    paddingHorizontal: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeActive: {
    backgroundColor: '#0D0D0D',
  },
  badgeInactive: {
    backgroundColor: '#D4B13A',
  },
  badgeText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 13,
  },
  badgeTextActive: {
    color: '#D4B13A',
  },
  badgeTextInactive: {
    color: '#0D0D0D',
  },
  chipsWrapper: {
    marginTop: 16,
  },
  chipsScroll: {
    paddingLeft: 20,
    paddingRight: 20,
    gap: 8,
  },
  chip: {
    height: 36,
    paddingHorizontal: 16,
    borderRadius: 999,
    backgroundColor: '#151515',
    borderWidth: 1,
    borderColor: '#262626',
    justifyContent: 'center',
    alignItems: 'center',
  },
  chipActive: {
    backgroundColor: '#2C2512',
    borderColor: '#D4B13A',
  },
  chipText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 15,
    color: '#F3EEE3',
  },
  chipTextActive: {
    color: '#D4B13A',
  },
  countRow: {
    marginTop: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  countText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: '#A0A0A0',
  },
  selectAllText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: '#D4B13A',
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 10,
  },
  emptyContainer: {
    paddingTop: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 15,
    color: '#A0A0A0',
  },
  taskCard: {
    height: 76,
    borderRadius: 16,
    backgroundColor: '#151515',
    borderWidth: 1,
    borderColor: '#262626',
    padding: 10,
    paddingRight: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  taskCardSelected: {
    backgroundColor: '#1A170D',
    borderColor: '#D4B13A',
  },
  taskThumbContainer: {
    width: 56,
    height: 56,
    borderRadius: 14,
    overflow: 'hidden',
  },
  taskThumb: {
    flex: 1,
  },
  taskContent: {
    flex: 1,
    justifyContent: 'center',
  },
  taskTitle: {
    fontFamily: 'PlayfairDisplay_600SemiBold',
    fontSize: 18,
    lineHeight: 22,
    color: '#F3EEE3',
  },
  taskSub: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: '#A0A0A0',
    marginTop: 3,
  },
  circle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#6A6A6A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  circleSelected: {
    borderWidth: 0,
    backgroundColor: '#D4B13A',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#0D0D0D',
    borderTopWidth: 1,
    borderTopColor: '#262626',
    paddingTop: 14,
    paddingHorizontal: 20,
  },
  btnAdd: {
    height: 56,
    borderRadius: 999,
    backgroundColor: '#D4B13A',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: 'rgba(212,177,58,0.2)',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 24,
    elevation: 10,
  },
  btnAddDisabled: {
    opacity: 0.4,
  },
  btnAddText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 17,
    color: '#0D0D0D',
  },
});
