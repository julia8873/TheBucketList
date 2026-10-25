import React from 'react';
import { View, Text, TextInput, Pressable } from 'react-native';
import { Plus, X } from 'lucide-react-native';
import { useTheme } from '@bucketlist/ui';
import { useTranslation } from '@bucketlist/shared';
import { styles } from '../styles/task-form.styles';

export interface TaskStepItem {
  id: string;
  title: string;
}

interface TaskStepsSectionProps {
  steps: TaskStepItem[];
  onAddStep: () => void;
  onUpdateStep: (id: string, text: string) => void;
  onRemoveStep: (id: string) => void;
}

export function TaskStepsSection({
  steps,
  onAddStep,
  onUpdateStep,
  onRemoveStep,
}: TaskStepsSectionProps) {
  const { theme } = useTheme();
  const { t } = useTranslation();

  return (
    <View style={styles.stepsContainer}>
      {steps.map((step, index) => (
        <View key={step.id} style={[styles.stepRow, { borderBottomColor: theme.colors.border }]}>
          <View style={[styles.stepCircle, { borderColor: theme.colors.border }]} />
          <TextInput
            style={[styles.stepInput, { color: theme.colors.foreground }]}
            value={step.title}
            onChangeText={(txt) => onUpdateStep(step.id, txt)}
            placeholder={t('task_form.step_placeholder', { defaultValue: 'Escribe un paso...' })}
            placeholderTextColor={theme.colors.foregroundMuted}
            autoFocus={index === steps.length - 1}
          />
          <Pressable
            onPress={() => onRemoveStep(step.id)}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={t('common.delete', { defaultValue: 'Eliminar' })}
          >
            <X color={theme.colors.foregroundMuted} size={20} />
          </Pressable>
        </View>
      ))}
      <Pressable style={styles.addStepRow} onPress={onAddStep} accessibilityRole="button">
        <Plus color="#D4B13A" size={24} />
        <Text style={styles.addStepText}>{t('task_form.add_step', { defaultValue: 'Añadir paso' })}</Text>
      </Pressable>
    </View>
  );
}
