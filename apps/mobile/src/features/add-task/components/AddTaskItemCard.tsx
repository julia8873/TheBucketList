import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Check } from 'lucide-react-native';
import { BucketCover } from '../../../components/BucketCover';
import { styles } from '../styles/add-task.styles';
import { GRADIENTS } from '../constants';
import type { UnassignedTask } from '../../../services/api/tasksService';

interface AddTaskItemCardProps {
  task: UnassignedTask;
  isSelected: boolean;
  onToggle: (id: string) => void;
}

export function AddTaskItemCard({
  task,
  isSelected,
  onToggle,
}: AddTaskItemCardProps) {
  const thumbGradient = GRADIENTS[task.coverKey as keyof typeof GRADIENTS] || GRADIENTS.aurora;
  const isDiagonal = task.coverKey === 'dorado';

  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: isSelected }}
      style={[styles.taskCard, isSelected && styles.taskCardSelected]}
      onPress={() => onToggle(task.id)}
    >
      <View style={styles.taskThumbContainer}>
        {task.isDefault ? (
          <LinearGradient
            colors={thumbGradient}
            start={isDiagonal ? { x: 0, y: 0 } : { x: 0.5, y: 0 }}
            end={isDiagonal ? { x: 1, y: 1 } : { x: 0.5, y: 1 }}
            style={styles.taskThumb}
          />
        ) : (
          <BucketCover
            value={task.imageValue ?? null}
            title={task.title}
            categorySlug={task.categorySlug}
            seed={task.id}
            iconSize={56}
            style={styles.taskThumb}
          />
        )}
      </View>
      <View style={styles.taskContent}>
        <Text style={styles.taskTitle} numberOfLines={2}>
          {task.title}
        </Text>
      </View>
      <View style={[styles.circle, isSelected && styles.circleSelected]}>
        {isSelected && <Check size={16} color="#0D0D0D" strokeWidth={3} />}
      </View>
    </Pressable>
  );
}
