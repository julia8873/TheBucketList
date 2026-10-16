import React, { useState } from 'react';
import {
  View,
  ScrollView,
  RefreshControl,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { ListTodo, CheckCircle2 } from 'lucide-react-native';

import { useTheme, Typography } from '@bucketlist/ui';
import { gold } from '@bucketlist/ui/src/tokens/colors';
import { TaskCompactSkeleton } from '@/components/TaskSkeletons';
import { DraggableTaskList } from '@/components/DraggableTaskList';

import {
  DailySortField,
  DailySortDirection,
  DailyTaskPriority,
  DailyTask,
} from '@/features/daily-tasks/types';
import { PRIORITY_CONFIG, PRIORITY_ORDER } from '@/features/daily-tasks/constants';
import { styles } from '@/features/daily-tasks/styles/explore.styles';
import { parseLocalDate, toDateString } from '@/features/daily-tasks/utils/dailyTaskDateUtils';
import { useDailyTasksState } from '@/features/daily-tasks/hooks/useDailyTasksState';

import { DailyTasksHeader } from '@/features/daily-tasks/components/DailyTasksHeader';
import { DailyOverdueSection } from '@/features/daily-tasks/components/DailyOverdueSection';
import { DailyGroupedTasksView } from '@/features/daily-tasks/components/DailyGroupedTasksView';
import { DailyWeekView } from '@/features/daily-tasks/components/DailyWeekView';
import { DailyCalendarView } from '@/features/daily-tasks/components/DailyCalendarView';
import { DailyTaskCard, DailyOverdueTaskCard } from '@/features/daily-tasks/components/DailyTaskCard';
import { CreateDailyTaskModal } from '@/features/daily-tasks/components/CreateDailyTaskModal';
import { EditDailyTaskModal } from '@/features/daily-tasks/components/EditDailyTaskModal';
import { DailyTagFilterSheet } from '@/features/daily-tasks/components/DailyTagFilterSheet';
import { DailyTagFormModal } from '@/features/daily-tasks/components/DailyTagFormModal';
import { DailySortSheet } from '@/features/daily-tasks/components/DailySortSheet';

// Re-exports for backwards compatibility
export type { DailySortField, DailySortDirection };
export { PRIORITY_CONFIG, PRIORITY_ORDER };

export default function DailyTasksScreen() {
  const { theme } = useTheme();
  const state = useDailyTasksState();
  const [showCreateDatePicker, setShowCreateDatePicker] = useState(false);

  const renderTaskRow = (item: DailyTask, drag?: any, isLast?: boolean) => (
    <DailyTaskCard
      key={item.id}
      item={item}
      drag={drag}
      isLast={isLast}
      sortField={state.sortField}
      timeView={state.timeView}
      tagMap={state.tagMap}
      onToggle={state.handleToggle}
      onOpenEdit={state.openEditTask}
      onToggleFavorite={state.handleToggleFavorite}
      onDelete={state.handleDelete}
    />
  );

  const renderCompletedRow = (item: DailyTask, isLast?: boolean) =>
    renderTaskRow(item, undefined, isLast);

  const renderOverdueTaskRow = (item: DailyTask, drag?: any, isLast?: boolean) => (
    <DailyOverdueTaskCard
      key={item.id}
      item={item}
      drag={drag}
      isLast={isLast}
      sortField={state.sortField}
      tagMap={state.tagMap}
      upcomingWeekDays={state.upcomingWeekDays}
      onToggle={state.handleToggle}
      onOpenEdit={state.openEditTask}
      onToggleFavorite={state.handleToggleFavorite}
      onDelete={state.handleDelete}
      onReschedule={state.handleRescheduleTask}
      onOpenRescheduleDatePicker={(task) => {
        state.setRescheduleTask(task);
        state.setShowRescheduleDatePicker(true);
      }}
    />
  );

  return (
    <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={{ flex: 1 }}>
        <DailyTasksHeader
          timeView={state.timeView}
          setTimeView={state.setTimeView}
          newTitle={state.newTitle}
          setNewTitle={state.setNewTitle}
          handleQuickAddTask={state.handleQuickAddTask}
          inputRef={state.inputRef}
          selectedTagFilters={state.selectedTagFilters}
          setSelectedTagFilters={state.setSelectedTagFilters}
          tagMap={state.tagMap}
          onOpenTagFilterSheet={() => state.setShowTagFilterSheet(true)}
          statusFilter={state.statusFilter}
          setStatusFilter={state.setStatusFilter}
          onlyFavorites={state.onlyFavorites}
          setOnlyFavorites={state.setOnlyFavorites}
          favoritesCount={state.favoritesCount}
          priorityFilter={state.priorityFilter}
          setPriorityFilter={state.setPriorityFilter}
          sortField={state.sortField}
          sortDirection={state.sortDirection}
          groupByTag={state.groupByTag}
          onOpenSortModal={() => state.setShowSortModal(true)}
        />

        {/* Content Area */}
        <ScrollView
          style={styles.listScroll}
          contentContainerStyle={[styles.listContent, { flexGrow: 1 }]}
          nestedScrollEnabled={true}
          refreshControl={
            <RefreshControl
              refreshing={state.manualRefreshing}
              onRefresh={state.handleRefresh}
              tintColor={gold[400]}
              colors={[gold[400]]}
            />
          }
          keyboardShouldPersistTaps="handled"
        >
          {state.isLoading && !state.tasks.length ? (
            <View style={{ gap: 8, paddingVertical: 12 }}>
              <TaskCompactSkeleton />
              <TaskCompactSkeleton />
              <TaskCompactSkeleton />
            </View>
          ) : state.timeView === 'today' && state.statusFilter === 'completed' ? (
            <>
              {state.completedList.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <View style={styles.emptyIconCircle}>
                    <CheckCircle2 size={32} color="#34C759" strokeWidth={1.8} />
                  </View>
                  <Typography variant="bodySemibold" style={styles.emptyTitle}>
                    No hay tareas completadas
                  </Typography>
                  <Typography variant="caption" color="textSecondary" style={styles.emptySubtitle}>
                    Las tareas que completes hoy aparecerán aquí.
                  </Typography>
                </View>
              ) : (
                <View style={styles.compactListCard}>
                  {state.completedList.map((item, idx) =>
                    renderCompletedRow(item, idx === state.completedList.length - 1)
                  )}
                </View>
              )}
            </>
          ) : (
            <>
              {/* 1. TODAY VIEW */}
              {state.timeView === 'today' && (
                <>
                  <DailyOverdueSection
                    tasks={state.sortedOverdueTasks}
                    renderOverdueTaskRow={renderOverdueTaskRow}
                    onReorder={state.handleReorder}
                    onDraggingChange={state.handleDraggingChange}
                    onMoveAllToToday={state.handleMoveAllOverdueToToday}
                    onCompleteAll={state.handleCompleteAllOverdue}
                    onDeleteAll={state.handleDeleteAllOverdue}
                  />

                  {state.todayTasks.length === 0 ? (
                    state.completedList.length === 0 && state.sortedOverdueTasks.length === 0 ? (
                      <View style={styles.emptyContainer}>
                        <View style={styles.emptyIconCircle}>
                          <ListTodo size={32} color={gold[400]} strokeWidth={1.8} />
                        </View>
                        <Typography variant="bodySemibold" style={styles.emptyTitle}>
                          ¡Todo listo por hoy!
                        </Typography>
                        <Typography variant="caption" color="textSecondary" style={styles.emptySubtitle}>
                          Añade una tarea con el botón + abajo o arriba para organizar tu día.
                        </Typography>
                      </View>
                    ) : null
                  ) : state.groupByTag ? (
                    <DailyGroupedTasksView
                      groups={state.todayTagGroups}
                      renderTaskRow={renderTaskRow}
                      onReorder={state.handleReorder}
                      onDraggingChange={state.handleDraggingChange}
                    />
                  ) : (
                    <View style={styles.compactListCard}>
                      <DraggableTaskList
                        items={state.sortedTodayTasks}
                        gap={0}
                        renderItem={(item, drag) =>
                          renderTaskRow(
                            item,
                            drag,
                            state.sortedTodayTasks.indexOf(item) === state.sortedTodayTasks.length - 1
                          )
                        }
                        onReorder={state.handleReorder}
                        onDraggingChange={state.handleDraggingChange}
                      />
                    </View>
                  )}

                  {state.statusFilter === 'all' && state.completedList.length > 0 && (
                    <View style={styles.completedSectionWrapper}>
                      <View style={styles.completedSectionHeader}>
                        <CheckCircle2 size={14} color="#34C759" />
                        <Typography style={styles.completedSectionTitle}>
                          {state.completedList.some(
                            (t) => t.completed_at && !t.completed_at.startsWith(state.todayStr)
                          )
                            ? `Completadas (${state.completedList.length})`
                            : `Completadas hoy (${state.completedList.length})`}
                        </Typography>
                      </View>
                      <View style={styles.compactListCard}>
                        {state.completedList.map((item, idx) =>
                          renderCompletedRow(item, idx === state.completedList.length - 1)
                        )}
                      </View>
                    </View>
                  )}
                </>
              )}

              {/* 2. WEEK VIEW */}
              {state.timeView === 'week' && (
                <DailyWeekView
                  displayedWeeks={state.displayedWeeks}
                  weeksToShow={state.weeksToShow}
                  setWeeksToShow={state.setWeeksToShow}
                  weekOffset={state.weekOffset}
                  setWeekOffset={state.setWeekOffset}
                  filteredByTagAndStatus={state.filteredByTagAndStatus}
                  todayStr={state.todayStr}
                  sortTasks={state.sortTasks}
                  onOpenCreateTask={state.handleOpenCreateTask}
                  renderOverdueSection={() => (
                    <DailyOverdueSection
                      tasks={state.sortedOverdueTasks}
                      renderOverdueTaskRow={renderOverdueTaskRow}
                      onReorder={state.handleReorder}
                      onDraggingChange={state.handleDraggingChange}
                      onMoveAllToToday={state.handleMoveAllOverdueToToday}
                      onCompleteAll={state.handleCompleteAllOverdue}
                      onDeleteAll={state.handleDeleteAllOverdue}
                    />
                  )}
                  renderTaskRow={renderTaskRow}
                  onReorder={state.handleReorder}
                  onDraggingChange={state.handleDraggingChange}
                />
              )}

              {/* 3. CALENDAR VIEW */}
              {state.timeView === 'calendar' && (
                <DailyCalendarView
                  tasks={state.filteredByTagAndStatus}
                  todayStr={state.todayStr}
                  calendarMonth={state.calendarMonth}
                  onSetCalendarMonth={state.setCalendarMonth}
                  selectedCalendarDate={state.selectedCalendarDate}
                  onSelectCalendarDate={state.setSelectedCalendarDate}
                  onOpenCreateTask={state.handleOpenCreateTask}
                  renderTaskRow={renderTaskRow}
                  renderCompletedRow={renderCompletedRow}
                  onReorder={state.handleReorder}
                  onDraggingChange={state.handleDraggingChange}
                  sortTasks={state.sortTasks}
                />
              )}

              {/* 4. ALL VIEW */}
              {state.timeView === 'all' && (
                <>
                  {state.sortedAllTasks.length === 0 ? (
                    <View style={styles.emptyContainer}>
                      <View style={styles.emptyIconCircle}>
                        <ListTodo size={32} color={gold[400]} strokeWidth={1.8} />
                      </View>
                      <Typography variant="bodySemibold" style={styles.emptyTitle}>
                        No hay tareas
                      </Typography>
                      <Typography variant="caption" color="textSecondary" style={styles.emptySubtitle}>
                        Crea una tarea con el botón + abajo o arriba para comenzar.
                      </Typography>
                    </View>
                  ) : state.groupByTag ? (
                    <DailyGroupedTasksView
                      groups={state.allTagGroups}
                      renderTaskRow={renderTaskRow}
                      onReorder={state.handleReorder}
                      onDraggingChange={state.handleDraggingChange}
                    />
                  ) : (
                    <View style={styles.compactListCard}>
                      <DraggableTaskList
                        items={state.sortedAllTasks}
                        gap={0}
                        renderItem={(item, drag) =>
                          renderTaskRow(
                            item,
                            drag,
                            state.sortedAllTasks.indexOf(item) === state.sortedAllTasks.length - 1
                          )
                        }
                        onReorder={state.handleReorder}
                        onDraggingChange={state.handleDraggingChange}
                      />
                    </View>
                  )}
                </>
              )}
            </>
          )}
        </ScrollView>

        {/* MODAL 1: Create Task Modal */}
        <CreateDailyTaskModal
          visible={state.showCreateModal}
          onClose={() => state.setShowCreateModal(false)}
          title={state.createTitle}
          setTitle={state.setCreateTitle}
          description={state.createDescription}
          setDescription={state.setCreateDescription}
          dueDate={state.createDueDate}
          setDueDate={state.setCreateDueDate}
          todayStr={state.todayStr}
          onOpenDatePicker={() => setShowCreateDatePicker(true)}
          priority={state.createPriority}
          setPriority={state.setCreatePriority}
          isFavorite={state.createIsFavorite}
          setIsFavorite={state.setCreateIsFavorite}
          isRecurring={state.createIsRecurring}
          setIsRecurring={state.setCreateIsRecurring}
          recurrenceInterval={state.createRecurrenceInterval}
          setRecurrenceInterval={state.setCreateRecurrenceInterval}
          recurrenceUnit={state.createRecurrenceUnit}
          setRecurrenceUnit={state.setCreateRecurrenceUnit}
          showCustomRecurrence={state.createShowCustomRecurrence}
          setShowCustomRecurrence={state.setCreateShowCustomRecurrence}
          tagIds={state.createTagIds}
          setTagIds={state.setCreateTagIds}
          userTags={state.userTags}
          onOpenCreateTag={() => state.openCreateTag('create')}
          subtasks={state.createSubtasks}
          subtaskTitle={state.createSubtaskTitle}
          setSubtaskTitle={state.setCreateSubtaskTitle}
          onAddSubtask={state.handleAddCreateSubtask}
          onToggleSubtask={state.handleToggleCreateSubtask}
          onDeleteSubtask={state.handleDeleteCreateSubtask}
          onSubmit={state.handleCreateFromModal}
        />

        {showCreateDatePicker && (
          <DateTimePicker
            value={parseLocalDate(state.createDueDate)}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(event, selectedDate) => {
              setShowCreateDatePicker(false);
              if (selectedDate) {
                state.setCreateDueDate(toDateString(selectedDate));
              }
            }}
          />
        )}

        {/* MODAL 2: Full Edit Task Modal */}
        <EditDailyTaskModal
          visible={!!state.editingTask}
          editingTask={state.editingTask}
          onClose={state.handleCloseEditModal}
          editTitle={state.editTitle}
          onEditTitleChange={state.handleEditTitleChange}
          onEditTitleBlur={state.handleEditTitleBlur}
          editIsFavorite={state.editIsFavorite}
          onToggleFavorite={state.handleToggleEditFavorite}
          editIsCompleted={state.editIsCompleted}
          onToggleStatus={state.handleToggleEditStatus}
          editDueDate={state.editDueDate}
          todayStr={state.todayStr}
          onSelectDueDate={(d) => {
            state.setEditDueDate(d);
            state.autoSaveTask({ due_date: d });
          }}
          editIsRecurring={state.editIsRecurring}
          setEditIsRecurring={state.setEditIsRecurring}
          editRecurrenceInterval={state.editRecurrenceInterval}
          setEditRecurrenceInterval={state.setEditRecurrenceInterval}
          editRecurrenceUnit={state.editRecurrenceUnit}
          setEditRecurrenceUnit={state.setEditRecurrenceUnit}
          editShowCustomRecurrence={state.editShowCustomRecurrence}
          setEditShowCustomRecurrence={state.setEditShowCustomRecurrence}
          autoSaveTask={state.autoSaveTask}
          editPriority={state.editPriority}
          onSelectPriority={(p: DailyTaskPriority) => {
            state.setEditPriority(p);
            state.autoSaveTask({ priority: p });
          }}
          userTags={state.userTags}
          editTagIds={state.editTagIds}
          onToggleTag={(tagId: string) => {
            const nextTagIds = state.editTagIds.includes(tagId)
              ? state.editTagIds.filter((id) => id !== tagId)
              : [...state.editTagIds, tagId];
            state.setEditTagIds(nextTagIds);
            state.autoSaveTask({ tag_ids: nextTagIds });
          }}
          onOpenCreateTag={() => state.openCreateTag('edit')}
          editSubtasks={state.editSubtasks}
          onToggleSubtask={state.handleToggleEditSubtask}
          onDeleteSubtask={state.handleDeleteEditSubtask}
          editSubtaskTitle={state.editSubtaskTitle}
          onChangeSubtaskTitle={state.setEditSubtaskTitle}
          onAddSubtask={state.handleAddEditSubtask}
          editDescription={state.editDescription}
          onEditDescriptionChange={state.handleEditDescriptionChange}
          onEditDescriptionBlur={state.handleEditDescriptionBlur}
          onConvertToBucket={state.handleConvertToBucket}
        />

        {/* MODAL 5: Tag Form Modal */}
        <DailyTagFormModal
          visible={state.showTagModal}
          onClose={() => {
            state.setShowTagModal(false);
          }}
          editingDailyTag={state.editingDailyTag}
          tagFormName={state.tagFormName}
          setTagFormName={state.setTagFormName}
          tagFormColor={state.tagFormColor}
          setTagFormColor={state.setTagFormColor}
          tagFormEmoji={state.tagFormEmoji}
          setTagFormEmoji={state.setTagFormEmoji}
          isSavingTag={state.isSavingTag}
          onSave={state.handleSaveTag}
          onDelete={state.handleDeleteTag}
        />

        {/* MODAL 6: TagFilterSheet */}
        <DailyTagFilterSheet
          visible={state.showTagFilterSheet}
          onClose={() => state.setShowTagFilterSheet(false)}
          selectedTagFilters={state.selectedTagFilters}
          setSelectedTagFilters={state.setSelectedTagFilters}
          userTags={state.userTags}
          tasks={state.tasks}
          openCreateTag={() => state.openCreateTag('sheet')}
          openEditTag={state.openEditTag}
        />


        {/* MODAL 8: Sort & Classify Sheet */}
        <DailySortSheet
          visible={state.showSortModal}
          onClose={() => state.setShowSortModal(false)}
          groupByTag={state.groupByTag}
          onToggleGroupByTag={state.handleToggleGroupByTag}
          sortField={state.sortField}
          sortDirection={state.sortDirection}
          onSelectSort={state.handleSelectSort}
          onResetSort={state.handleResetSort}
        />

        {/* DateTimePicker for Overdue Reschedule */}
        {state.showRescheduleDatePicker && state.rescheduleTask && (
          <DateTimePicker
            value={parseLocalDate(state.rescheduleTask.due_date || state.todayStr)}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(event, selectedDate) => {
              state.setShowRescheduleDatePicker(false);
              if (selectedDate && state.rescheduleTask) {
                state.handleRescheduleTask(state.rescheduleTask, toDateString(selectedDate));
              }
              state.setRescheduleTask(null);
            }}
          />
        )}
      </View>
    </SafeAreaView>
  );
}
