import React from 'react';
import {
  View,
  Text,
  Pressable,
  TextInput,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, Folder, Search, Plus } from 'lucide-react-native';
import { PageTitle } from '@bucketlist/ui';
import { useTranslation } from '@bucketlist/shared';
import { TagFilterSheet } from '../src/components/TagFilterSheet';

import { styles } from '../src/features/add-task/styles/add-task.styles';
import { AddTaskItemCard } from '../src/features/add-task/components/AddTaskItemCard';
import { AddTaskTagFilterBar } from '../src/features/add-task/components/AddTaskTagFilterBar';
import { AddTaskSegmentedControl } from '../src/features/add-task/components/AddTaskSegmentedControl';
import { AddTaskSyncSheet } from '../src/features/add-task/components/AddTaskSyncSheet';
import { useAddTaskState } from '../src/features/add-task/hooks/useAddTaskState';

export default function AddTaskScreen() {
  const { albumId, albumName } = useLocalSearchParams<{ albumId: string; albumName: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  const {
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
    syncPrompt,
    closeSyncPrompt,
    confirmSyncPrompt,
    isPending,
    scrollViewRef,
  } = useAddTaskState(albumId);

  let btnText = t('add_task.btn_add_tasks', { defaultValue: 'Añadir tareas' });
  if (selectedIds.size === 1) {
    btnText = t('add_task.btn_add_1_task', { defaultValue: 'Añadir 1 tarea' });
  } else if (selectedIds.size > 1) {
    btnText = t('add_task.btn_add_n_tasks', { count: selectedIds.size, defaultValue: `Añadir ${selectedIds.size} tareas` });
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: Math.max(52, insets.top + 10) }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('common.back', { defaultValue: 'Volver' })}
          style={styles.backBtn}
          onPress={handleBack}
        >
          <ChevronLeft size={22} color="#F3EEE3" strokeWidth={1.8} />
        </Pressable>
        <PageTitle
          gold={t('add_task.title_gold', { defaultValue: 'Añadir' })}
          rest={t('add_task.title_rest', { defaultValue: 'tareas' })}
        />
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
          placeholder={
            activeTab === 'user'
              ? t('add_task.search_user_placeholder', { defaultValue: 'Buscar en tus tareas' })
              : t('add_task.search_default_placeholder', { defaultValue: 'Buscar ideas por defecto' })
          }
          placeholderTextColor="#8F8F8F"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* Crear tarea nueva */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('add_task.create_new', { defaultValue: 'Crear una tarea nueva' })}
        style={styles.createTaskBtn}
        onPress={handleCreateTask}
      >
        <Plus size={18} color="#D4B13A" strokeWidth={2.2} />
        <Text style={styles.createTaskBtnText}>
          {search.trim()
            ? t('add_task.create_named', { name: search.trim(), defaultValue: `Crear «${search.trim()}»` })
            : t('add_task.create_new', { defaultValue: 'Crear una tarea nueva' })}
        </Text>
      </Pressable>

      {/* Segmented Control */}
      <AddTaskSegmentedControl
        activeTab={activeTab}
        onChangeTab={handleTabChange}
        userSelectedCount={userSelectedCount}
        defaultSelectedCount={defaultSelectedCount}
      />

      {/* Tags Filter Row */}
      <AddTaskTagFilterBar
        selectedTagIds={selectedTagIds}
        selectedTags={selectedTags}
        onOpenSheet={() => setTagSheetOpen(true)}
        onRemoveTag={(tagId) => setSelectedTagIds((ids) => ids.filter((id) => id !== tagId))}
      />

      {/* Count Row */}
      <View style={styles.countRow}>
        <Text style={styles.countText}>
          {activeTab === 'user'
            ? t('add_task.tasks_available', { count: currentTotal, defaultValue: `${currentTotal} tareas disponibles` })
            : t('add_task.ideas_available', { count: currentTotal, defaultValue: `${currentTotal} ideas por defecto` })}
        </Text>
        <Pressable onPress={toggleSelectAll}>
          <Text style={styles.selectAllText}>
            {allVisibleSelected
              ? t('add_task.deselect_all', { defaultValue: 'Quitar selección' })
              : t('add_task.select_all', { defaultValue: 'Seleccionar todo' })}
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
            <Text style={styles.emptyText}>
              {t('add_task.empty_text', {
                defaultValue:
                  'No hay más tareas disponibles (o todas se encuentran en el álbum). Puedes crear una tarea nueva con el botón de arriba.',
              })}
            </Text>
          </View>
        ) : (
          currentVisibleTasks.map((task) => (
            <AddTaskItemCard
              key={task.id}
              task={task}
              isSelected={selectedIds.has(task.id)}
              onToggle={toggleTask}
            />
          ))
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

      <AddTaskSyncSheet prompt={syncPrompt} onClose={closeSyncPrompt} onConfirm={confirmSyncPrompt} />

      <TagFilterSheet
        visible={tagSheetOpen}
        selectedIds={selectedTagIds}
        onChange={setSelectedTagIds}
        matchCount={currentVisibleTasks.length}
        totalCount={currentTotal}
        onClose={() => setTagSheetOpen(false)}
        onManage={() => {
          setTagSheetOpen(false);
          router.push('/tags' as any);
        }}
      />
    </KeyboardAvoidingView>
  );
}
